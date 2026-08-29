import Alpine from 'alpinejs';

// Every control's factory setting. The `edits` store clones this per selected element,
// so a value you drag stays on the element you dragged it on.
const STEPPERS = {
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
};

const SEGS = {
  font: 'bold',
  nums: 'prop',
  disp: 'grid',
  align: 'start',
};

// The six sections design-styles.md settles, in its order, each with the glyph the
// canvas badge collapses it to. Colour is wired with no control behind it yet.
const CATEGORY_ICONS = {
  Spacing: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  Typography: '<path d="M4 6V4h16v2"/><path d="M12 4v16"/><path d="M9 20h6"/>',
  Colour: '<path d="M12 2a10 10 0 1 0 0 20 1.9 1.9 0 0 0 1.9-1.9c0-.5-.2-.9-.5-1.2a1.7 1.7 0 0 1 1.2-2.9H17a5 5 0 0 0 5-5c0-5-4.5-9-10-9Z"/><circle cx="7.5" cy="12" r="1"/><circle cx="9.5" cy="7.5" r="1"/><circle cx="14.5" cy="7" r="1"/>',
  'Border & shape': '<path d="M4 15V8a4 4 0 0 1 4-4h7"/><path d="M20 9v7a4 4 0 0 1-4 4H9"/>',
  Effects: '<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M9 21h10a2 2 0 0 0 2-2V9"/>',
  Layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M9 12h12"/>',
};

// Which section each control reports into, in the order the pills read. Segmented
// controls carry their own formatter because the class is not `prefix-value` for all
// of them — `disp` writes the bare utility.
const CONTROLS = [
  { category: 'Spacing', step: 'p' },
  { category: 'Spacing', step: 'gap' },
  { category: 'Spacing', step: 'space-y' },
  { category: 'Typography', step: 'text' },
  { category: 'Typography', step: 'tracking' },
  { category: 'Typography', step: 'leading' },
  { category: 'Typography', seg: 'font', cls: (v) => `font-${v}` },
  { category: 'Border & shape', step: 'rounded' },
  { category: 'Border & shape', step: 'border' },
  { category: 'Border & shape', step: 'ring' },
  { category: 'Effects', step: 'shadow' },
  { category: 'Effects', step: 'opacity' },
  { category: 'Layout', seg: 'disp', cls: (v) => v },
  { category: 'Layout', seg: 'align', cls: (v) => `items-${v}` },
];

function stepClass(st, key) {
  const v = st.scale[st.i];
  if (st.named) return `${st.prefix}-${v}`;
  if (v === '0' && key !== 'opacity') return '—';
  return `${st.prefix}-${v}`;
}

export function registerDesignAgents() {
  document.addEventListener('alpine:init', () => {
    /**
     * One set of control values per selected element, keyed by the full selection path
     * (`PriceCard`, `PriceCard.Button`). The Design menu writes here and the canvas
     * badge reads here, so what a control shows and what the badge lists are the same
     * fact rather than two lists that can drift.
     */
    Alpine.store('edits', {
      entries: {},

      keyFor(name, leaf) {
        return leaf === 'root' ? name : `${name}.${leaf}`;
      },

      // Cloned on first selection, so an element you have never touched reads clean and
      // `i0` is that element's own baseline rather than a global one.
      entry(key) {
        if (!this.entries[key]) {
          this.entries[key] = {
            steppers: Object.fromEntries(
              Object.entries(STEPPERS).map(([k, st]) => [k, { ...st }]),
            ),
            segs: { ...SEGS },
            segs0: { ...SEGS },
          };
        }
        return this.entries[key];
      },

      /** Ordered `{ category, cls }` for every control this element has moved. */
      pending(key) {
        const e = this.entry(key);
        const out = [];
        for (const c of CONTROLS) {
          if (c.step) {
            const st = e.steppers[c.step];
            if (st.i !== st.i0) out.push({ category: c.category, cls: stepClass(st, c.step) });
          } else if (e.segs[c.seg] !== e.segs0[c.seg]) {
            out.push({ category: c.category, cls: c.cls(e.segs[c.seg]) });
          }
        }
        return out;
      },

      /** The same list folded to one row per section, for the badge's category mode. */
      grouped(key) {
        const out = [];
        for (const { category, cls } of this.pending(key)) {
          const row = out.find((g) => g.category === category);
          if (row) row.cls += ` ${cls}`;
          else out.push({ category, cls, icon: CATEGORY_ICONS[category] });
        }
        return out;
      },

      // Applying moves each baseline up to where the control now stands, so the element
      // reads clean with its applied state as the thing further edits are measured from.
      apply(key) {
        const e = this.entry(key);
        for (const st of Object.values(e.steppers)) st.i0 = st.i;
        e.segs0 = { ...e.segs };
      },
    });

    Alpine.data('designAgents', () => ({
      // The pending edits, listed beside the name of what they are pending on. The panel
      // reads the same entry the controls write, so a pill and its scrubber are one value.
      get pendingEdits() {
        return this.$store.edits.pending(this.editKey);
      },

      get groupedEdits() {
        return this.$store.edits.grouped(this.editKey);
      },

      // The edits ride as a second `cn()` argument while you work; Apply flattens them into
      // the literal class string in the double quotes and lets the merge dedupe the
      // conflicts. Per-element: this commits this selection and nothing else.
      applyEdits() {
        this.$store.edits.apply(this.editKey);
        this.$dispatch('edits-applied');
      },

      // Every control reads and writes the entry for whatever is selected right now.
      get editKey() {
        return this.$store.edits.keyFor(this.$store.mock.crumbName, this.$store.mock.crumbLeaf);
      },

      get steppers() {
        return this.$store.edits.entry(this.editKey).steppers;
      },

      get segs() {
        return this.$store.edits.entry(this.editKey).segs;
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
        return stepClass(this.steppers[key], key);
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
