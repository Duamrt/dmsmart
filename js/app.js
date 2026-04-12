// app.js
// Bootstrap principal do dmsmart
// Inicializa todos os módulos na ordem correta

async function initApp() {
  try {
    await ConfigLoader.load();
    const config = ConfigLoader.get();

    ZoneRegistry.init(config);

    const zonesGrid = document.querySelector('.zones-grid');
    UIRenderer.init(zonesGrid);

    initClock();
    initConnectionIndicator();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[dmsmart] SW registrado:', reg.scope))
        .catch(err => console.warn('[dmsmart] SW falhou:', err));
    }

    await connectToHA(config);

    console.log(`[dmsmart] ${config.installation.name} iniciado`);
  } catch (err) {
    console.error('[dmsmart] Falha na inicialização:', err);
  }
}

async function connectToHA(config) {
  const haCfg = config.homeAssistant;
  if (!haCfg) {
    console.warn('[dmsmart] homeAssistant ausente no config.json — modo mock');
    StateStore.initMock();
    return;
  }

  const tokenKey = haCfg.tokenKey || 'dmsmart_ha_token';

  const watched = new Set(ZoneRegistry.allEntityIds());
  HAClient.onStateChanged((entityId, newState) => {
    if (!watched.has(entityId)) return;
    StateStore.update(entityId, newState);
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    let token = (localStorage.getItem(tokenKey) || '').trim();
    if (!token) {
      const input = prompt('Cole o token de longa duração do Home Assistant:');
      if (!input) {
        console.warn('[dmsmart] Sem token — modo mock');
        StateStore.initMock();
        return;
      }
      token = input.trim();
      localStorage.setItem(tokenKey, token);
    }

    HAClient.setConfig({ url: haCfg.url, token });

    try {
      await HAClient.connect();
      console.log('[dmsmart] Conectado ao HA');
      return;
    } catch (err) {
      console.error('[dmsmart] Falha ao conectar no HA:', err);
      if (String(err.message).includes('auth_invalid')) {
        localStorage.removeItem(tokenKey);
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
