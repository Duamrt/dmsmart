# Phase 5 — Controles por Tipo de Entidade

## Goal
Cada tipo de entidade nativa do HA tem uma interface dedicada. Tap numa badge de dispositivo abre um modal de controle com os widgets certos (slider de brilho, +/- de temperatura, play/pause, abrir/fechar, etc.). Controle bulk da zona continua via clique no corpo do card.

## Depends on
Phase 3 (wizard cria as zonas e devices com tipos certos).

## Success Criteria
1. Tap em badge de dispositivo abre um modal de detalhe
2. Modal traz controles apropriados pro domínio da entidade
3. Estado do modal sincroniza ao vivo com StateStore.subscribe
4. Serviços HA corretos chamados pra cada ação (Optimistic UI)
5. Fechamento via backdrop, botão X, Escape
6. Suporte pra todos os tipos que o wizard conhece hoje (switch, light, climate, cover, fan, media_player)
7. Tipos extras (camera, sensor, binary_sensor, alarm_control_panel) na 05-02/03

## Plans

### 05-01: Modal base + 6 tipos core ✅
- `js/control-modal.js` — ControlModal object com render por tipo
- Renderers: switch, light, climate, cover, fan, media_player
- `ui-renderer.js`: badge click chama `ControlModal.open(device)`
- CSS: `.control-modal-*` completo
- Versão: v04122300

### 05-02: Câmera e sensores (só leitura)
- Wizard: adicionar domínios `camera`, `sensor`, `binary_sensor` ao mapa
- Card: renderização diferenciada pra sensores (mostra valor no lugar do badge on/off)
- Modal de câmera: preview maior, botão tela cheia
- Modal de sensor: histórico simples do valor atual

### 05-03: Alarme
- Wizard: adicionar `alarm_control_panel`
- Modal com teclado numérico + armar/desarmar + modo (home/away)
- Confirmação antes de desarmar
