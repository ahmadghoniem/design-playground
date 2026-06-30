'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { DrawStroke } from '../lib/draw-types';
import { PLAYGROUND_CLEAR_EVENT } from '../lib/constants';

export interface UseCanvasClearParams {
  stopPolling: () => void;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setKnownIterations: Dispatch<SetStateAction<string[]>>;
  setCollapsedNodeIds: Dispatch<SetStateAction<Set<string>>>;
  setCanvasDrawings: Dispatch<SetStateAction<DrawStroke[]>>;
  storageKey: string;
}

export function useCanvasClear({
  stopPolling,
  setNodes,
  setEdges,
  setKnownIterations,
  setCollapsedNodeIds,
  setCanvasDrawings,
  storageKey,
}: UseCanvasClearParams) {
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    const handleClear = () => setShowClearDialog(true);
    window.addEventListener(PLAYGROUND_CLEAR_EVENT, handleClear);
    return () => window.removeEventListener(PLAYGROUND_CLEAR_EVENT, handleClear);
  }, []);

  const confirmClearAllNodes = useCallback(async () => {
    stopPolling();

    try {
      await fetch('/playground/api/generate', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('[Playground] Error cancelling generation during clear:', error);
    }

    try {
      const response = await fetch('/playground/api/iterations');
      if (response.ok) {
        const data = (await response.json()) as { iterations?: { filename: string }[] };
        const iterationFilenames = (data.iterations ?? []).map((iter) => iter.filename);

        await Promise.all(
          iterationFilenames.map(async (filename) => {
            try {
              await fetch('/playground/api/iterations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, mode: 'cascade' as const }),
              });
            } catch (error) {
              console.error(`Error deleting iteration file ${filename}:`, error);
            }
          }),
        );
      }
    } catch (error) {
      console.error('Error clearing iteration files:', error);
    }

    setNodes([]);
    setEdges([]);
    setKnownIterations([]);
    setCollapsedNodeIds(new Set());
    setCanvasDrawings([]);

    localStorage.removeItem(storageKey);

    setShowClearDialog(false);
  }, [setNodes, setEdges, setKnownIterations, setCollapsedNodeIds, setCanvasDrawings, stopPolling, storageKey]);

  return {
    showClearDialog,
    setShowClearDialog,
    confirmClearAllNodes,
  };
}
