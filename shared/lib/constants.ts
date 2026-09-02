/** Holds nodes, relations, counter, and viewport. */
export const CANVAS_STATE_STORAGE_KEY = 'playground-canvas-state';

/** Gap between the component and iteration columns (px) */
export const ARRANGE_HORIZONTAL_GAP = 80;

/** Pre-measurement estimate, before layout sizes are known (px) */
export const DEFAULT_ITERATION_NODE_WIDTH = 400;

/** Pre-measurement estimate, before layout sizes are known (px) */
export const DEFAULT_ITERATION_NODE_HEIGHT = 300;

/** Pre-measurement estimate, before the component renders (px) */
export const DEFAULT_COMPONENT_NODE_WIDTH = 650;

/** Pre-measurement estimate, before the component renders (px) */
export const DEFAULT_COMPONENT_NODE_HEIGHT = 450;

/** Floor for manual drag-resize (px) */
export const RESIZE_MIN_WIDTH = 150;

/** Floor for manual drag-resize (px) */
export const RESIZE_MIN_HEIGHT = 100;

export type Viewport = 'default' | 'laptop' | 'tablet' | 'mobile';

export interface ViewportPreset {
  width: number;
  height: number;
  scale: number;
  label: string;
}

export const VIEWPORT_PRESETS: Record<Viewport, ViewportPreset> = {
  default: { width: 0, height: 0, scale: 1, label: 'Auto' },
  laptop:  { width: 1470, height: 832, scale: 0.6, label: 'Desktop' },
  tablet:  { width: 768, height: 1024, scale: 0.5, label: 'Tablet' },
  mobile:  { width: 393, height: 852, scale: 0.7, label: 'Mobile' },
};

export function getDisplayDimensions(viewport: Viewport) {
  const config = VIEWPORT_PRESETS[viewport];
  if (viewport === 'default') return { width: 'auto' as const, height: 'auto' as const };
  return {
    width: Math.round(config.width * config.scale),
    height: Math.round(config.height * config.scale),
  };
}

export interface ModelOption {
  value: string;
  label: string;
}

export const ITERATIONS_INDEX_FILENAME = 'index.ts';

export const TEMP_DIR_RELATIVE = '.playground-temp';

export const GENERATION_LOCKFILE_FILENAME = 'generation.lock';

/** Regex pattern to validate iteration filenames (prevents directory traversal) */
export const ITERATION_FILENAME_PATTERN = /^[A-Za-z0-9]+\.iteration-\d+\.tsx$/;

export const ITERATION_FILENAME_PARSE_PATTERN = /^(.+)\.iteration-(\d+)\.tsx$/;

export const DND_DATA_KEY = 'application/x-playground-component';

export const TREE_MANIFEST_FILENAME = 'tree.json';

export const CHAT_DEFAULT_COUNT = 3;

