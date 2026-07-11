// ---------------------------------------------------------------------------
// Iframe Bridge — shared method contracts (parent ↔ child)
// ---------------------------------------------------------------------------
// Mirrors Onlook's packages/penpal pattern: the penpal npm lib does the RPC,
// this file is just the typed contract both sides implement.
// ---------------------------------------------------------------------------

/** Element description sent from inside an iframe (no React fibers there). */
export interface BridgeElementContext {
  /** data-pg-oid stamped into the on-disk HTML — exact grep target for the agent. */
  oid?: string;
  tagName: string;
  displayName: string;
  textContent: string;
  attributes: Record<string, string>;
  cssSelector: string;
  ancestorComponents: string[];
  htmlSource: string;
  rect: { top: number; left: number; width: number; height: number };
}

/** Methods the iframe (child) exposes to the playground (parent). */
export interface PlaygroundChildMethods {
  enterSelectMode(): void;
  exitSelectMode(): void;
  /** Overlay-proxied hover at iframe-local coordinates. */
  hoverAt(x: number, y: number): void;
  /** Overlay-proxied click at iframe-local coordinates. */
  clickAt(x: number, y: number): void;
}

/** Methods the playground (parent) exposes to each iframe (child). */
export interface PlaygroundParentMethods {
  onHover(ctx: BridgeElementContext): void;
  onHoverClear(): void;
  onSelect(ctx: BridgeElementContext): void;
  /** Console/window errors from inside the iframe (buffered pre-connect). */
  onConsoleError(text: string): void;
}

/** Penpal wraps every remote method's return in a promise. */
export type RemoteOf<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};
