import Alpine from 'alpinejs';
import { helpItems, whatsNew } from '../data/helpMenu.js';
import { NODE_NAMES } from '../data/shared.js';

export function registerCanvas() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('canvas', () => ({
      helpItems,
      whatsNew,
      helpOpen: false,
      selectedNode: 'price',
      selectedKind: 'orig',
      selectedEl: null,
      crumbLeaf: 'root',
      activeTool: 'select',
      sidebarOpen: true,
      zoom: 100,
      undone: 0,
      maxUndo: 3,

      get crumbName() {
        return NODE_NAMES[this.selectedKind] ?? 'PriceCard';
      },

      selectNode(id, kind, event) {
        const el = event.target.closest('.el');
        const node = event.target.closest('.node');
        if (!node) return;

        if (el && this.selectedNode === id) {
          this.selectedEl = this.selectedEl === el.dataset.el ? null : el.dataset.el;
          this.crumbLeaf = this.selectedEl ?? 'root';
          Alpine.store('mock').crumbLeaf = this.crumbLeaf;
          return;
        }

        this.selectedNode = id;
        this.selectedKind = kind;
        this.selectedEl = null;
        this.crumbLeaf = 'root';
        const store = Alpine.store('mock');
        store.selectedKind = kind;
        store.crumbName = NODE_NAMES[kind] ?? 'PriceCard';
        store.crumbLeaf = 'root';
        this.$dispatch('node-selected', { kind });
      },

      isElSelected(elId) {
        return this.selectedEl === elId;
      },

      setTool(tool) {
        this.activeTool = tool;
      },

      toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        const side = document.querySelector('.side');
        const body = document.querySelector('.app-body');
        if (side && body) {
          side.style.display = this.sidebarOpen ? '' : 'none';
          body.style.gridTemplateColumns = this.sidebarOpen
            ? '280px minmax(0,1fr) 306px'
            : '0 minmax(0,1fr) 306px';
        }
      },

      zoomIn() {
        this.zoom = Math.min(400, this.zoom + 25);
      },

      zoomOut() {
        this.zoom = Math.max(25, this.zoom - 25);
      },

      zoomToSelection() {
        this.zoom = 150;
      },

      undo() {
        if (this.undone < this.maxUndo) this.undone++;
      },

      redo() {
        if (this.undone > 0) this.undone--;
      },

      init() {
        document.addEventListener('click', (e) => {
          const wrap = this.$refs.helpWrap;
          if (this.helpOpen && wrap && !wrap.contains(e.target)) this.closeHelp();
        });
      },

      toggleHelp() {
        this.helpOpen = !this.helpOpen;
      },

      closeHelp() {
        this.helpOpen = false;
      },
    }));
  });
}
