// ============================================================================
// Playground Constants
// All fixed variables used across the playground feature.
// ============================================================================

// ---------------------------------------------------------------------------
// Custom Event Names
// ---------------------------------------------------------------------------

/** Fired to request an immediate iteration fetch/scan */
export const ITERATION_FETCH_EVENT = 'iteration-fetch-requested';

/** Fired when a component enters/exits fullscreen */
const FULLSCREEN_NODE_EVENT = 'playground:fullscreen-node';

/** Fired when a ComponentNode changes its viewport size */
export const COMPONENT_SIZE_CHANGE_EVENT = 'playground:component-size-change';

/** Fired when an adoption completes successfully */
export const ADOPTION_COMPLETE_EVENT = 'playground:adoption-complete';

/** Fired when an adoption encounters an error */
export const ADOPTION_ERROR_EVENT = 'playground:adoption-error';

/** Fired to pan the canvas to a specific flow position */
const PAN_TO_POSITION_EVENT = 'playground:pan-to-position';

/** Fired to fit the viewport around all nodes for a given component */
export const FIT_COMPONENT_NODES_EVENT = 'playground:fit-component-nodes';

/** Fired to trigger auto-arrange of canvas nodes */
export const PLAYGROUND_AUTO_ARRANGE_EVENT = 'PLAYGROUND_AUTO_ARRANGE';

/** Fired to open the Skills catalog modal */
export const OPEN_SKILLS_CATALOG_EVENT = 'playground:open-skills-catalog';

/** Fired after a skill is added or removed so listeners can refresh */
export const SKILLS_CHANGED_EVENT = 'playground:skills-changed';

/** Fired when an iteration node's collapse/expand state is toggled */
export const ITERATION_COLLAPSE_TOGGLE_EVENT = 'playground:iteration-collapse-toggle';

/** Fired to open the clear-all confirmation dialog */
export const PLAYGROUND_CLEAR_EVENT = 'playground:clear-requested';
// ---------------------------------------------------------------------------

/** Key for persisting canvas state (nodes, edges, counter) */
export const STORAGE_KEY = 'playground-canvas-state';

/** Key for persisting the list of available AI models */
const MODELS_STORAGE_KEY = 'playground-ai-models';

/** Key for persisting the user's last selected AI model */
export const SELECTED_MODEL_STORAGE_KEY = 'playground-selected-model';

/** Key for persisting enabled model selections in settings */
const ENABLED_MODELS_STORAGE_KEY = 'playground-model-settings';


/** Key for persisting the preview color-scheme override ('auto' | 'light' | 'dark') */
export const PREVIEW_COLOR_SCHEME_STORAGE_KEY = 'playground-preview-color-scheme';

// ---------------------------------------------------------------------------
// Timing Constants
// ---------------------------------------------------------------------------

/** TTL for the shared async-props cache (ms) */
export const PROPS_CACHE_TTL_MS = 60_000; // 60 seconds

/** TTL for the server-side AI models cache (ms) */
export const MODELS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Canvas Zoom Limits
// ---------------------------------------------------------------------------

/** Maximum zoom level for the playground canvas */
export const CANVAS_MAX_ZOOM = 2;

/** Minimum zoom level for the playground canvas */
export const CANVAS_MIN_ZOOM = 0.1;

// ---------------------------------------------------------------------------
// Node Label Zoom Scaling
// ---------------------------------------------------------------------------

/** Threshold zoom at/above which labels stay at their natural size (no inverse scaling) */
export const NODE_LABEL_SCALE_THRESHOLD = 0.8;

/** Maximum inverse-scale factor applied to node labels when zoomed out */
export const NODE_LABEL_MAX_INV_SCALE = 7;

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
// Component Size Configurations
// ---------------------------------------------------------------------------

export type ComponentSize = 'default' | 'laptop' | 'tablet' | 'mobile';

export interface SizeConfigEntry {
  width: number;
  height: number;
  scale: number;
  label: string;
}

/** Viewport presets for previewing components at different device sizes */
export const SIZE_CONFIG: Record<ComponentSize, SizeConfigEntry> = {
  default: { width: 0, height: 0, scale: 1, label: 'Auto' },
  laptop:  { width: 1470, height: 832, scale: 0.6, label: 'Laptop' },
  tablet:  { width: 768, height: 1024, scale: 0.5, label: 'Tablet' },
  mobile:  { width: 393, height: 852, scale: 0.7, label: 'Mobile' },
};

/** Calculate display dimensions (scaled) for a given size preset */
export function getDisplayDimensions(size: ComponentSize) {
  const config = SIZE_CONFIG[size];
  if (size === 'default') return { width: 'auto' as const, height: 'auto' as const };
  return {
    width: Math.round(config.width * config.scale),
    height: Math.round(config.height * config.scale),
  };
}

// ---------------------------------------------------------------------------
// Iteration Dialog Defaults
// ---------------------------------------------------------------------------

/** Available iteration count options */
export const ITERATION_COUNT_OPTIONS = [1, 2, 3, 4] as const;

/** Default number of iterations to generate */
const DEFAULT_ITERATION_COUNT = 3;

/** Default instructions used when the iterate chat is empty or drag-to-iterate is used */
export const DEFAULT_EMPTY_ITERATION_INSTRUCTIONS = 'make the layout professional and polished. elements should not overlap or clash.';

// ---------------------------------------------------------------------------
// Styling Mode
// ---------------------------------------------------------------------------

export type StylingMode = 'tailwind' | 'inline-css';

/** Default styling mode when no skill overrides it */
export const DEFAULT_STYLING_MODE: StylingMode = 'tailwind';

// ---------------------------------------------------------------------------
// AI Models
// ---------------------------------------------------------------------------

export interface ModelOption {
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// FitView Configurations
// ---------------------------------------------------------------------------

/** FitView config when entering fullscreen on a specific node */
const FITVIEW_FULLSCREEN_ENTER = {
  padding: 0.02,
  duration: 400,
  maxZoom: 2,
  minZoom: 0.1,
} as const;

/** FitView config when exiting fullscreen (show all nodes) */
const FITVIEW_FULLSCREEN_EXIT = {
  padding: 0.2,
  duration: 300,
} as const;

/** FitView config after auto-arrange */
export const FITVIEW_AFTER_ARRANGE = {
  padding: 0.15,
  duration: 400,
  maxZoom: 1,
} as const;

// ---------------------------------------------------------------------------
// Animation / Transition Delays (ms)
// ---------------------------------------------------------------------------

/** Delay before fitting view after entering fullscreen (waits for sidebar animation) */
const FULLSCREEN_ENTER_DELAY = 350;

/** Delay before fitting view after exiting fullscreen */
const FULLSCREEN_EXIT_DELAY = 100;

/** Delay after generation completes before scanning for iterations */
export const POST_GENERATION_SCAN_DELAY = 1000;

// ---------------------------------------------------------------------------
// ReactFlow Background
// ---------------------------------------------------------------------------

/** Solid pane fill behind nodes/dots (see `--xy-background-color` + Background `bgColor`) */
export const CANVAS_BACKGROUND_COLOR = '#ebebeb';

/** Gap between background dots (px) */
export const BACKGROUND_GAP = 10;

/** Size of each background dot (px) */
export const BACKGROUND_DOT_SIZE = 1;

/** Color of background dots */
export const BACKGROUND_COLOR = '#efefef';

// ---------------------------------------------------------------------------
// Server-Side API Constants (used in route handlers)
// ---------------------------------------------------------------------------

/** Name of the iterations index file */
export const ITERATIONS_INDEX_FILENAME = 'index.ts';

/** Relative path to the temporary directory for generation artifacts */
export const TEMP_DIR_RELATIVE = '.playground-temp';

/** Filename for the generation lockfile */
export const GENERATION_LOCKFILE_FILENAME = 'generation.lock';

/** Filename for the discovery scan lockfile */
export const DISCOVERY_LOCKFILE_FILENAME = 'discovery.lock';

/** Filename for the discovery manifest */
export const DISCOVERY_MANIFEST_FILENAME = 'discovery.json';

/**
 * Filename for the discovered-components manifest — the playground-owned JSON
 * that the analyze flow writes registry entries into (instead of splicing the
 * hand-written registry.tsx). The generated module below is rebuilt from it.
 */
export const DISCOVERED_REGISTRY_MANIFEST_FILENAME = 'discovered-registry.json';

/**
 * Filename for the generated registry module. Regenerated wholesale from the
 * manifest on every add/remove so it always reflects the manifest and Vite HMR
 * picks up changes. Committed as an empty-array module for fresh projects.
 */
export const DISCOVERED_REGISTRY_MODULE_FILENAME = 'discovered-registry.gen.tsx';

/** Regex pattern to validate iteration filenames (prevents directory traversal) */
export const ITERATION_FILENAME_PATTERN = /^[A-Za-z0-9]+\.iteration-\d+\.tsx$/;

/** Regex pattern to parse iteration filenames into componentName + number */
export const ITERATION_FILENAME_PARSE_PATTERN = /^(.+)\.iteration-(\d+)\.tsx$/;

// ---------------------------------------------------------------------------
// Edit Mode Constants
// ---------------------------------------------------------------------------

/** Fired when an in-place edit completes (iframe refresh trigger) */
export const EDIT_COMPLETE_EVENT = 'playground:edit-complete';

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

/** Horizontal spacing between depth columns in tree layout (px) */
const TREE_COLUMN_WIDTH = 500;

// ---------------------------------------------------------------------------
// Chat Constants
// ---------------------------------------------------------------------------

/** Default iteration count when submitting via the docked chat bar */
export const CHAT_DEFAULT_COUNT = 3;

/** Payload submitted by the chat composer */
export interface ChatSubmitPayload {
  text: string;
  skillPrompts: string[];
  skillIds: string[];
  model: string;
  targetNodeId: string | null;
  targetComponentId: string | null;
  targetComponentName: string | null;
  targetType: 'component' | 'iteration' | 'image' | 'text' | null;
  sourceFilename?: string;
  iterationCount?: number;
  canvasPosition: { x: number; y: number };
  elementSelections?: {
    tagName: string;
    displayName: string;
    textContent: string;
    cssSelector: string;
    htmlSource: string;
    ancestorComponents: string[];
    nodeId: string;
    componentName: string;
  }[];
  referenceNodes?: {
    nodeId: string;
    componentId: string;
    componentName: string;
    type: 'component' | 'iteration' | 'image' | 'text';
    sourceFilename?: string;
    imagePath?: string;
    imageUrl?: string;
    textContent?: string;
  }[];
  /** When true, edit the target file in-place instead of creating iterations */
  editMode?: boolean;
  /** Cursor chat behavior mode */
  chatMode?: 'explore' | 'edit' | 'raw';
}

// ---------------------------------------------------------------------------
// Generation Event Payload Types
// ---------------------------------------------------------------------------

/** Payload for generation start event */
export interface GenerationStartPayload {
  componentId: string;
  componentName: string;
  parentNodeId: string;
  iterationCount: number;
  /** First iteration number in this batch (e.g. 9 when iterations 1–8 already exist) */
  startNumber?: number;
  /** Model used for this generation */
  model?: string;
  /** Agent CLI used for this generation. Always Claude Code; kept for back-compat with consumers. */
  provider?: string;
  /** Flow-space position where the generation was initiated */
  flowPosition?: { x: number; y: number };
  /** Node this generation is anchored to, when dropped on a frame */
  targetNodeId?: string | null;
  /** When true, this is an edit-in-place operation — no skeleton nodes should be created */
  editMode?: boolean;
}

/** Payload for generation complete event */
export interface GenerationCompletePayload {
  componentId: string;
  parentNodeId: string;
  output: string;
}

/** Payload for generation error event */
export interface GenerationErrorPayload {
  componentId: string;
  parentNodeId: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Adoption Event Payload Types
// ---------------------------------------------------------------------------

/** Payload for ADOPTION_COMPLETE_EVENT */
export interface AdoptionCompletePayload {
  iterationNodeId: string;
  componentId: string;
  parentNodeId: string;
}

/** Payload for ADOPTION_ERROR_EVENT */
export interface AdoptionErrorPayload {
  iterationNodeId: string;
  componentId: string;
  parentNodeId: string;
  error: string;
}
