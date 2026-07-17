/**
 * Discovered-registry manifest I/O + code generation.
 *
 * Discovered components live in a playground-owned JSON manifest
 * (`discovered-registry.json`). The analyze agent writes registry entries into
 * that manifest as pure data; this module regenerates a real TSX module
 * (`discovered-registry.gen.tsx`) from it on every add/remove. Because JSON
 * can't hold a component reference, the generated module carries the actual
 * component imports and is written wholesale from the manifest each time —
 * safe (never spliced into user source) and picked up by Vite HMR.
 */

import fs from 'fs';
import path from 'path';
import {
  DISCOVERED_REGISTRY_MANIFEST_FILENAME,
  DISCOVERED_REGISTRY_MODULE_FILENAME,
} from '../../shared/lib/constants';

export type DiscoveredComponentSize = 'default' | 'laptop' | 'tablet' | 'mobile';

export interface DiscoveredRegistryEntry {
  /** Discovery-scan entry id this registry entry was created from. */
  discoveryId: string;
  /** kebab-case registry id (PascalCase component name → kebab-case). */
  id: string;
  label: string;
  /** PascalCase React component identifier as exported by the source file. */
  componentName: string;
  /** Import specifier for the component (e.g. `@/components/ui/button`). */
  importPath: string;
  /** How the component is exported from importPath. */
  exportKind: 'default' | 'named';
  /** Repo-relative path to the source component file (for iteration linking). */
  sourcePath: string;
  size: DiscoveredComponentSize;
  /** Inline, JSON-serialisable prop values. */
  props: Record<string, unknown>;
  /** The component's TS props interface, as a string. */
  propsInterface: string;
  /** Parent registry id for sidebar nesting, when this is a child component. */
  parentId?: string;
}

export interface DiscoveredRegistryManifest {
  version: 1;
  entries: DiscoveredRegistryEntry[];
}

const GEN_HEADER = `/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Regenerated wholesale from \`${DISCOVERED_REGISTRY_MANIFEST_FILENAME}\` by the
 * discovery analyze/remove flow (server/routes/discover.ts). Discovered
 * components live in that JSON manifest, which the playground owns; this module
 * turns the manifest into a real registry array with live component imports so
 * Vite HMR reflects additions/removals. It is never spliced into the
 * hand-written registry.tsx — the whole file is replaced from data each time.
 */
`;

const EMPTY_MODULE = `${GEN_HEADER}import type { RegistryLeafItem } from "./registry"

export const discoveredRegistry: RegistryLeafItem[] = []
`;

export function manifestPath(playgroundDir: string): string {
  return path.join(playgroundDir, DISCOVERED_REGISTRY_MANIFEST_FILENAME);
}

export function modulePath(playgroundDir: string): string {
  return path.join(playgroundDir, DISCOVERED_REGISTRY_MODULE_FILENAME);
}

export function readManifest(playgroundDir: string): DiscoveredRegistryManifest {
  const p = manifestPath(playgroundDir);
  try {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (Array.isArray(data?.entries)) {
        return { version: 1, entries: data.entries as DiscoveredRegistryEntry[] };
      }
    }
  } catch (e) {
    console.error('[discovered-registry] Failed to read manifest:', e);
  }
  return { version: 1, entries: [] };
}

export function writeManifest(playgroundDir: string, manifest: DiscoveredRegistryManifest): void {
  fs.writeFileSync(
    manifestPath(playgroundDir),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8',
  );
}

/**
 * Rewrite `discovered-registry.gen.tsx` from the current manifest. Always
 * produces a valid module (empty array when there are no entries) so the
 * static import in registry.tsx never breaks.
 */
export function regenerateModule(playgroundDir: string): void {
  const { entries } = readManifest(playgroundDir);
  const source = entries.length === 0 ? EMPTY_MODULE : buildModule(entries);
  fs.writeFileSync(modulePath(playgroundDir), source, 'utf-8');
}

/** Ensure the generated module exists on disk (empty default for fresh projects). */
export function ensureModuleExists(playgroundDir: string): void {
  const p = modulePath(playgroundDir);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, EMPTY_MODULE, 'utf-8');
  }
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

/** Per-entry unique local import identifier (ids are unique → names are too). */
function localName(id: string): string {
  return `Cmp_${id.replace(/[^A-Za-z0-9]/g, '_')}`;
}

/** Escape a string for safe embedding inside a template literal. */
function escapeTemplate(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

/** Serialise inline props as a JS object literal, indented under `props:`. */
function renderProps(props: Record<string, unknown> | undefined): string {
  const json = JSON.stringify(props ?? {}, null, 2);
  return json
    .split('\n')
    .map((line, i) => (i === 0 ? line : `    ${line}`))
    .join('\n');
}

function renderEntry(e: DiscoveredRegistryEntry): string {
  const local = localName(e.id);
  const parentLine = e.parentId ? `\n    parentId: ${JSON.stringify(e.parentId)},` : '';
  return `  {
    id: ${JSON.stringify(e.id)},
    label: ${JSON.stringify(e.label)},
    Component: ${local} as unknown as ComponentType<Record<string, unknown>>,
    props: ${renderProps(e.props)} as Record<string, unknown>,
    sourcePath: ${JSON.stringify(e.sourcePath)},
    size: ${JSON.stringify(e.size ?? 'default')},
    propsInterface: \`${escapeTemplate(e.propsInterface ?? '')}\`,${parentLine}
  },`;
}

function buildModule(entries: DiscoveredRegistryEntry[]): string {
  const imports = entries
    .map((e) => {
      const local = localName(e.id);
      return e.exportKind === 'named'
        ? `import { ${e.componentName} as ${local} } from "${e.importPath}"`
        : `import ${local} from "${e.importPath}"`;
    })
    .join('\n');

  const items = entries.map(renderEntry).join('\n');

  return `${GEN_HEADER}import type { ComponentType } from "react"
import type { RegistryLeafItem } from "./registry"

${imports}

export const discoveredRegistry: RegistryLeafItem[] = [
${items}
]
`;
}
