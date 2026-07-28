import type { Dispatch, SetStateAction } from "react";
import type { Node } from "@xyflow/react";
import type { GenerationInfo } from "@pg/shared/lib/canvas-persistence";

/**
 * Cross-feature coordination surface for an in-flight generation.
 * Lives in shared/ so canvas and iterations can depend on the type without
 * importing the generation feature (dependency-cruiser no-feature-to-feature).
 */
export interface GenerationCoordination {
  isGenerating: boolean;
  generationInfo: GenerationInfo | null;
  setIsGenerating: Dispatch<SetStateAction<boolean>>;
  setGenerationInfo: Dispatch<SetStateAction<GenerationInfo | null>>;

  getGenerationInfo: () => GenerationInfo | null;
  getIsGenerating: () => boolean;
  getNodes: () => Node[];
  getKnownIterations: () => string[];
  peekScanContextOverride: () => GenerationInfo | null | undefined;

  setGenerationInfoEager: (info: GenerationInfo | null) => void;
  setIsGeneratingEager: (value: boolean) => void;
  clearGenerationEager: () => void;
  appendKnownIterations: (filenames: string[]) => void;
  removeKnownIterations: (keys: string[]) => void;
  setScanContextOverride: (ctx?: GenerationInfo | null) => void;
  takeScanContextOverride: () => GenerationInfo | null | undefined;

  tryAcquireScanLock: () => boolean;
  releaseScanLock: () => {
    queued: boolean;
    override: GenerationInfo | null | undefined;
  };
  markScanQueued: (override?: GenerationInfo | null) => void;
}
