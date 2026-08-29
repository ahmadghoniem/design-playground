import Alpine from 'alpinejs';
import { registerLibrary } from './library.js';
import { registerCanvas } from './canvas.js';
import { registerChat } from './chat.js';
import { registerDesignAgents } from './design-agents.js';
import { registerModals } from './modals.js';
import { registerTooltip } from './tooltip.js';
import { registerTheme } from './theme.js';
import { registerSeamLab } from './seam-lab.js';
import { NODE_NAMES } from '../data/shared.js';

registerLibrary();
registerCanvas();
registerChat();
registerDesignAgents();
registerModals();
registerTooltip();
registerTheme();
registerSeamLab();

document.addEventListener('alpine:init', () => {
  Alpine.store('mock', {
    selectedKind: 'orig',
    crumbName: NODE_NAMES.orig,
    crumbLeaf: 'root',
  });
});

export async function loadPartials() {
  while (document.querySelector('[data-partial]')) {
    const slots = document.querySelectorAll('[data-partial]');
    await Promise.all(
      [...slots].map(async (el) => {
        const res = await fetch(el.getAttribute('data-partial'));
        const html = await res.text();
        el.insertAdjacentHTML('beforebegin', html);
        el.remove();
      }),
    );
  }
}

export function wireCrossComponentEvents() {
  document.addEventListener('node-selected', (e) => {
    Alpine.store('mock').selectedKind = e.detail.kind;
    Alpine.store('mock').crumbName = NODE_NAMES[e.detail.kind] ?? 'PriceCard';
  });
}

document.addEventListener('alpine:init', () => {
  Alpine.data('proto', () => ({}));
});
