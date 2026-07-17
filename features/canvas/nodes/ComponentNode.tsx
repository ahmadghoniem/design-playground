import {
  memo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useNodeId, useReactFlow, NodeResizeControl } from "@xyflow/react";
import { EdgeAnchorHandles } from "@pg/features/canvas/canvas-edge-handles";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pg/shared/ui/tooltip";
import { resolveRegistryItem } from "@pg/registry";
import {
  ResizeGripIcon,
  PlayButtonIcon,
} from "@pg/shared/ui/playground-nav-icons";
import { SizeButtons } from "@pg/shared/ui/SizeButtons";
import { NodeLabel, useInverseZoom } from "@pg/shared/ui/NodeLabel";

import {
  useAsyncProps,
  useScrollCapture,
} from "@pg/shared/lib/useNodeShared";
import ComponentErrorBoundary from "@pg/shared/ui/ComponentErrorBoundary";
import {
  useInteractiveNodeStore,
  useIsInteractiveNode,
} from "@pg/shared/stores/interactive-node-store";
import { useFrameHoverHint } from "@pg/shared/ui/FrameHoverHint";
import {
  COMPONENT_SIZE_CHANGE_EVENT,
  SIZE_CONFIG,
  getDisplayDimensions,
  RESIZE_MIN_WIDTH,
  RESIZE_MIN_HEIGHT,
  type ComponentSize,
} from "@pg/shared/lib/constants";

interface ComponentNodeProps {
  data: {
    componentId: string;
    /** Persisted across reloads — reflects the last user-chosen size */
    size?: ComponentSize;
    /** Whether this node has been freeform-resized */
    customResized?: boolean;
  };
  selected?: boolean;
}

function ComponentNode({ data, selected = false }: ComponentNodeProps) {
  const labelInvScale = useInverseZoom();
  // Hide the play button once its visual width (14px × inv) overruns its
  // layout slot (14 + 6 gap) so it doesn't visually overlap the label.
  const hidePlayButton = labelInvScale * 14 > 14 + 6;
  const componentId = data.componentId;
  const registryItem = resolveRegistryItem(componentId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { resolvedProps, isLoadingProps, propsError } =
    useAsyncProps(componentId);
  const handleWheel = useScrollCapture(scrollContainerRef);

  const nodeId = useNodeId();
  const { updateNodeData, setNodes } = useReactFlow();
  const isInteractive = useIsInteractiveNode(nodeId);
  const setInteractiveNodeId = useInteractiveNodeStore(
    (s) => s.setInteractiveNodeId,
  );

  const handleFrameDoubleClick = useCallback(() => {
    if (nodeId) setInteractiveNodeId(nodeId);
  }, [nodeId, setInteractiveNodeId]);

  const hoverHint = useFrameHoverHint(!isInteractive);

  // Clear interactive mode if this node becomes deselected
  useEffect(() => {
    if (!selected && isInteractive) setInteractiveNodeId(null);
  }, [selected, isInteractive, setInteractiveNodeId]);

  // Listen for Escape to exit interactive mode
  useEffect(() => {
    if (!isInteractive) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInteractiveNodeId(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isInteractive, setInteractiveNodeId]);

  // Prefer the persisted size from node data (survives reload), then registry default
  const [size, setSize] = useState<ComponentSize>(
    data.size || registryItem?.size || "default",
  );
  const [isResizing, setIsResizing] = useState(false);
  const [isCustomResized, setIsCustomResized] = useState(!!data.customResized);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    setSize("default");
  }, []);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setIsCustomResized(true);
    if (nodeId) {
      updateNodeData(nodeId, { customResized: true, size: "default" });
      // Width-only for React components: drop the height the resize control
      // set so the frame hugs its content vertically (no trapped vertical gap).
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                height: undefined,
                style: { ...n.style, height: undefined },
              }
            : n,
        ),
      );
    }
  }, [nodeId, updateNodeData, setNodes]);

  const handleSizeChange = (newSize: ComponentSize) => {
    setSize(newSize);
    setIsCustomResized(false);
    if (nodeId) {
      updateNodeData(nodeId, { size: newSize, customResized: false });
      // Clear any width/height that NodeResizeControl may have set on the node
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                width: undefined,
                height: undefined,
                style: { ...n.style, width: undefined, height: undefined },
              }
            : n,
        ),
      );
    }
    window.dispatchEvent(
      new CustomEvent(COMPONENT_SIZE_CHANGE_EVENT, {
        detail: { nodeId, size: newSize },
      }),
    );
  };

  const Component = registryItem?.Component;
  const props = registryItem?.props;
  const label = registryItem?.label || componentId;
  const effectiveProps = (resolvedProps ?? props ?? {}) as Record<
    string,
    unknown
  >;
  const config = SIZE_CONFIG[size];
  const isPreset = size !== "default";
  const isFillMode = isResizing || isCustomResized;
  const isLargeComponent = isPreset || isFillMode;
  // React components resize width-only and hug their content height (no
  // vertical padding).
  const isAutoHeightFill = isFillMode;
  const displayDims = getDisplayDimensions(size);

  if (!registryItem) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 min-w-[200px]">
        <p className="text-red-600 text-sm">Unknown component: {componentId}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${isLargeComponent ? "" : "min-w-[200px]"}`}
      style={{
        ...(isPreset ? { width: displayDims.width } : {}),
        ...(isFillMode
          ? isAutoHeightFill
            ? { width: "100%" }
            : { width: "100%", height: "100%" }
          : {}),
        fontFamily: "var(--pg-font-sans)",
      }}
    >
      <EdgeAnchorHandles />
      {/* Resize handle — bottom-right corner, only when selected */}
      <NodeResizeControl
        position="bottom-right"
        minWidth={RESIZE_MIN_WIDTH}
        minHeight={RESIZE_MIN_HEIGHT}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
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

      {/* ── Top bar — always visible label, controls only when selected ── */}
      <div className="flex items-center justify-between px-0.5 pb-1.5 cursor-grab">
        {/* Left: open-in-new-tab + label (always visible) */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  const url = `/playground/iterations/${componentId}`;
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
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
          <NodeLabel color="#0B99FF">{label}</NodeLabel>
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
        className={`relative flex items-start ${isFillMode && !isAutoHeightFill ? "flex-1 min-h-0" : ""}`}
      >
        {/* Component frame */}
        <div
          data-screenshot-target
          data-interactive={isInteractive ? "true" : undefined}
          onDoubleClick={handleFrameDoubleClick}
          onMouseMove={hoverHint.onMouseMove}
          onMouseLeave={hoverHint.onMouseLeave}
          className={`relative app-theme bg-background overflow-hidden rounded-xl ${isResizing ? "" : "transition-all"} ${
            selected ? "ring-2 ring-[#0B99FF]" : ""
          } ${isInteractive ? "ring-offset-2" : ""} ${isFillMode ? (isAutoHeightFill ? "w-full" : "w-full h-full") : ""}`}
        >
          {isFillMode ? (
            /* Freeform / active resize: fill the node width; height hugs content
               (width-only resize) so the frame never traps vertical padding. */
            <div
              ref={scrollContainerRef}
              className={`grid place-items-center overflow-auto w-full ${isInteractive ? "nodrag nowheel nopan" : ""}`}
              onWheel={isInteractive ? handleWheel : undefined}
            >
              {isLoadingProps && !Object.keys(effectiveProps).length ? (
                <div className="text-xs text-gray-500">Loading live data…</div>
              ) : propsError && !Object.keys(effectiveProps).length ? (
                <div className="text-xs text-red-600">
                  Failed to load data: {propsError}
                </div>
              ) : Component ? (
                <ComponentErrorBoundary componentName={label}>
                  <Component {...effectiveProps} />
                </ComponentErrorBoundary>
              ) : null}
            </div>
          ) : isPreset ? (
            /* Preset mode (Desktop/Mobile): fixed viewport with zoom scaling */
            <div
              ref={scrollContainerRef}
              className={`bg-gray-100 overflow-x-hidden overflow-y-auto ${isInteractive ? "nodrag nowheel nopan" : ""}`}
              style={{ width: displayDims.width, height: displayDims.height }}
              onWheel={isInteractive ? handleWheel : undefined}
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
                ) : Component ? (
                  <ComponentErrorBoundary componentName={label}>
                    <Component {...effectiveProps} />
                  </ComponentErrorBoundary>
                ) : null}
              </div>
            </div>
          ) : (
            /* Auto mode: intrinsic sizing — render flush at the component's
               natural size. No centering wrapper or min-size box, so small
               components (e.g. a badge) don't float in a large padded area.
               The bare div only carries the interaction classes so canvas
               pan/scroll gestures over an interactive component are gated. */
            <div className={isInteractive ? "nodrag nowheel nopan" : undefined}>
              {isLoadingProps && !Object.keys(effectiveProps).length ? (
                <div className="text-xs text-gray-500">Loading live data…</div>
              ) : propsError && !Object.keys(effectiveProps).length ? (
                <div className="text-xs text-red-600">
                  Failed to load data: {propsError}
                </div>
              ) : Component ? (
                <ComponentErrorBoundary componentName={label}>
                  <Component {...effectiveProps} />
                </ComponentErrorBoundary>
              ) : null}
            </div>
          )}
          {/* Click-blocker for React render mode — gates link/button activity
              on a double-click. Element-select mode disables this via
              `[data-iframe-overlay] { pointer-events: none !important }` in
              playground-global.css. */}
          {!isInteractive && (
            <div className="absolute inset-0" data-iframe-overlay />
          )}
        </div>

        {hoverHint.tooltip}
      </div>
    </div>
  );
}

export default memo(ComponentNode);
