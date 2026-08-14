/** @typedef {{ type: 'link' | 'button'; label: string; icon: string; external?: boolean }} HelpItem */
/** @typedef {{ title: string; date: string }} WhatsNewItem */

/** @type {HelpItem[]} */
export const helpItems = [
  { type: 'link', label: 'Docs', icon: 'docs', external: true },
  { type: 'button', label: 'Keyboard shortcuts', icon: 'keyboard' },
  { type: 'button', label: 'Give feedback', icon: 'feedback' },
  { type: 'link', label: 'Contact us', icon: 'contact', external: true },
];

/** @type {WhatsNewItem[]} */
export const whatsNew = [
  { title: 'Model & effort picker', date: 'Aug 6' },
  { title: 'Alt-click element inspection', date: 'Aug 1' },
];
