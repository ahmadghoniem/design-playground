// ============================================================================
// Playground Constants
// All fixed variables used across the playground feature.
// ============================================================================

/** Key for persisting canvas state (nodes, relations, counter, viewport) */
export const CANVAS_STATE_STORAGE_KEY = 'playground-canvas-state';

// ---------------------------------------------------------------------------
// Canvas Layout Constants
// ---------------------------------------------------------------------------

/** Horizontal gap between the component column and iteration column (px) */
export const ARRANGE_HORIZONTAL_GAP = 80;

// ---------------------------------------------------------------------------
// Default Node Dimensions (estimated, used when measured size is unavailable)
// ---------------------------------------------------------------------------

/** Default estimated width for iteration / skeleton nodes (px) */
export const DEFAULT_ITERATION_NODE_WIDTH = 400;

/** Default estimated height for iteration / skeleton nodes (px) */
export const DEFAULT_ITERATION_NODE_HEIGHT = 300;

/** Default estimated width for component nodes (px) */
export const DEFAULT_COMPONENT_NODE_WIDTH = 650;

/** Default estimated height for component nodes (px) */
export const DEFAULT_COMPONENT_NODE_HEIGHT = 450;

/** Minimum width when freeform-resizing a node (px) */
export const RESIZE_MIN_WIDTH = 150;

/** Minimum height when freeform-resizing a node (px) */
export const RESIZE_MIN_HEIGHT = 100;

// ---------------------------------------------------------------------------
// Viewport Presets
// ---------------------------------------------------------------------------

export type Viewport = 'default' | 'laptop' | 'tablet' | 'mobile';

export interface ViewportPreset {
  width: number;
  height: number;
  scale: number;
  label: string;
}

/** Viewport presets for previewing components at different device sizes */
export const VIEWPORT_PRESETS: Record<Viewport, ViewportPreset> = {
  default: { width: 0, height: 0, scale: 1, label: 'Auto' },
  laptop:  { width: 1470, height: 832, scale: 0.6, label: 'Desktop' },
  tablet:  { width: 768, height: 1024, scale: 0.5, label: 'Tablet' },
  mobile:  { width: 393, height: 852, scale: 0.7, label: 'Mobile' },
};

/** Calculate display dimensions (scaled) for a given viewport preset */
export function getDisplayDimensions(viewport: Viewport) {
  const config = VIEWPORT_PRESETS[viewport];
  if (viewport === 'default') return { width: 'auto' as const, height: 'auto' as const };
  return {
    width: Math.round(config.width * config.scale),
    height: Math.round(config.height * config.scale),
  };
}

// ---------------------------------------------------------------------------
// AI Models
// ---------------------------------------------------------------------------

export interface ModelOption {
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Server-Side API Constants (used in route handlers)
// ---------------------------------------------------------------------------

/** Name of the iterations index file */
export const ITERATIONS_INDEX_FILENAME = 'index.ts';

/** Relative path to the temporary directory for generation artifacts */
export const TEMP_DIR_RELATIVE = '.playground-temp';

/** Filename for the generation lockfile */
export const GENERATION_LOCKFILE_FILENAME = 'generation.lock';

/** Regex pattern to validate iteration filenames (prevents directory traversal) */
export const ITERATION_FILENAME_PATTERN = /^[A-Za-z0-9]+\.iteration-\d+\.tsx$/;

/** Regex pattern to parse iteration filenames into componentName + number */
export const ITERATION_FILENAME_PARSE_PATTERN = /^(.+)\.iteration-(\d+)\.tsx$/;

// ---------------------------------------------------------------------------
// Drag & Drop
// ---------------------------------------------------------------------------

/** MIME-like key used for drag-and-drop data transfer of playground components */
export const DND_DATA_KEY = 'application/x-playground-component';


// ---------------------------------------------------------------------------
// Tree Layout Constants
// ---------------------------------------------------------------------------

/** Filename for the iteration tree manifest */
export const TREE_MANIFEST_FILENAME = 'tree.json';

// ---------------------------------------------------------------------------
// Chat Constants
// ---------------------------------------------------------------------------

/** Default iteration count when submitting via the docked chat bar */
export const CHAT_DEFAULT_COUNT = 3;

