/** 3D project box — left toolbar sidebar toggle and sidebar "Project" label. */
export function ProjectBoxIcon({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

/** Document page — used for canvas designs (formerly "start riffing"). */
function PageDocumentIcon({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

/** Stacked-cards glyph — iteration/variation count control. */
export function VariationStackIcon({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 20 20"
      className={className}
      aria-hidden
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.6 3.396H4.25c-.314 0-.568.283-.568.633v12.665c0 .35.254.633.568.633H15.6c.314 0 .568-.284.568-.633V4.029c0-.35-.254-.633-.567-.633ZM6.8 10.361h6.25M9.925 7.236v6.25"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        d="M17.747 5.02v10.682M19.312 6.019v8.685"
      />
    </svg>
  );
}

/**
 * Diagonal 3-line resize grip — bottom-right NodeResizeControl handle.
 * Was duplicated verbatim across ComponentNode, ImageNode, and IterationNode.
 */
export function ResizeGripIcon({ className }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className={className}>
      <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" />
      <line x1="9" y1="4" x2="4" y2="9" stroke="currentColor" strokeWidth="1.2" />
      <line x1="9" y1="7" x2="7" y2="9" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** Rounded-rect + two crossed lines — "node" chat reference chip glyph. */
export function NodeRefIcon({
  className = "flex-shrink-0",
}: {
  className?: string;
}) {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 6h6M5 8h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** Two inward-facing brackets — chat composer "context" affordance. */
export function BracketIcon({ className = "flex-shrink-0" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <path
        d="M3.5 2L1.5 6L3.5 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 2L10.5 6L8.5 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Edit / Explore icons — sourced from src/app/playground/assets/{edit,explore}-icon.svg.
// Inlined so they pick up `currentColor` from the active toggle segment.

/** Pencil-stroke glyph — chat composer "Edit" mode toggle. */
export function EditIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" className={className} aria-hidden>
      <path
        d="M7.21853 0.821105C7.42413 0.615505 7.70299 0.5 7.99375 0.5C8.28451 0.5 8.56337 0.615505 8.76897 0.821105C8.97457 1.0267 9.09007 1.30556 9.09007 1.59632C9.09007 1.88708 8.97457 2.16594 8.76897 2.37154L2.56724 8.57326L0.5 9.09007L1.01681 7.02283L7.21853 0.821105Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dot-grid glyph — chat composer "Explore" mode toggle. */
export function ExploreIcon({ className }: { className?: string }) {
  return (
    <svg width="13" height="14" viewBox="0 0 11 13" fill="currentColor" className={className} aria-hidden>
      <circle cx="1.04653" cy="8.34829" r="1.04653" />
      <circle cx="1.04653" cy="3.93227" r="1.04653" />
      <circle cx="5.30825" cy="1.04653" r="1.04653" />
      <circle cx="9.70083" cy="3.93227" r="1.04653" />
      <circle cx="5.3102" cy="6.02553" r="1.04653" />
      <circle cx="9.70083" cy="8.34829" r="1.04653" />
      <circle cx="5.3102" cy="11.0045" r="1.04653" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Canvas context-menu z-order glyphs (PlaygroundCanvasContextMenu)
// ---------------------------------------------------------------------------

export function BringToFrontIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="7" y="7" width="13" height="13" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export function BringForwardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M4 14V6a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

export function SendBackwardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="4" width="11" height="11" rx="2" />
      <path d="M20 10v8a2 2 0 0 1-2 2h-8" />
    </svg>
  );
}

export function SendToBackIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="4" width="13" height="13" rx="2" />
      <path d="M20 8v10a2 2 0 0 1-2 2H8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Canvas floating toolbar glyphs (PlaygroundCanvasToolbar)
// ---------------------------------------------------------------------------

/** Cursor/pointer glyph — the "Select" tool. */
export function CanvasSelectToolIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 3l14 9-7 1-4 7z" />
    </svg>
  );
}

/** "T" baseline glyph — the "Text" tool. */
export function CanvasTextToolIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

/** Photo-frame glyph — the "Upload image" toolbar button. */
export function CanvasImageToolIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
