// mobile-device.js — controle de dispositivo (Fase B3)
(async function () {
  'use strict';
  await MobileBoot.init();

  const params = new URLSearchParams(window.location.search);
  const entityId = params.get('entity');
  if (!entityId) {
    document.getElementById('m-dev-main').innerHTML = '<div class="m-dev-empty" style="padding:40px;text-align:center;color:var(--text-2)">Dispositivo não informado</div>';
    return;
  }

  const zone = ZoneRegistry.findZoneByEntity(entityId);
  const dev = (zone?.devices || []).find(d => d.entity === entityId) || { entity: entityId, name: entityId };
  const domain = entityId.split('.')[0];
  const st = StateStore.get(entityId);
  let isOn = st?.state === 'on';

  // Header
  document.getElementById('m-dev-h-title').textContent = dev.name || entityId;
  document.getElementById('m-dev-h-sub').textContent = `${zone?.name || '—'} · ${entityId}`;

  // Hero render — usa o mesmo render bonito do mockup
  document.getElementById('m-dev-hero-render').innerHTML = renderHero(domain, isOn);
  document.getElementById('m-dev-hero-name').textContent = dev.name || entityId;
  document.getElementById('m-dev-hero-meta').textContent = formatHeroMeta(domain, st);

  // Power FAB
  const powerBtn = document.getElementById('m-power-fab');
  powerBtn.setAttribute('aria-pressed', String(isOn));
  powerBtn.addEventListener('click', () => {
    isOn = !isOn;
    powerBtn.setAttribute('aria-pressed', String(isOn));
    document.getElementById('m-dev-hero-render').innerHTML = renderHero(domain, isOn);
    MobileBoot.toggle(entityId);
  });

  // Render do controle por domínio
  const ctrl = document.getElementById('m-dev-control');
  if (domain === 'light') renderLightControl(ctrl, dev);
  else if (domain === 'climate') renderClimateControl(ctrl, dev, st);
  else if (domain === 'cover') renderCoverControl(ctrl, dev, st);
  else renderGenericControl(ctrl, dev, st);

  // Modes (cenas) — só pra light
  if (domain === 'light') {
    const modesEl = document.getElementById('m-dev-modes');
    modesEl.hidden = false;
    modesEl.querySelectorAll('.m-mode').forEach(b => {
      b.addEventListener('click', () => {
        modesEl.querySelectorAll('.m-mode').forEach(o => o.classList.remove('active'));
        b.classList.add('active');
      });
    });
  }

  // Voltar
  document.getElementById('m-back').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.location.href = zone ? `mobile-room.html?zone=${encodeURIComponent(zone.id)}` : 'mobile.html';
  });

  // Subscribe state changes
  StateStore.subscribe?.(entityId, (newState) => {
    isOn = newState?.state === 'on';
    powerBtn.setAttribute('aria-pressed', String(isOn));
    document.getElementById('m-dev-hero-render').innerHTML = renderHero(domain, isOn);
    document.getElementById('m-dev-hero-meta').textContent = formatHeroMeta(domain, newState);
  });

  // ── RENDERS POR DOMÍNIO ─────────────────────────────────────────────────────
  function renderHero(domain, on) {
    if (domain === 'light') {
      const bulbColor = on ? '#ffd770' : '#2a2f38';
      const haloColor = on ? '#ff6b35' : '#1a1d24';
      return `
        <svg viewBox="0 0 200 200" fill="none">
          <defs>
            <radialGradient id="bH" cx=".5" cy=".4" r=".6">
              <stop offset="0%" stop-color="#fff" stop-opacity="${on ? 1 : .15}"/>
              <stop offset="40%" stop-color="${bulbColor}"/>
              <stop offset="100%" stop-color="${haloColor}" stop-opacity="${on ? .4 : .8}"/>
            </radialGradient>
            <linearGradient id="bB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#5a5f70"/>
              <stop offset="100%" stop-color="#1a1d24"/>
            </linearGradient>
          </defs>
          <ellipse cx="100" cy="80" rx="55" ry="60" fill="url(#bH)"/>
          ${on ? '<ellipse cx="84" cy="60" rx="20" ry="26" fill="rgba(255,255,255,.55)"/>' : ''}
          <path d="M65 130 L135 130 L130 158 L70 158 Z" fill="url(#bB)" stroke="rgba(255,255,255,.1)"/>
          <line x1="70" y1="138" x2="130" y2="138" stroke="rgba(255,255,255,.15)" stroke-width="1.5"/>
          <line x1="72" y1="146" x2="128" y2="146" stroke="rgba(255,255,255,.15)" stroke-width="1.5"/>
          <rect x="92" y="158" width="16" height="14" fill="#1a1d24" stroke="rgba(255,255,255,.1)"/>
          <rect x="96" y="172" width="8" height="6" fill="#0a0b10"/>
        </svg>`;
    }
    if (domain === 'climate') return `
      <svg viewBox="0 0 200 200" fill="none">
        <defs><linearGradient id="acG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#e6eaf2"/><stop offset="100%" stop-color="#7a8090"/>
        </linearGradient></defs>
        <rect x="36" y="60" width="128" height="56" rx="10" fill="url(#acG)" stroke="rgba(0,0,0,.2)"/>
        <rect x="46" y="100" width="108" height="6" rx="2" fill="rgba(0,0,0,.15)"/>
        <circle cx="56" cy="80" r="4" fill="${on ? '#2a73ff' : '#7a8090'}"/>
        ${on ? '<path d="M70 124c-4 14-10 22-20 26M100 124c0 18-6 30-16 32M130 124c4 14 10 22 20 26" stroke="#00d4ff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>' : ''}
      </svg>`;
    if (domain === 'cover') return `
      <svg viewBox="0 0 200 200" fill="none">
        <rect x="40" y="30" width="120" height="140" rx="6" fill="#1a1d24" stroke="rgba(255,255,255,.2)" stroke-width="2"/>
        ${[0,1,2,3,4,5,6,7].map(i => `<line x1="44" y1="${50 + i*15}" x2="156" y2="${50 + i*15}" stroke="rgba(255,255,255,${on ? .12 : .35})" stroke-width="2"/>`).join('')}
      </svg>`;
    if (domain === 'media_player') return `
      <svg viewBox="0 0 200 200" fill="none">
        <rect x="20" y="50" width="160" height="100" rx="8" fill="#1a1d24" stroke="rgba(255,255,255,.15)" stroke-width="2"/>
        <rect x="30" y="60" width="140" height="80" rx="2" fill="${on ? '#0a3a5a' : '#0a0b10'}"/>
        <rect x="80" y="155" width="40" height="6" rx="2" fill="#3a3f4a"/>
      </svg>`;
    if (domain === 'camera') return `
      <svg viewBox="0 0 200 200" fill="none">
        <rect x="50" y="70" width="100" height="68" rx="34" fill="#7a8090" stroke="rgba(0,0,0,.2)"/>
        <circle cx="100" cy="104" r="22" fill="#1a1d24"/>
        <circle cx="100" cy="104" r="12" fill="${on ? '#2a73ff' : '#3a3f4a'}"/>
        <circle cx="100" cy="104" r="6" fill="#fff"/>
        <circle cx="130" cy="86" r="4" fill="${on ? '#ff6b35' : '#3a3f4a'}"/>
      </svg>`;
    return `
      <svg viewBox="0 0 200 200" fill="none">
        <rect x="50" y="40" width="100" height="120" rx="10" fill="#e6eaf2" opacity=".9" stroke="rgba(0,0,0,.2)"/>
        <circle cx="80" cy="80" r="6" fill="#1a1d24"/>
        <circle cx="120" cy="80" r="6" fill="#1a1d24"/>
        <circle cx="100" cy="120" r="10" fill="#1a1d24"/>
        <rect x="80" y="150" width="40" height="6" rx="2" fill="${on ? '#2dd47b' : '#3a3f4a'}"/>
      </svg>`;
  }

  function formatHeroMeta(domain, st) {
    if (!st) return 'desconectado';
    if (domain === 'light') return st.state === 'on' ? '3000K · 72% brilho · ligado' : 'desligado';
    if (domain === 'climate') return st.state === 'off' ? 'desligado' : `modo ${st.state}`;
    if (domain === 'cover') return st.state === 'open' ? 'aberta' : st.state === 'closed' ? 'fechada' : st.state;
    return st.state;
  }

  // ── CONTROLES ───────────────────────────────────────────────────────────────
  function renderLightControl(container, dev) {
    container.innerHTML = `
      <div class="m-wheel-card">
        <div class="m-wheel" id="m-wheel">
          <div class="m-wheel-ring"></div>
          <div class="m-wheel-center">
            <div class="label">COR</div>
            <div class="val" id="m-wheel-val">#FFD770</div>
          </div>
          <div class="m-wheel-handle" id="m-wheel-handle"></div>
        </div>
        <div class="m-bright-row">
          <svg fill="none" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
          <div class="m-bright-bar" id="m-bright-bar">
            <div class="m-bright-fill" id="m-bright-fill" style="width:72%"></div>
            <div class="m-bright-handle" id="m-bright-handle" style="left:72%"></div>
          </div>
          <div class="m-bright-val" id="m-bright-val">72%</div>
        </div>
      </div>
    `;
    initColorWheel();
    initBrightnessBar();
  }

  function initColorWheel() {
    const wheel  = document.getElementById('m-wheel');
    const handle = document.getElementById('m-wheel-handle');
    const valEl  = document.getElementById('m-wheel-val');
    let angle = 60; // padrão amarelo

    function place(deg) {
      angle = (deg + 360) % 360;
      const r = 90; // raio na pista
      const cx = 100, cy = 100;
      const rad = (angle - 90) * Math.PI / 180;
      handle.style.left = `${cx + r * Math.cos(rad) - 11}px`;
      handle.style.top  = `${cy + r * Math.sin(rad) - 11}px`;
      const hex = hslToHex(angle, 100, 60);
      handle.style.background = hex;
      valEl.textContent = hex;
    }
    place(angle);

    function fromEvent(ev) {
      const rect = wheel.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const t = ev.touches ? ev.touches[0] : ev;
      const dx = t.clientX - cx;
      const dy = t.clientY - cy;
      const deg = Math.atan2(dy, dx) * 180/Math.PI + 90;
      place(deg);
    }

    let dragging = false;
    wheel.addEventListener('pointerdown', e => { dragging = true; fromEvent(e); wheel.setPointerCapture(e.pointerId); });
    wheel.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
    wheel.addEventListener('pointerup',   e => { dragging = false; });
    wheel.addEventListener('pointercancel', () => { dragging = false; });
  }

  function initBrightnessBar() {
    const bar    = document.getElementById('m-bright-bar');
    const fill   = document.getElementById('m-bright-fill');
    const handle = document.getElementById('m-bright-handle');
    const valEl  = document.getElementById('m-bright-val');

    function setPct(pct) {
      pct = Math.max(0, Math.min(100, Math.round(pct)));
      fill.style.width = pct + '%';
      handle.style.left = pct + '%';
      valEl.textContent = pct + '%';
    }
    function fromEvent(ev) {
      const rect = bar.getBoundingClientRect();
      const t = ev.touches ? ev.touches[0] : ev;
      const x = t.clientX - rect.left;
      setPct((x / rect.width) * 100);
    }
    let dragging = false;
    bar.addEventListener('pointerdown', e => { dragging = true; fromEvent(e); bar.setPointerCapture(e.pointerId); });
    bar.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
    bar.addEventListener('pointerup',   () => { dragging = false; });
    bar.addEventListener('pointercancel', () => { dragging = false; });
  }

  function renderClimateControl(container, dev, st) {
    const target = parseInt(dev.target_temp || 22);
    container.innerHTML = `
      <div class="m-climate-card">
        <div class="m-climate-gauge">
          <svg viewBox="0 0 200 200">
            <defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#2a73ff"/><stop offset="100%" stop-color="#00d4ff"/>
            </linearGradient></defs>
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>
            <circle cx="100" cy="100" r="80" fill="none" stroke="url(#cg)" stroke-width="10"
              stroke-linecap="round" stroke-dasharray="${(target-16)*502/14} 1000"/>
          </svg>
          <div class="m-climate-val-big">${target}<small>°C</small></div>
        </div>
        <div class="m-climate-controls">
          <button class="m-climate-btn" data-temp="-1">−</button>
          <button class="m-climate-btn" data-temp="+1">+</button>
        </div>
        <div class="m-climate-modes">
          <button class="m-climate-mode ${st?.state==='cool'?'active':''}" data-mode="cool">Frio</button>
          <button class="m-climate-mode ${st?.state==='heat'?'active':''}" data-mode="heat">Quente</button>
          <button class="m-climate-mode ${st?.state==='auto'?'active':''}" data-mode="auto">Auto</button>
          <button class="m-climate-mode ${st?.state==='dry'?'active':''}" data-mode="dry">Seco</button>
        </div>
      </div>
    `;
    let cur = target;
    const valEl = container.querySelector('.m-climate-val-big');
    container.querySelectorAll('[data-temp]').forEach(b => {
      b.addEventListener('click', () => {
        cur += parseInt(b.getAttribute('data-temp'));
        cur = Math.max(16, Math.min(30, cur));
        valEl.innerHTML = `${cur}<small>°C</small>`;
      });
    });
    container.querySelectorAll('[data-mode]').forEach(b => {
      b.addEventListener('click', () => {
        container.querySelectorAll('[data-mode]').forEach(o => o.classList.remove('active'));
        b.classList.add('active');
      });
    });
  }

  function renderCoverControl(container, dev, st) {
    const stateText = st?.state === 'open' ? 'Aberta' : st?.state === 'closed' ? 'Fechada' : 'Parada';
    container.innerHTML = `
      <div class="m-cover-card">
        <div class="m-cover-state">${stateText}</div>
        <div class="m-cover-controls">
          <button class="m-cover-btn" data-cover="close">Fechar</button>
          <button class="m-cover-btn primary" data-cover="stop">Parar</button>
          <button class="m-cover-btn" data-cover="open">Abrir</button>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-cover]').forEach(b => {
      b.addEventListener('click', () => {
        const action = b.getAttribute('data-cover');
        const service = action === 'open' ? 'open_cover' : action === 'close' ? 'close_cover' : 'stop_cover';
        if (!MobileBoot.previewMode) {
          try { HAClient.callService('cover', service, { entity_id: entityId }); } catch {}
        }
      });
    });
  }

  function renderGenericControl(container, dev, st) {
    container.innerHTML = `
      <div class="m-generic-card">
        <div class="m-generic-state">${st?.state === 'on' ? 'Ligado' : st?.state === 'off' ? 'Desligado' : (st?.state || '—')}</div>
        <div class="m-generic-sub">${entityId}</div>
      </div>
    `;
  }

  // HSL → HEX helper
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h/30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const c = l - a * Math.max(-1, Math.min(k(n)-3, 9-k(n), 1));
      return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  }
})();
