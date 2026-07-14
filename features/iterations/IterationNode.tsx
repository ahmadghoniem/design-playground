import {
  memo,
  useState,
  useCallback,
  Suspense,
  useMemo,
  useRef,
  useEffect,
  type ComponentType,
} from "react";
import { useReactFlow, NodeResizeControl } from "@xyflow/react";
import { GitMerge, Trash2, Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pg/shared/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@pg/shared/ui/alert-dialog";
import { resolveRegistryItem } from "@pg/registry";
import {
  ResizeGripIcon,
  PlayButtonIcon,
} from "@pg/shared/ui/playground-nav-icons";
import { loadIterationComponentModule } from "@pg/shared/lib/iteration-loader";
import { SizeButtons } from "@pg/shared/ui/SizeButtons";
import { NodeLabel, useInverseZoom } from "@pg/shared/ui/NodeLabel";
import {
  generationEvents,
} from "@pg/shared/lib/generation-events";
import {
  COMPONENT_SIZE_CHANGE_EVENT,
  EDIT_COMPLETE_EVENT,
  ITERATION_COLLAPSE_TOGGLE_EVENT,
  SIZE_CONFIG,
  getDisplayDimensions,
  RESIZE_MIN_WIDTH,
  RESIZE_MIN_HEIGHT,
  type ComponentSize,
} from "@pg/shared/lib/constants";
import {
  useAsyncProps,
  useScrollCapture,
} from "@pg/shared/lib/useNodeShared";
import ComponentErrorBoundary from "@pg/shared/ui/ComponentErrorBoundary";
import IterateDialog from "@pg/shared/ui/IterateDialog";
import {
  useInteractiveNodeStore,
  useIsInteractiveNode,
} from "@pg/shared/stores/interactive-node-store";
import { useFrameHoverHint } from "@pg/shared/ui/FrameHoverHint";
import { useIterationAdoption } from "@pg/features/iterations/useIterationAdoption";
import {
  componentNameToRegistryId,
  iterationPageName as deriveIterationPageName,
} from "@pg/features/iterations/iteration-filename";

const EMPTY_ERRORS: string[] = [];

interface IterationNodeProps {
  id: string;
  data: {
    componentName: string;
    iterationNumber: number;
    filename: string;
    description: string;
    parentNodeId: string;
    /** Registry ID inherited from the parent node at creation time */
    registryId?: string;
    /** Size of the parent ComponentNode at the time this iteration was created */
    parentSize?: ComponentSize;
    /** Whether this node has been freeform-resized */
    customResized?: boolean;
    hasChildren?: boolean;
    isCollapsed?: boolean;
    /** Whether this iteration has been adopted into the original component */
    adopted?: boolean;
    onDelete?: (filename: string) => void;
    onAdopt?: (filename: string, componentName: string) => void;
  };
  selected?: boolean;
}

function IterationNode({ id, data, selected = false }: IterationNodeProps) {
  const labelInvScale = useInverseZoom();
  const hidePlayButton = labelInvScale * 14 > 14 + 6;
  const { deleteElements, setNodes, updateNodeData } = useReactFlow();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isGlobalGenerating, setIsGlobalGenerating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [iframeKey, setIframeKey] = useState(() => Date.now());

  const isInteractive = useIsInteractiveNode(id);
  const setInteractiveNodeId = useInteractiveNodeStore(
    (s) => s.setInteractiveNodeId,
  );

  const handleFrameDoubleClick = useCallback(() => {
    setInteractiveNodeId(id);
  }, [id, setInteractiveNodeId]);

  const hoverHint = useFrameHoverHint(!isInteractive);

  useEffect(() => {
    if (!selected && isInteractive) setInteractiveNodeId(null);
  }, [selected, isInteractive, setInteractiveNodeId]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!isInteractive) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInteractiveNodeId(null);
    };
    window.addEventListener("keydown", handleEsc);
    const iframe = iframeRef.current;
    let innerDoc: Document | null = null;
    try {
      innerDoc = iframe?.contentDocument ?? null;
      innerDoc?.addEventListener("keydown", handleEsc);
    } catch {
      // cross-origin iframe — skip
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      try {
        innerDoc?.removeEventListener("keydown", handleEsc);
      } catch {
        /* noop */
      }
    };
  }, [isInteractive, setInteractiveNodeId]);

  // React iteration — loaded dynamically (not a static import) so a freshly
  // regenerated iterations/index.ts is always picked up, even if this node
  // mounted before the file was rewritten. Retries with backoff in case the
  // node was created just before the server finished regenerating the index.
  const [IterationComponent, setIterationComponent] =
    useState<ComponentType<any> | null>(null);
  // Bumped when an in-place edit targeting this node completes, so the
  // dynamically-loaded component is re-imported and the fresh version shown
  // (the file keeps the same name on an edit, so data.filename alone can't
  // detect it — see EDIT_COMPLETE_EVENT listener below).
  const [reloadAttempt, setReloadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // On an edit-triggered reload the component already exists (with stale
    // output), so accepting the first truthy result would keep showing the old
    // version. Re-import a few times to give Vite HMR time to swap the module.
    const isReload = reloadAttempt > 0;
    const attempt = (delay: number, tries: number) => {
      loadIterationComponentModule()
        .then((mod) => {
          if (cancelled) return;
          const comp = mod.getIterationComponent(data.filename);
          if (comp) {
            setIterationComponent(() => comp);
            if (!isReload) return;
            // Keep re-importing briefly after an edit to catch the HMR update.
            if (tries < 4) {
              timer = setTimeout(() => attempt(400, tries + 1), 400);
            }
            return;
          }
          if (delay <= 8000) {
            timer = setTimeout(
              () => attempt(Math.min(delay * 1.5, 2000), tries + 1),
              delay,
            );
          }
        })
        .catch(() => {});
    };
    attempt(isReload ? 300 : 300, 0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [data.filename, reloadAttempt]);

  // An in-place edit keeps the same filename, so nothing above re-runs. Listen
  // for EDIT_COMPLETE_EVENT targeting this node and bump the reload counter so
  // the freshly-written component is re-imported and rendered.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nodeId === id) setReloadAttempt((n) => n + 1);
    };
    window.addEventListener(EDIT_COMPLETE_EVENT, handler);
    return () => window.removeEventListener(EDIT_COMPLETE_EVENT, handler);
  }, [id]);

  const registryId = useMemo(
    () => data.registryId ?? componentNameToRegistryId(data.componentName),
    [data.registryId, data.componentName],
  );

  const { resolvedProps, isLoadingProps, propsError } = useAsyncProps(registryId);
  const registryItem = useMemo(
    () => resolveRegistryItem(registryId),
    [registryId],
  );
  const staticProps = useMemo(() => registryItem?.props || {}, [registryItem]);
  const effectiveProps = (resolvedProps ?? staticProps) as Record<
    string,
    unknown
  >;

  // Independent size — persisted in node data, initially from parent at creation time
  const [size, setSize] = useState<ComponentSize>(
    () =>
      data.parentSize ||
      resolveRegistryItem(registryId)?.size ||
      "default",
  );
  const [isResizing, setIsResizing] = useState(false);
  const [isCustomResized, setIsCustomResized] = useState(!!data.customResized);

  // Listen for parent size changes — only apply if not custom-resized
  useEffect(() => {
    const handleParentSizeChange = (
      e: CustomEvent<{ nodeId: string; size: ComponentSize }>,
    ) => {
      if (e.detail.nodeId === data.parentNodeId && !isCustomResized) {
        setSize(e.detail.size);
      }
    };
    window.addEventListener(
      COMPONENT_SIZE_CHANGE_EVENT,
      handleParentSizeChange as EventListener,
    );
    return () =>
      window.removeEventListener(
        COMPONENT_SIZE_CHANGE_EVENT,
        handleParentSizeChange as EventListener,
      );
  }, [data.parentNodeId, isCustomResized]);

  useEffect(() => {
    const on = () => setIsGlobalGenerating(true);
    const off = () => setIsGlobalGenerating(false);
    const offStart = generationEvents.start.on(on);
    const offComplete = generationEvents.complete.on(off);
    const offError = generationEvents.error.on(off);
    return () => {
      offStart();
      offComplete();
      offError();
    };
  }, []);


  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    setSize("default");
  }, []);

  const handleSizeChange = (newSize: ComponentSize) => {
    setSize(newSize);
    setIsCustomResized(false);
    updateNodeData(id, { size: newSize, customResized: false });
    // Clear any width/height that NodeResizeControl may have set on the node
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              width: undefined,
              height: undefined,
              style: { ...n.style, width: undefined, height: undefined },
            }
          : n,
      ),
    );
  };

  const handleResizeEndFull = useCallback(() => {
    setIsResizing(false);
    setIsCustomResized(true);
    updateNodeData(id, { customResized: true });
  }, [id, updateNodeData]);

  // ---------------------------------------------------------------------------
  // Adoption hook
  // ---------------------------------------------------------------------------
  const adoption = useIterationAdoption({
    id,
    registryId,
    isGlobalGenerating,
    data,
  });

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/playground/api/iterations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: data.filename }),
      });
      if (response.ok) {
        deleteElements({ nodes: [{ id }] });
        data.onDelete?.(data.filename);
      } else {
        setIsDeleting(false);
      }
    } catch {
      setIsDeleting(false);
    }
  };

  const pageName = useMemo(
    () =>
      deriveIterationPageName({
        componentName: data.componentName,
      }),
    [data.componentName],
  );
  const iterationLabel = `${pageName} #${data.iterationNumber}`;

  const config = SIZE_CONFIG[size];
  const isPreset = size !== "default";
  const isFillMode = isResizing || isCustomResized;
  const isLargeComponent = isPreset || isFillMode;
  const displayDims = getDisplayDimensions(size);
  const handleWheel = useScrollCapture(scrollContainerRef);

  // Resolved renderable component (from iterations registry)
  const RenderComponent = IterationComponent;

  return (
    <div
      className={`flex flex-col ${isLargeComponent ? "" : "min-w-[280px]"}`}
      style={{
        ...(isPreset ? { width: displayDims.width } : {}),
        ...(isFillMode ? { width: "100%", height: "100%" } : {}),
        fontFamily: "var(--pg-font-sans)",
      }}
    >
      {/* Resize handle — bottom-right corner, only when selected */}
      <NodeResizeControl
        position="bottom-right"
        minWidth={RESIZE_MIN_WIDTH}
        minHeight={RESIZE_MIN_HEIGHT}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEndFull}
        style={{
          background: "transparent",
          border: "none",
          width: 10,
          height: 10,
          bottom: 2,
          right: 2,
          opacity: selected ? 1 : 0,
          pointerEvents: selected ? "auto" : "none",
          cursor: "nwse-resize",
        }}
      >
        <ResizeGripIcon className="text-stone-300 hover:text-stone-500 transition-colors" />
      </NodeResizeControl>

      {/* ── Top bar — label always, controls only when selected ── */}
      <div className="flex items-center justify-between px-0.5 pb-1.5 cursor-grab">
        {/* Left: open-in-new-tab + collapse toggle + label */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  const url = `/playground/iterations/${data.filename.replace(/\.tsx$/, "")}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="nodrag shrink-0 p-0 leading-none rounded-[5px] transition-colors"
                style={{
                  color: selected ? "#0B99FF" : "#A8A29E",
                  display: "inline-block",
                  transform: `scale(${labelInvScale})`,
                  transformOrigin: "left bottom",
                  willChange: "transform",
                  visibility: hidePlayButton ? "hidden" : "visible",
                  pointerEvents: hidePlayButton ? "none" : undefined,
                }}
                aria-label="Open in new tab"
              >
                <PlayButtonIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open in new tab</p>
            </TooltipContent>
          </Tooltip>
          {data.hasChildren && (
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent(ITERATION_COLLAPSE_TOGGLE_EVENT, {
                    detail: { nodeId: id },
                  }),
                )
              }
              className="p-0.5 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors shrink-0"
              aria-label={
                data.isCollapsed ? "Expand children" : "Collapse children"
              }
            >
              <ChevronRight
                className={`w-3 h-3 transition-transform ${data.isCollapsed ? "" : "rotate-90"}`}
              />
            </button>
          )}
          <NodeLabel className="text-stone-500 shrink-0">
            <span className={selected ? "text-[#0B99FF]" : "text-stone-400"}>
              {pageName}
            </span>
            <span className="mx-1 text-stone-300">|</span>
            <span className="text-stone-500">#{data.iterationNumber}</span>
          </NodeLabel>
          {adoption.adoptionStatus === "adopted" && (
            <span className="text-[9px] font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 leading-none select-none shrink-0">
              Adopted
            </span>
          )}
          {adoption.adoptionStatus === "adopting" && (
            <span className="flex items-center gap-1 text-[9px] text-stone-400 select-none shrink-0">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              adopting
            </span>
          )}
        </div>

        {/* Right: size controls — invisible when not selected */}
        <div
          className={`flex items-center gap-1.5 transition-opacity nodrag ${selected ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <SizeButtons currentSize={size} onSizeChange={handleSizeChange} />
        </div>
      </div>

      {/* ── Frame + right-side vertical toolbar ── */}
      <div
        className={`relative flex items-start ${isFillMode ? "flex-1 min-h-0" : ""}`}
      >
        {/* Component frame */}
        <div
          data-screenshot-target
          data-interactive={isInteractive ? "true" : undefined}
          onDoubleClick={handleFrameDoubleClick}
          onMouseMove={hoverHint.onMouseMove}
          onMouseLeave={hoverHint.onMouseLeave}
          className={`relative app-theme bg-background overflow-hidden rounded-xl ${isResizing ? "" : "transition-all"} ${
            adoption.adoptionStatus === "adopted"
              ? "ring-2 ring-green-400"
              : selected
                ? "ring-2 ring-[#0B99FF]"
                : ""
          } ${isInteractive ? "ring-offset-2" : ""} ${isFillMode ? "w-full h-full" : ""}`}
        >
          {isFillMode ? (
            /* Freeform / active resize: fill the node with centered content */
            <div
              ref={scrollContainerRef}
              className={`grid place-items-center overflow-auto w-full h-full ${isInteractive ? "nodrag nowheel nopan" : ""}`}
              onWheel={isInteractive ? handleWheel : undefined}
            >
              {RenderComponent ? (
                <Suspense
                  fallback={
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  }
                >
                  <div className="w-full">
                    {isLoadingProps && !Object.keys(effectiveProps).length ? (
                      <div className="text-xs text-gray-500">
                        Loading live data…
                      </div>
                    ) : propsError && !Object.keys(effectiveProps).length ? (
                      <div className="text-xs text-red-600">
                        Failed to load data: {propsError}
                      </div>
                    ) : (
                      <ComponentErrorBoundary
                        componentName={`${data.componentName} #${data.iterationNumber}`}
                      >
                        <RenderComponent {...effectiveProps} />
                      </ComponentErrorBoundary>
                    )}
                  </div>
                </Suspense>
              ) : (
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">{data.filename}</p>
                  <p className="text-[9px] text-amber-500 mt-1">
                    Waiting for registration — try refreshing
                  </p>
                </div>
              )}
            </div>
          ) : isPreset ? (
            /* Preset mode (Desktop/Mobile): fixed viewport with zoom scaling */
            <div
              ref={scrollContainerRef}
              className={`bg-gray-100 overflow-x-hidden overflow-y-auto ${isInteractive ? "nodrag nowheel nopan" : ""}`}
              style={{ width: displayDims.width, height: displayDims.height }}
              onWheel={isInteractive ? handleWheel : undefined}
            >
              {RenderComponent ? (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  }
                >
                  <div
                    className="bg-background"
                    style={{
                      width: config.width,
                      minHeight: config.height,
                      zoom: config.scale,
                    }}
                  >
                    {isLoadingProps && !Object.keys(effectiveProps).length ? (
                      <div className="p-6 text-xs text-gray-500">
                        Loading live data…
                      </div>
                    ) : propsError && !Object.keys(effectiveProps).length ? (
                      <div className="p-6 text-xs text-red-600">
                        Failed to load data: {propsError}
                      </div>
                    ) : (
                      <ComponentErrorBoundary
                        componentName={`${data.componentName} #${data.iterationNumber}`}
                      >
                        <RenderComponent {...effectiveProps} />
                      </ComponentErrorBoundary>
                    )}
                  </div>
                </Suspense>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p className="text-[10px] text-gray-400">{data.filename}</p>
                    <p className="text-[9px] text-amber-500 mt-1">
                      Waiting for registration — try refreshing
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Auto mode: intrinsic sizing */
            <div
              className={`grid place-items-center min-h-[100px] ${isInteractive ? "nodrag nowheel nopan" : ""}`}
            >
              {RenderComponent ? (
                <Suspense
                  fallback={
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  }
                >
                  <div className="w-full">
                    {isLoadingProps && !Object.keys(effectiveProps).length ? (
                      <div className="text-xs text-gray-500">
                        Loading live data…
                      </div>
                    ) : propsError && !Object.keys(effectiveProps).length ? (
                      <div className="text-xs text-red-600">
                        Failed to load data: {propsError}
                      </div>
                    ) : (
                      <ComponentErrorBoundary
                        componentName={`${data.componentName} #${data.iterationNumber}`}
                      >
                        <RenderComponent {...effectiveProps} />
                      </ComponentErrorBoundary>
                    )}
                  </div>
                </Suspense>
              ) : (
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">{data.filename}</p>
                  <p className="text-[9px] text-amber-500 mt-1">
                    Waiting for registration — try refreshing
                  </p>
                </div>
              )}
            </div>
          )}
          {/* Click-blocker for React render mode */}
          {!isInteractive && (
            <div className="absolute inset-0" data-iframe-overlay />
          )}
        </div>

        {hoverHint.tooltip}

        {/* Right-side vertical action toolbar — always in DOM, invisible when not selected */}
        <div
          className={`absolute top-0 left-full pl-2 flex flex-col items-center gap-2 nodrag transition-opacity ${selected ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {/* Iterate */}
          <IterateDialog
            componentId={registryId}
            componentName={data.componentName}
            parentNodeId={id}
            sourceFilename={data.filename}
            isGlobalGenerating={isGlobalGenerating}
          />

          {/* Use this (adopt) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={adoption.openAdoptConfirm}
                disabled={
                  adoption.adoptionStatus === "adopting" || isGlobalGenerating
                }
                className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
                  adoption.adoptionStatus === "adopted"
                    ? "bg-green-50 border-green-300 text-green-600"
                    : adoption.adoptionStatus === "error"
                      ? "bg-red-50 border-red-300 text-red-500"
                      : "bg-white border-stone-200 text-stone-400 hover:text-green-600 hover:border-green-300"
                }`}
                aria-label={
                  adoption.adoptionStatus === "adopting"
                    ? "Adopting..."
                    : adoption.adoptionStatus === "adopted"
                      ? "Adopted"
                      : "Adopt this variation"
                }
              >
                {adoption.adoptionStatus === "adopting" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GitMerge className="w-3.5 h-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>
                {adoption.adoptionStatus === "adopting"
                  ? "Adopting variation..."
                  : adoption.adoptionStatus === "adopted"
                    ? "Adopted"
                    : isGlobalGenerating
                      ? "Cannot adopt during generation"
                      : "Adopt this variation"}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Adopt confirmation dialog */}
          <AlertDialog
            open={adoption.showAdoptConfirm}
            onOpenChange={adoption.setShowAdoptConfirm}
          >
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Adopt this variation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace the original component's UI with this variation's layout and styling. Props, hooks, and logic will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <p className="text-xs text-stone-500 text-center">
                {iterationLabel}
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={adoption.handleAdoptConfirm}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Adopt
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-50"
                aria-label="Delete variation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Delete variation</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export default memo(IterationNode);
