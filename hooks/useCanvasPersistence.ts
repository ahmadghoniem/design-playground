'use client';

import { useEffect, type MutableRefObject } from 'react';
import type { Edge, Node, Viewport } from '@xyflow/react';
import type { DrawStroke } from '../lib/draw-types';
import { saveCanvasState } from '../lib/canvas-persistence';
import type { GenerationCoordination } from './useGenerationCoordination';

export interface UseCanvasPersistenceParams {
  storageKey: string;
  nodes: Node[];
  edges: Edge[];
  coord: GenerationCoordination;
  knownIterations: string[];
  collapsedNodeIds: Set<string>;
  collapsedNodeIdsRef: MutableRefObject<Set<string>>;
  canvasDrawings: DrawStroke[];
  canvasDrawingsRef: MutableRefObject<DrawStroke[]>;
  nodeIdCounterRef: MutableRefObject<number>;
  getViewport: () => Viewport;
}

export function useCanvasPersistence({
  storageKey,
  nodes,
  edges,
  coord,
  knownIterations,
  collapsedNodeIds,
  collapsedNodeIdsRef,
  canvasDrawings,
  canvasDrawingsRef,
  nodeIdCounterRef,
  getViewport,
}: UseCanvasPersistenceParams): void {
  // Save to localStorage whenever nodes or edges change.
  useEffect(() => {
    saveCanvasState(
      storageKey,
      nodes,
      edges,
      nodeIdCounterRef.current,
      knownIterations,
      Array.from(collapsedNodeIds),
      coord.getGenerationInfo(),
      getViewport(),
      canvasDrawingsRef.current,
    );
  }, [nodes, edges, knownIterations, collapsedNodeIds, canvasDrawings, getViewport, storageKey]);

  // Save viewport on page unload (captures pan/zoom changes that don't trigger node updates)
  useEffect(() => {
    const handler = () => {
      saveCanvasState(
        storageKey,
        coord.getNodes(),
        edges,
        nodeIdCounterRef.current,
        coord.getKnownIterations(),
        Array.from(collapsedNodeIdsRef.current),
        coord.getGenerationInfo(),
        getViewport(),
        canvasDrawingsRef.current,
      );
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [edges, getViewport, storageKey]);
}
