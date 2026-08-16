import Alpine from 'alpinejs';
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

export function registerDesignAgents() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('designAgents', () => ({
      folds: {
        styles: true,
        variables: true,
        icons: false,
        varColors: true,
        varRadius: false,
        varType: false,
      },
      varQuery: '',
      varSearchOpen: false,
      tokenGroups,
      typeVars: TYPE_VARS,
      iconPacks: ICON_PACKS,
      iconPackId: 'lucide',

      get iconPack() {
        return this.iconPacks.find((p) => p.id === this.iconPackId) ?? this.iconPacks[0];
      },

      toggleFold(id) {
        this.folds[id] = !this.folds[id];
      },

      // Same header-takeover as the Library folds: the title becomes the field and the
      // magnifier becomes the exit, so no extra row is inserted under the header.
      toggleVarSearch() {
        this.varSearchOpen = !this.varSearchOpen;
        if (this.varSearchOpen) {
          this.folds.variables = true;
          this.$nextTick(() => requestAnimationFrame(() => this.$refs.varSearch?.focus()));
        } else {
          this.varQuery = '';
        }
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

      matchesVar(name) {
        const q = this.varQuery.trim().toLowerCase();
        return !q || name.toLowerCase().includes(q);
      },

      steppers: {
        p: { scale: '0,1,2,3,4,5,6,8,10,12,16'.split(','), i: 4, i0: 4, prefix: 'p', named: false },
        gap: { scale: '0,1,2,3,4,5,6,8,10,12'.split(','), i: 2, i0: 2, prefix: 'gap', named: false },
        'space-y': { scale: '0,1,2,3,4,6,8'.split(','), i: 0, i0: 0, prefix: 'space-y', named: false },
        text: { scale: 'xs,sm,base,lg,xl,2xl,3xl,4xl'.split(','), i: 5, i0: 5, prefix: 'text', named: true },
        tracking: { scale: 'tighter,tight,normal,wide,wider'.split(','), i: 1, i0: 1, prefix: 'tracking', named: true },
        leading: { scale: 'none,tight,snug,normal,relaxed'.split(','), i: 0, i0: 0, prefix: 'leading', named: true },
        rounded: { scale: 'none,sm,md,lg,xl,2xl,full'.split(','), i: 3, i0: 3, prefix: 'rounded', named: true },
        border: { scale: '0,1,2,4,8'.split(','), i: 1, i0: 1, prefix: 'border', named: false },
        ring: { scale: '0,1,2,4,8'.split(','), i: 0, i0: 0, prefix: 'ring', named: false },
        shadow: { scale: 'none,sm,md,lg,xl,2xl'.split(','), i: 1, i0: 1, prefix: 'shadow', named: true },
        opacity: { scale: '0,25,50,75,90,100'.split(','), i: 5, i0: 5, prefix: 'opacity', named: false },
      },

      segs: {
        font: 'bold',
        nums: 'prop',
        disp: 'grid',
        align: 'start',
      },

      get storeCrumbName() {
        return this.$store.mock.crumbName;
      },

      get storeCrumbLeaf() {
        return this.$store.mock.crumbLeaf;
      },

      get storeSelectedKind() {
        return this.$store.mock.selectedKind;
      },

      isLocked() {
        return ['text', 'img', 'failed'].includes(this.storeSelectedKind);
      },

      stepVal(key) {
        const st = this.steppers[key];
        const v = st.scale[st.i];
        if (st.named) return `${st.prefix}-${v}`;
        if (v === '0' && key !== 'opacity') return '—';
        return `${st.prefix}-${v}`;
      },

      stepDirty(key) {
        const st = this.steppers[key];
        return st.i !== st.i0;
      },

      // Horizontal scrub: drag left/right over the value to step through the scale.
      scrubStart(key, e) {
        e.preventDefault();
        const st = this.steppers[key];
        const startX = e.clientX;
        const startI = st.i;
        const STEP_PX = 12;
        document.body.classList.add('scrubbing');
        const move = (ev) => {
          const delta = Math.round((ev.clientX - startX) / STEP_PX);
          st.i = Math.max(0, Math.min(st.scale.length - 1, startI + delta));
        };
        const up = () => {
          document.body.classList.remove('scrubbing');
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      },

      setSeg(group, value) {
        this.segs[group] = value;
      },
    }));
  });
}
