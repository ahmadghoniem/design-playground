# Tab navigation research — in-app tabs vs. switchers

Research date: 2026-08-11. Sources are linked inline; cells/claims marked **unverified** could not be confirmed from current docs, changelogs, or credible primary sources.

Question at hand: should "workspaces" in a design-canvas web app be browser-style tabs or a pill+menu switcher? Prioritized: webapps-with-tabs evidence over generic website tab guidelines.

---

## 1. Canonical guidelines (NN/g, Apple, Material)

**NN/g — "Tabs, Used Right"** (2024 refresh of Nielsen's 2007 article; [nngroup.com/articles/tabs-used-right](https://www.nngroup.com/articles/tabs-used-right/)). Scope note: explicitly about *in-interface* tabs, not browser-chrome tabs. Load-bearing distinctions and rules:

- **Two tab species:** *in-page tabs* swap related content in place (same layout, different data); *navigation tabs* take you to different pages. Never mix both in one tab control — disorients users.
- **Use tabs when:** content has clear, few groupings; labels fit in 1–2 words; users *don't* need to see two tabs' content simultaneously. The last point is the big one for a design tool: "users must repeatedly switch between tabs to compare or reference information… a tab-based design taxes users' short-term memory, increases cognitive load and interaction cost."
- **Failure mode — overflow:** when tabs overflow the tab list, the bar becomes a carousel; hidden tabs get less discoverable and cost extra interaction. "The fewer tabs, the better."
- **Failure mode — default-tab attention:** the default/selected tab gets the attention; non-default tabs may be ignored — don't put critical content in them.
- **Visual rules:** one row only (stacked rows destroy spatial memory of which tabs you visited); tab list above the panel; selected tab needs ≥2 selection indicators; unselected tabs must stay visible/readable (they're the reminder of what else exists); tab-management controls (add/close/copy) must be embedded and *findable* — right-click-only tab menus test poorly (Excel bad, Google Sheets' visible split-button better).
- **Complex-app carve-out:** NN/g explicitly notes complex apps "where users must manage their information space" need tab-management features — the article's constraints are aimed at content tabs, and it treats document/workspace tabs as the legitimate complex-app case.

**NN/g — "Page Parking"** (2015; [nngroup.com/articles/multi-tab-page-parking](https://www.nngroup.com/articles/multi-tab-page-parking/)): browser tabs separate *hunting* from *digesting*; parked tabs are external memory ("knowledge in the world"). When the bar crowds, only favicon + 2–3 title words carry identity — so per-item iconography and front-loaded names decide whether a crowded tab strip stays usable. (One observed user: 12 tabs for a single shopping task, max 9 open at once.)

**Apple HIG — Tab bars** ([developer.apple.com/design/human-interface-guidelines/tab-bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)): tabs are for *navigation between top-level sections*, not actions; keep the bar always visible (hidden bar = users forget where they are); **avoid overflow** — the iOS "More" tab "makes it harder for people to reach and notice content on tabs that are hidden"; when IA gets complex, **switch to a sidebar** (iPadOS tab bars can adapt into one); default to five or fewer customizable tabs.

**Material Design 3 — Tabs** ([m3.material.io/components/tabs/overview](https://m3.material.io/components/tabs/overview)): primary tabs = main destinations, secondary tabs = related content within an area, always nested below primary. Notably permissive on count: "Tabs can horizontally scroll, so a UI can have as many tabs as needed" — this contradicts Apple/NN/g/Microsoft and is aimed at content-categorization tabs, not document tabs.

**Microsoft Windows UX guidelines — Tabs** ([learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-tabs](https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-tabs)): horizontal tabs only if **seven or fewer** and all fit one row; **don't scroll horizontal tabs** ("horizontal scrolling isn't readily discoverable"); 8+ → vertical tabs; tabs must never have side effects on switch; standard shortcuts Ctrl+Tab / Ctrl+Shift+Tab / Ctrl+PgUp/PgDn; "different views of the same data" → consider a dropdown instead ("more lightweight").

**W3C ARIA APG Tabs pattern** ([w3.org/WAI/ARIA/apg/patterns/tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)): `tablist`/`tab`/`tabpanel` roles, keyboard activation, auto-activation on focus only when panels render without latency.

**Baymard** (e-commerce content tabs, adjacent but canonical): "Avoid Horizontal Tabs" for main product-page sections — ~27% of users overlooked core content hidden in horizontal tab layouts ([baymard.com/blog/avoid-horizontal-tabs](https://baymard.com/blog/avoid-horizontal-tabs)). Reinforces NN/g's "non-selected tabs conceal" warning; about content tabs, not document switching.

---

## 2. Browser-tab psychology research (hoarding / overload)

Why it matters: in-app document tabs inherit the same psychology — open items function as reminders, external memory, and loss-aversion anchors, not just navigation.

**Dubroy & Balakrishnan, "A Study of Tabbed Browsing Among Mozilla Firefox Users," CHI 2010, University of Toronto** ([PDF](https://www.dgp.toronto.edu/~ravin/papers/chi2010_tabbedbrowsing.pdf); [talk summary](https://dubroy.com/blog/my-chi2010-talk-a-study-of-tabbed-browsing/)). 21 participants logged 13–21 days:

- 20/21 strongly preferred tabs over windows ("cleaner/less cluttered" 10/21; "easier to access and switch between" 7/21).
- **Tab switching was the second most-used navigation mechanism after link-clicking — ahead of the back button for 17/21 participants.** Tabs are primarily a *revisitation/switching* device.
- Why tabs stay open: reminders (17/21), opening links in background (14/21), switching between tasks (11/21), back-and-forth between two pages (10/21), short-term bookmarks (4/21). Tab "power users" habitually open links in new tabs.
- Usage varies wildly per person: one participant had median 1 tab open, max 27.

**Chang, Hahn, Kim et al. (Kittur lab, CMU), "When the Tab Comes Due: Challenges in the Cost Structure of Browser Tab Usage," CHI 2021** ([ACM DL](https://dl.acm.org/doi/10.1145/3411764.3445585); [PDF](https://joe.cat/images/papers/tabs.pdf)). 10 information workers interviewed 4× over two weeks + survey N=103 (+ prelim N=64). The core model — tabs sit between opposing pressures:

| Pressures to CLOSE | Pressures to KEEP OPEN |
| --- | --- |
| C1 Limited attention (overwhelm, stress) | O1 Reminders & task resumption (37.3% of labeled tabs) |
| C2 Limited screen real-estate (can't navigate/find) | O2 Revisiting references (quick access, diminishing returns) |
| C3 Limited computing power (slowdowns, crashes) | O3 Avoid costly re-finding (17.7%) |
| C4 Pressure to appear organized (shame) | O4 Sunk costs & aspirational self |
|  | O5 External mental model (tabs = task structure) |
|  | O6 Uncertain relevance (can't judge future value) |

Key numbers:

- **Overwhelm threshold: median 8 tabs** (Q1 = 5, Q3 = 12; N=103); 67% hit their threshold at least weekly (17% daily).
- Average tabs open at survey time: **6.15** (SD 3.69); only 7.8% had >10.
- 55% feel they "can't let go" of tabs; only 19% blame laziness; 30% self-report a "tab hoarding problem"; 28% often can't find the tab they need; 25% have had crashes from tab volume.
- **The visibility cliff:** users cited the moment tabs shrink so far that favicons disappear as the breaking point where tabbed browsing becomes "virtually unusable."
- **Black-hole effect:** "People feared that as soon as something went out of sight, it was gone… fear of this black hole effect was so strong that it compelled people to keep tabs open even as the number became unmanageable" (Kittur; [ScienceAlert coverage](https://www.sciencealert.com/tab-overload-is-a-common-problem-for-people-browsing-the-internet-survey-finds)). Closing-and-archiving schemes fail because archived tabs are never resurfaced.
- Design implications offered: reduce visual salience of aspirational/to-do tabs; support task-level (not page-level) grouping and suspension; flat time-ordered lists can't express users' actual mental models. (Coverage: [Fast Company](https://www.fastcompany.com/90635776/the-twisted-psychology-of-browser-tabs-and-why-we-cant-get-rid-of-them).)

**Huang et al. 2010** (as cited in Chang 2021 / Tabs.do): **≥60% of a user's open tabs relate to the same task** — tabs cluster by task even though the UI presents them as a flat list. (Primary: Huang & Lin, "Web page revisitation revisited"; cited via [Tabs.do, UIST 2021](https://lxieyang.github.io/assets/files/pubs/tabsdo-uist-2021/tabsdo-uist-2021.pdf).)

**Tabs.do (UIST 2021, same CMU group)** ([ACM DL](https://dl.acm.org/doi/10.1145/3472749.3474777)): all browser tabs share equal visual saliency and creation-time ordering, which actively fights prioritization; save-and-close tools (OneTab, bookmarks) trigger the black-hole problem; static workspace managers (Toby, Workona) break for tasks too small, ephemeral, or fast-evolving to merit a workspace. **Task-level grouping beats page-level lists.**

**"Exploring and Modeling Interactions of Browsing Clutter," CHI 2023** ([ACM DL](https://dl.acm.org/doi/10.1145/3544548.3580690); N=16 interviews + N=400 survey): tab/window count is one of several clutter forms; tab-closing habits split into close-on-task-completion vs. *reactive closing* (only when the limit is hit); hoarded unvisited tabs are common and tied to task importance/complexity.

**Fuse (2022, in-situ sensemaking sidebar)** ([arXiv HTML](https://ar5iv.labs.arxiv.org/html/2208.14861)): warns that **tab groups/hierarchies just move the problem — "tab group overload"**; a persistent sidebar with its own reminder value helped task resumption more than tabs-as-reminders.

**On "Towards Understanding Tab Hoarding":** no paper with this exact title could be located (**unverified** — likely a conflation of Chang et al. 2021 with Vitale et al. 2018 / Sweeten et al. 2018 on digital hoarding, both cited in the CHI 2021 lineage). The canonical tab-hoarding literature is the cluster above.

**Sidebar-vs-top-tabs practitioner consensus (Arc discourse):** top tab strips lose identifiability fast (favicon-only), while a vertical list gives every item equal label space and scrolls ([TidBITS](https://tidbits.com/2023/05/01/arc-will-change-the-way-you-work-on-the-web/); [Verge review](https://www.theverge.com/23462235/arc-web-browser-review); [Verge — Darin Fisher interview](https://www.theverge.com/2022/10/31/23428862/arc-browser-web-company-darin-fisher): "browsers need better systems for helping you manage tabs, not just open more of them"). Arc's answer: sidebar + auto-archiving unpinned tabs + command bar. Also note Arc's own cautionary lesson (Josh Miller, [Verge Decoder](https://www.theverge.com/24247369/the-browser-company-ceo-josh-miller-arc-google-chrome-ai-search-web-decoder-interview)): too many new metaphors made Arc "too complicated… for many people."

---

## 3. Product survey — how notable apps handle multiple open documents/workspaces

| Product | Tab pattern | Notes | Source URL |
| --- | --- | --- | --- |
| **Figma (desktop app)** | Browser-style file tabs | Pin/mute/close; overflow "tab menu" when tabs exceed screen; split-tab view (incl. two views of same file); drag tab out → new window. **Tab Groups (Jun 15 2026):** named, colored, collapsible groups — desktop-only. In-browser Figma has **no** file tabs. | https://help.figma.com/hc/en-us/articles/5601429983767-Guide-to-the-Figma-desktop-app · https://www.figma.com/release-notes/?page=2 · https://forum.figma.com/product-updates-3/organize-the-way-you-work-with-new-tab-groups-54879 |
| **VS Code** | Editor tabs, heavily engineered | Sizing modes `fit`/`shrink`/`fixed` (fixed = Chrome model: uniform width, shrink evenly, widths freeze while cursor is over the strip); pinned tabs (`normal`/`shrink`/`compact`, optional separate row; immune to Close Others/All and to the editor limit); wrapped multi-row tabs (off by default); overflow → "Open Editors" list, not a carousel; optional editor cap (`limit.enabled`, default value 10, `excludeDirty`); tabs can be disabled entirely; Ctrl+Tab MRU quick switch. Maintainer on shrink-vs-scroll: "explicit decision to never shrink tabs smaller than their file name" — later relaxed into opt-in `shrink`/`fixed`. | https://code.visualstudio.com/docs/editing/userinterface · https://code.visualstudio.com/docs/configure/custom-layout · https://code.visualstudio.com/updates/v1_50 · https://github.com/microsoft/vscode/issues/15048 · https://github.com/microsoft/vscode/pull/181729 |
| **Linear** | **No tabs in browser; tabs in Electron desktop app** | Desktop tabs shipped May 2023 (v1.18): pinned tabs, drag-reorder, Cmd/Ctrl+T, command-menu search-across-tabs via `T`. 2024 UI redesign: navigation controls "needed to be easily removable to work with browsers" — i.e., tabs render in the desktop shell, not the web app. Jun 2026 rebuild: per-tab history stacks; pinned tabs persist across restarts and aren't replaced by new content. | https://linear.app/changelog/2023-05-25-project-views · https://linear.app/changelog/2026-06-18-agent-assisted-project-updates · https://linear.app/now/how-we-redesigned-the-linear-ui |
| **Notion** | Desktop-app tabs (added later); none in web app | Tabs launched Dec 2022 (v2.19) explicitly because users were juggling multiple Notion browser tabs — pitch: "without the added distraction of your web browser." Cmd/Ctrl+click opens tab, Cmd+T new tab, Cmd+number jump, new tab opens search by default (jump to existing tab). Apr 2024: drag-reorder + session restore. Jul/Aug 2024: hover tab previews. In-page `/tabs` content block (Mar 2026) is a different feature. | https://www.notion.com/releases/2022-12-15 · https://www.notion.com/help/notion-for-desktop · https://www.notion.com/releases/2024-04-30 · https://www.notion.com/releases/2024-08-13 |
| **Slack** | No document tabs; sidebar list + Quick Switcher | Switching is sidebar (recency/sections) + Cmd/Ctrl+K Quick Switcher (since 2014; rewritten for frecency ranking — "remember who you switch to") + back/forward history (Cmd+[ / Cmd+]) + Cmd+click split view. "Tabs" in Slack = top-level nav views (Home/Activity/Later) and per-conversation content tabs — not open documents. | https://slack.engineering/a-faster-smarter-quick-switcher/ · https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts · https://slack.com/help/articles/212596808-Adjust-your-sidebar-preferences |
| **Arc (browser)** | Sidebar tabs (vertical), Spaces, auto-archive | Tabs+bookmarks merged into one vertical list; favorites/pinned up top; unpinned tabs auto-archive; color-coded Spaces as location cue; Cmd+T command bar to open/search tabs. Rationale: top strips lose identifiability; vertical lists scale. | https://www.theverge.com/23462235/arc-web-browser-review · https://tidbits.com/2023/05/01/arc-will-change-the-way-you-work-on-the-web/ |
| **Obsidian** | Tabs per pane group + "tab stacks" | Tabs added in v1.0 (Oct 2022): "tabs provide a more intuitive experience for both browsing and editing notes"; tab stacks = Matuschak-style sliding panes alternative for the same set. | https://obsidian.md/changelog/2022-10-13-desktop-v1.0.0/ |
| **Webflow** | No in-app document tabs | Pages panel (sidebar list, search); Designer is limited to **one tab per site** ("Request design control" when opened twice); Cmd+click opens *sites* in separate browser tabs. | https://help.webflow.com/hc/en-us/articles/33961360067987-Pages-panel-overview · https://help.webflow.com/hc/en-us/articles/33961328364691-Dashboard · https://discourse.webflow.com/t/181319 |
| **Framer** | No document tabs; **pill/dropdown + type-ahead switcher** | Quick Page Switcher (Aug 2023): dropdown above the layer panel showing current page; focus → type-to-filter across 100s of pages. The closest shipping analog to the "pill+menu" option in a design tool. | https://www.framer.com/updates/quick-page-switcher · https://www.framer.community/c/announcements/quick-page-switcher |
| **Chrome (PWA platform)** | Tabbed application mode (experimental) | Google adding an OS-level tab strip for installed PWAs because developer-built in-app tabs "wouldn't scale acceptably to hundreds of tabs like browser tabs do," and browser affordances (history, copy-URL, cast) bind to the page, not the in-app document. | https://developer.chrome.com/docs/capabilities/tabbed-application-mode |
| **Excel / Google Sheets** | Worksheet tabs (in-document) | NN/g's tab-management findability case study: Excel's right-click-only tab commands failed discoverability; Sheets' visible arrow/split-button tested better. | https://www.nngroup.com/articles/tabs-used-right/ |

**"Tabs within tabs" problem (practitioner evidence):** the recurring pattern is that in-app tab bars are built *only where the app can own the window chrome* (Figma/Notion/Linear/Obsidian desktop shells), while the same products in a browser tab ship no second tab row (Linear's tabs are "easily removable" for browsers; Figma/Notion web have none). Chrome's PWA work names the mechanism: in-app tabs can't match browser tab scaling and break browser-level affordances. Related failure on the browser side: shared session state across browser tabs cross-contaminates app state (Atlassian KB on Jira multi-tab weirdness: https://support.atlassian.com/jira/kb/unexpected-behavior-seen-when-users-make-action-on-a-tab-its-result-is-seen-on-the-other-tab/).

---

## 4. Tabs vs. switchers — when each wins

**A visible tab row wins when:**

1. **The working set is small and stable (roughly 2–8).** Median overwhelm threshold is 8 tabs (Chang 2021); average real-world concurrent set is ~6. Below that, tabs are "in-control and productive"; above it, stress, re-finding failures, and the favicon-visibility cliff.
2. **Switching is constant and visual.** Tab switching beat the back button for 17/21 heavy users (Dubroy 2010) — switching among open items is the second-most-common navigation act, and one click on a visible, spatially stable target is the cheapest switch that exists. Position constancy builds spatial memory (why stacked/reordering tab rows test so badly at NN/g).
3. **Parallel awareness matters:** dirty state, notifications, "which of my things is still open" — the strip is a status display, not just a control. This is the same external-memory function as page parking (NN/g) and reminder tabs (37% of open tabs in Chang's survey).
4. **Users don't know names yet.** Tabs show what's open; a switcher requires recall (typing a name). Browsing beats search when the user can't articulate the target.

**A pill/dropdown + command-K switcher wins when:**

1. **The set is large or unbounded.** Framer ships a type-ahead page dropdown precisely "for projects with 100s of pages"; Slack's Quick Switcher exists because a sidebar can't show thousands of channels. Search scales; strips don't.
2. **Targets are known by name** (recall, not recognition) — fuzzy find beats scanning. Slack's rewrite centered frecency: the switcher learns your working set for you.
3. **Horizontal space is the scarcest resource** — exactly the canvas-tool situation, where every chrome pixel competes with the work.
4. **A host tab layer already exists.** In a browser, a second tab row duplicates chrome and confuses hierarchy ("tabs within tabs"); Linear/Figma/Notion all gate their tab bars to the desktop shell.
5. **Caveat from the pattern literature:** command palettes are accelerators layered on visible navigation, "never… the only path to primary workflows" ([uxpatternsguide.com](https://uxpatternsguide.com/patterns/command-palette/); [uxpatterns.dev](https://uxpatterns.dev/pattern-guide/search-field-vs-command-palette): command palette discoverability is "weak to medium," so pair it with a visible path). Retool's write-up is the canonical practitioner rationale ([retool.com/blog/designing-the-command-palette](https://retool.com/blog/designing-the-command-palette)); history of the pattern: [Maggie Appleton / Matthew Guay, "Command K Bars"](https://maggieappleton.com/command-bar).

**The synthesis every serious product converges on:** visible strip for the *active working set* + searchable switcher for the *long tail*. VS Code (tabs + Ctrl+Tab + Open Editors overflow), Figma desktop (tabs + tab menu + quick actions), Linear desktop (tabs + `T` tab search), Arc (sidebar + Cmd+T), Notion desktop (tabs + new-tab search default). Nobody ships tabs alone at scale, and nobody shipping a switcher leaves it undiscoverable.

**Working-set data points:** ~6 tabs average concurrently open, median self-reported manageability limit 8 (Chang 2021); ≥60% of open tabs belong to the current task (Huang 2010) — i.e., the *task-relevant* visible set is usually smaller than the raw count, which is why pinning/grouping works.

---

## 5. Design-rules summary for our workspace case (opinionated)

Context: design-canvas web app, runs inside a browser tab, "workspaces" = open canvas documents. Decision: browser-style tab strip vs. pill+menu switcher.

1. **Decide by expected working-set size, not aesthetics.** If users realistically keep ≤8 workspaces open (median overwhelm threshold; average concurrent ~6), a tab strip is viable and strictly better for switch cost and awareness. If the expected set routinely exceeds ~8–10, tabs degrade into a carousel/overflow menu anyway — you pay the strip's space cost and *still* end up in a menu.
2. **The browser already owns a tab row above you.** In a web app, a horizontal tab strip is the second tab row on screen ("tabs within tabs"). Every surveyed product that ships in-app tabs does so in a desktop shell and deliberately omits them in-browser (Linear, Figma, Notion). If we stay a browser app, a strip must be visually unmistakable as *app* chrome (compact, in-canvas-adjacent, not window-top mimicry) — or live vertically (rail), which dodges the duplication entirely.
3. **Tabs' real value for us is glanceable dirty/activity state + spatial memory**, not the click target. If a pill+menu can reproduce that (badge on the pill, recency-ordered menu with dirty markers), it captures most of the benefit at a fraction of the space.
4. **If tabs: non-negotiables from the evidence.** One row; stable order (no auto-rearrange); pin support (pinned items survive close-others and overflow); dirty-state dot; close on middle-click + visible × on hover/active; overflow goes to a *menu/list early* (never horizontal scroll — undiscoverable per Microsoft/NN/g); favicon-equivalent icon per workspace so shrink states stay identifiable (the favicon cliff); per-tab state restore (scroll/zoom/selection) on switch; Cmd/Ctrl+click opens in new tab; Ctrl+Tab MRU + Cmd/Ctrl+K as keyboard accelerators; consider a cap with `excludeDirty`-style protection (VS Code's limit model).
5. **If pill+menu: compensate for the two things you lose.** (a) Discoverability/awareness — the pill must show count and dirty aggregate, and the menu opens with recency ordering and zero typing required; (b) one-click switching — keep ⌘1–9 or Ctrl+Tab cycling so the common case never touches search. Framer's Quick Page Switcher is the existence proof this works in a design tool at 100s of pages; Slack's Quick Switcher shows frecency ranking is what makes it feel fast.
6. **Don't ship the switcher as the only path** (pattern-literature consensus; palette discoverability is weak-to-medium). Menu must be mouse-openable and visibly triggered.
7. **Beware the reminder/hoarding trap either way.** Open workspaces will be used as reminders and external memory (37% reminder tabs; "can't let go" 55%; black-hole fear of closing). Whatever we ship needs a safe "put away without losing" story (restorable closed-workspaces list / session restore), or users will keep everything open and both patterns collapse.
8. **Comparison is the canvas-specific wrench.** NN/g: tabs fail when users need to see two things at once; design work is compare-heavy. Figma's answer (split tab view, incl. same file twice) and Slack's (Cmd+click split view) are the precedents if tabs are chosen; with a switcher, consider split/canvas-multi-view as the explicit escape hatch.
9. **Grouping is the scaling valve, with a warning.** Figma (2026), Chrome, and Arc all added groups/spaces; Fuse warns groups just relocate overload ("tab group overload"). Treat grouping as phase 2, not day-one complexity (Arc's own CEO regrets their metaphor sprawl).
10. **Recommendation shape:** hybrid — a compact visible strip capped at the ~8-item working set (with pins) *plus* a menu/Cmd+K switcher for the long tail, in the vertical rail if we want zero browser-tab ambiguity. This is where VS Code, Figma, Linear, Arc, and Notion all independently landed; no surveyed product ships either pattern alone at scale.

---

## 6. Sources

- https://www.nngroup.com/articles/tabs-used-right/
- https://www.nngroup.com/articles/multi-tab-page-parking
- https://developer.apple.com/design/human-interface-guidelines/tab-bars
- https://m3.material.io/components/tabs/overview
- https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-tabs
- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- https://baymard.com/blog/avoid-horizontal-tabs
- https://www.dgp.toronto.edu/~ravin/papers/chi2010_tabbedbrowsing.pdf
- https://dubroy.com/blog/my-chi2010-talk-a-study-of-tabbed-browsing/
- https://dl.acm.org/doi/10.1145/3411764.3445585
- https://joe.cat/images/papers/tabs.pdf
- https://www.sciencealert.com/tab-overload-is-a-common-problem-for-people-browsing-the-internet-survey-finds
- https://www.fastcompany.com/90635776/the-twisted-psychology-of-browser-tabs-and-why-we-cant-get-rid-of-them
- https://dl.acm.org/doi/10.1145/3472749.3474777
- https://lxieyang.github.io/assets/files/pubs/tabsdo-uist-2021/tabsdo-uist-2021.pdf
- https://dl.acm.org/doi/10.1145/3544548.3580690
- https://ar5iv.labs.arxiv.org/html/2208.14861
- https://tidbits.com/2023/05/01/arc-will-change-the-way-you-work-on-the-web/
- https://www.theverge.com/23462235/arc-web-browser-review
- https://www.theverge.com/2022/10/31/23428862/arc-browser-web-company-darin-fisher
- https://www.theverge.com/24247369/the-browser-company-ceo-josh-miller-arc-google-chrome-ai-search-web-decoder-interview
- https://help.figma.com/hc/en-us/articles/5601429983767-Guide-to-the-Figma-desktop-app
- https://www.figma.com/release-notes/?page=2
- https://forum.figma.com/product-updates-3/organize-the-way-you-work-with-new-tab-groups-54879
- https://code.visualstudio.com/docs/editing/userinterface
- https://code.visualstudio.com/docs/configure/custom-layout
- https://code.visualstudio.com/updates/v1_50
- https://github.com/microsoft/vscode/issues/15048
- https://github.com/microsoft/vscode/pull/181729
- https://linear.app/changelog/2023-05-25-project-views
- https://linear.app/changelog/2026-06-18-agent-assisted-project-updates
- https://linear.app/now/how-we-redesigned-the-linear-ui
- https://www.notion.com/releases/2022-12-15
- https://www.notion.com/help/notion-for-desktop
- https://www.notion.com/releases/2024-04-30
- https://www.notion.com/releases/2024-08-13
- https://slack.engineering/a-faster-smarter-quick-switcher/
- https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts
- https://slack.com/help/articles/212596808-Adjust-your-sidebar-preferences
- https://obsidian.md/changelog/2022-10-13-desktop-v1.0.0/
- https://help.webflow.com/hc/en-us/articles/33961360067987-Pages-panel-overview
- https://help.webflow.com/hc/en-us/articles/33961328364691-Dashboard
- https://discourse.webflow.com/t/is-there-any-way-to-view-separate-pages-in-designer-mode-in-separate-tabs/181319
- https://www.framer.com/updates/quick-page-switcher
- https://www.framer.community/c/announcements/quick-page-switcher
- https://developer.chrome.com/docs/capabilities/tabbed-application-mode
- https://support.atlassian.com/jira/kb/unexpected-behavior-seen-when-users-make-action-on-a-tab-its-result-is-seen-on-the-other-tab/
- https://uxpatternsguide.com/patterns/command-palette/
- https://uxpatterns.dev/pattern-guide/search-field-vs-command-palette
- https://retool.com/blog/designing-the-command-palette
- https://maggieappleton.com/command-bar
