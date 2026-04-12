# Phase 01: Shell do Dashboard — Plano de Execução

**Fase:** 01-shell-do-dashboard
**Objetivo:** Dashboard visual completo das 12 zonas funcionando como PWA, com dados mock, pronto para receber dados reais na Fase 2.
**Requisitos cobertos:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08
**Depende de:** Nada (roda em paralelo com Fase 0)

---

## Decisão Arquitetural Crítica: Zonas Configuráveis

dmsmart NÃO é só para a casa do Duam. É um produto que a EDR Engenharia vai instalar em múltiplas casas e escritórios. Portanto:

- **`zone-registry.js` NÃO tem zonas hardcoded** — lê de `config.json`
- `config.json` fica na raiz do projeto e define zonas, cômodos, dispositivos e ícones por instalação
- Trocar de instalação = trocar o `config.json`, zero alteração de código
- A primeira instalação de teste é o **escritório** (já tem Alexa) — `config.json` inicial terá as zonas do escritório

---

## Estrutura de Arquivos Alvo

```
dmsmart/
  index.html              # Dashboard principal (tablet kiosk)
  config.json             # Configuração de zonas POR INSTALAÇÃO (editável)
  manifest.json           # PWA manifest
  sw.js                   # Service Worker
  css/
    dmsmart.css           # Design system: variáveis, reset, layout global
    zones.css             # Grid de zonas e cards
  js/
    config-loader.js      # Carrega config.json e expõe para outros módulos
    zone-registry.js      # ZoneRegistry reativo — lê de config.json
    state-store.js        # Estado global com mock data na Fase 1
    ui-renderer.js        # Renderiza cards por zona baseado no state
    app.js                # Bootstrap: carrega config, inicia UI, relógio
  icons/                  # SVGs de ícones por tipo de cômodo
    sofa.svg, bed.svg, kitchen.svg, shower.svg,
    car.svg, tree.svg, hanger.svg, washing.svg
```

---

## Plano 01-01: HTML + CSS + Layout + Relógio

**Objetivo:** Estrutura HTML + design system dark + grid responsivo das zonas + relógio permanente no header.
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-08
**Quando:** Executar primeiro. Não depende de nada.

### Tarefas

#### Bloco A — HTML base e design system

- [ ] **01-01-T1**: Criar `index.html` com estrutura semântica completa
  - `<header>` com: logo dmsmart (texto puro, sem imagem de terceiro), relógio digital `HH:MM` em 24h, data `Seg, 12 Abr`, indicador de conexão (ponto cinza por agora)
  - `<main>` com `<section class="zones-grid">` vazio — será populado pelo `ui-renderer.js`
  - `<footer>` com versão do app (ex: `v2026.04.12`)
  - Meta tags PWA: `<meta name="theme-color" content="#0d1117">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `viewport `width=device-width, initial-scale=1`
  - Link para `manifest.json`, `css/dmsmart.css`, `css/zones.css`
  - Scripts no final do body: `js/config-loader.js`, `js/zone-registry.js`, `js/state-store.js`, `js/ui-renderer.js`, `js/app.js`
  - **Zero logos ou nomes de terceiros** (sem "Powered by Home Assistant", sem logo Supabase) — DASH-08

- [ ] **01-01-T2**: Criar `css/dmsmart.css` com design system dark
  - CSS custom properties (variáveis):
    ```
    --bg-primary: #0d1117
    --bg-card: #161b22
    --bg-card-hover: #1c2128
    --accent-on: #22c55e      (verde = dispositivo ligado)
    --accent-off: #374151     (cinza = desligado)
    --accent-alert: #ef4444   (vermelho = alerta)
    --text-primary: #f0f6fc
    --text-secondary: #8b949e
    --border: #30363d
    --radius: 12px
    --font-size-base: 18px    (mínimo tablet — DASH-04)
    --font-size-sm: 14px      (mobile pode usar)
    --font-size-lg: 24px
    --font-size-xl: 32px
    ```
  - Reset mínimo: box-sizing border-box, margin/padding 0, font-family `'Inter', system-ui, sans-serif`
  - Body: `background: var(--bg-primary)`, `color: var(--text-primary)`, `min-height: 100vh`
  - Header: flex, space-between, padding 16px 24px, border-bottom `var(--border)`, position sticky top 0, backdrop-filter blur para efeito glassmorphism sutil
  - `.clock`: font-size `var(--font-size-xl)`, font-weight 700, font-variant-numeric tabular-nums (evita salto visual ao mudar dígito)
  - `.date`: font-size `var(--font-size-base)`, color `var(--text-secondary)`
  - `.connection-dot`: círculo 10px, background cinza por padrão, verde quando online (Fase 2 altera)
  - Footer: text-align center, padding 12px, color `var(--text-secondary)`, font-size 12px

#### Bloco B — Layout responsivo e cards de zona

- [ ] **01-01-T3**: Criar `css/zones.css` com grid responsivo e card design
  - `.zones-grid`: CSS Grid
    - Tablet landscape (min-width: 1024px): `grid-template-columns: repeat(4, 1fr)`, gap 16px, padding 24px
    - Tablet portrait (768px–1023px): `grid-template-columns: repeat(3, 1fr)`, gap 12px
    - Mobile (max-width: 767px): `grid-template-columns: repeat(2, 1fr)`, gap 10px, padding 12px
  - `.zone-card`: background `var(--bg-card)`, border-radius `var(--radius)`, padding 20px, border `1px solid var(--border)`, transition `background 0.2s`, min-height 140px
  - `.zone-card:hover`: background `var(--bg-card-hover)`, cursor pointer
  - `.zone-card .zone-icon`: width 48px, height 48px, margin-bottom 12px (ícone grande para leitura a distância)
  - `.zone-card .zone-name`: font-size `var(--font-size-lg)`, font-weight 600, margin-bottom 8px
  - `.zone-card .zone-devices`: font-size `var(--font-size-base)`, color `var(--text-secondary)`, display flex, flex-wrap wrap, gap 6px
  - `.device-status`: pill pequeno (badge), padding `2px 8px`, border-radius 99px
    - `.device-status.on`: background `var(--accent-on)`, color white
    - `.device-status.off`: background `var(--accent-off)`, color `var(--text-secondary)`
  - `.zone-card.has-active`: border-color `var(--accent-on)` (borda verde quando algum dispositivo está ligado)
  - **Garantia DASH-03**: sem scroll horizontal em nenhum breakpoint — testar via `overflow-x: hidden` no body

#### Bloco C — Relógio em tempo real

- [ ] **01-01-T4**: Implementar relógio em `js/app.js` (função `initClock`)
  - Selecionar `.clock` e `.date` no DOM
  - `updateClock()`: formatar hora com `Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', hour12:false})`, data com `Date().toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'short'})`
  - `setInterval(updateClock, 1000)` — atualiza a cada segundo
  - Chamar `updateClock()` imediatamente ao iniciar (sem atraso de 1s visível)
  - **Garantia DASH-05**: relógio sempre visível, posição sticky no header

**Verificação do Plano 01-01:**
- Abrir `index.html` no navegador: fundo escuro, header com relógio funcionando, grid responsivo visível
- Redimensionar janela: em 1200px (4 colunas), 800px (3 colunas), 400px (2 colunas) — sem scroll horizontal
- Fonte mínima 18px visível nos labels
- Nenhum logo ou nome de terceiro na tela

---

## Plano 01-02: Config + Zone Registry + Mock Data + UI Renderer

**Objetivo:** Arquitetura configurável por instalação + dados mock + renderização dos cards das 12 zonas.
**Requirements:** DASH-01, DASH-02
**Quando:** Executar após Plano 01-01 (precisa do HTML/CSS do grid pronto).

### Tarefas

#### Bloco A — Configuração por instalação

- [ ] **01-02-T1**: Criar `config.json` — configuração da instalação atual (escritório de teste)
  ```json
  {
    "installation": {
      "name": "Escritório EDR",
      "version": "1.0.0"
    },
    "zones": [
      {
        "id": "sala_reuniao",
        "name": "Sala de Reunião",
        "icon": "sofa",
        "order": 1,
        "devices": [
          { "id": "luz_sala", "name": "Luz", "type": "light", "entity": "light.sala_reuniao" },
          { "id": "ac_sala", "name": "AC", "type": "climate", "entity": "climate.sala_reuniao" },
          { "id": "tv_sala", "name": "TV", "type": "media", "entity": "media_player.tv_sala" }
        ]
      },
      {
        "id": "escritorio",
        "name": "Escritório",
        "icon": "monitor",
        "order": 2,
        "devices": [
          { "id": "luz_esc", "name": "Luz", "type": "light", "entity": "light.escritorio" },
          { "id": "ac_esc", "name": "AC", "type": "climate", "entity": "climate.escritorio" }
        ]
      },
      {
        "id": "recepcao",
        "name": "Recepção",
        "icon": "sofa",
        "order": 3,
        "devices": [
          { "id": "luz_rec", "name": "Luz", "type": "light", "entity": "light.recepcao" }
        ]
      },
      {
        "id": "banheiro",
        "name": "Banheiro",
        "icon": "shower",
        "order": 4,
        "devices": [
          { "id": "luz_bwc", "name": "Luz", "type": "light", "entity": "light.banheiro" }
        ]
      },
      {
        "id": "cozinha",
        "name": "Cozinha",
        "icon": "kitchen",
        "order": 5,
        "devices": [
          { "id": "luz_coz", "name": "Luz", "type": "light", "entity": "light.cozinha" }
        ]
      },
      {
        "id": "garagem",
        "name": "Garagem",
        "icon": "car",
        "order": 6,
        "devices": [
          { "id": "luz_gar", "name": "Luz", "type": "light", "entity": "light.garagem" },
          { "id": "portao", "name": "Portão", "type": "cover", "entity": "cover.portao" }
        ]
      }
    ]
  }
  ```
  - Nota: quando for instalado na casa, trocar este arquivo pelas 12 zonas da casa. Zero alteração de código.

- [ ] **01-02-T2**: Criar `js/config-loader.js` — carrega `config.json` e expõe globalmente
  ```javascript
  // config-loader.js
  // Carrega config.json via fetch e expõe como window.DMSMART_CONFIG
  // Garante que outros módulos possam importar sem race condition
  const ConfigLoader = {
    config: null,
    async load() {
      const res = await fetch('./config.json');
      if (!res.ok) throw new Error('Falha ao carregar config.json');
      this.config = await res.json();
      window.DMSMART_CONFIG = this.config;
      return this.config;
    },
    get() {
      if (!this.config) throw new Error('Config não carregada. Chamar ConfigLoader.load() primeiro.');
      return this.config;
    }
  };
  ```
  - `app.js` deve chamar `await ConfigLoader.load()` antes de inicializar qualquer outro módulo

#### Bloco B — Zone Registry e State Store

- [ ] **01-02-T3**: Criar `js/zone-registry.js` — lê de DMSMART_CONFIG, não hardcoded
  ```javascript
  // zone-registry.js
  // Lê zonas do config.json carregado pelo ConfigLoader
  const ZoneRegistry = {
    _zones: null,

    init(config) {
      // Transforma array de config em Map para lookup rápido
      this._zones = new Map(
        config.zones
          .sort((a, b) => a.order - b.order)
          .map(z => [z.id, z])
      );
    },

    get(zoneId) { return this._zones.get(zoneId); },
    all() { return [...this._zones.values()]; },

    allEntityIds() {
      const ids = [];
      for (const zone of this._zones.values()) {
        for (const device of zone.devices) ids.push(device.entity);
      }
      return ids;
    },

    findZoneByEntity(entityId) {
      for (const zone of this._zones.values()) {
        if (zone.devices.some(d => d.entity === entityId)) return zone;
      }
      return null;
    }
  };
  ```

- [ ] **01-02-T4**: Criar `js/state-store.js` — Observer pattern + mock data para Fase 1
  ```javascript
  // state-store.js
  // Na Fase 1: popula estado com dados mock
  // Na Fase 2: será alimentado pelo ha-connection.js via get_states e state_changed
  const StateStore = {
    _state: {},
    _listeners: new Map(),

    // Fase 1: inicializa com mock data baseado nas entidades do ZoneRegistry
    initMock() {
      const entities = ZoneRegistry.allEntityIds();
      const mockStates = ['on', 'off'];
      for (const entityId of entities) {
        const isOn = Math.random() > 0.5; // estado aleatório para visualização
        this._state[entityId] = {
          entity_id: entityId,
          state: isOn ? 'on' : 'off',
          attributes: this._mockAttributes(entityId)
        };
      }
      this._notifyAll();
    },

    // Fase 2: substituir por dados reais do HA
    init(allStates) {
      for (const entity of allStates) {
        this._state[entity.entity_id] = entity;
      }
      this._notifyAll();
    },

    update(entityId, newState) {
      this._state[entityId] = newState;
      this._notify(entityId);
    },

    get(entityId) { return this._state[entityId] || null; },

    getZone(zoneId) {
      const zone = ZoneRegistry.get(zoneId);
      if (!zone) return [];
      return zone.devices.map(d => this._state[d.entity]).filter(Boolean);
    },

    subscribe(entityId, callback) {
      if (!this._listeners.has(entityId)) this._listeners.set(entityId, new Set());
      this._listeners.get(entityId).add(callback);
      return () => this._listeners.get(entityId).delete(callback);
    },

    subscribeZone(zoneId, callback) {
      const zone = ZoneRegistry.get(zoneId);
      if (!zone) return () => {};
      const unsubs = zone.devices.map(d => this.subscribe(d.entity, callback));
      return () => unsubs.forEach(fn => fn());
    },

    _notify(entityId) {
      const cbs = this._listeners.get(entityId);
      if (cbs) cbs.forEach(cb => cb(this._state[entityId]));
    },

    _notifyAll() {
      for (const [entityId, cbs] of this._listeners) {
        cbs.forEach(cb => cb(this._state[entityId]));
      }
    },

    _mockAttributes(entityId) {
      if (entityId.startsWith('climate.')) return { temperature: 23, hvac_mode: 'cool' };
      if (entityId.startsWith('media_player.')) return { volume_level: 0.5 };
      return {};
    }
  };
  ```

#### Bloco C — UI Renderer

- [ ] **01-02-T5**: Criar `js/ui-renderer.js` — renderiza cards das zonas no grid
  ```javascript
  // ui-renderer.js
  // Renderiza cards de zona no .zones-grid
  // Cada card se inscreve no StateStore para atualizar automaticamente
  const UIRenderer = {
    container: null,

    init(container) {
      this.container = container;
      this.renderAll();
    },

    renderAll() {
      this.container.innerHTML = '';
      for (const zone of ZoneRegistry.all()) {
        this.renderZoneCard(zone);
      }
    },

    renderZoneCard(zone) {
      const card = document.createElement('div');
      card.className = 'zone-card';
      card.id = `zone-${zone.id}`;
      this.container.appendChild(card);

      const update = () => {
        const devices = zone.devices.map(d => ({
          device: d,
          state: StateStore.get(d.entity)
        }));
        const hasActive = devices.some(d => d.state && d.state.state === 'on');
        card.className = `zone-card${hasActive ? ' has-active' : ''}`;
        card.innerHTML = this._buildCardHTML(zone, devices);
        this._bindCardControls(card, zone, devices);
      };

      StateStore.subscribeZone(zone.id, update);
      update();
    },

    _buildCardHTML(zone, devices) {
      const iconSVG = this._getIcon(zone.icon);
      const deviceBadges = devices.map(({ device, state }) => {
        const isOn = state && state.state === 'on';
        return `<span class="device-status ${isOn ? 'on' : 'off'}">${device.name}</span>`;
      }).join('');

      // Para zonas com clima: exibe temperatura atual se ligado
      const climateDevice = devices.find(d => d.device.type === 'climate');
      const tempBadge = climateDevice && climateDevice.state && climateDevice.state.state === 'on'
        ? `<span class="temp-badge">${climateDevice.state.attributes.temperature || '--'}°C</span>`
        : '';

      return `
        <div class="zone-icon">${iconSVG}</div>
        <div class="zone-name">${zone.name}</div>
        <div class="zone-devices">${deviceBadges}${tempBadge}</div>
      `;
    },

    _bindCardControls(card, zone) {
      // Fase 1: toque no card toggle o primeiro dispositivo de luz da zona (mock)
      // Fase 2: será substituído por HAConnection.callService
      card.addEventListener('click', () => {
        const lightDevice = ZoneRegistry.get(zone.id).devices.find(d => d.type === 'light');
        if (!lightDevice) return;
        const current = StateStore.get(lightDevice.entity);
        if (!current) return;
        const newState = { ...current, state: current.state === 'on' ? 'off' : 'on' };
        StateStore.update(lightDevice.entity, newState);
      });
    },

    _getIcon(iconName) {
      // Mapa de ícones inline SVG (simples, sem dependência externa)
      const icons = {
        sofa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/><path d="M2 11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4H2v-4z"/><path d="M4 15v2"/><path d="M20 15v2"/></svg>`,
        bed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 9V4h20v5"/><path d="M2 9a2 2 0 0 0-2 2v4h24v-4a2 2 0 0 0-2-2H2z"/><path d="M2 15v4"/><path d="M22 15v4"/></svg>`,
        kitchen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M12 3v18"/><path d="M2 9h20"/><circle cx="6" cy="6" r="1"/><circle cx="9" cy="6" r="1"/></svg>`,
        shower: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12a8 8 0 0 1 16 0"/><path d="M20 12v8"/><path d="M12 12v8"/><circle cx="16" cy="16" r="1"/><circle cx="16" cy="19" r="1"/><circle cx="19" cy="17" r="1"/></svg>`,
        car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 12h14"/></svg>`,
        tree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L7 9h3L5 16h5l-2 6h8l-2-6h5L14 9h3z"/></svg>`,
        hanger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4a2 2 0 0 1 2 2c0 1-1 2-2 3L2 15h20L12 9"/><path d="M12 4a2 2 0 0 0-2 2"/></svg>`,
        washing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M7 7h.01M10 7h.01M13 7h.01"/></svg>`,
        monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`
      };
      return icons[iconName] || icons['sofa'];
    }
  };
  ```

- [ ] **01-02-T6**: Criar `js/app.js` — bootstrap principal
  ```javascript
  // app.js
  // Inicializa todos os módulos na ordem correta
  async function initApp() {
    try {
      // 1. Carregar configuração da instalação
      await ConfigLoader.load();
      const config = ConfigLoader.get();

      // 2. Inicializar Zone Registry com a config
      ZoneRegistry.init(config);

      // 3. Inicializar State Store com dados mock (Fase 1)
      // Fase 2: remover initMock(), chamar HAConnection.connect() e StateStore.init(states)
      StateStore.initMock();

      // 4. Inicializar UI Renderer no container de zonas
      const zonesGrid = document.querySelector('.zones-grid');
      UIRenderer.init(zonesGrid);

      // 5. Inicializar relógio
      initClock();

      // 6. Registrar Service Worker (Fase PWA)
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
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      dateEl.textContent = now.toLocaleDateString('pt-BR', {
        weekday: 'short', day: '2-digit', month: 'short'
      });
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  document.addEventListener('DOMContentLoaded', initApp);
  ```

**Verificação do Plano 01-02:**
- Abrir no navegador: grid mostra cards de todas as zonas do `config.json`
- Cada card tem nome, ícone, badges de status dos dispositivos
- Clicar em um card: toggle do dispositivo de luz (estado muda visual)
- Trocar `config.json` por outro conjunto de zonas → dashboard atualiza automaticamente sem mudar código

---

## Plano 01-03: PWA — Manifest + Service Worker + Cache Offline

**Objetivo:** Transformar o dashboard em PWA instalável com funcionamento offline.
**Requirements:** DASH-06, DASH-07, DASH-08
**Quando:** Executar após Planos 01-01 e 01-02 (precisa de todos os arquivos para cachear).

### Tarefas

#### Bloco A — PWA Manifest

- [ ] **01-03-T1**: Criar `manifest.json` — identidade PWA dmsmart
  ```json
  {
    "name": "dmsmart",
    "short_name": "dmsmart",
    "description": "Dashboard de automação residencial",
    "start_url": "/",
    "display": "standalone",
    "orientation": "any",
    "background_color": "#0d1117",
    "theme_color": "#0d1117",
    "lang": "pt-BR",
    "icons": [
      {
        "src": "icons/icon-192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": "icons/icon-512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ],
    "categories": ["utilities"],
    "scope": "/"
  }
  ```
  - Nota sobre ícones: criar `icons/icon-192.png` e `icons/icon-512.png` como quadrado escuro `#0d1117` com letra "D" em verde `#22c55e` (fonte bold, centralizada). Usar Canvas API ou ferramenta simples — sem dependência externa.
  - **Garantia DASH-08**: `name` é "dmsmart", sem referência a Home Assistant, Supabase ou terceiros

- [ ] **01-03-T2**: Criar ícones PWA programaticamente via script Node.js (ou HTML Canvas)
  - Criar `tools/generate-icons.html` — abre no navegador, desenha ícone via Canvas e oferece download
  - Canvas 192x192: fundo `#0d1117`, círculo `#22c55e` (raio 70), letra "D" branca bold 80px centralizada
  - Canvas 512x512: mesma identidade visual, tamanho maior
  - Salvar outputs em `icons/icon-192.png` e `icons/icon-512.png`

#### Bloco B — Service Worker

- [ ] **01-03-T3**: Criar `sw.js` — Service Worker com cache-first para shell
  ```javascript
  // sw.js
  const CACHE_NAME = 'dmsmart-v1';
  const SHELL_ASSETS = [
    '/',
    '/index.html',
    '/config.json',
    '/manifest.json',
    '/css/dmsmart.css',
    '/css/zones.css',
    '/js/config-loader.js',
    '/js/zone-registry.js',
    '/js/state-store.js',
    '/js/ui-renderer.js',
    '/js/app.js'
  ];

  // Install: cacheiar o shell inteiro
  self.addEventListener('install', (e) => {
    e.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(SHELL_ASSETS))
        .then(() => self.skipWaiting())
    );
  });

  // Activate: limpar caches antigos
  self.addEventListener('activate', (e) => {
    e.waitUntil(
      caches.keys()
        .then(keys => Promise.all(
          keys.filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
        ))
        .then(() => self.clients.claim())
    );
  });

  // Fetch: estratégia por tipo de recurso
  self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // API do Home Assistant (porta 8123): NUNCA cachear — estado em tempo real
    if (url.port === '8123') return;

    // WebSocket: não interceptar
    if (e.request.url.startsWith('ws://') || e.request.url.startsWith('wss://')) return;

    // Supabase: network-first, fallback para cache
    if (url.hostname.includes('supabase')) {
      e.respondWith(
        fetch(e.request)
          .then(res => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
            return res;
          })
          .catch(() => caches.match(e.request))
      );
      return;
    }

    // Todos os outros assets (shell): cache-first
    e.respondWith(
      caches.match(e.request)
        .then(cached => cached || fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        }))
    );
  });
  ```
  - Ao deploy: incrementar `CACHE_NAME` para `dmsmart-v2`, `v3`, etc. (invalida cache antigo)
  - **Garantia DASH-07**: shell funciona offline — usuário abre PWA sem internet, vê dashboard com último estado

**Verificação do Plano 01-03:**
- Chrome DevTools → Application → Manifest: sem erros, ícones aparecem
- Chrome DevTools → Application → Service Workers: SW registrado, status "activated"
- DevTools → Network → Offline: recarregar página → dashboard carrega do cache
- Celular Android: botão "Adicionar à tela inicial" aparece no Chrome → instala como app standalone
- App instalado: sem barra de URL, tema escuro, ícone "D" verde na tela inicial

---

## Resumo de Execução

| Plano | Bloco | Tarefas | Requisitos | Depende de |
|-------|-------|---------|------------|------------|
| 01-01 | A | T1, T2 | DASH-04, DASH-05, DASH-08 | Nada |
| 01-01 | B | T3 | DASH-03 | T1, T2 |
| 01-01 | C | T4 | DASH-05 | T1 |
| 01-02 | A | T1, T2 | DASH-01 (config) | 01-01 completo |
| 01-02 | B | T3, T4 | DASH-01, DASH-02 | T1, T2 |
| 01-02 | C | T5, T6 | DASH-01, DASH-02 | T3, T4 |
| 01-03 | A | T1, T2 | DASH-06, DASH-08 | 01-02 completo |
| 01-03 | B | T3 | DASH-06, DASH-07 | T1, T2 |

**Ordem de execução:** 01-01 completo → 01-02 completo → 01-03 completo

---

## Critérios de Conclusão da Fase 1

- [ ] **DASH-01** — Painel principal exibe cards das zonas agrupados por ambiente (ZoneRegistry carregado de config.json, UIRenderer renderiza grid completo)
- [ ] **DASH-02** — Cada card mostra nome do cômodo, ícone SVG e status de todos os dispositivos da zona (badges on/off + temperatura do AC quando ligado)
- [ ] **DASH-03** — Layout responsivo funciona em tablet 10" landscape (4 colunas), tablet portrait (3 colunas) e mobile (2 colunas) sem scroll horizontal
- [ ] **DASH-04** — Modo escuro ativo por padrão (background `#0d1117`), tipografia mínima 18px em todos os labels visíveis no tablet
- [ ] **DASH-05** — Relógio `HH:MM` (24h) e data `Seg, 12 Abr` visíveis no header, atualizando a cada segundo
- [ ] **DASH-06** — PWA instalável: manifest.json válido, Service Worker registrado, ícones 192px e 512px presentes, Chrome exibe botão "Adicionar à tela inicial"
- [ ] **DASH-07** — Funciona offline: com Network Offline no DevTools, dashboard carrega do Service Worker cache sem erros
- [ ] **DASH-08** — Zero branding de terceiros: nenhum logo, nome ou referência a Home Assistant, Supabase, Google, Apple ou qualquer terceiro visível na interface

---

## Notas para Fase 2

Ao conectar o Home Assistant real:
1. Adicionar `js/ha-connection.js` (WebSocket client)
2. Em `app.js`, substituir `StateStore.initMock()` por `HAConnection.connect()` + `StateStore.init(states)`
3. Atualizar `config.json` com os `entity_id` reais do HA (ex: `light.sala` → ID real do Shelly)
4. Incrementar `CACHE_NAME` no `sw.js` para invalidar cache da Fase 1

---

*Plano criado: 2026-04-12*
*Fase: 01-shell-do-dashboard*
*Status: Pronto para execução*
