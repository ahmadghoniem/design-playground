import Alpine from 'alpinejs';

export function registerTheme() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('editorialTheme', () => ({
      mode: window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark',

      init() {
        this.paint();
      },

      toggle() {
        this.mode = this.mode === 'dark' ? 'light' : 'dark';
        this.paint();
      },

      paint() {
        document.documentElement.setAttribute('data-theme', this.mode);
      },

      get label() {
        return this.mode === 'dark' ? 'Light' : 'Dark';
      },
    }));

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
