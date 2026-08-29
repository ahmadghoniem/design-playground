import Alpine from 'alpinejs';
import { AGENTS, MODEL_INDEX, DEFAULT_MODEL, EFFORT_LADDER, SKILLS, PERMISSIONS, CURRENT_BRANCH, CURRENT_WORKTREE, CURRENT_LINES_ADDED, CURRENT_LINES_REMOVED, ASK_QUESTIONS } from '../data/shared.js';

// The docked Composer's resting size and the bounds the corner grip may drag it to.
// Height is the input's: untouched it grows with the draft and stops at AUTO_CAP, and a
// drag pins it, so the box answers the grip even when there is nothing typed yet.
const DOCK_W = { min: 320, base: 500, max: 900 };
const INPUT_H = { min: 24, max: 420, autoCap: 120 };

export function registerChat() {
  document.addEventListener('alpine:init', () => {
    // One Composer, shared state. Rendered in two placements (canvas floor +
    // Agents tab) that both read this store, so expanding relocates the same
    // Composer and keeps the same thread.
    Alpine.store('chat', {
      model: DEFAULT_MODEL,
      effort: 'high',
      fast: false,
      branch: CURRENT_BRANCH,
      worktree: CURRENT_WORKTREE,
      linesAdded: CURRENT_LINES_ADDED,
      linesRemoved: CURRENT_LINES_REMOVED,
      dockWidth: DOCK_W.base,
      inputH: null,
      resizing: false,
      permission: PERMISSIONS[0].id,
      annotations: 2,
      maxDots: 5,
      expanded: false,
      stripOpen: true,
      askIndex: 0,
      askAnswers: {},
      askDone: false,
      draft: '',
      tags: [
        { id: 'comp', type: 'comp', label: 'PriceCard' },
        { id: 'text', type: 'text', label: 'text' },
        { id: 'img', type: 'img', label: 'stripe-pricing' },
      ],

      // The dock owns the width but lives in canvas.html, so the size travels as a custom
      // property rather than an inline style reaching across partials. Nothing scales:
      // width and height are written as real lengths, so the draft re-wraps at its true
      // size on every frame instead of being stretched like an image.
      setDockSize(width, inputH) {
        this.dockWidth = Math.round(Math.max(DOCK_W.min, Math.min(DOCK_W.max, width)));
        this.inputH = Math.round(Math.max(INPUT_H.min, Math.min(INPUT_H.max, inputH)));
        document.documentElement.style.setProperty('--dock-w', `${this.dockWidth}px`);
      },

      // Back to the declared width and to a height that follows the draft again.
      resetDockSize() {
        this.dockWidth = DOCK_W.base;
        this.inputH = null;
        document.documentElement.style.removeProperty('--dock-w');
      },

      // Untouched, the input is as tall as the draft needs up to the cap. Once dragged it
      // is the height you left it at, and a longer draft scrolls inside it.
      inputHeightFor(scrollHeight) {
        return this.inputH ?? Math.min(scrollHeight, INPUT_H.autoCap);
      },

      // A clean worktree is the absence of a figure, not a pair of zeroes: +0 next to −0
      // reads as a broken counter rather than as "nothing has changed yet".
      get hasChanges() {
        return this.linesAdded > 0 || this.linesRemoved > 0;
      },

      get linesAddedLabel() {
        return `+${this.linesAdded.toLocaleString('en-US')}`;
      },

      // U+2212 MINUS SIGN, so the figure sits on the same optical baseline and width as
      // the plus above it — a hyphen is shorter and rides low.
      get linesRemovedLabel() {
        return `−${this.linesRemoved.toLocaleString('en-US')}`;
      },

      // One turn at a time: the agent asked, so the strip carries the question it is
      // waiting on and nothing else. `askDone` is its own flag rather than an index run
      // off the end, so the current question stays addressable while the strip rests.
      get askQuestion() {
        return ASK_QUESTIONS[this.askIndex];
      },

      get askCounterLabel() {
        return `Question ${this.askIndex + 1} of ${ASK_QUESTIONS.length}`;
      },

      // The resting row counts what was actually recorded, so a skipped turn stays visible
      // instead of being absorbed into a full count.
      get askAnsweredLabel() {
        return `Answered · ${Object.keys(this.askAnswers).length} of ${ASK_QUESTIONS.length}`;
      },

      // Answering and skipping differ only in whether the turn leaves a record.
      answerQuestion(option) {
        this.askAnswers[this.askQuestion.id] = option;
        this.advanceQuestion();
      },

      skipQuestion() {
        this.advanceQuestion();
      },

      advanceQuestion() {
        if (this.askIndex + 1 < ASK_QUESTIONS.length) {
          this.askIndex += 1;
        } else {
          this.askDone = true;
        }
      },

      toggleStrip() {
        this.stripOpen = !this.stripOpen;
      },

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
      // Fast mode is a per-model capability, so the row is present for every model and
      // dead for the ones without the variant — a control that vanishes teaches nothing
      // about why it is gone.
      get fastSupported() {
        return Boolean(this.currentModel.fast);
      },
      get fastHint() {
        return this.fastSupported
          ? `Faster output from ${this.modelLabel}, same model`
          : `${this.modelLabel} has no fast variant`;
      },

      // The effort list marks this rung "(default)" rather than offering a way back to it:
      // a label is readable before you commit, where a reset row only speaks after you have
      // already left the default and never says what the default is.
      get modelDefaultEffort() {
        return this.currentModel.effort;
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
        // Fast cannot survive a switch to a model that has no fast variant.
        if (!this.fastSupported) this.fast = false;
      },
      toggleFast() {
        if (!this.fastSupported) return;
        this.fast = !this.fast;
      },
      setEffort(id) {
        this.effort = id;
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
      modelQuery: '',
      permissions: PERMISSIONS,
      skillPickerOpen: false,
      skillQuery: '',
      skillHighlight: 0,

      // What the input would measure with no pin: the height the draft alone asks for.
      naturalInputHeight(el) {
        const pinned = el.style.height;
        el.style.height = 'auto';
        const natural = Math.min(el.scrollHeight, INPUT_H.autoCap);
        el.style.height = pinned;
        return natural;
      },

      growInput(el) {
        el.style.height = 'auto';
        el.style.height = `${this.$store.chat.inputHeightFor(el.scrollHeight)}px`;
      },

      // Top-left corner grip. The dock is centred and bottom-anchored, so the box grows
      // the two directions there is room in: width opens symmetrically (the cursor moves
      // one edge, the centring moves the other, hence the doubled dx) and height climbs.
      // No preventDefault here: it would suppress the compatibility mouse events and take
      // the double-click reset with them. touch-action and the body's selection lock do
      // the job the default needed stopping for.
      resizeStart(e) {
        if (e.button !== 0) return;
        const chat = this.$store.chat;
        const startX = e.clientX;
        const startY = e.clientY;
        const input = this.$root.querySelector('.chat-input');
        const startW = chat.dockWidth;
        // Measured, not read from the store: until the first drag the height belongs to
        // the draft, so the gesture has to start from whatever is actually on screen.
        const startH = input ? input.offsetHeight : INPUT_H.min;
        // The draft's own height is the floor, so grabbing the grip cannot make the box
        // jump to a taller resting size before the pointer has moved.
        const floorH = input ? this.naturalInputHeight(input) : INPUT_H.min;

        chat.resizing = true;
        document.body.classList.add('resizing');

        const move = (ev) => {
          chat.setDockSize(
            startW + (startX - ev.clientX) * 2,
            Math.max(floorH, startH + (startY - ev.clientY)),
          );
          if (input) this.growInput(input);
        };
        const up = () => {
          chat.resizing = false;
          document.body.classList.remove('resizing');
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      },

      resizeReset() {
        this.$store.chat.resetDockSize();
        const input = this.$root.querySelector('.chat-input');
        if (input) this.growInput(input);
      },

      toggleMenu(name) {
        if (this.menu === name) {
          this.closeMenu();
        } else {
          this.menu = name;
          this.submenu = null;
          this.submenuFlip = false;
        }
      },
      closeMenu() {
        this.menu = null;
        this.submenu = null;
        this.submenuFlip = false;
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
      },

      get visibleSkills() {
        const q = this.skillQuery.toLowerCase();
        return SKILLS.filter((s) => s.label.toLowerCase().includes(q));
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
        if (evt.key === ' ' && this.skillQuery === '') {
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
      },

      selectHighlightedSkill() {
        const item = this.visibleSkills[this.skillHighlight];
        if (item) this.insertSkill(item);
      },

      pickSkill(index) {
        this.skillHighlight = index;
        this.selectHighlightedSkill();
      },
    }));
  });
}
