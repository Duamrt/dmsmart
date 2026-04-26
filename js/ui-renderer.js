// ui-renderer.js
// Renderiza cards de zona no .zones-grid
// Cada card se inscreve no StateStore para atualizar automaticamente

const _recentlyToggled = new Set();

// _esc é declarado em app.js (escopo global) — usado nas funções de render abaixo
// pra escapar zone.name e prevenir XSS em template literals

const UIRenderer = {
  container: null,
  _zoneUnsubs: [],
  _registryUnsub: null,

  init(container) {
    this.container = container;
    this.renderAll();
    if (typeof ZoneRegistry.onChange === 'function') {
      if (this._registryUnsub) this._registryUnsub();
      this._registryUnsub = ZoneRegistry.onChange(() => this.renderAll());
    }
  },

  renderAll() {
    if (this._zoneUnsubs && this._zoneUnsubs.length) {
      this._zoneUnsubs.forEach(fn => { try { fn(); } catch {} });
    }
    this._zoneUnsubs = [];
    this.container.innerHTML = '';
    const zones = ZoneRegistry.all();
    if (zones.length === 0) {
      this._renderOnboarding();
    } else {
      for (const zone of zones) {
        this.renderZoneCard(zone);
      }
    }
    this._renderNewZoneCard();
  },

  _renderOnboarding() {
    const wrap = document.createElement('div');
    wrap.className = 'onb-wrap';
    wrap.innerHTML = `
      <div class="onb-header">
        <div class="onb-title">Bem-vindo ao dmsmart</div>
        <div class="onb-sub">Siga os passos abaixo para começar a controlar seu ambiente</div>
      </div>
      <div class="onb-steps">
        <div class="onb-step onb-step--done">
          <div class="onb-step-icon">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,8 6,12 14,4"/></svg>
          </div>
          <div class="onb-step-body">
            <div class="onb-step-title">Home Assistant conectado</div>
            <div class="onb-step-sub">Sua instalação está pronta</div>
          </div>
        </div>
        <div class="onb-step onb-step--active">
          <div class="onb-step-icon">2</div>
          <div class="onb-step-body">
            <div class="onb-step-title">Criar uma zona</div>
            <div class="onb-step-sub">Ex: Sala de estar, Quarto, Cozinha, Jardim</div>
          </div>
          <button class="onb-cta" id="onb-btn-create-zone">+ Criar zona</button>
        </div>
        <div class="onb-step onb-step--pending">
          <div class="onb-step-icon">3</div>
          <div class="onb-step-body">
            <div class="onb-step-title">Adicionar dispositivos</div>
            <div class="onb-step-sub">Lâmpadas, interruptores, sensores e mais</div>
          </div>
        </div>
      </div>
    `;
    this.container.appendChild(wrap);
    wrap.querySelector('#onb-btn-create-zone')?.addEventListener('click', () => {
      if (typeof ZoneEditor !== 'undefined') ZoneEditor.open();
    });
  },

  _renderNewZoneCard() {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'zone-card zone-card-new';
    card.setAttribute('aria-label', 'Novo ambiente');
    card.innerHTML = `
      <div class="zone-card-new-plus">+</div>
      <div class="zone-card-new-label">Novo ambiente</div>
      <div class="zone-card-new-hint">Criar uma nova zona e vincular dispositivos</div>
    `;
    card.addEventListener('click', () => {
      if (typeof ZoneEditor !== 'undefined') ZoneEditor.open();
    });
    this.container.appendChild(card);
  },

  renderZoneCard(zone) {
    const card = document.createElement('div');
    card.className = 'zone-card';
    card.id = `zone-${zone.id}`;
    this.container.appendChild(card);
    this._bindCardControls(card, zone);

    const isSolar = zone.icon === 'solar';
    const update = () => {
      const devices = zone.devices.map(d => ({
        device: d,
        state: StateStore.get(d.entity)
      }));
      let hasActive;
      if (isSolar) {
        hasActive = devices.some(d => {
          const n = parseFloat(d.state?.state);
          return !isNaN(n) && n > 0;
        });
      } else {
        hasActive = devices.some(d => d.state && d.state.state === 'on');
      }
      card.className = `zone-card${isSolar ? ' zone-card-solar' : ''}${hasActive ? ' has-active' : ''}`;
      card.innerHTML = this._buildCardHTML(zone, devices);
    };

    const unsub = StateStore.subscribeZone(zone.id, update);
    if (this._zoneUnsubs) this._zoneUnsubs.push(unsub);
    update();
  },

  _buildCardHTML(zone, devices) {
    if (zone.icon === 'solar') return this._buildSolarCardHTML(zone, devices);
    const iconSVG = this._getIcon(zone.icon);
    const total = devices.length;
    const onCount = devices.filter(d => d.state && d.state.state === 'on').length;

    const deviceBadges = devices.map(({ device, state }) => {
      const s = state ? state.state : null;
      let badgeClass, badgeLabel;
      if (device.type === 'alarm_control_panel') {
        const alarmMap = { disarmed: 'alarm-disarmed', armed_home: 'alarm-armed', armed_away: 'alarm-armed', armed_night: 'alarm-armed', armed_vacation: 'alarm-armed', triggered: 'alarm-triggered', arming: 'alarm-arming', pending: 'alarm-arming' };
        const labelMap = { disarmed: 'Desarmado', armed_home: 'Casa', armed_away: 'Fora', armed_night: 'Noite', armed_vacation: 'Férias', triggered: 'ALERTA!', arming: 'Armando…', pending: 'Pendente' };
        badgeClass = alarmMap[s] || 'alarm-unknown';
        badgeLabel = (labelMap[s] || s || '—');
      } else if (device.type === 'valve') {
        const isOpen = s === 'open' || s === 'on';
        badgeClass = isOpen ? 'on' : 'off';
        badgeLabel = device.name;
      } else {
        badgeClass = s === 'on' ? 'on' : 'off';
        badgeLabel = device.name;
      }
      const justToggled = _recentlyToggled.has(device.entity) ? ' just-toggled' : '';
      return `<button type="button" class="device-status ${badgeClass}${justToggled}" data-device-id="${device.id}" aria-label="${device.name}">${badgeLabel}</button>`;
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
        <div class="zone-name">${_esc(zone.name)}</div>
        <div class="zone-sub">${sub}</div>
      </div>
      <div class="zone-devices">${deviceBadges}${tempBadge}</div>
    `;
  },

  _buildSolarCardHTML(zone, devices) {
    const iconSVG = this._getIcon('solar');

    // Classify sensors: energy (kWh) → monthly; power with grid hint → grid; else → generation
    let gen = null, grid = null, monthly = null;
    for (const { device, state } of devices) {
      const dc  = (state?.attributes?.device_class || '').toLowerCase();
      const uom = (state?.attributes?.unit_of_measurement || '').toLowerCase();
      const ent = (device.entity || '').toLowerCase();
      const nm  = (device.name  || '').toLowerCase();
      if (dc === 'energy' || uom === 'kwh') {
        if (!monthly) monthly = { device, state };
      } else {
        const isGrid = ent.includes('grid') || ent.includes('rede') ||
                       nm.includes('grid')  || nm.includes('rede')  ||
                       ent.includes('import') || ent.includes('export') ||
                       nm.includes('import') || nm.includes('export');
        if (isGrid && !grid) grid = { device, state };
        else if (!gen)        gen  = { device, state };
      }
    }
    // position fallback
    if (!gen && devices[0]) gen = devices[0];

    const _fmtPwr = (s) => {
      if (!s || !s.state || s.state === 'unavailable' || s.state === 'unknown') return { val: '--', unit: '' };
      const n = parseFloat(s.state);
      if (isNaN(n)) return { val: '--', unit: '' };
      const uom = (s.attributes?.unit_of_measurement || '');
      if (uom === 'W') {
        const kw = n / 1000;
        return { val: Math.abs(kw) < 10 ? kw.toFixed(2) : kw.toFixed(1), unit: 'kW', raw: n };
      }
      const dec = Math.abs(n) < 10 ? 2 : 1;
      return { val: parseFloat(n.toFixed(dec)), unit: uom, raw: n };
    };

    const genFmt = gen     ? _fmtPwr(gen.state)     : { val: '--', unit: 'kW', raw: 0 };
    const gridFmt = grid   ? _fmtPwr(grid.state)     : null;
    const monFmt  = monthly ? _fmtPwr(monthly.state) : null;

    const genRaw  = gen   ? parseFloat(gen.state?.state)  : NaN;
    const gridRaw = grid  ? parseFloat(grid.state?.state) : NaN;
    const isGenerating = !isNaN(genRaw) && genRaw > 0;
    const isExporting  = !isNaN(gridRaw) && gridRaw > 0;

    const statusText = !gen
      ? 'Configure os sensores solares'
      : isGenerating
        ? `Gerando${grid ? (isExporting ? ' · Exportando' : ' · Importando') : ''}`
        : 'Sem geração solar';

    const genBadge = `<div class="solar-gen-badge${isGenerating ? ' active' : ''}">${genFmt.val}<span> ${genFmt.unit || 'kW'}</span></div>`;

    let metricsHTML = '';
    if (gen) {
      metricsHTML += `
        <div class="solar-metric">
          <div class="solar-metric-value solar-gen">${genFmt.val} <span class="solar-metric-unit">${genFmt.unit}</span></div>
          <div class="solar-metric-label">Geração</div>
        </div>`;
    }
    if (grid) {
      const absRaw = isNaN(gridRaw) ? 0 : Math.abs(gridRaw);
      const absFmt = isNaN(gridRaw) ? gridFmt : _fmtPwr({ ...grid.state, state: String(absRaw) });
      const gClass = isNaN(gridRaw) ? '' : (isExporting ? 'solar-export' : 'solar-import');
      const gLabel = isNaN(gridRaw) ? (grid.device.name || 'Rede') : (isExporting ? 'Exportando' : 'Importando');
      metricsHTML += `
        <div class="solar-metric">
          <div class="solar-metric-value ${gClass}">${absFmt.val} <span class="solar-metric-unit">${absFmt.unit}</span></div>
          <div class="solar-metric-label">${gLabel}</div>
        </div>`;
    }
    if (monthly) {
      metricsHTML += `
        <div class="solar-metric">
          <div class="solar-metric-value solar-monthly">${monFmt.val} <span class="solar-metric-unit">${monFmt.unit}</span></div>
          <div class="solar-metric-label">${monthly.device.name || 'Este mês'}</div>
        </div>`;
    }
    if (!metricsHTML) {
      metricsHTML = `<div class="solar-metric" style="flex:1"><div class="solar-metric-label" style="text-align:center;padding:4px 0">Adicione sensores ao ambiente</div></div>`;
    }

    return `
      <div class="zone-card-head">
        <div class="zone-icon">${iconSVG}</div>
        ${genBadge}
      </div>
      <div class="zone-body">
        <div class="zone-name">${_esc(zone.name)}</div>
        <div class="zone-sub">${statusText}</div>
      </div>
      <div class="solar-metrics">${metricsHTML}</div>
    `;
  },

  _bindCardControls(card, zone) {
    // Tap no chip de dispositivo = atalho rápido
    //   - switch/light: toggle direto (optimistic)
    //   - outros (climate/cover/fan/media_player): abre ControlModal
    // Tap em qualquer outra área do card = abre ZoneModal (o "ambiente")
    card.addEventListener('click', (e) => {
      const badge = e.target.closest('[data-device-id]');
      if (badge) {
        e.stopPropagation();
        const deviceId = badge.dataset.deviceId;
        const zoneData = ZoneRegistry.get(zone.id);
        const device = zoneData && zoneData.devices.find(d => d.id === deviceId);
        if (!device) return;
        const type = device.type || 'switch';
        if ((type === 'switch' || type === 'light') && !device.isCritical) {
          this._quickToggle(device);
        } else if (type === 'sensor') {
          // read-only, noop
        } else if (typeof ControlModal !== 'undefined') {
          ControlModal.open(device);
        }
        return;
      }
      const zoneData = ZoneRegistry.get(zone.id);
      if (!zoneData) return;
      if (typeof ZoneModal !== 'undefined') {
        ZoneModal.open(zoneData);
      }
    });
  },

  _quickToggle(device) {
    const current = StateStore.get(device.entity);
    const isOn = current && current.state === 'on';
    const next = { ...(current || { entity_id: device.entity, attributes: {} }), state: isOn ? 'off' : 'on' };
    _recentlyToggled.add(device.entity);
    setTimeout(() => _recentlyToggled.delete(device.entity), 350);
    StateStore.update(device.entity, next);
    const domain = device.entity.split('.')[0];
    if (typeof HAClient !== 'undefined' && HAClient.callService) {
      HAClient.callService(domain, 'toggle', { entity_id: device.entity }).catch(() => {
        StateStore.update(device.entity, current);
      });
    }
  },

  _getIcon(iconName) {
    const icons = {
      sofa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 13a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z"/><path d="M6 19v2M18 19v2"/><path d="M7 11V9M17 11V9"/></svg>`,
      bed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"/><path d="M3 14h18"/><path d="M7 10V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/></svg>`,
      kitchen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18v2a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-2z"/><path d="M3 11h18"/><path d="M8 8V5M12 8V4M16 8V5"/><path d="M6 19v2M18 19v2"/></svg>`,
      shower: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M7 8h10a0 0 0 0 1 0 0l-1 3H8l-1-3z"/><path d="M9 14v2"/><path d="M12 15v3"/><path d="M15 14v2"/><path d="M10 19v2"/><path d="M14 19v2"/></svg>`,
      car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14"/><path d="M3 17v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4"/><path d="M3 13h18"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/></svg>`,
      tree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a5 5 0 0 0-4 8 4 4 0 0 0 2 7h4a4 4 0 0 0 2-7 5 5 0 0 0-4-8z"/><path d="M12 18v4"/></svg>`,
      hanger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a2 2 0 0 0-2 2"/><path d="M12 4a2 2 0 0 1 2 2c0 1.2-1 2-2 2.5L3 14a1 1 0 0 0 .5 2h17a1 1 0 0 0 .5-2l-9-5.5"/></svg>`,
      washing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="14" r="4"/><path d="M9 14a3 3 0 0 0 3-3"/><circle cx="8" cy="7" r="0.6" fill="currentColor"/><circle cx="11" cy="7" r="0.6" fill="currentColor"/></svg>`,
      monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M3 14h18"/><path d="M9 21h6"/><path d="M12 17v4"/></svg>`,
      toilet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h4v7H6z"/><path d="M5 10h14v4a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-4z"/><path d="M10 19l-1 2M14 19l1 2"/></svg>`,
      door: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v18"/><path d="M2 22h20"/><circle cx="15" cy="13" r="0.8" fill="currentColor"/></svg>`,
      lamp:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 4 10.5c-.7.6-1 1.3-1 2V16H9v-.5c0-.7-.3-1.4-1-2A6 6 0 0 1 12 3z"/></svg>`,
      solar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`
    };
    return icons[iconName] || icons['sofa'];
  }
};
