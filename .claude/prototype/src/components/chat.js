import Alpine from 'alpinejs';
import { MODELS, EFFORTS, SKILLS, PERMISSIONS, WORKSPACES, CURRENT_WORKTREE } from '../data/shared.js';

export function registerChat() {
  document.addEventListener('alpine:init', () => {
    // One Composer, shared state. Rendered in two placements (canvas floor +
    // Agents tab) that both read this store, so expanding relocates the same
    // Composer and keeps the same thread.
    Alpine.store('chat', {
      model: MODELS[0],
      effort: 'high',
      mode: 'explore',
      branch: 'pg/quiet-numeric',
      worktree: CURRENT_WORKTREE,
      permission: PERMISSIONS[0].id,
      annotations: 2,
      maxDots: 5,
      expanded: false,
      draft: '',
      tags: [
        { id: 'comp', type: 'comp', label: 'PriceCard' },
        { id: 'text', type: 'text', label: 'text' },
        { id: 'img', type: 'img', label: 'stripe-pricing' },
      ],

      get permissionLabel() {
        return (PERMISSIONS.find((p) => p.id === this.permission) ?? PERMISSIONS[0]).label;
      },

      get effortLabel() {
        return (EFFORTS.find((e) => e.id === this.effort) ?? EFFORTS[2]).label;
      },

      get isComposerEmbedded() {
        return this.expanded && Alpine.store('ui').rightTab === 'agents';
      },

      // True when the composer is floating on the canvas rather than living inside an agent panel.
      // agent-right mounts it in the rail permanently; canvas-dock moves it there when expanded.
      get isComposerDocked() {
        return Alpine.store('ui').layout !== 'agent-right' && !this.isComposerEmbedded;
      },

      get annotationsTipLabel() {
        return this.annotations === 0 ? 'Enable annotations' : 'Disable annotations';
      },

      get annotationsTipDesc() {
        return this.annotations === 0 ? 'Point, comment, and prompt' : '';
      },

      get annotationsTipArt() {
        return this.annotations === 0 ? 'annotate' : '';
      },

      get annotationsAriaLabel() {
        const desc = this.annotationsTipDesc;
        return desc ? `${this.annotationsTipLabel}. ${desc}` : this.annotationsTipLabel;
      },

      cycleModel() {
        this.model = MODELS[(MODELS.indexOf(this.model) + 1) % MODELS.length];
      },
      setModel(m) {
        this.model = m;
      },
      setEffort(id) {
        this.effort = id;
      },
      resetModelDefaults() {
        this.model = MODELS[0];
        this.effort = 'high';
      },
      setMode(mode) {
        this.mode = mode;
      },
      setPermission(id) {
        this.permission = id;
      },
      get workspace() {
        return WORKSPACES.find((w) => w.branch === this.branch) ?? WORKSPACES[0];
      },

      get scene() {
        return this.workspace.scene;
      },

      setBranch(name) {
        this.branch = name;
        this.tags = this.workspace.tags.map((t) => ({ ...t }));
      },
      bumpAnnotations() {
        // simulate select-into-prompt: each click increments, wraps at max
        this.annotations = this.annotations >= this.maxDots ? 0 : this.annotations + 1;
      },
      removeTag(id) {
        this.tags = this.tags.filter((t) => t.id !== id);
      },
      toggleExpanded() {
        if (this.isComposerEmbedded) {
          this.expanded = false;
        } else {
          this.expanded = true;
          const ui = Alpine.store('ui');
          ui.rightTab = 'agents';
          ui.rightOpen = true;
        }
      },
    });

    // Right-column tab state, lifted to a store so the Composer's expand can
    // switch the DesignAgents panel to the Agents tab.
    Alpine.store('ui', {
      layout: document.body.dataset.layout ?? 'canvas-dock',
      rightTab: 'design',
      agentOpen: true,
      // Right flank (single-sidebar): one card showing Design or Agent, long-lived, open.
      rightOpen: true,
      sections: { layers: true, props: true, tokens: false, prims: false },

      // The composer floats on the canvas in every layout except agent-right (where the rail owns it).
      get composerDocks() {
        return this.layout !== 'agent-right';
      },

      setRightTab(tab) {
        this.rightTab = tab;
        if (tab !== 'agents') Alpine.store('chat').expanded = false;
      },

      // The right flank's switcher: pick a view; also reopens the flank if it was closed.
      showView(view) {
        this.setRightTab(view);
        this.rightOpen = true;
      },

      toggleSection(id) {
        this.sections[id] = !this.sections[id];
      },

      // Reaching for a design section from anywhere: open the flank, open that section.
      revealSection(id) {
        this.rightOpen = true;
        this.rightTab = 'design';
        this.sections[id] = true;
      },

      toggleAgent() {
        if (this.layout !== 'agent-right') return;
        this.agentOpen = !this.agentOpen;
      },
    });

    // Thin per-instance component: only local popover state; all data is the store.
    Alpine.data('composer', () => ({
      menu: null,
      submenu: null,
      submenuFlip: false,
      modelMenuWidth: null,
      models: MODELS,
      efforts: EFFORTS,
      permissions: PERMISSIONS,
      workspaces: WORKSPACES,
      skillPickerOpen: false,
      skillQuery: '',
      skillHighlight: 0,
      impeccableSubOpen: false,

      growInput(el) {
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      },

      toggleMenu(name) {
        if (this.menu === name) {
          this.closeMenu();
        } else {
          this.menu = name;
          this.submenu = null;
          this.submenuFlip = false;
          if (name === 'model') {
            this.$nextTick(() => {
              const menuEl = this.$root.querySelector('.model-menu');
              if (menuEl) this.modelMenuWidth = Math.ceil(menuEl.offsetWidth);
            });
          }
        }
      },
      closeMenu() {
        this.menu = null;
        this.submenu = null;
        this.submenuFlip = false;
        this.modelMenuWidth = null;
      },
      openSubmenu(name, evt) {
        this.submenu = name;
        this.$nextTick(() => {
          const row = evt?.currentTarget;
          const sub = row?.querySelector('.ctx-submenu') ?? row?.parentElement?.querySelector('.ctx-submenu');
          if (!sub) return;
          const rect = sub.getBoundingClientRect();
          this.submenuFlip = rect.right > window.innerWidth - 8;
        });
      },
      pickModel(m) {
        this.$store.chat.setModel(m);
        this.closeMenu();
      },
      pickEffort(id) {
        this.$store.chat.setEffort(id);
        this.closeMenu();
      },
      pickPermission(id) {
        this.$store.chat.setPermission(id);
        this.closeMenu();
      },
      pickBranch(name) {
        this.$store.chat.setBranch(name);
        this.closeMenu();
      },
      openModelSettings() {
        this.closeMenu();
        Alpine.store('modals').openModelSettings();
      },
      resetModelDefaults() {
        this.$store.chat.resetModelDefaults();
        this.closeMenu();
      },

      syncSkillPicker() {
        const draft = this.$store.chat.draft;
        const match = draft.match(/(?:^|\s)\/([^\s]*)$/);
        if (!match) {
          this.closeSkillPicker();
          return;
        }
        this.skillPickerOpen = true;
        this.skillQuery = match[1] ?? '';
        if (this.skillHighlight >= this.visibleSkills.length) {
          this.skillHighlight = Math.max(0, this.visibleSkills.length - 1);
        }
      },

      closeSkillPicker() {
        this.skillPickerOpen = false;
        this.skillQuery = '';
        this.skillHighlight = 0;
        this.impeccableSubOpen = false;
      },

      get visibleSkills() {
        const q = this.skillQuery.toLowerCase();
        if (this.impeccableSubOpen) {
          const parent = SKILLS.find((s) => s.id === 'impeccable');
          const children = parent?.children ?? [];
          return children.filter((c) => c.id.toLowerCase().includes(q) || c.id.split(':')[1]?.includes(q));
        }
        return SKILLS.filter((s) => s.label.toLowerCase().includes(q));
      },

      isImpeccableRow(item) {
        return !this.impeccableSubOpen && item.id === 'impeccable';
      },

      skillRowLabel(item) {
        if (this.impeccableSubOpen) return item.id.split(':')[1] ?? item.id;
        return item.label;
      },

      insertSkill(item) {
        const draft = this.$store.chat.draft;
        const token = `/${item.id} `;
        this.$store.chat.draft = draft.replace(/(?:^|\s)\/[^\s]*$/, (m) => {
          const lead = m.startsWith(' ') ? ' ' : '';
          return `${lead}${token.trimStart()}`;
        });
        this.closeSkillPicker();
        this.$nextTick(() => {
          const ta = this.$root.querySelector('.chat-input');
          if (ta) {
            ta.focus();
            this.growInput(ta);
          }
        });
      },

      onSkillHover(index) {
        this.skillHighlight = index;
      },

      onInput(evt) {
        this.growInput(evt.target);
        this.syncSkillPicker();
      },

      onInputKeydown(evt) {
        if (!this.skillPickerOpen) return;

        const items = this.visibleSkills;
        if (evt.key === 'Escape') {
          evt.preventDefault();
          this.closeSkillPicker();
          return;
        }
        if (evt.key === ' ' && this.skillQuery === '' && !this.impeccableSubOpen) {
          this.closeSkillPicker();
          return;
        }
        if (evt.key === 'ArrowDown') {
          evt.preventDefault();
          this.skillHighlight = items.length ? (this.skillHighlight + 1) % items.length : 0;
          return;
        }
        if (evt.key === 'ArrowUp') {
          evt.preventDefault();
          this.skillHighlight = items.length ? (this.skillHighlight - 1 + items.length) % items.length : 0;
          return;
        }
        if (evt.key === 'Enter' && items.length) {
          evt.preventDefault();
          this.selectHighlightedSkill();
          return;
        }
        if (evt.key === 'ArrowRight' && !this.impeccableSubOpen) {
          const item = items[this.skillHighlight];
          if (item?.id === 'impeccable') {
            evt.preventDefault();
            this.impeccableSubOpen = true;
            this.skillHighlight = 0;
          }
          return;
        }
        if ((evt.key === 'ArrowLeft' || evt.key === 'Backspace') && this.impeccableSubOpen && this.skillQuery === '') {
          evt.preventDefault();
          this.impeccableSubOpen = false;
          this.skillHighlight = 0;
        }
      },

      selectHighlightedSkill() {
        const item = this.visibleSkills[this.skillHighlight];
        if (!item) return;
        if (!this.impeccableSubOpen && item.id === 'impeccable') {
          this.impeccableSubOpen = true;
          this.skillHighlight = 0;
          return;
        }
        this.insertSkill(item);
      },

      pickSkill(index) {
        this.skillHighlight = index;
        this.selectHighlightedSkill();
      },

      backFromImpeccable() {
        this.impeccableSubOpen = false;
        this.skillHighlight = 0;
      },

      openSkillsCatalog() {
        this.closeSkillPicker();
        Alpine.store('modals').openSkillsCatalog();
      },
    }));
  });
}
