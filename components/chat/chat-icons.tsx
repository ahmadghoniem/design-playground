'use client';

// ---------------------------------------------------------------------------
// Small node-reference glyphs for the chat's reference chips
// ---------------------------------------------------------------------------

export function ImageRefIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
      <path d="M2 11l3-3 2 2 3-3 4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NodeRefIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 6h6M5 8h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
