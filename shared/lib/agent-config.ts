import type { ModelOption } from './constants';
import { CLAUDE_FALLBACK_MODELS, CLAUDE_FEATURED_MODEL_IDS } from './model-catalog';

// ---------------------------------------------------------------------------
// Agent configuration — Claude Code is the only agent CLI.
//
// This module is pure data + pure functions (no side effects, no child_process)
// so it is safe to import from client code. Process spawning lives in
// `server/lib/spawn-agent.ts`.
// ---------------------------------------------------------------------------

/** Options passed to `spawnAgent()`. */
export interface AgentSpawnOptions {
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'max';
  /**
   * When true, use `--output-format stream-json` with `--include-partial-messages`
   * for live UI parsing (not written to chat `.txt`).
   * When false/omitted, use `text` and log stdout to the chat file.
   */
  claudeDetailedStdout?: boolean;
}

/** Claude Code CLI options persisted in the client store. */
export interface ClaudeCodeOptions {
  effort: 'low' | 'medium' | 'high' | 'max';
  /** When true, stream-json for live tooltip; chat download omits raw stream. When false, plain text in chat log. */
  detailedStdout: boolean;
}

export const DEFAULT_CLAUDE_CODE_OPTIONS: ClaudeCodeOptions = {
  effort: 'high',
  detailedStdout: true,
};

// ---------------------------------------------------------------------------
// Static Claude Code config
// ---------------------------------------------------------------------------

/** The CLI binary invoked for generation/discovery. */
export const AGENT_BINARY = 'claude';

/** Human-readable name shown in logs and chat headers. */
export const AGENT_DISPLAY_NAME = 'Claude Code';

/** User-facing message when the CLI is not on PATH (ENOENT). */
export const AGENT_NOT_FOUND_MESSAGE =
  'Claude Code CLI not found. Install via: npm install -g @anthropic-ai/claude-code';

/**
 * Models shown in the picker. Claude Code has no `models` list subcommand, so
 * this static catalog (docs-verified slugs) is the source of truth.
 */
export const AGENT_MODELS: ModelOption[] = CLAUDE_FALLBACK_MODELS;

/** Model ids enabled in the picker by default. */
export const AGENT_DEFAULT_ENABLED_MODELS: string[] = [...CLAUDE_FEATURED_MODEL_IDS];

/** Build CLI args for agent (non-interactive) mode. */
export function buildAgentArgs(opts: AgentSpawnOptions): string[] {
  const args = ['-p', '--dangerously-skip-permissions', '--verbose'];
  if (opts.claudeDetailedStdout) {
    args.push('--output-format', 'stream-json', '--include-partial-messages');
  } else {
    args.push('--output-format', 'text');
  }
  if (opts.model)        args.push('--model', opts.model);
  if (opts.effort)       args.push('--effort', opts.effort);
  return args;
}
