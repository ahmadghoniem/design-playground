import Alpine from 'alpinejs';
import { MODELS } from '../data/shared.js';

export function registerChat() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('chat', () => ({
      model: MODELS[0],
      mode: 'explore',
      branchLabel: 'master',
      tags: [
        { id: 'comp', type: 'comp', label: 'PriceCard' },
        { id: 'text', type: 'text', label: 'text' },
        { id: 'img', type: 'img', label: 'stripe-pricing' },
      ],

      cycleModel() {
        const i = (MODELS.indexOf(this.model) + 1) % MODELS.length;
        this.model = MODELS[i];
      },

      setMode(mode) {
        this.mode = mode;
      },

      removeTag(id) {
        this.tags = this.tags.filter((t) => t.id !== id);
      },

      setBranch(name) {
        this.branchLabel = name;
      },
    }));
  });
}
