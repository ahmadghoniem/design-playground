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
} from "@pg/shared/ui/alert-dialog";

export interface PlaygroundCanvasDialogsProps {
  deleteDialogNode: Node | null;
  setDeleteDialogNode: (node: Node | null) => void;
  handleDeleteWithMode: (mode: "cascade" | "reparent") => void | Promise<void>;
}

export default function PlaygroundCanvasDialogs({
  deleteDialogNode,
  setDeleteDialogNode,
  handleDeleteWithMode,
}: PlaygroundCanvasDialogsProps) {
  return (
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
  );
}
