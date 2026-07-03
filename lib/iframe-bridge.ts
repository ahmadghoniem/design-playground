// ---------------------------------------------------------------------------
// Iframe Bridge — parent side
// ---------------------------------------------------------------------------
// Replaces the old inline-script postMessage protocol (iframe-selection-bridge)
// with typed penpal RPC. Two responsibilities:
//
//  1. injectBridgeScript(html): add a <script type="module"> tag to iframe
//     srcdoc that loads iframe-bridge-child.ts. The URL is resolved relative
//     to this module's own served URL, so it works at any mount dir
//     (src/app/playground or app/playground) — Vite transforms the TS and
//     resolves penpal from the nested node_modules.
//
//  2. connectToIframe(iframe, parentMethods): lazily establish (and cache)
//     one penpal connection per iframe element. Reconnects after the iframe
//     reloads (srcdoc swap on regeneration) via the iframe's `load` event.
// ---------------------------------------------------------------------------

import { WindowMessenger, connect } from 'penpal';
import type {
  PlaygroundChildMethods,
  PlaygroundParentMethods,
  RemoteOf,
} from './iframe-bridge-types';

const CHILD_MODULE_URL = new URL('./iframe-bridge-child.ts', import.meta.url).href;
const CONNECT_TIMEOUT_MS = 3000;

/**
 * Injects the bridge child module into an HTML string (before </body> when
 * present). Same call site contract as the old injectBridgeScript.
 */
export function injectBridgeScript(html: string): string {
  const script = `<script type="module" src="${CHILD_MODULE_URL}" data-bridge="element-select"></script>`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}\n</body>`);
  }
  return html + '\n' + script;
}

interface BridgeEntry {
  remote: Promise<RemoteOf<PlaygroundChildMethods>>;
  destroy: () => void;
}

const connections = new WeakMap<HTMLIFrameElement, BridgeEntry>();

/**
 * Get (or establish) the typed RPC connection to an iframe. `parentMethods`
 * is captured per connection, so callbacks carry the iframe identity via
 * closure — no more matching e.source against every iframe on the page.
 *
 * Returns null when the iframe has no contentWindow (detached).
 */
export function connectToIframe(
  iframe: HTMLIFrameElement,
  parentMethods: PlaygroundParentMethods,
): Promise<RemoteOf<PlaygroundChildMethods>> | null {
  const existing = connections.get(iframe);
  if (existing) return existing.remote;

  const remoteWindow = iframe.contentWindow;
  if (!remoteWindow) return null;

  const connection = connect({
    messenger: new WindowMessenger({ remoteWindow }),
    methods: parentMethods as unknown as Record<string, (...args: never[]) => unknown>,
    timeout: CONNECT_TIMEOUT_MS,
  });

  const entry: BridgeEntry = {
    remote: connection.promise as unknown as Promise<RemoteOf<PlaygroundChildMethods>>,
    destroy: connection.destroy,
  };
  connections.set(iframe, entry);

  // A srcdoc swap (regeneration) replaces the child document — tear down so
  // the next call reconnects to the fresh document.
  const onLoad = () => {
    iframe.removeEventListener('load', onLoad);
    entry.destroy();
    connections.delete(iframe);
  };
  iframe.addEventListener('load', onLoad);

  // Swallow connect failures (timeout on a dead/asset iframe); the entry is
  // removed so a later attempt can retry.
  entry.remote.catch(() => {
    connections.delete(iframe);
  });

  return entry.remote;
}
