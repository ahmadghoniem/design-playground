import Alpine from 'alpinejs';
import { specMap, checklist } from '../data/specMap.js';

export function registerSpec() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('specFold', () => ({
      specMap,
      checklist,
    }));
  });
}
