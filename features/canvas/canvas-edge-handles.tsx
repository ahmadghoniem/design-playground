// Invisible connection handles that let the derived relation edges anchor to a
// node without changing its appearance. React Flow needs a source/target
// <Handle> to attach an edge; these are visually hidden and non-interactive
// (edges are read-only, nodes are not user-connectable). Parents connect from
// the right, children receive on the left, matching the left→right iteration
// layout.

import { Handle, Position, type HandleProps } from "@xyflow/react";
import type { CSSProperties } from "react";

export const EDGE_ANCHOR_HANDLE_STYLE: CSSProperties = {
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  opacity: 0,
  border: "none",
  background: "transparent",
  pointerEvents: "none",
};

/** Left target + right source handles, hidden and non-interactive. */
export function EdgeAnchorHandles(props: Partial<HandleProps>) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={EDGE_ANCHOR_HANDLE_STYLE}
        {...props}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={EDGE_ANCHOR_HANDLE_STYLE}
        {...props}
      />
    </>
  );
}
