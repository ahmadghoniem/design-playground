import { useEffect, type Dispatch, type SetStateAction } from "react";
import { matchesAction } from "../lib/keybindings";
import { usePlaygroundDrawStore } from "../stores/playground-draw-store";
import type { DrawPenKind, DrawStroke } from "../lib/draw-types";
import type { ShapeKind } from "../nodes/ShapeNode";

function isCanvasTypingTarget(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if ((active as HTMLElement).isContentEditable) return true;
  if (
    active.closest('[role="dialog"]') ||
    active.closest("[data-radix-popper-content-wrapper]")
  )
    return true;
  return false;
}

export interface UseCanvasKeyboardParams {
  setActiveTool: Dispatch<SetStateAction<"select" | "text" | "draw" | "shape">>;
  activeTool: "select" | "text" | "draw" | "shape";
  shapeKind: ShapeKind;
  setShapeKind: (kind: ShapeKind) => void;
  toggleDrawPenKind: (kind: DrawPenKind) => void;
  setCanvasDrawings: Dispatch<SetStateAction<DrawStroke[]>>;
  handleZOrder: (op: "front" | "back" | "forward" | "backward") => void;
  handleGroupSelection: () => void;
  handleUngroupFrame: () => void;
  undo: () => void;
  redo: () => void;
  handleDuplicateNodes: () => boolean;
  handleCopyNodes: () => boolean;
  handlePasteNodes: () => boolean;
}

/**
 * Consolidates canvas window keydown listeners (except Control/⌘ snap-to-grid,
 * which stays modal in the parent). Stroke delete uses capture phase to match
 * the prior standalone listener.
 */
export function useCanvasKeyboard({
  setActiveTool,
  activeTool,
  shapeKind,
  setShapeKind,
  toggleDrawPenKind,
  setCanvasDrawings,
  handleZOrder,
  handleGroupSelection,
  handleUngroupFrame,
  undo,
  redo,
  handleDuplicateNodes,
  handleCopyNodes,
  handlePasteNodes,
}: UseCanvasKeyboardParams): void {
  const clearAllStrokeSelection = usePlaygroundDrawStore(
    (s) => s.clearAllStrokeSelection,
  );

  // Delete selected pen stroke(s) with Backspace / Delete (capture phase).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (isCanvasTypingTarget()) return;

      const store = usePlaygroundDrawStore.getState();
      const sel = store.strokeSelection;
      const multi = store.multiStrokeSelection;

      if (multi.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setCanvasDrawings((prev) => prev.filter((s) => !multi.has(s.id)));
        clearAllStrokeSelection();
        return;
      }

      if (!sel) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setCanvasDrawings((prev) => prev.filter((s) => s.id !== sel.strokeId));
      clearAllStrokeSelection();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [setCanvasDrawings, clearAllStrokeSelection]);

  // Bubble-phase shortcuts — order matches the former per-effect registration sequence.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isCanvasTypingTarget()) {
        // Tool shortcuts also bail when typing; handled below only when not typing.
        return;
      }

      // "T" — toggle text-placement tool
      if (matchesAction(e, "canvas.add-text")) {
        e.preventDefault();
        setActiveTool((prev) => (prev === "text" ? "select" : "text"));
        return;
      }

      // Z-order: Cmd/Ctrl + ] / [
      let zOp: "front" | "back" | "forward" | "backward" | null = null;
      if (matchesAction(e, "canvas.bring-to-front")) zOp = "front";
      else if (matchesAction(e, "canvas.send-to-back")) zOp = "back";
      else if (matchesAction(e, "canvas.bring-forward")) zOp = "forward";
      else if (matchesAction(e, "canvas.send-backward")) zOp = "backward";
      if (zOp) {
        e.preventDefault();
        handleZOrder(zOp);
        return;
      }

      // Group / Ungroup
      const isGroup = matchesAction(e, "canvas.group");
      const isUngroup = matchesAction(e, "canvas.ungroup");
      if (isGroup || isUngroup) {
        e.preventDefault();
        if (isUngroup) handleUngroupFrame();
        else handleGroupSelection();
        return;
      }

      // Undo / redo / duplicate / copy / paste
      const meta = e.metaKey || e.ctrlKey;
      if (meta) {
        const key = e.key.toLowerCase();
        if (matchesAction(e, "canvas.redo") || (key === "y" && meta)) {
          e.preventDefault();
          redo();
          return;
        }
        if (matchesAction(e, "canvas.undo")) {
          e.preventDefault();
          undo();
          return;
        }
        if (matchesAction(e, "canvas.duplicate")) {
          e.preventDefault();
          handleDuplicateNodes();
          return;
        }
        if (key === "c" && !e.shiftKey) {
          if (handleCopyNodes()) e.preventDefault();
          return;
        }
        if (key === "v" && !e.shiftKey) {
          if (handlePasteNodes()) e.preventDefault();
          return;
        }
      }

      // Tool shortcuts: V select, P pen, shape keys, Escape
      if (e.key === "v" || e.key === "V") {
        setActiveTool("select");
        return;
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        toggleDrawPenKind("pen");
        return;
      }
      const shapeShortcut: Record<string, ShapeKind> = {
        r: "rect",
        o: "ellipse",
        l: "line",
      };
      const shapeForKey = shapeShortcut[e.key.toLowerCase()];
      if (shapeForKey) {
        e.preventDefault();
        if (activeTool === "shape" && shapeKind === shapeForKey) {
          setActiveTool("select");
        } else {
          setShapeKind(shapeForKey);
          setActiveTool("shape");
        }
        return;
      }
      if (activeTool !== "select" && e.key === "Escape") {
        setActiveTool("select");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeTool,
    shapeKind,
    setActiveTool,
    setShapeKind,
    toggleDrawPenKind,
    handleZOrder,
    handleGroupSelection,
    handleUngroupFrame,
    undo,
    redo,
    handleDuplicateNodes,
    handleCopyNodes,
    handlePasteNodes,
  ]);
}
