/** @typedef {{ type: 'link' | 'button'; label: string; external?: boolean }} HelpItem */
/** @typedef {{ title: string; date: string }} WhatsNewItem */

/** @type {HelpItem[]} */
export const helpItems = [
  { type: 'link', label: 'Docs', external: true },
  { type: 'button', label: 'Keyboard shortcuts' },
  { type: 'button', label: 'Give feedback' },
  { type: 'link', label: 'Submit a prompt', external: true },
  { type: 'link', label: 'Contact us', external: true },
  { type: 'link', label: 'Discord community', external: true },
];

/** @type {WhatsNewItem[]} */
export const whatsNew = [
  { title: 'GitHub & Desktop App', date: 'July 21' },
  { title: 'Variables & Icons', date: 'July 19' },
];
