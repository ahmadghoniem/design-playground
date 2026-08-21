/**
 * MentionInput — a contenteditable field where a trigger character (`/` today)
 * opens a picker. Selecting a skill inserts the literal text `/<name> ` at the
 * cursor (replacing the typed trigger + query).
 *
 * Same shape as the rest of shared/ui (see dialog.tsx): every part of the
 * compound component lives here, exported together at the bottom, each carrying
 * a `data-slot`. The DOM engine is the one piece that lives apart —
 * `mention-input-dom.ts` imports no React and is testable under jsdom.
 *
 * The value is `Segment[]` (text only), re-read from the DOM on every keystroke
 * by `readSegmentsFromDOM` — the DOM is the source of truth here, because the
 * user edits it directly.
 */

import * as React from "react"

import { cn } from "@pg/shared/lib/utils"
import {
  readSegmentsFromDOM,
  detectTrigger,
  ZERO_WIDTH_SPACE,
  type Segment,
  type TriggerState,
} from "@pg/shared/ui/mention-input-dom"

export type { Segment } from "@pg/shared/ui/mention-input-dom"

// ---------------------------------------------------------------------------
// Types + context
// ---------------------------------------------------------------------------

export type MentionItemData = {
  id: string
  label: string
  [key: string]: unknown
}

type MentionInputContextValue = {
  segments: Segment[]
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>
  triggerState: TriggerState
  setTriggerState: React.Dispatch<React.SetStateAction<TriggerState>>
  activeIndex: number
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>
  inputRef: React.RefObject<HTMLDivElement | null>
  selectItem: (trigger: string, item: MentionItemData) => void
  registeredTriggers: Set<string>
  registerTrigger: (trigger: string) => void
  unregisterTrigger: (trigger: string) => void
  /**
   * Currently-filtered items per trigger. Written by MentionInputContent (which
   * owns the filtering) and read by MentionInputField's keydown handler (which
   * owns arrow/enter navigation) — the two are siblings, so this is their only
   * shared channel.
   *
   * A plain mutable Map rather than state, like `registeredTriggers` above: it
   * changes on every keystroke and nothing renders from it, so putting it in
   * state would re-render the whole subtree per character for no visible effect.
   */
  itemsByTrigger: Map<string, MentionItemData[]>
  listId: string
}

const MentionInputContext =
  React.createContext<MentionInputContextValue | null>(null)

function useMentionInputContext() {
  const context = React.useContext(MentionInputContext)
  if (!context) {
    throw new Error(
      "MentionInput components must be used within <MentionInput>"
    )
  }
  return context
}

// ---------------------------------------------------------------------------
// MentionInput (root)
// ---------------------------------------------------------------------------

type MentionInputProps = {
  children: React.ReactNode
  value?: Segment[]
  onValueChange?: (segments: Segment[]) => void
  className?: string
}

function MentionInput({
  children,
  value,
  onValueChange,
  className,
  ...props
}: MentionInputProps & Omit<React.ComponentProps<"div">, "value">) {
  const [internalSegments, setInternalSegments] = React.useState<Segment[]>(
    value ?? []
  )
  const [triggerState, setTriggerState] = React.useState<TriggerState>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLDivElement | null>(null)
  const [registeredTriggers] = React.useState(() => new Set<string>())
  const [itemsByTrigger] = React.useState(
    () => new Map<string, MentionItemData[]>(),
  )
  const listId = React.useId()

  const isControlled = value !== undefined
  const segments = isControlled ? value : internalSegments

  const setSegments: React.Dispatch<React.SetStateAction<Segment[]>> =
    React.useCallback(
      (action) => {
        const next =
          typeof action === "function"
            ? action(isControlled ? value! : internalSegments)
            : action
        if (!isControlled) {
          setInternalSegments(next)
        }
        onValueChange?.(next)
      },
      [isControlled, value, internalSegments, onValueChange]
    )

  const selectItem = React.useCallback(
    (trigger: string, item: MentionItemData) => {
      const el = inputRef.current
      if (!el || !triggerState) return

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      const range = selection.getRangeAt(0)
      const node = range.startContainer
      if (node.nodeType !== Node.TEXT_NODE) return

      const text = node.textContent ?? ""
      const cursorOffset = range.startOffset
      const textBefore = text.slice(0, cursorOffset)
      const triggerIdx = textBefore.lastIndexOf(trigger)
      if (triggerIdx === -1) return

      const beforeText = text.slice(0, triggerIdx)
      const afterText = text.slice(cursorOffset)
      const token = `/${item.id} `
      const nextText = beforeText + token + afterText

      const parent = node.parentNode!
      const textNode = document.createTextNode(nextText)
      parent.replaceChild(textNode, node)

      const cursorAt = Math.min(beforeText.length + token.length, nextText.length)
      const nextRange = document.createRange()
      nextRange.setStart(textNode, cursorAt)
      nextRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(nextRange)

      setTriggerState(null)
      setActiveIndex(0)
      setSegments(readSegmentsFromDOM(el))
    },
    [triggerState, setSegments]
  )

  const registerTrigger = React.useCallback(
    (trigger: string) => {
      registeredTriggers.add(trigger)
    },
    [registeredTriggers]
  )

  const unregisterTrigger = React.useCallback(
    (trigger: string) => {
      registeredTriggers.delete(trigger)
    },
    [registeredTriggers]
  )

  const contextValue = React.useMemo<MentionInputContextValue>(
    () => ({
      segments,
      setSegments,
      triggerState,
      setTriggerState,
      activeIndex,
      setActiveIndex,
      inputRef,
      selectItem,
      registeredTriggers,
      registerTrigger,
      unregisterTrigger,
      itemsByTrigger,
      listId,
    }),
    [
      segments,
      setSegments,
      triggerState,
      activeIndex,
      selectItem,
      registeredTriggers,
      registerTrigger,
      unregisterTrigger,
      itemsByTrigger,
      listId,
    ]
  )

  return (
    <MentionInputContext.Provider value={contextValue}>
      <div
        data-slot="mention-input"
        className={cn("relative", className)}
        {...props}
      >
        {children}
      </div>
    </MentionInputContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// MentionInputField — the contenteditable itself
// ---------------------------------------------------------------------------

type MentionInputFieldProps = {
  placeholder?: string
  className?: string
} & Omit<React.ComponentProps<"div">, "contentEditable" | "role">

function MentionInputField({
  placeholder,
  className,
  ...props
}: MentionInputFieldProps) {
  const {
    setSegments,
    triggerState,
    setTriggerState,
    activeIndex,
    setActiveIndex,
    inputRef,
    selectItem,
    registeredTriggers,
    itemsByTrigger,
    listId,
  } = useMentionInputContext()

  const isComposing = React.useRef(false)
  const [isEmpty, setIsEmpty] = React.useState(true)

  const checkEmpty = React.useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const text = el.textContent ?? ""
    const empty = text.replace(new RegExp(ZERO_WIDTH_SPACE, "g"), "").trim() === ""
    setIsEmpty(empty)

    // After clearing all text, normalize the DOM so the caret sits at the
    // start (aligned with the ::before placeholder), not after stale nodes.
    if (empty && el.childNodes.length > 0) {
      el.textContent = ""
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        range.setStart(el, 0)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }, [inputRef])

  const handleInput = React.useCallback(() => {
    if (isComposing.current) return
    const el = inputRef.current
    if (!el) return

    checkEmpty()

    const state = detectTrigger(el, registeredTriggers)
    setTriggerState(state)
    if (state) {
      setActiveIndex(0)
    }

    setSegments(readSegmentsFromDOM(el))
  }, [inputRef, registeredTriggers, setTriggerState, setActiveIndex, setSegments, checkEmpty])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!triggerState) return

      const items = itemsByTrigger.get(triggerState.trigger) ?? []
      const count = items.length

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % Math.max(count, 1))
        return
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((prev) =>
          prev <= 0 ? Math.max(count - 1, 0) : prev - 1
        )
        return
      }

      if (e.key === "Enter" || e.key === "Tab") {
        if (count > 0) {
          e.preventDefault()
          const item = items[activeIndex]
          if (item) {
            selectItem(triggerState.trigger, item)
          }
        }
        return
      }

      if (e.key === "Escape") {
        e.preventDefault()
        setTriggerState(null)
        return
      }
    },
    [
      triggerState,
      activeIndex,
      selectItem,
      setActiveIndex,
      setTriggerState,
      itemsByTrigger,
    ]
  )

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData("text/plain")
      document.execCommand("insertText", false, text)
    },
    []
  )

  const handleCompositionStart = React.useCallback(() => {
    isComposing.current = true
  }, [])

  const handleCompositionEnd = React.useCallback(() => {
    isComposing.current = false
    handleInput()
  }, [handleInput])

  const handleBlur = React.useCallback(() => {
    setTriggerState(null)
  }, [setTriggerState])

  React.useEffect(() => {
    checkEmpty()
  }, [checkEmpty])

  const isOpen = triggerState !== null

  return (
    <div
      ref={inputRef}
      data-slot="mention-input-field"
      contentEditable
      suppressContentEditableWarning
      role="combobox"
      aria-expanded={isOpen}
      aria-autocomplete="list"
      aria-controls={isOpen ? listId : undefined}
      aria-haspopup="listbox"
      className={cn(
        "border-pg-input placeholder:text-pg-muted-foreground focus-visible:border-pg-ring focus-visible:ring-pg-ring/50 aria-invalid:ring-pg-destructive/20 aria-invalid:border-pg-destructive w-full rounded-md border bg-transparent px-3 py-2 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        "whitespace-pre-wrap wrap-break-word",
        "mention-input-field",
        className
      )}
      data-placeholder={placeholder}
      data-empty={isEmpty || undefined}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// MentionInputContent — the dropdown
// ---------------------------------------------------------------------------

type MentionInputContentContextValue = {
  filteredItems: MentionItemData[]
  trigger: string
}

const MentionInputContentContext =
  React.createContext<MentionInputContentContextValue | null>(null)

function useMentionInputContentContext() {
  const context = React.useContext(MentionInputContentContext)
  if (!context) {
    throw new Error(
      "MentionInputList/Item must be used within <MentionInputContent>"
    )
  }
  return context
}

type MentionInputContentProps = {
  trigger: string
  items: MentionItemData[]
  filterFn?: (item: MentionItemData, query: string) => boolean
  children: React.ReactNode
  className?: string
  /** Open the dropdown above the trigger ('top') instead of below ('bottom', default).
   *  Used by bottom-docked consumers (e.g. the bottom chat bar) so the `/` picker
   *  opens upward into available space. */
  placement?: "top" | "bottom"
}

function MentionInputContent({
  trigger,
  items,
  filterFn,
  children,
  className,
  placement = "bottom",
}: MentionInputContentProps) {
  const {
    triggerState,
    registerTrigger,
    unregisterTrigger,
    inputRef,
    itemsByTrigger,
    listId,
    activeIndex,
    setActiveIndex,
  } = useMentionInputContext()

  React.useEffect(() => {
    registerTrigger(trigger)
    return () => unregisterTrigger(trigger)
  }, [trigger, registerTrigger, unregisterTrigger])

  const isActive = triggerState?.trigger === trigger
  const query = triggerState?.trigger === trigger ? (triggerState?.query ?? "") : ""

  const defaultFilter = React.useCallback(
    (item: MentionItemData, q: string) =>
      item.label.toLowerCase().includes(q.toLowerCase()),
    []
  )
  const filter = filterFn ?? defaultFilter
  const filteredItems = React.useMemo(
    () => (query ? items.filter((item) => filter(item, query)) : items),
    [items, query, filter]
  )

  // Publish the filtered list so MentionInputField's keydown handler can
  // navigate it. Cleanup runs on unmount and before each re-publish, so a
  // closed dropdown never leaves a stale list behind for Enter to select from.
  React.useEffect(() => {
    itemsByTrigger.set(trigger, filteredItems)
    return () => {
      itemsByTrigger.delete(trigger)
    }
  }, [trigger, filteredItems, itemsByTrigger])

  const [positionStyle, setPositionStyle] =
    React.useState<React.CSSProperties | null>(null)

  React.useEffect(() => {
    if (!isActive) {
      setPositionStyle(null)
      return
    }

    if (!triggerState?.rect) {
      setPositionStyle(null)
      return
    }

    const el = inputRef.current
    if (!el) {
      setPositionStyle(null)
      return
    }

    const rect = triggerState.rect
    const containerRect = el.getBoundingClientRect()
    const margin = 8
    const estimatedWidth = 280
    let left = rect.left - containerRect.left
    const containerWidth = containerRect.width

    if (left + estimatedWidth + margin > containerWidth) {
      left = Math.max(margin, containerWidth - estimatedWidth - margin)
    } else {
      left = Math.max(margin, left)
    }

    const next: React.CSSProperties = {
      position: "absolute",
      left,
      maxWidth: estimatedWidth + 40,
      zIndex: 50,
    }
    // Open upward (bottom-docked consumers) or downward (default). For the
    // upward case we anchor the dropdown's bottom edge to the top of the input
    // via calc(100% + …) so it sits above the field regardless of which
    // positioned ancestor turns out to be the offset parent — a fixed-pixel
    // bottom can land low when an ancestor is taller than the input.
    if (placement === "top") {
      next.bottom = "calc(100% + 4px)"
      // Don't let the upward dropdown run off the top of the viewport: cap its
      // height to the space above the trigger and scroll internally.
      next.maxHeight = Math.min(rect.top - margin, 360)
      next.overflowY = "auto"
    } else {
      next.top = rect.bottom - containerRect.top + 4
    }
    setPositionStyle(next)
  }, [isActive, triggerState, inputRef, placement])

  if (!isActive) return null

  return (
    <div
      data-slot="mention-input-content"
      role="listbox"
      id={listId}
      aria-label={`Suggestions for ${trigger}`}
      style={positionStyle ?? undefined}
      className={cn(
        "bg-pg-popover text-pg-popover-foreground font-pg-sans z-50 min-w-[200px] overflow-hidden rounded-md border border-pg-border shadow-md",
        "animate-in fade-in-0 zoom-in-95",
        placement === "top" ? "slide-in-from-bottom-2" : "slide-in-from-top-2",
        className
      )}
    >
      <MentionInputContentContext.Provider
        value={{ filteredItems, trigger }}
      >
        {children}
      </MentionInputContentContext.Provider>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MentionInputList / Item / Empty / Group
// ---------------------------------------------------------------------------

type MentionInputListProps = {
  children: (item: MentionItemData) => React.ReactNode
  className?: string
}

function MentionInputList({
  children,
  className,
}: MentionInputListProps) {
  const { filteredItems } = useMentionInputContentContext()

  return (
    <div
      data-slot="mention-input-list"
      className={cn("max-h-[300px] overflow-y-auto p-1", className)}
    >
      {filteredItems.map((item) => children(item))}
    </div>
  )
}

type MentionInputItemProps = {
  value: MentionItemData
  children: React.ReactNode
  className?: string
  onSelect?: (item: MentionItemData) => void
} & Omit<React.ComponentProps<"div">, "value">

function MentionInputItem({
  value,
  children,
  className,
  onSelect,
  ...props
}: MentionInputItemProps) {
  const { activeIndex, setActiveIndex, selectItem } =
    useMentionInputContext()
  const { filteredItems, trigger } = useMentionInputContentContext()

  const index = filteredItems.indexOf(value)
  const isActive = index === activeIndex
  const itemId = `mention-item-${value.id}`

  const description =
    typeof (value as MentionItemData & { description?: unknown })
      .description === "string"
      ? (value as MentionItemData & { description?: string })
          .description
      : undefined

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (onSelect) {
        onSelect(value)
      } else {
        selectItem(trigger, value)
      }
    },
    [trigger, value, selectItem, onSelect]
  )

  const handleMouseEnter = React.useCallback(() => {
    setActiveIndex(index)
  }, [index, setActiveIndex])

  return (
    <div
      data-slot="mention-input-item"
      id={itemId}
      role="option"
      aria-selected={isActive}
      data-selected={isActive}
      title={description}
      className={cn(
        "data-[selected=true]:bg-pg-accent data-[selected=true]:text-pg-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </div>
  )
}

type MentionInputEmptyProps = {
  children: React.ReactNode
  className?: string
}

function MentionInputEmpty({
  children,
  className,
}: MentionInputEmptyProps) {
  const { filteredItems } = useMentionInputContentContext()

  if (filteredItems.length > 0) return null

  return (
    <div
      data-slot="mention-input-empty"
      className={cn("py-6 text-center text-sm text-pg-muted-foreground", className)}
    >
      {children}
    </div>
  )
}

type MentionInputGroupProps = {
  heading?: string
  children: React.ReactNode
  className?: string
}

function MentionInputGroup({
  heading,
  children,
  className,
}: MentionInputGroupProps) {
  return (
    <div
      data-slot="mention-input-group"
      className={cn("overflow-hidden p-1", className)}
    >
      {heading && (
        <div className="text-pg-muted-foreground px-2 py-1.5 text-xs font-medium">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
}

export {
  MentionInput,
  MentionInputField,
  MentionInputContent,
  MentionInputList,
  MentionInputItem,
  MentionInputEmpty,
  MentionInputGroup,
}
