import Alpine from 'alpinejs';
import { KEEP, VIEWPORT_NOTES } from '../data/shared.js';

export function registerPanel() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('panel', () => ({
      tab: 'design',
      viewport: 'auto',
      simRun: false,
      simDirty: false,
      selectedKind: 'orig',
      crumbLeaf: 'root',
      crumbName: 'PriceCard',

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

      setTab(id) {
        this.tab = id;
      },

      setViewport(vb) {
        this.viewport = vb;
      },

      get vbNote() {
        return VIEWPORT_NOTES[this.viewport] ?? VIEWPORT_NOTES.auto;
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

      stepAdjust(key, delta) {
        const st = this.steppers[key];
        st.i = Math.max(0, Math.min(st.scale.length - 1, st.i + delta));
      },

      setSeg(group, value) {
        this.segs[group] = value;
      },

      get keepConfig() {
        return KEEP[this.storeSelectedKind] ?? KEEP.orig;
      },

      get keepDisabled() {
        return !this.keepConfig.on;
      },

      get keepLabel() {
        return this.storeSelectedKind === 'adopted' ? 'Kept' : 'Keep this version';
      },

      openKeep() {
        Alpine.store('mock').branchModalOpen = true;
      },

      toggleSimRun() {
        this.simRun = !this.simRun;
        this.$dispatch('sim-run', { on: this.simRun });
        if (this.simRun) this.tab = 'transcript';
      },

      toggleSimDirty() {
        this.simDirty = !this.simDirty;
        Alpine.store('mock').isDirty = this.simDirty;
      },
    }));
  });
}
