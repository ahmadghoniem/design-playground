import { useCallback, useEffect, useRef, useState } from "react";
import { getProviderFields } from "../lib/generation-body";
import {
  generateHtmlIterationPrompt,
  generateHtmlIterationFromIterationPrompt,
} from "../lib/html-prompts";
import {
  generateJsxIterationPrompt,
  generateJsxIterationFromIterationPrompt,
} from "../lib/jsx-prompts";
import { loadDefaultSkillPrompt } from "../lib/load-default-skill-prompt";
import {
  generateIterationPrompt,
  generateIterationFromIterationPrompt,
} from "../registry";
import {
  generationEvents,
} from "../lib/generation-events";
import {
  DRAG_ITERATE_THRESHOLD_PX,
  DRAG_ITERATE_MAX_TOTAL,
  DRAG_ITERATE_MAX_COLS,
  DRAG_ITERATE_MAX_ROWS,
  DRAG_ITERATE_EVENT,
  DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
  type DragIteratePayload,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
  type JsxComponentInfo,
} from "../lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DragIterateGrid {
  rows: number;
  cols: number;
  count: number; // total new iterations = rows * cols - 1
}

/** Raw screen-pixel delta from the drag start point */
export interface DragDelta {
  dx: number;
  dy: number;
}

/** Absolute screen-space cursor position */
export interface CursorScreenPos {
  x: number;
  y: number;
}

interface DragToIterateConfig {
  /** Called when a drag gesture completes — consumer decides the grid from raw delta */
  onDragEnd: (delta: DragDelta, dragStart: CursorScreenPos) => void;
  /** Called when the interaction is a click (not a drag) */
  onClick: (shiftKey: boolean) => void;
  /** When true, all interactions are disabled */
  disabled?: boolean;
  /** Called continuously during drag with the raw screen-space delta */
  onDragUpdate?: (
    delta: DragDelta | null,
    dragStart: CursorScreenPos | null,
  ) => void;
}

interface DragToIterateResult {
  isDragging: boolean;
  /** Raw screen-pixel delta — only set while dragging */
  dragDelta: DragDelta | null;
  /** Absolute screen-space cursor position — tracks cursor 1:1 while dragging */
  cursorScreen: CursorScreenPos | null;
  /** Screen position where the drag started (the Zap button) */
  dragStartScreen: CursorScreenPos | null;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
  };
}

// ---------------------------------------------------------------------------
// Helper: clamp a grid so total iterations stay within bounds
// ---------------------------------------------------------------------------

export function clampGrid(rawCols: number, rawRows: number): DragIterateGrid {
  let cols = Math.max(1, Math.min(rawCols, DRAG_ITERATE_MAX_COLS));
  let rows = Math.max(1, Math.min(rawRows, DRAG_ITERATE_MAX_ROWS));

  // Ensure total new iterations (rows * cols - 1) doesn't exceed max
  while (rows * cols - 1 > DRAG_ITERATE_MAX_TOTAL && (rows > 1 || cols > 1)) {
    if (cols >= rows) cols--;
    else rows--;
  }

  const count = Math.max(0, rows * cols - 1);
  return { rows, cols, count };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDragToIterate({
  onDragEnd,
  onClick,
  disabled = false,
  onDragUpdate,
}: DragToIterateConfig): DragToIterateResult {
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState<DragDelta | null>(null);
  const [cursorScreen, setCursorScreen] = useState<CursorScreenPos | null>(
    null,
  );
  const [dragStartScreen, setDragStartScreen] =
    useState<CursorScreenPos | null>(null);

  const stateRef = useRef({
    startX: 0,
    startY: 0,
    hasDragged: false,
    shiftKey: false,
  });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      // Only respond to primary button (left click)
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      stateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        hasDragged: false,
        shiftKey: e.shiftKey,
      };

      const handlePointerMove = (ev: PointerEvent) => {
        const { startX, startY } = stateRef.current;
        const deltaX = ev.clientX - startX;
        const deltaY = ev.clientY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (
          !stateRef.current.hasDragged &&
          distance > DRAG_ITERATE_THRESHOLD_PX
        ) {
          stateRef.current.hasDragged = true;
          setIsDragging(true);
          setDragStartScreen({ x: startX, y: startY });
          document.body.style.cursor = "crosshair";
        }

        if (stateRef.current.hasDragged) {
          const delta: DragDelta = { dx: deltaX, dy: deltaY };
          const start: CursorScreenPos = { x: startX, y: startY };
          setDragDelta(delta);
          setCursorScreen({ x: ev.clientX, y: ev.clientY });
          onDragUpdate?.(delta, start);
        }
      };

      const handlePointerUp = (ev: PointerEvent) => {
        el.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);

        document.body.style.cursor = "";

        if (stateRef.current.hasDragged) {
          const { startX, startY } = stateRef.current;
          const deltaX = ev.clientX - startX;
          const deltaY = ev.clientY - startY;

          setIsDragging(false);
          setDragDelta(null);
          setCursorScreen(null);
          setDragStartScreen(null);
          onDragUpdate?.(null, null);

          onDragEnd({ dx: deltaX, dy: deltaY }, { x: startX, y: startY });
        } else {
          // It's a click (pointer didn't move past threshold)
          setIsDragging(false);
          setDragDelta(null);
          setCursorScreen(null);
          setDragStartScreen(null);
          onDragUpdate?.(null, null);
          onClick(stateRef.current.shiftKey);
        }
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [disabled, onDragEnd, onClick, onDragUpdate],
  );

  return {
    isDragging,
    dragDelta,
    cursorScreen,
    dragStartScreen,
    handlers: { onPointerDown },
  };
}

// ---------------------------------------------------------------------------
// Drag-iterate window event handler
// ---------------------------------------------------------------------------

export function useDragIterateEventHandler(): void {
  useEffect(() => {
    const handleDragIterate = async (e: CustomEvent<DragIteratePayload>) => {
      const {
        componentId,
        componentName,
        parentNodeId,
        iterationCount,
        model,
        sourceFilename,
        renderMode: dragRenderMode,
        htmlFolder: dragHtmlFolder,
        jsxFile: dragJsxFile,
      } = e.detail;
      const isDragHtml = dragRenderMode === "html" && !!dragHtmlFolder;
      const isDragJsx = dragRenderMode === "jsx" && !!dragJsxFile;

      // Build the prompt
      let prompt: string;
      const defaultSkillPrompt = await loadDefaultSkillPrompt();

      // Fetch next available iteration number
      let startNumber = 1;
      try {
        if (isDragHtml) {
          const response = await fetch("/playground/api/html-pages");
          if (response.ok) {
            const { pages } = await response.json();
            const page = pages.find(
              (p: { folder: string }) => p.folder === dragHtmlFolder,
            );
            const maxNumber =
              page?.iterations.reduce(
                (max: number, i: { number: number }) => Math.max(max, i.number),
                0,
              ) ?? 0;
            startNumber = maxNumber + 1;
          }
        } else if (isDragJsx && dragJsxFile) {
          const baseFilename = dragJsxFile.replace(
            /\.iteration-\d+\.tsx$/,
            ".tsx",
          );
          const response = await fetch("/playground/api/oncanvas-components");
          if (response.ok) {
            const { components } = (await response.json()) as {
              components: JsxComponentInfo[];
            };
            const comp = components.find((c) => c.filename === baseFilename);
            const maxNumber =
              comp?.iterations.reduce(
                (max: number, i: { iterationNumber: number }) =>
                  Math.max(max, i.iterationNumber),
                0,
              ) ?? 0;
            startNumber = maxNumber + 1;
          }
        } else {
          const cleanName = componentName.replace(/\s+/g, "");
          const response = await fetch("/playground/api/iterations");
          if (response.ok) {
            const { iterations } = await response.json();
            const componentIterations = iterations.filter(
              (i: { componentName: string }) => i.componentName === cleanName,
            );
            const maxNumber = componentIterations.reduce(
              (max: number, i: { iterationNumber: number }) =>
                Math.max(max, i.iterationNumber),
              0,
            );
            startNumber = maxNumber + 1;
          }
        }
      } catch {
        /* use default */
      }

      if (isDragHtml) {
        // HTML mode prompt
        if (sourceFilename && sourceFilename.includes("iteration-")) {
          const iterFolder = sourceFilename.split("/").pop() || sourceFilename;
          prompt = generateHtmlIterationFromIterationPrompt(
            dragHtmlFolder,
            iterFolder,
            iterationCount,
            startNumber,
            DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
            defaultSkillPrompt || undefined,
          );
        } else {
          prompt = generateHtmlIterationPrompt(
            dragHtmlFolder,
            iterationCount,
            startNumber,
            DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
            defaultSkillPrompt || undefined,
          );
        }
      } else if (isDragJsx && dragJsxFile) {
        const baseFile = dragJsxFile.replace(/\.iteration-\d+\.tsx$/, ".tsx");
        if (sourceFilename) {
          prompt = generateJsxIterationFromIterationPrompt(
            baseFile,
            sourceFilename,
            iterationCount,
            startNumber,
            DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
            defaultSkillPrompt || undefined,
          );
        } else {
          prompt = generateJsxIterationPrompt(
            baseFile,
            iterationCount,
            startNumber,
            DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
            defaultSkillPrompt || undefined,
          );
        }
      } else if (sourceFilename) {
        try {
          prompt = generateIterationFromIterationPrompt(
            componentId,
            sourceFilename,
            iterationCount,
            startNumber,
            "shell",
            DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
            defaultSkillPrompt || undefined,
          );
        } catch {
          prompt = generateIterationPrompt(
            componentId,
            iterationCount,
            startNumber,
            "shell",
            DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
            defaultSkillPrompt || undefined,
          );
        }
      } else {
        prompt = generateIterationPrompt(
          componentId,
          iterationCount,
          startNumber,
          "shell",
          DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
          defaultSkillPrompt || undefined,
        );
      }

      // Guard: prompt must be non-empty before we proceed
      if (!prompt) {
        generationEvents.error.emit({
          componentId,
          parentNodeId,
          error: isDragHtml
            ? `HTML page "${dragHtmlFolder}" not found.`
            : isDragJsx
              ? "Could not build prompt for this JSX frame (missing jsxFile or canvas-components data)."
              : `Component "${componentId}" is not registered. Add it to the registry or re-run discovery before iterating.`,
        });
        return;
      }

      const dragPf = getProviderFields();
      // Dispatch generation start (creates skeleton nodes in grid layout)
      generationEvents.start.emit({
        componentId,
        componentName,
        parentNodeId,
        iterationCount,
        startNumber,
        model: model || undefined,
        provider: dragPf.provider as GenerationStartPayload["provider"],
        gridLayout: { rows: e.detail.rows, cols: e.detail.cols },
        ...(isDragHtml
          ? { renderMode: "html" as const, htmlFolder: dragHtmlFolder }
          : isDragJsx && dragJsxFile
            ? { renderMode: "jsx" as const, jsxFile: dragJsxFile }
            : {}),
      });

      // Call the generate API
      try {
        const response = await fetch("/playground/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            componentId,
            iterationCount,
            model: model || undefined,
            source: "drag",
            ...getProviderFields(),
            ...(isDragHtml ? { htmlFolder: dragHtmlFolder } : {}),
            ...(isDragJsx && dragJsxFile ? { jsxFile: dragJsxFile } : {}),
          }),
        });

        let data;
        try {
          data = await response.json();
        } catch {
          generationEvents.error.emit({
            componentId,
            parentNodeId,
            error: "Failed to parse response",
          });
          return;
        }

        if (!response.ok || !data.success) {
          const error =
            typeof data?.error === "string" ? data.error : "Generation failed";
          generationEvents.error.emit({
            componentId,
            parentNodeId,
            error,
          });
        } else {
          generationEvents.complete.emit({
            componentId,
            parentNodeId,
            output: "",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        generationEvents.error.emit({
          componentId,
          parentNodeId,
          error: msg,
        });
      }
    };

    const listener = ((e: Event) =>
      handleDragIterate(e as CustomEvent<DragIteratePayload>)) as EventListener;
    window.addEventListener(DRAG_ITERATE_EVENT, listener);
    return () => window.removeEventListener(DRAG_ITERATE_EVENT, listener);
  }, []);
}
