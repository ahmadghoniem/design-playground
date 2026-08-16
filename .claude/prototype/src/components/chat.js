import Alpine from 'alpinejs';
import { AGENTS, MODEL_INDEX, DEFAULT_MODEL, EFFORT_LADDER, SKILLS, PERMISSIONS, CURRENT_BRANCH, CURRENT_WORKTREE } from '../data/shared.js';

export function registerChat() {
  document.addEventListener('alpine:init', () => {
    // One Composer, shared state. Rendered in two placements (canvas floor +
    // Agents tab) that both read this store, so expanding relocates the same
    // Composer and keeps the same thread.
    Alpine.store('chat', {
      model: DEFAULT_MODEL,
      effort: 'high',
      mode: 'explore',
      branch: CURRENT_BRANCH,
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

      get currentPermission() {
        return PERMISSIONS.find((p) => p.id === this.permission) ?? PERMISSIONS[0];
      },

      get permissionLabel() {
        return this.currentPermission.label;
      },

      get permissionTone() {
        return this.currentPermission.tone;
      },

      // The chip shows one word, so the sentence has to reach the user somewhere:
      // it is the tooltip and the accessible name, not just a menu row you have to open.
      get permissionHint() {
        return `${this.currentPermission.label} — ${this.currentPermission.hint}`;
      },

      agents: AGENTS,

      effortLabelFor(id) {
        return (EFFORT_LADDER.find((e) => e.id === id) ?? EFFORT_LADDER[2]).label;
      },

      get currentModel() {
        return MODEL_INDEX[this.model] ?? MODEL_INDEX[DEFAULT_MODEL];
      },
      get modelLabel() {
        return this.currentModel.label;
      },
      get agentName() {
        return this.currentModel.agent;
      },
      get effortLabel() {
        return this.effortLabelFor(this.effort);
      },
      // The effort picker is rebuilt from the chosen model: the levels a model supports
      // differ per model, so a fixed list would offer options the model cannot honour.
      get availableEfforts() {
        const supported = this.currentModel.efforts;
        return EFFORT_LADDER.filter((e) => supported.includes(e.id));
      },
      // The reset row is only useful once you have hand-overridden the model's own default.
      get effortIsDefault() {
        return this.effort === this.currentModel.effort;
      },

      // The composer lives in the Agents tab whenever that tab is showing, and floats
      // on the canvas otherwise. One control, two placements, one state.
      get isComposerEmbedded() {
        return Alpine.store('ui').rightTab === 'agents';
      },

      get isComposerDocked() {
        return !this.isComposerEmbedded;
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

      // Picking a model applies that model's own default effort, and the effort picker
      // moves with it — the common case never needs a second trip into the submenu.
      setModel(id) {
        this.model = id;
        this.effort = this.currentModel.effort;
      },
      setEffort(id) {
        this.effort = id;
      },
      resetEffort() {
        this.effort = this.currentModel.effort;
      },
      setMode(mode) {
        this.mode = mode;
      },
      setPermission(id) {
        this.permission = id;
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
          Alpine.store('ui').rightTab = 'design';
        } else {
          this.expanded = true;
          Alpine.store('ui').rightTab = 'agents';
        }
      },
    });

    // Right-column tab state, lifted to a store so the Composer's expand can
    // switch the DesignAgents panel to the Agents tab.
    Alpine.store('ui', {
      rightTab: 'design',
      // Wonder collapse: the flank leaves the grid and its head survives as a
      // floating pill, so the panel is never lost, only put away.
      leftCollapsed: false,
      rightCollapsed: false,

      setRightTab(tab) {
        this.rightTab = tab;
        if (tab !== 'agents') Alpine.store('chat').expanded = false;
      },

      toggleLeftFlank() {
        this.leftCollapsed = !this.leftCollapsed;
      },

      toggleRightFlank() {
        this.rightCollapsed = !this.rightCollapsed;
      },

      // The collapsed pill keeps its tabs live, so picking one reopens the
      // panel on that view instead of only switching a hidden tab.
      openRight(tab) {
        this.setRightTab(tab);
        this.rightCollapsed = false;
      },
    });

    // Thin per-instance component: only local popover state; all data is the store.
    Alpine.data('composer', () => ({
      menu: null,
      submenu: null,
      submenuFlip: false,
      modelMenuWidth: null,
      modelQuery: '',
      permissions: PERMISSIONS,
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
      openModelSettings() {
        this.closeMenu();
        Alpine.store('modals').openModelSettings();
      },
      resetEffort() {
        if (this.$store.chat.effortIsDefault) return;
        this.$store.chat.resetEffort();
        this.closeMenu();
      },

      // Search filters within each agent group; a group with no match drops out entirely,
      // heading included, so the list never shows an empty section.
      matchesModel(model) {
        const q = this.modelQuery.trim().toLowerCase();
        return !q || model.label.toLowerCase().includes(q);
      },
      agentHasMatch(agent) {
        return agent.models.some((m) => this.matchesModel(m));
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
