# Requirements: dmsmart

**Definido:** 2026-04-12
**Core Value:** Controlar qualquer dispositivo da casa e ver o consumo de energia em tempo real, de qualquer lugar, sem depender de app de terceiro.

## v1 Requirements

### Infraestrutura Física (Fase 0 — durante obra)

- [ ] **INFRA-01**: Projeto elétrico revisado com neutro em todos os pontos de interruptor
- [ ] **INFRA-02**: Eletrodutos dimensionados (25mm+ pontos simples, 32mm+ trechos longos), força separada de dados
- [ ] **INFRA-03**: Posição do rack de automação definida (local central, ventilado, circuito exclusivo)
- [ ] **INFRA-04**: Eletrodutos de reserva vazios entre rack e cada cômodo (mínimo 1 por cômodo)
- [ ] **INFRA-05**: Ponto de rede Cat6a em cada cômodo + 2x Cat6a no rack
- [ ] **INFRA-06**: Caixas embutidas para tablets nos pontos de painel (sala obrigatório, suíte opcional)
- [ ] **INFRA-07**: Eletroduto dedicado do rack até o QDG

### Dashboard Shell (Fase 1 — frontend puro)

- [ ] **DASH-01**: Painel principal exibe cards das zonas configuradas agrupados por ambiente (N zonas via config.json — instalação inicial: 6 zonas do escritório)
- [ ] **DASH-02**: Cada card mostra nome do cômodo, ícone e status de todos os dispositivos da zona
- [ ] **DASH-03**: Layout responsivo para tablet 10" (parede) e mobile (celular)
- [ ] **DASH-04**: Modo escuro como padrão, tipografia mínima 18px no tablet
- [ ] **DASH-05**: Relógio e data visíveis permanentemente no header
- [ ] **DASH-06**: PWA instalável (manifest.json + Service Worker)
- [ ] **DASH-07**: Funciona offline na rede local (shell cacheado, sem dependência de internet)
- [ ] **DASH-08**: Zero branding de terceiros visível — 100% identidade dmsmart

### Conexão Home Assistant (Fase 2)

- [ ] **HA-01**: Dashboard conecta ao Home Assistant via WebSocket (home-assistant-js-websocket)
- [ ] **HA-02**: Status de todos os dispositivos atualiza em tempo real (< 300ms)
- [ ] **HA-03**: Indicador visual de conexão HA (online/offline/reconectando)
- [ ] **HA-04**: Reconexão automática com backoff exponencial em caso de queda
- [ ] **HA-05**: Toggle liga/desliga em qualquer dispositivo com feedback visual imediato (Optimistic UI)
- [ ] **HA-06**: Estado do dashboard reflete sempre o estado real do HA (sem dessincronização)

### Controles por Dispositivo (Fase 3)

- [ ] **CTRL-01**: Iluminação: ligar/desligar por zona (12 zonas)
- [ ] **CTRL-02**: Ar-condicionado: ligar/desligar + ajuste de temperatura + modo (frio/calor/auto)
- [ ] **CTRL-03**: TV: ligar/desligar + controle de volume + troca de entrada
- [ ] **CTRL-04**: Sistema de som: ligar/desligar + volume + fonte
- [ ] **CTRL-05**: Bomba d'água: ligar/desligar com confirmação (ação crítica)
- [ ] **CTRL-06**: Portão da garagem: abrir/fechar com confirmação + indicador de estado (aberto/fechado)
- [ ] **CTRL-07**: Chuveiro: controle de temperatura (se smart shower instalado)

### Energia e Solar (Fase 4)

- [ ] **ENRG-01**: Consumo instantâneo da rede elétrica em W (tempo real)
- [ ] **ENRG-02**: Geração solar instantânea em W (tempo real)
- [ ] **ENRG-03**: Saldo solar visual: gauge indica se está exportando ou importando da rede
- [ ] **ENRG-04**: Acumulados do dia: kWh consumido e kWh gerado
- [ ] **ENRG-05**: Economia em R$ do dia (não apenas kWh — usando tarifa local da Celpe/Neoenergia)
- [ ] **ENRG-06**: Bandeira tarifária ANEEL atual exibida no painel
- [ ] **ENRG-07**: Gráfico de consumo vs geração intraday (última 1h e últimas 24h)

### Histórico e Supabase (Fase 5)

- [ ] **HIST-01**: Consumo por zona salvo no Supabase (histórico de longo prazo)
- [ ] **HIST-02**: Gráfico de consumo mensal com comparativo mês anterior
- [ ] **HIST-03**: Ranking de zonas por consumo (qual cômodo gasta mais)
- [ ] **HIST-04**: Economia acumulada mensal em R$ com exportação solar
- [ ] **HIST-05**: Sync offline: dados escritos no IndexedDB quando sem internet, sincronizados quando volta

### Polish e Kiosk (Fase 6)

- [ ] **KIOSK-01**: Screensaver inteligente ativa após 5 min idle (exibe relógio + clima + saldo solar)
- [ ] **KIOSK-02**: Proteção contra burn-in (micro-deslocamento de pixels a cada 30s no screensaver)
- [ ] **KIOSK-03**: Brilho automático por horário (reduz à noite)
- [ ] **KIOSK-04**: Wake on touch (qualquer toque sai do screensaver)
- [ ] **KIOSK-05**: Alertas de consumo anormal (ex: bomba ligada há mais de 2h, AC ligado sem ninguém)
- [ ] **KIOSK-06**: Modo "Boa Noite" (1 toque: apaga luzes, desliga AC, ativa screensaver)

## v2 Requirements

### Automações Avançadas

- **AUTO-01**: Cenas configuráveis (Cinema, Boa Noite, Acordar) com 1 toque
- **AUTO-02**: Automações por horário (ex: ligar luzes externas ao anoitecer)
- **AUTO-03**: Geofencing (ajustar casa quando Duam sai/chega)

### Interface Avançada

- **UI-01**: Planta baixa interativa (SVG da planta real) com dispositivos clicáveis
- **UI-02**: Animações de fluxo de energia estilo Tesla Powerwall
- **UI-03**: Dimmer com gesto de arrastar (não só on/off)

### Energia Avançada

- **ENRG-08**: Projeção de conta de luz do mês em R$
- **ENRG-09**: Créditos ANEEL de energia solar injetada na rede
- **ENRG-10**: Análise de pico de consumo com sugestão de deslocamento de carga

### Integração DM.Stack

- **DMS-01**: Widget do saldo solar no DM.Stack (command center do Duam)
- **DMS-02**: Alertas críticos da casa no feed de alertas do DM.Stack

## Out of Scope

| Feature | Motivo |
|---------|--------|
| Interface do Home Assistant exposta ao usuário | HA fica invisível — dmsmart é a única interface |
| App nativo iOS/Android | PWA resolve com custo zero de loja |
| Câmeras e segurança | Escopo separado, adiciona complexidade e custo significativo |
| Controle por voz (Alexa/Google) como interface principal | Assistentes de voz são periféricos opcionais, não o core |
| Matter como protocolo principal | Imaturo em 2025/2026 (~800 devices vs 4000+ Zigbee) |
| Login/autenticação complexa no tablet da parede | Tablet fixo em casa não precisa de login — anti-pattern de UX |
| Integração com API externa de clima | Clima pode vir do próprio HA (sensor local ou integração gratuita) |

## Traceabilidade

| Requisito | Fase | Status |
|-----------|------|--------|
| INFRA-01 a INFRA-07 | Fase 0 | Pendente |
| DASH-01 a DASH-08 | Fase 1 | Pendente |
| HA-01 a HA-06 | Fase 2 | Pendente |
| CTRL-01 a CTRL-07 | Fase 3 | Pendente |
| ENRG-01 a ENRG-07 | Fase 4 | Pendente |
| HIST-01 a HIST-05 | Fase 5 | Pendente |
| KIOSK-01 a KIOSK-06 | Fase 6 | Pendente |

**Cobertura:**
- Requisitos v1: 45 total
- Mapeados para fases: 45
- Não mapeados: 0 ✓

---
*Requisitos definidos: 2026-04-12*
*Última atualização: 2026-04-12 após inicialização*
