// zone-modal.js
// Modal do "ambiente" (zona). Abre ao tocar no card.
// Mostra lista de dispositivos, toggle rápido por device, botão "Desligar tudo",
// e ao tocar no corpo do device abre o ControlModal com controles específicos.

const ZoneModal = {
  _overlay: null,
  _zone: null,
  _unsub: null,

  init() {
    this._overlay = document.getElementById('zone-modal');
    if (!this._overlay) {
      this._overlay = document.createElement('div');
      this._overlay.id = 'zone-modal';
      this._overlay.className = 'zone-modal-overlay hidden';
      document.body.appendChild(this._overlay);
    }

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) { this.close(); return; }

      const closeBtn = e.target.closest('[data-zone="close"]');
      if (closeBtn) { this.close(); return; }

      const bulkBtn = e.target.closest('[data-zone="bulk"]');
      if (bulkBtn) {
        const action = bulkBtn.getAttribute('data-bulk');
        this._bulkToggle(action);
        return;
      }

      const toggleBtn = e.target.closest('[data-zone="toggle"]');
      if (toggleBtn) {
        e.stopPropagation();
        const deviceId = toggleBtn.getAttribute('data-device-id');
        this._deviceToggle(deviceId);
        return;
      }

      const row = e.target.closest('[data-zone="device-row"]');
      if (row) {
        const deviceId = row.getAttribute('data-device-id');
        this._openControl(deviceId);
        return;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (this._overlay.classList.contains('hidden')) return;
      if (e.key === 'Escape') this.close();
    });
  },

  open(zone) {
    if (!zone || !zone.id) return;
    this._zone = zone;
    this._render();
    this._overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');

    if (this._unsub) this._unsub();
    this._unsub = StateStore.subscribeZone(zone.id, () => this._render());
  },

  close() {
    this._overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (this._unsub) { this._unsub(); this._unsub = null; }
    this._zone = null;
  },

  _render() {
    if (!this._zone) return;
    const zone = ZoneRegistry.get(this._zone.id) || this._zone;
    const devices = zone.devices || [];
    const deviceStates = devices.map(d => ({ device: d, state: StateStore.get(d.entity) }));
    const onCount = deviceStates.filter(({ state }) => state && state.state === 'on').length;
    const total = devices.length;
    const anyOn = onCount > 0;

    const subtitle = total === 0
      ? 'Sem dispositivos'
      : onCount === 0
        ? 'Tudo apagado'
        : onCount === total
          ? 'Tudo ligado'
          : `${onCount} de ${total} ligado${onCount === 1 ? '' : 's'}`;

    const iconSVG = _zoneIconFor(zone.icon);

    this._overlay.innerHTML = `
      <div class="zone-modal-card" role="dialog" aria-modal="true">
        <div class="zone-modal-head">
          <div class="zone-head-icon ${anyOn ? 'on' : ''}">${iconSVG}</div>
          <div class="zone-head-text">
            <div class="zone-head-name">${_zoneEsc(zone.name)}</div>
            <div class="zone-head-sub">${_zoneEsc(subtitle)}</div>
          </div>
          <button type="button" class="zone-modal-close" data-zone="close" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        ${total > 0 ? `
          <div class="zone-modal-actions">
            <button type="button" class="zone-bulk-btn ${anyOn ? 'danger' : 'primary'}" data-zone="bulk" data-bulk="${anyOn ? 'off' : 'on'}">
              <span class="zone-bulk-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M12 2v10"/>
                  <path d="M5.6 6.4a8 8 0 1 0 12.8 0"/>
                </svg>
              </span>
              <span>${anyOn ? 'Desligar tudo' : 'Ligar tudo'}</span>
            </button>
          </div>
        ` : ''}

        <div class="zone-modal-body">
          ${total === 0
            ? '<div class="zone-empty">Essa zona ainda não tem dispositivos.</div>'
            : deviceStates.map(({ device, state }) => this._renderDeviceRow(device, state)).join('')
          }
        </div>
      </div>
    `;
  },

  _renderDeviceRow(device, state) {
    const isOn = state && state.state === 'on';
    const type = device.type || 'switch';
    const icon = _zoneDeviceIcon(type);
    const statusTxt = _zoneDeviceStatus(device, state);

    return `
      <div class="zone-device-row ${isOn ? 'on' : ''}" data-zone="device-row" data-device-id="${_zoneEsc(device.id)}">
        <div class="zone-device-icon">${icon}</div>
        <div class="zone-device-text">
          <div class="zone-device-name">${_zoneEsc(device.name || device.entity)}</div>
          <div class="zone-device-status">${_zoneEsc(statusTxt)}</div>
        </div>
        <button type="button" class="zone-device-toggle ${isOn ? 'on' : ''}" data-zone="toggle" data-device-id="${_zoneEsc(device.id)}" aria-label="${isOn ? 'Desligar' : 'Ligar'}">
          <span class="zone-toggle-knob"></span>
        </button>
      </div>
    `;
  },

  _deviceToggle(deviceId) {
    const zone = ZoneRegistry.get(this._zone.id);
    if (!zone) return;
    const device = zone.devices.find(d => d.id === deviceId);
    if (!device) return;

    if (HAClient.getStatus() !== 'online') {
      this._flashOverlay();
      return;
    }

    const current = StateStore.get(device.entity);
    const isOn = current && current.state === 'on';
    const nextState = isOn ? 'off' : 'on';

    const optimistic = {
      ...(current || { entity_id: device.entity, attributes: {} }),
      state: nextState
    };
    StateStore.update(device.entity, optimistic);

    const domain = device.entity.split('.')[0];
    HAClient.callService(domain, 'toggle', { entity_id: device.entity })
      .catch(err => {
        console.error('[zone-modal] toggle falhou:', err);
        StateStore.update(device.entity, current);
      });
  },

  _bulkToggle(action) {
    const zone = ZoneRegistry.get(this._zone.id);
    if (!zone) return;

    if (HAClient.getStatus() !== 'online') {
      this._flashOverlay();
      return;
    }

    const targetState = action === 'on' ? 'on' : 'off';
    const service = action === 'on' ? 'turn_on' : 'turn_off';

    for (const device of zone.devices) {
      const current = StateStore.get(device.entity);
      if (current && current.state === targetState) continue;
      const optimistic = {
        ...(current || { entity_id: device.entity, attributes: {} }),
        state: targetState
      };
      StateStore.update(device.entity, optimistic);
      const domain = device.entity.split('.')[0];
      HAClient.callService(domain, service, { entity_id: device.entity })
        .catch(err => {
          console.error('[zone-modal] bulk toggle falhou:', err);
          StateStore.update(device.entity, current);
        });
    }
  },

  _openControl(deviceId) {
    const zone = ZoneRegistry.get(this._zone.id);
    if (!zone) return;
    const device = zone.devices.find(d => d.id === deviceId);
    if (!device) return;
    if (typeof ControlModal !== 'undefined') {
      ControlModal.open(device);
    }
  },

  _flashOverlay() {
    const card = this._overlay.querySelector('.zone-modal-card');
    if (!card) return;
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 400);
  }
};

/* Helpers internos */

function _zoneEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _zoneIconFor(iconName) {
  // Reaproveita os SVGs do UIRenderer
  if (typeof UIRenderer !== 'undefined' && UIRenderer._getIcon) {
    return UIRenderer._getIcon(iconName);
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
}

function _zoneDeviceIcon(type) {
  const icons = {
    switch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="9" cy="12" r="2.5" fill="currentColor" stroke="none"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 4 10.5c-.7.6-1 1.3-1 2V16H9v-.5c0-.7-.3-1.4-1-2A6 6 0 0 1 12 3z"/></svg>',
    climate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v13"/><circle cx="12" cy="18" r="3"/><path d="M9 9h6"/><path d="M9 13h6"/></svg>',
    cover: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 9h16"/><path d="M4 15h16"/><path d="M12 3v18"/></svg>',
    fan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><path d="M12 10V4s4 0 4 4-4 2-4 2z"/><path d="M14 12h6s0 4-4 4-2-4-2-4z"/><path d="M12 14v6s-4 0-4-4 4-2 4-2z"/><path d="M10 12H4s0-4 4-4 2 4 2 4z"/></svg>',
    media_player: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>'
  };
  return icons[type] || icons.switch;
}

function _zoneDeviceStatus(device, state) {
  if (!state) return 'Indisponível';
  const type = device.type || 'switch';
  const attrs = state.attributes || {};

  if (type === 'light') {
    if (state.state !== 'on') return 'Desligada';
    const pct = Math.round(((attrs.brightness || 0) / 255) * 100);
    return pct > 0 ? `Ligada · ${pct}% brilho` : 'Ligada';
  }
  if (type === 'climate') {
    const target = attrs.temperature != null ? `${attrs.temperature}°` : '';
    return state.state === 'off' ? 'Desligado' : (target ? `${state.state} · ${target}` : state.state);
  }
  if (type === 'cover') {
    if (attrs.current_position != null) return `${attrs.current_position}% aberto`;
    return state.state === 'open' ? 'Aberto' : state.state === 'closed' ? 'Fechado' : state.state;
  }
  if (type === 'fan') {
    if (state.state !== 'on') return 'Desligado';
    return attrs.percentage != null ? `Ligado · ${attrs.percentage}%` : 'Ligado';
  }
  if (type === 'media_player') {
    const map = { playing: 'Tocando', paused: 'Pausado', idle: 'Ocioso', off: 'Desligado' };
    return map[state.state] || state.state;
  }
  // switch / default
  return state.state === 'on' ? 'Ligado' : 'Desligado';
}
