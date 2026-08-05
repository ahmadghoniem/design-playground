export const NODE_NAMES = {
  orig: 'PriceCard',
  iter: 'PriceCard.iteration-1',
  adopted: 'PriceCard.iteration-2',
  failed: 'PriceCard.iteration-3',
  text: 'text',
  img: 'stripe-pricing',
};

export const KEEP = {
  orig: { on: false, txt: 'This is the real component already — nothing to keep.' },
  iter: { on: true, txt: 'Branches, applies this to the real component, commits, and clears the other iterations.' },
  adopted: { on: false, txt: 'Already kept — this is what is in source on ⑂ pg/quiet-numeric.' },
  failed: { on: false, txt: 'This one failed to render. Retry it before keeping anything.' },
  text: { on: false, txt: 'Text notes are canvas context, not code.' },
  img: { on: false, txt: 'Reference images are canvas context, not code.' },
};

export const VIEWPORT_NOTES = {
  auto: 'Editing at <b>base</b> — no prefix, applies at every width',
  desktop: 'Editing at <b>md</b> and up — the Desktop pick',
  mobile: 'Editing at <b>base</b>/<b>sm</b> — the Mobile pick',
};

export const MODELS = ['Claude Opus 5', 'Claude Sonnet 5', 'Claude Haiku 5'];
