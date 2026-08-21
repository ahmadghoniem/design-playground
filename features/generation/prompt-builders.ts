import type { ChatSubmitPayload } from "@pg/shared/lib/chat-submit-payload"
import {
  elementIterationFromIterationPrompt,
  elementIterationPrompt,
} from "@pg/features/generation/prompts/element-iteration.prompt"
import {
  iterationFromIterationPrompt,
  iterationPrompt,
} from "@pg/features/generation/prompts/iteration.prompt"
import {
  formatChildrenSection,
  formatCustomInstructionsSection,
  formatElementSelectionsSection,
  getQualityChecklist,
  getStylingConstraint,
  getStylingQualityItem,
} from "@pg/features/generation/prompts/shared-sections"
import { iterationsFile } from "@pg/shared/lib/playground-paths"
import { registryIdToPascalCase, resolveRegistryItem } from "@pg/registry"
import type { RegistryLeafItem } from "@pg/registry-types"

/**
 * Everything the four iteration prompt variants derive identically from the
 * registry item and the iteration window: display/file names, the numbered
 * save-path block, and the shared prompt sections.
 */
interface IterationPromptArtifacts {
  item: RegistryLeafItem
  componentName: string
  cleanComponentName: string
  iterationNumbers: number[]
  iterationNumbersList: string
  iterationSavesBlock: string
  childrenSection: string
  customInstructionsSection: string
}

function buildIterationArtifacts(
  componentId: string,
  iterationCount: number,
  startNumber: number,
  customInstructions?: string,
): IterationPromptArtifacts | null {
  const item = resolveRegistryItem(componentId)
  if (!item) return null

  const cleanComponentName = registryIdToPascalCase(componentId)
  const iterationNumbers = Array.from(
    { length: iterationCount },
    (_, i) => startNumber + i,
  )

  return {
    item,
    componentName: item.label.replace(/\s*\(.*\)/, ""),
    cleanComponentName,
    iterationNumbers,
    iterationNumbersList: iterationNumbers.join(", "),
    iterationSavesBlock: iterationNumbers
      .map(
        (n) =>
          `   - Save as ${iterationsFile(`${cleanComponentName}.iteration-${n}.tsx`)}`,
      )
      .join("\n"),
    childrenSection: formatChildrenSection(item.childComponents),
    customInstructionsSection:
      formatCustomInstructionsSection(customInstructions),
  }
}

export function generateIterationPrompt(
  componentId: string,
  iterationCount: number = 4,
  startNumber: number = 1,
  customInstructions?: string,
  referenceNodesSection?: string,
): string {
  const a = buildIterationArtifacts(
    componentId,
    iterationCount,
    startNumber,
    customInstructions,
  )
  if (!a) return ""

  return iterationPrompt({
    componentName: a.componentName,
    sourcePath: a.item.sourcePath,
    iterationCount: String(iterationCount),
    childrenSection: a.childrenSection,
    cleanComponentName: a.cleanComponentName,
    componentId,
    customInstructionsSection: a.customInstructionsSection,
    stylingConstraint: getStylingConstraint(),
    qualityChecklist: getQualityChecklist(),
    iterationNumbersList: a.iterationNumbersList,
    iterationSavesBlock: a.iterationSavesBlock,
    referenceNodesSection: referenceNodesSection || "",
  })
}

export function generateIterationFromIterationPrompt(
  componentId: string,
  sourceIterationFilename: string,
  iterationCount: number,
  startNumber: number,
  customInstructions?: string,
  referenceNodesSection?: string,
): string {
  const a = buildIterationArtifacts(
    componentId,
    iterationCount,
    startNumber,
    customInstructions,
  )
  if (!a) return ""

  const endNumber = startNumber + iterationCount - 1

  return iterationFromIterationPrompt({
    componentName: a.componentName,
    sourcePath: a.item.sourcePath,
    iterationSourcePath: iterationsFile(sourceIterationFilename),
    iterationCount: String(iterationCount),
    startNumber: String(startNumber),
    endNumber: String(endNumber),
    childrenSection: a.childrenSection,
    iterationSavesBlock: a.iterationSavesBlock,
    treeParent: sourceIterationFilename,
    customInstructionsSection: a.customInstructionsSection,
    iterationNumbersList: a.iterationNumbersList,
    sourceIterationFilename,
    stylingConstraint: getStylingConstraint(),
    referenceNodesSection: referenceNodesSection || "",
  })
}

export function generateElementIterationPrompt(
  componentId: string,
  startNumber: number,
  iterationCount: number,
  elementSelections: ChatSubmitPayload["elementSelections"],
  customInstructions?: string,
  referenceNodesSection?: string,
): string {
  const a = buildIterationArtifacts(
    componentId,
    iterationCount,
    startNumber,
    customInstructions,
  )
  if (!a) return ""

  return elementIterationPrompt({
    componentName: a.componentName,
    sourcePath: a.item.sourcePath,
    childrenSection: a.childrenSection,
    cleanComponentName: a.cleanComponentName,
    componentId,
    customInstructionsSection: a.customInstructionsSection,
    elementSelectionsSection: formatElementSelectionsSection(elementSelections),
    iterationCount: String(iterationCount),
    iterationNumbersList: a.iterationNumbersList,
    iterationSavesBlock: a.iterationSavesBlock,
    stylingQualityItem: getStylingQualityItem(),
    referenceNodesSection: referenceNodesSection || "",
  })
}

export function generateElementIterationFromIterationPrompt(
  componentId: string,
  sourceIterationFilename: string,
  startNumber: number,
  iterationCount: number,
  elementSelections: ChatSubmitPayload["elementSelections"],
  customInstructions?: string,
  referenceNodesSection?: string,
): string {
  const a = buildIterationArtifacts(
    componentId,
    iterationCount,
    startNumber,
    customInstructions,
  )
  if (!a) return ""

  return elementIterationFromIterationPrompt({
    componentName: a.componentName,
    sourcePath: a.item.sourcePath,
    iterationSourcePath: iterationsFile(sourceIterationFilename),
    childrenSection: a.childrenSection,
    cleanComponentName: a.cleanComponentName,
    componentId,
    customInstructionsSection: a.customInstructionsSection,
    elementSelectionsSection: formatElementSelectionsSection(elementSelections),
    iterationCount: String(iterationCount),
    iterationNumbersList: a.iterationNumbersList,
    iterationSavesBlock: a.iterationSavesBlock,
    treeParent: sourceIterationFilename,
    sourceIterationFilename,
    stylingQualityItem: getStylingQualityItem(),
    referenceNodesSection: referenceNodesSection || "",
  })
}
