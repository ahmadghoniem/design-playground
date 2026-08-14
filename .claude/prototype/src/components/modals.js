import Alpine from 'alpinejs';

const MOCK_SKILLS = [
  { id: 'tailwind', label: 'tailwind', installed: true },
  { id: 'frontend-design', label: 'frontend-design', installed: true },
  { id: 'dataviz', label: 'dataviz', installed: false },
  { id: 'visual-plan', label: 'visual-plan', installed: false },
  { id: 'tdd', label: 'tdd', installed: false },
];

export function registerModals() {
  document.addEventListener('alpine:init', () => {
    Alpine.store('modals', {
      modelSettingsOpen: false,
      skillsCatalogOpen: false,

      openModelSettings() {
        this.modelSettingsOpen = true;
      },
      closeModelSettings() {
        this.modelSettingsOpen = false;
      },
      openSkillsCatalog() {
        this.skillsCatalogOpen = true;
      },
      closeSkillsCatalog() {
        this.skillsCatalogOpen = false;
      },
    });

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
      },

      commit() {
        const name = this.branchName.trim();
        Alpine.store('chat').setBranch(name);
        this.close();
      },
    }));

    Alpine.data('modelSettingsModal', () => ({
      close() {
        this.$store.modals.closeModelSettings();
      },
    }));

    Alpine.data('skillsModal', () => ({
      tab: 'installed',
      search: '',
      skills: MOCK_SKILLS.map((s) => ({ ...s })),

      get filteredSkills() {
        const q = this.search.toLowerCase();
        return this.skills.filter((s) => {
          const matches = s.label.toLowerCase().includes(q);
          return this.tab === 'installed' ? matches && s.installed : matches;
        });
      },

      setTab(tab) {
        this.tab = tab;
      },

      toggleInstall(skill) {
        skill.installed = !skill.installed;
      },

      close() {
        this.$store.modals.closeSkillsCatalog();
      },
    }));
  });
}
