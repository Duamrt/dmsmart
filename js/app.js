// app.js
// Bootstrap principal do dmsmart
// Inicializa todos os módulos na ordem correta

async function initApp() {
  try {
    // 1. Carregar configuração da instalação
    await ConfigLoader.load();
    const config = ConfigLoader.get();

    // 2. Inicializar Zone Registry com a config
    ZoneRegistry.init(config);

    // 3. Inicializar State Store com dados mock (Fase 1)
    // Fase 2: remover initMock(), chamar HAConnection.connect() + StateStore.init(states)
    StateStore.initMock();

    // 4. Inicializar UI Renderer no container de zonas
    const zonesGrid = document.querySelector('.zones-grid');
    UIRenderer.init(zonesGrid);

    // 5. Inicializar relógio
    initClock();

    // 6. Registrar Service Worker (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[dmsmart] SW registrado:', reg.scope))
        .catch(err => console.warn('[dmsmart] SW falhou:', err));
    }

    console.log(`[dmsmart] ${config.installation.name} iniciado`);
  } catch (err) {
    console.error('[dmsmart] Falha na inicialização:', err);
  }
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
