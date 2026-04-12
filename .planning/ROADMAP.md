# Roadmap: dmsmart

## Overview

dmsmart vai da infraestrutura fisica da casa (em obra) ate um dashboard completo de automacao residencial. A Fase 0 (checklist eletrico) e a Fase 1 (frontend puro) rodam em paralelo -- a obra nao bloqueia o desenvolvimento do software. A partir da Fase 2, o dashboard conecta ao Home Assistant real e evolui: controles por dispositivo, energia solar, historico em nuvem, e polish final para tablet de parede.

## Phases

**Phase Numbering:**
- Integer phases (0, 1, 2...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 0: Infraestrutura Fisica** - Checklist eletrico para o eletricista antes de fechar paredes
- [x] **Phase 1: Shell do Dashboard** - Frontend completo com dados mock, PWA instalavel, sem hardware
- [ ] **Phase 2: Conexao Home Assistant** - WebSocket real-time, status e toggle de dispositivos reais
- [ ] **Phase 3: Controles Avancados** - UI dedicada por tipo de dispositivo (AC, TV, som, bomba, portao)
- [ ] **Phase 4: Energia e Solar** - Monitoramento de consumo e geracao solar em tempo real com economia em R$
- [ ] **Phase 5: Historico e Supabase** - Persistencia de longo prazo, graficos comparativos, sync offline
- [ ] **Phase 6: Polish e Kiosk** - Screensaver, burn-in protection, alertas e modo Boa Noite

## Phase Details

### Phase 0: Infraestrutura Fisica
**Goal**: Garantir que toda a infraestrutura eletrica e de dados da casa esteja preparada para automacao antes de fechar as paredes
**Depends on**: Nothing (urgente -- casa em obra)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07
**Success Criteria** (what must be TRUE):
  1. Projeto eletrico revisado tem neutro em todos os pontos de interruptor
  2. Eletrodutos dimensionados (25mm+ simples, 32mm+ longos) com forca e dados separados
  3. Posicao do rack de automacao definida em local central e ventilado com circuito exclusivo
  4. Pelo menos 1 eletroduto de reserva vazio entre rack e cada comodo
  5. Caixa embutida para tablet marcada na parede da sala
**Plans**: TBD

Plans:
- [ ] 00-01: Revisao do projeto eletrico com eletricista
- [ ] 00-02: Posicionamento do rack e infraestrutura de rede

### Phase 1: Shell do Dashboard
**Goal**: Dashboard visual completo das zonas configuradas (N zonas via config.json) funcionando como PWA, com dados mock, pronto para receber dados reais
**Depends on**: Nothing (roda em paralelo com Fase 0)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08
**Success Criteria** (what must be TRUE):
  1. Painel exibe cards das zonas configuradas (N zonas via config.json) agrupados por ambiente com icones e status mock
  2. Layout funciona em tablet 10" (landscape) e celular (portrait) sem scroll horizontal
  3. Modo escuro ativo por padrao com fonte minima 18px no tablet
  4. PWA instalavel no celular e tablet (manifest + Service Worker + cache offline)
  5. Nenhum logo, nome ou branding de terceiros visivel na interface
**Plans**: TBD
**UI hint**: yes

Plans:
- [x] 01-01: Estrutura HTML e layout responsivo das 12 zonas
- [x] 01-02: Config, Zone Registry, State Store, UI Renderer
- [x] 01-03: PWA manifest, Service Worker e cache offline

### Phase 2: Conexao Home Assistant
**Goal**: Dashboard conecta ao Home Assistant via WebSocket e controla dispositivos reais com feedback instantaneo
**Depends on**: Phase 1 (shell precisa existir), Home Assistant rodando no Pi com pelo menos 1 dispositivo
**Requirements**: HA-01, HA-02, HA-03, HA-04, HA-05, HA-06
**Success Criteria** (what must be TRUE):
  1. Dashboard conecta ao HA via WebSocket e exibe status real de todos os dispositivos
  2. Toggle liga/desliga de qualquer dispositivo reflete no HA em menos de 300ms (Optimistic UI)
  3. Indicador visual mostra se conexao com HA esta online, offline ou reconectando
  4. Reconexao automatica funciona apos queda de rede (backoff exponencial)
  5. Estado do dashboard nunca dessincroniza do estado real do HA
**Plans**: TBD

Plans:
- [ ] 02-01: Conexao WebSocket e state store reativo
- [ ] 02-02: Toggle de dispositivos com Optimistic UI e indicador de conexao

### Phase 3: Controles Avancados
**Goal**: Cada tipo de dispositivo tem interface de controle dedicada alem do simples liga/desliga
**Depends on**: Phase 2 (conexao HA funcionando)
**Requirements**: CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06, CTRL-07
**Success Criteria** (what must be TRUE):
  1. AC pode ser ligado/desligado com ajuste de temperatura e modo (frio/calor/auto)
  2. TV e som podem ser controlados (volume, entrada/fonte) sem sair do dashboard
  3. Bomba d'agua e portao exigem confirmacao antes de acionar (acoes criticas)
  4. Portao exibe indicador visual do estado atual (aberto/fechado)
  5. Iluminacao das 12 zonas funciona com toggle individual por zona
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: ControlFactory por tipo de dispositivo (light, climate, media)
- [ ] 03-02: Controles criticos (bomba, portao) com confirmacao e estado

### Phase 4: Energia e Solar
**Goal**: Monitorar consumo e geracao solar em tempo real com saldo visual e economia em reais
**Depends on**: Phase 2 (conexao HA), inversor solar e sensores de energia instalados e configurados no HA
**Requirements**: ENRG-01, ENRG-02, ENRG-03, ENRG-04, ENRG-05, ENRG-06, ENRG-07
**Success Criteria** (what must be TRUE):
  1. Consumo instantaneo da rede (W) e geracao solar (W) visiveis no dashboard
  2. Gauge visual indica se a casa esta exportando ou importando energia da rede
  3. Acumulados do dia (kWh consumido e kWh gerado) e economia em R$ visiveis
  4. Bandeira tarifaria ANEEL atual exibida no painel
  5. Grafico intraday mostra consumo vs geracao das ultimas 24h
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 04-01: Sensores de energia e saldo solar em tempo real
- [ ] 04-02: Graficos intraday e calculo de economia em R$

### Phase 5: Historico e Supabase
**Goal**: Persistir dados de energia no Supabase para analise de longo prazo com sync offline
**Depends on**: Phase 4 (dados de energia existem para persistir)
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05
**Success Criteria** (what must be TRUE):
  1. Consumo por zona e salvo no Supabase e pode ser consultado por periodo
  2. Grafico mensal compara consumo do mes atual com mes anterior
  3. Ranking de zonas por consumo mostra qual comodo gasta mais
  4. Economia acumulada mensal em R$ com exportacao solar e visivel
  5. Dados escritos offline (sem internet) sincronizam automaticamente quando conexao volta
**Plans**: TBD

Plans:
- [ ] 05-01: Schema Supabase e sync de consumo por zona
- [ ] 05-02: Graficos historicos e ranking por zona
- [ ] 05-03: Queue offline com IndexedDB e sync automatico

### Phase 6: Polish e Kiosk
**Goal**: Experiencia final de tablet de parede com screensaver inteligente, protecao burn-in e atalhos do dia a dia
**Depends on**: Phases 1-5 (core precisa funcionar no dia a dia antes de polir)
**Requirements**: KIOSK-01, KIOSK-02, KIOSK-03, KIOSK-04, KIOSK-05, KIOSK-06
**Success Criteria** (what must be TRUE):
  1. Screensaver ativa apos 5 min idle exibindo relogio, clima e saldo solar
  2. Tela nao sofre burn-in (micro-deslocamento ativo no screensaver)
  3. Brilho da tela reduz automaticamente a noite
  4. Qualquer toque acorda o tablet e mostra o dashboard
  5. Modo "Boa Noite" apaga luzes e desliga AC com 1 toque
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 06-01: Screensaver com burn-in protection e brilho automatico
- [ ] 06-02: Alertas de consumo anormal e modo Boa Noite

## Progress

**Execution Order:**
Phases 0 and 1 run in parallel. After that: 2 -> 3 -> 4 -> 5 -> 6.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Infraestrutura Fisica | 0/2 | Not started | - |
| 1. Shell do Dashboard | 3/3 | Complete | 2026-04-12 |
| 2. Conexao Home Assistant | 0/2 | Not started | - |
| 3. Controles Avancados | 0/2 | Not started | - |
| 4. Energia e Solar | 0/2 | Not started | - |
| 5. Historico e Supabase | 0/3 | Not started | - |
| 6. Polish e Kiosk | 0/2 | Not started | - |
