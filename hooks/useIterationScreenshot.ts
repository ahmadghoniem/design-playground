'use client';

import { useCallback } from 'react';
import { toPng } from 'html-to-image';

// ---------------------------------------------------------------------------
// useIterationScreenshot
//
// Captures a PNG thumbnail of a node's rendered frame. Used by the adopt
// confirmation dialog to show the user what they're about to adopt.
//
// Interface: capture(nodeId) → Promise<string | null>
//   Resolves to a data-URL string (PNG) or null if capture fails.
// ---------------------------------------------------------------------------

export function useIterationScreenshot() {
  const capture = useCallback(async (nodeId: string): Promise<string | null> => {
    const nodeEl = document.querySelector(`[data-id="${nodeId}"]`);
    const frameEl = nodeEl?.querySelector('[data-screenshot-target]');
    if (!(frameEl instanceof HTMLElement)) return null;

    const rect = frameEl.getBoundingClientRect();

    // Temporarily patch cssRules to avoid SecurityError from cross-origin sheets
    const desc = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules');
    const descRules = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'rules');
    const safeGetter = function (this: CSSStyleSheet) {
      try { return desc!.get!.call(this); } catch { return [] as unknown as CSSRuleList; }
    };
    Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', { get: safeGetter, configurable: true });
    Object.defineProperty(CSSStyleSheet.prototype, 'rules', { get: safeGetter, configurable: true });

    const w = Math.ceil(rect.width);
    const h = Math.ceil(rect.height);

    try {
      // Two-pass: first at 1× (warms up fonts/images), then at 2× for sharpness
      await toPng(frameEl, { pixelRatio: 1, width: w, height: h }).catch(() => null);
      const url = await toPng(frameEl, { pixelRatio: 2, width: w, height: h });
      return url || null;
    } catch {
      return null;
    } finally {
      if (desc) Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', desc);
      if (descRules) Object.defineProperty(CSSStyleSheet.prototype, 'rules', descRules);
    }
  }, []);

  return { capture };
}
