// state-store.js
// Estado global dos dispositivos com Observer pattern
// Fase 1: popula com dados mock para visualização
// Fase 2: será alimentado por ha-connection.js via get_states e state_changed

const StateStore = {
  _state: {},
  _listeners: new Map(),
  _globalListeners: new Set(),

  // Fase 1: inicializa com mock data baseado nas entidades do ZoneRegistry
  initMock() {
    const entities = ZoneRegistry.allEntityIds();
    for (const entityId of entities) {
      const isOn = Math.random() > 0.5;
      this._state[entityId] = {
        entity_id: entityId,
        state: isOn ? 'on' : 'off',
        attributes: this._mockAttributes(entityId)
      };
    }
    this._notifyAll();
  },

  // Fase 2: substituir por dados reais do HA
  init(allStates) {
    for (const entity of allStates) {
      this._state[entity.entity_id] = entity;
    }
    this._notifyAll();
  },

  update(entityId, newState) {
    if (!newState) {
      delete this._state[entityId];
    } else {
      this._state[entityId] = newState;
    }
    this._notify(entityId);
  },

  get(entityId) {
    return this._state[entityId] || null;
  },

  getZone(zoneId) {
    const zone = ZoneRegistry.get(zoneId);
    if (!zone) return [];
    return zone.devices.map(d => this._state[d.entity]).filter(Boolean);
  },

  subscribe(entityId, callback) {
    if (!this._listeners.has(entityId)) {
      this._listeners.set(entityId, new Set());
    }
    this._listeners.get(entityId).add(callback);
    // Retorna função de unsubscribe
    return () => {
      const set = this._listeners.get(entityId);
      if (set) set.delete(callback);
    };
  },

  subscribeZone(zoneId, callback) {
    const zone = ZoneRegistry.get(zoneId);
    if (!zone) return () => {};
    const unsubs = zone.devices.map(d => this.subscribe(d.entity, callback));
    return () => unsubs.forEach(fn => fn());
  },

  // Qualquer update dispara o callback — usado pelo hero/stats globais
  subscribeAll(callback) {
    this._globalListeners.add(callback);
    return () => this._globalListeners.delete(callback);
  },

  _notify(entityId) {
    const cbs = this._listeners.get(entityId);
    if (cbs) cbs.forEach(cb => cb(this._state[entityId]));
    this._globalListeners.forEach(cb => cb());
  },

  _notifyAll() {
    for (const [entityId, cbs] of this._listeners) {
      cbs.forEach(cb => cb(this._state[entityId]));
    }
    this._globalListeners.forEach(cb => cb());
  },

  _mockAttributes(entityId) {
    if (entityId.startsWith('climate.')) {
      return { temperature: Math.floor(20 + Math.random() * 8), hvac_mode: 'cool' };
    }
    if (entityId.startsWith('media_player.')) {
      return { volume_level: 0.5 };
    }
    return {};
  }
};
