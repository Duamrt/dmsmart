// config-loader.js
// Carrega config.json via fetch e expõe como window.DMSMART_CONFIG
// Garante que outros módulos possam acessar sem race condition

const ConfigLoader = {
  config: null,

  async load() {
    const res = await fetch('./config.json');
    if (!res.ok) throw new Error(`Falha ao carregar config.json: ${res.status}`);
    this.config = await res.json();
    window.DMSMART_CONFIG = this.config;
    return this.config;
  },

  get() {
    if (!this.config) throw new Error('Config não carregada. Chamar ConfigLoader.load() primeiro.');
    return this.config;
  }
};
