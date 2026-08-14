# Domain context — design-playground

Local-dev design canvas embedded in a host React app. Agents generate layout/style **iterations** of host **registry** components onto an infinite canvas.

## Glossary

**Playground root** — The host-relative directory where this package lives (`src/app/playground` or `app/playground`). Resolved on disk by sentinels (`PlaygroundClient.tsx`, `registry.tsx`).

**PlaygroundPaths** — Module that builds host-relative POSIX paths under the playground root for prompts, edit targets, and agent instructions (e.g. iteration files, `tree.json`). Callers do not hardcode the root or subdirectory folklore.

**Relative root (client)** — Playground-root string baked into the client bundle by the Vite plugin (`define`) and cached once at boot, so browser-built prompts use the real layout without a post-hoc rewrite. No HTTP is involved.

**Iteration** — A generated variant file under `iterations/`, listed in `tree.json` (`index.ts` is rebuilt server-side).

**Generation** — One agent run that writes one or more iterations (or edits) from a prompt.

**Registry** — The list of host components available to drag and to generate from. Fed entirely by static discovery; `registry.tsx` holds no hardcoded entries and owns neither path nor prompt policy.

## UI vocabulary — regions & components

Ubiquitous language for the interface. **Convention:** name by role, not by position or widget type; the package *is* the playground, so leaf UI components carry no `Playground` prefix — only the app-shell roots (`PlaygroundClient`, `PlaygroundCanvas`) keep it. Each entry notes the identifier it replaces, so this doubles as the rename map.

**Header** — The top app bar: project label, preview-theme toggle, skills, model settings, clear, refresh. (Replaces `PlaygroundHeader`.)

**Composer** — The prompt input that composes the next agent turn (Edit/Explore, attachments, send). One Composer, two placements: minified on the canvas floor, or embedded in the **Agents** tab when expanded. Expand continues the same thread (Figma / Recraft continuum) — it does not open an empty Agents surface. Placement is state, not identity; avoid "docked" in names. Named after the assistant-ui / v0 convention for the compose-and-send control. (Replaces `DockedChatBar`.) Its controls are **ComposerControls** (was `ChatComposerControls`), its mode is **ComposerMode** (was `ChatComposerMode`), and its reveal-on-proximity hook is **useComposerProximity** (was `useChatDockProximity`).

**Chat** — The conversation *domain*: transcript, submit, attachments. `features/chat/` and `useChatSubmit`/`useChatAttachments` keep the "chat" name. The UI regions that surface that domain are **Composer** (input) and **Agents** (full thread).

**ZoomControls** — The bottom-left pill: zoom out/in with a live percentage readout, plus undo/redo. (Replaces `PlaygroundCanvasViewControls`. Matches Onlook's `zoom-controls`.)

**ViewportSelector** — The Auto/Desktop/Mobile breakpoint switcher. (Replaces `ViewportButtons` — a widget-typed name.)

**Canvas** — The infinite canvas surface. The shell component keeps `PlaygroundCanvas`.

**Library** — The left panel: a searchable host for the things you pull onto the canvas. Today it lists the registry **Components**; it is designed to grow sibling **Tokens**, **Layers**, and **Primitives** tabs. Always present — it does not collapse. Named as a *container* — identity lives in its tabs, not in any one content type — so it survives holding more than components. (Replaces `PlaygroundSidebar`; feature dir `registry-sidebar` → `library`. Chosen over `Assets`, which in Figma names only the components tab, and over `Components`, which is one tab, not the panel.)

**DesignAgents** — The right-column container for the coexisting **Design** and **Agents** tabs. Interim compound name (tab identities joined) until a sharper role-word lands, or until layout splits them so they no longer share one shell. Rejected as the shell name: generic "sidepanel" / "sidebar", **Inspector**, **Context**, **Workbench**. UI chrome can still lead with the tab labels; the glossary/code noun for the container is **DesignAgents**.

- **Design** — Properties / style for the current selection.
- **Agents** — Full agent thread, history, and the expanded Composer home. (Replaces the **Transcript** tab label.)

**CanvasToolbar** — The left-edge vertical tool rail on the canvas: Select, Hand, Shapes, Text, Image, then undo/redo. Matches Recraft's side/canvas toolbar and tldraw's Toolbar. "Toolbar" is the universal term for select/hand/draw tools; the `Canvas` prefix separates it from the `Header`. No Library toggle — Library stays open. (Replaces `PlaygroundCanvasToolbar`.)

**CanvasContextMenu** — The right-click menu over the canvas or a node: *Organize canvas*, *Group selection* / *Ungroup frame*, and the z-order stack (bring-to-front … send-to-back). `ContextMenu` is the standard role term (tldraw, Excalidraw, Recraft, Radix); the `Canvas` prefix distinguishes it from any other menu. (Replaces `PlaygroundCanvasContextMenu`.)

**CanvasConfirmDialogs** — The destructive-confirm cluster over the canvas: two shadcn `AlertDialog`s — *"Clear everything?"* (wipes the canvas and permanently deletes all generated variation files) and *"Delete variation with children?"* (cascade-delete vs. keep-children/reparent). Named for its role as the guard-rail confirm before destructive canvas actions, not a generic modal host; the `Canvas` prefix separates it from the standalone `ModelSettingsModal` / `SkillsCatalogModal`. (Replaces `PlaygroundCanvasDialogs`; chosen over the vaguer `CanvasDialogs`. Alternatives: `CanvasAlertDialogs`, `DestructiveDialogs`.)
