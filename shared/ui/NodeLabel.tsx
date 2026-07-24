import { memo, type CSSProperties, type ReactNode } from "react";
import { useNodeId, useStore } from "@xyflow/react";

type NodeLabelProps = {
  children: ReactNode;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

function NodeLabelInner({ children, color, className, style }: NodeLabelProps) {
  const nodeId = useNodeId();
  const isSelected = useStore((s) => {
    if (!nodeId) return false;
    return Boolean(s.nodeLookup?.get(nodeId)?.selected);
  });

  // Labels are muted-grey by default; show their accent color only when the
  // owning node is selected.
  const effectiveColor = isSelected ? color : "#A8A29E";

  return (
    <span
      className={`text-[11px] font-medium select-none leading-none ${className ?? ""}`}
      style={{
        fontFamily: "var(--pg-font-sans)",
        color: effectiveColor,
        display: "inline-block",
        position: "relative",
        zIndex: 10,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export const NodeLabel = memo(NodeLabelInner);
