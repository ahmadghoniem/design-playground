import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import type { GenerationCoordination } from "@pg/shared/lib/generation-coordination";

export interface UseGenerationCoordinationParams {
  nodes: Node[];
  knownIterations: string[];
  setKnownIterations: Dispatch<SetStateAction<string[]>>;
}

/**
 * Owns generationInfo/isGenerating state, refs mirroring nodes /
 * knownIterations / scanContextOverride, and the scan mutex (lock + queued).
 * Exposes typed accessors so downstream seams never reach into parent refs directly.
 */
export function useGenerationCoordination({
  nodes,
  knownIterations,
  setKnownIterations,
}: UseGenerationCoordinationParams): GenerationCoordination {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationInfo, setGenerationInfo] = useState<
    GenerationCoordination["generationInfo"]
  >(null);

  const isGeneratingRef = useRef(false);
  const generationInfoRef = useRef<GenerationCoordination["generationInfo"]>(null);
  const nodesRef = useRef(nodes);
  const knownIterationsRef = useRef(knownIterations);
  const scanContextOverrideRef = useRef<
    GenerationCoordination["generationInfo"] | undefined
  >(undefined);
  const scanLockRef = useRef(false);
  const scanQueuedRef = useRef(false);

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

  const setGenerationInfoEager = useCallback(
    (info: GenerationCoordination["generationInfo"]) => {
      generationInfoRef.current = info;
      setGenerationInfo(info);
    },
    [],
  );

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
    (ctx?: GenerationCoordination["generationInfo"] | null) => {
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

  const markScanQueued = useCallback(
    (override?: GenerationCoordination["generationInfo"]) => {
      scanQueuedRef.current = true;
      if (override !== undefined) {
        scanContextOverrideRef.current = override;
      }
    },
    [],
  );

  const releaseScanLock = useCallback(() => {
    scanLockRef.current = false;
    const queued = scanQueuedRef.current;
    scanQueuedRef.current = false;
    const override = scanContextOverrideRef.current;
    scanContextOverrideRef.current = undefined;
    return { queued, override };
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
  };
}
