# Task 18 — Deepen `components/chat/DockedChatBar.tsx` (843 LOC)

**Type:** deepening · **Risk:** medium · **Depends on:** coordinate with Task 13 (`inline-reference`) · **Blast radius:** internal

## The problem

The docked chat bar mixes: the `InlineReference` contenteditable input, **attachment handling** (image refs via `ImageRefIcon`, node refs via `NodeRefIcon`), proximity/dock behaviour (`NEAR_PX = 44`, `FAR_PX = 120` — show/hide based on cursor distance), and submit assembly, across **30 hooks** in one component.

## Pre-req / coordination: Task 13

This is the primary consumer of `ui/inline-reference.tsx`. Task 13 splits that file but keeps `InlineReference`, `InlineReferenceHandle`, `OnSelectItemResult` exported. Do **not** start until 13's public exports are stable, or coordinate exports so this file keeps compiling. Prefer 13 → 18.

## Dependency classification

- Attachment refs (image/node): **in-process** (canvas selection + base64 image payloads).
- Proximity/dock visibility: **in-process** (pointer geometry).
- Submit: **in-process** → hands a payload to the generation lifecycle (Task 10).

## Target seams

1. **`hooks/useChatAttachments`** — the deep one. Owns the list of attached references (image refs, node refs), add/remove, and how they serialize into the submit payload. Interface: `{ attachments, addImage(file), addNodeRef(node), remove(id), toPayload() }`. Hides base64 encoding and ref bookkeeping.
2. **`hooks/useChatDockProximity`** — the `NEAR_PX`/`FAR_PX` show/hide-on-cursor-distance behaviour as a small hook returning `isDocked`/visibility. Pure pointer geometry behind a boolean.
3. **`components/chat/chat-icons.tsx`** — `ImageRefIcon`, `NodeRefIcon` (leaf SVGs).
4. **`DockedChatBar.tsx` becomes composition** — renders `InlineReference` + attachment chips, wires `useChatAttachments` and `useChatDockProximity`, and on submit assembles `toPayload()` + the inline-reference segments. Target: under ~350 LOC.

## Method

- Extract icons (trivial), then the proximity hook (pure geometry), then attachments (the stateful core). The submit handler should read attachments via `toPayload()` rather than reaching into local state.

## Verification

- Attach an image (paste/drag) → an image-ref chip appears; attach a node reference (`@`-pick or selection) → a node-ref chip appears; remove each → chip clears.
- Submit → the payload carries the attachments and the inline-reference pills correctly into generation (iterations spawn as before).
- The bar docks/undocks based on cursor proximity (`NEAR_PX`/`FAR_PX`) exactly as before.
- `@`-references still work (depends on Task 13's `InlineReference` exports).

## Done when

Attachments and dock-proximity are deep hooks, icons are extracted, the chat bar composes them, and chat/submit behaviour is unchanged.

## Do NOT

- Do not change the submit payload shape (Task 10's generation lifecycle consumes it).
- Do not duplicate inline-reference serialization here — get segments from the `InlineReferenceHandle`.
