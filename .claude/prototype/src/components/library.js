import Alpine from 'alpinejs';
import { layers } from '../data/layers.js';
import { primitives } from '../data/primitives.js';
import { tokenGroups, swatchVar } from '../data/tokens.js';

const TYPE_VARS = [
  { name: 'font-sans', value: 'Inter' },
  { name: 'font-mono', value: 'Geist Mono' },
  { name: 'text-sm', value: '0.875rem' },
  { name: 'text-base', value: '1rem' },
  { name: 'tracking-tight', value: '-0.025em' },
];

// The Icons fold names the set the host draws from and lets you swap it, so the data
// is a list of packs rather than one hardcoded pack.
const ICON_PACKS = [
  { id: 'lucide', name: 'lucide', icons: ['check', 'x', 'chevron-right', 'search', 'plus', 'pencil'] },
  { id: 'hugeicons', name: 'hugeicons', icons: ['tick-01', 'cancel-01', 'arrow-right-01', 'search-01', 'plus-sign', 'edit-02'] },
  { id: 'phosphor', name: 'phosphor', icons: ['check', 'x', 'caret-right', 'magnifying-glass', 'plus', 'pencil-simple'] },
  { id: 'tabler', name: 'tabler', icons: ['check', 'x', 'chevron-right', 'search', 'plus', 'pencil'] },
  { id: 'heroicons', name: 'heroicons', icons: ['check', 'x-mark', 'chevron-right', 'magnifying-glass', 'plus', 'pencil-square'] },
];

export function registerLibrary() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('library', () => ({
      search: '',
      primQuery: '',
      varQuery: '',
      layersOpen: true,
      primsOpen: true,
      tokensOpen: true,
      varColorsOpen: true,
      varRadiusOpen: false,
      varTypeOpen: false,
      iconsOpen: false,
      layerSearchOpen: false,
      primSearchOpen: false,
      varSearchOpen: false,
      layers,
      primitives,
      tokenGroups,
      typeVars: TYPE_VARS,
      iconPacks: ICON_PACKS,
      iconPackId: 'lucide',
      expanded: { badge: false },

      get iconPack() {
        return this.iconPacks.find((p) => p.id === this.iconPackId) ?? this.iconPacks[0];
      },

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

      toggleVarSearch() {
        this.varSearchOpen = !this.varSearchOpen;
        if (this.varSearchOpen) {
          this.tokensOpen = true;
          this.$nextTick(() => requestAnimationFrame(() => this.$refs.varSearch?.focus()));
        } else {
          this.varQuery = '';
        }
      },

      matchesPrim(label) {
        const q = this.primQuery.trim().toLowerCase();
        return !q || label.toLowerCase().includes(q);
      },

      matchesVar(name) {
        const q = this.varQuery.trim().toLowerCase();
        return !q || name.toLowerCase().includes(q);
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
        if (row.undef) return '';
        const v = swatchVar[row.swatch];
        if (!v) return '';
        if (row.radius) return `background:var(${v});border-radius:6px`;
        return `background:var(${v})`;
      },

      // Colours carry the Tokens-tab grouping (Base / Surfaces / Actions / …);
      // Radius is left out because it already has its own sub-fold below.
      get colorGroups() {
        return this.tokenGroups.filter((g) => g.group !== 'Radius');
      },

      get colorRows() {
        return this.colorGroups.flatMap((g) => g.rows.map((row) => ({ ...row, group: g.group })));
      },

      groupHasMatch(group) {
        return group.rows.some((row) => this.matchesVar(row.name));
      },

      // The picker seeds from the token's live value, read off the row itself so
      // it follows whichever `.app-theme` scheme is showing.
      pickValue(row, el) {
        const v = swatchVar[row.swatch];
        if (!v) return '#000000';
        const raw = getComputedStyle(el).getPropertyValue(v).trim();
        if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
        if (/^#[0-9a-f]{3}$/i.test(raw)) return `#${raw.slice(1).split('').map((c) => c + c).join('')}`;
        return '#000000';
      },

      // Writing the variable inline on every `.app-theme` beats both `:root` and
      // the `.dark` block, so one pick repaints the swatch and the previews together.
      setPick(row, hex) {
        const v = swatchVar[row.swatch];
        if (!v) return;
        document.querySelectorAll('.app-theme').forEach((el) => el.style.setProperty(v, hex));
      },

      get radiusRows() {
        return this.tokenGroups.find((g) => g.group === 'Radius')?.rows ?? [];
      },

      get varCount() {
        return this.colorRows.filter((r) => !r.undef).length
          + this.radiusRows.length
          + this.typeVars.length;
      },
    }));
  });
}
