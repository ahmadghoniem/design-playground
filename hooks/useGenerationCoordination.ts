import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import type { GenerationInfo } from "../lib/canvas-persistence";

export interface UseGenerationCoordinationParams {
  nodes: Node[];
  knownIterations: string[];
  setKnownIterations: Dispatch<SetStateAction<string[]>>;
}

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
  setScanContextOverride: (ctx: GenerationInfo | null | undefined) => void;
  takeScanContextOverride: () => GenerationInfo | null | undefined;

  tryAcquireScanLock: () => boolean;
  releaseScanLock: () => {
    queued: boolean;
    override: GenerationInfo | null | undefined;
  };
  markScanQueued: (override?: GenerationInfo | null) => void;

  resetInactiveStreak: () => void;
  bumpInactiveStreak: () => number;
  getInactiveStreak: () => number;
  getGenerationStartedAt: () => number;
  setGenerationStartedAt: (ms: number) => void;
}

/**
 * Owns the five shared coordination refs (generationInfo, isGenerating, nodes,
 * knownIterations, scanContextOverride) plus scan mutex and reconcile streak refs.
 * Exposes typed accessors so downstream seams never reach into parent refs directly.
 */
export function useGenerationCoordination({
  nodes,
  knownIterations,
  setKnownIterations,
}: UseGenerationCoordinationParams): GenerationCoordination {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationInfo, setGenerationInfo] = useState<GenerationInfo | null>(
    null,
  );

  const isGeneratingRef = useRef(false);
  const generationInfoRef = useRef<GenerationInfo | null>(null);
  const nodesRef = useRef<Node[]>(nodes);
  const knownIterationsRef = useRef<string[]>(knownIterations);
  const scanContextOverrideRef = useRef<GenerationInfo | null | undefined>(
    undefined,
  );
  const scanLockRef = useRef(false);
  const scanQueuedRef = useRef(false);
  const generationStartedAtMsRef = useRef(0);
  const inactiveStatusStreakRef = useRef(0);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    generationInfoRef.current = generationInfo;
  }, [generationInfo]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    knownIterationsRef.current = knownIterations;
  }, [knownIterations]);

  const getGenerationInfo = useCallback(() => generationInfoRef.current, []);
  const getIsGenerating = useCallback(() => isGeneratingRef.current, []);
  const getNodes = useCallback(() => nodesRef.current, []);
  const getKnownIterations = useCallback(() => knownIterationsRef.current, []);
  const peekScanContextOverride = useCallback(
    () => scanContextOverrideRef.current,
    [],
  );

  const setGenerationInfoEager = useCallback((info: GenerationInfo | null) => {
    generationInfoRef.current = info;
    setGenerationInfo(info);
  }, []);

  const setIsGeneratingEager = useCallback((value: boolean) => {
    isGeneratingRef.current = value;
    setIsGenerating(value);
  }, []);

  const clearGenerationEager = useCallback(() => {
    generationInfoRef.current = null;
    isGeneratingRef.current = false;
    setGenerationInfo(null);
    setIsGenerating(false);
  }, []);

  const appendKnownIterations = useCallback(
    (filenames: string[]) => {
      knownIterationsRef.current = [
        ...knownIterationsRef.current,
        ...filenames,
      ];
      setKnownIterations((prev) => [...prev, ...filenames]);
    },
    [setKnownIterations],
  );

  const removeKnownIterations = useCallback(
    (keys: string[]) => {
      if (keys.length === 0) return;
      knownIterationsRef.current = knownIterationsRef.current.filter(
        (k) => !keys.includes(k),
      );
      setKnownIterations((prev) => prev.filter((k) => !keys.includes(k)));
    },
    [setKnownIterations],
  );

  const setScanContextOverride = useCallback(
    (ctx: GenerationInfo | null | undefined) => {
      scanContextOverrideRef.current = ctx;
    },
    [],
  );

  const takeScanContextOverride = useCallback(() => {
    const ctx = scanContextOverrideRef.current;
    scanContextOverrideRef.current = undefined;
    return ctx;
  }, []);

  const tryAcquireScanLock = useCallback(() => {
    if (scanLockRef.current) return false;
    scanLockRef.current = true;
    return true;
  }, []);

  const markScanQueued = useCallback((override?: GenerationInfo | null) => {
    scanQueuedRef.current = true;
    if (override !== undefined) {
      scanContextOverrideRef.current = override;
    }
  }, []);

  const releaseScanLock = useCallback(() => {
    scanLockRef.current = false;
    const queued = scanQueuedRef.current;
    scanQueuedRef.current = false;
    const override = scanContextOverrideRef.current;
    scanContextOverrideRef.current = undefined;
    return { queued, override };
  }, []);

  const resetInactiveStreak = useCallback(() => {
    inactiveStatusStreakRef.current = 0;
  }, []);

  const bumpInactiveStreak = useCallback(() => {
    inactiveStatusStreakRef.current += 1;
    return inactiveStatusStreakRef.current;
  }, []);

  const getInactiveStreak = useCallback(
    () => inactiveStatusStreakRef.current,
    [],
  );

  const getGenerationStartedAt = useCallback(
    () => generationStartedAtMsRef.current,
    [],
  );

  const setGenerationStartedAt = useCallback((ms: number) => {
    generationStartedAtMsRef.current = ms;
  }, []);

  return {
    isGenerating,
    generationInfo,
    setIsGenerating,
    setGenerationInfo,
    getGenerationInfo,
    getIsGenerating,
    getNodes,
    getKnownIterations,
    peekScanContextOverride,
    setGenerationInfoEager,
    setIsGeneratingEager,
    clearGenerationEager,
    appendKnownIterations,
    removeKnownIterations,
    setScanContextOverride,
    takeScanContextOverride,
    tryAcquireScanLock,
    releaseScanLock,
    markScanQueued,
    resetInactiveStreak,
    bumpInactiveStreak,
    getInactiveStreak,
    getGenerationStartedAt,
    setGenerationStartedAt,
  };
}
