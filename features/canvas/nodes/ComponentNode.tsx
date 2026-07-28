import {
  memo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useNodeId, useReactFlow } from "@xyflow/react";
import { resolveRegistryItem } from "@pg/registry";
import { ViewportButtons } from "@pg/shared/ui/ViewportButtons";
import { NodeLabel } from "@pg/shared/ui/NodeLabel";

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
  SIZE_CONFIG,
  getDisplayDimensions,
  type ComponentSize,
} from "@pg/shared/lib/constants";

interface ComponentNodeProps {
  data: {
    componentId: string;
    /** Persisted across reloads — reflects the last user-chosen size */
    size?: ComponentSize;
  };
  selected?: boolean;
}

function ComponentNode({ data, selected = false }: ComponentNodeProps) {
  const componentId = data.componentId;
  const registryItem = resolveRegistryItem(componentId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { resolvedProps, isLoadingProps, propsError } =
    useAsyncProps(componentId);
  const handleWheel = useScrollCapture(scrollContainerRef);

  const nodeId = useNodeId();
  const { updateNodeData } = useReactFlow();
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

  const handleSizeChange = (newSize: ComponentSize) => {
    setSize(newSize);
    if (nodeId) {
      updateNodeData(nodeId, { size: newSize });
    }
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
      className={`flex flex-col ${isPreset ? "" : "min-w-[200px]"}`}
      style={{
        ...(isPreset ? { width: displayDims.width } : {}),
        fontFamily: "var(--pg-font-sans)",
      }}
    >
      {/* ── Top bar — always visible label, controls only when selected ── */}
      <div className="flex items-center justify-between px-0.5 pb-1.5 cursor-grab">
        {/* Left: label (always visible) */}
        <div className="flex items-center gap-1.5">
          <NodeLabel color="#0B99FF">{label}</NodeLabel>
        </div>

        {/* Right: size controls — invisible when not selected */}
        <div
          className={`flex items-center gap-1.5 transition-opacity nodrag ${selected ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <ViewportButtons currentSize={size} onSizeChange={handleSizeChange} />
        </div>
      </div>

      {/* ── Frame + right-side vertical toolbar ── */}
      <div className="relative flex items-start">
        {/* Component frame */}
        <div
          data-screenshot-target
          data-interactive={isInteractive ? "true" : undefined}
          onDoubleClick={handleFrameDoubleClick}
          onMouseMove={hoverHint.onMouseMove}
          onMouseLeave={hoverHint.onMouseLeave}
          onPointerDown={hoverHint.onPointerDown}
          className={`relative app-theme bg-background overflow-hidden rounded-xl transition-all ${
            selected ? "ring-2 ring-[#0B99FF]" : ""
          } ${isInteractive ? "ring-offset-2" : ""}`}
        >
          {isPreset ? (
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
          {/* Transparent click catcher — blocks preview links/buttons until
              double-click enters interact mode. Element-select mode disables
              this via `[data-pg-interact-catcher]` in playground-global.css. */}
          {!isInteractive && (
            <div className="absolute inset-0" data-pg-interact-catcher />
          )}
        </div>

        {hoverHint.tooltip}
      </div>
    </div>
  );
}

export default memo(ComponentNode);
