import Alpine from 'alpinejs';

export function registerTheme() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('previewTheme', () => ({
      dark: false,

      toggle() {
        this.dark = !this.dark;
        document.querySelectorAll('.app-theme').forEach((el) => {
          el.classList.toggle('dark', this.dark);
        });
      },

      get title() {
        return `Preview theme: ${this.dark ? 'Dark' : 'Light'}`;
      },
    }));
  });
}
