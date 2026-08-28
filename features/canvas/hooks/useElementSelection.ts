import { useState, useRef, useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  extractElementContext,
  getReactComponentName,
  type SelectedElement,
} from '@pg/shared/lib/element-context';

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

export function useElementSelection(): UseElementSelectionReturn {
  const [isAltHeld, setIsAltHeld] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ tagName: string; displayName: string } | null>(null);
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);

  const altRef = useRef(false);
  const { getNodes } = useReactFlow();

  useEffect(() => {
    const holdKey = "Alt";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === holdKey) {
        altRef.current = true;
        setIsAltHeld(true);
        document.documentElement.classList.add('element-select-mode');
      }
    };

    const reset = () => {
      altRef.current = false;
      setIsAltHeld(false);
      setHoveredElement(null);
      setHoveredRect(null);
      setHoveredInfo(null);
      document.documentElement.classList.remove('element-select-mode');
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
  }, []);

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

      for (const sel of EXCLUDE_SELECTORS) {
        if (el.closest(sel)) {
          setHoveredElement(null);
          setHoveredRect(null);
          setHoveredInfo(null);
          return;
        }
      }

      if (!el.closest('.react-flow__node')) {
        setHoveredElement(null);
        setHoveredRect(null);
        setHoveredInfo(null);
        return;
      }

      setHoveredElement(el);
      setHoveredRect(el.getBoundingClientRect());

      // Lightweight info extraction (cheap) — same resolver as extractElementContext
      const tagName = el.tagName.toLowerCase();
      const displayName = getReactComponentName(el) || tagName;
      setHoveredInfo({ tagName, displayName });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;

      if (!altRef.current) {
        setSelectedElements((prev) => (prev.length > 0 ? [] : prev));
        return;
      }

      if (!target.closest('.react-flow__node')) return;

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
        const existingIndex = prev.findIndex((s) => s.element === target);
        if (existingIndex !== -1) {
          return prev.filter((_, i) => i !== existingIndex);
        }

        if (e.shiftKey) {
          return [...prev, newElement];
        }
        return [newElement];
      });
    };

    window.addEventListener('mousedown', handleMouseDown, true);
    return () => window.removeEventListener('mousedown', handleMouseDown, true);
  }, [resolveNode]);

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
