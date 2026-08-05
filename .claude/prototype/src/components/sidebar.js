import Alpine from 'alpinejs';
import { layers } from '../data/layers.js';
import { primitives } from '../data/primitives.js';
import { tokenGroups, swatchVar } from '../data/tokens.js';

const TAB_HINTS = {
  layers: { search: 'Search layers', foot: 'Drag any item onto the canvas' },
  prims: { search: 'Search primitives', foot: 'Drag any item onto the canvas' },
  tokens: { search: 'Search tokens', foot: 'Click a token to copy its utility' },
};

export function registerSidebar() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('sidebar', () => ({
      tab: 'layers',
      search: '',
      layers,
      primitives,
      tokenGroups,
      expanded: { badge: false },
      copied: {},

      get searchPlaceholder() {
        return TAB_HINTS[this.tab]?.search ?? 'Search';
      },

      get footHint() {
        return TAB_HINTS[this.tab]?.foot ?? 'Drag any item onto the canvas';
      },

      setTab(id) {
        this.tab = id;
      },

      isLayerVisible(row) {
        if (this.tab !== 'layers') return false;
        const q = this.search.trim().toLowerCase();
        if (!q) return true;
        return row.label.toLowerCase().includes(q);
      },

      layerPadding(depth) {
        return { paddingLeft: `${4 + depth * 14}px` };
      },

      togglePrimitive(id) {
        if (id === 'button') {
          const row = this.primitives.find((p) => p.id === 'button');
          if (row) row.expanded = !row.expanded;
        } else if (id === 'badge') {
          this.expanded.badge = !this.expanded.badge;
        }
      },

      isPrimitiveExpanded(p) {
        if (p.id === 'button') return p.expanded;
        if (p.id === 'badge') return this.expanded.badge;
        return false;
      },

      chevron(p) {
        return this.isPrimitiveExpanded(p) ? '▾' : '▸';
      },

      async copyToken(name, copy, value) {
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(copy);
          } catch {
            /* mock */
          }
        }
        this.copied[name] = true;
        setTimeout(() => {
          delete this.copied[name];
        }, 1100);
      },

      tokenValue(row) {
        if (row.undef) return null;
        if (this.copied[row.name]) return 'copied';
        return row.value;
      },

      swatchStyle(row) {
        if (row.radius) return 'background:var(--host-muted);border-radius:6px';
        const v = swatchVar[row.swatch];
        return v ? `background:var(${v})` : '';
      },
    }));
  });
}
