import Alpine from 'alpinejs';

export function registerModals() {
  document.addEventListener('alpine:init', () => {
    Alpine.data('branchModal', () => ({
      branchName: 'pg/calmer-pricing-card',

      get open() {
        return this.$store.mock.branchModalOpen;
      },

      get isDirty() {
        return this.$store.mock.isDirty;
      },

      get selectedKind() {
        return this.$store.mock.selectedKind;
      },

      get title() {
        const label = this.selectedKind === 'iter' ? 'iteration 1' : 'this version';
        return `Keep “${label}” — create a branch`;
      },

      close() {
        this.$store.mock.branchModalOpen = false;
      },

      stash() {
        this.$store.mock.isDirty = false;
        this.$dispatch('stash-files');
      },

      commit() {
        const name = this.branchName.trim();
        this.$dispatch('branch-commit', { name });
        this.close();
      },
    }));
  });
}
