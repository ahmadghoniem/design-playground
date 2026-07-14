/**
 * What a clipboard paste onto the canvas resolves to, in priority order:
 * image → nothing.
 *
 * This is the pure decision seam behind the canvas paste handler: given the
 * raw clipboard payload it decides *which* node a paste should become and
 * extracts the bytes for it, with no DOM/fetch/React-Flow side effects. The
 * handler in PlaygroundCanvas owns the I/O (image upload, node insertion)
 * that each intent then drives.
 */
export type PasteIntent =
  | { kind: 'image'; file: File }
  | { kind: 'none' };

/**
 * Classify a clipboard payload into the canvas paste it should produce.
 * An image item is the only thing that produces a node; everything else
 * returns `{ kind: 'none' }` — the caller should then neither
 * `preventDefault` nor act.
 */
export function classifyClipboard(data: DataTransfer | null): PasteIntent {
  if (!data) return { kind: 'none' };

  const items = data.items;
  if (!items) return { kind: 'none' };

  // --- Image paste ---
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (!file) continue;
      return { kind: 'image', file };
    }
  }

  return { kind: 'none' };
}
