export const NODE_NAMES = {
  orig: 'PriceCard',
  iter: 'PriceCard.iteration-1',
  adopted: 'PriceCard.iteration-2',
  failed: 'PriceCard.iteration-3',
  text: 'text',
  img: 'stripe-pricing',
};

// Per-node Adopt/Keep affordance (right-rail GitBranch button, selection-gated).
// `on` = the action is available for that node kind.
export const ADOPT = {
  orig: { on: false, label: 'Adopt' },
  iter: { on: true, label: 'Keep' },
  adopted: { on: false, label: 'Kept' },
  failed: { on: false, label: 'Keep' },
};

export const MODELS = ['Claude Opus 5', 'Claude Sonnet 5', 'Claude Haiku 5'];

export const EFFORTS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Med' },
  { id: 'high', label: 'High' },
  { id: 'max', label: 'Max' },
];

export const SKILLS = [
  { id: 'tailwind', label: 'tailwind', description: 'Tailwind CSS design system guidance' },
  { id: 'frontend-design', label: 'frontend-design', description: 'Distinctive UI design patterns' },
  { id: 'dataviz', label: 'dataviz', description: 'Charts and data visualization' },
  { id: 'visual-plan', label: 'visual-plan', description: 'Interactive visual planning' },
  {
    id: 'impeccable',
    label: 'impeccable',
    description: 'Design critique and polish commands',
    children: [
      { id: 'impeccable:critique', category: 'review', description: 'Run a design critique' },
      { id: 'impeccable:polish', category: 'refine', description: 'Polish spacing and typography' },
      { id: 'impeccable:audit', category: 'review', description: 'Accessibility audit' },
      { id: 'impeccable:animate', category: 'motion', description: 'Add purposeful motion' },
    ],
  },
];

// Codex-style approval modes for the Composer permissions pill.
export const PERMISSIONS = [
  { id: 'ask', label: 'Ask for approval', hint: 'Pause for sign-off before edits or commands' },
  { id: 'auto', label: 'Auto', hint: 'Run edits and safe commands, ask on anything risky' },
  { id: 'full', label: 'Full access', hint: 'Run everything without asking' },
  { id: 'read', label: 'Read only', hint: 'Look, never write' },
];

export const CURRENT_WORKTREE = 'rewynd';

/** A workspace is a git branch. Switching branches is the only way to change boards. */
export const WORKSPACES = [
  {
    branch: 'master',
    dirty: false,
    scene: 'host',
    title: 'Pricing page',
    summary: 'The host component on master. Iterations live on their own branches.',
    tags: [{ id: 'comp', type: 'comp', label: 'PriceCard' }],
  },
  {
    branch: 'pg/quiet-numeric',
    dirty: true,
    scene: 'explore',
    title: 'Calmer pricing card',
    summary: 'Three variations of PriceCard from one prompt — a text note, a reference image and the component, sent together.',
    tags: [
      { id: 'comp', type: 'comp', label: 'PriceCard' },
      { id: 'text', type: 'text', label: 'text' },
      { id: 'img', type: 'img', label: 'stripe-pricing' },
    ],
  },
  {
    branch: 'feat/layers-sidebar',
    dirty: true,
    scene: 'empty',
    title: 'Layers sidebar',
    summary: 'Parked feature branch. Nothing on the canvas yet.',
    tags: [],
  },
];
