import type { RefObject } from "react";
import type { Node } from "@xyflow/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export interface PlaygroundCanvasDialogsProps {
  showClearDialog: boolean;
  setShowClearDialog: (open: boolean) => void;
  confirmClearAllNodes: () => void | Promise<void>;
  deleteDialogNode: Node | null;
  setDeleteDialogNode: (node: Node | null) => void;
  handleDeleteWithMode: (mode: "cascade" | "reparent") => void | Promise<void>;
  createPageDialog: { screenX: number; screenY: number } | null;
  setCreatePageDialog: (
    dialog: { screenX: number; screenY: number } | null,
  ) => void;
  newPageDescription: string;
  setNewPageDescription: (value: string) => void;
  createPageError: string;
  setCreatePageError: (value: string) => void;
  creatingPage: boolean;
  newPageInputRef: RefObject<HTMLTextAreaElement | null>;
  handleCreatePage: () => void | Promise<void>;
}

export default function PlaygroundCanvasDialogs({
  showClearDialog,
  setShowClearDialog,
  confirmClearAllNodes,
  deleteDialogNode,
  setDeleteDialogNode,
  handleDeleteWithMode,
  createPageDialog,
  setCreatePageDialog,
  newPageDescription,
  setNewPageDescription,
  createPageError,
  setCreatePageError,
  creatingPage,
  newPageInputRef,
  handleCreatePage,
}: PlaygroundCanvasDialogsProps) {
  return (
    <>
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear everything?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all components and variations from the canvas and
              permanently delete all generated variation files. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAllNodes}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Clear canvas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {createPageDialog && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-start"
          onClick={() => {
            if (creatingPage) return;
            setCreatePageDialog(null);
            setNewPageDescription("");
            setCreatePageError("");
          }}
        >
          <div
            className="bg-white rounded-2xl border border-stone-200 shadow-xl p-4 w-[360px] animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              position: "fixed",
              left: createPageDialog.screenX,
              top: createPageDialog.screenY,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[13px] font-semibold text-stone-800 mb-1">
              New Page
            </h3>
            <p className="text-[11px] text-stone-500 mb-3">
              Describe the page. The AI will pick a slug, scaffold it, and
              register it in the Pages section.
            </p>
            <textarea
              ref={newPageInputRef}
              rows={4}
              placeholder="A landing page for our pricing plans, with a 3-tier comparison table…"
              value={newPageDescription}
              onChange={(e) => {
                setNewPageDescription(e.target.value);
                setCreatePageError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleCreatePage();
                }
                if (e.key === "Escape" && !creatingPage) {
                  setCreatePageDialog(null);
                  setNewPageDescription("");
                  setCreatePageError("");
                }
              }}
              disabled={creatingPage}
              className="w-full px-3 py-2 text-[13px] bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-colors resize-none disabled:opacity-50"
            />
            {createPageError && (
              <p className="text-[11px] text-red-500 mt-1.5">
                {createPageError}
              </p>
            )}
            <div className="flex justify-between items-center gap-2 mt-3">
              <span className="text-[10px] text-stone-400">⌘↵ to submit</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCreatePageDialog(null);
                    setNewPageDescription("");
                    setCreatePageError("");
                  }}
                  disabled={creatingPage}
                  className="px-3 py-1.5 text-[12px] text-stone-500 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleCreatePage()}
                  disabled={!newPageDescription.trim() || creatingPage}
                  className="px-3 py-1.5 text-[12px] bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {creatingPage ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deleteDialogNode}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogNode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete variation with children?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteDialogNode?.data.filename as string}</strong> has
              child variations. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteWithMode("reparent")}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
            >
              Keep children
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => void handleDeleteWithMode("cascade")}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
