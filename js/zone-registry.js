// zone-registry.js
// Fonte única de zonas em runtime.
// CRUD local persiste em InstallationStore (localStorage) e notifica listeners
// pra UIRenderer/Hero re-renderizarem automaticamente.

const ZoneRegistry = {
  _zones: null,
  _listeners: new Set(),

  init(config) {
    this._zones = new Map(
      (config.zones || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
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
  },

  // --- CRUD ----------------------------------------------------------------

  addZone({ name, icon, devices = [] }) {
    if (!this._zones) this._zones = new Map();
    const id = this._genZoneId();
    const order = this._zones.size;
    const zone = {
      id,
      name: String(name || 'Zona').trim() || 'Zona',
      icon: icon || 'sofa',
      order,
      devices: devices.map(d => this._normalizeDevice(d))
    };
    this._zones.set(id, zone);
    this._persist();
    this._emit();
    return zone;
  },

  updateZone(id, patch) {
    const zone = this._zones && this._zones.get(id);
    if (!zone) return null;
    if (patch.name !== undefined) {
      const n = String(patch.name).trim();
      if (n) zone.name = n;
    }
    if (patch.icon !== undefined) zone.icon = patch.icon;
    if (Array.isArray(patch.devices)) {
      zone.devices = patch.devices.map(d => this._normalizeDevice(d));
    }
    this._persist();
    this._emit();
    return zone;
  },

  removeZone(id) {
    if (!this._zones) return;
    this._zones.delete(id);
    let i = 0;
    for (const z of this._zones.values()) z.order = i++;
    this._persist();
    this._emit();
  },

  addDevice(zoneId, device) {
    const zone = this._zones && this._zones.get(zoneId);
    if (!zone) return null;
    const d = this._normalizeDevice(device);
    zone.devices.push(d);
    this._persist();
    this._emit();
    return d;
  },

  removeDevice(zoneId, deviceId) {
    const zone = this._zones && this._zones.get(zoneId);
    if (!zone) return;
    zone.devices = zone.devices.filter(d => d.id !== deviceId);
    this._persist();
    this._emit();
  },

  onChange(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  },

  _emit() {
    this._listeners.forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
  },

  _persist() {
    if (typeof InstallationStore === 'undefined' || typeof ActiveInstallation === 'undefined') return;
    const id = ActiveInstallation.getId();
    if (!id) return;
    InstallationStore.update(id, { zones: this.all() });
  },

  _genZoneId() { return 'zone_' + Math.random().toString(36).slice(2, 8); },

  _normalizeDevice(d) {
    return {
      id: d.id || ('dev_' + Math.random().toString(36).slice(2, 8)),
      name: d.name || d.entity || 'Dispositivo',
      type: d.type || 'switch',
      entity: d.entity || '',
      isCritical: !!d.isCritical
    };
  }
};
