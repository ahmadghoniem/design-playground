# Agent panel placement research

Research date: 2026-08-10. Sources are linked; cells marked **unverified** could not be confirmed from current docs, changelogs, or credible reviews.

---

## 1. Product survey

| Product | Category | Agent side | Library / layers side | Source URL |
| --- | --- | --- | --- | --- |
| v0 (Vercel) | AI UI builder | Left (nav + prompt/log column) | Left vertical nav (recent chats, knowledge); preview/code right | https://www.whitespace.ch/insights/blog/ai-powered-web-app-builders/ |
| Lovable | AI app builder | Left (chat panel) | No layers panel; live preview right | https://docs.lovable.dev/features/projects/editor |
| Bolt.new | AI app builder | Left (prompt + execution log) | Collapsible chat-history menu from left edge; preview/code right | https://www.whitespace.ch/insights/blog/ai-powered-web-app-builders/ |
| Replit Agent (Project Editor) | AI app builder | unverified (split panes; user-customizable) | File tree / tool dock typically left | https://docs.replit.com/learn/projects-and-artifacts/project-editor |
| Replit Design Canvas | AI canvas / design | Bottom / floating (Agent chat docked on canvas; bottom-center toolbar) | Library panel (side unverified) | https://docs.replit.com/design/core-components |
| Onlook | AI canvas (design-to-code) | Right (AI chat in right panel) | Left (layers / project structure) | https://howworks.trendz-ai.com/onlook/product_breakdown/ui-framework |
| Magic Patterns (screen editor) | AI UI builder | unverified (chat + preview; layers confirmed left) | Left (Layers sidebar) | https://www.magicpatterns.com/docs/documentation/get-started/adding-pages |
| Magic Patterns (Design System editor) | AI design-system builder | Right (unified chat) | Left (component list) | https://www.magicpatterns.com/docs/documentation/design-systems/editing/components |
| Subframe | AI design-to-code | unverified (“Ask AI” docked panel; dock side not documented) | Left (Pages, Layers, Insert) | https://docs.subframe.com/learn/editor/overview |
| Polymet | AI product designer / canvas | Left (chat area left of infinite canvas) | Top-left (project assets: components, pages, prototypes) | https://docs.polymet.ai/academy/projects-canvas |
| Uizard | AI UI designer | Bottom (Autodesigner prompt bar) | Left (elements, Magic features) | https://support.uizard.io/en/articles/7728147-guide-to-autodesigner |
| Galileo AI (UI design product) | AI UI generator | unverified | unverified | — |
| Relume Site Builder | AI site / wireframe builder | Contextual (Ask AI in edit panel; no persistent chat rail documented) | Left icon rail + edit/add panels | https://www.relume.io/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder |
| Framer (+ Framer Agents) | Design tool + AI website builder | Right (Agent tab in right sidebar) | Left (Pages, Layers, Assets) | https://www.framer.com/help/articles/how-to-build-a-website-from-scratch-with-framer-agents/ |
| Figma Design (+ agent) | Design tool + AI | Left (Agents tab in left navigation bar; also on-canvas prompt) | Left (navigation bar + layers); properties right | https://help.figma.com/hc/en-us/articles/37998629035799-Work-with-the-Figma-agent-in-design-files |
| Figma Make | AI prototype / app builder | unverified (AI chat + preview; forum reports bottom-left chat bar) | Left reasoning/history column in some builds | https://help.figma.com/hc/en-us/articles/31304412302231-Explore-Figma-Make |
| FigJam (+ AI) | Whiteboard + AI | Bottom / toolbar (Actions menu; no persistent side agent) | No layers panel (board-centric) | https://help.figma.com/hc/en-us/articles/16822138920343-Use-AI-tools-in-FigJam |
| Webflow AI Assistant | Site builder + AI | Right default (dock left or float also supported) | Left (Navigator, styles — classic Webflow) | https://webflow.com/updates/position-ai-assistant-to-fit-your-workflow |
| Play (createwithplay) | Mobile design tool + AI | unverified (Play AI Panel; side not documented) | unverified (Layers panel exists; macOS side not documented) | https://docs.createwithplay.com/en/articles/design-mode |
| Krea | AI creative suite | unverified (tool sidebar; not a classic agent rail) | Left (unified tool sidebar per redesign) | https://www.krea.ai/blog/redesign |
| Visual Electric | Framer plugin (image gen) | N/A (plugin, not standalone canvas agent) | N/A | https://www.framer.com/developers/plugins |
| Recraft | AI image / vector studio | Bottom or side (prompt panel docks bottom or side) | Context panel (selection-driven; side unverified) | https://www.recraft.ai/docs/recraft-studio/image-generation/prompt-panel |
| Spline | 3D design tool | unverified (no documented agent rail in core UI docs) | Left (outliner / layers); properties right | https://docs.spline.design/faf5ffed73e2494296661e028c73b92a |
| tldraw Make Real | Canvas + codegen | Bottom (API key + Make Real control strip) | Default tldraw library sidebar right (LTR) | https://tldraw.dev/blog/make-real-the-story-so-far |
| tldraw Agent starter kit | Canvas + agent | Right (chat panel) | Left (default tldraw menu/library zones) | https://tldraw.dev/starter-kits/agent |
| Excalidraw (shipping product) | Canvas | N/A (no shipping agent panel; library right in LTR) | Left (shape actions / compact tools); library right | https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/sidebar |
| Excalidraw ChatCanvas (open PR) | Canvas + agent prototype | Right (chat); left (assets/templates) | Left assets column in proposed layout | https://github.com/excalidraw/excalidraw/pull/10625 |
| Cursor | AI coding IDE | Right (secondary sidebar default for chat/agents) | Left (primary sidebar: Explorer, Git, etc.) | https://forum.cursor.com/t/how-can-i-open-the-chat-on-the-right-hand-side-by-default/7536 |
| VS Code Copilot Chat | AI coding IDE | Right (secondary sidebar default since Nov 2024) | Left (primary sidebar) | https://code.visualstudio.com/docs/agents/chat-view |
| Windsurf / Cascade | AI coding IDE | Left in VS Code; right in JetBrains (both draggable) | Opposite side from chat in each host | https://docs.windsurf.com/chat/overview |
| Zed Agent | AI coding IDE | Right default (`agent.dock: right`; configurable left/right/bottom) | Project/Git panels opposite agent in Agentic layout | https://zed.dev/docs/ai/parallel-agents |
| JetBrains AI Assistant | AI coding IDE | Right (AI Chat tool window on right toolbar) | Left (Project tool window) | https://www.jetbrains.com/help/ai-assistant/ai-chat.html |
| Claude Code (VS Code / Cursor ext.) | AI coding IDE | Right preferred (secondary sidebar); draggable | Left Activity Bar for sessions list | https://code.claude.com/docs/en/vs-code |
| Figma / Sketch / Framer (classic panels) | Design tools | N/A (pre-AI baseline) | Layers/pages left; inspector/properties right | https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar |
| Sketch | Design tool | N/A | Layers left; Inspector right | https://www.sketch.com/blog/sketch-interface/ |
| Photoshop | Design tool | N/A | Layers panel default workspace: right; properties/contextual panels right | https://helpx.adobe.com/photoshop/desktop/create-manage-layers/get-started-layers/work-with-the-layers-panel.html |
| Mozaiks (reference pattern) | AI workflow UI | Left (chat 50% in split mode) | Artifact/output right | https://docs.mozaiks.ai/architecture/frontend/chat-ui/layout-modes/ |

---

## 2. Counts (verified agent placement only)

Products with a confirmed agent/chat placement: **28** (excluding N/A classics and unverified rows).

| Agent placement | Count | Products |
| --- | ---: | --- |
| **Left** | 8 | v0, Lovable, Bolt.new, Polymet, Figma Design agent, Windsurf (VS Code), Mozaiks split, Magic Patterns Design System chat |
| **Right** | 11 | Onlook, Framer Agents, Cursor, VS Code Copilot Chat, JetBrains AI, Zed (default), tldraw Agent starter, Claude Code ext. (secondary sidebar), Webflow AI (default), Magic Patterns DS chat, Excalidraw ChatCanvas PR |
| **Bottom / floating / canvas-docked** | 6 | Uizard, Replit Design Canvas chat, Recraft prompt panel (bottom option), tldraw Make Real controls, FigJam AI (toolbar), Figma Make (bottom-left bar — forum only) |
| **Center / takeover** | 0 | — |
| **Unverified** | 9 | Replit Project Editor default, Subframe Ask AI dock side, Magic Patterns screen editor chat side, Play AI panel, Krea, Spline AI, Galileo UI, Relume persistent agent, Figma Make (official layout side) |

**AI coding IDEs alone:** right **5** (Cursor, VS Code Copilot, JetBrains, Zed default, Claude Code secondary sidebar) vs left **1** (Windsurf in VS Code). All support drag/move.

**AI-native builders / canvas (excluding unverified):** left **5** (v0, Lovable, Bolt, Polymet, Figma Design agent) vs right **3** (Onlook, Framer Agents, Webflow default) vs bottom/floating **4** (Uizard, Replit Design, Recraft, FigJam).

---

## 3. Synthesis (~15 lines)

**(a) Canvas / classic design tools:** The stable convention is **structure left, inspection right**. Figma, Sketch, and Framer document layers/pages/assets on the left and properties/inspector on the right; Photoshop’s default workspace also keeps layers on the right but still treats side panels as property/structure inspectors, not the canvas. Framer Agents (2026) follows inspector-right by putting the Agent tab in the **right sidebar**, while layers stay left.

**(b) AI builders:** Prompt-first builders overwhelmingly use **input-left, preview-right**: v0, Lovable, Bolt.new, and Polymet all place chat/prompt on the left and generated UI on the right—matching a “source → output” reading order in LTR locales. **Figma Design is a notable exception:** its 2025+ agent lives in the **left navigation bar**, sharing the same rail as layers/assets rather than the right inspector. Canvas-native products split: **Onlook** and **tldraw Agent** put chat **right**; **Replit Design** docks chat **on the canvas** with a **bottom toolbar**. **Uizard** uses a **bottom** Autodesigner bar. No surveyed shipping product uses a full center takeover for the agent panel.

**(c) Evidence for left-agent:** Strongest case is **not UX research** but **product convergence among prompt→preview builders** (v0, Lovable, Bolt, Polymet) and **Figma’s own agent placement on the left nav**—suggesting left-agent can work when the agent is a primary navigation mode co-equal with layers, not a secondary inspector. **Mozaiks** documents an explicit **chat-left / artifact-right** split for workflow mode. **Windsurf** defaults chat **left in VS Code** (opposite JetBrains). Left-agent is weaker as a global rule because **IDE agents default right** (Cursor, Copilot, JetBrains, Zed) and NN/g advises keeping **primary content out of the right rail**.

**Practical read for design-playground:** If the expanded agent panel is “conversation + iteration,” left aligns with v0/Lovable/Bolt and Figma’s agent tab. If it behaves like an **inspector** tied to selection, right aligns with Framer Agents, Onlook, Webflow, and IDE norms. A **bottom-center composer expanding to a side panel** matches Replit Design and Uizard patterns for keeping canvas maximal.

---

## 4. UX research links (one-line takeaways)

| URL | Takeaway |
| --- | --- |
| https://www.nngroup.com/articles/horizontal-attention-leans-left/ | In LTR layouts, horizontal attention skews **left (~80%)**; NN/g recommends **primary content center-left** and **secondary content right**. |
| https://www.nngroup.com/articles/fight-right-rail-blindness/ | Right columns are treated as **secondary** and suffer “right-rail blindness” if they look like ads; keep side panels lightweight and context-relevant. |
| https://www.nngroup.com/articles/ai-chatbots-design-guidelines/ | Chat UX quality depends on persistence, context signaling, and scannability—not panel side; floating **bottom-right** is the common web chat expectation. |
| https://www.nngroup.com/articles/discoverability-ai-amazon/ | Nonstandard chat placement hurts discoverability; users expect chat affordances in familiar locations (often **bottom-right** on web). |
| https://www.nngroup.com/articles/accordion-editing-apple-picking/ | Long linear chat streams create scrolling/orientation problems—relevant to full-height agent panels regardless of side. |
| https://www.nngroup.com/videos/attention-leans-left-websites/ | Video summary: **left half of pages gets ~80% of viewing time** in eyetracking. |
| https://www.patternfly.org/patterns/primary-detail/design-guidelines/ | Master-detail pattern: **primary list left, detail pane right** (or slide-out)—supports layers-left / inspector-right. |
| https://developer.apple.com/design/human-interface-guidelines/split-views | Platform HIG: split views use **leading pane for navigation/structure**, trailing for detail. |
| https://element.siemens.io/components/layout-navigation/side-panel/ | Enterprise pattern: **side panel pushes in from the right** (LTR) for detail, filters, and secondary tasks. |
| https://code.visualstudio.com/docs/agents/chat-view | VS Code explicitly places Chat in the **secondary sidebar beside the editor**—a major convention setter for coding agents. |

---

## 5. Classic design-tool panel convention (confirmed + exceptions)

| Tool | Layers / structure | Inspector / properties | Exception notes |
| --- | --- | --- | --- |
| Figma Design | Left (nav bar + layers) | Right (properties) | Agent also on **left** nav (2025+) |
| Sketch | Left (layer list) | Right (Inspector) | Copenhagen moved some inspector pieces to floating panels |
| Framer | Left (Pages/Layers/Assets) | Right (layout/style properties) | Framer Agents chat on **right** |
| Photoshop | Right (default Layers panel) | Right-side panel stack | Workspace-dependent; not left layers |

**Confirmed pattern:** structure/hierarchy on one flank, editable properties on the opposite flank—most often **layers left, inspector right**, with Photoshop as the main mainstream exception (layers right).

---

## 6. Addendum (post-report corrections)

- **wonder.design (Thimphu)** — AI canvas builder, verified from user screenshots 2026-08-10: **agent/chat panel left** (chat history, prompt suggestions, composer bottom-left), **Pages/Layers/Properties right**, floating dark tool strip at the canvas's left edge, and **both sidebars fully collapsible** to floating chrome. Counts as a **left-agent** data point in the prompt-first-builder cluster.
- Correction to §2: the original Left list double-counted **Magic Patterns Design System chat**, which the survey table itself places **right**. Dropping it from Left and adding wonder.design keeps **Left = 8**; Right = 11 stands.
