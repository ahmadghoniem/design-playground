import Alpine from 'alpinejs';

const STORAGE_KEY = 'pg-goo-config';

const DEFAULTS = {
  enabled: true,
  blur: 5,
  slope: 18,
  intercept: -7,
  blobSize: 16,
  blobReach: 8,
  blobOverlap: 8,
  tipOffset: 14,
  anchor: true,
  anchorSize: 18,
};

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function persist(state) {
  const payload = {};
  for (const key of Object.keys(DEFAULTS)) {
    payload[key] = state[key];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function buildStoreMethods(state) {
  return {
    apply() {
      if (!document.getElementById('pg-goo')) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.setAttribute('style', 'position:absolute');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = `<defs>
          <filter id="pg-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>
            <feBlend in="SourceGraphic" in2="goo"/>
          </filter>
        </defs>`;
        document.body.appendChild(svg);
      }

      const blurNode = document.querySelector('#pg-goo feGaussianBlur');
      const matrixNode = document.querySelector('#pg-goo feColorMatrix');
      if (blurNode) blurNode.setAttribute('stdDeviation', String(state.blur));
      if (matrixNode) {
        matrixNode.setAttribute(
          'values',
          `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${state.slope} ${state.intercept}`,
        );
      }

      const root = document.documentElement;
      root.classList.toggle('goo-off', !state.enabled);
      root.style.setProperty('--goo-blob-size', `${state.blobSize}px`);
      root.style.setProperty('--goo-blob-reach', `${state.blobReach}px`);
      root.style.setProperty('--goo-blob-overlap', `${state.blobOverlap}px`);
      root.style.setProperty('--goo-anchor-size', `${state.anchorSize}px`);

      persist(state);
    },

    reset() {
      Object.assign(state, DEFAULTS);
      this.apply();
    },

    asCss() {
      const filter = state.enabled ? 'url(#pg-goo)' : 'none';
      return `/* Goo filter — paste SVG defs once, then use the custom properties */
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="pg-goo">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${state.blur}" result="blur"/>
      <feColorMatrix in="blur" mode="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${state.slope} ${state.intercept}" result="goo"/>
      <feBlend in="SourceGraphic" in2="goo"/>
    </filter>
  </defs>
</svg>

:root {
  --goo-surface-pad: 96px;
  --goo-blob-size: ${state.blobSize}px;
  --goo-blob-reach: ${state.blobReach}px;
  --goo-blob-overlap: ${state.blobOverlap}px;
  --goo-anchor-size: ${state.anchorSize}px;
}

.pg-tip-surface,
.goo-lab-shapes {
  filter: ${filter};
}`;
    },
  };
}

const NUMERIC_FIELDS = [
  { key: 'blur', label: 'blur', min: 0, max: 20, step: 0.5 },
  { key: 'slope', label: 'slope', min: 1, max: 40, step: 1 },
  { key: 'intercept', label: 'intercept', min: -25, max: 0, step: 0.5 },
  { key: 'blobSize', label: 'blob size', min: 6, max: 40, step: 1 },
  { key: 'blobReach', label: 'blob reach', min: 0, max: 40, step: 1 },
  { key: 'blobOverlap', label: 'blob overlap', min: 0, max: 24, step: 1 },
  { key: 'tipOffset', label: 'tip offset', min: 0, max: 40, step: 1 },
  { key: 'anchorSize', label: 'anchor size', min: 6, max: 40, step: 1 },
];

export function registerGoo() {
  document.addEventListener('alpine:init', () => {
    const state = { ...DEFAULTS, ...loadSaved() };
    const methods = buildStoreMethods(state);
    const store = Object.assign(state, methods);
    Alpine.store('goo', store);
    store.apply();

    Alpine.data('gooPanel', () => ({
      open: false,
      copied: false,
      fields: NUMERIC_FIELDS,
      _copyTimer: null,

      toggle() {
        this.open = !this.open;
      },

      onFieldInput() {
        this.$store.goo.apply();
      },

      reset() {
        this.$store.goo.reset();
      },

      async copyCss() {
        try {
          await navigator.clipboard.writeText(this.$store.goo.asCss());
          this.copied = true;
          clearTimeout(this._copyTimer);
          this._copyTimer = setTimeout(() => {
            this.copied = false;
          }, 1500);
        } catch {
          /* clipboard unavailable */
        }
      },
    }));
  });
}

export function registerGooLab() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('gooLab', () => ({
      kinds: ['circle', 'square', 'rounded', 'pill', 'rect'],
      activeShape: 'a',
      sweep: 50,
      _drag: null,
      _sweepBase: null,

      shapeA: {
        kind: 'rounded',
        width: 120,
        height: 120,
        radius: 24,
        x: 180,
        y: 220,
      },

      shapeB: {
        kind: 'circle',
        width: 100,
        height: 100,
        radius: 50,
        x: 420,
        y: 280,
      },

      init() {
        this._sweepBase = this.captureSweepBase();
        this.applySweep();
      },

      selectShape(id) {
        this.activeShape = id;
      },

      active() {
        return this.activeShape === 'a' ? this.shapeA : this.shapeB;
      },

      radiusDisabled(kind) {
        return kind === 'circle' || kind === 'pill';
      },

      borderRadius(shape) {
        switch (shape.kind) {
          case 'circle':
            return '50%';
          case 'pill':
            return '999px';
          case 'rounded':
            return `${shape.radius}px`;
          default:
            return `${shape.radius}px`;
        }
      },

      onKindChange(shape, kind) {
        shape.kind = kind;
        if (kind === 'rounded' && shape.radius === 0) shape.radius = 16;
        if (kind === 'circle') {
          const size = Math.max(shape.width, shape.height);
          shape.width = size;
          shape.height = size;
        }
      },

      shapeStyle(shape) {
        return {
          width: `${shape.width}px`,
          height: `${shape.height}px`,
          borderRadius: this.borderRadius(shape),
          transform: `translate(${shape.x}px, ${shape.y}px)`,
        };
      },

      rectEdges(shape) {
        return {
          left: shape.x,
          top: shape.y,
          right: shape.x + shape.width,
          bottom: shape.y + shape.height,
        };
      },

      center(shape) {
        return {
          x: shape.x + shape.width / 2,
          y: shape.y + shape.height / 2,
        };
      },

      edgeGap() {
        const a = this.rectEdges(this.shapeA);
        const b = this.rectEdges(this.shapeB);
        const gapX = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
        const gapY = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
        if (gapX === 0 && gapY === 0) return 0;
        if (gapX === 0) return gapY;
        if (gapY === 0) return gapX;
        return Math.hypot(gapX, gapY);
      },

      centerDistance() {
        const ca = this.center(this.shapeA);
        const cb = this.center(this.shapeB);
        return Math.hypot(cb.x - ca.x, cb.y - ca.y);
      },

      captureSweepBase() {
        const ca = this.center(this.shapeA);
        const cb = this.center(this.shapeB);
        const dx = cb.x - ca.x;
        const dy = cb.y - ca.y;
        const dist = Math.hypot(dx, dy) || 1;
        return {
          ux: dx / dist,
          uy: dy / dist,
          minDist: (this.shapeA.width + this.shapeB.width) / 2,
          maxDist: Math.max(dist, (this.shapeA.width + this.shapeB.width) / 2 + 240),
        };
      },

      applySweep() {
        if (!this._sweepBase) this._sweepBase = this.captureSweepBase();
        const t = this.sweep / 100;
        const dist = this._sweepBase.minDist + t * (this._sweepBase.maxDist - this._sweepBase.minDist);
        const ca = this.center(this.shapeA);
        this.shapeB.x = ca.x + this._sweepBase.ux * dist - this.shapeB.width / 2;
        this.shapeB.y = ca.y + this._sweepBase.uy * dist - this.shapeB.height / 2;
        this.clampShape(this.shapeB);
      },

      onSweepInput() {
        this.applySweep();
      },

      clampShape(shape) {
        const stage = this.$refs.stage;
        if (!stage) return;
        const maxX = stage.clientWidth - shape.width;
        const maxY = stage.clientHeight - shape.height;
        shape.x = Math.max(0, Math.min(shape.x, maxX));
        shape.y = Math.max(0, Math.min(shape.y, maxY));
      },

      onShapePointerDown(id, event) {
        const shape = id === 'a' ? this.shapeA : this.shapeB;
        this._drag = {
          id,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: shape.x,
          originY: shape.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },

      onShapePointerMove(event) {
        if (!this._drag || this._drag.pointerId !== event.pointerId) return;
        const shape = this._drag.id === 'a' ? this.shapeA : this.shapeB;
        shape.x = this._drag.originX + (event.clientX - this._drag.startX);
        shape.y = this._drag.originY + (event.clientY - this._drag.startY);
        this.clampShape(shape);
        this._sweepBase = this.captureSweepBase();
      },

      onShapePointerUp(event) {
        if (!this._drag || this._drag.pointerId !== event.pointerId) return;
        this._drag = null;
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* already released */
        }
      },
    }));
  });
}
