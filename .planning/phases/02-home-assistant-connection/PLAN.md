# Fase 02 — Conexão Home Assistant

**Goal:** Dashboard conecta ao HA via WebSocket e controla dispositivos reais com feedback instantâneo.

**Branch:** `fase-02-ha-connection`

## Ambiente de Teste

- HA em Docker local: `http://localhost:8123`
- Token: `~/dmsmart/.env.local` (HA_URL + HA_TOKEN)
- 5 dispositivos fake (`input_boolean.dmsmart_*`): Luz Sala, Luz Suite, Luz Cozinha, Ar Suite, Portão

## 02-01: Conexão WebSocket e State Store Reativo

**Entregáveis:**
- `js/ha-client.js` — cliente WS autenticado (auth handshake, assinatura de eventos `state_changed`)
- Atualização do `state-store.js` — agora recebe estados reais via `subscribe_events`
- Config de conexão lida de meta-tag ou localStorage (pra dev: `ws://localhost:8123/api/websocket` + token)
- Reconexão automática com backoff exponencial (1s, 2s, 4s, 8s, max 30s)
- Indicador de estado de conexão na UI (canto superior): `online` (verde), `reconnecting` (amarelo), `offline` (vermelho)

**Critérios:**
- Ao abrir o dashboard com HA rodando, os 5 dispositivos fake aparecem com estado real
- Desligar o container HA → indicador fica vermelho em ≤2s
- Religar → reconecta automaticamente e volta a verde

## 02-02: Toggle com Optimistic UI

**Entregáveis:**
- Handler de clique nos cards das zonas → chama `call_service` via WS (`input_boolean.toggle`)
- UI atualiza imediatamente (optimistic), e se o servidor negar/demorar >2s, reverte e mostra erro
- Mapeamento zona → entity_id via `config.json` (novo campo `entities: []` por zona)

**Critérios:**
- Clicar no card "Sala" alterna `input_boolean.dmsmart_luz_sala` em <300ms visualmente
- Mudança feita pela UI do HA (outra aba) reflete no dashboard em tempo real
- Offline: cliques ficam bloqueados com feedback visual

## Regras

- NUNCA commitar o token HA — só `.env.local` (gitignored)
- Toda lógica de WS concentrada em `js/ha-client.js` — não espalhar `fetch` pelo código
- Usa o `state-store.js` existente como única fonte de verdade na UI
