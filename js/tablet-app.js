// tablet-app.js — kiosk de parede (Fase B5)
(async function () {
  'use strict';
  await MobileBoot.init();

  const inst = MobileBoot.inst;
  document.getElementById('t-title').textContent = inst.name || 'Casa';

  // ── Relógio ─────────────────────────────────────────────────────────────────
  function updateClock() {
    const d = new Date();
    document.getElementById('t-clock').textContent =
      `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const dias = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
    const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    document.getElementById('t-date').textContent = `${dias[d.getDay()]} · ${d.getDate()} ${meses[d.getMonth()]}`;
  }
  updateClock();
  setInterval(updateClock, 30_000);

  // ── Conexão status ──────────────────────────────────────────────────────────
  const connDot  = document.getElementById('t-conn-dot');
  const connText = document.getElementById('t-conn-text');
  if (MobileBoot.previewMode) {
    connDot.className = 't-dot t-dot-warn';
    connText.textContent = 'Modo preview · sem login';
  } else if (typeof HAClient !== 'undefined' && HAClient.onStatusChange) {
    HAClient.onStatusChange((s) => {
      connDot.className = 't-dot ' + (s === 'online' ? 't-dot-on' : (s === 'connecting' || s === 'reconnecting') ? 't-dot-warn' : 't-dot-off');
      connText.textContent = s === 'online' ? 'HA conectado' : s === 'reconnecting' ? 'reconectando…' : s === 'connecting' ? 'conectando…' : 'offline';
    });
  } else {
    connDot.className = 't-dot t-dot-on';
    connText.textContent = 'HA conectado';
  }

  // ── Hero gauges (atualiza com dados reais) ──────────────────────────────────
  const zones = ZoneRegistry.all();
  function updateGauges() {
    const allDevs = zones.flatMap(z => (z.devices || []));
    const total = allDevs.length;
    const on = allDevs.filter(d => StateStore.get(d.entity)?.state === 'on').length;
    document.getElementById('t-gauge-on').textContent = on;
    document.getElementById('t-gauge-on-of').textContent = `/${total}`;

    // Decompõe por categoria
    const luzes = allDevs.filter(d => d.entity.startsWith('light.') && StateStore.get(d.entity)?.state === 'on').length;
    const acs = allDevs.filter(d => d.entity.startsWith('climate.') && StateStore.get(d.entity)?.state !== 'off' && StateStore.get(d.entity)?.state).length;
    const outros = on - luzes - acs;
    document.getElementById('t-gauge-on-sub').textContent = `${luzes} luz${luzes===1?'':'es'} · ${acs} AC · ${outros} outros`;

    // Câmeras
    const cams = allDevs.filter(d => d.entity.startsWith('camera.')).length;
    document.getElementById('t-gauge-sec-sub').textContent = `${cams} câmera${cams===1?'':'s'} · portões OK`;

    // Atualiza dashoffset do anel ligados (proporção on/total)
    const pct = total > 0 ? on / total : 0;
    const offsetOn = 263.9 * (1 - pct);
    document.querySelector('.t-gauge-3 .t-ring-fg').setAttribute('stroke-dashoffset', offsetOn);
  }

  // ── Render zonas grid ───────────────────────────────────────────────────────
  const zonesEl = document.getElementById('t-zones');

  function devPillIcon(domain) {
    const icons = {
      light: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.7c-.6.5-1 1.3-1 2.1V18H9v-1.2c0-.8-.4-1.6-1-2.1A7 7 0 0 1 12 2z"/></svg>',
      climate: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>',
      switch: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>',
      cover: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
      camera: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></svg>',
      media_player: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="14" rx="2"/></svg>',
      sensor: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 2v8M8 12h8"/></svg>',
    };
    return icons[domain] || icons.switch;
  }

  function renderZones() {
    if (!zones.length) {
      zonesEl.innerHTML = '<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--text-3)">Nenhuma zona configurada</div>';
      return;
    }

    zonesEl.innerHTML = zones.map((z, i) => {
      const devs = z.devices || [];
      const onCount = devs.filter(d => StateStore.get(d.entity)?.state === 'on').length;
      // Pega temperatura se houver climate
      const climateDev = devs.find(d => d.entity.startsWith('climate.'));
      const climateSt = climateDev ? StateStore.get(climateDev.entity) : null;
      const climateTarget = climateDev?.target_temp || 22;
      const showTemp = climateDev && climateSt?.state && climateSt.state !== 'off';

      // Lista até 8 device pills
      const pills = devs.slice(0, 8).map(d => {
        const dom = d.entity.split('.')[0];
        const st = StateStore.get(d.entity);
        const isOn = st?.state === 'on';
        const isCold = dom === 'climate' && st?.state && st.state !== 'off';
        const cls = isCold ? 'cold' : (isOn ? 'on' : '');
        return `<div class="t-dev-pill ${cls}" title="${MobileBoot.escapeHtml(d.name || d.entity)}">${devPillIcon(dom)}</div>`;
      }).join('');

      return `
        <div class="t-zone ${i === 0 ? 'active' : ''}" data-zone="${MobileBoot.escapeHtml(z.id)}">
          <div class="t-z-head">
            <div>
              <div class="t-z-name">${MobileBoot.escapeHtml(z.name)}</div>
              <div class="t-z-meta">${onCount} ligado${onCount===1?'':'s'}${devs.length ? ` · ${devs.length} dispositivo${devs.length===1?'':'s'}` : ''}</div>
            </div>
            <div class="t-z-temp"${showTemp ? '' : ' style="opacity:.4"'}>${showTemp ? climateTarget : '—'}<small>${showTemp ? '°C' : ''}</small></div>
          </div>
          <div class="t-z-devs">
            ${pills}
            <div class="t-z-toggle ${onCount > 0 ? 'on' : ''}"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Events timeline (mock por enquanto) ─────────────────────────────────────
  function renderEvents() {
    const events = MobileBoot.previewMode ? [
      { dot: 'on',   time: '9:39', what: 'AC Sala',         tail: 'ligado' },
      { dot: 'on',   time: '9:32', what: 'Cena "Bom dia"',  tail: 'ativada' },
      { dot: 'warn', time: '9:18', what: 'Garagem',          tail: 'portão aberto' },
      { dot: 'on',   time: '8:55', what: 'Câmera Sala',      tail: 'movimento' },
      { dot: 'on',   time: '8:30', what: 'Aspirador',         tail: 'iniciou' },
    ] : [];
    const el = document.getElementById('t-events');
    el.innerHTML = events.length === 0
      ? '<span style="color:var(--text-3);font-size:12px">Sem eventos recentes</span>'
      : events.map(e => `
          <div class="t-event">
            <span class="t-dot t-dot-${e.dot}"></span>
            <time>${e.time}</time>
            <span class="t-what">${e.what}</span>
            <span>${e.tail}</span>
          </div>
        `).join('');
  }

  // ── Sidebar nav ─────────────────────────────────────────────────────────────
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      // Tablet por enquanto é dashboard único; clicks em outras views podem ir
      // pras telas mobile (que também funcionam em tablet)
      if (view === 'casa') return;
      if (view === 'zonas') {
        const z = ZoneRegistry.all()[0];
        window.location.href = z ? `mobile-room.html?zone=${encodeURIComponent(z.id)}` : 'mobile-room.html';
      } else if (view === 'energia') {
        window.location.href = 'mobile-energy.html';
      } else if (view === 'setup') {
        window.location.href = 'index.html';
      }
    });
  });

  // ── Subscribe pra updates ───────────────────────────────────────────────────
  StateStore.subscribeAll?.(() => {
    updateGauges();
    renderZones();
  });

  // Render inicial
  updateGauges();
  renderZones();
  renderEvents();
})();
