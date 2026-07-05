import { looksLikeJsx } from './jsx-utils';

/**
 * What a clipboard paste onto the canvas resolves to, in priority order:
 * image → JSX source → HTML fragment → nothing.
 *
 * This is the pure decision seam behind the canvas paste handler: given the
 * raw clipboard payload it decides *which* node a paste should become and
 * extracts the bytes for it, with no DOM/fetch/React-Flow side effects. The
 * handler in PlaygroundCanvas owns the I/O (image upload, frame-file writes,
 * node insertion) that each intent then drives.
 */
export type PasteIntent =
  | { kind: 'image'; file: File }
  | { kind: 'jsx'; source: string }
  | { kind: 'html'; html: string }
  | { kind: 'none' };

const looksLikeHtmlContent = (s: string) => /<[a-z][\s\S]*>/i.test(s);

/**
 * Classify a clipboard payload into the canvas paste it should produce.
 * Priority mirrors the original inline handler exactly:
 *  1. an image item takes precedence over everything;
 *  2. JSX is checked before HTML because JSX source also contains HTML tags;
 *  3. otherwise an HTML fragment (from text/html, falling back to text/plain).
 * Returns `{ kind: 'none' }` when nothing matches — the caller should then
 * neither `preventDefault` nor act.
 */
export function classifyClipboard(data: DataTransfer | null): PasteIntent {
  if (!data) return { kind: 'none' };

  const items = data.items;
  if (!items) return { kind: 'none' };

  // --- Image paste (takes priority) ---
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (!file) continue;
      return { kind: 'image', file };
    }
  }

  // --- JSX paste (checked before HTML since JSX also contains HTML tags) ---
  const rawPlain = (data.getData('text/plain') || '').trim();
  if (rawPlain && looksLikeJsx(rawPlain)) {
    return { kind: 'jsx', source: rawPlain };
  }

  // --- HTML paste ---
  const rawHtml = (data.getData('text/html') || '').trim();
  if (rawHtml && looksLikeHtmlContent(rawHtml)) {
    return { kind: 'html', html: rawHtml };
  }
  if (rawPlain && looksLikeHtmlContent(rawPlain)) {
    return { kind: 'html', html: rawPlain };
  }

  return { kind: 'none' };
}

/**
 * Next `frame-N` number given the existing on-canvas JSX component filenames
 * (`frame-3.tsx`) and HTML page folders (`frame-3`). Pure: scans both lists for
 * the highest N and returns N+1, or 1 when there are none. Both the JSX and HTML
 * paste branches share this so a pasted frame never collides across formats.
 */
export function nextFrameNumber(jsxFilenames: string[], htmlFolders: string[]): number {
  let frameNumber = 1;
  for (const filename of jsxFilenames) {
    const match = filename.match(/^frame-(\d+)\.tsx$/);
    if (match) frameNumber = Math.max(frameNumber, parseInt(match[1], 10) + 1);
  }
  for (const folder of htmlFolders) {
    const match = folder.match(/^frame-(\d+)$/);
    if (match) frameNumber = Math.max(frameNumber, parseInt(match[1], 10) + 1);
  }
  return frameNumber;
}
