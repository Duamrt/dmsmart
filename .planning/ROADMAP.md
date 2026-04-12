# Roadmap: dmsmart

## Overview

dmsmart é construído como **produto**, não como painel de uma casa específica. O roadmap entrega primeiro o shell genérico, depois a conexão HA, depois o setup in-app (wizard), depois multi-tenancy com backend, e só então entra em features de profundidade (controles avançados, energia, histórico, polish).

A Casa Jupi (cliente em obra) tem um milestone paralelo de infraestrutura física documentado em `customers/casa-jupi.md` — é fora do core do produto mas urgente por conta da janela de obra.

## Phases

- [x] **Phase 1: Shell do Dashboard** — frontend genérico que renderiza zonas via config, PWA instalável, mock data
- [~] **Phase 2: Conexão Home Assistant (MVP)** — WebSocket real-time, toggle Optimistic UI, status/reconexão
- [x] **Phase 3: Setup Wizard e Descoberta de Entidades** — cliente conecta HA próprio e mapeia zonas/dispositivos pela UI, sem editar JSON
- [ ] **Phase 4: Backend Multi-instalação (Supabase)** — auth por cliente, config sincronizada entre dispositivos, RLS
- [ ] **Phase 5: Controles por Tipo de Entidade** — UIs dedicadas por tipo (light, climate, media_player, cover, fan, switch), confirmação para ações críticas
- [ ] **Phase 6: Energia e Solar** — mapeamento genérico de sensores (consumo/geração), saldo, economia em R$, gráficos intraday
- [ ] **Phase 7: Histórico e Analytics** — snapshots no Supabase, comparativos mensais, ranking de zonas, sync offline
- [ ] **Phase 8: Polish e Modo Kiosk** — screensaver, burn-in protection, cenas (Boa Noite), alertas

## Phase Details

### Phase 1: Shell do Dashboard ✅
**Goal:** Dashboard visual genérico que renderiza N zonas via config, funcional como PWA, sem depender de hardware nenhum.
**Status:** Completa em 2026-04-12
**Depends on:** —
**Delivered:**
1. Cards das zonas renderizados via `config.json` (qualquer instalação é suportada)
2. Layout responsivo para tablet 10" e mobile
3. Dark mode, tipografia ≥ 18px no tablet
4. PWA instalável (manifest + SW + cache offline)
5. Zero branding de terceiros
**Plans:**
- [x] 01-01: Estrutura HTML e layout responsivo
- [x] 01-02: Config, Zone Registry, State Store, UI Renderer
- [x] 01-03: PWA manifest, Service Worker e cache offline

### Phase 2: Conexão Home Assistant (MVP)
**Goal:** Uma instalação consegue conectar ao Home Assistant via WebSocket e controlar dispositivos reais com feedback instantâneo.
**Status:** Em andamento — escritório EDR é a primeira instalação conectada
**Depends on:** Phase 1
**Success Criteria:**
1. Cliente fornece URL do HA e token, app conecta via WebSocket ✅
2. Toggle de qualquer dispositivo reflete no HA em < 300ms (Optimistic UI) ✅
3. Indicador visual de estado (online/offline/reconectando/auth_invalid) ✅
4. Reconexão automática com backoff exponencial ✅
5. Dashboard nunca dessincroniza do estado real do HA ✅
6. Cliques individuais por dispositivo E clique no conjunto da zona ✅
**Plans:**
- [x] 02-01: Conexão WebSocket e state store reativo
- [x] 02-02: Toggle com Optimistic UI e indicador de conexão
- [ ] 02-03: Fechar Fase 2 — commit final, branch merged, tag `phase-2-done`
**Notas:**
- Durante Phase 2 o `config.json` ainda é hardcoded. Isso é **aceitável** como MVP — o setup wizard da Phase 3 remove essa limitação.
- Bugs resolvidos: listener accumulation (v04121420), clique individual por badge (v04121510)

### Phase 3: Setup Wizard e Descoberta de Entidades
**Goal:** Qualquer cliente com HA consegue criar uma instalação nova, conectar, e mapear zonas/dispositivos pela UI do próprio dmsmart — sem tocar em arquivo nenhum.
**Depends on:** Phase 2
**Success Criteria:**
1. Primeira abertura do app mostra tela de boas-vindas e botão "Adicionar instalação"
2. Wizard pede URL do HA e token (com link de documentação de como gerar)
3. App valida conexão, lista automaticamente todas as entidades do HA (`get_states`)
4. UI permite criar zonas (nome, ícone) e arrastar entidades dentro das zonas
5. Cliente pode ter múltiplas instalações no mesmo dispositivo e alternar entre elas
6. Config de zonas é persistido em localStorage (ainda sem cloud — isso vem na Phase 4)
7. Remover instalação limpa token e config local
**UI hint:** yes (tela nova, flow com múltiplos passos)
**Plans:**
- [ ] 03-01: Modelo de dados de instalação + storage local
- [ ] 03-02: Wizard de conexão (URL, token, validação)
- [ ] 03-03: Tela de descoberta de entidades e criação de zonas
- [ ] 03-04: Seletor de instalação no header + gerenciamento

### Phase 4: Backend Multi-instalação (Supabase)
**Goal:** Cliente cria uma conta dmsmart e as instalações dele sincronizam entre todos os dispositivos (tablet da parede, celular, notebook).
**Depends on:** Phase 3
**Success Criteria:**
1. Signup/login via Supabase Auth (email + senha)
2. Schema: `users → installations → zones → devices`, com RLS por `user_id`
3. Criação/edição de instalação no wizard salva no Supabase
4. Abrir o dmsmart em outro dispositivo (logado na mesma conta) mostra as mesmas instalações
5. Token HA continua **local por dispositivo** (nunca sobe pro Supabase) — cada device pareia uma vez
6. Logout limpa state local
7. RLS auditada: um cliente jamais vê instalação de outro
**Plans:**
- [ ] 04-01: Schema Supabase + policies RLS
- [ ] 04-02: Signup/login UI + integração auth
- [ ] 04-03: Sync de zonas e devices (cloud ← → local)
- [ ] 04-04: Pareamento de dispositivo com token HA (fluxo por device)

### Phase 5: Controles por Tipo de Entidade
**Goal:** Cada tipo de entidade nativa do HA tem uma interface dedicada no card/detalhe — não só toggle binário.
**Depends on:** Phase 3 (entidades vêm do wizard, não mais do JSON)
**Success Criteria:**
1. `light` com dimmer e (quando suportado) cor/temperatura
2. `climate` com ajuste de temperatura e modo (frio/calor/auto)
3. `media_player` com play/pause, volume, fonte
4. `cover` com aberto/fechado e indicador visual de estado
5. `fan` com velocidades
6. `switch` com toggle simples
7. Ações marcadas como críticas pelo cliente (bomba, portão) pedem confirmação
**UI hint:** yes
**Plans:**
- [ ] 05-01: ControlFactory por domínio de entidade
- [ ] 05-02: Modal de detalhe por card com controles específicos
- [ ] 05-03: Marcação de ação crítica no wizard + UI de confirmação

### Phase 6: Energia e Solar
**Goal:** Cliente que tem sensores de energia vê consumo e geração solar em tempo real com saldo e economia em reais.
**Depends on:** Phase 5
**Success Criteria:**
1. Cliente marca no wizard quais entidades são "consumo rede", "geração solar", "bateria" (opcional)
2. Consumo instantâneo (W) e geração solar (W) visíveis no dashboard
3. Gauge indica exportando vs importando
4. Acumulados do dia (kWh) + economia em R$ (tarifa configurável por cliente)
5. Bandeira tarifária ANEEL visível (para clientes BR)
6. Gráfico intraday (última 24h) consumo vs geração
**UI hint:** yes
**Plans:**
- [ ] 06-01: Mapeamento de sensores de energia no wizard
- [ ] 06-02: Dashboard de energia real-time (gauge, totais, economia)
- [ ] 06-03: Gráfico intraday

### Phase 7: Histórico e Analytics
**Goal:** Dados de energia e uso são persistidos no Supabase para análise de longo prazo.
**Depends on:** Phase 6
**Success Criteria:**
1. Snapshots periódicos de sensores salvos no Supabase (por instalação)
2. Gráfico de consumo mensal comparando com mês anterior
3. Ranking de zonas por consumo
4. Economia acumulada mensal em R$
5. Queue offline com IndexedDB — sincroniza quando a internet volta
**Plans:**
- [ ] 07-01: Schema de telemetria + ingestion
- [ ] 07-02: Gráficos históricos e ranking
- [ ] 07-03: Queue offline

### Phase 9: Planta Baixa Interativa
**Goal:** Cada zona/instalação pode ter uma planta baixa (PNG/SVG) com marcadores clicáveis sobre cada luz, tomada, ar-condicionado — o marcador reflete o estado real do HA e acionar ele dispara o serviço correto.
**Depends on:** Phases 1-5 (precisa dos controles funcionando)
**Success Criteria:**
1. Upload de imagem de planta baixa por instalação (salva em localStorage como data URL ou no Supabase depois)
2. Editor visual: arrastar marcadores sobre a imagem, cada marcador vinculado a uma entity do HA
3. Marcador mostra cor do estado (aceso = amarelo/glow, apagado = cinza, indisponível = vermelho)
4. Click no marcador = toggle/call_service correspondente
5. Suporte a múltiplas plantas por instalação (ex: térreo e primeiro andar)
6. Funciona em mobile (pinch-zoom, pan)
**UI hint:** yes — diferencial visual forte, pode virar case de marketing
**Plans:**
- [ ] 09-01: Upload + storage da imagem de planta baixa
- [ ] 09-02: Editor de marcadores (arrastar, vincular entity, salvar posições)
- [ ] 09-03: Runtime clicável (estado real + call_service)
- [ ] 09-04: Multi-planta por instalação + navegação

### Phase 8: Polish e Modo Kiosk
**Goal:** Experiência final para tablet fixo de parede — screensaver, proteção burn-in, atalhos e alertas inteligentes.
**Depends on:** Phases 1-7
**Success Criteria:**
1. Screensaver após 5 min idle (relógio + clima + saldo solar, se configurado)
2. Proteção burn-in (micro-deslocamento)
3. Brilho automático por horário
4. Wake on touch
5. Cenas configuráveis (Boa Noite, Cinema, etc.)
6. Alertas de consumo anormal ou dispositivo ligado há muito tempo
**UI hint:** yes
**Plans:**
- [ ] 08-01: Screensaver + burn-in protection + brilho
- [ ] 08-02: Cenas e atalhos
- [ ] 08-03: Alertas de consumo anormal

## Progress

**Execution Order:**
Phases são sequenciais a partir da 2. Phase 1 já está concluída. Phase 2 precisa ser fechada antes de começar 3.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Shell do Dashboard | 3/3 | Complete | 2026-04-12 |
| 2. Conexão HA (MVP) | 2/3 | Em andamento | — |
| 3. Setup Wizard | 5/5 | Complete | 2026-04-12 |
| 4. Backend Multi-instalação | 0/4 | Not started | — |
| 5. Controles por Entidade | 0/3 | Not started | — |
| 6. Energia e Solar | 0/3 | Not started | — |
| 7. Histórico e Analytics | 0/3 | Not started | — |
| 8. Polish e Kiosk | 0/3 | Not started | — |
| 9. Planta Baixa Interativa | 0/4 | Not started | — |

## Customer Milestones (fora do core do produto)

| Cliente | Milestone | Urgência |
|---------|-----------|----------|
| Casa Jupi-PE | Infraestrutura física elétrica/dados (antes de fechar paredes) | Alta — casa em fundação |

Ver `.planning/customers/casa-jupi.md` para detalhes (ex-Fase 0).
