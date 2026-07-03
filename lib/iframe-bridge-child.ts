// ---------------------------------------------------------------------------
// Iframe Bridge — child side
// ---------------------------------------------------------------------------
// Runs INSIDE HTML-preview iframes. Loaded as a Vite-served module via the
// <script type="module" src=...> tag that injectBridgeScript() adds to the
// srcdoc, so it can import penpal from the nested node_modules (the package
// is dev-only — Vite always serves it).
//
// Exposes typed methods to the parent (enter/exit select mode, coordinate
// proxies for the overlay) and calls parent methods on hover/select. Console
// errors are buffered from document start and flushed once connected.
// ---------------------------------------------------------------------------

import { WindowMessenger, connect } from 'penpal';
import type {
  BridgeElementContext,
  PlaygroundChildMethods,
  PlaygroundParentMethods,
  RemoteOf,
} from './iframe-bridge-types';

// ── Context extraction (same shapes the old inline bridge script produced) ──

const ATTRS = ['class', 'id', 'role', 'aria-label', 'href', 'src', 'type', 'placeholder'];

function buildSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const cls = Array.from(el.classList).slice(0, 3).join('.');
  return cls ? `${tag}.${cls}` : tag;
}

function getAncestors(el: Element, max = 8): string[] {
  const result: string[] = [];
  let cur = el.parentElement;
  let depth = 0;
  while (cur && depth < max) {
    if (cur !== document.body && cur !== document.documentElement) {
      result.push(cur.tagName.toLowerCase());
    }
    cur = cur.parentElement;
    depth++;
  }
  return result;
}

function getAttrs(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of ATTRS) {
    const v = el.getAttribute(attr);
    if (v) out[attr === 'class' ? 'className' : attr] = v;
  }
  return out;
}

function extractContext(el: HTMLElement): BridgeElementContext {
  const tag = el.tagName.toLowerCase();
  const raw = (el.innerText || '').trim();
  const html = el.outerHTML;
  const rect = el.getBoundingClientRect();
  return {
    oid: el.getAttribute('data-pg-oid') ?? undefined,
    tagName: tag,
    displayName: tag,
    textContent: raw.length > 150 ? raw.slice(0, 150) + '…' : raw,
    attributes: getAttrs(el),
    cssSelector: buildSelector(el),
    ancestorComponents: getAncestors(el),
    htmlSource: html.length > 500 ? html.slice(0, 500) + '…' : html,
    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
  };
}

function elementAt(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y);
  if (!el || el === document.body || el === document.documentElement) return null;
  return el as HTMLElement;
}

// ── Console-error buffering (flushed to the parent once connected) ──

const errorBuffer: string[] = [];
let parentRemote: RemoteOf<PlaygroundParentMethods> | null = null;

function reportError(text: string) {
  if (parentRemote) {
    parentRemote.onConsoleError(text).catch(() => {});
  } else if (errorBuffer.length < 50) {
    errorBuffer.push(text);
  }
}

window.addEventListener('error', (e) => {
  reportError(e.message || String(e.error ?? 'Unknown error'));
});
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  originalConsoleError(...args);
  reportError(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
};

// ── Selection mode ──

let active = false;
let lastTarget: HTMLElement | null = null;

function hoverElement(el: HTMLElement | null) {
  if (!el) {
    if (lastTarget) {
      lastTarget = null;
      parentRemote?.onHoverClear().catch(() => {});
    }
    return;
  }
  if (el === lastTarget) return;
  lastTarget = el;
  parentRemote?.onHover(extractContext(el)).catch(() => {});
}

document.addEventListener('mousemove', (e) => {
  if (!active) return;
  hoverElement(elementAt(e.clientX, e.clientY));
});

document.addEventListener(
  'click',
  (e) => {
    if (!active) return;
    const el = elementAt(e.clientX, e.clientY);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    parentRemote?.onSelect(extractContext(el)).catch(() => {});
  },
  true,
);

// ── Methods exposed to the parent ──

const methods: PlaygroundChildMethods = {
  enterSelectMode() {
    active = true;
    document.body.style.cursor = 'crosshair';
  },
  exitSelectMode() {
    active = false;
    lastTarget = null;
    document.body.style.cursor = '';
  },
  // The parent proxies overlay mouse coordinates (iframe-local) through these
  // when the node isn't selected and an overlay covers the iframe.
  hoverAt(x: number, y: number) {
    hoverElement(elementAt(x, y));
  },
  clickAt(x: number, y: number) {
    const el = elementAt(x, y);
    if (!el) return;
    parentRemote?.onSelect(extractContext(el)).catch(() => {});
  },
};

// ── Connect (srcdoc iframes share the parent origin, so defaults apply) ──

const connection = connect({
  messenger: new WindowMessenger({ remoteWindow: window.parent }),
  methods: methods as unknown as Record<string, (...args: never[]) => unknown>,
});

(connection.promise as unknown as Promise<RemoteOf<PlaygroundParentMethods>>)
  .then((remote) => {
    parentRemote = remote;
    for (const msg of errorBuffer.splice(0)) {
      remote.onConsoleError(msg).catch(() => {});
    }
  })
  .catch(() => {
    // Parent never connected (e.g. selection mode unused) — harmless.
  });
