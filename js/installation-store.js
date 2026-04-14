// installation-store.js
// CRUD de instalações persistido em localStorage.
// Uma chave por instalação pra facilitar migração futura pro Supabase.
//
// Schemas:
//   Installation: { id, name, haUrl, zones[], createdAt, updatedAt }
//   Zone:         { id, name, icon, order, devices[] }
//   Device:       { id, name, type, entity, isCritical? }
//
// Chaves localStorage:
//   dmsmart_installations         → array de IDs
//   dmsmart_installation_<id>     → JSON da instalação
//   dmsmart_token_<id>            → token HA (fica local, nunca sobe pra cloud)

const InstallationStore = {
  KEY_INDEX: 'dmsmart_installations',
  KEY_INSTALL: (id) => `dmsmart_installation_${id}`,
  KEY_TOKEN: (id) => `dmsmart_token_${id}`,

  _genId() {
    return 'inst_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  _readIndex() {
    try {
      const raw = localStorage.getItem(this.KEY_INDEX);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  },

  _writeIndex(ids) {
    localStorage.setItem(this.KEY_INDEX, JSON.stringify(ids));
  },

  all() {
    return this._readIndex()
      .map(id => this.get(id))
      .filter(Boolean);
  },

  get(id) {
    try {
      const raw = localStorage.getItem(this.KEY_INSTALL(id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  create({ name, haUrl, zones = [] }) {
    const id = this._genId();
    const now = new Date().toISOString();
    const installation = {
      id,
      name: String(name || '').trim() || 'Instalação',
      haUrl: String(haUrl || '').trim(),
      zones: zones.map((z, idx) => this._normalizeZone(z, idx)),
      createdAt: now,
      updatedAt: now
    };
    localStorage.setItem(this.KEY_INSTALL(id), JSON.stringify(installation));
    const index = this._readIndex();
    if (!index.includes(id)) {
      index.push(id);
      this._writeIndex(index);
    }
    this.syncToCloud(id).catch(() => {});
    return installation;
  },

  update(id, patch) {
    const current = this.get(id);
    if (!current) return null;
    const updated = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString()
    };
    if (patch.zones) {
      updated.zones = patch.zones.map((z, idx) => this._normalizeZone(z, idx));
    }
    localStorage.setItem(this.KEY_INSTALL(id), JSON.stringify(updated));
    this.syncToCloud(id).catch(() => {});
    return updated;
  },

  remove(id) {
    localStorage.removeItem(this.KEY_INSTALL(id));
    localStorage.removeItem(this.KEY_TOKEN(id));
    const index = this._readIndex().filter(x => x !== id);
    this._writeIndex(index);
    this.deleteFromCloud(id).catch(() => {});
  },

  getToken(id) {
    return localStorage.getItem(this.KEY_TOKEN(id)) || '';
  },

  setToken(id, token) {
    if (!token) {
      localStorage.removeItem(this.KEY_TOKEN(id));
      return;
    }
    localStorage.setItem(this.KEY_TOKEN(id), String(token).trim());
  },

  isEmpty() {
    return this._readIndex().length === 0;
  },

  // Popula a primeira instalação a partir do config.json seed.
  // Só roda se o store estiver vazio (primeira abertura / dev).
  // Migra token legado da chave antiga (dmsmart_ha_token) se existir.
  seedFromConfig(config) {
    if (!this.isEmpty()) return null;
    if (!config || !config.installation || !Array.isArray(config.zones)) return null;

    const installation = this.create({
      name: config.installation.name || 'Instalação',
      haUrl: (config.homeAssistant && config.homeAssistant.url) || '',
      zones: config.zones
    });

    const legacyTokenKey = (config.homeAssistant && config.homeAssistant.tokenKey) || 'dmsmart_ha_token';
    const legacyToken = (localStorage.getItem(legacyTokenKey) || '').trim();
    if (legacyToken) {
      this.setToken(installation.id, legacyToken);
    }

    return installation;
  },

  _normalizeZone(z, fallbackOrder) {
    return {
      id: z.id || ('zone_' + Math.random().toString(36).slice(2, 8)),
      name: z.name || 'Zona',
      icon: z.icon || 'sofa',
      order: typeof z.order === 'number' ? z.order : fallbackOrder,
      devices: Array.isArray(z.devices) ? z.devices.map(d => this._normalizeDevice(d)) : []
    };
  },

  _normalizeDevice(d) {
    return {
      id: d.id || ('dev_' + Math.random().toString(36).slice(2, 8)),
      name: d.name || 'Dispositivo',
      type: d.type || 'light',
      entity: d.entity || '',
      isCritical: !!d.isCritical
    };
  },

  // ── Cloud sync (Fase 04) ──────────────────────────────────────────────────
  // Token HA NUNCA vai pro cloud — fica só no localStorage.

  async syncToCloud(id) {
    if (typeof AuthStore === 'undefined' || !AuthStore.isLoggedIn()) return;
    const inst = this.get(id);
    if (!inst) return;
    const user    = AuthStore.getUser();
    const profile = AuthStore.getProfile();
    // Integrador registra a si mesmo em integrator_id (permite revogação futura pelo cliente)
    const integrator_id = (profile?.role === 'integrador') ? user.id : null;
    const payload = {
      id:         inst.id,
      user_id:    user.id,
      name:       inst.name,
      ha_url:     inst.haUrl  || '',
      zones:      inst.zones  || [],
      created_at: inst.createdAt,
      updated_at: new Date().toISOString()
    };
    if (integrator_id) payload.integrator_id = integrator_id;
    const { error } = await SUPA.from('installations').upsert(payload, { onConflict: 'id' });
    if (error) console.warn('[dmsmart] syncToCloud:', error.message);
  },

  async deleteFromCloud(id) {
    if (typeof AuthStore === 'undefined' || !AuthStore.isLoggedIn()) return;
    const { error } = await SUPA.from('installations').delete().eq('id', id);
    if (error) console.warn('[dmsmart] deleteFromCloud:', error.message);
  },

  // Puxa do cloud e mescla no localStorage.
  // Cloud vence se updatedAt for mais recente.
  // Retorna o número de registros novos/atualizados.
  async pullFromCloud() {
    if (typeof AuthStore === 'undefined' || !AuthStore.isLoggedIn()) return 0;
    const { data, error } = await SUPA.from('installations').select('*');
    if (error || !Array.isArray(data)) return 0;

    let count = 0;
    for (const row of data) {
      const local = this.get(row.id);
      const cloudTs = new Date(row.updated_at).getTime();
      const localTs = local ? new Date(local.updatedAt).getTime() : 0;
      if (!local || cloudTs > localTs) {
        const inst = {
          id:        row.id,
          name:      row.name,
          haUrl:     row.ha_url  || '',
          zones:     Array.isArray(row.zones) ? row.zones : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        localStorage.setItem(this.KEY_INSTALL(row.id), JSON.stringify(inst));
        const index = this._readIndex();
        if (!index.includes(row.id)) {
          index.push(row.id);
          this._writeIndex(index);
        }
        count++;
      }
    }
    return count;
  },

  // Empurra todas as instalações locais pro cloud (usado no primeiro login).
  async pushAllToCloud() {
    if (typeof AuthStore === 'undefined' || !AuthStore.isLoggedIn()) return;
    const all = this.all();
    await Promise.all(all.map(inst => this.syncToCloud(inst.id).catch(() => {})));
  }
};
