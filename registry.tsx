import type { ComponentType } from "react"
import type { ComponentSize } from "@pg/shared/lib/constants"
import { discoveredRegistry } from "./discovered-registry.gen"

export interface RegistryLeafItem {
  id: string
  label: string
  Component: ComponentType<Record<string, unknown>>
  props?: Record<string, unknown>
  getProps?: () => Promise<Record<string, unknown>> | Record<string, unknown>
  parentId?: string
  sourcePath: string
  childComponents?: string[]
  size?: ComponentSize
}

/**
 * The full component list consumers see: the playground-discovered components
 * (generated from `discovered-registry.json`). Discovery is the only source —
 * there is no hand-written base list to merge in.
 *
 * Regenerating `discovered-registry.gen.tsx` reloads the page: this module
 * exports data and functions rather than components, so it cannot be a React
 * Refresh boundary and Vite falls back to a full reload. Read these exports
 * directly — there is nothing to subscribe to.
 */
export const registry: RegistryLeafItem[] =
  discoveredRegistry as RegistryLeafItem[]

/** id -> item, for the by-id lookups that would otherwise scan the array. */
export const flatRegistry: Record<string, RegistryLeafItem> =
  Object.fromEntries(registry.map((item) => [item.id, item]))

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
