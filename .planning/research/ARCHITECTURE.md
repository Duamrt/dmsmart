# Architecture Research -- dmsmart

**Dominio:** Dashboard de automacao residencial custom sobre Home Assistant
**Pesquisado:** 2026-04-12
**Confianca geral:** HIGH (APIs do HA sao bem documentadas, stack vanilla JS e familiar)

---

## Component Map

Tres camadas com responsabilidades bem definidas:

```
+-----------------------------------------------------+
|  CAMADA 1: DISPOSITIVOS FISICOS                     |
|  Zigbee/WiFi switches, sensores, IR blasters, etc   |
+-----------------------------------------------------+
         |  Zigbee (Coordinator) / WiFi / IR
         v
+-----------------------------------------------------+
|  CAMADA 2: HOME ASSISTANT (Raspberry Pi)            |
|  - Gerencia todos os protocolos de dispositivos     |
|  - Expoe WebSocket API (ws://IP:8123/api/websocket) |
|  - Expoe REST API (http://IP:8123/api/)             |
|  - Automacoes nativas (cenas, horarios)             |
|  - Nunca visivel ao usuario                         |
+-----------------------------------------------------+
         |  WebSocket (real-time)  |  REST (commands)
         v                        v
+-----------------------------------------------------+
|  CAMADA 3: dmsmart (Frontend)                       |
|  - HTML + CSS + JS vanilla                          |
|  - PWA com Service Worker                           |
|  - Servido pelo proprio Raspberry Pi                |
|  - Interface unica que o usuario ve                 |
+-----------------------------------------------------+
         |  HTTPS (quando online)
         v
+-----------------------------------------------------+
|  CAMADA 4: SUPABASE (Nuvem)                         |
|  - Historico de consumo energetico                  |
|  - Logs de acoes (quem ligou o que, quando)         |
|  - Graficos de longo prazo                          |
|  - NAO participa do controle em tempo real          |
+-----------------------------------------------------+
```

### Responsabilidades claras

| Componente | Faz | NAO faz |
|------------|-----|---------|
| Home Assistant | Fala com dispositivos, expoe API, automacoes | Interface visual, historico longo prazo |
| dmsmart frontend | Interface visual, controle via API, graficos | Falar direto com dispositivos, armazenar dados |
| Supabase | Historico, logs, graficos de longo prazo | Controle de dispositivos, tempo real |
| Service Worker | Cache do shell, operacao offline na rede local | Armazenar estado dos dispositivos |

---

## Data Flow

### Fluxo 1: Estado em Tempo Real (WebSocket)

```
HA WebSocket ──subscribe_events──> dmsmart
                                      |
                  state_changed event  |
                  {entity_id, new_state, old_state}
                                      |
                                      v
                              StateStore.update()
                                      |
                                      v
                              UI re-renders zona afetada
```

**Conexao WebSocket:**
1. Conectar em `ws://RASPBERRY_IP:8123/api/websocket`
2. Servidor envia `auth_required`
3. Cliente envia `{type: "auth", access_token: "LONG_LIVED_TOKEN"}`
4. Servidor responde `auth_ok`
5. Cliente envia `{id: 1, type: "subscribe_events", event_type: "state_changed"}`
6. A partir dai, cada mudanca de estado chega automaticamente

**Carga inicial:** Ao conectar, chamar `{id: 2, type: "get_states"}` para pegar o snapshot completo de todas as entidades. Isso popula o StateStore de uma vez.

### Fluxo 2: Comandos (REST ou WebSocket)

```
Usuario toca botao "Ligar luz sala"
           |
           v
    haService.call('light', 'turn_on', {entity_id: 'light.sala'})
           |
           v  (prefira WebSocket para comandos tambem)
    {id: N, type: "call_service", domain: "light", service: "turn_on",
     target: {entity_id: "light.sala"}}
           |
           v
    HA executa ──> dispositivo responde ──> state_changed event
           |
           v
    UI atualiza automaticamente via subscription (nao precisa poll)
```

**Decisao: WebSocket para TUDO, REST como fallback.**
Motivo: uma unica conexao WebSocket lida com comandos E estado. REST so serve como fallback se o WS cair temporariamente.

### Fluxo 3: Historico (Supabase)

```
A cada N minutos (ou a cada mudanca significativa):
    dmsmart ──> Supabase insert
    {
      entity_id, state, timestamp,
      energy_consumption, solar_generation
    }

Para graficos:
    dmsmart ──> Supabase select com filtros de periodo
    ──> Renderiza grafico no frontend
```

**Quando enviar para Supabase:**
- Consumo energetico: a cada 5 minutos (batch)
- Geracao solar: a cada 5 minutos (batch)
- Acoes do usuario: imediatamente (log de quem fez o que)
- NAO enviar cada state_changed -- seria muito volume

**Quando NAO tem internet:**
- Acumular em IndexedDB local
- Sync quando internet voltar (background sync)

---

## Frontend Architecture

### Estrutura de Arquivos

```
dmsmart/
  index.html              # Dashboard principal (tablet kiosk)
  mobile.html             # Layout mobile (ou mesmo index responsivo)
  manifest.json           # PWA manifest
  sw.js                   # Service Worker
  css/
    dmsmart.css           # Estilos globais
    zones.css             # Grid/layout das zonas
  js/
    ha-connection.js      # WebSocket + REST client para HA
    state-store.js        # Estado global reativo (Proxy-based)
    zone-registry.js      # Registro das 12 zonas e seus dispositivos
    ui-renderer.js        # Renderiza cards/controles baseado no state
    energy-monitor.js     # Logica de consumo e solar
    supabase-sync.js      # Envio de historico para Supabase
    app.js                # Bootstrap: conecta tudo
  zones/                  # (opcional) templates HTML por zona
```

### State Management: Proxy Store

Sem framework, usar **Proxy reativo** -- padrao comprovado para vanilla JS de medio porte:

```javascript
// state-store.js
const _state = {};
const _listeners = new Map(); // entity_id -> Set<callback>

const StateStore = {
  // Popula com get_states inicial
  init(allStates) {
    for (const entity of allStates) {
      _state[entity.entity_id] = entity;
    }
    this._notifyAll();
  },

  // Chamado a cada state_changed do WebSocket
  update(entityId, newState) {
    _state[entityId] = newState;
    this._notify(entityId);
  },

  get(entityId) {
    return _state[entityId] || null;
  },

  // Pega todas entidades de uma zona
  getZone(zoneId) {
    const zone = ZoneRegistry.get(zoneId);
    return zone.entities.map(id => _state[id]).filter(Boolean);
  },

  subscribe(entityId, callback) {
    if (!_listeners.has(entityId)) _listeners.set(entityId, new Set());
    _listeners.get(entityId).add(callback);
    return () => _listeners.get(entityId).delete(callback); // unsubscribe
  },

  subscribeZone(zoneId, callback) {
    const zone = ZoneRegistry.get(zoneId);
    const unsubs = zone.entities.map(id => this.subscribe(id, callback));
    return () => unsubs.forEach(fn => fn());
  },

  _notify(entityId) {
    const cbs = _listeners.get(entityId);
    if (cbs) cbs.forEach(cb => cb(_state[entityId]));
  },

  _notifyAll() {
    for (const [entityId, cbs] of _listeners) {
      cbs.forEach(cb => cb(_state[entityId]));
    }
  }
};
```

**Por que esse padrao e nao Proxy global:**
- Subscricao por entidade evita re-render de toda a UI a cada mudanca
- Subscricao por zona permite atualizar so o card da zona afetada
- Sem dependencia externa, ~50 linhas

### HA Connection Module

```javascript
// ha-connection.js
const HAConnection = {
  ws: null,
  msgId: 0,
  pending: new Map(), // id -> {resolve, reject}
  token: null,
  url: null,

  async connect(url, token) {
    this.url = url;
    this.token = token;
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onmessage = (e) => this._handleMessage(JSON.parse(e.data), resolve);
      this.ws.onclose = () => this._reconnect();
      this.ws.onerror = () => reject(new Error('WS connection failed'));
    });
  },

  _handleMessage(msg, authResolve) {
    if (msg.type === 'auth_required') {
      this.ws.send(JSON.stringify({type: 'auth', access_token: this.token}));
    } else if (msg.type === 'auth_ok') {
      authResolve();
    } else if (msg.type === 'event') {
      // state_changed
      const {entity_id, new_state} = msg.event.data;
      StateStore.update(entity_id, new_state);
    } else if (msg.type === 'result') {
      const p = this.pending.get(msg.id);
      if (p) { p.resolve(msg.result); this.pending.delete(msg.id); }
    }
  },

  send(payload) {
    const id = ++this.msgId;
    payload.id = id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.ws.send(JSON.stringify(payload));
    });
  },

  async getStates() {
    return this.send({type: 'get_states'});
  },

  async callService(domain, service, entityId, data = {}) {
    return this.send({
      type: 'call_service',
      domain,
      service,
      target: {entity_id: entityId},
      service_data: data
    });
  },

  async subscribeEvents() {
    return this.send({type: 'subscribe_events', event_type: 'state_changed'});
  },

  _reconnect() {
    // Backoff exponencial: 1s, 2s, 4s, 8s, max 30s
    // Ao reconectar, re-subscribe e get_states para resync
  }
};
```

### UI Rendering Pattern

Cada zona e um componente auto-contido que se inscreve no StateStore:

```javascript
// Padrao para cada card de zona
function renderZoneCard(zoneId, container) {
  const zone = ZoneRegistry.get(zoneId);
  const card = document.createElement('div');
  card.className = 'zone-card';
  card.id = `zone-${zoneId}`;
  container.appendChild(card);

  function update() {
    const entities = StateStore.getZone(zoneId);
    card.innerHTML = buildZoneHTML(zone, entities); // rebuilds inner HTML only
    bindZoneControls(card, zone); // re-bind event listeners
  }

  StateStore.subscribeZone(zoneId, update);
  update(); // render inicial
}
```

---

## Offline / Local Network Strategy

### Cenario critico: casa SEM internet

O dashboard DEVE funcionar 100% para controle de dispositivos mesmo sem internet. So perde graficos historicos (Supabase).

### Arquitetura de rede

```
Internet (quando disponivel)
    |
    v
Router WiFi da casa
    |
    +-- Raspberry Pi (192.168.x.10)
    |     - Home Assistant (:8123)
    |     - Nginx servindo dmsmart (:80)
    |
    +-- Tablet na parede (kiosk)
    |     - Acessa http://192.168.x.10/
    |
    +-- Celular do Duam
          - Acessa http://192.168.x.10/ (PWA)
```

### Service Worker Strategy

```javascript
// sw.js
const CACHE_NAME = 'dmsmart-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/dmsmart.css',
  '/css/zones.css',
  '/js/app.js',
  '/js/ha-connection.js',
  '/js/state-store.js',
  '/js/zone-registry.js',
  '/js/ui-renderer.js',
  '/js/energy-monitor.js',
  '/js/supabase-sync.js',
  '/manifest.json'
];

// Install: cache o shell inteiro
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Fetch: cache-first para assets, network-only para API do HA
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API do HA: NUNCA cachear (estado em tempo real)
  if (url.port === '8123') return;

  // Supabase: network-first (historico)
  if (url.hostname.includes('supabase')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets estaticos: cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
```

### Estrategia por camada

| Recurso | Estrategia | Motivo |
|---------|-----------|--------|
| HTML/CSS/JS (shell) | Cache-first | Nunca muda sem deploy |
| WebSocket HA | Network-only | Tempo real, sem cache |
| REST HA | Network-only | Comandos, sem cache |
| Supabase reads | Network-first, fallback cache | Graficos historicos |
| Supabase writes | Queue em IndexedDB, sync quando online | Nao perder logs |

### IndexedDB para queue offline

```javascript
// supabase-sync.js
const DB_NAME = 'dmsmart-offline';
const STORE_NAME = 'pending-sync';

async function queueForSync(table, data) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add({table, data, timestamp: Date.now()});
}

async function flushQueue() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const items = await tx.objectStore(STORE_NAME).getAll();
  for (const item of items) {
    try {
      await supabase.from(item.table).insert(item.data);
      // remover do IndexedDB apos sucesso
    } catch (e) {
      break; // parar no primeiro erro, tentar de novo depois
    }
  }
}
```

---

## Zone Management Pattern

### Zone Registry: configuracao declarativa

```javascript
// zone-registry.js
const ZONES = {
  sala: {
    name: 'Sala',
    icon: 'sofa',
    order: 1,
    entities: {
      luz:   'light.sala',
      ac:    'climate.sala',
      tv:    'media_player.tv_sala',
      som:   'media_player.som_sala'
    },
    controls: ['light', 'climate', 'media']
  },
  suite: {
    name: 'Suite',
    icon: 'bed',
    order: 2,
    entities: {
      luz: 'light.suite',
      ac:  'climate.suite',
      som: 'media_player.som_suite'
    },
    controls: ['light', 'climate', 'media']
  },
  closet:      { name: 'Closet',         icon: 'hanger',  order: 3,  entities: { luz: 'light.closet' },            controls: ['light'] },
  bwc_suite:   { name: 'BWC Suite',      icon: 'shower',  order: 4,  entities: { luz: 'light.bwc_suite' },         controls: ['light'] },
  quarto1:     { name: 'Quarto 1',       icon: 'bed',     order: 5,  entities: { luz: 'light.quarto1', ac: 'climate.quarto1' }, controls: ['light', 'climate'] },
  quarto2:     { name: 'Quarto 2',       icon: 'bed',     order: 6,  entities: { luz: 'light.quarto2', ac: 'climate.quarto2' }, controls: ['light', 'climate'] },
  bwc2:        { name: 'BWC 2',          icon: 'shower',  order: 7,  entities: { luz: 'light.bwc2' },              controls: ['light'] },
  bwc_social:  { name: 'BWC Social',     icon: 'shower',  order: 8,  entities: { luz: 'light.bwc_social' },        controls: ['light'] },
  cozinha:     { name: 'Cozinha',        icon: 'kitchen',  order: 9,  entities: { luz: 'light.cozinha' },           controls: ['light'] },
  area_servico:{ name: 'Area de Servico',icon: 'washing', order: 10, entities: { luz: 'light.area_servico', bomba: 'switch.bomba_dagua' }, controls: ['light', 'switch'] },
  garagem:     { name: 'Garagem',        icon: 'car',     order: 11, entities: { luz: 'light.garagem', portao: 'cover.portao' }, controls: ['light', 'cover'] },
  externo:     { name: 'Quintal/Externo',icon: 'tree',    order: 12, entities: { luz: 'light.externo' },           controls: ['light'] }
};

const ZoneRegistry = {
  get(zoneId) { return ZONES[zoneId]; },
  all() { return Object.entries(ZONES).sort((a,b) => a[1].order - b[1].order); },
  allEntityIds() {
    const ids = [];
    for (const zone of Object.values(ZONES)) {
      ids.push(...Object.values(zone.entities));
    }
    return ids;
  },
  findZoneByEntity(entityId) {
    for (const [zoneId, zone] of Object.entries(ZONES)) {
      if (Object.values(zone.entities).includes(entityId)) return zoneId;
    }
    return null;
  }
};
```

### Por que declarativo em vez de dinamico

- As 12 zonas sao FIXAS (e uma casa, nao muda toda semana)
- Carregar do banco ou do HA seria overhead desnecessario
- Adicionar uma zona = adicionar 5 linhas no objeto ZONES
- O `controls` array define quais componentes UI renderizar por zona

### UI Controls por tipo de dispositivo

```javascript
// Fabrica de controles por tipo
const ControlFactory = {
  light(entityId, state) {
    // Toggle on/off + slider brilho (se dimmable)
    return `<div class="ctrl-light" data-entity="${entityId}">...</div>`;
  },
  climate(entityId, state) {
    // Toggle + temperatura +/- + modo
    return `<div class="ctrl-climate" data-entity="${entityId}">...</div>`;
  },
  media(entityId, state) {
    // Toggle + volume + source
    return `<div class="ctrl-media" data-entity="${entityId}">...</div>`;
  },
  switch(entityId, state) {
    // Toggle simples (bomba)
    return `<div class="ctrl-switch" data-entity="${entityId}">...</div>`;
  },
  cover(entityId, state) {
    // Abrir/fechar (portao)
    return `<div class="ctrl-cover" data-entity="${entityId}">...</div>`;
  }
};
```

Cada zona renderiza seus controles com base no array `controls` -- zero logica condicional espalhada.

---

## Build Order

### Fase 1: Fundacao (sem HA, sem dispositivos)

**Objetivo:** shell do dashboard funcional, navegavel, com dados mock.

1. `index.html` + `dmsmart.css` -- layout responsivo tablet/mobile
2. `zone-registry.js` -- as 12 zonas declaradas
3. `state-store.js` -- StateStore com dados mock
4. `ui-renderer.js` -- renderiza cards das zonas com estado fake
5. `manifest.json` + `sw.js` basico -- PWA installavel

**Entregavel:** dashboard visual completo com cards das 12 zonas, dados fake, PWA installavel. Pode testar layout no tablet real.

**Nao depende de:** Home Assistant, Raspberry Pi, dispositivos fisicos, Supabase.

### Fase 2: Conexao com Home Assistant

**Objetivo:** dashboard consumindo dados reais do HA.

1. `ha-connection.js` -- WebSocket auth + subscribe + call_service
2. Integrar `get_states` -> `StateStore.init()`
3. Integrar `state_changed` -> `StateStore.update()`
4. Comandos reais: tap no botao -> `callService()`
5. Reconnect automatico com backoff exponencial
6. Indicador de conexao no header (online/offline/reconnecting)

**Entregavel:** dashboard controlando dispositivos reais. Tap liga/desliga luz, muda temperatura do AC, etc.

**Depende de:** Fase 1 + Home Assistant rodando no Raspberry Pi com pelo menos 1 dispositivo configurado.

### Fase 3: Controles avancados por tipo

**Objetivo:** cada tipo de dispositivo com UI dedicada.

1. `ControlFactory.light` -- toggle + slider brilho + color temp (se RGB)
2. `ControlFactory.climate` -- temperatura +/- , modo (frio/quente/auto), fan speed
3. `ControlFactory.media` -- play/pause, volume, source selector (TV/som)
4. `ControlFactory.switch` -- toggle com confirmacao (bomba d'agua)
5. `ControlFactory.cover` -- abrir/fechar/parar (portao garagem)

**Entregavel:** controles ricos para cada tipo de dispositivo, nao so toggle generico.

**Depende de:** Fase 2 (precisa de dados reais para testar estados intermediarios).

### Fase 4: Energia e Solar

**Objetivo:** monitoramento energetico em tempo real.

1. `energy-monitor.js` -- consume entidades de sensor de energia do HA
2. Card de energia no dashboard: consumo atual (W), geracao solar (W), saldo
3. Grafico intraday (ultimas 24h) -- pode usar canvas nativo ou Chart.js leve
4. Indicador visual: gerando mais que consome = verde, consumindo mais = vermelho

**Entregavel:** painel de energia funcional com dados em tempo real.

**Depende de:** Fase 2 + sensores de energia e inversor solar configurados no HA.

### Fase 5: Historico e Supabase

**Objetivo:** dados persistentes para graficos de longo prazo.

1. `supabase-sync.js` -- client Supabase + queue offline (IndexedDB)
2. Tabela `energy_log`: timestamp, consumption_w, solar_w, grid_w
3. Tabela `action_log`: timestamp, user, entity_id, action, zone
4. Graficos de consumo por periodo (dia/semana/mes)
5. Consumo por zona (qual comodo gasta mais)
6. Background sync quando internet volta

**Entregavel:** graficos historicos, ranking de consumo por zona.

**Depende de:** Fase 4 (precisa de dados de energia) + conta Supabase configurada.

### Fase 6: Polish e Kiosk

**Objetivo:** experiencia final para uso diario.

1. Modo kiosk no tablet (fullscreen, sem barra do browser)
2. Tema escuro/claro automatico (por horario ou sensor de luminosidade)
3. Gestos touch (swipe entre zonas no mobile)
4. Notificacoes push (bomba ligada ha X horas, portao aberto, etc.)
5. Tela de screensaver com relogio + status geral quando idle

**Depende de:** Todas as fases anteriores.

### Diagrama de Dependencias

```
Fase 1 (Shell UI)
    |
    v
Fase 2 (HA Connection) ──> Fase 3 (Controles avancados)
    |                            |
    v                            v
Fase 4 (Energia/Solar) ──> Fase 5 (Historico/Supabase)
                                 |
                                 v
                           Fase 6 (Polish/Kiosk)
```

Fases 3 e 4 podem rodar em paralelo apos Fase 2.

---

## Decisoes Arquiteturais Chave

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Protocolo de comunicacao | WebSocket para tudo, REST como fallback | Uma conexao, bidirecional, sem polling |
| State management | Observer pattern com subscricao por entidade | Evita re-render global, ~50 linhas, sem dependencia |
| Zona registry | Objeto JS declarativo hardcoded | Zonas sao fixas, zero overhead de carregar do banco |
| Controles UI | Factory pattern por tipo de dispositivo | Cada tipo tem UI dedicada sem ifs espalhados |
| Historico | Supabase com queue IndexedDB | Funciona offline, sync automatico, consistente com stack |
| Service Worker | Cache-first para shell, network-only para HA API | Shell offline, controle sempre em tempo real |
| Deploy frontend | Servido pelo Raspberry Pi via Nginx | Funciona sem internet, latencia minima na rede local |

---

## Fontes

- [Home Assistant WebSocket API Docs](https://developers.home-assistant.io/docs/api/websocket/) -- HIGH confidence
- [Home Assistant REST API Docs](https://developers.home-assistant.io/docs/api/rest/) -- HIGH confidence
- [Home Assistant Authentication](https://www.home-assistant.io/docs/authentication/) -- HIGH confidence
- [State Management in Vanilla JS (CSS-Tricks)](https://css-tricks.com/build-a-state-management-system-with-vanilla-javascript/) -- MEDIUM confidence
- [MDN Service Workers / Offline PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) -- HIGH confidence
