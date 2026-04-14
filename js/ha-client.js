// ha-client.js
// Cliente WebSocket do Home Assistant
// Protocolo: https://developers.home-assistant.io/docs/api/websocket
//
// Uso:
//   HAClient.setConfig({ url, token });
//   HAClient.onStatusChange(cb);       // 'connecting' | 'online' | 'reconnecting' | 'offline' | 'auth_invalid'
//   HAClient.onStateChanged(cb);       // (entity_id, newState)
//   await HAClient.connect();
//   HAClient.callService('input_boolean', 'toggle', { entity_id });

const HAClient = {
  _ws: null,
  _url: null,
  _token: null,
  _msgId: 1,
  _pending: new Map(),
  _status: 'offline',
  _statusListeners: new Set(),
  _stateListeners: new Set(),
  _reconnectAttempts: 0,
  _reconnectTimer: null,
  _manualClose: false,
  _allStates: [],

  setConfig({ url, token }) {
    this._url = url;
    this._token = token;
  },

  getStatus() { return this._status; },

  onStatusChange(cb) {
    this._statusListeners.add(cb);
    cb(this._status);
    return () => this._statusListeners.delete(cb);
  },

  onStateChanged(cb) {
    this._stateListeners.add(cb);
    return () => this._stateListeners.delete(cb);
  },

  _setStatus(s) {
    if (this._status === s) return;
    this._status = s;
    this._statusListeners.forEach(cb => { try { cb(s); } catch (e) { console.error(e); } });
  },

  _toWsUrl(httpUrl) {
    return httpUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/api/websocket';
  },

  connect() {
    if (!this._url || !this._token) {
      throw new Error('HAClient: url e token obrigatórios — chame setConfig()');
    }
    this._manualClose = false;
    this._setStatus(this._reconnectAttempts === 0 ? 'connecting' : 'reconnecting');

    return new Promise((resolve, reject) => {
      let settled = false;
      let ws;
      try {
        ws = new WebSocket(this._toWsUrl(this._url));
      } catch (err) {
        this._scheduleReconnect();
        return reject(err);
      }
      this._ws = ws;

      ws.addEventListener('message', (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }

        if (msg.type === 'auth_required') {
          console.log('[ha-client] auth_required recebido. Token len=' + (this._token ? this._token.length : 0) + ' head=' + (this._token || '').slice(0, 20) + ' tail=' + (this._token || '').slice(-10));
          ws.send(JSON.stringify({ type: 'auth', access_token: this._token }));
          return;
        }
        if (msg.type === 'auth_invalid') {
          this._setStatus('auth_invalid');
          this._manualClose = true;
          ws.close();
          if (!settled) { settled = true; reject(new Error('auth_invalid')); }
          return;
        }
        if (msg.type === 'auth_ok') {
          this._reconnectAttempts = 0;
          this._setStatus('online');
          this._afterAuth()
            .then(() => { if (!settled) { settled = true; resolve(); } })
            .catch((err) => { if (!settled) { settled = true; reject(err); } });
          return;
        }
        if (msg.type === 'result') {
          const p = this._pending.get(msg.id);
          if (p) {
            this._pending.delete(msg.id);
            msg.success ? p.resolve(msg.result) : p.reject(new Error(msg.error?.message || 'result error'));
          }
          return;
        }
        if (msg.type === 'event') {
          const ev = msg.event;
          if (ev && ev.event_type === 'state_changed') {
            const { entity_id, new_state } = ev.data;
            this._stateListeners.forEach(cb => { try { cb(entity_id, new_state); } catch (e) { console.error(e); } });
          }
          return;
        }
      });

      ws.addEventListener('close', () => {
        this._ws = null;
        this._rejectPending();
        if (this._manualClose) {
          this._setStatus('offline');
        } else {
          this._setStatus('reconnecting');
          this._scheduleReconnect();
        }
      });

      ws.addEventListener('error', () => {
        if (!settled) { settled = true; reject(new Error('ws error')); }
      });
    });
  },

  disconnect() {
    this._manualClose = true;
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    if (this._ws) this._ws.close();
    this._setStatus('offline');
  },

  async _afterAuth() {
    const states = await this._send({ type: 'get_states' });
    this._allStates = Array.isArray(states) ? states : [];
    this._stateListeners.forEach(cb => {
      states.forEach(st => { try { cb(st.entity_id, st); } catch (e) { console.error(e); } });
    });
    await this._send({ type: 'subscribe_events', event_type: 'state_changed' });
    return states;
  },

  getAllStates() { return this._allStates || []; },

  async refreshAllStates() {
    try {
      const states = await this._send({ type: 'get_states' });
      this._allStates = Array.isArray(states) ? states : [];
      return this._allStates;
    } catch {
      return this._allStates || [];
    }
  },

  _send(payload) {
    return new Promise((resolve, reject) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('ws not connected'));
      }
      const id = this._msgId++;
      this._pending.set(id, { resolve, reject });
      this._ws.send(JSON.stringify({ id, ...payload }));
    });
  },

  _rejectPending() {
    for (const [, p] of this._pending) p.reject(new Error('ws closed'));
    this._pending.clear();
  },

  _scheduleReconnect() {
    if (this._manualClose || this._reconnectTimer) return;
    const delays = [1000, 2000, 4000, 8000, 16000, 30000];
    const delay = delays[Math.min(this._reconnectAttempts, delays.length - 1)];
    this._reconnectAttempts++;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect().catch(() => { /* erro já tratado em close/error */ });
    }, delay);
  },

  callService(domain, service, serviceData = {}) {
    return this._send({ type: 'call_service', domain, service, service_data: serviceData });
  },

  // Busca histórico via WebSocket (evita CORS do REST API)
  // Retorna objeto { entity_id: [{s: state, lc: unixSec}, ...], ... }
  fetchHistory(entityIds, startISO, endISO) {
    return this._send({
      type: 'history/history_during_period',
      start_time: startISO,
      end_time: endISO,
      entity_ids: entityIds,
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false
    });
  },

  async signPath(path, expires = 600) {
    const result = await this._send({ type: 'auth/sign_path', path, expires });
    return result && result.path ? result.path : null;
  },

  async getCameraImageUrl(entityId) {
    if (!this._url || !entityId) return null;
    try {
      const signed = await this.signPath(`/api/camera_proxy/${entityId}`, 600);
      if (!signed) return null;
      const base = this._url.replace(/\/$/, '');
      return `${base}${signed}`;
    } catch (err) {
      console.warn('[ha-client] signPath falhou:', err);
      return null;
    }
  }
};
