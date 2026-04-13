// app.js
// Bootstrap principal do dmsmart
// - Se não há instalação ativa, abre o Wizard
// - Se há, inicializa zonas, clock, status e conecta no HA
// - Controla sidebar, seletor de instalação no header e modal de gerenciar

const SIDEBAR_KEY    = 'dmsmart_sidebar_collapsed';
const NAV_VIEW_KEY   = 'dmsmart_nav_view';

let _navView   = 'dashboard';
let _navFilter = 'all';

async function initApp() {
  try {
    initSidebar();
    initNav();
    initClock();
    initInstallationSelector();
    if (typeof ControlModal !== 'undefined') ControlModal.init();
    if (typeof ZoneModal !== 'undefined') ZoneModal.init();
    if (typeof ZoneEditor !== 'undefined') ZoneEditor.init();

    await ConfigLoader.load();
    const seedConfig = ConfigLoader.get();

    if (InstallationStore.isEmpty() && seedConfig && seedConfig.zones) {
      InstallationStore.seedFromConfig(seedConfig);
    }

    Wizard.init(document.getElementById('wiz'));

    const active = ActiveInstallation.ensure();
    if (!active) {
      renderEmptyDashboard();
      updateHeaderInstallation(null);
      Wizard.open();
      return;
    }

    updateHeaderInstallation(active);
    ZoneRegistry.init({ zones: active.zones });

    const zonesGrid = document.querySelector('.zones-grid');
    UIRenderer.init(zonesGrid);

    initHero(active);
    initConnectionIndicator();
    if (typeof ScenesPanel !== 'undefined') ScenesPanel.init(document.getElementById('scenes-section'));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[dmsmart] SW registrado:', reg.scope))
        .catch(err => console.warn('[dmsmart] SW falhou:', err));
    }

    await connectToHA(active);
    if (typeof ScenesPanel !== 'undefined') ScenesPanel.load();

    console.log(`[dmsmart] ${active.name} iniciado`);
  } catch (err) {
    console.error('[dmsmart] Falha na inicialização:', err);
  }
}

function initSidebar() {
  const shell = document.getElementById('app-shell');
  const toggle = document.getElementById('sidebar-toggle');
  const menuBtn = document.getElementById('header-menu');
  if (!shell) return;

  if (localStorage.getItem(SIDEBAR_KEY) === '1') {
    shell.classList.add('sidebar-collapsed');
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      if (isMobile) {
        shell.classList.toggle('sidebar-open');
        return;
      }
      const collapsed = shell.classList.toggle('sidebar-collapsed');
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
    });
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      shell.classList.toggle('sidebar-open');
    });
  }

  document.querySelectorAll('[data-action="new-installation"]').forEach(el => {
    el.addEventListener('click', () => {
      shell.classList.remove('sidebar-open');
      Wizard.init(document.getElementById('wiz'));
      Wizard.open({ skipWelcome: true });
    });
  });
}

function initNav() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.getAttribute('data-nav'));
      // fecha sidebar no mobile
      const shell = document.getElementById('app-shell');
      if (shell && window.matchMedia('(max-width: 900px)').matches) {
        shell.classList.remove('sidebar-open');
      }
    });
  });

  // Restaura última view
  const saved = sessionStorage.getItem(NAV_VIEW_KEY);
  if (saved && saved !== 'dashboard') switchView(saved);
}

function switchView(view) {
  _navView   = view;
  _navFilter = 'all';
  sessionStorage.setItem(NAV_VIEW_KEY, view);

  // Atualiza active no sidebar
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-nav') === view);
  });

  // Aplica view ao app-main via data-view (CSS controla visibilidade das seções)
  const main = document.querySelector('.app-main');
  if (main) main.setAttribute('data-view', view);

  // Atualiza título do header
  const titles = {
    dashboard: ['Dashboard',  'Controle rápido das suas zonas'],
    ambientes: ['Ambientes',  'Filtre e controle seus cômodos'],
    cenas:     ['Cenas',      'Automações e atalhos']
  };
  const [title, sub] = titles[view] || titles.dashboard;
  const titleEl = document.getElementById('header-title');
  const subEl   = document.getElementById('header-sub');
  if (titleEl) titleEl.textContent = title;
  if (subEl)   subEl.textContent   = sub;

  // Render filter bar se ambientes
  const filterBar = document.getElementById('zones-filter-bar');
  if (filterBar) {
    if (view === 'ambientes') {
      _renderFilterBar(filterBar);
    } else {
      filterBar.innerHTML = '';
      _applyZoneFilter('all');
    }
  }

  // Força cenas visíveis se view=cenas (ScenesPanel pode ter mantido hidden)
  if (view === 'cenas') {
    const scenesSection = document.getElementById('scenes-section');
    if (scenesSection) scenesSection.classList.remove('hidden');
  }
}

function _renderFilterBar(bar) {
  const TYPE_META = {
    light:               { label: 'Luzes',      icon: '<svg viewBox="0 0 24 24"><path d="M9 17h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 4 10.5c-.7.6-1 1.3-1 2V16H9v-.5c0-.7-.3-1.4-1-2A6 6 0 0 1 12 3z"/></svg>' },
    switch:              { label: 'Tomadas',    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16v.01"/></svg>' },
    climate:             { label: 'Clima',      icon: '<svg viewBox="0 0 24 24"><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66 4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66 4.24-4.24"/></svg>' },
    cover:               { label: 'Cortinas',   icon: '<svg viewBox="0 0 24 24"><path d="M3 4h18M3 20h18M12 4v16M6 4v4M18 4v4"/></svg>' },
    media_player:        { label: 'Mídia',      icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M3 14h18M9 21h6M12 17v4"/></svg>' },
    fan:                 { label: 'Ventiladores', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M12 4a4 4 0 0 1 4 4c0 2.5-2 3-4 4s-4 1.5-4 4a4 4 0 0 1 4-4c2.5 0 3 2 4 4s1.5 4 4 4a4 4 0 0 1-4-4c0-2.5 2-3 4-4s4-1.5 4-4a4 4 0 0 1-4 4c-2.5 0-3-2-4-4S9.5 4 8 4a4 4 0 0 1 4 0z"/></svg>' },
    camera:              { label: 'Câmeras',    icon: '<svg viewBox="0 0 24 24"><path d="M23 7 16 12l7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>' },
    alarm_control_panel: { label: 'Segurança',  icon: '<svg viewBox="0 0 24 24"><path d="M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z"/></svg>' },
    valve:               { label: 'Irrigação',  icon: '<svg viewBox="0 0 24 24"><path d="M12 20a6 6 0 0 0 6-6c0-4-6-12-6-12S6 10 6 14a6 6 0 0 0 6 6z"/></svg>' },
    sensor:              { label: 'Solar',      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>' }
  };

  // Detecta tipos presentes nas zonas atuais
  const present = new Set();
  for (const zone of ZoneRegistry.all()) {
    for (const d of zone.devices) {
      if (TYPE_META[d.type]) present.add(d.type);
    }
    // Zona com ícone solar agrupa em sensor
    if (zone.icon === 'solar') present.add('sensor');
  }

  const filters = ['all', ...Object.keys(TYPE_META).filter(t => present.has(t))];
  const labels  = { all: 'Todos', ...Object.fromEntries(Object.entries(TYPE_META).map(([k,v])=>[k,v.label])) };
  const icons   = { all: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>', ...Object.fromEntries(Object.entries(TYPE_META).map(([k,v])=>[k,v.icon])) };

  bar.innerHTML = `<div class="filter-pills">${
    filters.map(f => `
      <button type="button" class="filter-pill${_navFilter === f ? ' active' : ''}" data-filter="${f}">
        <span class="filter-pill-icon">${icons[f] || ''}</span>
        <span>${labels[f] || f}</span>
      </button>
    `).join('')
  }</div>`;

  bar.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      _navFilter = btn.getAttribute('data-filter');
      bar.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === btn));
      _applyZoneFilter(_navFilter);
    });
  });

  _applyZoneFilter('all');
}

function _applyZoneFilter(filter) {
  const grid = document.querySelector('.zones-grid');
  if (!grid) return;
  grid.querySelectorAll('.zone-card:not(.zone-card-new)').forEach(card => {
    if (filter === 'all') { card.style.display = ''; return; }
    const zoneId = card.id.replace('zone-', '');
    const zone = ZoneRegistry.get(zoneId);
    if (!zone) { card.style.display = 'none'; return; }
    let match = false;
    if (filter === 'sensor') {
      match = zone.icon === 'solar' || zone.devices.some(d => d.type === 'sensor');
    } else {
      match = zone.devices.some(d => d.type === filter);
    }
    card.style.display = match ? '' : 'none';
  });
}

function updateHeaderInstallation(installation) {
  const sidebarEl = document.getElementById('sidebar-install-name');
  const pillName = document.getElementById('install-pill-name');
  const pill = document.getElementById('install-pill');
  const wrap = document.getElementById('header-install-wrap');

  const label = installation && installation.name ? installation.name : '—';
  if (sidebarEl) sidebarEl.textContent = label;
  if (pillName) pillName.textContent = label;

  if (wrap) {
    wrap.classList.toggle('hidden', !installation);
  }
  if (pill) {
    pill.setAttribute('title', installation && installation.haUrl ? installation.haUrl : label);
  }
}

function initInstallationSelector() {
  const pill = document.getElementById('install-pill');
  const dropdown = document.getElementById('install-dropdown');
  if (!pill || !dropdown) return;

  const closeDropdown = () => {
    dropdown.classList.add('hidden');
    pill.classList.remove('open');
  };

  const openDropdown = () => {
    renderInstallationDropdown(dropdown);
    dropdown.classList.remove('hidden');
    pill.classList.add('open');
  };

  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains('hidden')) openDropdown();
    else closeDropdown();
  });

  document.addEventListener('click', (e) => {
    if (dropdown.classList.contains('hidden')) return;
    if (dropdown.contains(e.target) || pill.contains(e.target)) return;
    closeDropdown();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });

  dropdown.addEventListener('click', (e) => {
    const target = e.target.closest('[data-install-action]');
    if (!target) return;
    e.stopPropagation();
    const action = target.getAttribute('data-install-action');
    if (action === 'switch') {
      const id = target.getAttribute('data-id');
      switchInstallation(id);
    } else if (action === 'new') {
      closeDropdown();
      Wizard.open({ skipWelcome: true });
    } else if (action === 'manage') {
      closeDropdown();
      openManageModal();
    }
  });
}

function renderInstallationDropdown(el) {
  const installations = InstallationStore.all();
  const activeId = ActiveInstallation.getId();

  const itemsHtml = installations.map(inst => {
    const isActive = inst.id === activeId;
    const zoneCount = Array.isArray(inst.zones) ? inst.zones.length : 0;
    const sub = inst.haUrl ? _shortUrl(inst.haUrl) : `${zoneCount} zona${zoneCount === 1 ? '' : 's'}`;
    return `
      <button type="button" class="install-item ${isActive ? 'active' : ''}" data-install-action="switch" data-id="${_esc(inst.id)}">
        <span class="install-item-icon">
          <svg viewBox="0 0 24 24"><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/></svg>
        </span>
        <span class="install-item-body">
          <span class="install-item-name">${_esc(inst.name)}</span>
          <span class="install-item-sub">${_esc(sub)}</span>
        </span>
        ${isActive ? '<span class="install-item-check"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg></span>' : ''}
      </button>
    `;
  }).join('');

  el.innerHTML = `
    <div class="install-dropdown-section">Instalações</div>
    ${itemsHtml || '<div class="modal-empty" style="padding: 16px;">Nenhuma instalação</div>'}
    <div class="install-dropdown-divider"></div>
    <button type="button" class="install-action" data-install-action="new">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
      Adicionar instalação
    </button>
    <button type="button" class="install-action" data-install-action="manage">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
      Gerenciar instalações
    </button>
  `;
}

function switchInstallation(id) {
  if (!id || id === ActiveInstallation.getId()) {
    document.getElementById('install-dropdown').classList.add('hidden');
    document.getElementById('install-pill').classList.remove('open');
    return;
  }
  const target = InstallationStore.get(id);
  if (!target) return;
  ActiveInstallation.setId(id);
  window.location.reload();
}

/* =========================================
   Manage modal
   ========================================= */

const ManageModal = {
  state: { editingId: null, confirmRemoveId: null },

  open() {
    this.state = { editingId: null, confirmRemoveId: null };
    this.render();
    const overlay = document.getElementById('manage-modal');
    if (overlay) overlay.classList.remove('hidden');
  },

  close() {
    const overlay = document.getElementById('manage-modal');
    if (overlay) overlay.classList.add('hidden');
    this.state = { editingId: null, confirmRemoveId: null };
  },

  render() {
    const overlay = document.getElementById('manage-modal');
    if (!overlay) return;
    const installations = InstallationStore.all();
    const activeId = ActiveInstallation.getId();

    const rowsHtml = installations.length === 0
      ? '<div class="modal-empty">Nenhuma instalação cadastrada ainda.</div>'
      : installations.map(inst => this._renderRow(inst, inst.id === activeId)).join('');

    overlay.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div class="modal-title">Gerenciar instalações</div>
          <button type="button" class="modal-close" data-manage="close" aria-label="Fechar">×</button>
        </div>
        <div class="modal-body">
          ${rowsHtml}
        </div>
      </div>
    `;

    this._bind();
  },

  _renderRow(inst, isActive) {
    const isEditing = this.state.editingId === inst.id;
    const showConfirm = this.state.confirmRemoveId === inst.id;
    const zoneCount = Array.isArray(inst.zones) ? inst.zones.length : 0;

    if (showConfirm) {
      return `
        <div class="manage-confirm" data-id="${_esc(inst.id)}">
          <div class="manage-confirm-title">Remover "${_esc(inst.name)}"?</div>
          <div>Isso apaga zonas, token HA e config local. Não dá pra desfazer.</div>
          <div class="manage-confirm-actions">
            <button type="button" class="btn-ghost" data-manage="cancel-remove">Cancelar</button>
            <button type="button" class="btn-danger" data-manage="confirm-remove" data-id="${_esc(inst.id)}">Remover</button>
          </div>
        </div>
      `;
    }

    if (isEditing) {
      return `
        <div class="manage-row ${isActive ? 'active' : ''}" data-id="${_esc(inst.id)}">
          <div class="manage-edit-wrap">
            <input type="text" class="manage-edit-input" id="manage-edit-input-${_esc(inst.id)}" value="${_esc(inst.name)}" maxlength="60" />
          </div>
          <div class="manage-row-actions">
            <button type="button" class="manage-icon-btn" data-manage="save-name" data-id="${_esc(inst.id)}" title="Salvar">
              <svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>
            </button>
            <button type="button" class="manage-icon-btn" data-manage="cancel-edit" title="Cancelar">
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6l-12 12"/></svg>
            </button>
          </div>
        </div>
      `;
    }

    const sub = inst.haUrl ? _shortUrl(inst.haUrl) : 'Sem URL';
    return `
      <div class="manage-row ${isActive ? 'active' : ''}" data-id="${_esc(inst.id)}">
        <div class="manage-row-body">
          <div class="manage-row-name">${_esc(inst.name)}</div>
          <div class="manage-row-sub">${_esc(sub)} · ${zoneCount} zona${zoneCount === 1 ? '' : 's'}</div>
          ${isActive ? '<span class="manage-row-badge">Ativa</span>' : ''}
        </div>
        <div class="manage-row-actions">
          <button type="button" class="manage-icon-btn" data-manage="edit" data-id="${_esc(inst.id)}" title="Renomear">
            <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          </button>
          <button type="button" class="manage-icon-btn danger" data-manage="remove" data-id="${_esc(inst.id)}" title="Remover">
            <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </div>
    `;
  },

  _bind() {
    const overlay = document.getElementById('manage-modal');
    if (!overlay || overlay._bound) {
      // re-bind per render OK; we dispatch via delegation but overlay is replaced on every open, so one listener per render is fine
    }
    overlay.onclick = (e) => {
      if (e.target === overlay) { this.close(); return; }
      const btn = e.target.closest('[data-manage]');
      if (!btn) return;
      const action = btn.getAttribute('data-manage');
      const id = btn.getAttribute('data-id');
      this._handle(action, id);
    };

    overlay.onkeydown = (e) => {
      if (e.key === 'Escape') this.close();
      if (e.key === 'Enter' && this.state.editingId) {
        e.preventDefault();
        this._handle('save-name', this.state.editingId);
      }
    };
  },

  _handle(action, id) {
    switch (action) {
      case 'close':
        this.close();
        break;
      case 'edit':
        this.state.editingId = id;
        this.state.confirmRemoveId = null;
        this.render();
        setTimeout(() => {
          const input = document.getElementById(`manage-edit-input-${id}`);
          if (input) { input.focus(); input.select(); }
        }, 0);
        break;
      case 'cancel-edit':
        this.state.editingId = null;
        this.render();
        break;
      case 'save-name': {
        const input = document.getElementById(`manage-edit-input-${id}`);
        if (!input) return;
        const newName = input.value.trim();
        if (!newName) return;
        InstallationStore.update(id, { name: newName });
        this.state.editingId = null;
        this.render();
        if (id === ActiveInstallation.getId()) {
          updateHeaderInstallation(InstallationStore.get(id));
        }
        break;
      }
      case 'remove':
        this.state.confirmRemoveId = id;
        this.state.editingId = null;
        this.render();
        break;
      case 'cancel-remove':
        this.state.confirmRemoveId = null;
        this.render();
        break;
      case 'confirm-remove':
        this._remove(id);
        break;
    }
  },

  _remove(id) {
    const wasActive = id === ActiveInstallation.getId();
    InstallationStore.remove(id);

    if (wasActive) {
      const remaining = InstallationStore.all();
      if (remaining.length > 0) {
        ActiveInstallation.setId(remaining[0].id);
      } else {
        ActiveInstallation.clear();
      }
      this.close();
      window.location.reload();
      return;
    }

    this.state.confirmRemoveId = null;
    this.render();
  }
};

function openManageModal() {
  ManageModal.open();
}

function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _shortUrl(url) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url.length > 42 ? url.slice(0, 40) + '…' : url;
  }
}

function renderEmptyDashboard() {
  const grid = document.querySelector('.zones-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="zones-empty" style="grid-column: 1 / -1;">
      <div class="zones-empty-title">Nenhuma instalação ainda</div>
      <div class="zones-empty-sub">
        Conecte seu Home Assistant pelo wizard pra começar a controlar suas zonas.
      </div>
    </div>
  `;
}

async function connectToHA(installation) {
  if (!installation || !installation.haUrl) {
    console.warn('[dmsmart] Instalação sem haUrl — modo mock');
    StateStore.initMock();
    return;
  }

  HAClient.onStateChanged((entityId, newState) => {
    // Dinâmico: quando zonas são adicionadas depois do boot, novas entidades
    // passam a ser observadas automaticamente.
    const watched = new Set(ZoneRegistry.allEntityIds());
    if (!watched.has(entityId)) return;
    StateStore.update(entityId, newState);
  });

  // Quando o usuário cria/edita zonas, seeda o StateStore a partir do cache
  // de get_states do HAClient, pros novos devices aparecerem com estado real.
  ZoneRegistry.onChange(() => {
    if (typeof HAClient === 'undefined' || !HAClient.getAllStates) return;
    const allStates = HAClient.getAllStates();
    if (!Array.isArray(allStates) || allStates.length === 0) return;
    const byId = new Map(allStates.map(s => [s.entity_id, s]));
    for (const entityId of ZoneRegistry.allEntityIds()) {
      if (!StateStore.get(entityId) && byId.has(entityId)) {
        StateStore.update(entityId, byId.get(entityId));
      }
    }
  });

  const token = InstallationStore.getToken(installation.id);
  if (!token) {
    console.warn('[dmsmart] Sem token — modo mock');
    StateStore.initMock();
    return;
  }

  HAClient.setConfig({ url: installation.haUrl, token });

  try {
    await HAClient.connect();
    console.log('[dmsmart] Conectado ao HA');
  } catch (err) {
    console.error('[dmsmart] Falha ao conectar no HA:', err);
    StateStore.initMock();
  }
}

function initHero(installation) {
  const eyebrow = document.getElementById('hero-eyebrow');
  const title = document.getElementById('hero-title');
  const sub = document.getElementById('hero-sub');
  if (!eyebrow || !title || !sub) return;

  const h = new Date().getHours();
  let greet;
  if (h < 5) greet = 'Boa madrugada';
  else if (h < 12) greet = 'Bom dia';
  else if (h < 18) greet = 'Boa tarde';
  else greet = 'Boa noite';

  eyebrow.textContent = greet;
  title.textContent = installation.name || 'Instalação';

  const updateSubtitle = () => {
    const zones = ZoneRegistry.all();
    const zoneCount = zones.length;
    const deviceCount = zones.reduce((sum, z) => sum + ((z.devices || []).length), 0);
    sub.textContent = `${zoneCount} zona${zoneCount === 1 ? '' : 's'} · ${deviceCount} dispositivo${deviceCount === 1 ? '' : 's'}`;
  };
  updateSubtitle();

  const statDevicesOn = document.getElementById('stat-devices-on');
  const statZonesActive = document.getElementById('stat-zones-active');

  const recompute = () => {
    const zones = ZoneRegistry.all();
    let devicesOn = 0;
    let zonesActive = 0;
    for (const zone of zones) {
      let zoneHasOn = false;
      for (const device of zone.devices) {
        const st = StateStore.get(device.entity);
        if (st && st.state === 'on') {
          devicesOn++;
          zoneHasOn = true;
        }
      }
      if (zoneHasOn) zonesActive++;
    }
    if (statDevicesOn) statDevicesOn.textContent = String(devicesOn);
    if (statZonesActive) {
      statZonesActive.innerHTML = `${zonesActive} <span class="hero-stat-total">/ ${zones.length}</span>`;
    }
  };

  recompute();
  StateStore.subscribeAll(recompute);
  if (typeof ZoneRegistry.onChange === 'function') {
    ZoneRegistry.onChange(() => { updateSubtitle(); recompute(); });
  }
}

function initConnectionIndicator() {
  const dot = document.querySelector('.connection-dot');
  const label = document.querySelector('.connection-label');
  if (!dot) return;

  let reconnectToast = null;
  let reconnectCount = 0;
  let prevStatus = null;

  HAClient.onStatusChange((status) => {
    dot.setAttribute('data-status', status);
    const txt = {
      connecting:   'Conectando',
      online:       'Conectado',
      reconnecting: 'Reconectando',
      offline:      'Offline',
      auth_invalid: 'Token inválido'
    }[status] || status;
    dot.title = txt;
    if (label) label.textContent = txt;

    // Toast de reconexão
    if (status === 'reconnecting') {
      reconnectCount++;
      if (!reconnectToast) {
        reconnectToast = document.createElement('div');
        reconnectToast.className = 'ha-reconnect-toast';
        document.body.appendChild(reconnectToast);
        // força reflow pra transição funcionar
        reconnectToast.getBoundingClientRect();
        reconnectToast.classList.add('visible');
      }
      reconnectToast.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>
        <span>Reconectando ao HA${reconnectCount > 1 ? ` (tentativa ${reconnectCount})` : '…'}</span>
      `;
    }

    if (status === 'online' && prevStatus === 'reconnecting') {
      reconnectCount = 0;
      if (reconnectToast) {
        reconnectToast.classList.remove('visible');
        const t = reconnectToast;
        reconnectToast = null;
        setTimeout(() => t.remove(), 400);
      }
      // flash de "reconectado"
      _showToast('HA reconectado', 'success', 2000);
    }

    if (status === 'offline' || status === 'auth_invalid') {
      reconnectCount = 0;
      if (reconnectToast) {
        reconnectToast.classList.remove('visible');
        const t = reconnectToast;
        reconnectToast = null;
        setTimeout(() => t.remove(), 400);
      }
    }

    prevStatus = status;
  });
}

function _showToast(msg, type = 'default', duration = 2800) {
  const toast = document.createElement('div');
  toast.className = `app-toast app-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  toast.getBoundingClientRect();
  toast.classList.add('visible');
  setTimeout(() => { toast.classList.remove('visible'); }, duration);
  setTimeout(() => { toast.remove(); }, duration + 400);
}

function initClock() {
  const clockEl = document.querySelector('.clock');
  const dateEl = document.querySelector('.date');
  if (!clockEl || !dateEl) return;

  function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    dateEl.textContent = now.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  }

  updateClock();
  setInterval(updateClock, 1000);
}

document.addEventListener('DOMContentLoaded', initApp);

document.addEventListener('dmsmart:installation-created', async (e) => {
  const id = e.detail && e.detail.id;
  const active = id ? InstallationStore.get(id) : ActiveInstallation.get();
  if (!active) { window.location.reload(); return; }

  // Atualiza header e dropdown
  updateHeaderInstallation(active);
  const dropdown = document.getElementById('install-dropdown');
  if (dropdown) renderInstallationDropdown(dropdown);

  // Reinicializa zonas e UI
  ZoneRegistry.init({ zones: active.zones });
  const zonesGrid = document.querySelector('.zones-grid');
  if (zonesGrid) UIRenderer.init(zonesGrid);
  initHero(active);

  // Reconecta HA
  if (typeof HAClient !== 'undefined' && typeof HAClient.disconnect === 'function') {
    try { HAClient.disconnect(); } catch (_) {}
  }
  await connectToHA(active);
  if (typeof ScenesPanel !== 'undefined') ScenesPanel.load();

  _showToast(`✓ ${active.name} adicionada`);

  console.log(`[dmsmart] Instalação adicionada: ${active.name}`);
});
