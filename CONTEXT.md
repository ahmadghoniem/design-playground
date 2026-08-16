# Design playground

A local-dev design canvas embedded in a host React app. Agents generate layout and style iterations of host registry components onto an infinite canvas.

## Language

Headwords that name a region of the interface are PascalCase; concepts and interactions are sentence case.

### Package

**Playground**:
The design-canvas package dropped into a host app.
_Avoid_: editor, studio, sandbox

**Playground root**:
The host-relative directory where this package lives.
_Avoid_: playground dir, package root

**Host**:
The React app that embeds the playground and supplies the components, tokens, and git checkout the canvas works on.
_Avoid_: parent app, consumer, wrapper

**Registry**:
The list of host components available to drag onto the canvas and to generate from.
_Avoid_: catalog, component list, assets

### Generation

**Agent**:
A coding-agent product that can run models in this playground (Claude Code, Cursor, Codex, Antigravity). The thing the model picker groups by.
_Avoid_: provider, harness, CLI, vendor

**Model**:
A named language model offered by an Agent. Rows under an Agent heading do not repeat the Agent's name.
_Avoid_: LLM, completion, engine

**Generation**:
One Agent run that writes one or more iterations, or edits, from a prompt.
_Avoid_: session, job, task, inference

**Iteration**:
A generated variant of a host component, shown as its own canvas node.
_Avoid_: variation, version, variant, draft

**Adopt**:
Taking one iteration as the chosen answer for its host component. An adopted iteration shows an Adopted mark on its label.
_Avoid_: keep, apply, merge, promote, accept

**Skill**:
A packaged instruction the Agent can follow, inserted from the Composer with `/`.
_Avoid_: command, slash command, prompt snippet, plugin

### Shell

**Canvas**:
The infinite board where nodes live.
_Avoid_: board, stage, viewport, artboard

**Panel**:
A collapsible column that frames the canvas — the Library or the RightPanel. Collapsing it gives the column to the canvas; the panel is put away, not removed.
_Avoid_: flank, sidebar, dock, rail, column

**Library**:
The left panel: a searchable host for things you pull onto the canvas. Its folds are Layers and Primitives. The project name sits in its head.
_Avoid_: sidebar, assets, components panel, navigator, team library, published library

**RightPanel**:
The right panel: a container whose tabs are Design and Agents.
_Avoid_: DesignAgents, inspector, properties panel, context, workbench, sidepanel, sidebar

**CollapsedPill**:
A panel's head after collapse: a floating rounded remnant of the same panel. On the RightPanel the tabs stay live, so picking one reopens that view.
_Avoid_: chip, handle, tab bar, mini sidebar, activity bar, icon rail, offcanvas

**Fold**:
A titled, expandable unit inside a panel. Open folds share the panel's height and scroll inside themselves so every fold header stays on screen.
_Avoid_: accordion, section, tab, disclosure, group

**FoldSearch**:
Search that replaces a fold's title in place. Closing it restores the title and clears the query, so a closed search cannot leave a hidden filter behind.
_Avoid_: filter row, search bar, find

**Layers**:
The Library fold that shows the host render tree you can search, focus, and drag onto the canvas.
_Avoid_: outline, navigator, tree, pages

**Primitive**:
A host UI building block listed in the Library's Primitives fold, draggable onto the canvas.
_Avoid_: widget, atom, base component, primitive tokens

**Design**:
The RightPanel tab for the current selection. Its folds are Styles and Variables.
_Avoid_: properties, inspect, details

**Agents**:
The RightPanel tab for the full Agent thread, RunHeader, and the expanded Composer.
_Avoid_: transcript, chat, history, thread panel, Figma Agents tab

**Styles**:
The Design fold of property groups for the current selection (Spacing, Typography, Colour, Border & shape, Effects, Layout).
_Avoid_: properties, inspect, design tokens, local styles, text styles, color styles, published styles

**Scrub**:
A horizontal drag on a numeric Styles value. The readout stays put, and a dirty mark shows the value has left its default.
_Avoid_: stepper, spinner, slider, number input

**Variables**:
The Design fold of named reusable values — colours, radius, typography, and the Icons set in use.
_Avoid_: tokens, tokens tab, theme, palette, collections, modes

**Icons**:
The Variables sub-fold that names the icon set the host draws from and lets you swap the pack.
_Avoid_: icon library, assets, glyphs

**Thread**:
The conversation shown in Agents: the user prompt and the Agent's steps for the current Generation.
_Avoid_: transcript, history, log, chat log

**RunHeader**:
The block above the Thread: title, Worktree, Branch, progress, and a one-line summary of the current Generation.
_Avoid_: status bar, session header, chat title

### Canvas chrome

**CanvasToolbar**:
The vertical tool rail on the canvas: Select, Hand, Shapes, Text, Image, undo/redo, and the preview light/dark toggle.
_Avoid_: tool rail, toolbox, sidebar, header tools

**ZoomControls**:
The bottom-left pill: zoom out, live percentage, zoom in.
_Avoid_: view controls, navigation panel, zoom menu, minimap

**Help**:
The `?` button beside ZoomControls. It opens a popover of docs, shortcuts, feedback, and what's new.
_Avoid_: help menu, resources, support

**ViewportSelector**:
The Auto / Desktop / Mobile switcher on a selected preview node.
_Avoid_: breakpoint switcher, device toggle, viewport buttons

**Preview theme**:
The light/dark toggle on the CanvasToolbar. It themes canvas previews and variable swatches, not the playground chrome.
_Avoid_: color scheme, appearance, app theme, dark mode

### Composer

**Composer**:
The prompt input that composes the next Agent turn. One Composer, two placements: on the canvas floor, or at the bottom of Agents when that tab is showing.
_Avoid_: chat bar, docked chat, prompt box, input, chat dock

**ComposerFooter**:
The Composer's bottom control row: annotations and Permission mode on the left, model picker and send on the right.
_Avoid_: toolbar, action bar, control bar, perch

**ComposerMode**:
Edit or Explore. Explore asks for several iterations from one prompt.
_Avoid_: task type, agent mode, chat mode

**ModelPicker**:
The ComposerFooter control that chooses Model and Effort. Models group under their Agent, and picking one applies that Model's default Effort.
_Avoid_: model menu, LLM picker, provider picker

**SkillPicker**:
The `/` menu in the Composer that inserts a Skill. A row can open a nested list, and Add a skill opens the Skills catalog.
_Avoid_: slash menu, command palette, mention menu

**Attachment**:
A canvas node (component, text, or image) tagged onto the current prompt as chips in the Composer.
_Avoid_: tag, chip, context, mention, reference

**Annotation**:
A pointed-at region of a preview, added into the prompt from the Composer. The control is a cursor that counts how many are attached.
_Avoid_: comment, pin, hotspot, inspect, select-into-prompt

**Permission mode**:
How freely the Agent may change the checkout without asking: Ask, Auto, Full, or Read. The Composer chip and the menu row use the same word.
_Avoid_: approval mode, approvals, permissions, policy, sandbox, yolo

**Effort**:
How thoroughly the chosen Model works a turn. The closed model pill shows the Model name with Effort dimmed beside it, never Effort instead of the Model.
_Avoid_: reasoning, thinking, reasoning effort, budget, temperature

**Effort ladder**:
The shared, ordered vocabulary of Effort levels: minimal, low, medium, high, max. Each Model offers a subset and a default; the picker is rebuilt from the chosen Model.
_Avoid_: effort enum, thinking budget, reasoning levels

**Worktree**:
The git working directory this playground was launched in. Named read-only at the top of the Composer, so you can tell which checkout a Generation will land in.
_Avoid_: checkout, working copy, workspace, workspace folder

**Branch**:
The git branch the Worktree is on. Named read-only beside the Worktree, for the same reason and with the same reach: it reports, it does not switch.
_Avoid_: workspace, board, scene, ref

### Nodes

**Node**:
A card on the canvas: a host component, an iteration, a text note, or a reference image.
_Avoid_: card, frame, block, item

**NodeLabel**:
The name row on a node. Iterations append `| #N`. Adopted iterations also show an Adopted mark.
_Avoid_: badge, chip, status, kind label

**NodeRail**:
The selection-gated vertical buttons on a node's right edge. Iteration nodes carry Adopt and Delete; every other node carries Delete.
_Avoid_: toolbar, node tools, keep bar, context menu

**Element inspection**:
Alt-hover or Alt-click on a live preview to select a DOM node for Styles. The crumb is a tag or component name, never utility classes.
_Avoid_: inspect, pick, targeting, deep select
