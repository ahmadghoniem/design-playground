/**
 * Claude JSONL stream-parsing helpers for the agent generation preview.
 *
 * Pure, in-process functions over arrays of stdout lines emitted by the
 * `claude` CLI in `--output-format stream-json` mode. No I/O, no module
 * state — safe to unit-test directly with captured sample lines.
 */

export const AGENT_PREVIEW_MAX_CHARS = 14_000;
export const JSONL_PARSE_MAX_LINE_CHARS = 512_000;

export function shouldStreamJsonForPreview(
  body: { claudeDetailedStdout?: boolean },
): boolean {
  return body.claudeDetailedStdout !== false;
}

const readJsonString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const findSessionId = (value: unknown, depth = 0): string | null => {
  if (depth > 4 || value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findSessionId(item, depth + 1);
      if (nested) return nested;
    }
    return null;
  }
  if (typeof value !== 'object') return null;

  const obj = value as Record<string, unknown>;
  const direct =
    readJsonString(obj.session_id) ??
    readJsonString(obj.sessionId) ??
    readJsonString(obj.conversation_id) ??
    readJsonString(obj.conversationId) ??
    readJsonString(obj.thread_id) ??
    readJsonString(obj.threadId) ??
    readJsonString(obj.chat_id) ??
    readJsonString(obj.chatId);
  if (direct) return direct;

  const messageObj = obj.message;
  if (messageObj && typeof messageObj === 'object' && !Array.isArray(messageObj)) {
    const messageId = readJsonString((messageObj as Record<string, unknown>).id);
    if (messageId) return messageId;
  }

  for (const nestedValue of Object.values(obj)) {
    const nested = findSessionId(nestedValue, depth + 1);
    if (nested) return nested;
  }
  return null;
};

export function trimAssistantPreview(assistantPreview: { value: string }): void {
  if (assistantPreview.value.length > AGENT_PREVIEW_MAX_CHARS) {
    assistantPreview.value = assistantPreview.value.slice(-AGENT_PREVIEW_MAX_CHARS);
  }
}

export function appendAssistantTextFromClaudeJsonlLines(
  lines: string[],
  assistantPreview: { value: string },
): { textChanged: boolean; sessionId: string | null } {
  let changed = false;
  let discoveredSessionId: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || !trimmed.startsWith('{')) continue;
    if (trimmed.length > JSONL_PARSE_MAX_LINE_CHARS) continue;
    try {
      const obj = JSON.parse(trimmed) as {
        type?: string;
        event?: {
          type?: string;
          delta?: { type?: string; text?: string };
        };
      };
      if (
        obj.type === 'stream_event' &&
        obj.event?.type === 'content_block_delta' &&
        obj.event.delta?.type === 'text_delta' &&
        typeof obj.event.delta.text === 'string'
      ) {
        assistantPreview.value += obj.event.delta.text;
        changed = true;
      }
      if (!discoveredSessionId) {
        discoveredSessionId = findSessionId(obj);
      }
    } catch {
      /* ignore non-JSON or unexpected shape */
    }
  }
  trimAssistantPreview(assistantPreview);
  return { textChanged: changed, sessionId: discoveredSessionId };
}

export function extractStreamJsonError(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i]?.trim();
    if (!trimmed?.startsWith('{')) continue;
    try {
      const obj = JSON.parse(trimmed) as {
        type?: string;
        is_error?: boolean;
        result?: string;
        error?: string | { message?: string };
        message?: string | { content?: Array<{ type?: string; text?: string }> };
      };

      if (obj.type === 'result' && obj.is_error && typeof obj.result === 'string') {
        return obj.result.trim() || null;
      }
      if (obj.type === 'assistant' && obj.error && obj.message && typeof obj.message === 'object' && Array.isArray(obj.message.content)) {
        const text = obj.message.content
          .filter((c) => c.type === 'text' && typeof c.text === 'string')
          .map((c) => c.text)
          .join('')
          .trim();
        if (text) return text;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function formatAgentErrorMessage(
  stderr: string,
  streamError: string | null,
  previewError: string,
  exitCode: number | null,
  providerName: string,
): string {
  const fallback = `${providerName} agent exited with code ${exitCode}`;
  return stderr.trim() || streamError || previewError || fallback;
}
