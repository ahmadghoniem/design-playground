import { useState, useRef, useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  extractElementContext,
  createHtmlElementContext,
  type SelectedElement,
  type ElementContext,
} from '../lib/element-context';
import { connectToIframe } from '../lib/iframe-bridge';
import type { BridgeElementContext } from '../lib/iframe-bridge-types';

// Selectors for playground chrome that should be excluded from element selection
const EXCLUDE_SELECTORS = [
  '.react-flow__controls',
  '[data-playground-header]',
  '.react-flow__attribution',
];

export interface UseElementSelectionReturn {
  isAltHeld: boolean;
  hoveredElement: HTMLElement | null;
  hoveredRect: DOMRect | null;
  hoveredInfo: { tagName: string; displayName: string } | null;
  selectedElements: SelectedElement[];
  clearSelection: () => void;
  removeElement: (index: number) => void;
}

// -----------------------------------------------------------------------
// Iframe bridge helpers
// -----------------------------------------------------------------------

/** Find all iframes inside ReactFlow nodes */
function getNodeIframes(): HTMLIFrameElement[] {
  return Array.from(
    document.querySelectorAll<HTMLIFrameElement>('.react-flow__node iframe[sandbox]'),
  );
}

/** Resolve which ReactFlow node an iframe belongs to */
function resolveNodeFromIframe(
  iframe: HTMLIFrameElement,
  getNodes: () => Array<{ id: string; data: Record<string, unknown> }>,
) {
  const nodeWrapper = iframe.closest('.react-flow__node') as HTMLElement | null;
  if (!nodeWrapper) return null;
  const nodeId = nodeWrapper.dataset.id;
  if (!nodeId) return null;
  const nodes = getNodes();
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const data = node.data as Record<string, unknown>;
  return {
    nodeId,
    componentName:
      (data.htmlFolder as string) ||
      (data.componentName as string) ||
      (data.name as string) ||
      node.id,
  };
}

/** Convert iframe-relative rect to page-absolute DOMRect, accounting for CSS transform scale */
function iframeRectToPage(
  iframeRect: { top: number; left: number; width: number; height: number },
  iframe: HTMLIFrameElement,
): DOMRect {
  const iframeBounds = iframe.getBoundingClientRect();
  // The iframe may have CSS transform: scale() applied — detect by comparing
  // visual size (getBoundingClientRect) to layout size (offsetWidth)
  const scale = iframe.offsetWidth > 0 ? iframeBounds.width / iframe.offsetWidth : 1;
  return new DOMRect(
    iframeBounds.left + iframeRect.left * scale,
    iframeBounds.top + iframeRect.top * scale,
    iframeRect.width * scale,
    iframeRect.height * scale,
  );
}

// -----------------------------------------------------------------------
// Main hook
// -----------------------------------------------------------------------

export function useElementSelection(): UseElementSelectionReturn {
  const [isAltHeld, setIsAltHeld] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ tagName: string; displayName: string } | null>(null);
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);

  const altRef = useRef(false);
  const { getNodes } = useReactFlow();

  // -----------------------------------------------------------------------
  // Per-iframe typed bridge (penpal RPC). The iframe identity travels via
  // closure in the parent methods, so hover/select callbacks don't need to
  // match message sources against every iframe on the page.
  // -----------------------------------------------------------------------

  const bridgeFor = useCallback(
    (iframe: HTMLIFrameElement) =>
      connectToIframe(iframe, {
        onHover: (ctx: BridgeElementContext) => {
          const pageRect = iframeRectToPage(ctx.rect, iframe);
          setHoveredElement(iframe);
          setHoveredRect(pageRect);
          setHoveredInfo({
            tagName: ctx.tagName,
            displayName: ctx.displayName || ctx.tagName,
          });
        },
        onHoverClear: () => {
          setHoveredElement(null);
          setHoveredRect(null);
          setHoveredInfo(null);
        },
        onSelect: (ctx: BridgeElementContext) => {
          const nodeInfo = resolveNodeFromIframe(
            iframe,
            getNodes as () => Array<{ id: string; data: Record<string, unknown> }>,
          );
          if (!nodeInfo) return;

          const context: ElementContext = createHtmlElementContext(ctx);

          const newElement: SelectedElement = {
            element: iframe,
            context,
            nodeId: nodeInfo.nodeId,
            componentName: nodeInfo.componentName,
            iframeRect: ctx.rect,
          };

          setSelectedElements((prev) => {
            // For iframe elements, toggle by matching cssSelector + nodeId
            const existingIndex = prev.findIndex(
              (s) => s.nodeId === nodeInfo.nodeId && s.context.cssSelector === context.cssSelector,
            );
            if (existingIndex !== -1) {
              return prev.filter((_, i) => i !== existingIndex);
            }
            // Shift state isn't observable from the child click, so iframe
            // selections always replace (single select) — same as before.
            return [newElement];
          });
        },
        onConsoleError: () => {
          // Transport exists; surfacing (error badges) lands in a later chunk.
        },
      }),
    [getNodes],
  );

  const setSelectModeAll = useCallback(
    (enter: boolean) => {
      for (const iframe of getNodeIframes()) {
        bridgeFor(iframe)
          ?.then((child) => (enter ? child.enterSelectMode() : child.exitSelectMode()))
          .catch(() => {});
      }
    },
    [bridgeFor],
  );

  // -----------------------------------------------------------------------
  // Alt key tracking + iframe bridge enter/exit
  // -----------------------------------------------------------------------

  useEffect(() => {
    const holdKey = "Alt";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === holdKey) {
        altRef.current = true;
        setIsAltHeld(true);
        document.documentElement.classList.add('element-select-mode');
        setSelectModeAll(true);
      }
    };

    const reset = () => {
      altRef.current = false;
      setIsAltHeld(false);
      setHoveredElement(null);
      setHoveredRect(null);
      setHoveredInfo(null);
      document.documentElement.classList.remove('element-select-mode');
      setSelectModeAll(false);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === holdKey) reset();
    };

    const handleBlur = () => reset();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.documentElement.classList.remove('element-select-mode');
    };
  }, [setSelectModeAll]);

  // -----------------------------------------------------------------------
  // Resolve ReactFlow node from a DOM element
  // -----------------------------------------------------------------------

  const resolveNode = useCallback(
    (el: HTMLElement) => {
      const nodeWrapper = el.closest('.react-flow__node') as HTMLElement | null;
      if (!nodeWrapper) return null;

      const nodeId = nodeWrapper.dataset.id;
      if (!nodeId) return null;

      const nodes = getNodes();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const data = node.data as Record<string, unknown>;
      return {
        nodeId,
        componentName: (data.componentName as string) || (data.name as string) || node.id,
      };
    },
    [getNodes],
  );

  // -----------------------------------------------------------------------
  // Hover detection (when Alt is held) — React components only
  // -----------------------------------------------------------------------

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!altRef.current) return;

      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el) {
        setHoveredElement(null);
        setHoveredRect(null);
        setHoveredInfo(null);
        return;
      }

      // Filter out playground chrome
      for (const sel of EXCLUDE_SELECTORS) {
        if (el.closest(sel)) {
          setHoveredElement(null);
          setHoveredRect(null);
          setHoveredInfo(null);
          return;
        }
      }

      // Must be inside a ReactFlow node
      if (!el.closest('.react-flow__node')) {
        setHoveredElement(null);
        setHoveredRect(null);
        setHoveredInfo(null);
        return;
      }

      // If hovering an iframe directly (node is selected, overlay removed), bridge handles it
      if (el.tagName === 'IFRAME') return;

      // If hovering the iframe overlay (node NOT selected), proxy coordinates to iframe bridge
      if (el.hasAttribute('data-iframe-overlay')) {
        const iframe = el.parentElement?.querySelector('iframe') as HTMLIFrameElement | null;
        if (iframe) {
          const bounds = iframe.getBoundingClientRect();
          const scale = iframe.offsetWidth > 0 ? bounds.width / iframe.offsetWidth : 1;
          const x = (e.clientX - bounds.left) / scale;
          const y = (e.clientY - bounds.top) / scale;
          bridgeFor(iframe)?.then((child) => child.hoverAt(x, y)).catch(() => {});
        }
        return;
      }

      setHoveredElement(el);
      setHoveredRect(el.getBoundingClientRect());

      // Lightweight info extraction (cheap)
      const tagName = el.tagName.toLowerCase();
      // Try to get React component name from fiber
      const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
      let displayName = tagName;
      if (fiberKey) {
        let fiber = (el as unknown as Record<string, unknown>)[fiberKey] as Record<string, unknown> | null;
        while (fiber) {
          const type = fiber.type as ((...args: unknown[]) => unknown) | string | null;
          if (typeof type === 'function' && (type as { name?: string }).name) {
            const name = (type as { name: string }).name;
            if (!name.startsWith('_') && name[0] === name[0].toUpperCase()) {
              displayName = name;
              break;
            }
          }
          fiber = fiber.return as Record<string, unknown> | null;
        }
      }
      setHoveredInfo({ tagName, displayName });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [bridgeFor]);

  // -----------------------------------------------------------------------
  // Click handling (when Alt is held) — React components only
  // -----------------------------------------------------------------------

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;

      // If Alt is NOT held, clear selections on any click
      if (!altRef.current) {
        setSelectedElements((prev) => (prev.length > 0 ? [] : prev));
        return;
      }

      // Must be inside a ReactFlow node
      if (!target.closest('.react-flow__node')) return;

      // If clicking on an iframe directly (node selected, overlay gone), bridge handles it
      if (target.tagName === 'IFRAME') {
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      // If clicking on the iframe overlay (node NOT selected), proxy click to iframe bridge
      if (target.hasAttribute('data-iframe-overlay')) {
        e.stopPropagation();
        e.preventDefault();
        const iframe = target.parentElement?.querySelector('iframe') as HTMLIFrameElement | null;
        if (iframe) {
          const bounds = iframe.getBoundingClientRect();
          const scale = iframe.offsetWidth > 0 ? bounds.width / iframe.offsetWidth : 1;
          const x = (e.clientX - bounds.left) / scale;
          const y = (e.clientY - bounds.top) / scale;
          bridgeFor(iframe)?.then((child) => child.clickAt(x, y)).catch(() => {});
        }
        return;
      }

      // Block event from reaching ReactFlow
      e.stopPropagation();
      e.preventDefault();

      const nodeInfo = resolveNode(target);
      if (!nodeInfo) return;

      const context = extractElementContext(target);

      const newElement: SelectedElement = {
        element: target,
        context,
        nodeId: nodeInfo.nodeId,
        componentName: nodeInfo.componentName,
      };

      setSelectedElements((prev) => {
        // Check if already selected — toggle off
        const existingIndex = prev.findIndex((s) => s.element === target);
        if (existingIndex !== -1) {
          return prev.filter((_, i) => i !== existingIndex);
        }

        // Shift = multi-select, otherwise replace
        if (e.shiftKey) {
          return [...prev, newElement];
        }
        return [newElement];
      });
    };

    window.addEventListener('mousedown', handleMouseDown, true);
    return () => window.removeEventListener('mousedown', handleMouseDown, true);
  }, [resolveNode, bridgeFor]);

  // -----------------------------------------------------------------------
  // Stale element cleanup + rect refresh
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (selectedElements.length === 0) return;

    const interval = setInterval(() => {
      setSelectedElements((prev) => {
        const filtered = prev.filter((s) => document.contains(s.element));
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedElements.length]);

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const clearSelection = useCallback(() => {
    setSelectedElements([]);
    setHoveredElement(null);
    setHoveredRect(null);
    setHoveredInfo(null);
  }, []);

  const removeElement = useCallback((index: number) => {
    setSelectedElements((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    isAltHeld,
    hoveredElement,
    hoveredRect,
    hoveredInfo,
    selectedElements,
    clearSelection,
    removeElement,
  };
}
