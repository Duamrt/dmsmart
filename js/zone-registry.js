// zone-registry.js
// Lê zonas do config.json carregado pelo ConfigLoader
// NÃO tem zonas hardcoded — trocar config.json troca a instalação inteira

const ZoneRegistry = {
  _zones: null,

  init(config) {
    // Transforma array de config em Map para lookup rápido por id
    this._zones = new Map(
      config.zones
        .sort((a, b) => a.order - b.order)
        .map(z => [z.id, z])
    );
  },

  get(zoneId) {
    return this._zones ? this._zones.get(zoneId) : null;
  },

  all() {
    return this._zones ? [...this._zones.values()] : [];
  },

  allEntityIds() {
    const ids = [];
    if (!this._zones) return ids;
    for (const zone of this._zones.values()) {
      for (const device of zone.devices) {
        ids.push(device.entity);
      }
    }
    return ids;
  },

  findZoneByEntity(entityId) {
    if (!this._zones) return null;
    for (const zone of this._zones.values()) {
      if (zone.devices.some(d => d.entity === entityId)) return zone;
    }
    return null;
  }
};
