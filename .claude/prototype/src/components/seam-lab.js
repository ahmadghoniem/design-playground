import Alpine from 'alpinejs';

/**
 * Seam lab — a scratch dial for the model trigger's seam. It writes the same custom
 * properties `.model-picker-wrap` declares onto :root, so nothing in the trigger's CSS
 * knows the widget exists; pull the widget and the declared defaults stand.
 */

// The profile lives in a unit box: the x axis is the seam, the y axis is the trigger
// height, and preserveAspectRatio="none" stretches it to whatever those measure.
// `waist` is the bridge's height at its narrowest; `flare` is how late the curve turns
// as it runs out to the top and bottom edges — a low flare is a long concave sweep.
function seamPath(waist, flare) {
  const top = 50 - waist / 2;
  const bottom = 50 + waist / 2;
  return `M0 0C0 0 ${flare} ${top} 50 ${top}C${100 - flare} ${top} 100 0 100 0`
       + `V100C100 100 ${100 - flare} ${bottom} 50 ${bottom}C${flare} ${bottom} 0 100 0 100Z`;
}

function seamUri(waist, flare) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' `
            + `preserveAspectRatio='none'><path d='${seamPath(waist, flare)}' fill='#fff'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`;
}

const DEFAULTS = { seam: 22, waist: 40, flare: 12, tuck: 6, inner: 13, padY: 5, padX: 10, inset: 2 };

export function registerSeamLab() {
  document.addEventListener('alpine:init', () => {
    // Two dials switch behaviour rather than geometry, so they cannot ride onto :root as
    // custom properties the way the rest do — the markup has to read them directly.
    Alpine.store('lab', {
      questionLayout: 'condensed',
      pillMode: 'class',
    });

    Alpine.data('seamLab', () => ({
      open: false,
      v: { ...DEFAULTS },

      init() {
        this.apply();
      },

      apply() {
        const root = document.documentElement.style;
        root.setProperty('--mp-seam', `${this.v.seam}px`);
        root.setProperty('--mp-tuck', `${this.v.tuck}px`);
        root.setProperty('--mp-inner', `${this.v.inner}px`);
        root.setProperty('--mp-pad-y', `${this.v.padY}px`);
        root.setProperty('--mp-pad-x', `${this.v.padX}px`);
        root.setProperty('--mp-channel', seamUri(this.v.waist, this.v.flare));

        root.setProperty('--nest-inset', `${this.v.inset}px`);
      },

      reset() {
        this.v = { ...DEFAULTS };
        this.apply();
      },

      get css() {
        const q = this.v;
        return [
          `--nest-inset: ${q.inset}px;`,
          `--mp-seam: ${q.seam}px;`,
          `--mp-tuck: ${q.tuck}px;`,
          `--mp-inner: ${q.inner}px;`,
          `--mp-pad-y: ${q.padY}px;`,
          `--mp-pad-x: ${q.padX}px;`,
          `--mp-channel: ${seamUri(q.waist, q.flare)};`,
        ].join('\n');
      },

      copy() {
        navigator.clipboard?.writeText(this.css);
      },
    }));
  });
}
