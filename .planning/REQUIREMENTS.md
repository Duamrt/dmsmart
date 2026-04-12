# Requirements: dmsmart

**Definido:** 2026-04-12
**Reestruturado:** 2026-04-12 (redesign para produto SaaS)
**Core Value:** Qualquer pessoa com Home Assistant transforma a casa dela num dashboard próprio e controlável sem editar código.

## v1 Requirements

### Produto (multi-tenancy e onboarding)

- [ ] **PROD-01**: Cliente cria conta (email + senha) via Supabase Auth
- [ ] **PROD-02**: Cliente pode ter N instalações (ex: casa + escritório) na mesma conta
- [ ] **PROD-03**: Wizard de adição de instalação — cliente fornece URL do HA e token, app valida
- [ ] **PROD-04**: App descobre automaticamente todas as entidades do HA (`get_states`) ao concluir o wizard
- [ ] **PROD-05**: Cliente cria zonas (nome + ícone) e arrasta entidades descobertas para dentro, tudo pela UI
- [ ] **PROD-06**: Config de zonas/devices sincroniza entre dispositivos da mesma conta (via Supabase)
- [ ] **PROD-07**: Token HA é persistido **apenas localmente** (nunca no Supabase), pareamento por dispositivo
- [ ] **PROD-08**: RLS garante que um cliente jamais vê instalação/entidade de outro
- [ ] **PROD-09**: Cliente pode editar/remover zonas, entidades e instalações a qualquer momento
- [ ] **PROD-10**: Seletor de instalação no header quando cliente tem mais de uma
- [ ] **PROD-11**: Logout limpa state local (token, cache de zonas)
- [ ] **PROD-12**: Zero hardcode de entidade ou zona específica no código-fonte

### Dashboard Shell (Fase 1) ✅

- [x] **DASH-01**: Painel exibe cards das zonas configuradas (N zonas via config)
- [x] **DASH-02**: Cada card mostra nome, ícone e status dos devices da zona
- [x] **DASH-03**: Layout responsivo (tablet 10" e mobile)
- [x] **DASH-04**: Dark mode padrão, tipografia ≥ 18px no tablet
- [x] **DASH-05**: Relógio e data no header permanentemente
- [x] **DASH-06**: PWA instalável (manifest + SW)
- [x] **DASH-07**: Funciona offline (shell cacheado)
- [x] **DASH-08**: Zero branding de terceiros

### Conexão Home Assistant (Fase 2)

- [x] **HA-01**: Conexão via WebSocket usando URL + token por instalação
- [x] **HA-02**: Status de todos os devices atualiza em tempo real (< 300ms)
- [x] **HA-03**: Indicador visual de conexão (online/offline/reconectando/auth_invalid)
- [x] **HA-04**: Reconexão automática com backoff exponencial
- [x] **HA-05**: Toggle com feedback visual imediato (Optimistic UI)
- [x] **HA-06**: Estado do dashboard sincronizado com HA real (sem drift)
- [x] **HA-07**: Clique individual em cada dispositivo + clique no conjunto da zona

### Setup Wizard e Descoberta (Fase 3)

- [ ] **WIZ-01**: Primeira abertura sem instalação exibe tela de onboarding
- [ ] **WIZ-02**: Wizard passo-a-passo: nome → URL HA → token → validação
- [ ] **WIZ-03**: Link para documentação de como criar token de longa duração no HA
- [ ] **WIZ-04**: Após conectar, app lista todas as entidades agrupadas por domínio (light/switch/climate/...)
- [ ] **WIZ-05**: UI para criar zonas (nome + escolha de ícone de uma biblioteca)
- [ ] **WIZ-06**: Drag-and-drop ou seleção de entidades para dentro de zonas
- [ ] **WIZ-07**: Marcar ações críticas (confirmação obrigatória, ex: portão, bomba)
- [ ] **WIZ-08**: Preview do card antes de salvar
- [ ] **WIZ-09**: Editar instalação existente reentra no wizard com dados preenchidos

### Controles por Tipo de Entidade (Fase 5)

- [ ] **CTRL-01**: `light` — toggle, dimmer (brightness), cor/temperatura quando suportado
- [ ] **CTRL-02**: `climate` — on/off, temperatura alvo, modo (frio/calor/auto), temperatura atual
- [ ] **CTRL-03**: `media_player` — play/pause, volume, fonte/entrada
- [ ] **CTRL-04**: `cover` — abrir/fechar com indicador de estado atual
- [ ] **CTRL-05**: `fan` — on/off, velocidades
- [ ] **CTRL-06**: `switch` — toggle simples
- [ ] **CTRL-07**: Ações marcadas como críticas pedem confirmação modal antes de acionar
- [ ] **CTRL-08**: Modal de detalhe do dispositivo abre ao clicar longo ou ícone de expandir

### Energia e Solar (Fase 6)

- [ ] **ENRG-01**: Wizard marca entidades como "consumo rede", "geração solar", "bateria" (opcional)
- [ ] **ENRG-02**: Consumo instantâneo da rede em W (real-time)
- [ ] **ENRG-03**: Geração solar instantânea em W (real-time)
- [ ] **ENRG-04**: Gauge visual de saldo (exportando vs importando)
- [ ] **ENRG-05**: Acumulados do dia (kWh consumido + gerado)
- [ ] **ENRG-06**: Economia em R$ do dia (tarifa configurável por cliente)
- [ ] **ENRG-07**: Bandeira tarifária ANEEL (opcional, só BR)
- [ ] **ENRG-08**: Gráfico intraday (última 24h) consumo vs geração

### Histórico e Analytics (Fase 7)

- [ ] **HIST-01**: Snapshots de sensores salvos no Supabase por instalação
- [ ] **HIST-02**: Gráfico de consumo mensal comparando com mês anterior
- [ ] **HIST-03**: Ranking de zonas por consumo
- [ ] **HIST-04**: Economia acumulada mensal em R$
- [ ] **HIST-05**: Queue offline com IndexedDB — sincroniza quando a internet volta

### Polish e Modo Kiosk (Fase 8)

- [ ] **KIOSK-01**: Screensaver após 5 min idle (relógio + clima + saldo solar se configurado)
- [ ] **KIOSK-02**: Proteção burn-in (micro-deslocamento a cada 30s no screensaver)
- [ ] **KIOSK-03**: Brilho automático por horário
- [ ] **KIOSK-04**: Wake on touch
- [ ] **KIOSK-05**: Alertas de consumo anormal configuráveis por cliente
- [ ] **KIOSK-06**: Cenas configuráveis pelo cliente (ex: "Boa Noite", "Cinema")

## v2 Requirements

### Automações

- **AUTO-01**: Editor de cenas dentro do dmsmart (não só atalhos)
- **AUTO-02**: Gatilhos por horário
- **AUTO-03**: Geofencing (chegando em casa / saindo)

### Interface Avançada

- **UI-01**: Planta baixa interativa (SVG por instalação)
- **UI-02**: Animações de fluxo de energia estilo Tesla Powerwall
- **UI-03**: Temas personalizados por cliente

### Energia Avançada

- **ENRG-09**: Projeção de conta do mês em R$
- **ENRG-10**: Créditos ANEEL injetados na rede
- **ENRG-11**: Análise de pico e sugestão de deslocamento de carga

### Produto / Monetização

- **PROD-V2-01**: Planos (free / pro) com limites de instalações e histórico
- **PROD-V2-02**: Billing recorrente via gateway (Stripe/Mercado Pago)
- **PROD-V2-03**: Painel admin para Duam gerenciar base de clientes

### Integrações DM

- **DMS-01**: Widget de instalação favorita no DM.Stack
- **DMS-02**: Alertas críticos do dmsmart no feed de alertas do DM.Stack

## Out of Scope

| Feature | Motivo |
|---------|--------|
| UI do Home Assistant exposta ao usuário | HA fica invisível — dmsmart é a única UI |
| App nativo iOS/Android | PWA resolve com zero custo de loja |
| Câmeras e segurança | Escopo separado, alta complexidade |
| Alexa/Google como UI principal | Assistentes de voz são periféricos opcionais |
| Matter como protocolo principal | Imaturo em 2025/2026 |
| Login no tablet fixo da parede | Tablet fixo não precisa de login — antipadrão UX (pareamento fica por device) |
| Integração com API de clima externa | Sensor local do HA já resolve |
| Hardcode de 12 zonas "da casa do Duam" | ❌ Produto é multi-instalação, cada cliente define suas zonas |

## Traceabilidade

| Grupo | Fase | Requisitos |
|-------|------|-----------|
| Produto (multi-tenancy) | 3, 4 | PROD-01 a PROD-12 |
| Shell | 1 ✅ | DASH-01 a DASH-08 |
| Conexão HA | 2 | HA-01 a HA-07 |
| Setup Wizard | 3 | WIZ-01 a WIZ-09 |
| Backend | 4 | PROD-06, PROD-07, PROD-08 |
| Controles | 5 | CTRL-01 a CTRL-08 |
| Energia | 6 | ENRG-01 a ENRG-08 |
| Histórico | 7 | HIST-01 a HIST-05 |
| Kiosk | 8 | KIOSK-01 a KIOSK-06 |

**Cobertura:**
- Requisitos v1: 60 total (12 produto + 8 shell + 7 HA + 9 wizard + 8 controles + 8 energia + 5 histórico + 6 kiosk, menos alguns que se sobrepõem)
- Todos mapeados para fases ✓

## Infraestrutura Física (cliente Casa Jupi)

Os antigos requisitos `INFRA-01` a `INFRA-07` foram movidos para `.planning/customers/casa-jupi.md` — eles pertencem a **um cliente específico** (casa do Duam em obra), não ao produto. Nenhum cliente novo do dmsmart precisa reformar a casa pra usar.

---
*Requisitos definidos: 2026-04-12*
*Redesign para produto SaaS: 2026-04-12*
