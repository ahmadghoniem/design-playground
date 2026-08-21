/**
 * Guarantees the generated registry module exists on disk.
 *
 * `registry.tsx` statically imports `discovered-registry.gen.tsx`, and that
 * file is a per-project artifact — written inside a host by discovery, never
 * committed to this package. A checkout that has not run discovery yet has no
 * such file, so this writes an empty one at server boot and the import
 * resolves either way.
 *
 * The manifest I/O and the code generator that produced a populated module
 * lived here too and are gone: nothing on this branch called them, and the
 * redesign in `.claude/specs/discovery-engine.md` changes the generator's
 * contract (no per-component description, overlay primitives excluded from the
 * module outright). The working scan and its `regenerateModule()` are on
 * `feat/layers-sidebar`.
 */

import fs from 'fs';
import path from 'path';

const MODULE_FILENAME = 'discovered-registry.gen.tsx';

const EMPTY_MODULE = `/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Placeholder written at server boot so registry.tsx's static import resolves
 * in a project that has not run discovery. Discovery replaces this file
 * wholesale with one carrying real component imports.
 */
export const discoveredRegistry = []
`;

/** Ensure the generated module exists on disk (empty default for fresh projects). */
export function ensureModuleExists(playgroundDir: string): void {
  const p = path.join(playgroundDir, MODULE_FILENAME);
  if (fs.existsSync(p)) return;
  // Standalone package checkouts may resolve a host-shaped path that isn't
  // present yet — only write when the playground directory itself exists.
  if (!fs.existsSync(playgroundDir)) return;
  fs.writeFileSync(p, EMPTY_MODULE, 'utf-8');
}
