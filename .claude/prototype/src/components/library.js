import Alpine from 'alpinejs';
import { layers } from '../data/layers.js';
import { primitives } from '../data/primitives.js';
import { tokenGroups, swatchVar } from '../data/tokens.js';

const TAB_HINTS = {
  layers: { search: 'Search layers', foot: 'Drag any item onto the canvas' },
  prims: { search: 'Search primitives', foot: 'Drag any item onto the canvas' },
  tokens: { search: 'Search tokens', foot: 'Semantic colour tokens from the host stylesheet' },
};

export function registerLibrary() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('library', () => ({
      tab: 'layers',
      search: '',
      layers,
      primitives,
      tokenGroups,
      expanded: { badge: false },

      get searchPlaceholder() {
        return TAB_HINTS[this.tab]?.search ?? 'Search';
      },

      get footHint() {
        return TAB_HINTS[this.tab]?.foot ?? 'Drag any item onto the canvas';
      },

      setTab(id) {
        this.tab = id;
      },

      layerIndex(row) {
        return this.layers.findIndex((l) => l.id === row.id);
      },

      layerHasChildren(row) {
        const idx = this.layerIndex(row);
        if (idx === -1) return false;
        return idx + 1 < this.layers.length && this.layers[idx + 1].depth === row.depth + 1;
      },

      isLayerExpandedVisible(row) {
        const idx = this.layerIndex(row);
        if (idx === -1) return false;
        let depth = row.depth;
        for (let i = idx - 1; i >= 0; i--) {
          const anc = this.layers[i];
          if (anc.depth < depth) {
            if (this.layerHasChildren(anc) && anc.expanded === false) return false;
            depth = anc.depth;
          }
        }
        return true;
      },

      layerMatchesOrDescendant(idx, q) {
        const row = this.layers[idx];
        if (row.label.toLowerCase().includes(q)) return true;
        const parentDepth = row.depth;
        for (let i = idx + 1; i < this.layers.length; i++) {
          const next = this.layers[i];
          if (next.depth <= parentDepth) break;
          if (next.label.toLowerCase().includes(q)) return true;
        }
        return false;
      },

      layerHasMatchingAncestor(idx, q) {
        const row = this.layers[idx];
        let depth = row.depth;
        for (let i = idx - 1; i >= 0; i--) {
          const anc = this.layers[i];
          if (anc.depth < depth) {
            if (anc.label.toLowerCase().includes(q)) return true;
            depth = anc.depth;
          }
        }
        return false;
      },

      isLayerVisible(row) {
        if (this.tab !== 'layers') return false;
        if (!this.isLayerExpandedVisible(row)) return false;
        const q = this.search.trim().toLowerCase();
        if (!q) return true;
        const idx = this.layerIndex(row);
        return this.layerMatchesOrDescendant(idx, q) || this.layerHasMatchingAncestor(idx, q);
      },

      toggleLayer(id) {
        const row = this.layers.find((l) => l.id === id);
        if (row && this.layerHasChildren(row)) {
          row.expanded = row.expanded === false;
        }
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

      swatchStyle(row) {
        if (row.radius) return 'background:var(--host-muted);border-radius:6px';
        const v = swatchVar[row.swatch];
        return v ? `background:var(${v})` : '';
      },
    }));
  });
}
