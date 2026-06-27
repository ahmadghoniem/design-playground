/**
 * Public re-export shim.
 *
 * The canonical implementations have moved to `nodes/shared/iterate-dialog/parts.tsx`.
 * This file keeps existing import paths (`nodes/shared/IterateDialogParts`) working
 * for: PlaygroundCanvas, DockedChatBar, ModelSettingsModal, useModelCycle.
 */
export {
  loadSelectedModel,
  saveSelectedModel,
  useAvailableModels,
  IterationCountDropdown,
  DepthDropdown,
  ModelDropdown,
  CancelGenerationButton,
} from './iterate-dialog/parts';

// Re-export the type alias used by external consumers
export type { ModelOption } from './iterate-dialog/parts';
