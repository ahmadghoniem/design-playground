/* Flow document for flows.html — single source of truth.
   Edit this file to add/adjust flows; the HTML renders whatever is here.
   Schema:
     groups:   columns on the map {id, label, color}
     packages: boxes on the map {id, label, group, dir?, desc?}
     flows:    {id, title, category, summary,
                steps: [{from, to, label, passes?, kind?: 'return'}],   // package-level
                trace: [{file, pkg, role, detail?}] }                    // file-level A→Z
   Verified against the codebase on 2026-07-02 (post-cleanup: no presence/dev-mode/evals). */
window.FLOWS = {
  meta: { app: "design-playground", updated: "2026-07-02" },

  groups: [
    { id: "actor",    label: "Actor",           color: "#a78bfa" },
    { id: "ui",       label: "UI surfaces",     color: "#60a5fa" },
    { id: "client",   label: "Client logic",    color: "#34d399" },
    { id: "shared",   label: "Shared lib",      color: "#f472b6" },
    { id: "server",   label: "Hono server",     color: "#fbbf24" },
    { id: "external", label: "Processes & disk",color: "#f87171" }
  ],

  packages: [
    { id: "user",     label: "User",              group: "actor",  desc: "Gestures: drag, drop, click, paste, type" },
    { id: "canvas",   label: "Canvas + nodes",    group: "ui", dir: "app/PlaygroundCanvas.tsx · nodes/", desc: "React Flow canvas; Component/Iteration/Skeleton/Image/Shape/Text/Frame nodes" },
    { id: "sidebar",  label: "Sidebar",           group: "ui", dir: "components/canvas/PlaygroundSidebar.tsx + sidebar/", desc: "Registry tree, discovered pages, frames, drag sources" },
    { id: "chat",     label: "Docked chat",       group: "ui", dir: "components/chat/DockedChatBar.tsx · components/ui/inline-reference*", desc: "Composer with @-references, skills, model pill" },
    { id: "modals",   label: "Modals",            group: "ui", dir: "components/modals/", desc: "Discovery, Design System, Skills, Model Settings, Shortcuts" },
    { id: "header",   label: "Header",            group: "ui", dir: "app/PlaygroundHeader.tsx", desc: "Open-in menu, color scheme, clear/refresh tools" },
    { id: "hooks",    label: "Hooks",             group: "client", dir: "hooks/", desc: "All behavior: drag-drop, paste, generation lifecycle, scan, adoption…" },
    { id: "stores",   label: "Zustand stores",    group: "client", dir: "stores/", desc: "model-settings, design-system, draw, keybindings, color scheme" },
    { id: "registry", label: "Registry",          group: "client", dir: "registry.tsx · data/*.mockData", desc: "Component/page registry rendered on canvas; edited by server + agent" },
    { id: "lib",      label: "lib/ helpers",      group: "shared", dir: "lib/", desc: "canvas persistence, drag-ghost-grid, generation-body, screenshot, providers" },
    { id: "prompts",  label: "Prompt builders",   group: "shared", dir: "prompts/", desc: "Pure functions that assemble the agent prompt per action" },
    { id: "server",   label: "API routes",        group: "server", dir: "server/routes/ (mounted at /playground/api)", desc: "generate, html-pages, oncanvas-components, iterations, images, discover, design, skills, pages, open-in, models, screenshot, project-id" },
    { id: "agent",    label: "Agent CLI",         group: "external", dir: "claude (spawned child process)", desc: "Claude Code, spawned per generation with the prompt on stdin" },
    { id: "fs",       label: "Host filesystem",   group: "external", dir: "src/app/playground/**", desc: "Generated iterations, html frames, images, discovery.json, DESIGN.md, registry edits, logs" },
    { id: "storage",  label: "localStorage",      group: "external", desc: "Canvas state per project-id, model settings, keybindings, color scheme" }
  ],

  flows: [

    /* ============================ CANVAS BASICS ============================ */

    {
      id: "boot",
      title: "App boot & canvas restore",
      category: "Canvas basics",
      summary: "From opening /playground in the host's dev server to a restored, interactive canvas.",
      improve: "PlaygroundClient fires its mount fetches (discover, html-pages, oncanvas-components) as separate round-trips. Batch them with Promise.all — or add one GET /api/bootstrap that returns project-id + discovery + frames in a single response — to cut cold-start latency.",
      steps: [
        { from: "user",    to: "server",  label: "Open /playground", passes: "HTTP GET; vite-plugin rewrites the clean URL to playground.html and bridges Hono via getRequestListener" },
        { from: "server",  to: "canvas",  label: "Serve entry", passes: "playground.html → dev-entry.tsx: BrowserRouter basename=/playground, global CSS imports" },
        { from: "canvas",  to: "server",  label: "Identify project", passes: "GET /api/project-id → stable id used to namespace saved state" },
        { from: "canvas",  to: "storage", label: "Restore canvas", passes: "loadCanvasState(storageKey): nodes, edges, viewport, knownIterations, drawings, in-flight generationInfo" },
        { from: "canvas",  to: "server",  label: "Load content", passes: "GET /api/discover (registry tree) + GET /api/html-pages + GET /api/oncanvas-components for the sidebar" },
        { from: "hooks",   to: "server",  label: "Resume generation (if reload happened mid-run)", passes: "GET /api/generate?action=status → reattach SSE + skeletons", kind: "return" }
      ],
      trace: [
        { file: "server/vite-plugin.ts", pkg: "server", role: "designPlaygroundPlugin(): rewrites /playground → playground.html; mounts the Hono app into Vite's connect middleware" },
        { file: "server/index.ts", pkg: "server", role: "createPlaygroundServer(): cors + 50MB bodyLimit; mounts all route modules under /playground" },
        { file: "dev-entry.tsx", pkg: "canvas", role: "React root: BrowserRouter(basename /playground), routes / and /iterations/:slug; imports global + Tailwind CSS" },
        { file: "app/page.tsx", pkg: "canvas", role: "Fetches /api/project-id, then mounts PlaygroundClient with the storage key" },
        { file: "app/PlaygroundClient.tsx", pkg: "canvas", role: "Top-level state owner: loads discovery data, wires modals, renders canvas + sidebar + header + chat" },
        { file: "lib/canvas-persistence.ts", pkg: "lib", role: "loadCanvasState(storageKey) from localStorage: nodes/edges/viewport/knownIterations/generationInfo/drawings" },
        { file: "app/PlaygroundCanvas.tsx", pkg: "canvas", role: "ReactFlow setup: node types, all canvas hooks, event listeners" },
        { file: "hooks/useGenerationLifecycle.ts", pkg: "hooks", role: "If persisted generationInfo says a run was active: GET /api/generate?action=status and resume SSE + skeletons" },
        { file: "components/canvas/PlaygroundSidebar.tsx", pkg: "sidebar", role: "Builds the tree from registry + discovery + frames (useSidebarDiscoverySync merges /api/html-pages + /api/oncanvas-components)" }
      ]
    },

    {
      id: "add-component",
      title: "Add a component to the canvas (drag from sidebar)",
      category: "Canvas basics",
      summary: "Drag a registry component, HTML frame, or JSX frame from the sidebar tree onto the canvas.",
      improve: "The auto-attach step downloads the FULL html-pages / oncanvas-components list (every page with every iteration) on each drop. Add a ?folder=<name> filter server-side so a drop only transfers that one component's iterations.",
      steps: [
        { from: "user",    to: "sidebar", label: "Drag a tree item", passes: "dataTransfer[DND_DATA_KEY] = componentId (plain id, or 'html:<folder>' / 'jsx:<name>' prefixed)" },
        { from: "sidebar", to: "hooks",   label: "Drop on canvas", passes: "onDrop → useCanvasDragDrop reads the id, screenToFlowPosition(clientX/Y)" },
        { from: "hooks",   to: "canvas",  label: "Create parent node", passes: "Node{type:'component', data:{componentId, renderMode html|jsx|design-system}}" },
        { from: "hooks",   to: "server",  label: "Fetch existing variations", passes: "GET /api/html-pages or /api/oncanvas-components → iterations list for that component" },
        { from: "server",  to: "canvas",  label: "Attach iteration nodes", passes: "One iteration node + smoothstep edge per not-yet-on-canvas variation; knownIterations updated", kind: "return" },
        { from: "canvas",  to: "registry",label: "Render", passes: "ComponentNode resolves the id: registry Component fn, HTML iframe content via GET /api/html-pages, or JSX via oncanvas-loader" },
        { from: "canvas",  to: "storage", label: "Persist", passes: "useCanvasPersistence → saveCanvasState on every node/edge change" }
      ],
      trace: [
        { file: "components/canvas/PlaygroundSidebar.tsx", pkg: "sidebar", role: "Tree item draggable; sets dataTransfer with the component id (TreeNode / ComponentPreviewCard)" },
        { file: "hooks/useCanvasDragDrop.ts", pkg: "hooks", role: "onDrop: reads DND_DATA_KEY, detects html:/jsx:/design-system prefix, creates the component node at the drop position" },
        { file: "lib/constants.ts", pkg: "lib", role: "DND_DATA_KEY, HTML_ID_PREFIX, JSX_ID_PREFIX, DESIGN_SYSTEM_SHOWCASE_ID, ITERATION_EDGE_STYLE" },
        { file: "server/routes/html-pages.ts / oncanvas-components.ts", pkg: "server", role: "GET: lists frames/components with their iterations so existing variations auto-attach" },
        { file: "nodes/ComponentNode.tsx", pkg: "canvas", role: "Renders the component: registry lookup, or fetches HTML content, shows toolbar (iterate, interactive mode)" },
        { file: "registry.tsx", pkg: "registry", role: "flatRegistry maps id → {Component, props, sourcePath, propsInterface} for registry components" },
        { file: "nodes/oncanvas-loader.ts", pkg: "canvas", role: "Dynamically loads JSX frame components from the canvas-components folder" },
        { file: "nodes/IterationNode.tsx", pkg: "canvas", role: "Renders each attached variation with adopt/delete/iterate actions" },
        { file: "lib/canvas-persistence.ts", pkg: "lib", role: "saveCanvasState → localStorage (via useCanvasPersistence effect)" }
      ]
    },

    {
      id: "create-design",
      title: "Create a blank design frame",
      category: "Canvas basics",
      summary: "The 'new design' action creates an empty HTML frame on disk and drops a component node for it.",
      improve: "Untitled-N numbering is computed client-side (GET list → max+1) then PUT — two quick creates can race to the same name. Let the PUT handler assign the number atomically and return it.",
      steps: [
        { from: "user",   to: "canvas",  label: "Trigger create-design", passes: "CREATE_DESIGN_EVENT CustomEvent (header button / shortcut)" },
        { from: "canvas", to: "hooks",   label: "Handle", passes: "useCanvasCreatePage.handleCreateHtmlPageAt(center of viewport)" },
        { from: "hooks",  to: "server",  label: "Find next name", passes: "GET /api/html-pages → scan folders for untitled-N → next 'Untitled-N'" },
        { from: "hooks",  to: "server",  label: "Create the frame", passes: "PUT /api/html-pages {name} → server scaffolds folder + index.html" },
        { from: "server", to: "fs",      label: "Write", passes: "html-pages dir/<untitled-n>/index.html" },
        { from: "server", to: "canvas",  label: "Place node", passes: "{page:{id,folder}} → Node{type:'component', renderMode:'html', htmlFolder}; dispatches 'playground:html-pages-updated' so the sidebar refreshes", kind: "return" }
      ],
      trace: [
        { file: "app/PlaygroundHeader.tsx", pkg: "header", role: "Dispatches CREATE_DESIGN_EVENT" },
        { file: "hooks/useCanvasCreatePage.ts", pkg: "hooks", role: "Listens for the event; names the frame (GET /api/html-pages), PUTs it, creates the canvas node" },
        { file: "server/routes/html-pages.ts", pkg: "server", role: "PUT: creates the frame folder + starter index.html; returns {page:{id, folder}}" },
        { file: "nodes/ComponentNode.tsx", pkg: "canvas", role: "Renders the empty frame (html renderMode) ready for iteration" },
        { file: "components/canvas/PlaygroundSidebar.tsx", pkg: "sidebar", role: "Refreshes on playground:html-pages-updated" }
      ]
    },

    {
      id: "image-drop",
      title: "Drop an image onto the canvas",
      category: "Canvas basics",
      summary: "Image files become persisted image nodes usable as generation references.",
      improve: "Base64-in-JSON inflates uploads ~33% and is why the server needs a 50MB body limit. Downscale oversized images client-side before upload and consider a raw-body endpoint for originals.",
      steps: [
        { from: "user",   to: "hooks",  label: "Drop image file(s)", passes: "File objects → FileReader.readAsDataURL → base64" },
        { from: "hooks",  to: "server", label: "Upload", passes: "POST /api/images {base64 data, filename} (JSON, not multipart — hence the 50MB body limit)" },
        { from: "server", to: "fs",     label: "Save", passes: "Image file written under the playground images dir; returns {path, url, filename}" },
        { from: "server", to: "canvas", label: "Place node", passes: "Node{type:'image', data:{imagePath, imageUrl, filename, originalName}}", kind: "return" },
        { from: "canvas", to: "server", label: "(delete path)", passes: "useCanvasNodeDelete → DELETE /api/images removes the file with the node" }
      ],
      trace: [
        { file: "hooks/useCanvasDragDrop.ts", pkg: "hooks", role: "onDrop file branch: reads each image as base64, POSTs to /api/images, creates image nodes" },
        { file: "server/routes/images.ts", pkg: "server", role: "POST saves the file and returns its path/url; GET lists; DELETE removes" },
        { file: "nodes/ImageNode.tsx", pkg: "canvas", role: "Renders the persisted image; also re-uploads on paste-replace within the node" },
        { file: "hooks/useCanvasNodeDelete.ts", pkg: "hooks", role: "Deleting the node also DELETEs the stored image" }
      ]
    },

    {
      id: "paste",
      title: "Paste onto the canvas (Ctrl+V)",
      category: "Canvas basics",
      summary: "Clipboard images become image nodes; HTML/text fragments become frames; copied canvas nodes are cloned.",
      improve: "Rich-text clipboards (Docs, Notion) carry text/html that may not deserve a whole frame. When the fragment is small or mostly text, offer a chooser (frame vs text node) instead of always scaffolding a frame.",
      steps: [
        { from: "user",  to: "hooks",  label: "Paste", passes: "Clipboard items: image blobs / text-html / internal copied-nodes payload (useCanvasClipboard)" },
        { from: "hooks", to: "server", label: "Image path", passes: "POST /api/images (base64) — same as image drop" },
        { from: "hooks", to: "server", label: "HTML fragment path", passes: "GET both list endpoints to compute next frame-N → PUT /api/html-pages {name:'frame-N', content: wrapped HTML}" },
        { from: "hooks", to: "canvas", label: "Copied-nodes path", passes: "Clones nodes/edges with fresh ids at an offset position (no server round-trip)", kind: "return" }
      ],
      trace: [
        { file: "hooks/useCanvasPaste.ts", pkg: "hooks", role: "Paste handler: sniffs clipboard content type and routes to image upload, frame creation, or node cloning" },
        { file: "hooks/useCanvasClipboard.ts", pkg: "hooks", role: "Copy side: serializes selected nodes/edges for later paste" },
        { file: "server/routes/images.ts", pkg: "server", role: "Stores pasted images" },
        { file: "server/routes/html-pages.ts", pkg: "server", role: "PUT creates frame-N from a pasted HTML fragment" },
        { file: "app/PlaygroundCanvas.tsx", pkg: "canvas", role: "New nodes join the flow; persistence effect saves" }
      ]
    },

    {
      id: "persistence",
      title: "Canvas persistence (save / restore)",
      category: "Canvas basics",
      summary: "Everything on the canvas — including an in-flight generation — survives reloads via localStorage.",
      improve: "saveCanvasState fires on EVERY nodes/edges change — that's every frame of a drag. Debounce writes (~300ms trailing) and add a schema version field so future shape changes can migrate old blobs instead of discarding them.",
      steps: [
        { from: "canvas",  to: "hooks",   label: "Any change", passes: "nodes/edges/knownIterations/collapsed/drawings effect fires" },
        { from: "hooks",   to: "lib",     label: "Serialize", passes: "saveCanvasState(storageKey, nodes, edges, nodeIdCounter, knownIterations, collapsedIds, generationInfo, viewport, drawings)" },
        { from: "lib",     to: "storage", label: "Write", passes: "One JSON blob per project (storageKey derives from /api/project-id)" },
        { from: "storage", to: "canvas",  label: "On reload", passes: "loadCanvasState restores the full canvas; persisted generationInfo lets useGenerationLifecycle resume a run that was active", kind: "return" }
      ],
      trace: [
        { file: "hooks/useCanvasPersistence.ts", pkg: "hooks", role: "Effects: save on every change + on beforeunload (captures final pan/zoom)" },
        { file: "lib/canvas-persistence.ts", pkg: "lib", role: "saveCanvasState/loadCanvasState — the (de)serialization layer over localStorage" },
        { file: "app/page.tsx", pkg: "canvas", role: "GET /api/project-id → per-project storage key" },
        { file: "hooks/useGenerationLifecycle.ts", pkg: "hooks", role: "Restores in-flight generation from persisted generationInfo (status poll + SSE reattach)" }
      ]
    },

    {
      id: "delete-page",
      title: "Delete a page from the sidebar",
      category: "Canvas basics",
      summary: "Removes a discovered/created page: its registry entry and its source folder.",
      improve: "The server edits registry.tsx by string surgery and rm-rf's the folder — brittle and irreversible. Validate the registry still parses after the edit, and move the deleted folder to a .trash/ dir so there's an undo window.",
      steps: [
        { from: "user",    to: "sidebar", label: "Delete action on a page", passes: "slug of the page" },
        { from: "sidebar", to: "server",  label: "Request", passes: "DELETE /api/pages?slug=<slug>" },
        { from: "server",  to: "registry",label: "Edit registry.tsx", passes: "Removes the page's leaf entry from the registry source file" },
        { from: "server",  to: "fs",      label: "Remove source", passes: "rm -rf src/app/<slug>/" },
        { from: "server",  to: "sidebar", label: "Refresh", passes: "Sidebar re-fetches; Vite HMR picks up the registry.tsx edit", kind: "return" }
      ],
      trace: [
        { file: "components/canvas/PlaygroundSidebar.tsx", pkg: "sidebar", role: "Delete button → DELETE /api/pages?slug=" },
        { file: "server/routes/pages.ts", pkg: "server", role: "DELETE-only module: edits registry.tsx to drop the leaf, deletes the page directory" },
        { file: "registry.tsx", pkg: "registry", role: "Loses the page entry; HMR re-renders the tree/canvas without it" }
      ]
    },

    {
      id: "draw-shapes",
      title: "Draw, shapes, text & frames",
      category: "Canvas basics",
      summary: "Annotation layer: freehand pen strokes, rect/ellipse/line shapes, text labels, and grouping frames.",
      improve: "Stroke points ride inside the same localStorage blob as nodes, so a heavy sketch bloats every canvas save. Store drawings under their own key (saved only when strokes change) and simplify paths (Ramer-Douglas-Peucker) on commit.",
      steps: [
        { from: "user",   to: "canvas",  label: "Pick a tool", passes: "Toolbar (P pen, R/O/L shapes, T text, F frame) → playground-draw-store / tool state" },
        { from: "canvas", to: "stores",  label: "Tool state", passes: "drawToolActive, drawPenKind, stroke selection live in stores/playground-draw-store.ts" },
        { from: "canvas", to: "hooks",   label: "Draw gesture", passes: "useCanvasDrawTool captures pointer path → DrawStroke points; shapes/text/frames become nodes" },
        { from: "hooks",  to: "canvas",  label: "Render", passes: "Strokes → PlaygroundCanvasDrawLayer + DrawStrokePaths; Shape/Text/Frame nodes; frames group children (useCanvasFrameOps)" },
        { from: "canvas", to: "storage", label: "Persist", passes: "Drawings array + nodes ride in the same saveCanvasState blob", kind: "return" }
      ],
      trace: [
        { file: "components/canvas/PlaygroundCanvasToolbar.tsx", pkg: "canvas", role: "Tool buttons (select/text/image + shape group)" },
        { file: "components/canvas/ShapeToolGroup.tsx", pkg: "canvas", role: "Pen + rect/ellipse/line sub-tools" },
        { file: "stores/playground-draw-store.ts", pkg: "stores", role: "Draw-mode flag, pen kind, stroke selection state" },
        { file: "hooks/useCanvasDrawTool.ts", pkg: "hooks", role: "Pointer capture → stroke points; commit to canvasDrawings" },
        { file: "components/canvas/PlaygroundCanvasDrawLayer.tsx", pkg: "canvas", role: "SVG layer rendering strokes in flow coordinates" },
        { file: "nodes/ShapeNode.tsx / TextNode.tsx / FrameNode.tsx", pkg: "canvas", role: "Shape/text/frame node renderers; frames drag-group their children" },
        { file: "hooks/useCanvasFrameOps.ts", pkg: "hooks", role: "Frame membership + move-children logic" }
      ]
    },

    /* ============================ GENERATION ============================ */

    {
      id: "lifecycle",
      title: "Generation lifecycle (shared core)",
      category: "Generation",
      summary: "Every AI action funnels through POST /api/generate: one spawned agent, a file watcher, SSE progress, and skeleton nodes that become real iterations. Other generation flows reference this.",
      improve: "The one-run lock is server-side but the queue is client-side (useChatSubmit's generationQueueRef) — a second browser tab can't see it. Move the queue behind POST /api/generate (202 + position), expose it in ?action=status, and give the SSE client reconnect-with-backoff instead of relying on the fallback poll.",
      steps: [
        { from: "hooks",  to: "canvas",  label: "1. Announce start", passes: "GENERATION_START_EVENT {componentId, parentNodeId, iterationCount, gridLayout?, renderMode…} → useGenerationLifecycle creates amber skeleton nodes + dashed edges" },
        { from: "hooks",  to: "server",  label: "2. Start the run", passes: "POST /api/generate {prompt, componentId, iterationCount, model, source, provider, claudeCodeOptions, htmlFolder?|jsxFile?}" },
        { from: "server", to: "fs",      label: "3. Lock + watch", passes: "writeLockfile(pid, componentId); startFileWatcher on the output dir → emits 'iteration-added'; generation timer arms a timeout kill" },
        { from: "server", to: "agent",   label: "4. Spawn", passes: "spawnAgent(provider, {model, effort, maxBudgetUsd, maxTurns}); the prompt is written to stdin; stdout JSONL parsed for session id / errors" },
        { from: "agent",  to: "fs",      label: "5. Agent writes files", passes: "Name.iteration-N.tsx / html iteration folders / new pages — per the prompt's file-naming contract" },
        { from: "server", to: "hooks",   label: "6. Progress via SSE", passes: "GET /api/generate?action=events → {type:'iteration-added'} per file, {type:'done'} at the end", kind: "return" },
        { from: "hooks",  to: "server",  label: "7. Scan on each ping", passes: "useIterationScan diffs GET /api/html-pages|oncanvas-components|iterations against knownIterations" },
        { from: "hooks",  to: "canvas",  label: "8. Materialize", passes: "Each new file replaces a skeleton with a real iteration node; GENERATION_COMPLETE_EVENT (or ERROR with stderr/stream-json details) ends the run", kind: "return" }
      ],
      trace: [
        { file: "hooks/useGenerationLifecycle.ts", pkg: "hooks", role: "Listens for GENERATION_START/COMPLETE/ERROR; creates skeletons; opens SSE; resume-after-reload; timers" },
        { file: "hooks/useGenerationCoordination.ts", pkg: "hooks", role: "Shared refs: generationInfo, isGenerating, nodes access, knownIterations, scan mutex" },
        { file: "nodes/SkeletonIterationNode.tsx", pkg: "canvas", role: "Amber dashed placeholder shown while the agent works" },
        { file: "server/routes/generate.ts", pkg: "server", role: "POST: lockfile → watcher → timer → spawnAgent → stdin prompt; JSONL parse; SSE 'events'; DELETE cancels; GET status" },
        { file: "server/lib/generation-lockfile.ts", pkg: "server", role: "One-run-at-a-time lock + orphan recovery on module load" },
        { file: "server/lib/generation-file-watcher.ts", pkg: "server", role: "Watches the output dir; each new iteration file → 'iteration-added' event" },
        { file: "server/lib/generation-timer.ts", pkg: "server", role: "Timeout: SIGTERM then SIGKILL the agent" },
        { file: "server/lib/claude-jsonl.ts", pkg: "server", role: "Parses the agent's stream-json stdout: session id, assistant text (used in error messages)" },
        { file: "lib/providers/claude-code.ts (+ registry.ts, types.ts)", pkg: "lib", role: "spawnAgent: builds the claude CLI invocation from model/effort/options" },
        { file: "hooks/useIterationScan.ts", pkg: "hooks", role: "On iteration-added/fallback poll: fetch lists, diff vs knownIterations, add iteration nodes + edges" },
        { file: "nodes/IterationNode.tsx", pkg: "canvas", role: "The materialized variation: preview, adopt, iterate-again, open isolated" }
      ]
    },

    {
      id: "drag-iterate",
      title: "Drag to create variations",
      category: "Generation",
      summary: "Drag out from a node's edge to sketch a rows×cols grid of ghost slots; release starts a generation for that many variations.",
      improve: "The next-iteration-number fetch happens on release, adding latency right at the moment of commitment. Prefetch the lists when the drag STARTS (the user is already committed to the gesture) so release is instant; bonus: the ghost slots could then show their real iteration numbers.",
      steps: [
        { from: "user",   to: "canvas",  label: "Drag from node edge", passes: "Pointer drag from a component/iteration node's iterate handle" },
        { from: "canvas", to: "hooks",   label: "Live grid math", passes: "useDragToIterate + lib/drag-ghost-grid computeDragGridRaw → rows×cols from drag distance; ghost bounding node + DragGhostNode placeholders" },
        { from: "hooks",  to: "prompts", label: "On release: build prompt", passes: "html-prompts / jsx-prompts / registry iterationPrompt with componentId, count, startNumber (next free iteration number from the relevant list endpoint)" },
        { from: "hooks",  to: "canvas",  label: "Announce", passes: "GENERATION_START_EVENT with gridLayout {rows, cols} so skeletons land in the sketched grid" },
        { from: "hooks",  to: "server",  label: "Start", passes: "POST /api/generate {prompt, componentId, iterationCount, model, source:'drag', htmlFolder?|jsxFile?, provider fields}" },
        { from: "server", to: "agent",   label: "→ shared lifecycle", passes: "Spawn, watch, SSE — see 'Generation lifecycle'" },
        { from: "hooks",  to: "canvas",  label: "Ghosts → skeletons → iterations", passes: "Ghost grid clears; skeletons fill the grid; scan replaces them with real nodes", kind: "return" }
      ],
      trace: [
        { file: "nodes/shared/IterateDialog.tsx", pkg: "canvas", role: "Hosts the drag interaction + ghost overlay on each node (DragSelectionOverlay)" },
        { file: "hooks/useDragToIterate.ts", pkg: "hooks", role: "Drag state machine; on release fetches next iteration number (GET html-pages/oncanvas-components/iterations), builds the prompt, POSTs /api/generate" },
        { file: "lib/drag-ghost-grid.ts", pkg: "lib", role: "computeDragGridRaw (distance → rows×cols) + buildGhostBoundingNode" },
        { file: "nodes/DragGhostNode.tsx", pkg: "canvas", role: "The dashed ghost slots shown while dragging" },
        { file: "lib/html-prompts.ts / lib/jsx-prompts.ts", pkg: "lib", role: "Wrap prompts/html-*.prompt.ts and jsx-*.prompt.ts for frame targets" },
        { file: "prompts/iteration.prompt.ts (via registry.tsx)", pkg: "prompts", role: "Registry-component variant of the iteration prompt" },
        { file: "server/routes/generate.ts", pkg: "server", role: "Shared lifecycle (see that flow)" },
        { file: "hooks/useIterationScan.ts", pkg: "hooks", role: "Materializes results into the sketched grid" }
      ]
    },

    {
      id: "dialog-iterate",
      title: "Iterate via the dialog",
      category: "Generation",
      summary: "Open a node's iterate dialog, pick count / model / skill / instructions, submit.",
      improve: "Copy-prompt already exists but you can't SEE the assembled prompt before submitting. Add a collapsible 'view prompt' preview in the dialog — cheap (the string is already built) and it demystifies what the skill/instructions/styling toggles actually change.",
      steps: [
        { from: "user",   to: "canvas",  label: "Open dialog on a node", passes: "IterateDialog with the node's componentId / htmlFolder / jsxFile" },
        { from: "canvas", to: "stores",  label: "Options", passes: "Model pill reads model-settings-store (enabled models); skill picker loads /api/skills; count via dropdown or dragger" },
        { from: "canvas", to: "prompts", label: "Build prompt on submit", passes: "iteration / iteration-from-iteration (when iterating an iteration) with count, startNumber, custom instructions, skill section, styling mode" },
        { from: "canvas", to: "hooks",   label: "Announce", passes: "GENERATION_START_EVENT (skeletons)" },
        { from: "canvas", to: "server",  label: "Start", passes: "POST /api/generate {prompt, componentId, iterationCount, model, source, provider fields}" },
        { from: "server", to: "agent",   label: "→ shared lifecycle", passes: "See 'Generation lifecycle'" }
      ],
      trace: [
        { file: "nodes/shared/IterateDialog.tsx", pkg: "canvas", role: "The dialog: count, instructions, submit; also owns copy-prompt-to-clipboard" },
        { file: "nodes/shared/iterate-dialog/useIterateDialogState.ts", pkg: "canvas", role: "Dialog state: skill selection, model, count" },
        { file: "nodes/shared/iterate-dialog/dropdowns.tsx / parts.tsx", pkg: "canvas", role: "Model pill dropdown (model-settings-store), variation count dropdown, useAvailableModels" },
        { file: "stores/model-settings-store.ts", pkg: "stores", role: "Active provider + enabled models (persisted)" },
        { file: "prompts/iteration.prompt.ts / iteration-from-iteration.prompt.ts", pkg: "prompts", role: "Prompt assembly (exposed through registry.tsx helpers)" },
        { file: "lib/generation-body.ts", pkg: "lib", role: "getProviderFields(): provider, model, claudeCodeOptions injected into the POST body" },
        { file: "server/routes/generate.ts", pkg: "server", role: "Shared lifecycle" }
      ]
    },

    {
      id: "chat-freeform",
      title: "Chat: generate / iterate from the composer",
      category: "Generation",
      summary: "The docked chat routes one submit to the right prompt: freeform creation, iterating a referenced node, or editing — with @-references and an auto screenshot.",
      improve: "Since the presence bubbles were removed, a submit that lands while a run is active queues SILENTLY (the queue in useChatSubmit still works, it's just invisible). Add a small 'queued (1)' badge on the chat pill — restores the lost feedback without resurrecting the whole presence layer.",
      steps: [
        { from: "user",  to: "chat",    label: "Type + @-reference + submit", passes: "Text, inline references (nodes/images picked via components/ui/inline-reference), selected skill, model" },
        { from: "chat",  to: "hooks",   label: "Route the submit", passes: "useChatSubmit picks a target: referenced node → iteration/iteration-from-iteration; element selections → element-iteration; no target → freeform-reference" },
        { from: "hooks", to: "lib",     label: "Screenshot the target", passes: "captureAndSaveScreenshot (html-to-image → PNG) → POST /api/screenshot → saved path goes into the prompt as visual context" },
        { from: "hooks", to: "prompts", label: "Assemble", passes: "Chosen prompt fn + custom instructions + skill section + styling mode + screenshotPath + referenceNodesSection" },
        { from: "hooks", to: "canvas",  label: "Announce", passes: "GENERATION_START_EVENT {targetNodeId, flowPosition} — freeform runs get a standalone skeleton at the drop position" },
        { from: "hooks", to: "server",  label: "Start", passes: "POST /api/generate {prompt, componentId, iterationCount, model, source:'chat', skillIds, htmlFolder?|jsxFile?}" },
        { from: "server",to: "agent",   label: "→ shared lifecycle", passes: "See 'Generation lifecycle'" }
      ],
      trace: [
        { file: "components/chat/DockedChatBar.tsx", pkg: "chat", role: "Composer: contenteditable input, skill picker, model pill (useModelCycle), attachments, submit" },
        { file: "components/ui/inline-reference.tsx + inline-reference/dom-engine.ts", pkg: "chat", role: "@-mention engine: reference pills for canvas nodes/images inside the input" },
        { file: "hooks/useChatAttachments.ts", pkg: "hooks", role: "Image attachments for the message" },
        { file: "hooks/useChatSubmit.ts", pkg: "hooks", role: "The router: resolves target node, picks the prompt variant, screenshots, POSTs /api/generate; queues if a run is already active" },
        { file: "lib/captureAndSaveScreenshot.ts", pkg: "lib", role: "html-to-image capture → POST /api/screenshot → {path}" },
        { file: "server/routes/screenshot.ts", pkg: "server", role: "Saves the PNG; the path is embedded in the prompt for the agent to view" },
        { file: "prompts/freeform-reference.prompt.ts / edit.prompt.ts", pkg: "prompts", role: "Freeform + edit prompt variants" },
        { file: "prompts/iteration*.prompt.ts (via registry.tsx)", pkg: "prompts", role: "Targeted iteration variants" },
        { file: "server/routes/generate.ts", pkg: "server", role: "Shared lifecycle" }
      ]
    },

    {
      id: "chat-edit-element",
      title: "Chat: edit a selected element",
      category: "Generation",
      summary: "Alt+click picks concrete DOM elements inside a rendered node; the chat then scopes the generation to those elements.",
      improve: "Element descriptors are captured from the rendered DOM and can go stale if the node regenerates before submit. Re-validate each selection at submit time and drop-with-a-warning any element that no longer matches, instead of sending the agent a stale selector.",
      steps: [
        { from: "user",   to: "canvas",  label: "Alt+click element(s)", passes: "useElementSelection captures the element's selector/summary inside the node; ElementHighlight draws hover + selection boxes" },
        { from: "canvas", to: "chat",    label: "Selections attach to chat", passes: "elementSelections[] ride on the ChatSubmitPayload" },
        { from: "chat",   to: "prompts", label: "Scoped prompt", passes: "elementIterationPrompt(componentId, startNumber, count, elementSelections, instructions, …screenshotPath)" },
        { from: "chat",   to: "server",  label: "Start", passes: "POST /api/generate — same body shape as chat, prompt scoped to the selected elements" },
        { from: "server", to: "agent",   label: "→ shared lifecycle", passes: "Agent told to change ONLY the selected elements' design" }
      ],
      trace: [
        { file: "hooks/useElementSelection.ts", pkg: "hooks", role: "Alt+hover/click hit-testing inside rendered nodes; builds element descriptors" },
        { file: "components/canvas/ElementHighlight.tsx", pkg: "canvas", role: "Hover box + persistent selection boxes overlay" },
        { file: "components/chat/DockedChatBar.tsx", pkg: "chat", role: "Shows active element chips; submits with elementSelections" },
        { file: "hooks/useChatSubmit.ts", pkg: "hooks", role: "hasElementSelections branch → generateElementIterationPrompt" },
        { file: "prompts/element-iteration.prompt.ts", pkg: "prompts", role: "The scoped-edit prompt (also its from-iteration variant)" },
        { file: "server/routes/generate.ts", pkg: "server", role: "Shared lifecycle" }
      ]
    },

    {
      id: "create-page-ai",
      title: "Create a new page with AI",
      category: "Generation",
      summary: "Describe a page; the agent writes a real route into the host app and registers it in the playground.",
      improve: "componentId is the constant 'chat-new-page', so two concurrent page creations collide in status tracking and toasts. Derive a per-request id (e.g. new-page-<slug-guess>-<ts>) — the rest of the pipeline already keys on componentId.",
      steps: [
        { from: "user",  to: "canvas",  label: "New-page dialog", passes: "Free-text description (useCanvasCreatePage.handleCreatePage)" },
        { from: "hooks", to: "server",  label: "Load default skill", passes: "GET /api/skills → default skill prompt text (loadDefaultSkillPrompt)" },
        { from: "hooks", to: "prompts", label: "Assemble", passes: "createPagePrompt({description, skillSection, stylingConstraint, reservedSlugs}) — agent must pick a free kebab-case slug" },
        { from: "hooks", to: "server",  label: "Start", passes: "POST /api/generate {prompt, componentId:'chat-new-page', iterationCount:0, source:'new_page', provider fields}" },
        { from: "server",to: "agent",   label: "Agent writes the page", passes: "src/app/<slug>/page.tsx + registers a leaf in registry.tsx (the prompt instructs both)" },
        { from: "agent", to: "registry",label: "Registry updated", passes: "Vite HMR reloads registry.tsx → the page appears in the sidebar and can be dropped on canvas", kind: "return" }
      ],
      trace: [
        { file: "hooks/useCanvasCreatePage.ts", pkg: "hooks", role: "Dialog state + handleCreatePage: skill load, prompt build, POST, success toast" },
        { file: "lib/load-default-skill-prompt.ts", pkg: "lib", role: "GET /api/skills → default skill's prompt text" },
        { file: "prompts/create-page.prompt.ts", pkg: "prompts", role: "Full page brief: slug rules, host-shell expectations, canvas registration steps" },
        { file: "server/routes/generate.ts", pkg: "server", role: "Shared lifecycle (no skeletons — iterationCount 0)" },
        { file: "registry.tsx", pkg: "registry", role: "The agent adds the new page leaf here; HMR surfaces it" },
        { file: "components/canvas/PlaygroundSidebar.tsx", pkg: "sidebar", role: "Shows the new page in the tree" }
      ]
    },

    {
      id: "adopt",
      title: "Adopt an iteration",
      category: "Generation",
      summary: "Promote a variation: the agent rewrites the base component/frame source to match the adopted design.",
      improve: "Adoption rewrites the base source with no backup — if the agent mangles it, the original is gone. Snapshot the pre-adopt source (a .bak next to it, or a git stash) and surface an 'Undo adopt' action on the parent node for one generation cycle.",
      steps: [
        { from: "user",   to: "canvas",  label: "Adopt on an iteration node", passes: "Confirm dialog opens; a thumbnail is captured client-side (useIterationScreenshot, html-to-image)" },
        { from: "canvas", to: "prompts", label: "Build adopt prompt", passes: "jsx variant (base file ← jsxFile), html variant (folder ← iteration folder), or registry variant (sourcePath ← filename)" },
        { from: "canvas", to: "hooks",   label: "Announce (edit mode)", passes: "GENERATION_START_EVENT {editMode:true, iterationCount:0} — no skeletons" },
        { from: "canvas", to: "server",  label: "Start", passes: "POST /api/generate {prompt, componentId:'adopt-<id>', source:'adopt', htmlFolder?}" },
        { from: "server", to: "agent",   label: "Agent rewrites the base", passes: "The original component/frame source now matches the adopted iteration" },
        { from: "agent",  to: "canvas",  label: "Done", passes: "GENERATION_COMPLETE → node badge 'adopted'; canvas pans to the parent (FIT_COMPONENT_NODES_EVENT listener in PlaygroundCanvas)", kind: "return" }
      ],
      trace: [
        { file: "nodes/IterationNode.tsx", pkg: "canvas", role: "Adopt button + confirm dialog with thumbnail" },
        { file: "hooks/useIterationAdoption.ts", pkg: "hooks", role: "The whole sequence: prompt choice, start event (editMode), POST, status events, adopted badge" },
        { file: "hooks/useIterationScreenshot.ts", pkg: "hooks", role: "Captures the iteration DOM to a data-URL for the confirm dialog (only consumer: adoption)" },
        { file: "lib/jsx-prompts.ts → prompts/jsx-*.prompt / lib/html-prompts.ts → prompts/html-adopt.prompt.ts / prompts/adopt.prompt.ts", pkg: "prompts", role: "The three adopt prompt variants" },
        { file: "server/routes/generate.ts", pkg: "server", role: "Shared lifecycle (edit mode: no new files expected, base file rewritten)" },
        { file: "app/PlaygroundCanvas.tsx", pkg: "canvas", role: "FIT_COMPONENT_NODES_EVENT listener pans/fits to the updated parent" }
      ]
    },

    /* ============================ SYSTEM & TOOLING ============================ */

    {
      id: "discovery",
      title: "Discovery scan (analyze the host codebase)",
      category: "System & tooling",
      summary: "Point the agent at a host page/component; it analyzes props and registers it so it can live on the canvas.",
      improve: "Analysis is one component per POST, one click each — scanning a page with 10 children is 10 round-trips of clicking. Add a batch mode (analyze page + all children in one request) with per-item progress over the existing SSE channel.",
      steps: [
        { from: "user",   to: "modals",  label: "Pick a target", passes: "DiscoveryModal / PlaygroundClient: {id, path, name, type:'page'|'component', parentId?}" },
        { from: "modals", to: "server",  label: "Analyze", passes: "POST /api/discover/analyze {id, path, name, type, model?, provider?} (409 if that id is already analyzing)" },
        { from: "server", to: "agent",   label: "Spawn analysis", passes: "discoveryAnalyzePrompt(+ live props snapshot when available) → agent reads the host source" },
        { from: "agent",  to: "fs",      label: "Record", passes: "data/discovery.json updated with the component entry (props, mock data pointers)" },
        { from: "server", to: "sidebar", label: "Consume", passes: "GET /api/discover → tree; useSidebarDiscoverySync merges frames + jsx components + design showcase", kind: "return" },
        { from: "sidebar",to: "registry",label: "Renderable", passes: "Discovered entries resolve through the registry so they can be dropped on canvas" }
      ],
      trace: [
        { file: "components/modals/DiscoveryModal.tsx", pkg: "modals", role: "Scan UI: list, re-scan, delete entries (GET/POST/DELETE /api/discover)" },
        { file: "app/PlaygroundClient.tsx", pkg: "canvas", role: "Kicks analyze requests for pages/child components; tracks per-id progress" },
        { file: "server/routes/discover.ts", pkg: "server", role: "GET/POST/DELETE discovery.json; POST /analyze spawns the agent with the analyze prompt; props snapshot injection" },
        { file: "prompts/discovery.prompt.ts / discovery-analyze.prompt.ts", pkg: "prompts", role: "Scan + per-component analysis prompts" },
        { file: "data/discovery.json (generated)", pkg: "fs", role: "The persisted discovery database" },
        { file: "components/canvas/sidebar/useSidebarDiscoverySync.ts", pkg: "sidebar", role: "Merges discovery + html-pages + oncanvas-components + design showcase into the tree" }
      ]
    },

    {
      id: "design-system",
      title: "Design system: setup, generate & inject",
      category: "System & tooling",
      summary: "Install the design CLI into the host, have the agent derive DESIGN.md from the codebase, then inject it into every generation.",
      improve: "injectIntoGeneration is all-or-nothing. Let it scope (tokens only / full rules) and, after each generation, run the existing lint endpoint against the new files so drift from DESIGN.md is flagged right on the iteration node.",
      steps: [
        { from: "user",   to: "modals",  label: "Design System modal", passes: "Status check first: GET /api/design/status" },
        { from: "modals", to: "server",  label: "Setup", passes: "POST /api/design/setup → runs 'bun add --dev' against the HOST project (host must use Bun)" },
        { from: "modals", to: "server",  label: "Generate", passes: "POST /api/design/generate-from-codebase → spawns the agent to derive tokens/rules" },
        { from: "agent",  to: "fs",      label: "Write", passes: "DESIGN.md (+ preview showcase via /api/design/preview-showcase); editable via GET/PUT /api/design/file" },
        { from: "modals", to: "server",  label: "Maintain", passes: "POST lint / diff / export; GET spec — all wrap the design CLI" },
        { from: "stores", to: "prompts", label: "Inject", passes: "design-system-store.injectIntoGeneration=true → generation prompts tell the agent to follow DESIGN.md", kind: "return" }
      ],
      trace: [
        { file: "components/modals/DesignSystemModal.tsx", pkg: "modals", role: "The modal shell (status, sections, toggle)" },
        { file: "components/modals/design-system/useDesignSystemCli.ts", pkg: "modals", role: "All fetches: status, setup, file read/write, generate, lint, diff, export, spec" },
        { file: "server/routes/design.ts", pkg: "server", role: "11 endpoints wrapping the design CLI + agent generation + showcase files" },
        { file: "stores/design-system-store.ts", pkg: "stores", role: "Persisted injectIntoGeneration flag" },
        { file: "prompts/shared-sections.ts", pkg: "prompts", role: "Styling constraint / design-system section woven into generation prompts" },
        { file: "components/canvas/sidebar/DesignSystemPreviewCard.tsx", pkg: "sidebar", role: "Showcase preview card (GET /api/design/preview-showcase)" }
      ]
    },

    {
      id: "models-skills",
      title: "Model settings & skills catalog",
      category: "System & tooling",
      summary: "Two configuration surfaces that shape every generation request: which model runs it, and which skill prompt seasons it.",
      improve: "The model list comes from the static catalog — it never checks what the installed claude CLI actually supports. Have GET /api/models probe the CLI once (version + models) and grey out unavailable entries, so a failed run is caught at selection time instead of at spawn.",
      steps: [
        { from: "user",   to: "modals",  label: "Model settings", passes: "ModelSettingsModal → model-settings-store.fetchModels()" },
        { from: "stores", to: "server",  label: "List models", passes: "GET /api/models → per-provider catalog (lib/providers + lib/model-catalog)" },
        { from: "stores", to: "lib",     label: "Into every run", passes: "Persisted selection → lib/generation-body.getProviderFields() → {provider, model, claudeCodeOptions} on each POST /api/generate", kind: "return" },
        { from: "user",   to: "modals",  label: "Skills catalog", passes: "SkillsCatalogModal: GET /api/skills; add/update/remove/preview endpoints write skill files" },
        { from: "server", to: "fs",      label: "Skill files", passes: "skills/ folder — each skill is a prompt module (skills/index.ts catalog)" },
        { from: "chat",   to: "prompts", label: "Into the prompt", passes: "Picked skill (chat pill / iterate dialog) → formatSkillSection(text) merged into the generation prompt", kind: "return" }
      ],
      trace: [
        { file: "components/modals/ModelSettingsModal.tsx", pkg: "modals", role: "Enable/disable models per provider; Claude Code options" },
        { file: "stores/model-settings-store.ts", pkg: "stores", role: "Persisted (v3): active provider, enabled models, claudeCodeOptions, fetchModels" },
        { file: "server/routes/models.ts", pkg: "server", role: "GET /api/models — available models per provider" },
        { file: "lib/generation-body.ts", pkg: "lib", role: "getProviderFields() — the bridge from settings to every generate POST" },
        { file: "components/modals/SkillsCatalogModal.tsx", pkg: "modals", role: "Catalog CRUD UI (/api/skills/add|update|remove|preview)" },
        { file: "hooks/useSkills.ts + hooks/useImpeccableSkillPicker.ts", pkg: "hooks", role: "Skill list fetch + picker state shared by chat and iterate dialog" },
        { file: "server/routes/skills.ts", pkg: "server", role: "Reads/writes the skills/ folder" },
        { file: "prompts/shared-sections.ts", pkg: "prompts", role: "formatSkillSection embeds the skill text into prompts" }
      ]
    },

    {
      id: "open-in",
      title: "Open project in editor",
      category: "System & tooling",
      summary: "Header menu launches the host project in Cursor / Finder / Codex / GitHub Desktop (macOS only).",
      improve: "The route hard-rejects anything non-darwin (execFile 'open') — on this very Windows machine the menu is dead weight. Add win32 (explorer, 'cursor'/'code' CLIs on PATH) and linux (xdg-open) branches, and have the client hide targets the server says are unavailable.",
      steps: [
        { from: "user",   to: "header", label: "Pick a target", passes: "Open-in menu (default persisted in localStorage 'playground-open-in-default')" },
        { from: "header", to: "hooks",  label: "Request", passes: "useOpenIn → POST /api/open-in {target}" },
        { from: "hooks",  to: "server", label: "Validate + run", passes: "server/routes/open-in.ts: macOS check, then execFile('open', args)" },
        { from: "server", to: "agent",  label: "Launch app", passes: "e.g. open -a Cursor <projectPath>; codex uses a codex:// deep link; finder uses -R reveal" }
      ],
      trace: [
        { file: "app/PlaygroundHeader.tsx", pkg: "header", role: "The Open-in dropdown (project name from useProjectContext)" },
        { file: "hooks/useOpenIn.ts", pkg: "hooks", role: "Target list + icons + persisted default + POST" },
        { file: "hooks/useProjectContext.ts", pkg: "hooks", role: "GET /api/open-in → {projectName, projectPath, platform}" },
        { file: "server/routes/open-in.ts", pkg: "server", role: "execFile('open', target-specific args); rejects non-darwin platforms" }
      ]
    },

    {
      id: "isolated",
      title: "Isolated iteration route",
      category: "System & tooling",
      summary: "/playground/iterations/:slug renders one component/iteration full-screen, outside the canvas.",
      improve: "Resolution only checks flatRegistry, so HTML-frame and JSX-frame iterations have no isolated view. Extend the resolver to fall back to /api/html-pages and oncanvas-loader so every node's 'open isolated' works, not just registry components.",
      steps: [
        { from: "user",    to: "canvas",   label: "Open isolated view", passes: "Link from an iteration/component node → /playground/iterations/<slug>" },
        { from: "canvas",  to: "registry", label: "Resolve", passes: "IterationIsolatedPage looks the slug up in flatRegistry → {Component, props}" },
        { from: "stores",  to: "canvas",   label: "Theme", passes: "preview-color-scheme-store → previewSchemeClass (auto/light/dark) wraps the render" }
      ],
      trace: [
        { file: "dev-entry.tsx", pkg: "canvas", role: "Route /iterations/:slug" },
        { file: "iterations/IterationIsolatedPage.tsx", pkg: "canvas", role: "Slug → flatRegistry lookup → full-screen render" },
        { file: "registry.tsx", pkg: "registry", role: "flatRegistry provides the component + props" },
        { file: "stores/preview-color-scheme-store.ts", pkg: "stores", role: "Persisted scheme; previewSchemeClass applied to the wrapper" }
      ]
    },

    {
      id: "shortcuts",
      title: "Keyboard shortcuts & overrides",
      category: "System & tooling",
      summary: "Every canvas action routes through a keybinding table the user can override.",
      improve: "Overrides aren't checked for conflicts — two actions can silently share a chord and only one wins. Validate on save in the shortcuts modal and show which existing binding a new chord would shadow.",
      steps: [
        { from: "user",   to: "canvas", label: "Keypress", passes: "useCanvasKeyboard → matchesAction(event, actionId)" },
        { from: "canvas", to: "lib",    label: "Resolve binding", passes: "lib/keybindings.ts merges defaults with user overrides" },
        { from: "lib",    to: "stores", label: "Overrides", passes: "keybinding-store (persisted) — edited in KeyboardShortcutsModal" },
        { from: "canvas", to: "hooks",  label: "Dispatch action", passes: "delete / duplicate / draw-tool / arrange / clear handlers in the canvas hooks", kind: "return" }
      ],
      trace: [
        { file: "hooks/useCanvasKeyboard.ts", pkg: "hooks", role: "Global keydown listener; guards against typing contexts; dispatches actions" },
        { file: "lib/keybindings.ts", pkg: "lib", role: "Default table + matchesAction(event, action) with override merge" },
        { file: "stores/keybinding-store.ts", pkg: "stores", role: "Persisted user overrides" },
        { file: "components/modals/KeyboardShortcutsModal.tsx", pkg: "modals", role: "View + rebind UI" }
      ]
    },

    /* ============================ ADDED IN SECOND PASS ============================ */

    {
      id: "html-file-drop",
      title: "Drop an .html file onto the canvas",
      category: "Canvas basics",
      summary: "A dropped HTML file becomes a persisted frame-N page, wrapped so fragments render standalone.",
      improve: "frame-N numbering scans BOTH list endpoints client-side before the PUT — same race as blank-frame creation. Let the server assign the frame number inside the PUT and return it.",
      steps: [
        { from: "user",   to: "hooks",  label: "Drop .html/.htm file", passes: "File text read in the browser; wrapHtmlFragment() makes partial markup a full document" },
        { from: "hooks",  to: "server", label: "Find next frame number", passes: "GET /api/html-pages + GET /api/oncanvas-components → max frame-(N) across both" },
        { from: "hooks",  to: "server", label: "Create the frame", passes: "PUT /api/html-pages {name:'frame-N', content: wrapped HTML}" },
        { from: "server", to: "fs",     label: "Write", passes: "html-pages dir/frame-N/index.html" },
        { from: "server", to: "canvas", label: "Place node", passes: "{page:{id, folder}} → Node{type:'component', renderMode:'html', htmlFolder} at the drop position (x offset per file)", kind: "return" }
      ],
      trace: [
        { file: "hooks/useCanvasDragDrop.ts", pkg: "hooks", role: "onDrop html-file branch: reads text, wraps fragments, computes frame-N, PUTs, creates nodes" },
        { file: "server/routes/html-pages.ts", pkg: "server", role: "PUT persists the frame folder + index.html" },
        { file: "nodes/ComponentNode.tsx", pkg: "canvas", role: "Renders the new frame (html renderMode) — ready to iterate on" }
      ]
    },

    {
      id: "node-delete",
      title: "Delete nodes (and their files)",
      category: "Canvas basics",
      summary: "Deleting a node also deletes what it represents on disk: iteration files, image files.",
      improve: "The disk deletes are fire-and-forget — if a DELETE fails (file locked, server hiccup) the canvas and the filesystem silently desync. Await the responses and toast failures, leaving the node in place when its file survives.",
      steps: [
        { from: "user",   to: "canvas", label: "Select + Delete key (or node ✕)", passes: "Selected node ids → useCanvasKeyboard → useCanvasNodeDelete" },
        { from: "hooks",  to: "server", label: "Iteration nodes", passes: "DELETE /api/iterations — removes the iteration file/folder; knownIterations pruned so scans don't resurrect it" },
        { from: "hooks",  to: "server", label: "Image nodes", passes: "DELETE /api/images {path} — removes the stored image" },
        { from: "hooks",  to: "stores", label: "Draw strokes", passes: "Selected strokes removed via playground-draw-store" },
        { from: "hooks",  to: "canvas", label: "Remove + persist", passes: "Nodes/edges filtered out; persistence effect saves the new state", kind: "return" }
      ],
      trace: [
        { file: "hooks/useCanvasKeyboard.ts", pkg: "hooks", role: "Delete/Backspace → delete action (guarded while typing)" },
        { file: "hooks/useCanvasNodeDelete.ts", pkg: "hooks", role: "Routes per node type: iterations → API, images → API, shapes/text/frames → local only" },
        { file: "server/routes/iterations.ts", pkg: "server", role: "DELETE removes the iteration file (html folder or .tsx)" },
        { file: "server/routes/images.ts", pkg: "server", role: "DELETE removes the image file" },
        { file: "stores/playground-draw-store.ts", pkg: "stores", role: "Stroke selection state for deleting drawings" }
      ]
    },

    {
      id: "auto-arrange",
      title: "Auto-arrange the canvas",
      category: "Canvas basics",
      summary: "One action lays every component cluster out as a bento grid and fits the view.",
      improve: "Arrange teleports nodes and ignores user intent — pinned positions and frame groupings are overwritten. Respect frame membership as fixed clusters and animate position changes (FLIP) so the reshuffle is followable.",
      steps: [
        { from: "user",   to: "canvas", label: "Arrange action", passes: "PLAYGROUND_AUTO_ARRANGE_EVENT CustomEvent {fitView} (header button / shortcut / post-generation)" },
        { from: "canvas", to: "hooks",  label: "Handle", passes: "useCanvasAutoArrange → computeAutoArrangePositions(nodes, edges, collapsedIds, zoom)" },
        { from: "hooks",  to: "lib",    label: "Layout math", passes: "lib/canvas-auto-arrange: per-component bento clusters, row packing, zoom-aware label padding, collision passes" },
        { from: "lib",    to: "canvas", label: "Apply", passes: "Position map → setNodes; fitView(FITVIEW_AFTER_ARRANGE) after a 50ms settle", kind: "return" }
      ],
      trace: [
        { file: "app/PlaygroundHeader.tsx", pkg: "header", role: "Arrange button dispatches the event" },
        { file: "hooks/useCanvasAutoArrange.ts", pkg: "hooks", role: "Event listener; computes + applies positions; delayed fitView" },
        { file: "lib/canvas-auto-arrange.ts", pkg: "lib", role: "computeAutoArrangePositions — the whole bento algorithm (tuning constants now live here)" }
      ]
    },

    {
      id: "interactive-mode",
      title: "Interactive mode on a node",
      category: "Canvas basics",
      summary: "Flip one node from canvas-object to live UI: pointer events pass through to the rendered component.",
      improve: "There's no persistent visual indicator that a node is interactive — easy to 'lose' a live node and wonder why the canvas won't pan over it. Add a colored outline + corner badge while active, and an Esc hint.",
      steps: [
        { from: "user",   to: "canvas", label: "Toggle interactive on a node", passes: "Component/Iteration node toolbar button" },
        { from: "canvas", to: "stores", label: "Claim", passes: "interactive-node-store.setInteractiveNodeId(id) — only ONE node can be live at a time" },
        { from: "stores", to: "canvas", label: "Behavior flip", passes: "That node stops being draggable, gets pointer-events; canvas drag/select is suppressed over it (useIsInteractiveNode)", kind: "return" },
        { from: "user",   to: "canvas", label: "Exit", passes: "Toggle again / click elsewhere → store cleared, node is a canvas object again" }
      ],
      trace: [
        { file: "nodes/ComponentNode.tsx / nodes/IterationNode.tsx", pkg: "canvas", role: "Toggle button; reads useIsInteractiveNode(id) to flip pointer behavior" },
        { file: "stores/interactive-node-store.ts", pkg: "stores", role: "Single interactiveNodeId — the exclusivity mechanism" },
        { file: "app/PlaygroundCanvas.tsx", pkg: "canvas", role: "Suppresses canvas-level drag/selection while a node is interactive" }
      ]
    },

    {
      id: "cancel-generation",
      title: "Cancel a running generation",
      category: "Generation",
      summary: "Stop the agent mid-run: process killed, lock released, skeletons cleared.",
      improve: "SIGTERM→SIGKILL stops the agent but half-written iteration files it already created stay on disk and get picked up by the next scan. Sweep files created after the run's startTime on cancel (the watcher knows them) so a cancel leaves no debris.",
      steps: [
        { from: "user",   to: "canvas", label: "Stop action", passes: "Cancel affordance while a run is active (chat pill / skeleton context)" },
        { from: "hooks",  to: "server", label: "Cancel", passes: "DELETE /api/generate" },
        { from: "server", to: "agent",  label: "Kill", passes: "currentProcess.kill SIGTERM, SIGKILL after 2s if still alive; timer cleared" },
        { from: "server", to: "fs",     label: "Release", passes: "removeLockfile(); stopFileWatcher(); log stream closed" },
        { from: "server", to: "hooks",  label: "Done", passes: "generationEvents 'done' → SSE {type:'done'} → GENERATION_COMPLETE/ERROR → skeletons removed", kind: "return" }
      ],
      trace: [
        { file: "hooks/useGenerationLifecycle.ts", pkg: "hooks", role: "Cancel call + cleanup of skeletons/timers on the done event" },
        { file: "server/routes/generate.ts", pkg: "server", role: "DELETE handler: kill process, clear lock/watcher/timer, emit done" },
        { file: "server/lib/generation-lockfile.ts", pkg: "server", role: "Lock released so the next run can start" },
        { file: "server/lib/generation-file-watcher.ts", pkg: "server", role: "Watcher stopped" },
        { file: "nodes/SkeletonIterationNode.tsx", pkg: "canvas", role: "Placeholders removed on completion" }
      ]
    },

    {
      id: "clear-canvas",
      title: "Clear the canvas",
      category: "Canvas basics",
      summary: "The eraser: cancels any run, deletes all iteration files, wipes nodes/edges/drawings and saved state.",
      improve: "It's the most destructive action in the app and it's one click after a confirm — add an escape hatch: download the canvas JSON (nodes + drawings) before wiping, so 'clear' is recoverable for the cost of a file.",
      steps: [
        { from: "user",   to: "header", label: "Clear all (eraser)", passes: "Confirmation, then useCanvasClear" },
        { from: "hooks",  to: "server", label: "Stop any run", passes: "DELETE /api/generate first — never delete files under a live agent" },
        { from: "hooks",  to: "server", label: "Delete iterations", passes: "GET /api/iterations → DELETE each (files removed from disk)" },
        { from: "hooks",  to: "canvas", label: "Wipe", passes: "Nodes, edges, drawings, knownIterations reset" },
        { from: "hooks",  to: "storage",label: "Persist emptiness", passes: "saveCanvasState writes the cleared state", kind: "return" }
      ],
      trace: [
        { file: "app/PlaygroundHeader.tsx", pkg: "header", role: "Eraser button (always visible since dev-mode removal)" },
        { file: "hooks/useCanvasClear.ts", pkg: "hooks", role: "The sequence: cancel run → enumerate → delete iterations → reset canvas state" },
        { file: "server/routes/generate.ts", pkg: "server", role: "DELETE cancels the active run" },
        { file: "server/routes/iterations.ts", pkg: "server", role: "GET lists, DELETE removes each iteration" },
        { file: "lib/canvas-persistence.ts", pkg: "lib", role: "Saves the now-empty canvas" }
      ]
    }
  ]
};
