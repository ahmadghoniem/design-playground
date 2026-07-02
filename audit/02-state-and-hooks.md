# 02 — State (stores) & Hooks

## 1. Stores — 7 files, all consumed, none orphaned

All zustand stores live in `stores/` (none elsewhere).

| Store | Manages | Persisted | Consumers |
|---|---|---|---|
| `design-system-store.ts` | `injectIntoGeneration` — prepend DESIGN.md tokens to prompts | yes (`playground-design-system-v1`) | `DesignSystemModal.tsx:19,89,92` |
| `dev-mode-store.ts` | single `enabled` boolean (see §2) | yes (`playground-dev-mode`) | `app/PlaygroundHeader.tsx:15,67,68` only |
| `interactive-node-store.ts` | which node has pointer-through "interactive" mode | no | `IterationNode`, `ComponentNode`, `PlaygroundCanvas` |
| `keybinding-store.ts` | user keyboard-shortcut overrides | yes | `KeyboardShortcutsModal.tsx`, `lib/keybindings.ts` |
| `model-settings-store.ts` | active provider, enabled models, `claudeCodeOptions`, `fetchModels` | yes (v3) | 8 consumers — sidebar, iterate-dialog, modals, chat dock, `useModelCycle`, `lib/generation-body.ts` |
| `playground-draw-store.ts` | draw-tool flag, stroke selection, `drawPenKind` | no | draw layer, canvas, 3 canvas hooks |
| `preview-color-scheme-store.ts` | preview scheme auto/light/dark | yes | isolated page, header, client |

## 2. `dev-mode-store` — the "dev-store" question answered

- **What it is:** a persisted boolean feature flag for *developer mode*, shipped in the
  normal bundle (not compiled out).
- **How you reach it:** hidden gesture — **right-click the "Model settings" (sliders) button**
  in the header (`PlaygroundHeader.tsx:228-242`) → a portal popover (`:384-415`) with a
  single "Dev mode" toggle.
- **What it gates:** extra header buttons when enabled (`PlaygroundHeader.tsx:254` —
  e.g. the Eraser "Clear all" button `:259-264` and siblings).
- **Cost of removal:** small and self-contained — the store file, the wiring in
  `PlaygroundHeader.tsx`, and `DEV_MODE_STORAGE_KEY` in `lib/constants.ts:95`.
  Decide whether "Clear all" should become always-visible or die with it.

## 3. Hooks — 32 files, all consumed, zero orphans

Grouped by the feature they power (cut the feature ⇒ cut the hooks):

**Canvas core** (all consumed by `app/PlaygroundCanvas.tsx`):
`useCanvasDrawTool`, `useCanvasPersistence`, `useCanvasPresenceBubbles`, `useCanvasDragDrop`,
`useCanvasPaste`, `useCanvasKeyboard`, `useCanvasFrameOps`, `useCanvasNodeDelete`,
`useCanvasAutoArrange`, `useCanvasCreatePage`, `useCanvasClipboard`, `useCanvasClear`,
`useDynamicBackground`, `useNodeSelection`.

**Generation / iteration cluster** (inseparable from the iterate feature):
`useGenerationCoordination`, `useGenerationLifecycle`, `useIterationScan`, `useChatSubmit`
(all in `PlaygroundCanvas.tsx`); `useDragToIterate` (`IterateDialog.tsx:54-59,731` +
canvas); `useIterationAdoption` (`IterationNode.tsx:59,312`);
`useIterationScreenshot` — **consumed only by `useIterationAdoption.ts:22,77`**
(tightly coupled pair; if adoption goes, screenshot goes).

**Chat dock** (die with `DockedChatBar`):
`useSkills`, `useModelCycle`, `useImpeccableSkillPicker`, `useChatAttachments`,
`useChatDockProximity`. (`useImpeccableSkillPicker` also used by
`iterate-dialog/useIterateDialogState.ts:99` and typed in `impeccable-demote-menu.tsx:3`.)

**Node shared / selection:** `useNodeShared` (Component+Iteration nodes),
`useElementSelection` (`PlaygroundCanvas.tsx:74,462` — the alt+click element picker).

**Header / misc:** `useOpenIn`, `useProjectContext`, `usePresenceBubbles`
(all `PlaygroundHeader.tsx:40-42,75-83`); `useFocusNode` (sidebar tree + preview card).

**Flags:**
- `hooks/usePresenceBubbles.ts` (header) and `hooks/useCanvasPresenceBubbles.ts` (canvas)
  are the same "presence" feature at two mount points — consolidation candidate,
  or a whole-feature cut if you don't want presence bubbles at all (single-player app!).
- `hooks/useOpenIn.ts` imports a **dangling asset** `../assets/cursor-icon.svg`
  (missing since commit `055acbd`) — known pre-existing break, still unfixed.

## 4. Highlight-tool remnants — exhaustive sweep

The highlighter **draw pen** itself is gone (proof: `lib/draw-types.ts:6` is
`export type DrawPenKind = 'pen'`; `DRAW_PEN_PRESETS` has only `pen`;
`ShapeToolGroup.tsx` `SUB_TOOLS` (:16-45) has no highlight button).

### Dead leftovers to remove (3)

| Where | What |
|---|---|
| `styles/playground-global.css:413-423` | entire `[data-draw-kind="highlight"]` cursor block — unreachable: the attribute comes from `drawPenKind` (`PlaygroundCanvas.tsx:722`) whose type can only be `'pen'` |
| `styles/playground-global.css:397` | stale comment `/* Draw tool (P/H): scoped cursors for pen vs highlighter. */` |
| `README.md:201` | stale TODO "remove the highlight tool from shapetoolgroup" — already done |

### Legitimate "highlight" uses — keep, unrelated to the draw tool

- `components/canvas/ElementHighlight.tsx` (+ `PlaygroundCanvas.tsx:73,827,828`) —
  the **alt+click element-selection overlay** (hover/selection boxes). Active feature.
- `components/ui/inline-reference.tsx:402,426` — reference-chip "highlight before
  backspace-delete" UI state.
- `styles/playground-global.css:761` — comment for that same delete-highlight state.
- `docs/ui/design-system.mdc` — "highlight" = the yellow accent color semantics.
- `docs/PROJECT-OVERVIEW.*` — the English word in headings/blurbs.

## 5. Stale README cleanup section

`README.md:199-212` lists cleanup targets that are **already deleted** and no longer exist
(`components/flow/**`, `SignupPageShell.tsx`, `MockDataPanel.tsx`, `data/flows/**`,
`stage-renderers.tsx`, `skill-icons.ts` — all verified gone). The section itself is the
dead thing now; strike or rewrite it.
