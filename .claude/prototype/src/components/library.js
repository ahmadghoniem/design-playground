import Alpine from 'alpinejs';
import { layers } from '../data/layers.js';
import { primitives } from '../data/primitives.js';
import { tokenGroups, swatchVar } from '../data/tokens.js';

export function registerLibrary() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('library', () => ({
      search: '',
      primQuery: '',
      layersOpen: true,
      primsOpen: true,
      layerSearchOpen: false,
      primSearchOpen: false,
      layers,
      primitives,
      tokenGroups,
      expanded: { badge: false },

      // Search takes over the fold's own header rather than opening a row beneath it:
      // the title becomes the field, the magnifier becomes the way out. Closing clears
      // the query so a collapsed search never leaves an invisible filter behind.
      toggleLayerSearch() {
        this.layerSearchOpen = !this.layerSearchOpen;
        if (this.layerSearchOpen) {
          this.layersOpen = true;
          // rAF, not just $nextTick: x-show's display flip has to land before focus()
          // will take on the input.
          this.$nextTick(() => requestAnimationFrame(() => this.$refs.layerSearch?.focus()));
        } else {
          this.search = '';
        }
      },

      togglePrimSearch() {
        this.primSearchOpen = !this.primSearchOpen;
        if (this.primSearchOpen) {
          this.primsOpen = true;
          this.$nextTick(() => requestAnimationFrame(() => this.$refs.primSearch?.focus()));
        } else {
          this.primQuery = '';
        }
      },

      matchesPrim(label) {
        const q = this.primQuery.trim().toLowerCase();
        return !q || label.toLowerCase().includes(q);
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
