/** @typedef {{ n: string; title: string; file: string; paragraphs: string[] }} SpecEntry */

/** @type {SpecEntry[]} */
export const specMap = [
  {
    n: '1',
    title: 'Preliminary cleanup: Base UI, cnfast, tidy constants',
    file: '00-cleanup-preliminary.md',
    paragraphs: [
      'The <code>main</code>-branch pass that lands before any feature spec, so every feature branches off a clean base: Radix UI → <b>Base UI</b> for the four primitives actually in use (alert-dialog, dialog, slot, tooltip — same public API, an implementation swap); <code>clsx</code>+<code>tailwind-merge</code> → <b>cnfast</b> (already re-exported as <code>cn</code>; fixes the missing-from-lockfile bug); a de-arbitrary-Tailwind pass; reading host density from <code>components.json</code> instead of a pinned style; tidying <code>shared/lib/constants.ts</code>; and a handful of named bug fixes (element-highlight naming, fiber-walk component resolution, primitives naming).',
      'Not itself visible in the mockup — it is the code-health pass everything else stands on.',
    ],
  },
  {
    n: '2',
    title: 'App shell: 280px sidebar, one right panel, quiet chrome',
    file: 'shell-and-layout.md',
    paragraphs: [
      'Two panels: left is the docked, non-collapsing 280px three-tab sidebar; right holds the design controls <b>and</b> the chat transcript as a tab in the same panel — the floating chat input still floats over the canvas. The header carries a <b>preview</b> light/dark toggle, not a chrome toggle, and chrome (sidebar, right panel, docked chat, header) never darkens. The canvas toolbar becomes a left vertical rail with undo/redo moved down below a separator; the view-controls pill drops to zoom plus zoom-to-selection, with a Help &amp; Resources button beside it.',
      'Mockup shows: the Sun/Moon toggle in the header, the 280px sidebar, the left tool rail with undo/redo, and the bottom-left pill with the <code>?</code> button.',
    ],
  },
  {
    n: '3',
    title: 'Layers tab: a real component tree, not a file list',
    file: 'sidebar-layers.md',
    paragraphs: [
      'A static render tree read from the entry component: draggable rows, indent guides, type icons (a branch icon for components with children, a leaf icon for the rest), a hover-revealed crosshair action that focuses the node on canvas, and ancestry-preserving search.',
      'Mockup shows: the Layers pane tree, its chevrons and icons, and the crosshair button that appears on row hover.',
    ],
  },
  {
    n: '4',
    title: 'Primitives tab: shadcn components with CVA variants',
    file: 'sidebar-primitives.md',
    paragraphs: [
      'A flat listing of the host\'s <code>aliases.ui</code> primitives, labelled by their PascalCase export rather than the filename. Primitives declaring <code>cva()</code> expand into variant chips — the default chip filled dark, dragging a chip pre-sets that prop. Overlay primitives (Dialog, Sheet) show a Ban icon and stay undraggable, because their portals escape the card.',
      'Mockup shows: the Button row expanded into its variant/size chips, and the two greyed-out overlay rows.',
    ],
  },
  {
    n: '5',
    title: 'Tokens tab: one scheme that follows the preview toggle',
    file: 'sidebar-tokens.md',
    paragraphs: [
      'The host theme CSS parsed into groups — Base, Surfaces, Actions, Neutrals, Charts, Sidebar, Radius, Custom — each row a single swatch that follows the header\'s preview toggle, rather than a light/dark split. No "N live · N dead" header. Tokens mapped in <code>@theme inline</code> but never given a value are flagged <code>UNDEF</code> instead of rendering an empty swatch.',
      'Mockup shows: the Tokens pane; toggling preview recolours every swatch; the dashed-amber <code>chart-*</code>/<code>sidebar-*</code> rows (13 of them, matching the host\'s actual dead tokens).',
    ],
  },
  {
    n: '6',
    title: 'Design panel: breakpoint follows the component\'s own viewport',
    file: 'design-panel.md',
    paragraphs: [
      'Controls write class names, never values. Rows use Tailwind\'s own vocabulary (<code>tracking</code>, <code>leading</code>, <code>ring</code>, <code>space-y</code>) because a CSS-named panel can\'t express something like <code>ring</code>, which has no CSS property behind it. Colour offers the host\'s tokens and strikes out the undefined ones. The standalone base/sm/md/lg/xl bar is gone — the active breakpoint now follows the per-component viewport pick (Auto→base, Mobile→base/<code>sm</code>, Desktop→<code>md</code>/<code>lg</code>+). The className output line, the "only tokens the host defines" note, and the original/iteration/adopted signage line are all dropped from this pass.',
      'Mockup shows: the viewport buttons and helper text on the design panel\'s header, the six sections in order, and the absence of all three removed lines.',
    ],
  },
  {
    n: '7',
    title: 'Branch on keep; the composer drops to worktree + branch',
    file: 'branch-model.md',
    paragraphs: [
      'A git branch shows one file version at a time; the canvas exists to show several — so variations stay files until one is kept. Keeping one branches, stages only the touched file, and commits under an agent-proposed, editable branch name. The chat composer\'s old project/branch/where-it-runs row is superseded: no project control, a worktree selector that defaults to the current checkout stands in for "where the agent runs," and a plain branch label — not a picker — shows the current branch.',
      'Mockup shows: the worktree and branch controls on the chat bar, and the Keep → branch dialog opening and closing (Cancel, backdrop click, Esc).',
    ],
  },
  {
    n: '8',
    title: 'Discovery: a deterministic scan, not an LLM call',
    file: 'discovery-engine.md',
    paragraphs: [
      'Replaces the removed static-analysis scan with a deterministic walk starting from <code>main.tsx</code>\'s <code>createRoot</code> call: a syntax walk for edges, the TypeChecker for component detection, and a build-time <code>data-pg-src</code> stamp — writing the registry manifest once. Overlay primitives are excluded from the generated module entirely (listed, never mounted) rather than patched around at render time.',
      'Not directly interactive in the mockup — the Layers, Primitives and Tokens tabs are its downstream consumers.',
    ],
  },
  {
    n: '9',
    title: 'Prompt vocabulary and delivery',
    file: 'agent-vocabulary.md',
    paragraphs: [
      'One vocabulary object for node kinds — component, iteration, image, text — carrying the label and source-path rule for each, read by both the prompt builders and the canvas badges so they can\'t drift. The agent writes its own one-line commit message into the initial prompt. Delivery keeps parsing the existing <code>claude-jsonl.ts</code> stream for a named-action block.',
      'Mockup shows: the renamed text node, the badge vocabulary on the canvas cards, and history rows carrying agent-written messages.',
    ],
  },
  {
    n: '10',
    title: 'Named failures on the card face',
    file: 'agent-failures.md',
    paragraphs: [
      'Failures get a stable, recoverable name shown directly on the card rather than a generic error. The named list (identical cards, a gradient hero, all-centred sections, an iconless CTA, decorative blobs, uniform weight, unmotivated gradients, invented metrics, motion everywhere) and the fix order — structure → hierarchy → grid → typography → contrast/tokens → states → imagery → motion — are what the agent checks itself against.',
      'Mockup shows: the red "token not in host" iteration-3 card, named and explained on its face.',
    ],
  },
];

/** @type {{ label: string; html: string }[]} */
export const checklist = [
  { label: 'Preview toggle:', html: 'the header Sun/Moon recolours token swatches and card previews; chrome stays light either way.' },
  { label: 'Sidebar:', html: '280px, <code>Project</code> label + <code>+</code>, Layers/Primitives/Tokens tabs, per-tab search and footer helper.' },
  { label: 'Tokens:', html: 'one scheme per toggle, no live/dead header, dashed-amber <code>UNDEF</code> rows.' },
  { label: 'Design panel:', html: 'viewport buttons drive the breakpoint; no className output, no host-tokens note, no signage line.' },
  { label: 'Chat composer:', html: 'worktree + branch label, model, Edit/Explore, skills hint — no project control, no suggestion cards, image tag without an extension, text node (not note).' },
  { label: 'Canvas:', html: 'left vertical tool rail with undo/redo below a separator; view-controls pill is zoom + zoom-to-selection only; Help &amp; Resources <code>?</code> sits left of the pill.' },
  { label: 'Branch modal:', html: 'opens on Keep, closes on Cancel, backdrop click, or Esc.' },
];
