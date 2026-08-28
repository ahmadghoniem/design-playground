/**
 * DOM engine for the MentionInput contenteditable.
 *
 * Pure DOM functions: operate on HTMLDivElement / Node and return/mutate
 * DOM nodes or segment data. No React imports — testable with jsdom.
 */

export type Segment = {
  type: "text"
  value: string
}

export const ZERO_WIDTH_SPACE = "​"

export function readSegmentsFromDOM(el: HTMLDivElement): Segment[] {
  const segments: Segment[] = []
  const nodes = el.childNodes

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const raw =
      node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE
        ? node.textContent ?? ""
        : ""
    if (!raw || raw === ZERO_WIDTH_SPACE) continue
    const cleaned = raw.replace(new RegExp(ZERO_WIDTH_SPACE, "g"), "")
    if (cleaned) segments.push({ type: "text", value: cleaned })
  }

  return segments
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
