/**
 * DOM/pill engine for the InlineReference contenteditable.
 *
 * Pure DOM functions: operate on HTMLDivElement / Node and return/mutate
 * DOM nodes or segment data. No React imports — testable with jsdom.
 */

import { cn } from "../../lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TextSegment = {
  type: "text"
  value: string
}

export type ReferenceSegment = {
  type: "reference"
  trigger: string
  value: string
  label: string
  data?: Record<string, unknown>
}

export type Segment = TextSegment | ReferenceSegment

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ZERO_WIDTH_SPACE = "​"
export const PILL_ATTR = "data-inline-ref"
export const PILL_TRIGGER_ATTR = "data-inline-ref-trigger"
export const PILL_VALUE_ATTR = "data-inline-ref-value"
export const PILL_LABEL_ATTR = "data-inline-ref-label"
export const PILL_DATA_ATTR = "data-inline-ref-data"
export const PILL_IMPECCABLE_CMD_ATTR = "data-impeccable-command"
export const PILL_IMPECCABLE_CLEARED_ATTR = "data-command-cleared"

// ---------------------------------------------------------------------------
// DOM engine functions
// ---------------------------------------------------------------------------

/** Read segments from the contenteditable DOM. */
export function readSegmentsFromDOM(el: HTMLDivElement): Segment[] {
  const segments: Segment[] = []
  const nodes = el.childNodes

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ""
      if (text && text !== ZERO_WIDTH_SPACE) {
        const cleaned = text.replace(new RegExp(ZERO_WIDTH_SPACE, "g"), "")
        if (cleaned) {
          segments.push({ type: "text", value: cleaned })
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      if (element.hasAttribute(PILL_ATTR)) {
        const trigger = element.getAttribute(PILL_TRIGGER_ATTR) ?? ""
        const value = element.getAttribute(PILL_VALUE_ATTR) ?? ""
        const label = element.getAttribute(PILL_LABEL_ATTR) ?? ""
        const dataStr = element.getAttribute(PILL_DATA_ATTR)
        let data: Record<string, unknown> | undefined
        if (dataStr) {
          try {
            data = JSON.parse(dataStr)
          } catch {
            // ignore
          }
        }
        segments.push({ type: "reference", trigger, value, label, data })
      } else {
        const text = element.textContent ?? ""
        if (text && text !== ZERO_WIDTH_SPACE) {
          segments.push({ type: "text", value: text })
        }
      }
    }
  }

  return segments
}

/** Create a pill DOM element for a reference segment. */
export function createPillElement(
  segment: ReferenceSegment,
  onDelete: () => void
): HTMLSpanElement {
  const isSkill = segment.trigger === "/"

  const pill = document.createElement("span")
  pill.setAttribute(PILL_ATTR, "")
  pill.setAttribute(PILL_TRIGGER_ATTR, segment.trigger)
  pill.setAttribute(PILL_VALUE_ATTR, segment.value)
  pill.setAttribute(PILL_LABEL_ATTR, segment.label)
  if (segment.data) {
    pill.setAttribute(PILL_DATA_ATTR, JSON.stringify(segment.data))
  }

  const impeccableCommand = (segment.data as Record<string, unknown> | undefined)
    ?.impeccableCommand as string | undefined
  if (impeccableCommand) {
    pill.setAttribute(PILL_IMPECCABLE_CMD_ATTR, impeccableCommand)
  }

  pill.contentEditable = "false"
  pill.className = cn(
    "inline-reference-pill inline-flex items-center select-all whitespace-nowrap",
    isSkill
      ? "inline-reference-pill--skill"
      : "gap-0.5 rounded-sm bg-pg-accent/50 border border-pg-accent px-1.5 py-0.5 align-baseline mx-0.5"
  )

  const labelSpan = document.createElement("span")
  labelSpan.textContent = isSkill ? `/${segment.label}` : segment.label
  labelSpan.className = cn(
    "pointer-events-none",
    isSkill ? "inline-reference-pill__label" : undefined
  )
  pill.appendChild(labelSpan)

  if (!isSkill) {
    const deleteBtn = document.createElement("span")
    deleteBtn.role = "button"
    deleteBtn.tabIndex = -1
    deleteBtn.ariaLabel = `Remove ${segment.label}`
    deleteBtn.className = "inline-flex items-center justify-center cursor-pointer transition-colors size-3.5 rounded-sm opacity-50 hover:opacity-100 hover:bg-pg-accent ml-0.5"
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
    deleteBtn.addEventListener("mousedown", (e) => {
      e.preventDefault()
      e.stopPropagation()
      onDelete()
    })
    pill.appendChild(deleteBtn)
  }

  return pill
}

export function updateImpeccablePillElement(pillEl: HTMLElement, command: string, inputEl: HTMLDivElement) {
  pillEl.setAttribute(PILL_IMPECCABLE_CMD_ATTR, command)
  pillEl.removeAttribute(PILL_IMPECCABLE_CLEARED_ATTR)
  pillEl.removeAttribute("data-pending-delete")
  pillEl.setAttribute(PILL_LABEL_ATTR, `impeccable ${command}`)

  const dataStr = pillEl.getAttribute(PILL_DATA_ATTR)
  const data: Record<string, unknown> = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : {}
  data.impeccableCommand = command
  pillEl.setAttribute(PILL_DATA_ATTR, JSON.stringify(data))

  const labelEl = pillEl.querySelector(".inline-reference-pill__label")
  if (labelEl) labelEl.textContent = `/impeccable ${command}`

  return readSegmentsFromDOM(inputEl)
}

/** Detect if there's an active trigger behind the cursor. */
export type TriggerState = {
  trigger: string
  query: string
  rect: DOMRect | null
} | null

export function detectTrigger(
  el: HTMLDivElement,
  triggers: Set<string>
): TriggerState {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!range.collapsed) return null

  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return null
  const text = node.textContent ?? ""
  const cursorOffset = range.startOffset
  const textBefore = text.slice(0, cursorOffset)

  for (const trigger of triggers) {
    const lastTriggerIdx = textBefore.lastIndexOf(trigger)
    if (lastTriggerIdx === -1) continue

    if (
      lastTriggerIdx > 0 &&
      !/\s/.test(textBefore[lastTriggerIdx - 1])
    ) {
      continue
    }

    const query = textBefore.slice(lastTriggerIdx + trigger.length)
    if (/\s/.test(query)) continue

    const triggerRange = document.createRange()
    triggerRange.setStart(node, lastTriggerIdx)
    triggerRange.setEnd(node, lastTriggerIdx + trigger.length)
    const rect = triggerRange.getBoundingClientRect()

    return { trigger, query, rect }
  }

  return null
}

export function placeCursorAfter(node: Node) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.setStartAfter(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}
