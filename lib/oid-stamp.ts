// ---------------------------------------------------------------------------
// data-pg-oid stamping for HTML pages (server-side)
// ---------------------------------------------------------------------------
// Onlook's data-oid pattern, scoped to HTML iterations: every element in the
// ON-DISK file gets a stable `data-pg-oid` attribute, so the id the browser
// reports during element selection literally exists in the source the agent
// edits — selection references become an exact grep target instead of a
// descriptor the agent has to fuzzy-match (and staleness becomes detectable:
// the oid is either in the file or it isn't).
//
// Idempotent: existing oids are kept; only unstamped elements get new ones.
// ---------------------------------------------------------------------------

import fs from 'fs';
import { parse, serialize } from 'parse5';

const OID_ATTR = 'data-pg-oid';

/** Tags that never need an oid (non-visual / metadata). */
const SKIP_TAGS = new Set(['html', 'head', 'meta', 'title', 'link', 'script', 'style', 'base', 'noscript']);

function randomOid(taken: Set<string>): string {
  let oid: string;
  do {
    oid = Math.random().toString(36).slice(2, 8);
  } while (taken.has(oid));
  taken.add(oid);
  return oid;
}

interface P5Node {
  nodeName: string;
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: P5Node[];
}

/**
 * Add `data-pg-oid` to every visual element that lacks one.
 * Returns the (possibly rewritten) HTML and whether anything changed.
 */
function stampHtmlWithOids(html: string): { html: string; changed: boolean } {
  const document = parse(html) as unknown as P5Node;
  const taken = new Set<string>();
  const unstamped: P5Node[] = [];

  const walk = (node: P5Node) => {
    if (node.tagName && node.attrs && !SKIP_TAGS.has(node.tagName)) {
      const existing = node.attrs.find((a) => a.name === OID_ATTR);
      if (existing) taken.add(existing.value);
      else unstamped.push(node);
    }
    node.childNodes?.forEach(walk);
  };
  walk(document);

  if (unstamped.length === 0) return { html, changed: false };

  for (const node of unstamped) {
    node.attrs!.push({ name: OID_ATTR, value: randomOid(taken) });
  }
  return { html: serialize(document as never), changed: true };
}

/**
 * Stamp an HTML file on disk if any element lacks an oid. Best-effort:
 * errors (unreadable/locked file) are swallowed — stamping is an enhancement,
 * never a reason to fail a scan.
 */
export function ensureHtmlFileStamped(filePath: string): void {
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    const { html: stamped, changed } = stampHtmlWithOids(html);
    if (changed) fs.writeFileSync(filePath, stamped, 'utf-8');
  } catch {
    /* best-effort */
  }
}
