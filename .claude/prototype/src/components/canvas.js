import Alpine from 'alpinejs';
import { helpItems, whatsNew } from '../data/helpMenu.js';
import { NODE_NAMES, ADOPT } from '../data/shared.js';

export function registerCanvas() {
  document.addEventListener('alpine:init', () => {
    Alpine.store('help', {
      items: helpItems,
      whatsNew,
      open: false,
      toggle() {
        this.open = !this.open;
      },
      close() {
        this.open = false;
      },
    });

    Alpine.data('canvas', () => ({
      selectedNode: 'price',
      selectedKind: 'orig',
      selectedEl: null,
      crumbLeaf: 'root',
      activeTool: 'select',
      zoom: 100,
      panX: 0,
      panY: 0,
      isPanning: false,
      _panStartX: 0,
      _panStartY: 0,
      _panOriginX: 0,
      _panOriginY: 0,
      undone: 0,
      maxUndo: 3,
      // each preview node carries its own viewport (ViewportSelector lives on the node)
      nodeViewports: { price: 'auto', it1: 'auto', it2: 'auto' },

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

      shouldPan(event) {
        if (event.button === 1) return true;
        return this.activeTool === 'hand' && event.button === 0;
      },

      onBoardPointerDown(event) {
        if (!this.shouldPan(event)) return;
        event.preventDefault();
        this.isPanning = true;
        this._panStartX = event.clientX;
        this._panStartY = event.clientY;
        this._panOriginX = this.panX;
        this._panOriginY = this.panY;
        event.currentTarget.setPointerCapture(event.pointerId);
      },

      onBoardPointerMove(event) {
        if (!this.isPanning) return;
        this.panX = this._panOriginX + (event.clientX - this._panStartX);
        this.panY = this._panOriginY + (event.clientY - this._panStartY);
      },

      onBoardPointerUp(event) {
        if (!this.isPanning) return;
        this.isPanning = false;
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      },

      boardStyle() {
        return `transform: translate(${this.panX}px, ${this.panY}px)`;
      },

      nodeViewport(id) {
        return this.nodeViewports[id] ?? 'auto';
      },

      setNodeViewport(id, vb) {
        this.nodeViewports[id] = vb;
      },

      adoptOn(kind) {
        return (ADOPT[kind] ?? {}).on ?? false;
      },

      adoptLabel(kind) {
        return (ADOPT[kind] ?? {}).label ?? 'Keep';
      },

      // Prototype stub — the button and its states are the design; what Keep does
      // to git is out of scope for the mock.
      adopt(kind) {
        if (!this.adoptOn(kind)) return;
        console.log('[prototype] adopt', kind);
      },

      // Prototype stub — logs only; does not remove mock nodes.
      deleteNode(kind) {
        console.log('[prototype] deleteNode', kind);
      },

      zoomIn() {
        this.zoom = Math.min(400, this.zoom + 25);
      },

      zoomOut() {
        this.zoom = Math.max(25, this.zoom - 25);
      },

      undo() {
        if (this.undone < this.maxUndo) this.undone++;
      },

      redo() {
        if (this.undone > 0) this.undone--;
      },
    }));
  });
}
