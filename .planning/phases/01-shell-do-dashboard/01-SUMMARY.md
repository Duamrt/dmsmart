---
phase: "01"
plan: "01"
subsystem: shell-do-dashboard
tags: [pwa, dashboard, html, css, js, offline, service-worker]
dependency_graph:
  requires: []
  provides: [dashboard-shell, zone-registry, state-store, ui-renderer, pwa-manifest, service-worker]
  affects: [fase-02-home-assistant, fase-03-energia-solar]
tech_stack:
  added: []
  patterns: [observer-pattern, config-driven-zones, cache-first-sw, css-grid-responsive]
key_files:
  created:
    - index.html
    - config.json
    - manifest.json
    - sw.js
    - css/dmsmart.css
    - css/zones.css
    - js/config-loader.js
    - js/zone-registry.js
    - js/state-store.js
    - js/ui-renderer.js
    - js/app.js
    - icons/icon-192.png
    - icons/icon-512.png
    - tools/generate-icons.html
  modified: []
decisions:
  - "config.json como único ponto de configuração — trocar de instalação = trocar o arquivo, zero alteração de código"
  - "Ícones PWA gerados via Canvas API (tools/generate-icons.html) sem dependência externa"
  - "StateStore com Observer pattern permite Fase 2 substituir initMock() por HAConnection sem tocar UIRenderer"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-12"
  tasks_completed: 10
  files_created: 14
---

# Phase 01 Plan 01: Shell do Dashboard Summary

Dashboard PWA dark mode com grid responsivo de zonas configuráveis, Service Worker offline-first e arquitetura preparada para receber dados reais do Home Assistant na Fase 2.

## What Was Built

### Plano 01-01 — HTML + CSS + Layout (commit 24704b1)

- `index.html`: estrutura semântica completa com header sticky, section zones-grid, footer com versão. Meta tags PWA completas. Zero logos ou nomes de terceiros.
- `css/dmsmart.css`: design system dark com 11 custom properties CSS, header com backdrop-filter glassmorphism, `.clock` com font-variant-numeric tabular-nums, `.connection-dot` com estados on/offline.
- `css/zones.css`: grid responsivo 4 colunas (1024px+) / 3 colunas (768-1023px) / 2 colunas (767px-), cards com transição suave, badges `.device-status.on/off`, `.zone-card.has-active` com borda verde, `.temp-badge` para temperatura do AC.
- `js/app.js`: `initClock()` com `toLocaleTimeString pt-BR HH:MM`, `setInterval 1s`, bootstrap `initApp()` com ordem correta dos módulos.

### Plano 01-02 — Config + Zone Registry + State Store + UI Renderer (commit 353ca99)

- `config.json`: 6 zonas do escritório EDR (sala reunião, escritório, recepção, banheiro, cozinha, garagem) com dispositivos e entity IDs do HA. Comentário: trocar para as 12 zonas da casa futuramente.
- `js/config-loader.js`: fetch async de config.json, expõe `window.DMSMART_CONFIG`, lança erro claro se usado antes de `load()`.
- `js/zone-registry.js`: Map interno indexado por id, sort por `order`, métodos `all()`, `get()`, `allEntityIds()`, `findZoneByEntity()`. Zero hardcode de zonas.
- `js/state-store.js`: Observer pattern com `Map<entityId, Set<callback>>`, `initMock()` com estado aleatório on/off + temperatura mock para climate, `subscribe()` retorna função de unsubscribe, `subscribeZone()` agrega.
- `js/ui-renderer.js`: `renderAll()` cria cards via `document.createElement`, `subscribeZone` reativo (cada atualização de estado re-renderiza apenas o card afetado), 9 ícones SVG inline sem dependência externa, toggle mock de luz no click.

### Plano 01-03 — PWA (commit 7311190)

- `manifest.json`: name "dmsmart", standalone, pt-BR, background/theme #0d1117, sem referência a terceiros.
- `tools/generate-icons.html`: página Canvas API que desenha círculo verde + letra "D" branca, oferece download dos ícones nos tamanhos corretos.
- `icons/icon-192.png` e `icons/icon-512.png`: PNGs válidos (placeholder escuro — substituir pelos gerados via tools/).
- `sw.js`: install cacheia 13 assets do shell, activate limpa caches anteriores via `CACHE_NAME`, fetch com estratégia por tipo: HA porta 8123 nunca cacheado, Supabase network-first, shell cache-first.

## Deviations from Plan

### Auto-fixed Issues

None — plano executado exatamente como escrito.

### Ajustes menores

**1. [Rule 2 - Qualidade] sw.js valida status da resposta antes de cachear**
- Adicionado: `if (!res || res.status !== 200 || res.type === 'opaque') return res;` no fetch handler cache-first
- Razão: evita cachear erros 404/500 que quebrariam o funcionamento offline
- Não estava no plano original mas é obrigatório para Service Worker correto

**2. [Rule 2 - Completude] Ícones incluídos na lista de SHELL_ASSETS do sw.js**
- `icons/icon-192.png` e `icons/icon-512.png` adicionados ao cache
- O plano original não listava, mas sem eles o PWA instalado não teria ícone offline

## Known Stubs

- `icons/icon-192.png` e `icons/icon-512.png`: PNG de cor sólida escura. PWA funcional mas sem o "D" verde. Gerar os ícones reais abrindo `tools/generate-icons.html` no navegador e baixando os arquivos.
- `.connection-dot`: sempre cinza (sem estado real). Fase 2 vai ligar ao estado do WebSocket do HA.

## Notas para Fase 2

Para conectar o Home Assistant real:
1. Adicionar `js/ha-connection.js` (WebSocket client)
2. Em `app.js`: remover `StateStore.initMock()`, chamar `HAConnection.connect()` + `StateStore.init(states)`
3. Atualizar `config.json` com entity IDs reais do HA
4. Incrementar `CACHE_NAME` para `dmsmart-v2` no sw.js
5. Ponto de extensão: `.connection-dot.online` já existe no CSS, falta só ligar ao WS
