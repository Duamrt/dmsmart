// app.js
// Bootstrap principal do dmsmart
// - Se não há instalação ativa, abre o Wizard
// - Se há, inicializa zonas, clock, status e conecta no HA
// - Controla sidebar (recolher/expandir + mobile overlay)

const SIDEBAR_KEY = 'dmsmart_sidebar_collapsed';

async function initApp() {
  try {
    initSidebar();
    initClock();

    await ConfigLoader.load();
    const seedConfig = ConfigLoader.get();

    if (InstallationStore.isEmpty() && seedConfig && seedConfig.zones) {
      InstallationStore.seedFromConfig(seedConfig);
    }

    Wizard.init(document.getElementById('wiz'));

    const active = ActiveInstallation.ensure();
    if (!active) {
      renderEmptyDashboard();
      Wizard.open();
      return;
    }

    updateSidebarInstallation(active);
    ZoneRegistry.init({ zones: active.zones });

    const zonesGrid = document.querySelector('.zones-grid');
    UIRenderer.init(zonesGrid);

    initConnectionIndicator();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[dmsmart] SW registrado:', reg.scope))
        .catch(err => console.warn('[dmsmart] SW falhou:', err));
    }

    await connectToHA(active);

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

function updateSidebarInstallation(installation) {
  const el = document.getElementById('sidebar-install-name');
  if (el) el.textContent = installation && installation.name ? installation.name : '—';
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

  const watched = new Set(ZoneRegistry.allEntityIds());
  HAClient.onStateChanged((entityId, newState) => {
    if (!watched.has(entityId)) return;
    StateStore.update(entityId, newState);
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

function initConnectionIndicator() {
  const dot = document.querySelector('.connection-dot');
  const label = document.querySelector('.connection-label');
  if (!dot) return;
  HAClient.onStatusChange((status) => {
    dot.setAttribute('data-status', status);
    const txt = {
      connecting: 'Conectando',
      online: 'Conectado',
      reconnecting: 'Reconectando',
      offline: 'Offline',
      auth_invalid: 'Token inválido'
    }[status] || status;
    dot.title = txt;
    if (label) label.textContent = txt;
  });
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
