/** @typedef {{ id: string; label: string; depth: number; expanded?: boolean; count?: number; selected?: boolean; icon: 'branch' | 'leaf' }} LayerRow */

/** @type {LayerRow[]} */
export const layers = [
  { id: 'app', label: 'App', depth: 0, expanded: true, icon: 'branch' },
  { id: 'pricing', label: 'Pricing', depth: 1, expanded: true, count: 4, icon: 'branch' },
  { id: 'price', label: 'PriceCard', depth: 2, selected: true, count: 3, icon: 'leaf' },
  { id: 'it1', label: 'PriceCard.iteration-1', depth: 3, icon: 'leaf' },
  { id: 'it2', label: 'PriceCard.iteration-2', depth: 3, icon: 'leaf' },
  { id: 'it3', label: 'PriceCard.iteration-3', depth: 3, icon: 'leaf' },
  { id: 'toggle', label: 'PlanToggle', depth: 2, icon: 'leaf' },
  { id: 'dash', label: 'Dashboard', depth: 1, expanded: false, count: 7, icon: 'branch' },
  { id: 'settings', label: 'Settings', depth: 1, expanded: false, count: 2, icon: 'branch' },
];
