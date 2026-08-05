/** @typedef {{ name: string; copy?: string; value?: string; undef?: boolean; swatch?: string; radius?: boolean }} TokenRow */
/** @typedef {{ group: string; rows: TokenRow[] }} TokenGroup */

/** @type {TokenGroup[]} */
export const tokenGroups = [
  {
    group: 'Base',
    rows: [
      { name: 'background', copy: 'bg-background', value: 'bg-background', swatch: 'background' },
      { name: 'foreground', copy: 'text-foreground', value: 'text-foreground', swatch: 'foreground' },
    ],
  },
  {
    group: 'Surfaces',
    rows: [
      { name: 'card', copy: 'bg-card', value: 'bg-card', swatch: 'card' },
      { name: 'card-foreground', copy: 'text-card-foreground', value: 'text-card-foreground', swatch: 'card-foreground' },
      { name: 'popover', copy: 'bg-popover', value: 'bg-popover', swatch: 'popover' },
      { name: 'popover-foreground', copy: 'text-popover-foreground', value: 'text-popover-foreground', swatch: 'popover-foreground' },
      { name: 'muted', copy: 'bg-muted', value: 'bg-muted', swatch: 'muted' },
      { name: 'muted-foreground', copy: 'text-muted-foreground', value: 'text-muted-foreground', swatch: 'muted-foreground' },
    ],
  },
  {
    group: 'Actions',
    rows: [
      { name: 'primary', copy: 'bg-primary', value: 'bg-primary', swatch: 'primary' },
      { name: 'primary-foreground', copy: 'text-primary-foreground', value: 'text-primary-foreground', swatch: 'primary-foreground' },
      { name: 'secondary', copy: 'bg-secondary', value: 'bg-secondary', swatch: 'secondary' },
      { name: 'secondary-foreground', copy: 'text-secondary-foreground', value: 'text-secondary-foreground', swatch: 'secondary-foreground' },
      { name: 'accent', copy: 'bg-accent', value: 'bg-accent', swatch: 'accent' },
      { name: 'accent-foreground', copy: 'text-accent-foreground', value: 'text-accent-foreground', swatch: 'accent-foreground' },
      { name: 'destructive', copy: 'bg-destructive', value: 'bg-destructive', swatch: 'destructive' },
    ],
  },
  {
    group: 'Neutrals',
    rows: [
      { name: 'border', copy: 'border-border', value: 'border-border', swatch: 'border' },
      { name: 'input', copy: 'border-input', value: 'border-input', swatch: 'input' },
      { name: 'ring', copy: 'ring-ring', value: 'ring-ring', swatch: 'ring' },
    ],
  },
  {
    group: 'Charts',
    rows: [
      { name: 'chart-1', undef: true },
      { name: 'chart-2', undef: true },
      { name: 'chart-3', undef: true },
      { name: 'chart-4', undef: true },
      { name: 'chart-5', undef: true },
    ],
  },
  {
    group: 'Sidebar',
    rows: [
      { name: 'sidebar', undef: true },
      { name: 'sidebar-foreground', undef: true },
      { name: 'sidebar-primary', undef: true },
      { name: 'sidebar-primary-foreground', undef: true },
      { name: 'sidebar-accent', undef: true },
      { name: 'sidebar-accent-foreground', undef: true },
      { name: 'sidebar-border', undef: true },
      { name: 'sidebar-ring', undef: true },
    ],
  },
  {
    group: 'Radius',
    rows: [{ name: 'radius', copy: 'rounded-[--radius]', value: '0.625rem', swatch: 'muted', radius: true }],
  },
  {
    group: 'Custom',
    rows: [{ name: 'brand', copy: 'bg-brand', value: 'bg-brand', swatch: 'brand' }],
  },
];

/** Maps swatch key to CSS custom property name */
export const swatchVar = {
  background: '--host-background',
  foreground: '--host-foreground',
  card: '--host-card',
  'card-foreground': '--host-card-foreground',
  popover: '--host-popover',
  'popover-foreground': '--host-popover-foreground',
  muted: '--host-muted',
  'muted-foreground': '--host-muted-foreground',
  primary: '--host-primary',
  'primary-foreground': '--host-primary-foreground',
  secondary: '--host-secondary',
  'secondary-foreground': '--host-secondary-foreground',
  accent: '--host-accent',
  'accent-foreground': '--host-accent-foreground',
  destructive: '--host-destructive',
  border: '--host-border',
  input: '--host-input',
  ring: '--host-ring',
  brand: '--host-brand',
};
