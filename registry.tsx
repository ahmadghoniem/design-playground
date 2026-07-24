import type { ComponentType } from "react"
import type { ChatSubmitPayload, ComponentSize } from "@pg/shared/lib/constants"
import { adoptIterationPrompt } from "@pg/features/generation/prompts/adopt.prompt"
import {
  elementIterationFromIterationPrompt,
  elementIterationPrompt
} from "@pg/features/generation/prompts/element-iteration.prompt"
import { iterationFromIterationPrompt } from "@pg/features/generation/prompts/iteration-from-iteration.prompt"
import { iterationPrompt } from "@pg/features/generation/prompts/iteration.prompt"
import {
  formatChildrenSection,
  formatCustomInstructionsSection,
  formatElementSelectionsSection,
  formatSkillSection,
  getQualityChecklist,
  getStylingConstraint,
  getStylingQualityItem
} from "@pg/features/generation/prompts/shared-sections"
import { iterationsFile } from "@pg/shared/lib/playground-paths"
import { discoveredRegistry } from "./discovered-registry.gen"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Re-export ComponentSize from constants for backward compatibility
export type { ComponentSize } from "@pg/shared/lib/constants"

export interface RegistryLeafItem {
  id: string
  label: string
  Component: ComponentType<Record<string, unknown>>
  props?: Record<string, unknown>
  getProps?: () => Promise<Record<string, unknown>> | Record<string, unknown>
  parentId?: string // Optional parent component id for nested discovered components
  // Iteration metadata
  sourcePath: string
  childComponents?: string[] // Child component names that can be iterated
  size?: ComponentSize // Display size for the component preview
}

// ---------------------------------------------------------------------------
// Merged registry
// ---------------------------------------------------------------------------

/**
 * The full component list consumers see: the playground-discovered components
 * (generated from `discovered-registry.json`). Discovery is the only source —
 * there is no hand-written base list to merge in.
 */
export const registry: RegistryLeafItem[] = discoveredRegistry

// ---------------------------------------------------------------------------
// Flatten helper
// ---------------------------------------------------------------------------

export function flattenRegistry(
  items: RegistryLeafItem[]
): Record<string, RegistryLeafItem> {
  const result: Record<string, RegistryLeafItem> = {}
  for (const item of items) {
    result[item.id] = item
  }
  return result
}

export const flatRegistry = flattenRegistry(registry)

/**
 * Preload all lazily-loaded components in the registry, if they expose a
 * `.preload()` method (e.g. React.lazy-wrapped components), to avoid HMR
 * cascades when components are first dropped onto the canvas in dev mode.
 */
export function preloadAllComponents(): void {
  for (const item of Object.values(flatRegistry)) {
    const Component = item.Component as ComponentType<Record<string, unknown>> & {
      preload?: () => void
    }
    if (typeof Component?.preload === "function") {
      Component.preload()
    }
  }
}

// ---------------------------------------------------------------------------
// Registry resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a component by ID from the flat registry.
 * All components — examples and discovered — live in the registry tree above.
 */
export function resolveRegistryItem(componentId: string): RegistryLeafItem | null {
  return flatRegistry[componentId] ?? null
}

/**
 * Convert a kebab-case registry ID to PascalCase.
 * e.g. "manifesto-page" → "ManifestoPage", "signup-form" → "SignupForm"
 *
 * This is used for iteration filenames so that the filename prefix can be
 * reliably converted back to the registry ID via the inverse transformation
 * (PascalCase → kebab-case) during iteration scanning.
 */
export function registryIdToPascalCase(id: string): string {
  return id.replace(/(^|-)([a-z])/g, (_, _sep, char) => char.toUpperCase())
}

// ---------------------------------------------------------------------------
// Prompt generator
// ---------------------------------------------------------------------------

export function generateIterationPrompt(
  componentId: string,
  iterationCount: number = 4,
  startNumber: number = 1,
  customInstructions?: string,
  skillPrompt?: string,
  referenceNodesSection?: string
): string {
  const item = resolveRegistryItem(componentId)
  if (!item) return ""

  const componentName = item.label.replace(/\s*\(.*\)/, "")
  const cleanComponentName = registryIdToPascalCase(componentId)

  const childrenSection = formatChildrenSection(item.childComponents)
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions)
  const skillSection = formatSkillSection(skillPrompt)

  const iterationNumbers = Array.from({ length: iterationCount }, (_, i) => startNumber + i)

  const iterationSavesBlock = iterationNumbers
    .map(
      (n) => `   - Save as ${iterationsFile(`${cleanComponentName}.iteration-${n}.tsx`)}`
    )
    .join("\n")

  return iterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    iterationCount: String(iterationCount),
    childrenSection,
    cleanComponentName,
    componentId,
    customInstructionsSection,
    stylingConstraint: getStylingConstraint(),
    qualityChecklist: getQualityChecklist(),
    iterationNumbersList: iterationNumbers.join(", "),
    iterationSavesBlock,
    referenceNodesSection: referenceNodesSection || ""
  })
}

// ---------------------------------------------------------------------------
// Iteration-from-iteration prompt generator
// ---------------------------------------------------------------------------

export function generateIterationFromIterationPrompt(
  componentId: string,
  sourceIterationFilename: string,
  iterationCount: number,
  startNumber: number,
  customInstructions?: string,
  skillPrompt?: string,
  referenceNodesSection?: string
): string {
  const item = resolveRegistryItem(componentId)
  if (!item) return ""

  const componentName = item.label.replace(/\s*\(.*\)/, "")
  const cleanComponentName = registryIdToPascalCase(componentId)
  const endNumber = startNumber + iterationCount - 1
  const iterationSourcePath = iterationsFile(sourceIterationFilename)

  const childrenSection = formatChildrenSection(item.childComponents)
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions)
  const skillSection = formatSkillSection(skillPrompt)

  const iterationNumbers = Array.from({ length: iterationCount }, (_, i) => startNumber + i)

  const iterationSavesBlock = iterationNumbers
    .map(
      (n) => `   - Save as ${iterationsFile(`${cleanComponentName}.iteration-${n}.tsx`)}`
    )
    .join("\n")

  return iterationFromIterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    iterationSourcePath,
    iterationCount: String(iterationCount),
    startNumber: String(startNumber),
    endNumber: String(endNumber),
    childrenSection,
    iterationSavesBlock,
    treeParent: sourceIterationFilename,
    customInstructionsSection,
    iterationNumbersList: iterationNumbers.join(", "),
    sourceIterationFilename,
    stylingConstraint: getStylingConstraint(),
    referenceNodesSection: referenceNodesSection || ""
  })
}

// ---------------------------------------------------------------------------
// Element-targeted iteration prompt generator
// ---------------------------------------------------------------------------

export function generateElementIterationPrompt(
  componentId: string,
  startNumber: number,
  iterationCount: number,
  elementSelections: ChatSubmitPayload["elementSelections"],
  customInstructions?: string,
  skillPrompt?: string,
  referenceNodesSection?: string
): string {
  const item = flatRegistry[componentId]
  if (!item) return ""

  const componentName = item.label.replace(/\s*\(.*\)/, "")
  const cleanComponentName = registryIdToPascalCase(componentId)

  const childrenSection = formatChildrenSection(item.childComponents)
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions)
  const skillSection = formatSkillSection(skillPrompt)
  const elementSelectionsSection = formatElementSelectionsSection(elementSelections)

  const iterationNumbers = Array.from({ length: iterationCount }, (_, i) => startNumber + i)

  const iterationSavesBlock = iterationNumbers
    .map(
      (n) => `   - Save as ${iterationsFile(`${cleanComponentName}.iteration-${n}.tsx`)}`
    )
    .join("\n")

  return elementIterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    childrenSection,
    cleanComponentName,
    componentId,
    customInstructionsSection,
    elementSelectionsSection,
    iterationCount: String(iterationCount),
    iterationNumbersList: iterationNumbers.join(", "),
    iterationSavesBlock,
    stylingQualityItem: getStylingQualityItem(),
    referenceNodesSection: referenceNodesSection || ""
  })
}

export function generateElementIterationFromIterationPrompt(
  componentId: string,
  sourceIterationFilename: string,
  startNumber: number,
  iterationCount: number,
  elementSelections: ChatSubmitPayload["elementSelections"],
  customInstructions?: string,
  skillPrompt?: string,
  referenceNodesSection?: string
): string {
  const item = flatRegistry[componentId]
  if (!item) return ""

  const componentName = item.label.replace(/\s*\(.*\)/, "")
  const cleanComponentName = registryIdToPascalCase(componentId)
  const iterationSourcePath = iterationsFile(sourceIterationFilename)

  const childrenSection = formatChildrenSection(item.childComponents)
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions)
  const skillSection = formatSkillSection(skillPrompt)
  const elementSelectionsSection = formatElementSelectionsSection(elementSelections)

  const iterationNumbers = Array.from({ length: iterationCount }, (_, i) => startNumber + i)

  const iterationSavesBlock = iterationNumbers
    .map(
      (n) => `   - Save as ${iterationsFile(`${cleanComponentName}.iteration-${n}.tsx`)}`
    )
    .join("\n")

  return elementIterationFromIterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    iterationSourcePath,
    childrenSection,
    cleanComponentName,
    componentId,
    customInstructionsSection,
    elementSelectionsSection,
    iterationCount: String(iterationCount),
    iterationNumbersList: iterationNumbers.join(", "),
    iterationSavesBlock,
    treeParent: sourceIterationFilename,
    sourceIterationFilename,
    stylingQualityItem: getStylingQualityItem(),
    referenceNodesSection: referenceNodesSection || ""
  })
}

// ---------------------------------------------------------------------------
// Adopt prompt generator
// ---------------------------------------------------------------------------

export function generateAdoptPrompt(componentId: string, iterationFilename: string): string {
  const item = resolveRegistryItem(componentId)
  const originalPath =
    item?.sourcePath || `src/components/${iterationFilename.split(".iteration")[0]}.tsx`
  const iterationPath = iterationsFile(iterationFilename)

  return adoptIterationPrompt({ originalPath, iterationPath })
}
