// mobile-room.js — tela de Cômodo aberto (Fase B2)
(async function () {
  'use strict';

  await MobileBoot.init();

  const zones = ZoneRegistry.all();
  if (!zones.length) {
    document.getElementById('m-dev-grid').innerHTML =
      '<div class="m-dev-empty">Nenhum cômodo configurado</div>';
    return;
  }

  // Pega zona da query string ou primeira
  const params = new URLSearchParams(window.location.search);
  let activeId = params.get('zone') || zones[0].id;
  if (!zones.find(z => z.id === activeId)) activeId = zones[0].id;

  const titleEl = document.getElementById('m-room-title');
  const subEl   = document.getElementById('m-room-sub');
  const tabsEl  = document.getElementById('m-room-tabs');
  const climateEl = document.getElementById('m-climate');
  const climateValEl = document.getElementById('m-climate-val');
  const climateSubEl = document.getElementById('m-climate-sub');
  const gridEl  = document.getElementById('m-dev-grid');

  // Renderiza pills das zonas
  function renderTabs() {
    tabsEl.innerHTML = zones.map(z => `
      <button class="m-room-pill ${z.id === activeId ? 'active' : ''}" data-zone="${MobileBoot.escapeHtml(z.id)}">
        ${MobileBoot.escapeHtml(z.name)}
      </button>
    `).join('');
  }

  function renderClimate(zone) {
    const climateDev = (zone.devices || []).find(d => d.entity.startsWith('climate.'));
    if (!climateDev) {
      climateEl.hidden = true;
      return;
    }
    const st = StateStore.get(climateDev.entity);
    if (!st) { climateEl.hidden = true; return; }
    climateEl.hidden = false;
    const target = climateDev.target_temp || 22;
    climateValEl.innerHTML = `${target}<span style="font-size:14px;font-weight:500">°C</span>`;
    const mode = st.s === 'off' ? 'desligado' : st.s;
    climateSubEl.textContent = `${MobileBoot.escapeHtml(climateDev.name || 'AC')} · ${mode}`;
  }

  function deviceRender(domain, isOn) {
    // Renders SVG estilizados por domínio
    if (domain === 'light') return `
      <svg viewBox="0 0 56 56" fill="none">
        <defs><radialGradient id="lampG-${Math.random().toString(36).slice(2,7)}" cx=".5" cy=".4" r=".6">
          <stop offset="0%" stop-color="#fff" stop-opacity=".95"/>
          <stop offset="40%" stop-color="${isOn ? '#ffd770' : '#3a3f4a'}"/>
          <stop offset="100%" stop-color="${isOn ? '#ff6b35' : '#1a1d24'}" stop-opacity=".4"/>
        </radialGradient></defs>
        <ellipse cx="28" cy="22" rx="16" ry="18" fill="${isOn ? '#ffd770' : '#3a3f4a'}" opacity="${isOn ? .9 : .6}"/>
        <path d="M18 36 L38 36 L37 46 L19 46 Z" fill="url(#lampBase)" stroke="rgba(255,255,255,.1)"/>
        <rect x="25" y="46" width="6" height="6" fill="#1a1d24"/>
      </svg>`;
    if (domain === 'climate') return `
      <svg viewBox="0 0 56 56" fill="none">
        <rect x="6" y="14" width="44" height="20" rx="4" fill="#e6eaf2" opacity=".9"/>
        <rect x="10" y="32" width="36" height="3" rx="1" fill="rgba(0,0,0,.15)"/>
        <circle cx="14" cy="22" r="2" fill="${isOn ? '#2a73ff' : '#7a8090'}"/>
        ${isOn ? '<path d="M22 38c-1 4-3 7-6 8M28 38c0 5-2 8-5 9M34 38c1 4 3 7 6 8" stroke="#00d4ff" stroke-width="1.5" stroke-linecap="round" fill="none"/>' : ''}
      </svg>`;
    if (domain === 'media_player') return `
      <svg viewBox="0 0 56 56" fill="none">
        <rect x="6" y="14" width="44" height="26" rx="3" fill="#1a1d24" stroke="rgba(255,255,255,.15)"/>
        <rect x="9" y="17" width="38" height="20" rx="1" fill="${isOn ? '#0a3a5a' : '#0a0b10'}"/>
        <rect x="22" y="42" width="12" height="2" rx="1" fill="#3a3f4a"/>
      </svg>`;
    if (domain === 'camera') return `
      <svg viewBox="0 0 56 56" fill="none">
        <rect x="14" y="18" width="28" height="20" rx="10" fill="#7a8090"/>
        <circle cx="28" cy="28" r="6" fill="#1a1d24"/>
        <circle cx="28" cy="28" r="3" fill="${isOn ? '#2a73ff' : '#3a3f4a'}"/>
        <circle cx="28" cy="28" r="1.5" fill="#fff"/>
        <circle cx="36" cy="22" r="1" fill="${isOn ? '#ff6b35' : '#3a3f4a'}"/>
      </svg>`;
    if (domain === 'cover') return `
      <svg viewBox="0 0 56 56" fill="none">
        <rect x="10" y="10" width="36" height="36" rx="2" fill="#1a1d24" stroke="rgba(255,255,255,.2)"/>
        <line x1="12" y1="16" x2="44" y2="16" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
        <line x1="12" y1="22" x2="44" y2="22" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
        <line x1="12" y1="28" x2="44" y2="28" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
        <line x1="12" y1="34" x2="44" y2="34" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
        <line x1="12" y1="40" x2="44" y2="40" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
      </svg>`;
    if (domain === 'switch') return `
      <svg viewBox="0 0 56 56" fill="none">
        <rect x="14" y="10" width="28" height="36" rx="4" fill="#e6eaf2" opacity=".9"/>
        <circle cx="22" cy="22" r="2" fill="#1a1d24"/>
        <circle cx="34" cy="22" r="2" fill="#1a1d24"/>
        <circle cx="28" cy="34" r="3" fill="#1a1d24"/>
        <rect x="22" y="44" width="12" height="2" rx="1" fill="${isOn ? '#2dd47b' : '#3a3f4a'}"/>
      </svg>`;
    return MobileBoot.iconForDomain(domain);
  }

  function renderGrid(zone) {
    const devs = zone.devices || [];
    const onCount = devs.filter(d => StateStore.get(d.entity)?.s === 'on').length;
    titleEl.textContent = zone.name;
    subEl.textContent = `${devs.length} dispositivo${devs.length === 1 ? '' : 's'} · ${onCount} ligado${onCount === 1 ? '' : 's'}`;

    if (!devs.length) {
      gridEl.innerHTML = '<div class="m-dev-empty" style="grid-column:1/-1">Sem dispositivos nesta zona</div>';
      return;
    }

    gridEl.innerHTML = devs.map(d => {
      const st = StateStore.get(d.entity);
      const isOn = st?.s === 'on';
      const domain = d.entity.split('.')[0];
      const togglable = ['light','switch','climate','media_player','cover'].includes(domain);
      const stateText = MobileBoot.formatMeta(d, st);
      return `
        <button class="m-dev-tile" data-on="${isOn}" data-entity="${MobileBoot.escapeHtml(d.entity)}">
          <div class="m-dev-render">${deviceRender(domain, isOn)}</div>
          <div class="m-dev-meta-row">
            <div class="m-dev-meta-info">
              <div class="m-dev-tile-name">${MobileBoot.escapeHtml(d.name || d.entity)}</div>
              <div class="m-dev-tile-sub">${stateText}</div>
            </div>
            ${togglable ? `<span class="m-dev-tile-toggle" aria-pressed="${isOn}" data-toggle-entity="${MobileBoot.escapeHtml(d.entity)}"></span>` : ''}
          </div>
        </button>
      `;
    }).join('');
  }

  function renderAll() {
    const zone = ZoneRegistry.get(activeId);
    if (!zone) return;
    renderTabs();
    renderClimate(zone);
    renderGrid(zone);
  }

  // Tabs click
  tabsEl.addEventListener('click', (e) => {
    const pill = e.target.closest('[data-zone]');
    if (!pill) return;
    activeId = pill.getAttribute('data-zone');
    history.replaceState(null, '', `mobile-room.html?zone=${encodeURIComponent(activeId)}`);
    renderAll();
  });

  // Toggle click (NÃO propagar pra abrir o controle)
  document.body.addEventListener('click', (e) => {
    const tgl = e.target.closest('[data-toggle-entity]');
    if (tgl) {
      e.stopPropagation();
      const entity = tgl.getAttribute('data-toggle-entity');
      const isOn = tgl.getAttribute('aria-pressed') === 'true';
      tgl.setAttribute('aria-pressed', String(!isOn));
      const tile = tgl.closest('.m-dev-tile');
      if (tile) tile.setAttribute('data-on', String(!isOn));
      MobileBoot.toggle(entity);
      return;
    }
    // Click no tile → abrir controle (Fase B3)
    const tile = e.target.closest('.m-dev-tile');
    if (tile) {
      const entity = tile.getAttribute('data-entity');
      // Fase B3: window.location.href = `mobile-device.html?entity=${entity}`;
      console.log('[mobile-room] tile clicked:', entity);
    }
  });

  // Botão voltar
  document.getElementById('m-back').addEventListener('click', () => {
    history.length > 1 ? history.back() : window.location.href = 'mobile.html';
  });

  // Tab bar routing
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = btn.getAttribute('data-route');
      if (r === 'energia') alert('Energia mobile — em construção (Fase B4)');
      else if (r === 'setup') window.location.href = 'index.html';
      else if (r === 'add') alert('Em construção');
    });
  });

  // Subscribe pra updates
  StateStore.subscribeAll(() => {
    const zone = ZoneRegistry.get(activeId);
    if (zone) renderGrid(zone);
  });

  renderAll();
})();
