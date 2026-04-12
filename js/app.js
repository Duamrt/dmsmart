// app.js
// Bootstrap principal do dmsmart
// Inicializa todos os módulos na ordem correta

async function initApp() {
  try {
    await ConfigLoader.load();
    const seedConfig = ConfigLoader.get();

    if (InstallationStore.isEmpty()) {
      InstallationStore.seedFromConfig(seedConfig);
    }

    const active = ActiveInstallation.ensure();
    if (!active) {
      console.warn('[dmsmart] Nenhuma instalação — wizard ainda não implementado (Phase 03-02)');
      return;
    }

    ZoneRegistry.init({ zones: active.zones });

    const zonesGrid = document.querySelector('.zones-grid');
    UIRenderer.init(zonesGrid);

    initClock();
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

  for (let attempt = 0; attempt < 3; attempt++) {
    let token = InstallationStore.getToken(installation.id);
    if (!token) {
      const input = prompt('Cole o token de longa duração do Home Assistant:');
      if (!input) {
        console.warn('[dmsmart] Sem token — modo mock');
        StateStore.initMock();
        return;
      }
      token = input.trim();
      InstallationStore.setToken(installation.id, token);
    }

    HAClient.setConfig({ url: installation.haUrl, token });

    try {
      await HAClient.connect();
      console.log('[dmsmart] Conectado ao HA');
      return;
    } catch (err) {
      console.error('[dmsmart] Falha ao conectar no HA:', err);
      if (String(err.message).includes('auth_invalid')) {
        InstallationStore.setToken(installation.id, '');
        alert('Token inválido. Cole um novo token.');
        continue;
      }
      return;
    }
  }
}

function initConnectionIndicator() {
  const dot = document.querySelector('.connection-dot');
  if (!dot) return;
  HAClient.onStatusChange((status) => {
    dot.setAttribute('data-status', status);
    dot.title = {
      connecting: 'Conectando...',
      online: 'Conectado ao HA',
      reconnecting: 'Reconectando...',
      offline: 'Desconectado',
      auth_invalid: 'Token inválido'
    }[status] || status;
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
