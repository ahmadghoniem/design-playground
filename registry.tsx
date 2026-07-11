import DailyRecapItem from "@/features/daily-recap/components/DailyRecapItem"
import MaxDrawdownCard from "@/features/objectives-tracking/components/MaxDrawdownCard"
import DrawdownConfigCard from "@/features/challenge-configuration/components/DrawdownConfigCard"
import SessionChangeManager from "@/features/session-management/components/SessionChangeManager"
import SessionDataManager from "@/features/session-management/components/SessionDataManager"
import SyncButton from "@/features/session-management/components/SyncButton"
import Footer from "@/components/layout/Footer"
import Header from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progressbar"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import StatusBadge from "@/components/ui/status-badge"
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton"
import React, { ComponentType } from "react"
import type { ChatSubmitPayload, ComponentSize, StylingMode } from "@pg/shared/lib/constants"
import { DEFAULT_STYLING_MODE } from "@pg/shared/lib/constants"
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
} from "@pg/shared/lib/prompts/shared-sections"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistryGroupItem {
  id: string
  label: string
  children: RegistryItem[]
}

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
  propsInterface: string
  childComponents?: string[] // Child component names that can be iterated
  size?: ComponentSize // Display size for the component preview
}

export type RegistryItem = RegistryGroupItem | RegistryLeafItem

export function isGroup(item: RegistryItem): item is RegistryGroupItem {
  return "children" in item && !("Component" in item)
}

export function isLeaf(item: RegistryItem): item is RegistryLeafItem {
  return "Component" in item
}

// ---------------------------------------------------------------------------
// Registry tree
// ---------------------------------------------------------------------------

export const registry: RegistryItem[] = [
  // ---------------------------------------------------------------------------
  // Discovered components — added via the playground discovery flow.
  // Props live inline on each entry; run discovery → Add in the playground UI.
  // ---------------------------------------------------------------------------
  {
    id: "pages",
    label: "Pages",
    children: [
      {
        id: "header",
        label: "Header",
        Component: Header as unknown as ComponentType<Record<string, unknown>>,
        props: {
          showConfiguration: false,
          onToggleConfiguration: () => {}
        } as Record<string, unknown>,
        sourcePath: "src/components/layout/Header.tsx",
        size: "default",
        propsInterface: `interface HeaderProps {
  showConfiguration: boolean
  onToggleConfiguration: () => void
}`
      },
      {
        id: "footer",
        label: "Footer",
        Component: Footer as unknown as ComponentType<Record<string, unknown>>,
        props: {} as Record<string, unknown>,
        sourcePath: "src/components/layout/Footer.tsx",
        size: "default",
        propsInterface: `interface FooterProps {\n  className?: string\n}`
      },
      {
        id: "status-badge",
        label: "StatusBadge",
        Component: StatusBadge as unknown as ComponentType<Record<string, unknown>>,
        props: { status: "funded" } as Record<string, unknown>,
        sourcePath: "src/components/ui/status-badge.tsx",
        size: "default",
        propsInterface: `interface StatusBadgeProps {\n  status: "sync" | "funded" | "in-progress" | "failed"\n  className?: string\n}`,
        parentId: "header"
      },
      {
        id: "theme-toggle-button",
        label: "ThemeToggleButton",
        Component: ThemeToggleButton as unknown as ComponentType<Record<string, unknown>>,
        props: {
          theme: "light",
          showLabel: false,
          variant: "circle",
          start: "center"
        } as Record<string, unknown>,
        sourcePath: "src/components/ui/ThemeToggleButton.tsx",
        size: "default",
        propsInterface: `interface ThemeToggleButtonProps {
  theme?: "light" | "dark"
  showLabel?: boolean
  variant?: "circle" | "circle-blur" | "gif" | "polygon"
  start?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  url?: string
  className?: string
  onClick?: () => void
}`,
        parentId: "header"
      },
      {
        id: "button",
        label: "Button",
        Component: Button as unknown as ComponentType<Record<string, unknown>>,
        props: {
          children: "Get Started",
          variant: "default",
          size: "default"
        } as Record<string, unknown>,
        sourcePath: "src/components/ui/button.tsx",
        size: "default",
        propsInterface: `interface ButtonProps {
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
  children: React.ReactNode
  onClick?: () => void
}`,
        parentId: "header"
      },
      {
        id: "sync-button",
        label: "SyncButton",
        Component: SyncButton as unknown as ComponentType<Record<string, unknown>>,
        props: {} as Record<string, unknown>,
        sourcePath: "src/features/session-management/components/SyncButton.tsx",
        size: "default",
        propsInterface: `// SyncButton takes no props — it reads isInSync and handleSync
// from the Zustand app store (useAppStore).
type SyncButtonProps = Record<string, never>`,
        parentId: "header"
      },
      {
        id: "session-change-manager",
        label: "SessionChangeManager",
        Component: SessionChangeManager as unknown as ComponentType<Record<string, unknown>>,
        props: {
          sessionData: {
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            accountId: "ACC-29381",
            status: "funded",
            startDate: "2026-06-01T09:00:00.000Z",
            endDate: "2026-07-05T17:00:00.000Z",
            balance: 52480.75,
            initialBalance: 50000
          }
        } as Record<string, unknown>,
        sourcePath: "src/features/session-management/components/SessionChangeManager.tsx",
        size: "default",
        propsInterface: `interface SessionChangeManagerProps {
  sessionData: Session
}`,
        parentId: "header"
      },
      {
        id: "session-data-manager",
        label: "SessionDataManager",
        Component: SessionDataManager as unknown as ComponentType<Record<string, unknown>>,
        props: {
          sessionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        } as Record<string, unknown>,
        sourcePath: "src/features/session-management/components/SessionDataManager.tsx",
        size: "default",
        propsInterface: `interface SessionDataManagerProps {\n  sessionId: string\n}`,
        parentId: "header"
      },
      {
        id: "drawdown-config-card",
        label: "Drawdown Config Card",
        Component: DrawdownConfigCard as unknown as ComponentType<Record<string, unknown>>,
        props: {} as Record<string, unknown>,
        sourcePath: "src/features/challenge-configuration/components/DrawdownConfigCard.tsx",
        size: "default",
        propsInterface: `// DrawdownConfigCard takes no props — it reads
// config.dailyDrawdown, config.maxDrawdown, and config.maxDrawdownType
// from the Zustand app store (useAppStore).
type DrawdownConfigCardProps = Record<string, never>`
      },
      {
        id: "daily-recap-item",
        label: "Daily Recap Item",
        Component: DailyRecapItem as unknown as ComponentType<Record<string, unknown>>,
        props: {
          day: {
            date: new Date("2026-07-03T00:00:00.000Z"),
            dateKey: "2026-07-03",
            trades: [
              { realized: "$245.80", maxRR: "2.4" },
              { realized: "$132.50", maxRR: "1.8" },
              { realized: "-$67.20", maxRR: "0.6" },
              { realized: "$89.10", maxRR: "1.5" }
            ],
            totalPnL: 400.2,
            percentageChange: 0.8
          }
        } as Record<string, unknown>,
        sourcePath: "src/features/daily-recap/components/DailyRecapItem.tsx",
        size: "default",
        propsInterface: `interface DailyRecapItemProps {
  day: {
    date: Date
    dateKey: string
    trades: Trade[]
    totalPnL: number
    percentageChange?: number
  }
}`
      },
      {
        id: "separator",
        label: "Separator",
        Component: Separator as unknown as ComponentType<Record<string, unknown>>,
        props: {
          orientation: "horizontal"
        } as Record<string, unknown>,
        sourcePath: "src/components/ui/separator.tsx",
        size: "default",
        propsInterface: `interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}`,
        parentId: "daily-recap-item"
      },
      {
        id: "progress-bar",
        label: "ProgressBar",
        Component: ProgressBar as unknown as ComponentType<Record<string, unknown>>,
        props: {
          progress: 0.72,
          height: 8,
          filledColor: "bg-primary",
          emptyColor: "bg-accent"
        } as Record<string, unknown>,
        sourcePath: "src/components/ui/progressbar.tsx",
        size: "default",
        propsInterface: `interface ProgressBarProps {
  progress: number
  height?: number
  filledColor?: string
  emptyColor?: string
  className?: string
}`,
        parentId: "max-drawdown-card"
      },
      {
        id: "max-drawdown-card",
        label: "Max Drawdown Card",
        Component: MaxDrawdownCard as unknown as ComponentType<Record<string, unknown>>,
        props: {
          className: "bg-background"
        } as Record<string, unknown>,
        sourcePath: "src/features/objectives-tracking/components/MaxDrawdownCard.tsx",
        size: "default",
        propsInterface: `interface MaxDrawdownCardProps {\n  className?: string\n}`
      },
      {
        id: "card",
        label: "Card",
        Component: Card as unknown as ComponentType<Record<string, unknown>>,
        props: {
          className: "bg-background max-w-sm",
          children: "Account Overview"
        } as Record<string, unknown>,
        sourcePath: "src/components/ui/card.tsx",
        size: "default",
        propsInterface: `interface CardProps {\n  className?: string\n  children: React.ReactNode\n}`,
        parentId: "max-drawdown-card"
      },
      {
        id: "tooltip",
        label: "Tooltip",
        Component: (() => (
          <Tooltip defaultOpen>
            <TooltipTrigger asChild>
              <button className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground">
                Hover me
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Maximum drawdown threshold reached
            </TooltipContent>
          </Tooltip>
        )) as unknown as ComponentType<Record<string, unknown>>,
        props: {} as Record<string, unknown>,
        sourcePath: "src/components/ui/tooltip.tsx",
        size: "default",
        propsInterface: `interface TooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}`,
        parentId: "max-drawdown-card"
      }
    ]
  }
]

// ---------------------------------------------------------------------------
// Flatten helper
// ---------------------------------------------------------------------------

export function flattenRegistry(
  items: RegistryItem[],
  result: Record<string, RegistryLeafItem> = {}
): Record<string, RegistryLeafItem> {
  for (const item of items) {
    if (isLeaf(item)) {
      result[item.id] = item
    } else if (isGroup(item)) {
      flattenRegistry(item.children, result)
    }
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
  depth: "shell" | "1-level" | "all" = "shell",
  customInstructions?: string,
  skillPrompt?: string,
  stylingMode: StylingMode = DEFAULT_STYLING_MODE,
  referenceNodesSection?: string
): string {
  const item = resolveRegistryItem(componentId)
  if (!item) return ""

  const componentName = item.label.replace(/\s*\(.*\)/, "")
  const cleanComponentName = registryIdToPascalCase(componentId)
  const depthLabel =
    depth === "shell" ? "Shell only" : depth === "1-level" ? "1 level deep" : "All levels"

  const childrenSection = formatChildrenSection(item.childComponents)
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions)
  const skillSection = formatSkillSection(skillPrompt)

  const iterationNumbers = Array.from({ length: iterationCount }, (_, i) => startNumber + i)

  const iterationSavesBlock = iterationNumbers
    .map(
      (n) => `   - Save as src/app/playground/iterations/${cleanComponentName}.iteration-${n}.tsx`
    )
    .join("\n")

  return iterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    iterationCount: String(iterationCount),
    depthLabel,
    childrenSection,
    propsInterface: item.propsInterface,
    cleanComponentName,
    componentId,
    customInstructionsSection,
    stylingConstraint: getStylingConstraint(stylingMode),
    qualityChecklist: getQualityChecklist(stylingMode),
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
  depth: "shell" | "1-level" | "all" = "shell",
  customInstructions?: string,
  skillPrompt?: string,
  stylingMode: StylingMode = DEFAULT_STYLING_MODE,
  referenceNodesSection?: string
): string {
  const item = resolveRegistryItem(componentId)
  if (!item) return ""

  const componentName = item.label.replace(/\s*\(.*\)/, "")
  const cleanComponentName = registryIdToPascalCase(componentId)
  const depthLabel =
    depth === "shell" ? "Shell only" : depth === "1-level" ? "1 level deep" : "All levels"
  const endNumber = startNumber + iterationCount - 1
  const iterationSourcePath = `src/app/playground/iterations/${sourceIterationFilename}`

  const childrenSection = formatChildrenSection(item.childComponents)
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions)
  const skillSection = formatSkillSection(skillPrompt)

  const iterationNumbers = Array.from({ length: iterationCount }, (_, i) => startNumber + i)

  const iterationSavesBlock = iterationNumbers
    .map(
      (n) => `   - Save as src/app/playground/iterations/${cleanComponentName}.iteration-${n}.tsx`
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
    depthLabel,
    childrenSection,
    propsInterface: item.propsInterface,
    iterationSavesBlock,
    treeParent: sourceIterationFilename,
    customInstructionsSection,
    iterationNumbersList: iterationNumbers.join(", "),
    sourceIterationFilename,
    stylingConstraint: getStylingConstraint(stylingMode),
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
  depth: "shell" | "1-level" | "all" = "all",
  elementSelections: ChatSubmitPayload["elementSelections"],
  customInstructions?: string,
  skillPrompt?: string,
  stylingMode: StylingMode = DEFAULT_STYLING_MODE,
  referenceNodesSection?: string
): string {
  const item = flatRegistry[componentId]
  if (!item) return ""

  const componentName = item.label.replace(/\s*\(.*\)/, "")
  const cleanComponentName = registryIdToPascalCase(componentId)
  const depthLabel =
    depth === "shell" ? "Shell only" : depth === "1-level" ? "1 level deep" : "All levels"

  const childrenSection = formatChildrenSection(item.childComponents)
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions)
  const skillSection = formatSkillSection(skillPrompt)
  const elementSelectionsSection = formatElementSelectionsSection(elementSelections)

  const iterationNumbers = Array.from({ length: iterationCount }, (_, i) => startNumber + i)

  const iterationSavesBlock = iterationNumbers
    .map(
      (n) => `   - Save as src/app/playground/iterations/${cleanComponentName}.iteration-${n}.tsx`
    )
    .join("\n")

  return elementIterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    depthLabel,
    childrenSection,
    propsInterface: item.propsInterface,
    cleanComponentName,
    componentId,
    customInstructionsSection,
    elementSelectionsSection,
    iterationCount: String(iterationCount),
    iterationNumbersList: iterationNumbers.join(", "),
    iterationSavesBlock,
    stylingQualityItem: getStylingQualityItem(stylingMode),
    referenceNodesSection: referenceNodesSection || ""
  })
}

export function generateElementIterationFromIterationPrompt(
  componentId: string,
  sourceIterationFilename: string,
  startNumber: number,
  iterationCount: number,
  depth: "shell" | "1-level" | "all" = "all",
  elementSelections: ChatSubmitPayload["elementSelections"],
  customInstructions?: string,
  skillPrompt?: string,
  stylingMode: StylingMode = DEFAULT_STYLING_MODE,
  referenceNodesSection?: string
): string {
  const item = flatRegistry[componentId]
  if (!item) return ""

  const componentName = item.label.replace(/\s*\(.*\)/, "")
  const cleanComponentName = registryIdToPascalCase(componentId)
  const depthLabel =
    depth === "shell" ? "Shell only" : depth === "1-level" ? "1 level deep" : "All levels"
  const iterationSourcePath = `src/app/playground/iterations/${sourceIterationFilename}`

  const childrenSection = formatChildrenSection(item.childComponents)
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions)
  const skillSection = formatSkillSection(skillPrompt)
  const elementSelectionsSection = formatElementSelectionsSection(elementSelections)

  const iterationNumbers = Array.from({ length: iterationCount }, (_, i) => startNumber + i)

  const iterationSavesBlock = iterationNumbers
    .map(
      (n) => `   - Save as src/app/playground/iterations/${cleanComponentName}.iteration-${n}.tsx`
    )
    .join("\n")

  return elementIterationFromIterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    iterationSourcePath,
    depthLabel,
    childrenSection,
    propsInterface: item.propsInterface,
    cleanComponentName,
    componentId,
    customInstructionsSection,
    elementSelectionsSection,
    iterationCount: String(iterationCount),
    iterationNumbersList: iterationNumbers.join(", "),
    iterationSavesBlock,
    treeParent: sourceIterationFilename,
    sourceIterationFilename,
    stylingQualityItem: getStylingQualityItem(stylingMode),
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
  const iterationPath = `src/app/playground/iterations/${iterationFilename}`

  return adoptIterationPrompt({ originalPath, iterationPath })
}
