/** @typedef {{ id: string; label: string; cva?: boolean; expanded?: boolean; groups?: { label: string; chips: string[]; defaultChip?: string }[] }} PrimitiveRow */

/** @type {PrimitiveRow[]} */
export const primitives = [
  {
    id: 'button',
    label: 'Button',
    cva: true,
    expanded: true,
    groups: [
      { label: 'variant', chips: ['default', 'secondary', 'outline', 'ghost', 'destructive'], defaultChip: 'default' },
      { label: 'size', chips: ['default', 'sm', 'lg', 'icon'], defaultChip: 'default' },
    ],
  },
  { id: 'badge', label: 'Badge', cva: true, expanded: false },
  { id: 'card', label: 'Card' },
  { id: 'input', label: 'Input' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'dialog', label: 'Dialog' },
  { id: 'sheet', label: 'Sheet' },
];
