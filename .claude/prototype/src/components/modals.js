import Alpine from 'alpinejs';

export function registerModals() {
  document.addEventListener('alpine:init', () => {
    Alpine.store('modals', {
      modelSettingsOpen: false,

      openModelSettings() {
        this.modelSettingsOpen = true;
      },
      closeModelSettings() {
        this.modelSettingsOpen = false;
      },
    });

    Alpine.data('modelSettingsModal', () => ({
      close() {
        this.$store.modals.closeModelSettings();
      },
    }));
  });
}
