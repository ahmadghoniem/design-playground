# Feature usage & adoption evidence — AI design/builder tools

Research date: 2026-08-10. Web research only (Exa + primary docs/blogs). Numbers **bolded** where stated by a primary or credible secondary source; anecdotes marked *anecdote*.

Tools surveyed: v0, Lovable, Bolt.new, Magic Patterns, Onlook, Framer (AI), Figma Make / Figma agent, Subframe, Polymet, Uizard, Webflow AI, wonder.design, tldraw, Krea, Replit (Agent/Design), Excalidraw, Penpot, Zed, Continue.dev.

---

## 1. Canvas / multi-artifact boards vs single preview

### Tools that moved *to* a canvas or multi-variant board — why & evidence

**Magic Patterns (infinite canvas, Sept 2024 launch → “most popular” by 2026)**  
- **Why (official):** Side-by-side variation comparison, bird’s-eye view of flows, stakeholder alignment, parallel “inspiration” generations (e.g. four headers at once). Canvas lets you “reference” existing designs by clicking them.  
  - Launch: [LinkedIn — Alexander Danilowicz, Sept 2024](https://www.linkedin.com/posts/alexanderdanilowicz_announcing-the-launch-of-our-infinite-canvas-activity-7244694387643817984-LOTW)  
  - 2026 follow-up: canvas is **“one of our customer's favorite features”** and **“one of the most popular features”** after launching when “there were no real canvas-native AI tools” and they “were not sure whether teams would actually design this way.”  
    - [LinkedIn — Danilowicz, Mar 2026](https://www.linkedin.com/posts/alexanderdanilowicz_generating-ui-on-a-canvas-one-of-the-most-activity-7432509844768731137-sWYD)  
  - Product docs: canvas for organizing designs, linking screens, real-time collaboration.  
    - [Magic Patterns — Using the Canvas](https://www.magicpatterns.com/docs/documentation/projects/getting-started)  
  - Workflow video: copy/paste variants side-by-side after `inspiration` command.  
    - [YouTube — Magic Patterns canvas workflows](https://www.youtube.com/watch?v=nB4FNx4hmLY)  
- **Usage evidence:** No public **% of users** on canvas vs single-screen editor. Qualitative only: “very popular amongst teams,” customer workflows (PM outlining Twitter clone pages side-by-side).  
- **Collaboration signal:** Liveblocks case study — canvas + AI sync shipped in **3–4 hours** of integration work; collaboration cited as **“a key reason customers choose Magic Patterns.”**  
  - [Liveblocks blog](https://liveblocks.io/blog/how-magic-patterns-powers-its-collaborative-experience)

**Polymet (infinite canvas + Focus mode)**  
- **Why (official):** View all components/pages/prototypes in one place; create **multiple prototypes and variations** to test UX flows; “Focus view” for detail edits.  
  - [Polymet — Projects & Canvas](https://docs.polymet.ai/academy/projects-canvas)  
  - Changelog: **“Polymet Canvas — Complete redesign”** with real-time cursors, auto-organize, panning “just like Figma.”  
    - [Polymet changelog](https://docs.polymet.ai/changelog/overview)  
- **Usage evidence:** no public adoption metrics. YC launch emphasizes **“create multiple variations”** and **“explore multiple design paths.”**  
  - [YC launch — Polymet](https://www.ycombinator.com/launches/LfG-polymet-ai-designer-at-your-service)

**Figma Make + canvas bridge**  
- **Why (official):** Static previews “can only convey so much”; Make for interactive prototypes; **Copy design** brings Make previews onto the Figma design canvas as editable layers — “closing the gap between intention and action.” Top community request.  
  - [Figma blog — Bringing Figma Make to the Canvas](https://www.figma.com/blog/bringing-figma-make-to-the-canvas/)  
  - Make launch: point-to-element prompting, responsive adaptations, embedded in Figma platform.  
    - [Figma blog — Introducing Figma Make](https://www.figma.com/blog/introducing-figma-make/)  
- **Code layers (Figma Sites):** Side-by-side code comparison **“as easy as pressing ⌥ and dragging”** vs git branches.  
  - [Figma blog — Building Figma’s Code Layers](https://www.figma.com/blog/building-figmas-code-layers/)  
- **Usage evidence:** GA blog (July 2025) describes team use cases (PMs, engineers, designers) but **no canvas-vs-chat split metrics**.  
  - [Figma Make GA](https://www.figma.com/blog/figma-make-general-availability/)

**Framer Agents (on canvas, 2026)**  
- **Why (official):** Agents edit the same canvas, components, CMS, SEO, publishing workflow teams already use — not “disconnected chat output.” **Branching** for isolated experiments.  
  - [Framer 3.0 blog](https://www.framer.com/blog/framer-3/)  
- **Scale context (not canvas-specific):** **188,000+ companies**, **4M+ published websites**, **364M MAU** across Framer sites (company claim).  
  - Same Framer 3.0 post.

**Krea (realtime canvas — image/video, not React UI)**  
- **Why (official):** **“Market leader in realtime image generation”**; **<50ms** feedback; canvas + live output panel; Realtime Edit removes “prompt-wait-tweak-repeat cycle.”  
  - [Krea Realtime docs](https://docs.krea.ai/realtime)  
  - [Krea — Realtime Edit blog](https://www.krea.ai/blog/realtime-edit)  
- **Usage evidence:** no public DAU or canvas-vs-single-image split. Category is generative media, not product UI.

**tldraw (Make Real + Agent starter kit)**  
- Make Real: bottom control strip on infinite canvas (community experiment → productized pattern).  
  - [tldraw — Make Real story](https://tldraw.dev/blog/make-real-the-story-so-far)  
- Agent starter kit: **right chat panel** on canvas.  
  - [tldraw Agent starter kit](https://tldraw.dev/starter-kits/agent)

**Replit Design Canvas**  
- Agent chat **docked on canvas** with bottom-center toolbar (design-mode product, distinct from Agent tab checkpoints).  
  - [Replit Design Canvas docs](https://docs.replit.com/design/core-components)

### Tools that *abandoned* canvas for single preview

**no public data found** for an AI UI builder that shipped an infinite/multi-artifact canvas and then officially removed it in favor of a single preview, with stated reasons.

**Counter-signals (industry moving toward canvas, not away):**  
- Figma **added** Make→canvas copy (2025), not removed canvas.  
- Framer **added** Agents + Branching on canvas (2026).  
- Magic Patterns reports canvas went from “experimental” to **“most popular.”**

**Adjacent commentary (not product pivots):**  
- *Anecdote / opinion:* Some builders argue chat+preview tools are “prompt engineering with a live reload,” not design — advocates want infinite canvas + layers ([Sean Filimon](https://seanfilimon.com/articles/why-design-tools-that-skip-design-arent-design-tools)).  
- *Anecdote / opinion:* Designers skipping exploration canvas for AI speed repeats an older “design in browser” mistake ([Ramiro Ruiz](https://ramiroruiz.com/2026/03/18/blog/skipping-the-canvas-didnt-work-before-ai-it-wont-work-now/)).  
- Babou team **left Framer** for Next.js + agents because Framer’s API blocked programmatic iteration — not because canvas failed, but because **agent-driven code** beat visual editor API limits ([Babou blog](https://babou.ai/blog/why-we-left-framer)).

**Single-preview-first tools (never canvas-native):** v0, Lovable, Bolt — chat + preview/code by design. No evidence they tried and abandoned canvas.

---

## 2. Branching / versioning / checkpoints

### What products ship

| Tool | Model | Primary UX |
| --- | --- | --- |
| **v0** | Auto **Git branch per chat**; fork chat; PR workflow | [v0 FAQs](https://v0.app/docs/faqs) |
| **Lovable** | Linear **version history** + revert; **edit message → revert & resend** (tree-like exploration, not git branches) | [Lovable history docs](https://docs.lovable.dev/features/projects/history) |
| **Bolt** | **Version history** timeline + restore; GitHub for real branching | [Bolt rollback docs](https://support.bolt.new/building/using-bolt/rollback-backup) |
| **Replit Agent** | **Checkpoints** at milestones; rollback/roll-forward; optional DB restore | [Replit checkpoints](https://docs.replit.com/features/version-control/checkpoints-and-rollbacks) |
| **Framer** | **Branching** for isolated site experiments | [Framer 3.0](https://www.framer.com/blog/framer-3/) |
| **Magic Patterns** | **Fork** design (independent copy) | [Magic Patterns forking](https://magicpatterns.mintlify.app/documentation/editor/forking) |

### Do users branch, or mostly rollback linearly?

**Public usage data: largely no.** None of the tools publish **% branch vs revert** or **fork rate**.

**Documented *intended* behavior (strongest for v0 & Lovable):**

**v0 — fork/branch as workflow hygiene, not parallel product exploration**  
- Official: each connected chat gets branch `v0/main-abc123`; auto commits; PR to main; **never pushes to main**.  
- Community power-user guide (*anecdote, widely cited on Vercel forum*): **“Use a new fork for every task”** — after deploy, feature, or bug — to keep message history clean; parallel feature branches for separate PRs.  
  - [Vercel Community — strategic forking](https://community.vercel.com/t/improve-v0-quality-with-strategic-forking/16487)  
- **Guillermo Rauch (Feb 2026):** v0 hit **3,200 PRs merged per day** via Git workflow integration.  
  - [Lenny’s Newsletter / Rauch interview](https://www.lennysnewsletter.com/p/anyone-can-cook-how-v0-is-bringing)  
- **Enterprise signal:** **>50% of v0 revenue from Teams & Enterprise** (Vercel Series F materials, cited in aggregators).  
  - [getpanto.ai v0 statistics roundup](https://www.getpanto.ai/blog/v0-ai-platform-statistics) — verify against Vercel primary when possible.

**Lovable — revert & bookmarks, not branches**  
- Official playbook: **“Version history is what makes bold prompting safe”** — bookmark after every working feature; revert restores **code only, not DB**.  
  - [Lovable — idea to app guide](https://docs.lovable.dev/tips-tricks/from-idea-to-app)  
- **Edit past message → revert and resend** for alternate direction (branch-like in chat, linear in git unless GitHub sync).  
- Versioning 2.0 (Mar 2025): favorites/bookmarks, grouped history, restore creates new edit card.  
  - [Lovable blog — Versioning 2.0](https://lovable.dev/blog/versioning-with-lovable-two-point-zero)  
- Jan 2025: **“last 8 edits”** quick access because finding stable versions was “difficult and time-consuming.”  
  - [Lovable — better version management](https://lovable.dev/blog/2025-01-13-better-version-management-and-speed-enhancements)

**Bolt — rollback beats re-prompting**  
- Official best practice: use **Version History instead of prompting to revert** — saves tokens.  
  - [Bolt — token efficiency](https://support.bolt.new/best-practices/maximizing-token-efficiency)  
- Version History vs Git: internal undo for session; **Git push = deliberate checkpoint** (*anecdote* in third-party guide).  
  - [RapidDev Bolt+Git guide](https://www.rapidevelopers.com/bolt-ai-integrations/git)

**Replit — checkpoints when “fix forward” fails**  
- Tutorial: use checkpoints when app is **“worse than before”**; compare rollback vs fix-forward with Agent.  
  - [Replit — vibe code tutorial](https://docs.replit.com/tutorials/how-to-vibe-code)  
- Roll forward after rollback creates **“alternate branch of history”** (docs terminology).  
- **no public data found** on checkpoint frequency.

**Framer Branching** — positioned for team review before merge; **no usage stats**.

**Synthesis:** Available evidence describes **linear restore/checkpoint as the default safety net**; **git branching (v0, Framer)** targets **collaboration and production PRs**, not everyday A/B layout exploration. **Parallel variant boards** (Magic Patterns canvas, Polymet) use **duplicate/fork on canvas**, not git branches.

---

## 3. Element-select → chat

### Launch positioning & follow-ups

**v0 Design Mode (June 2025)**  
- Select element in live preview → visual panel + optional NL instruction → **Apply** sends to chat as new version.  
  - [v0 Design Mode docs](https://v0.app/docs/design-mode)  
  - [Vercel Community launch](https://community.vercel.com/t/introducing-design-mode-on-v0/13225) — panel tweaks **without spending credits** until Apply.  
- Community guide: select to delete unwanted AI chrome; targeted prompts show element **badge** in input; **Go to Code** + Cmd+K fallback.  
  - [Vercel Community — design mode tips](https://community.vercel.com/t/edit-ui-with-v0s-design-mode/17477)  
- *Anecdote (YouTube):* Design mode changes **“don't use any tokens”** until Apply.  
  - [YouTube — Mikey Itua](https://www.youtube.com/watch?v=a7L0OsP-cLw)

**Magic Patterns**  
- Docs: **Visual Edit** — select element, edit styles/text/layout.  
  - [Features overview](https://www.magicpatterns.com/docs/documentation/features/overview)  
- *Anecdote (Lenny/Colin Matthews ecosystem):* **“Use visual selection for more accurate changes”** — prevents “whack-a-mole.”  
  - [LinkedIn — Priya Mathew Badger](https://www.linkedin.com/posts/priyamathewprofile_after-posting-about-magic-patterns-i-got-activity-7327874871344984065-bFJ1)

**Lovable — Preview toolbar (replaced standalone Visual Edits)**  
- **Select elements** (`S`): selection attaches to chat; multi-select with Cmd/Ctrl+click.  
  - [Lovable preview toolbar docs](https://docs.lovable.dev/features/preview-toolbar)  
- **Inline text edits:** **free up to 100 edits/user/day**; after that, uses credits. Select + draw annotation = standard chat usage.  
- Academy: **Plan = thinking, Agent = building, Visual Edit = tweaking.**  
  - [Lovable Academy — prompting](https://academy.lovable.app/academy/prompting)

**wonder.design**  
- Select any element to refine; canvas + MCP/GitHub for code sync.  
  - [wonder.design](https://wonder.design/)  
  - [Wonder docs — design is code](https://wonder.design/docs/design-is-code)  
- Public alpha (Apr 2026): select-to-refine on canvas; **#3 Product Hunt** day-one (**232 votes**).  
  - [Creative AI News](https://www.creativeainews.com/blog/wonder-ai-design-agent-public-alpha-launch/)

**Onlook**  
- **“Select any element and choose to edit it yourself or work together with AI.”**  
  - [Onlook AI features](https://www.onlook.com/features/ai)  
- Layers + style panel + chat on selected element.  
  - [Onlook UI overview](https://docs.onlook.com/getting-started/ui-overview)

**Subframe**  
- **Quick edits:** select → `/` or floating toolbar → Ask AI to edit selection.  
  - [Subframe quick edits](https://docs.subframe.com/learn/ask-ai/making-quick-edits)

**Figma Make (2025–2026)**  
- Point-to-element natural language; 2026 beta: direct visual edits on connected codebase.  
  - [Figma Make local code blog](https://www.figma.com/blog/figma-make-now-on-your-local-code/)

### Usage rates (% of prompts using selection)

**no public data found** for any tool reporting **% of prompts** or **% of sessions** using element selection vs global chat.

**Proxy signals:**  
- Lovable documents **100 free inline text edits/day** — implies expected **high-volume micro-edits** via direct manipulation, not chat.  
- v0 positions panel edits as **zero-token** until Apply — implies expected ** frequent visual cleanup** after generation.  
- Community content treats select-to-edit as **best practice**, not measured behavior.

---

## 4. Manual inspector editing inside AI builders

### Official split: prompting vs direct manipulation

**Lovable**  
- Launch blog (Visual Edits era): designers “having to chat with AI for every small edit wasn't ideal.”  
  - [Introducing Visual Edits](https://lovable.dev/blog/introducing-visual-edits)  
- Current model: preview toolbar modes; **chat for behavior/structure**, **inline/select for copy and pointing**.  
- *Anecdote (third-party):* “Use Visual Edits for UI tweaks; save AI prompts for structural changes — Visual Edits doesn't consume credits.”  
  - [Mantlr Lovable guide 2026](https://mantlr.com/blog/how-to-use-lovable-2026)  
- *Anecdote:* “Rule of thumb: chat for behavior and data, visual mode for style.”  
  - [vibecode.fun Lovable workflow](https://vibecode.fun/learn/lovable-2026-workflow)

**v0 Design Mode**  
- Panel = precise Tailwind tweaks; NL box for structural changes; **Apply** commits via agent.  
- Community: jump into design mode after generation to **delete** spurious AI elements without tokens.  
  - [Vercel Community design mode thread](https://community.vercel.com/t/edit-ui-with-v0s-design-mode/17477)

**Magic Patterns**  
- Visual Edit & Agent Mode called out as core features; design-system chat for tokens + components.  
  - [Features overview](https://www.magicpatterns.com/docs/documentation/features/overview)

**Polymet**  
- Changelog/marketing: **Visual edit** — “Click any element… **No prompts, no code**”; typography, opacity, shadows on canvas.  
  - [Polymet LinkedIn changelog posts](https://polymet.ai/) (Jul 2025–2026)

**Subframe**  
- Three modes: **Design** (drag-drop + Inspector), **Prototype** (annotate + chat), **Code**. Ask AI for generation; Inspector for property edits.  
  - [Subframe editor overview](https://docs.subframe.com/learn/editor/overview)  
- Prompting guide: Ask AI for broad/generative; **quick edits** for targeted element changes.  
  - [Subframe prompt-to-design](https://docs.subframe.com/learn/ask-ai/prompt-to-design)

**Onlook**  
- Style Editor for Tailwind classes + Properties panel; AI for generation/modification on selection.  
  - [Onlook core features](https://docs.onlook.com/getting-started/core-features)

**Framer**  
- AI for Wireframer/Workshop; manual canvas editing remains primary refinement surface.  
  - [Framer AI page](https://www.framer.com/ai/)

### Do AI-first users hand-edit styles?

**no public data found** on time split, session counts, or **% credits** spent on visual vs chat paths.

**Qualitative pattern (consistent across docs + community):**  
1. **Generate** via chat/agent.  
2. **Clean up** via inspector (spacing, copy, delete stray elements) — often **free or lower cost**.  
3. **Structural changes** return to chat/plan mode.

**Credit economics as adoption pressure (Lovable, v0):**  
- Lovable: inline text **100/day free**; select-to-chat consumes credits.  
- v0: panel edits free until Apply (then agent/version).

---

## 5. Code iteration in-place vs generate-then-export

### Export / sync friction (documented)

**v0**  
- GitHub sync creates branches + commits, but third-party comparisons cite **one-way export** friction for round-trip workflows.  
  - [Superdesign v0 vs Lovable](https://www.superdesign.dev/blog/v0-vs-lovable)  
- Official FAQs emphasize PR workflow from v0, not importing existing monorepos as primary path.  
  - [v0 FAQs](https://v0.app/docs/faqs)

**Lovable**  
- **Two-way GitHub sync** on paid tiers; **cannot import** existing GitHub repo to start a project.  
  - [Lovable GitHub FAQ](https://lovable.dev/faq/projects/github)  
  - [Git sync docs](https://docs.lovable.dev/integrations/github)  
- Sync failure modes: **100MB GitHub file limit**, **10MB Lovable edit limit**, conflict branches `lovable-sync-*`.  
- Revert restores code **not** Supabase data — export boundary includes **database state**.  
  - [History docs](https://docs.lovable.dev/features/projects/history)

**Magic Patterns**  
- Export/download code; Figma import/export round-trip via plugin; positioned for **frontend layer**, not full-stack.  
  - [Magic Patterns FAQ](https://www.magicpatterns.com/docs/academy/faq)  
- *Anecdote:* Medium author notes Lovable/v0 “struggled to reuse components” vs Magic Patterns presets/libraries.  
  - [Medium — Xinran Ma](https://medium.com/design-bootcamp/how-to-use-an-existing-design-system-with-ai-in-magic-patterns-9f7e180ba56e)

**Bolt**  
- Download ZIP or push GitHub; Version History separate from git; manual re-import for non-GitHub hosts.  
  - [Sentido — own your AI app](https://sentido.cloud/own-your-ai-built-app)

**Figma → code (industry)**  
- *Survey article:* UXPin/Plasmic/Builder “pull code in”; **push visual changes back** remains weak; Figma MCP + Code Connect “don’t add up to seamless flow”; Code to Canvas is “visual capture,” not component mapping.  
  - [Phil Morton — design-to-code workflow](https://www.philmorton.co/the-design-to-code-ai-workflow-youre-looking-for-doesnt-exist-yet/)

**Onlook / wonder.design — repo-native pitch**  
- Onlook: **“code is the source of truth”**; visual edits write to React/Tailwind in repo.  
  - [Onlook](https://www.onlook.com/)  
- Wonder: **GitHub repo + MCP** — “what you design is what you ship”; PRs from canvas.  
  - [Wonder GitHub docs](https://wonder.design/docs/github)  
  - [Wonder MCP](https://wonder.design/docs/mcp)

**Polymet**  
- 2026: **Import existing codebase from GitHub or zip**; canvas for imported projects; **import to new or existing branch**.  
  - [Polymet LinkedIn — import changelog](https://www.linkedin.com/posts/polymet-ai_the-latest-polymet-changelog-is-live-import-activity-7476308553016737792-0jC6)

**User-cited differentiator (secondary):**  
- Sentido (Jul 2026): export to **your** GitHub before paying customers — “on paper” ownership until repo copy exists.  
  - [Sentido](https://sentido.cloud/own-your-ai-built-app)

### Evidence users want repo-native iteration

**no public data found** with survey percentages. Strongest **behavioral** signals:  
- v0 **3,200 PRs/day** (git-native path).  
- Webflow MCP: **>30% of enterprise customers** use MCP; usage **4× since Jan 2026** — agents operating on live CMS/sites, not export bundles.  
  - [Webflow MCP 2.0 press release](https://www.globenewswire.com/news-release/2026/07/21/3330788/0/en/Webflow-MCP-2-0-Brings-Governance-to-the-Agentic-Web.html)  
- Wonder/MCP positioning assumes **agents read/write canvas** instead of screenshots.

**Pain at export boundary (recurring themes):**  
- Design tokens / components don’t survive export unchanged.  
- Database/backend state not included in code export (Lovable).  
- One-way or import-less flows trap greenfield work in vendor sandbox.  
- “Handoff artifact” vs **live codebase** called out in Wonder, Onlook, Figma Make local-code beta.

---

## 6. Open-source core + paid hosted/agent business models

| Project | OSS license | Monetization (stated) | Telemetry / backlash |
| --- | --- | --- | --- |
| **Onlook** | Apache 2.0 | OSS desktop/editor; **~$625K** raised (YC W25, Leonis, etc.); **early access / waitlist** — no public shipped paid tier in docs. **26k+ GitHub stars.** | Jul 2024: **minimal analytics on HN launch** “open-source-friendly”; added light analytics later; balancing intrusiveness. [July 2024 update](https://onlook.substack.com/p/july-2024-update) |
| **tldraw** | Source-available SDK license (v4+) | **Commercial license** for production; **100-day trial**; hobby license (watermark). Dual license replaces Apache for SDK. | Trial/hobby: **license ID + SDK version + page URL** only; **no user/canvas content**. Commercial: **no telemetry**. [License docs](https://tldraw.dev/docs/community/license) |
| **Excalidraw** | MIT (library + excalidraw.com) | **Excalidraw+** **$6/user/mo** — cloud save, teams, extended AI, collaboration. Free site continues. | Plus funds OSS editor; no major opt-out backlash found in primary sources. [Excalidraw+ launch](https://blog.excalidraw.com/introducing-excalidraw-plus/) |
| **Penpot** | MPL 2.0 (full OSS product) | **Open Nitrate / “Tax the Controller”** — OSS stays **feature-complete & free**; paid **governance backoffice** for orgs that need to **restrict** default freedom. SaaS **$7/editor/mo** unlimited tier (2025). Enterprise **€950/mo**. Self-host OSS **free**. | Community thread largely supportive; concern about “control layer” semantics. [Penpot 2025 model](https://community.penpot.app/t/penpots-upcoming-business-model-for-2025/7328) |
| **Zed** | GPL/AGPL + Apache (GPUI) | **Pro $20/mo token credits** + unlimited edit predictions; **Business $30/seat/mo** admin/AI policies; future **collab workspace** monetization. | Client telemetry **opt-out** in settings; server telemetry for hosted AI. [Zed telemetry](https://zed.dev/docs/telemetry) |
| **Continue.dev** | Apache 2.0 | OSS IDE/CLI; **credits-based** hosted models + org billing; planned **“development data engine”** for teams (YC launch). Repo **read-only** Feb 2026 with 2.0 polish. | Anonymous telemetry **opt-out** (`allowAnonymousTelemetry`, env vars). GitHub issue #965 — prompts no longer collected for telemetry (2024). [Telemetry docs PR](https://github.com/continuedev/continue/commit/f9a66afa5069427953573a2756422ec69538d2fd) |

### Is “free OSS tool + subscription agent” precedented?

**Yes — multiple patterns:**

1. **OSS editor + paid cloud/collab (Excalidraw+, Penpot SaaS tiers)** — agent/AI as add-on on Plus (**“Generative AI: Limited vs Extended”** on [plus.excalidraw.com/pricing](https://plus.excalidraw.com/pricing)).  
2. **OSS SDK + commercial license (tldraw)** — AI/agent features in hosted/starter kits; production requires license key.  
3. **OSS client + hosted AI credits (Zed, Continue)** — bring-your-own-key always available; paid tier for convenience + rate limits.  
4. **OSS repo-native editor + VC-backed agent/hosting (Onlook, wonder MCP free on all plans)** — monetization still evolving; Wonder **Pro $16–20/user/mo** includes **$20/mo AI tokens** for built-in chat; **MCP free on all plans**.  
   - [Wonder pricing](https://wonder.design/)

**Telemetry backlash pattern:** Enterprise/OSS audiences scrutinize **prompt/content collection** (Continue #965, Onlook delaying analytics, tldraw limiting trial pings to license metadata). **Opt-out toggles** and **separating OSS self-host from hosted agent** reduce friction.

---

## Decision-relevant takeaways

1. **Multi-artifact canvas correlates with variation workflows, not vanity layout** — Magic Patterns documents side-by-side exploration and calls canvas a top feature; informs investing in parallel variants on one board.  
2. **No primary source documents abandoning canvas for single preview** — counter-movement is toward canvas + git/code bridges (Figma, Framer); single-preview chat tools never added canvas.  
3. **Public metrics on canvas adoption are absent** — ship internal telemetry or dogfood metrics before debating canvas vs single view on taste alone.  
4. **Versioning in AI builders is overwhelmingly linear restore**, not git-style branching — bookmark/revert/checkpoint beats branch for daily use (Lovable, Bolt, Replit docs).  
5. **Git branching evidence clusters on v0/Framer for production PRs** — v0 **3,200 PRs/day** supports branch-per-task for shipping, not layout A/B.  
6. **Element-select is table stakes and heavily promoted**, but **no vendor publishes selection-rate KPIs** — treat select→chat as hygiene; measure locally.  
7. **Direct manipulation is positioned as post-generation cleanup** — Lovable **100 free inline edits/day**, v0 free panel until Apply; expect inspector for micro-edits, chat for structure.  
8. **Credit/pricing design drives inspector adoption** — free or low-cost visual edits reduce prompt churn; align pricing with that split if using usage-based agent billing.  
9. **Export remains the cited pain point** — import gaps (Lovable), DB not in revert, token drift, one-way v0 export; repo-native iteration (Onlook, Wonder, Polymet GitHub import) is the stated counter-position.  
10. **Enterprise agent-on-repo signals demand** — Webflow MCP **>30% enterprise adoption**, **4× growth**; governance matters more than export zip.  
11. **“Design-to-code loop doesn’t exist yet” is a recurring expert claim** — partial sync beats fake two-way; honest scope: iterate in real repo branches, not full Figma parity.  
12. **OSS + paid agent is precedented** (Excalidraw+, Zed, Continue, tldraw, Penpot SaaS) — separate **MIT/Apache core** from **hosted agent/collab** billing.  
13. **Penpot’s “pay to restrict” and tldraw’s commercial SDK** show OSS monetization without hiding core features — governance/hosting, not crippled OSS.  
14. **Telemetry minimalism matters for OSS devtools** — Onlook delayed analytics; tldraw limits trial telemetry; Continue removed prompt telemetry; default opt-out for local-first trust.  
15. **Krea realtime canvas targets generative media latency (<50ms)**, not UI code — poor analog for React iteration canvas; borrow “instant feedback loop,” not layout model.  
16. **Uizard scale (**3.2M+ users**, **80%+** new UIs via AI)** shows AI generation adoption; export-to-code still “requires refactoring” in reviews — generation ≠ production handoff.  
17. **Community guides treat fork/remix as exploration**, official docs treat revert as safety — productize both: **fork for variants**, **restore for mistakes**.  
18. **Framer scale (**4M+ sites**, Agents on canvas)** validates canvas+AI for marketing sites, not app component libraries — know your host-app segment.  
19. **When API can’t automate the canvas, teams jump to code** (Babou/Framer) — agent must drive real files/branches, not only overlay UI.  
20. **Where numbers are missing, absence is evidence** — competitors aren’t proving selection/canvas/branch usage publicly; primary research or instrumented beta beats benchmarking rumors.
