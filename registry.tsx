import type { ComponentType } from "react"
import type { RegistryLeafItem } from "./registry-types"
import { discoveredRegistry } from "./discovered-registry.gen"

export type { RegistryLeafItem } from "./registry-types"

/**
 * The full component list consumers see: the playground-discovered components
 * (generated from `discovered-registry.json`). Discovery is the only source —
 * there is no hand-written base list to merge in.
 *
 * Mutable so Vite HMR can swap the array when `discovered-registry.gen.tsx`
 * regenerates without a full page reload. Prefer `subscribeRegistry` / the
 * sidebar hook rather than capturing this export once at module init.
 */
export let registry: RegistryLeafItem[] = discoveredRegistry

type RegistryListener = (items: RegistryLeafItem[]) => void
const registryListeners = new Set<RegistryListener>()

function setRegistry(next: RegistryLeafItem[]): void {
  registry = next
  // Rebuild the flat lookup BEFORE notifying: listeners may call
  // resolveRegistryItem / read flatRegistry synchronously.
  flatRegistry = flattenRegistry(next)
  for (const listener of registryListeners) listener(next)
}

/** Subscribe to registry HMR / programmatic updates. Returns unsubscribe. */
export function subscribeRegistry(listener: RegistryListener): () => void {
  registryListeners.add(listener)
  return () => {
    registryListeners.delete(listener)
  }
}

export function flattenRegistry(
  items: RegistryLeafItem[],
): Record<string, RegistryLeafItem> {
  const result: Record<string, RegistryLeafItem> = {}
  for (const item of items) {
    result[item.id] = item
  }
  return result
}

export let flatRegistry = flattenRegistry(registry)

/**
 * Preload all lazily-loaded components in the registry, if they expose a
 * `.preload()` method (e.g. React.lazy-wrapped components), to avoid HMR
 * cascades when components are first dropped onto the canvas in dev mode.
 */
export function preloadAllComponents(): void {
  for (const item of Object.values(flatRegistry)) {
    const Component = item.Component as ComponentType<
      Record<string, unknown>
    > & {
      preload?: () => void
    }
    if (typeof Component?.preload === "function") {
      Component.preload()
    }
  }
}

export function resolveRegistryItem(
  componentId: string,
): RegistryLeafItem | null {
  return flatRegistry[componentId] ?? null
}

/**
 * Convert a kebab-case registry ID to PascalCase.
 * e.g. "manifesto-page" → "ManifestoPage", "signup-form" → "SignupForm"
 */
export function registryIdToPascalCase(id: string): string {
  return id.replace(/(^|-)([a-z])/g, (_, _sep, char) => char.toUpperCase())
}

if (import.meta.hot) {
  import.meta.hot.accept("./discovered-registry.gen", (mod) => {
    if (!mod?.discoveredRegistry) return
    setRegistry(mod.discoveredRegistry as RegistryLeafItem[])
  })
}
