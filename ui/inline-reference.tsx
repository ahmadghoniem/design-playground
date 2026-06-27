"use client"

import * as React from "react"

import { cn } from "../lib/utils"
import {
  readSegmentsFromDOM,
  createPillElement,
  updateImpeccablePillElement,
  detectTrigger,
  placeCursorAfter,
  ZERO_WIDTH_SPACE,
  PILL_ATTR,
  PILL_TRIGGER_ATTR,
  PILL_LABEL_ATTR,
  PILL_DATA_ATTR,
  PILL_IMPECCABLE_CMD_ATTR,
  PILL_IMPECCABLE_CLEARED_ATTR,
  type Segment,
  type ReferenceSegment,
  type TriggerState,
} from "./inline-reference/dom-engine"
import {
  InlineReferenceContext,
  useInlineReferenceContext,
  type InlineReferenceContextValue,
  type InlineReferenceItemData,
  type OnSelectItemResult,
} from "./inline-reference/context"

// Re-export public types consumed by external modules (e.g. DockedChatBar)
export type { OnSelectItemResult } from "./inline-reference/context"
export type {
  Segment,
  TextSegment,
  ReferenceSegment,
  InlineReferenceItemData,
} from "./inline-reference/dom-engine"

// ---------------------------------------------------------------------------
// InlineReference (Root)
// ---------------------------------------------------------------------------

export type InlineReferenceHandle = {
  updateImpeccablePill(pillEl: HTMLElement, command: string): void
}

type InlineReferenceProps = {
  children: React.ReactNode
  value?: Segment[]
  onValueChange?: (segments: Segment[]) => void
  onSelectItem?: (trigger: string, item: InlineReferenceItemData) => OnSelectItemResult
  onImpeccableCommandCleared?: (pillEl: HTMLElement) => void
  onSkillPillPendingDelete?: (pillEl: HTMLElement) => void
  className?: string
}

const InlineReference = React.forwardRef<
  InlineReferenceHandle,
  InlineReferenceProps & Omit<React.ComponentProps<"div">, "value">
>(function InlineReference({
  children,
  value,
  onValueChange,
  onSelectItem,
  onImpeccableCommandCleared,
  onSkillPillPendingDelete,
  className,
  ...props
}, ref) {
  const [internalSegments, setInternalSegments] = React.useState<Segment[]>(
    value ?? []
  )
  const [triggerState, setTriggerState] = React.useState<TriggerState>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLDivElement | null>(null)
  const [registeredTriggers] = React.useState(() => new Set<string>())
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
    (trigger: string, item: InlineReferenceItemData) => {
      const result = onSelectItem?.(trigger, item)
      if (result?.preventDefault) return
      const effectiveItem = result?.overrideItem ?? item

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

      const segment: ReferenceSegment = {
        type: "reference",
        trigger,
        value: effectiveItem.id,
        label: effectiveItem.label,
        data: { ...effectiveItem },
      }

      const parent = node.parentNode!
      const frag = document.createDocumentFragment()

      if (beforeText) {
        frag.appendChild(document.createTextNode(beforeText))
      }

      const deletePill = () => {
        pill.remove()
        setSegments(readSegmentsFromDOM(el))
        el.focus()
      }
      const pill = createPillElement(segment, deletePill)
      frag.appendChild(pill)

      const afterNode = document.createTextNode(
        afterText ? afterText : ZERO_WIDTH_SPACE
      )
      frag.appendChild(afterNode)

      parent.replaceChild(frag, node)
      placeCursorAfter(pill)

      setTriggerState(null)
      setActiveIndex(0)
      setSegments(readSegmentsFromDOM(el))
    },
    [triggerState, setSegments, onSelectItem]
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

  const updateImpeccablePill = React.useCallback(
    (pillEl: HTMLElement, command: string) => {
      const el = inputRef.current
      if (!el) return
      const next = updateImpeccablePillElement(pillEl, command, el)
      setSegments(next)
    },
    [setSegments]
  )

  const contextValue = React.useMemo<InlineReferenceContextValue>(
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
      listId,
      onImpeccableCommandCleared,
      onSkillPillPendingDelete,
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
      listId,
      onImpeccableCommandCleared,
      onSkillPillPendingDelete,
    ]
  )

  React.useImperativeHandle(ref, () => ({
    updateImpeccablePill,
  }), [updateImpeccablePill])

  return (
    <InlineReferenceContext.Provider value={contextValue}>
      <div
        data-slot="inline-reference"
        className={cn("relative", className)}
        {...props}
      >
        {children}
      </div>
    </InlineReferenceContext.Provider>
  )
})

// ---------------------------------------------------------------------------
// InlineReferenceInput
// ---------------------------------------------------------------------------

type InlineReferenceInputProps = {
  placeholder?: string
  className?: string
} & Omit<React.ComponentProps<"div">, "contentEditable" | "role">

function InlineReferenceInput({
  placeholder,
  className,
  ...props
}: InlineReferenceInputProps) {
  const {
    setSegments,
    triggerState,
    setTriggerState,
    activeIndex,
    setActiveIndex,
    inputRef,
    selectItem,
    registeredTriggers,
    listId,
    onImpeccableCommandCleared,
    onSkillPillPendingDelete,
  } = useInlineReferenceContext()

  const isComposing = React.useRef(false)
  const [isEmpty, setIsEmpty] = React.useState(true)
  const pendingDeletePillRef = React.useRef<HTMLElement | null>(null)

  const clearPendingDelete = React.useCallback(() => {
    const el = pendingDeletePillRef.current
    if (el) {
      el.removeAttribute("data-pending-delete")
      el.removeAttribute(PILL_IMPECCABLE_CLEARED_ATTR)
      pendingDeletePillRef.current = null
    }
  }, [])

  const itemsMapRef = React.useRef<
    Map<string, InlineReferenceItemData[]>
  >(new Map())

  React.useEffect(() => {
    const el = inputRef.current
    if (el) {
      ;(el as HTMLDivElement & { __itemsMapRef?: typeof itemsMapRef }).__itemsMapRef = itemsMapRef
    }
  }, [inputRef])

  const checkEmpty = React.useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const text = el.textContent ?? ""
    const hasOnlyZWS = text.replace(new RegExp(ZERO_WIDTH_SPACE, "g"), "").trim() === ""
    const hasPills = el.querySelector(`[${PILL_ATTR}]`) !== null
    const empty = hasOnlyZWS && !hasPills
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

    clearPendingDelete()
    checkEmpty()

    const state = detectTrigger(el, registeredTriggers)
    setTriggerState(state)
    if (state) {
      setActiveIndex(0)
    }

    setSegments(readSegmentsFromDOM(el))
  }, [inputRef, registeredTriggers, setTriggerState, setActiveIndex, setSegments, checkEmpty, clearPendingDelete])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = inputRef.current
      if (!el) return

      if (triggerState) {
        const items = itemsMapRef.current.get(triggerState.trigger) ?? []
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
      }

      if (e.key === "Backspace") {
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return
        const range = selection.getRangeAt(0)
        if (!range.collapsed) return

        const node = range.startContainer
        const cursorOffset = range.startOffset

        const getPillBefore = (): HTMLElement | null => {
          if (node.nodeType === Node.TEXT_NODE && cursorOffset <= 1) {
            const prev = node.previousSibling
            if (prev && (prev as HTMLElement).hasAttribute?.(PILL_ATTR)) {
              return prev as HTMLElement
            }
          }
          if (node === el && cursorOffset > 0) {
            const prev = el.childNodes[cursorOffset - 1]
            if (prev && (prev as HTMLElement).hasAttribute?.(PILL_ATTR)) {
              return prev as HTMLElement
            }
          }
          return null
        }

        const pill = getPillBefore()
        if (pill) {
          e.preventDefault()
          const isSkillPill = pill.getAttribute(PILL_TRIGGER_ATTR) === "/"
          const hasImpeccableCmd = pill.hasAttribute(PILL_IMPECCABLE_CMD_ATTR)
          const isCmdCleared = pill.hasAttribute(PILL_IMPECCABLE_CLEARED_ATTR)
          const isPendingDelete = pill.hasAttribute("data-pending-delete")

          if (isPendingDelete) {
            // Final stage — delete (check before impeccable stages so a
            // highlighted pill always deletes on the next backspace)
            clearPendingDelete()
            pill.remove()
            setSegments(readSegmentsFromDOM(el))
            checkEmpty()
          } else if (hasImpeccableCmd && !isCmdCleared) {
            // Stage 1 (impeccable): clear the command, show yellow + picker
            clearPendingDelete()
            pill.setAttribute(PILL_IMPECCABLE_CLEARED_ATTR, "")
            const labelEl = pill.querySelector(".inline-reference-pill__label")
            if (labelEl) labelEl.textContent = "/impeccable"
            pill.setAttribute(PILL_LABEL_ATTR, "impeccable")
            const dataStr = pill.getAttribute(PILL_DATA_ATTR)
            if (dataStr) {
              try {
                const data = JSON.parse(dataStr) as Record<string, unknown>
                delete data.impeccableCommand
                pill.setAttribute(PILL_DATA_ATTR, JSON.stringify(data))
              } catch { /* ignore */ }
            }
            pendingDeletePillRef.current = pill
            setSegments(readSegmentsFromDOM(el))
            onImpeccableCommandCleared?.(pill)
          } else if (isSkillPill) {
            // Stage 2: highlight for delete (impeccable yellow or any skill)
            clearPendingDelete()
            pill.setAttribute("data-pending-delete", "")
            pendingDeletePillRef.current = pill
            onSkillPillPendingDelete?.(pill)
          }
          return
        }

        clearPendingDelete()
      } else if (e.key !== "Shift" && e.key !== "Meta" && e.key !== "Alt" && e.key !== "Control") {
        clearPendingDelete()
      }
    },
    [
      inputRef,
      triggerState,
      activeIndex,
      selectItem,
      setActiveIndex,
      setTriggerState,
      setSegments,
      checkEmpty,
      clearPendingDelete,
      onImpeccableCommandCleared,
      onSkillPillPendingDelete,
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
      data-slot="inline-reference-input"
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
        "inline-reference-input",
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
// InlineReferenceContent
// ---------------------------------------------------------------------------

type InlineReferenceContentProps = {
  trigger: string
  items: InlineReferenceItemData[]
  filterFn?: (item: InlineReferenceItemData, query: string) => boolean
  children: React.ReactNode
  className?: string
  /** When true, show the dropdown even without an active trigger (e.g. impeccable demote). */
  forceOpen?: boolean
  forcePosition?: React.CSSProperties | null
  /** Open the dropdown above the trigger ('top') instead of below ('bottom', default).
   *  Used by bottom-docked consumers (e.g. the bottom chat bar) so the `/` picker
   *  opens upward into available space. */
  placement?: "top" | "bottom"
}

function InlineReferenceContent({
  trigger,
  items,
  filterFn,
  children,
  className,
  forceOpen = false,
  forcePosition = null,
  placement = "bottom",
}: InlineReferenceContentProps) {
  const {
    triggerState,
    registerTrigger,
    unregisterTrigger,
    inputRef,
    listId,
    activeIndex,
    setActiveIndex,
  } = useInlineReferenceContext()

  React.useEffect(() => {
    registerTrigger(trigger)
    return () => unregisterTrigger(trigger)
  }, [trigger, registerTrigger, unregisterTrigger])

  const isActive = forceOpen || triggerState?.trigger === trigger
  const query = triggerState?.trigger === trigger ? (triggerState?.query ?? "") : ""

  const defaultFilter = React.useCallback(
    (item: InlineReferenceItemData, q: string) =>
      item.label.toLowerCase().includes(q.toLowerCase()),
    []
  )
  const filter = filterFn ?? defaultFilter
  const filteredItems = React.useMemo(
    () => (query ? items.filter((item) => filter(item, query)) : items),
    [items, query, filter]
  )

  React.useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const mapRef = (
      el as HTMLDivElement & {
        __itemsMapRef?: React.RefObject<Map<string, InlineReferenceItemData[]>>
      }
    ).__itemsMapRef
    if (mapRef?.current) {
      mapRef.current.set(trigger, filteredItems)
    }
    return () => {
      if (mapRef?.current) {
        mapRef.current.delete(trigger)
      }
    }
  }, [trigger, filteredItems, inputRef])

  React.useEffect(() => {
    if (forceOpen) {
      setActiveIndex(0)
    }
  }, [forceOpen, setActiveIndex])

  const [positionStyle, setPositionStyle] =
    React.useState<React.CSSProperties | null>(null)

  React.useEffect(() => {
    if (!isActive) {
      setPositionStyle(null)
      return
    }

    if (forceOpen && forcePosition) {
      setPositionStyle(forcePosition)
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
  }, [isActive, triggerState, inputRef, forceOpen, forcePosition, placement])

  if (!isActive) return null

  return (
    <div
      data-slot="inline-reference-content"
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
      <InlineReferenceContentContext.Provider
        value={{ filteredItems, trigger }}
      >
        {children}
      </InlineReferenceContentContext.Provider>
    </div>
  )
}

type InlineReferenceContentContextValue = {
  filteredItems: InlineReferenceItemData[]
  trigger: string
}

const InlineReferenceContentContext =
  React.createContext<InlineReferenceContentContextValue | null>(null)

function useInlineReferenceContentContext() {
  const context = React.useContext(InlineReferenceContentContext)
  if (!context) {
    throw new Error(
      "InlineReferenceList/Item must be used within <InlineReferenceContent>"
    )
  }
  return context
}

// ---------------------------------------------------------------------------
// InlineReferenceList
// ---------------------------------------------------------------------------

type InlineReferenceListProps = {
  children: (item: InlineReferenceItemData) => React.ReactNode
  className?: string
}

function InlineReferenceList({
  children,
  className,
}: InlineReferenceListProps) {
  const { filteredItems } = useInlineReferenceContentContext()

  return (
    <div
      data-slot="inline-reference-list"
      className={cn("max-h-[300px] overflow-y-auto p-1", className)}
    >
      {filteredItems.map((item) => children(item))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// InlineReferenceItem
// ---------------------------------------------------------------------------

type InlineReferenceItemProps = {
  value: InlineReferenceItemData
  children: React.ReactNode
  className?: string
  onSelect?: (item: InlineReferenceItemData) => void
} & Omit<React.ComponentProps<"div">, "value">

function InlineReferenceItem({
  value,
  children,
  className,
  onSelect,
  ...props
}: InlineReferenceItemProps) {
  const { activeIndex, setActiveIndex, selectItem } =
    useInlineReferenceContext()
  const { filteredItems, trigger } = useInlineReferenceContentContext()

  const index = filteredItems.indexOf(value)
  const isActive = index === activeIndex
  const itemId = `inline-ref-item-${value.id}`

  const description =
    typeof (value as InlineReferenceItemData & { description?: unknown })
      .description === "string"
      ? (value as InlineReferenceItemData & { description?: string })
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
      data-slot="inline-reference-item"
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

// ---------------------------------------------------------------------------
// InlineReferenceEmpty
// ---------------------------------------------------------------------------

type InlineReferenceEmptyProps = {
  children: React.ReactNode
  className?: string
}

function InlineReferenceEmpty({
  children,
  className,
}: InlineReferenceEmptyProps) {
  const { filteredItems } = useInlineReferenceContentContext()

  if (filteredItems.length > 0) return null

  return (
    <div
      data-slot="inline-reference-empty"
      className={cn("py-6 text-center text-sm text-pg-muted-foreground", className)}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// InlineReferenceGroup
// ---------------------------------------------------------------------------

type InlineReferenceGroupProps = {
  heading?: string
  children: React.ReactNode
  className?: string
}

function InlineReferenceGroup({
  heading,
  children,
  className,
}: InlineReferenceGroupProps) {
  return (
    <div
      data-slot="inline-reference-group"
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

function InlineReferenceSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="inline-reference-separator"
      className={cn("bg-pg-border -mx-1 h-px", className)}
      {...props}
    />
  )
}

export {
  InlineReference,
  InlineReferenceInput,
  InlineReferenceContent,
  InlineReferenceList,
  InlineReferenceItem,
  InlineReferenceEmpty,
  InlineReferenceGroup,
  InlineReferenceSeparator,
}
