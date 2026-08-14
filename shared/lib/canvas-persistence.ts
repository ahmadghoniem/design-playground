// Canvas localStorage persistence + shared canvas types.
//
// Extracted from PlaygroundCanvas so the flow provider (canvas-flow.tsx) can seed state from
// the same source PlaygroundCanvas reads. Behavior is identical to the original inline
// implementation.

import type { Node, Edge } from '@xyflow/react';
import { CANVAS_STATE_STORAGE_KEY } from './constants';

/**
 * Explicit parent→child iteration-tree record. Replaces the old React Flow
 * `Edge[]` state (which was never rendered). Persistence owns the stored shape;
 * `features/canvas/canvas-relations.ts` provides traversal helpers only
 * (shared/ may not import features/).
 */
export interface CanvasRelation {
  parentId: string;
  childId: string;
  kind: 'iteration';
}

/** In-memory generation state for status display during a live run. */
export interface GenerationInfo {
  componentId: string;
  componentName: string;
  parentNodeId: string;
  iterationCount: number;
  /** First iteration number in this batch */
  startNumber?: number;
  skeletonNodeIds: string[];
  startTime: number; // Timestamp when generation started
  /** Skeleton positions for post-generation repositioning (set when skeletons are created) */
  skeletonPositions?: { x: number; y: number }[];
  /** Legacy alias for `skeletonPositions`; still read from old snapshots, never written. */
  gridPositions?: { x: number; y: number }[];
}

export interface CanvasState {
  nodes: Node[];
  relations: CanvasRelation[];
  nodeIdCounter: number;
  knownIterations: string[];
  collapsedNodeIds?: string[];
  /** Persisted viewport (pan/zoom) */
  viewport?: { x: number; y: number; zoom: number };
}

/**
 * Scope canvas persistence to a project. localStorage is keyed by origin
 * (http://localhost:<port>), so without this two projects that reuse a port would
 * read back each other's frames. Falls back to the unscoped key when no id is given.
 */
export function getCanvasStorageKey(projectId?: string): string {
  return projectId ? `${CANVAS_STATE_STORAGE_KEY}:${projectId}` : CANVAS_STATE_STORAGE_KEY;
}

/** Map an iteration node to its dedup key (react filename). */
export function getIterationKeyFromNode(n: Node): string | null {
  if (n.type !== 'iteration') return null;
  if (n.data.filename) {
    return n.data.filename as string;
  }
  return null;
}

/** Keys for iteration nodes currently on the canvas. */
export function getIterationKeysOnCanvas(nodes: Node[]): Set<string> {
  const keys = new Set<string>();
  for (const n of nodes) {
    const key = getIterationKeyFromNode(n);
    if (key) keys.add(key);
  }
  return keys;
}

/** Drop knownIterations entries that have no matching canvas node. */
export function pruneKnownIterations(knownIterations: string[], nodes: Node[]): string[] {
  const onCanvas = getIterationKeysOnCanvas(nodes);
  return knownIterations.filter((k) => onCanvas.has(k));
}

/**
 * Produce the `relations` array for a loaded snapshot. New snapshots already
 * carry `relations`; snapshots written before the relation model store React
 * Flow `edges`, which we convert (edge.source → parentId, edge.target → childId)
 * so existing iteration trees survive the upgrade.
 */
function migrateRelations(raw: CanvasState & { edges?: Edge[] }): CanvasRelation[] {
  if (Array.isArray(raw.relations)) return raw.relations;
  if (Array.isArray(raw.edges)) {
    return raw.edges.map((e) => ({
      parentId: e.source,
      childId: e.target,
      kind: 'iteration' as const,
    }));
  }
  return [];
}

export function loadCanvasState(storageKey: string = CANVAS_STATE_STORAGE_KEY): CanvasState | null {
  if (typeof window === 'undefined') return null;
  try {
    let stored = localStorage.getItem(storageKey);
    // One-time migration: the canvas used to live under a single unscoped key that
    // every project on this origin shared. Adopt that legacy data for the first
    // project that loads, then drop it so it can't leak into other projects.
    if (!stored && storageKey !== CANVAS_STATE_STORAGE_KEY) {
      const legacy = localStorage.getItem(CANVAS_STATE_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(storageKey, legacy);
        localStorage.removeItem(CANVAS_STATE_STORAGE_KEY);
        stored = legacy;
      }
    }
    if (stored) {
      // Parse into a loose shape so an OLD snapshot that still holds React Flow
      // `edges` can be migrated to `relations` before use (see below).
      const raw = JSON.parse(stored) as CanvasState & { edges?: Edge[] };
      const state: CanvasState = {
        ...raw,
        relations: migrateRelations(raw),
      };
      // `edges` is no longer part of the persisted shape.
      delete (state as { edges?: unknown }).edges;

      // A mid-run refresh drops the live view: always strip skeleton nodes and
      // their relations. The CLI keeps writing files; they reappear on the next
      // scan/refresh. Any legacy `generationInfo` key on an old snapshot is
      // ignored (it's simply not part of the shape anymore).
      const skeletonIds = new Set(
        state.nodes.filter(n => n.type === 'skeleton').map(n => n.id),
      );
      if (skeletonIds.size > 0) {
        state.nodes = state.nodes.filter(n => n.type !== 'skeleton');
        state.relations = state.relations.filter(
          r => !skeletonIds.has(r.parentId) && !skeletonIds.has(r.childId),
        );
      }
      // Freeform NodeResizeControl was removed from component/iteration nodes;
      // scrub persisted width/height so old stretched wrappers don't stick.
      state.nodes = state.nodes.map((n) => {
        if (n.type !== 'component' && n.type !== 'iteration') return n;
        const next = { ...n };
        delete next.width;
        delete next.height;
        if (next.style) {
          next.style = { ...next.style };
          delete next.style.width;
          delete next.style.height;
        }
        if (next.data && 'customResized' in next.data) {
          next.data = { ...next.data };
          delete (next.data as { customResized?: unknown }).customResized;
        }
        return next;
      });
      delete (state as { generationInfo?: unknown }).generationInfo;
      if (state.knownIterations?.length) {
        state.knownIterations = pruneKnownIterations(state.knownIterations, state.nodes);
      }
      return state;
    }
  } catch (e) {
    console.error('Failed to load canvas state:', e);
  }
  return null;
}

export function saveCanvasState(
  storageKey: string,
  nodes: Node[],
  relations: CanvasRelation[],
  counter: number,
  knownIterations: string[],
  collapsedNodeIds: string[],
  viewport?: { x: number; y: number; zoom: number },
) {
  if (typeof window === 'undefined') return;
  try {
    const state: CanvasState = {
      nodes, relations, nodeIdCounter: counter, knownIterations, collapsedNodeIds,
      viewport,
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save canvas state:', e);
  }
}
