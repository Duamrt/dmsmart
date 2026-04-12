// ui-renderer.js
// Renderiza cards de zona no .zones-grid
// Cada card se inscreve no StateStore para atualizar automaticamente

const UIRenderer = {
  container: null,

  init(container) {
    this.container = container;
    this.renderAll();
  },

  renderAll() {
    this.container.innerHTML = '';
    for (const zone of ZoneRegistry.all()) {
      this.renderZoneCard(zone);
    }
  },

  renderZoneCard(zone) {
    const card = document.createElement('div');
    card.className = 'zone-card';
    card.id = `zone-${zone.id}`;
    this.container.appendChild(card);
    this._bindCardControls(card, zone);

    const update = () => {
      const devices = zone.devices.map(d => ({
        device: d,
        state: StateStore.get(d.entity)
      }));
      const hasActive = devices.some(d => d.state && d.state.state === 'on');
      card.className = `zone-card${hasActive ? ' has-active' : ''}`;
      card.innerHTML = this._buildCardHTML(zone, devices);
    };

    StateStore.subscribeZone(zone.id, update);
    update();
  },

  _buildCardHTML(zone, devices) {
    const iconSVG = this._getIcon(zone.icon);
    const total = devices.length;
    const onCount = devices.filter(d => d.state && d.state.state === 'on').length;

    const deviceBadges = devices.map(({ device, state }) => {
      const isOn = state && state.state === 'on';
      return `<span class="device-status ${isOn ? 'on' : 'off'}" data-device-id="${device.id}">${device.name}</span>`;
    }).join('');

    const climateDevice = devices.find(d => d.device.type === 'climate');
    const tempBadge = climateDevice && climateDevice.state && climateDevice.state.state === 'on'
      ? `<span class="temp-badge">${climateDevice.state.attributes.temperature || '--'}°C</span>`
      : '';

    const sub = total === 0
      ? 'Sem dispositivos'
      : onCount === 0
        ? 'Tudo apagado'
        : onCount === total
          ? 'Tudo ligado'
          : `${onCount} de ${total} ligado${onCount === 1 ? '' : 's'}`;

    return `
      <div class="zone-card-head">
        <div class="zone-icon">${iconSVG}</div>
        <div class="zone-counter">
          <span class="zone-counter-on">${onCount}</span><span class="zone-counter-sep">/${total}</span>
        </div>
      </div>
      <div class="zone-body">
        <div class="zone-name">${zone.name}</div>
        <div class="zone-sub">${sub}</div>
      </div>
      <div class="zone-devices">${deviceBadges}${tempBadge}</div>
    `;
  },

  _bindCardControls(card, zone) {
    card.addEventListener('click', async (ev) => {
      const zoneData = ZoneRegistry.get(zone.id);
      if (!zoneData) return;

      if (HAClient.getStatus() !== 'online') {
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 400);
        return;
      }

      const badge = ev.target.closest('.device-status[data-device-id]');
      let targets;
      if (badge) {
        const deviceId = badge.getAttribute('data-device-id');
        const device = zoneData.devices.find(d => d.id === deviceId);
        if (!device) return;
        targets = [device];
      } else {
        // Clique fora das badges: alterna o conjunto inteiro
        // Se algum estiver ligado, desliga todos; caso contrário liga todos
        const anyOn = zoneData.devices.some(d => {
          const st = StateStore.get(d.entity);
          return st && st.state === 'on';
        });
        targets = zoneData.devices.map(d => ({ ...d, _forceState: anyOn ? 'off' : 'on' }));
      }

      for (const device of targets) {
        const entityId = device.entity;
        const current = StateStore.get(entityId);
        const forced = device._forceState;
        const nextState = forced || (current && current.state === 'on' ? 'off' : 'on');
        const optimistic = { ...(current || { entity_id: entityId, attributes: {} }), state: nextState };
        StateStore.update(entityId, optimistic);

        const domain = entityId.split('.')[0];
        const service = forced ? (forced === 'on' ? 'turn_on' : 'turn_off') : 'toggle';
        try {
          await HAClient.callService(domain, service, { entity_id: entityId });
        } catch (err) {
          console.error('[dmsmart] toggle falhou:', err);
          StateStore.update(entityId, current);
        }
      }
    });
  },

  _getIcon(iconName) {
    const icons = {
      sofa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/><path d="M2 11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4H2v-4z"/><path d="M4 15v2"/><path d="M20 15v2"/></svg>`,
      bed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9V4h20v5"/><path d="M2 9a2 2 0 0 0-2 2v4h24v-4a2 2 0 0 0-2-2H2z"/><path d="M2 15v4"/><path d="M22 15v4"/></svg>`,
      kitchen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M12 3v18"/><path d="M2 9h20"/><circle cx="6" cy="6" r="1"/><circle cx="9" cy="6" r="1"/></svg>`,
      shower: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 16 0"/><path d="M20 12v8"/><path d="M12 12v8"/><circle cx="16" cy="16" r="1"/><circle cx="16" cy="19" r="1"/><circle cx="19" cy="17" r="1"/></svg>`,
      car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 12h14"/></svg>`,
      tree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L7 9h3L5 16h5l-2 6h8l-2-6h5L14 9h3z"/></svg>`,
      hanger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a2 2 0 0 1 2 2c0 1-1 2-2 3L2 15h20L12 9"/><path d="M12 4a2 2 0 0 0-2 2"/></svg>`,
      washing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M7 7h.01M10 7h.01M13 7h.01"/></svg>`,
      monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`
    };
    return icons[iconName] || icons['sofa'];
  }
};
