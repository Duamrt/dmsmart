// active-installation.js
// Controla qual instalação está ativa no momento.
// Depende de InstallationStore.

const ActiveInstallation = {
  KEY: 'dmsmart_active_id',

  getId() {
    return localStorage.getItem(this.KEY) || null;
  },

  setId(id) {
    if (!id) {
      localStorage.removeItem(this.KEY);
      return;
    }
    localStorage.setItem(this.KEY, id);
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  // Retorna o objeto da instalação ativa (ou null).
  // Se o id salvo apontar pra algo que não existe mais, limpa.
  get() {
    const id = this.getId();
    if (!id) return null;
    const inst = InstallationStore.get(id);
    if (!inst) {
      this.clear();
      return null;
    }
    return inst;
  },

  // Garante que exista uma instalação ativa.
  // Se nenhuma estiver setada mas houver instalações no store, ativa a primeira.
  // Retorna a instalação ativa (ou null se o store estiver vazio).
  ensure() {
    const current = this.get();
    if (current) return current;
    const all = InstallationStore.all();
    if (all.length === 0) return null;
    this.setId(all[0].id);
    return all[0];
  },

  getToken() {
    const id = this.getId();
    return id ? InstallationStore.getToken(id) : '';
  },

  setToken(token) {
    const id = this.getId();
    if (!id) return;
    InstallationStore.setToken(id, token);
  }
};
