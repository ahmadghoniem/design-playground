"use client"

import * as React from "react"
import type { Segment, TriggerState } from "./dom-engine"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InlineReferenceItemData = {
  id: string
  label: string
  [key: string]: unknown
}

/**
 * Callback fired before an item is selected. Return value controls what happens:
 * - `{ preventDefault: true }` — cancels the normal pill insertion
 * - `{ overrideItem: item }` — inserts `item` instead of the originally-selected one
 * - `undefined` / `{}` — normal insertion
 */
export type OnSelectItemResult = {
  preventDefault?: boolean
  overrideItem?: InlineReferenceItemData
} | void

export type InlineReferenceContextValue = {
  segments: Segment[]
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>
  triggerState: TriggerState
  setTriggerState: React.Dispatch<React.SetStateAction<TriggerState>>
  activeIndex: number
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>
  inputRef: React.RefObject<HTMLDivElement | null>
  selectItem: (trigger: string, item: InlineReferenceItemData) => void
  registeredTriggers: Set<string>
  registerTrigger: (trigger: string) => void
  unregisterTrigger: (trigger: string) => void
  listId: string
  onImpeccableCommandCleared?: (pillEl: HTMLElement) => void
  onSkillPillPendingDelete?: (pillEl: HTMLElement) => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const InlineReferenceContext =
  React.createContext<InlineReferenceContextValue | null>(null)

export function useInlineReferenceContext() {
  const context = React.useContext(InlineReferenceContext)
  if (!context) {
    throw new Error(
      "InlineReference components must be used within <InlineReference>"
    )
  }
  return context
}
