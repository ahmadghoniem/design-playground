import Alpine from 'alpinejs';
import { registerTheme } from './theme.js';
import { registerSidebar } from './sidebar.js';
import { registerCanvas } from './canvas.js';
import { registerChat } from './chat.js';
import { registerPanel } from './panel.js';
import { registerModals } from './modals.js';
import { registerSpec } from './spec.js';
import { NODE_NAMES } from '../data/shared.js';

registerTheme();
registerSidebar();
registerCanvas();
registerChat();
registerPanel();
registerModals();
registerSpec();

document.addEventListener('alpine:init', () => {
  Alpine.store('mock', {
    selectedKind: 'orig',
    crumbName: NODE_NAMES.orig,
    crumbLeaf: 'root',
    branchModalOpen: false,
    isDirty: false,
    agentStatus: '◐ agent idle',
  });
});

export async function loadPartials() {
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

export function wireCrossComponentEvents() {
  document.addEventListener('node-selected', (e) => {
    Alpine.store('mock').selectedKind = e.detail.kind;
    Alpine.store('mock').crumbName = NODE_NAMES[e.detail.kind] ?? 'PriceCard';
  });

  document.addEventListener('open-branch-modal', () => {
    Alpine.store('mock').branchModalOpen = true;
  });

  document.addEventListener('sim-run', (e) => {
    Alpine.store('mock').agentStatus = e.detail.on ? '◐ generating 3 variations…' : '◐ agent idle';
  });

  document.addEventListener('stash-files', () => {
    Alpine.store('mock').agentStatus = '✓ 3 files stashed';
    setTimeout(() => {
      Alpine.store('mock').agentStatus = '◐ agent idle';
    }, 2400);
  });

  document.addEventListener('branch-commit', (e) => {
    const chatEl = document.querySelector('[x-data="chat"]');
    if (chatEl && chatEl._x_dataStack) {
      chatEl._x_dataStack[0].setBranch(e.detail.name);
    }
    const branchEl = document.getElementById('loc-branch');
    if (branchEl) branchEl.textContent = `⑂ ${e.detail.name}`;
    Alpine.store('mock').agentStatus = `✓ committed to ${e.detail.name}`;
    setTimeout(() => {
      Alpine.store('mock').agentStatus = '◐ agent idle';
    }, 3200);
  });
}

document.addEventListener('alpine:init', () => {
  Alpine.data('proto', () => ({}));
});
