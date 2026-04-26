// mobile-app.js — orquestra a home mobile (Fase B1)
// Conecta os módulos existentes (AuthStore, ActiveInstallation, ZoneRegistry, HAClient, StateStore)
// nos placeholders do mobile.html.

(async function () {
  'use strict';

  // ── Bootstrap auth + instalação ─────────────────────────────────────────────
  let previewMode = false;
  try { await AuthStore.init(); } catch (e) { console.warn('[mobile] auth init falhou', e); }

  let inst = null;
  if (AuthStore.isLoggedIn()) {
    inst = ActiveInstallation.ensure();
  }

  // Sem login OU sem instalação → modo preview (dados mock pra validação visual)
  if (!inst) {
    previewMode = true;
    inst = {
      id: 'preview',
      name: 'Casa Jupi',
      haUrl: '',
      zones: [
        { id: 'sala', name: 'Sala', icon: 'sofa', order: 1, devices: [
          { entity: 'light.spot_principal', name: 'Spot principal' },
          { entity: 'light.abajur', name: 'Abajur' },
          { entity: 'climate.ar_sala', name: 'Ar condicionado' },
          { entity: 'media_player.tv', name: 'TV Samsung' },
          { entity: 'cover.cortina', name: 'Cortina' },
        ]},
        { id: 'suite', name: 'Suíte', icon: 'bed', order: 2, devices: [
          { entity: 'light.suite_teto', name: 'Luz teto' },
          { entity: 'climate.ar_suite', name: 'Ar Suíte' },
        ]},
        { id: 'cozinha', name: 'Cozinha', icon: 'stove', order: 3, devices: [
          { entity: 'light.cozinha', name: 'Luz cozinha' },
        ]},
      ],
    };
    console.log('[mobile] modo preview — sem login/instalação real');
  }

  // Inicializa ZoneRegistry com config (real ou mock)
  ZoneRegistry.init(inst);

  // ── Pinta header ────────────────────────────────────────────────────────────
  const user = AuthStore.getUser?.();
  const profile = AuthStore.getProfile?.();
  const displayName = profile?.display_name || user?.email?.split('@')[0] || (previewMode ? 'Duam Rodrigues' : 'Usuário');
  const initials = (displayName || 'U').replace(/[^A-Za-z]/g,'').slice(0, 2).toUpperCase() || 'DR';
  document.getElementById('m-avatar').textContent = initials;
  document.getElementById('m-user-name').textContent = displayName;
  if (previewMode) {
    document.getElementById('m-greeting').textContent = 'Preview · sem login';
  }

  // ── Hero card: nome da instalação + meta ────────────────────────────────────
  document.getElementById('m-hero-name').textContent = inst.name || 'Casa';

  const zones = ZoneRegistry.all();
  document.getElementById('m-qa-zonas').textContent = `${zones.length} zona${zones.length === 1 ? '' : 's'}`;
  document.getElementById('m-qa-comodos-meta').textContent = `${zones.length} zona${zones.length === 1 ? '' : 's'}`;

  // ── Conexão HA ──────────────────────────────────────────────────────────────
  const haUrl = inst.haUrl || inst.ha_url;
  const haToken = ActiveInstallation.getToken();
  const statusDot = document.getElementById('m-hero-status-dot');
  const statusTxt = document.getElementById('m-hero-status');

  function setHaStatus(s) {
    statusDot.className = 'meta-dot';
    if (s === 'online') {
      statusDot.classList.add('on');
      statusTxt.textContent = 'online';
    } else if (s === 'connecting' || s === 'reconnecting') {
      statusDot.classList.add('warn');
      statusTxt.textContent = 'conectando…';
    } else {
      statusTxt.textContent = 'offline';
    }
  }

  if (previewMode) {
    // Estados mock pra preview visual (formato compatível com StateStore: array de entities)
    setHaStatus('online');
    StateStore.init([
      { entity_id: 'light.spot_principal', state: 'on'    },
      { entity_id: 'light.abajur',         state: 'on'    },
      { entity_id: 'climate.ar_sala',      state: 'cool'  },
      { entity_id: 'media_player.tv',      state: 'off'   },
      { entity_id: 'cover.cortina',        state: 'closed'},
      { entity_id: 'light.suite_teto',     state: 'on'    },
      { entity_id: 'climate.ar_suite',     state: 'auto'  },
      { entity_id: 'light.cozinha',        state: 'off'   },
    ]);
  } else if (!haUrl || !haToken) {
    setHaStatus('offline');
    document.getElementById('m-hero-meta').insertAdjacentHTML('beforeend',
      '<span style="font-size:11px;color:var(--text-3)">configure HA no setup</span>');
  } else {
    setHaStatus('connecting');
    HAClient.setConfig({ url: haUrl, token: haToken });
    HAClient.onStatusChange(setHaStatus);

    try {
      await HAClient.connect();
    } catch (e) {
      console.error('[mobile] HA connect falhou', e);
      setHaStatus('offline');
    }

    // Carrega estados iniciais e popula StateStore
    try {
      const allStates = await HAClient.send({ type: 'get_states' });
      if (Array.isArray(allStates)) {
        const watched = new Set(ZoneRegistry.allEntityIds());
        const filtered = allStates.filter(s => watched.has(s.entity_id));
        StateStore.init(filtered);
      }
    } catch (e) {
      console.warn('[mobile] não foi possível carregar estados HA:', e?.message);
    }

    // Listener pra atualizações de estado
    HAClient.onStateChanged((entityId, newState) => {
      const watched = new Set(ZoneRegistry.allEntityIds());
      if (watched.has(entityId)) {
        StateStore.update(entityId, { entity_id: entityId, state: newState.state, attributes: newState.attributes });
        renderHeroMeta();
        renderActiveRoom();
      }
    });
  }

  // ── Hero meta: contar dispositivos ligados, temperatura média se tiver ──────
  function renderHeroMeta() {
    const allDevs = [];
    for (const z of zones) {
      for (const d of (z.devices || [])) allDevs.push(d);
    }
    const total = allDevs.length;
    let on = 0;
    let temps = [];
    for (const d of allDevs) {
      const st = StateStore.get(d.entity);
      if (!st) continue;
      if (st.state === 'on') on++;
      // Temperatura: sensor com device_class temperature ou nome contendo temp
      if (d.entity.startsWith('sensor.') && /temp/i.test(d.entity)) {
        const v = parseFloat(st.state);
        if (!isNaN(v)) temps.push(v);
      }
    }
    const avgTemp = temps.length ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null;
    document.getElementById('m-hero-temp').textContent = avgTemp !== null ? `${avgTemp}°C` : '—';
    document.getElementById('m-hero-power').textContent = '—'; // requer sensor de potência específico
    document.getElementById('m-hero-humid').textContent = '—'; // requer sensor de umidade
    document.getElementById('m-hero-status').textContent = `${on}/${total} on`;
    if (total > 0 && on > 0) {
      document.getElementById('m-hero-status').style.color = 'var(--green)';
    }

    // Quick actions metas
    document.getElementById('m-qa-cameras').textContent =
      allDevs.filter(d => d.entity.startsWith('camera.')).length + ' câmera(s)';
  }

  // ── Cenas (placeholder por enquanto; Fase 05-cenas existe no app antigo) ─────
  function renderScenarios() {
    const el = document.getElementById('m-scenarios');
    // TODO Fase B: integrar com SceneStore quando disponível pra mobile
    el.innerHTML = '<div class="m-scenarios-empty">Cenas em breve</div>';
  }

  // ── Cômodo ativo: mostra dispositivos da primeira zona com dispositivos ─────
  let activeZoneId = zones[0]?.id || null;

  function renderActiveRoom() {
    const titleEl = document.getElementById('m-active-room-title');
    const listEl = document.getElementById('m-dev-list');

    if (!activeZoneId) {
      titleEl.textContent = 'Nenhum cômodo';
      listEl.innerHTML = '<div class="m-dev-empty">Crie uma zona no app</div>';
      return;
    }

    const zone = ZoneRegistry.get(activeZoneId);
    if (!zone) { listEl.innerHTML = ''; return; }

    titleEl.textContent = `${zone.name} — agora`;

    if (!zone.devices || !zone.devices.length) {
      listEl.innerHTML = '<div class="m-dev-empty">Sem dispositivos nesta zona</div>';
      return;
    }

    listEl.innerHTML = zone.devices.map(dev => {
      const st = StateStore.get(dev.entity);
      const isOn = st?.state === 'on';
      const domain = dev.entity.split('.')[0];
      const icon = iconForDomain(domain);
      const meta = formatMeta(dev, st);
      return `
        <div class="m-dev-card" data-on="${isOn}" data-entity="${escapeHtml(dev.entity)}">
          <div class="m-dev-icon">${icon}</div>
          <div class="m-dev-info">
            <div class="m-dev-name">${escapeHtml(dev.name || dev.entity)}</div>
            <div class="m-dev-meta">${meta}</div>
          </div>
          <button class="m-toggle" aria-pressed="${isOn}" data-toggle-entity="${escapeHtml(dev.entity)}"></button>
        </div>
      `;
    }).join('');
  }

  function iconForDomain(domain) {
    const icons = {
      light:    '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.7c-.6.5-1 1.3-1 2.1V18H9v-1.2c0-.8-.4-1.6-1-2.1A7 7 0 0 1 12 2z"/></svg>',
      switch:   '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5"/></svg>',
      climate:  '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41"/></svg>',
      cover:    '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path stroke-linecap="round" d="M3 9h18M3 15h18"/></svg>',
      camera:   '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></svg>',
      sensor:   '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 2v8M8 12h8"/></svg>',
      media_player: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="14" rx="2"/></svg>',
    };
    return icons[domain] || icons.switch;
  }

  function formatMeta(dev, st) {
    if (!st) return '<span style="opacity:.5">desconectado</span>';
    const domain = dev.entity.split('.')[0];
    if (domain === 'light' || domain === 'switch') return st.state === 'on' ? 'ligado' : 'desligado';
    if (domain === 'climate') return st.state === 'off' ? 'desligado' : escapeHtml(st.state);
    if (domain === 'sensor') return `<b>${escapeHtml(st.state)}</b>${dev.unit || ''}`;
    if (domain === 'cover') return st.state === 'open' ? 'aberta' : st.state === 'closed' ? 'fechada' : escapeHtml(st.state);
    return escapeHtml(st.state);
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }

  // ── Toggle handler ──────────────────────────────────────────────────────────
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-entity]');
    if (!btn) return;
    const entity = btn.getAttribute('data-toggle-entity');
    const domain = entity.split('.')[0];
    const isOn = btn.getAttribute('aria-pressed') === 'true';
    // Optimistic UI
    btn.setAttribute('aria-pressed', String(!isOn));
    const card = btn.closest('.m-dev-card');
    if (card) card.setAttribute('data-on', String(!isOn));
    // Chama serviço HA
    try {
      HAClient.callService(domain, 'toggle', { entity_id: entity });
    } catch (err) {
      console.warn('[mobile] toggle falhou', err);
      // Reverte UI
      btn.setAttribute('aria-pressed', String(isOn));
      if (card) card.setAttribute('data-on', String(isOn));
    }
  });

  // ── Tab bar routing (placeholder — outras telas vêm em fases B2/B3/B4) ──────
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.getAttribute('data-route');
      if (route === 'home') return;
      if (route === 'energia') {
        // TODO Fase B4: mobile-energy.html
        alert('Energia mobile — em construção (Fase B4)');
      } else if (route === 'setup') {
        window.location.href = 'index.html';
      } else if (route === 'agenda' || route === 'add') {
        alert('Em construção');
      }
    });
  });

  // ── Quick actions ───────────────────────────────────────────────────────────
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'energia') alert('Energia mobile — em construção (Fase B4)');
      else if (action === 'comodos') {
        const z = ZoneRegistry.all()[0];
        window.location.href = z ? `mobile-room.html?zone=${encodeURIComponent(z.id)}` : 'mobile-room.html';
      }
      else if (action === 'cameras') alert('Câmeras — em construção');
      else if (action === 'home') {} // já está
      else if (action === 'cenas') alert('Cenas mobile — em construção');
      else if (action === 'trocar-comodo') {
        const next = pickNextZone();
        if (next) {
          activeZoneId = next.id;
          renderActiveRoom();
        }
      }
    });
  });

  function pickNextZone() {
    const list = ZoneRegistry.all();
    if (!list.length) return null;
    const idx = list.findIndex(z => z.id === activeZoneId);
    return list[(idx + 1) % list.length];
  }

  // ── Render inicial ──────────────────────────────────────────────────────────
  renderHeroMeta();
  renderScenarios();
  renderActiveRoom();

  // Subscribe pra mudanças globais
  StateStore.subscribeAll(() => {
    renderHeroMeta();
    renderActiveRoom();
  });

  console.log('[mobile] home pronta — instalação:', inst.name, 'zonas:', zones.length);
})();
