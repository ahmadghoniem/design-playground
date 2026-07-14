import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ArrowUp, Loader2, Zap } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pg/shared/ui/tooltip";
import {
  generateIterationPrompt,
  generateIterationFromIterationPrompt,
} from "@pg/registry";
import {
  InlineReference,
  InlineReferenceInput,
  InlineReferenceContent,
} from "@pg/shared/ui/inline-reference";
import { ImpeccableSkillPicker } from "@pg/shared/ui/impeccable-skill-picker";
import { ImpeccableDemoteMenu } from "@pg/shared/ui/impeccable-demote-menu";
import { getProviderFields } from "@pg/shared/lib/generation-body";
import {
  generationEvents,
} from "@pg/shared/lib/generation-events";
import {
  ITERATION_PROMPT_COPIED_EVENT,
  DRAG_GHOST_GAP,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_HEIGHT,
  DEFAULT_ITERATION_NODE_WIDTH,
  DEFAULT_ITERATION_NODE_HEIGHT,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
} from "@pg/shared/lib/constants";
import {
  useDragToIterate,
  clampGrid,
  type DragDelta,
  type CursorScreenPos,
  type DragIterateGrid,
} from "@pg/shared/lib/useDragToIterate";
import DragSelectionOverlay from "./DragSelectionOverlay";
import {
  GHOST_NODE_PREFIX,
  type PendingDragGrid,
  computeDragGridRaw,
  buildGhostBoundingNode,
} from "@pg/shared/lib/drag-ghost-grid";
import {
  ModelPillDropdown,
  VariationCountDropdown,
} from "@pg/shared/ui/iterate-dialog/dropdowns";
import { useIterateDialogState } from "@pg/shared/ui/iterate-dialog/useIterateDialogState";

// ---------------------------------------------------------------------------
// IterateDialog — inline popover panel
// ---------------------------------------------------------------------------

export interface IterateDialogProps {
  componentId: string;
  componentName: string;
  parentNodeId: string;
  sourceFilename?: string;
  isGlobalGenerating: boolean;
}

export default function IterateDialog({
  componentId,
  componentName,
  parentNodeId,
  sourceFilename,
  isGlobalGenerating,
}: IterateDialogProps) {
  const [open, setOpen] = useState(false);
  const [, setCopied] = useState(false);
  const [pendingDragGrid, setPendingDragGrid] =
    useState<PendingDragGrid | null>(null);

  const [startNumber, setStartNumber] = useState<number | null>(null);
  const [isFetchingMax, setIsFetchingMax] = useState(false);

  const isFromIteration = !!sourceFilename;
  const panelRef = useRef<HTMLDivElement>(null);

  // All form state (model, count, segments, skills, impeccable) lives in the hook
  const {
    selectedModel,
    handleModelChange,
    models,
    isLoadingModels,
    iterationCount,
    setIterationCount,
    previousIterationCountBeforeDragRef,
    segments,
    setSegments,
    isLoadingSkills,
    customInstructionsText,
    skillPrompt,
    impeccableSubMenuOpen,
    setImpeccableSubMenuOpen,
    demoteState,
    skillPickerItems,
    skillPickerFilterFn,
    handleSelectItem,
    handleImpeccableCommandCleared,
    closeDemoteMenu,
    resetImpeccablePicker,
    inlineRefHandle,
    inlineRefContainerRef,
  } = useIterateDialogState(open);

  const { getNode, setNodes, flowToScreenPosition, screenToFlowPosition } =
    useReactFlow();

  // Track the last ghost grid to avoid re-rendering when only cursor moves (drag preview)
  const lastGhostGridRef = useRef<{ rows: number; cols: number } | null>(null);

  const removeGhostNodes = useCallback(() => {
    lastGhostGridRef.current = null;
    setNodes((nds) => nds.filter((n) => !n.id.startsWith(GHOST_NODE_PREFIX)));
  }, [setNodes]);

  const getParentCellSize = useCallback(() => {
    const parentNode = getNode(parentNodeId);
    if (!parentNode) return null;
    const cellW =
      parentNode.measured?.width ??
      (parentNode.type === "component"
        ? DEFAULT_COMPONENT_NODE_WIDTH
        : DEFAULT_ITERATION_NODE_WIDTH);
    const cellH =
      parentNode.measured?.height ??
      (parentNode.type === "component"
        ? DEFAULT_COMPONENT_NODE_HEIGHT
        : DEFAULT_ITERATION_NODE_HEIGHT);
    return { cellW, cellH, parentNode };
  }, [getNode, parentNodeId]);

  const placeGhostForGrid = useCallback(
    (
      grid: Pick<DragIterateGrid, "rows" | "cols">,
      cellW: number,
      cellH: number,
    ) => {
      const info = getParentCellSize();
      if (!info) return;
      // The ghost overlay starts flush at the parent node's top-left.
      const padX = 0;
      const padY = 0;
      lastGhostGridRef.current = { rows: grid.rows, cols: grid.cols };
      const ghostNode = buildGhostBoundingNode({
        parentPosition: info.parentNode.position,
        rows: grid.rows,
        cols: grid.cols,
        cellW,
        cellH,
        padX,
        padY,
      });
      setNodes((nds) => [
        ...nds.filter((n) => !n.id.startsWith(GHOST_NODE_PREFIX)),
        ghostNode,
      ]);
    },
    [getParentCellSize, setNodes],
  );

  const closePanel = useCallback(() => {
    removeGhostNodes();
    if (pendingDragGrid) {
      setIterationCount(previousIterationCountBeforeDragRef.current);
    }
    setOpen(false);
    setPendingDragGrid(null);
    resetImpeccablePicker();
  }, [
    pendingDragGrid,
    removeGhostNodes,
    resetImpeccablePicker,
    setIterationCount,
    previousIterationCountBeforeDragRef,
  ]);

  // Fetch max iteration number when panel opens
  useEffect(() => {
    if (!open) {
      setStartNumber(null);
      return;
    }
    const fetchMaxIteration = async () => {
      setIsFetchingMax(true);
      try {
        const response = await fetch("/playground/api/iterations");
        if (!response.ok) {
          setStartNumber(1);
          return;
        }
        const { iterations } = (await response.json()) as {
          iterations: {
            filename: string;
            componentName: string;
            iterationNumber: number;
          }[];
        };
        const cleanName = componentName.replace(/\s+/g, "");
        const componentIterations = iterations.filter(
          (i) => i.componentName === cleanName,
        );
        const maxNumber = componentIterations.reduce(
          (max, i) => Math.max(max, i.iterationNumber),
          0,
        );
        setStartNumber(maxNumber + 1);
      } catch {
        setStartNumber(1);
      } finally {
        setIsFetchingMax(false);
      }
    };
    fetchMaxIteration();
  }, [open, componentName]);

  const generatedPrompt = useMemo(() => {
    if (startNumber === null) return "";
    if (isFromIteration) {
      return generateIterationFromIterationPrompt(
        componentId,
        sourceFilename!,
        iterationCount,
        startNumber,
        customInstructionsText,
        skillPrompt,
      );
    }
    return generateIterationPrompt(
      componentId,
      iterationCount,
      startNumber,
      customInstructionsText,
      skillPrompt,
    );
  }, [
    componentId,
    sourceFilename,
    iterationCount,
    startNumber,
    isFromIteration,
    customInstructionsText,
    skillPrompt,
  ]);

  const handleCopyPrompt = useCallback(async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.dispatchEvent(new CustomEvent(ITERATION_PROMPT_COPIED_EVENT));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy prompt:", err);
    }
  }, []);

  const handleDefaultCopy = useCallback(async () => {
    await handleCopyPrompt(
      generateIterationPrompt(
        componentId,
        4,
        startNumber ?? 1,
        undefined,
      ),
    );
  }, [componentId, startNumber, handleCopyPrompt]);

  const handleRunWithCursor = async () => {
    if (!parentNodeId) return;
    if (isFromIteration && startNumber === null) return;

    if (!generatedPrompt) {
      generationEvents.error.emit({
        componentId,
        parentNodeId,
        error: `Component "${componentId}" is not registered. Add it to the registry before iterating.`,
      });
      return;
    }

    const providerFields = getProviderFields();
    generationEvents.start.emit({
      componentId,
      componentName,
      parentNodeId,
      iterationCount,
      startNumber: startNumber ?? 1,
      model: selectedModel || undefined,
      provider:
        providerFields.provider as GenerationStartPayload["provider"],
      ...(pendingDragGrid
        ? {
            gridLayout: {
              rows: pendingDragGrid.rows,
              cols: pendingDragGrid.cols,
            },
          }
        : {}),
    });

    closePanel();

    try {
      const response = await fetch("/playground/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generatedPrompt,
          componentId,
          iterationCount,
          model: selectedModel || undefined,
          source: "dialog",
          ...providerFields,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const msg = `Failed to parse response: ${jsonError instanceof Error ? jsonError.message : "Unknown JSON error"}`;
        generationEvents.error.emit({
          componentId,
          parentNodeId,
          error: msg,
        });
        return;
      }

      if (!response.ok || !data.success) {
        const rawError =
          data?.error || data?.message || data || "Generation failed";
        const normalizedError =
          typeof rawError === "string"
            ? rawError.trim()
            : JSON.stringify(rawError);

        // Delegate all error handling to PlaygroundCanvas via the generation error event
        generationEvents.error.emit({
          componentId,
          parentNodeId,
          error: normalizedError,
        });
      } else {
        generationEvents.complete.emit({
          componentId,
          parentNodeId,
          output: "",
        });
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : String(error) || "Unknown error";
      generationEvents.error.emit({
        componentId,
        parentNodeId,
        error: msg,
      });
    }
  };

  const canRun =
    !isGlobalGenerating &&
    parentNodeId &&
    (!isFromIteration || (startNumber !== null && !isFetchingMax));

  // ---------------------------------------------------------------------------
  // Drag-to-iterate: ghost node management
  // ---------------------------------------------------------------------------

  const computeGridFromScreenDelta = useCallback(
    (delta: DragDelta, dragStart: { x: number; y: number } | null) => {
      const info = getParentCellSize();
      if (!info || !dragStart) return null;
      const { cellW, cellH, parentNode } = info;

      const { rawCols, rawRows } = computeDragGridRaw(
        { screenToFlowPosition, flowToScreenPosition },
        {
          delta,
          dragStart,
          parentPosition: parentNode.position,
          cellW,
          cellH,
          gapPx: DRAG_GHOST_GAP,
        },
      );

      return { grid: clampGrid(rawCols, rawRows), cellW, cellH };
    },
    [getParentCellSize, screenToFlowPosition, flowToScreenPosition],
  );

  const handleDragUpdate = useCallback(
    (delta: DragDelta | null, dragStart: CursorScreenPos | null) => {
      if (!delta || !dragStart) {
        removeGhostNodes();
        return;
      }

      const result = computeGridFromScreenDelta(delta, dragStart);
      if (!result || result.grid.count === 0) {
        // Grid went to zero — remove ghosts only if they were showing
        if (lastGhostGridRef.current) {
          removeGhostNodes();
        }
        return;
      }

      const { grid, cellW, cellH } = result;

      // Skip setNodes if the grid dimensions haven't changed
      const prev = lastGhostGridRef.current;
      if (prev && prev.rows === grid.rows && prev.cols === grid.cols) {
        return;
      }

      placeGhostForGrid(grid, cellW, cellH);
    },
    [computeGridFromScreenDelta, placeGhostForGrid, removeGhostNodes],
  );

  const handleDragEnd = useCallback(
    (delta: DragDelta, dragStart: CursorScreenPos) => {
      const result = computeGridFromScreenDelta(delta, dragStart);
      if (!result || result.grid.count === 0) return;

      const { grid, cellW, cellH } = result;
      previousIterationCountBeforeDragRef.current = iterationCount;
      setIterationCount(grid.count);
      setPendingDragGrid({
        count: grid.count,
        rows: grid.rows,
        cols: grid.cols,
      });
      placeGhostForGrid(grid, cellW, cellH);
      setOpen(true);
    },
    [
      computeGridFromScreenDelta,
      placeGhostForGrid,
      iterationCount,
      previousIterationCountBeforeDragRef,
      setIterationCount,
    ],
  );

  const handleZapClick = useCallback(
    (shiftKey: boolean) => {
      if (isGlobalGenerating) return;
      if (!isFromIteration && shiftKey) {
        handleDefaultCopy();
      } else if (open) {
        closePanel();
      } else {
        removeGhostNodes();
        setPendingDragGrid(null);
        setOpen(true);
      }
    },
    [
      isGlobalGenerating,
      isFromIteration,
      handleDefaultCopy,
      open,
      closePanel,
      removeGhostNodes,
    ],
  );

  const { isDragging, cursorScreen, dragStartScreen, handlers } =
    useDragToIterate({
      onDragEnd: handleDragEnd,
      onClick: handleZapClick,
      disabled: isGlobalGenerating,
      onDragUpdate: handleDragUpdate,
    });

  // Compute parent node's screen-space top-left for the selection overlay origin.
  const overlayOrigin = useMemo(() => {
    if (!isDragging || !dragStartScreen) return null;
    const parentNode = getNode(parentNodeId);
    if (!parentNode) return dragStartScreen;
    const screenPos = flowToScreenPosition({
      x: parentNode.position.x,
      y: parentNode.position.y,
    });
    return {
      x: screenPos.x,
      y: screenPos.y,
    };
  }, [
    isDragging,
    dragStartScreen,
    getNode,
    parentNodeId,
    flowToScreenPosition,
  ]);

  // Clean up ghost nodes if component unmounts during drag
  useEffect(() => {
    return () => {
      removeGhostNodes();
    };
  }, [removeGhostNodes]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canRun) {
        e.preventDefault();
        handleRunWithCursor();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, generatedPrompt, canRun, closePanel]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;

      // Keep dialog open when interacting with inline reference dropdown or demote menu
      if (
        target?.closest('[data-slot="inline-reference-content"]') ||
        target?.closest('[data-slot="impeccable-demote-menu"]')
      ) {
        return;
      }

      if (panelRef.current && !panelRef.current.contains(target as Node)) {
        closePanel();
      }
    };
    // Small delay so the trigger click doesn't immediately close it
    const t = setTimeout(
      () => document.addEventListener("mousedown", handleClickOutside),
      0,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, closePanel]);

  // ── Trigger button ──
  const triggerButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onPointerDown={handlers.onPointerDown}
          disabled={isGlobalGenerating}
          className={`w-8 h-8 flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isDragging ? "opacity-0" : ""} ${open ? "rounded-l-full rounded-r-[8px]" : "rounded-full"}`}
          style={{ background: "#0B99FF", touchAction: "none" }}
          aria-label="Iterate"
        >
          <Zap className="w-4 h-4 fill-white" strokeWidth={0} />
        </button>
      </TooltipTrigger>
      {!isDragging && (
        <TooltipContent side="right">
          <p>
            {isGlobalGenerating
              ? "Another generation is in progress"
              : "Click to configure, drag to iterate"}
          </p>
        </TooltipContent>
      )}
    </Tooltip>
  );

  return (
    <>
      {/* Free-flowing selection rectangle during drag */}
      <DragSelectionOverlay
        visible={isDragging && !!cursorScreen}
        originX={overlayOrigin?.x ?? dragStartScreen?.x ?? 0}
        originY={overlayOrigin?.y ?? dragStartScreen?.y ?? 0}
        cursorX={cursorScreen?.x ?? 0}
        cursorY={cursorScreen?.y ?? 0}
      />

      {/* Wrapper keeps trigger + panel in the same stacking context */}
      <div className="relative" ref={panelRef}>
        {triggerButton}

        {/* ── Inline popover panel ── */}
        {open && (
          <div
            className="absolute left-full top-0 ml-2 z-50 nodrag nowheel nopan"
            style={{ fontFamily: "var(--pg-font-sans)" }}
          >
            <div className="w-[410px] rounded-[30px] border border-stone-200/80 bg-[#fbfbfb] p-5 shadow-[0_24px_70px_-35px_rgba(0,0,0,0.4)]">
              {/* Source info — iteration-from-iteration */}
              {isFromIteration && isFetchingMax && (
                <div className="mb-3 flex items-center gap-1 text-[11px] font-medium text-stone-400">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Finding next variation number...</span>
                </div>
              )}

              {/* Inline reference input for instructions + skills */}
              <div ref={inlineRefContainerRef}>
                <InlineReference
                  ref={inlineRefHandle}
                  value={segments}
                  onValueChange={setSegments}
                  onSelectItem={handleSelectItem}
                  onImpeccableCommandCleared={(pillEl) => {
                    handleImpeccableCommandCleared(
                      pillEl,
                      inlineRefContainerRef.current,
                    );
                  }}
                  onSkillPillPendingDelete={() => closeDemoteMenu()}
                  className="w-full cursor-chat-inline-input"
                >
                  <InlineReferenceInput
                    autoFocus
                    placeholder={
                      pendingDragGrid
                        ? "Add context for these variations"
                        : "Explore variations"
                    }
                    className="min-h-[54px] rounded-none border-none bg-transparent px-2 py-2 text-[16px] font-normal leading-[1.18] text-stone-800 shadow-none outline-none ring-0 focus-visible:border-none focus-visible:ring-0"
                    style={{
                      caretColor: "rgb(87, 83, 78)",
                    }}
                  />

                  <InlineReferenceContent
                    trigger="/"
                    items={skillPickerItems}
                    filterFn={skillPickerFilterFn}
                    className="rounded-xl border border-stone-200 shadow-lg"
                  >
                    <ImpeccableSkillPicker
                      impeccableSubMenuOpen={impeccableSubMenuOpen}
                      onBackFromSubMenu={() => setImpeccableSubMenuOpen(false)}
                      isLoadingSkills={isLoadingSkills}
                    />
                  </InlineReferenceContent>

                  {demoteState && (
                    <ImpeccableDemoteMenu
                      demoteState={demoteState}
                      onSelect={(command) => {
                        inlineRefHandle.current?.updateImpeccablePill(
                          demoteState.pillEl,
                          command,
                        );
                        closeDemoteMenu();
                      }}
                      onClose={closeDemoteMenu}
                    />
                  )}
                </InlineReference>
              </div>

              {/* Controls + circular CTA */}
              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <ModelPillDropdown
                    model={selectedModel}
                    onChange={handleModelChange}
                    models={models}
                    isLoading={isLoadingModels}
                  />
                  {!pendingDragGrid && (
                    <VariationCountDropdown
                      count={iterationCount}
                      onChange={(count) => {
                        previousIterationCountBeforeDragRef.current = count;
                        setIterationCount(count);
                      }}
                    />
                  )}
                </div>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleRunWithCursor}
                  disabled={!canRun}
                  className={`flex size-14 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${
                    canRun
                      ? "bg-stone-800 text-white hover:bg-stone-700"
                      : "bg-stone-200 text-stone-400"
                  }`}
                  aria-label="Create variations"
                >
                  {isGlobalGenerating ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <ArrowUp size={18} strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
