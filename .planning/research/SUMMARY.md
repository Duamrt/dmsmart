# Project Research Summary

**Project:** dmsmart (dashboard de automacao residencial)
**Domain:** Smart Home Dashboard + Monitoramento Solar + Controle de Dispositivos
**Researched:** 2026-04-12
**Confidence:** HIGH

## Executive Summary

dmsmart e um dashboard de automacao residencial customizado que roda sobre Home Assistant, construido com HTML + CSS + JS vanilla + Supabase -- consistente com toda a stack do Duam. A arquitetura e hibrida: Home Assistant (no Raspberry Pi 5) gerencia todos os dispositivos fisicos via Zigbee e WiFi, enquanto o dmsmart serve como interface visual unica, consumindo a API WebSocket do HA para estado em tempo real e enviando comandos. Supabase armazena apenas historico de energia e logs de longo prazo, nunca participa do controle em tempo real. Essa separacao de responsabilidades e unanime na comunidade HA e funciona bem para projetos de medio porte.

O principal diferencial do projeto e o monitoramento de energia solar integrado ao controle de dispositivos -- saldo em tempo real (gerando vs consumindo), economia em reais, e historico de consumo por zona. A stack recomendada (Pi 5 + NVMe, Zigbee2MQTT, WebSocket API, uPlot para graficos real-time) tem alta confianca em todas as fontes consultadas. O frontend como PWA em tablet kiosk (Fully Kiosk Browser) e o padrao de facto da comunidade.

O risco mais critico NAO e de software -- e de infraestrutura fisica. A casa esta na fase de fundacao (concretagem de sapatas, proximo passo baldrame). Decisoes de cabeamento eletrico (neutro nos interruptores, eletrodutos dimensionados, separacao forca/dados, posicao do rack) precisam acontecer AGORA, antes de fechar paredes. Erros aqui custam reforma. O segundo risco e de UX: o dashboard precisa funcionar para Elyda (nao-dev), nao so para o Duam. Interface minimalista, nomes humanos, feedback visual imediato.

## Key Findings

### Recommended Stack

Hardware: Raspberry Pi 5 8GB com NVMe SSD (nao microSD), coordenador Zigbee ZBT-2 (ou Sonoff ZBDongle-E como fallback), IR blaster (Broadlink RM4) para AC, Shelly EM para consumo no quadro, inversor Growatt para solar. Frontend: HTML/CSS/JS vanilla, home-assistant-js-websocket (biblioteca oficial, 0 deps), uPlot (graficos real-time), Chart.js (graficos estaticos). Tablet: Android 10 polegadas com Fully Kiosk Browser.

**Core technologies:**
- **Raspberry Pi 5 + HAOS:** servidor local 24/7, roda Home Assistant OS com addons -- unanime para novas instalacoes
- **Zigbee2MQTT (nao ZHA):** suporta ~4000 dispositivos, mais estavel com 30+ devices, firmware OTA
- **WebSocket API do HA:** comunicacao bidirecional, ~50ms latencia, subscribe em tempo real -- REST so como fallback
- **home-assistant-js-websocket:** biblioteca oficial JS, 0 dependencias, reconexao automatica
- **uPlot:** graficos time-series 10x mais rapidos que Chart.js, ideal para streaming de dados solar
- **Supabase:** historico de energia e logs (consistente com stack existente), nao participa do tempo real
- **Fully Kiosk Browser:** modo kiosk para tablet de parede, integracao oficial HA, wake por movimento

### Expected Features

**Must have (table stakes):**
- Toggle liga/desliga por zona com feedback visual instantaneo
- Status em tempo real de todos os dispositivos via WebSocket
- Controle de temperatura do AC (nao so on/off)
- Layout responsivo tablet (parede) + mobile (celular)
- Funcionar offline na rede local (PWA + Service Worker)
- Tempo de resposta < 300ms (Optimistic UI)
- Relogio e data visivel no header
- Icones grandes (48px+), fonte minima 18px no tablet

**Should have (diferenciadores):**
- Saldo solar em tempo real (gauge verde/vermelho)
- Consumo e geracao instantaneos (W) + acumulados do dia (kWh)
- Economia em R$ (nao so kWh) com bandeira tarifaria
- Screensaver inteligente (relogio + clima + saldo, previne burn-in)
- Alertas de consumo anormal

**Defer (v2+):**
- Planta baixa interativa (SVG) -- alta complexidade, impressionante mas nao essencial
- Animacoes de fluxo de energia (estilo Tesla Powerwall)
- Historico detalhado com graficos comparativos
- Cenas com 1 toque (Cinema, Boa Noite)
- Projecao de conta em R$, creditos ANEEL
- Gestos avancados (long press dimmer, swipe zonas)

### Architecture Approach

Tres camadas com responsabilidades rigidas: dispositivos fisicos (Zigbee/WiFi) -> Home Assistant (middleware, nunca visivel) -> dmsmart frontend (interface unica). Supabase como quarta camada opcional (nuvem, so historico). O frontend usa um StateStore reativo (Observer pattern, ~50 linhas) com subscricao por entidade e por zona, evitando re-render global. Zone Registry declarativo (as 12 zonas sao fixas -- e uma casa). ControlFactory por tipo de dispositivo (light, climate, media, switch, cover). Service Worker com cache-first para shell e network-only para API do HA. IndexedDB como queue offline para writes do Supabase.

**Major components:**
1. **ha-connection.js** -- WebSocket auth, subscribe events, call_service, reconnect com backoff
2. **state-store.js** -- estado global reativo, subscricao por entidade/zona, ~50 linhas
3. **zone-registry.js** -- 12 zonas declarativas com entities e controls mapeados
4. **ui-renderer.js** -- renderiza cards por zona, ControlFactory por tipo de dispositivo
5. **energy-monitor.js** -- consume sensores de energia do HA, calcula saldo solar
6. **supabase-sync.js** -- historico para Supabase com queue IndexedDB para offline

### Critical Pitfalls

1. **Neutro nos interruptores (BLOQUEANTE)** -- eletricista brasileiro padrao NAO puxa neutro ate o interruptor. Sem neutro, interruptor smart nao funciona. Exigir no projeto eletrico AGORA, antes de puxar fios.
2. **Eletrodutos subdimensionados (BLOQUEANTE)** -- minimo 25mm para pontos simples, 32mm para trechos com muitos cabos. Separar forca de dados. Deixar eletrodutos vazios de reserva entre rack e cada comodo.
3. **Posicao do rack de automacao (BLOQUEANTE)** -- local central, ventilado, com 2x Cat6a, tomada em circuito exclusivo, eletroduto dedicado ate o QDG.
4. **Zigbee2MQTT em vez de ZHA** -- ZHA desestabiliza com 15+ dispositivos. Com 30+ dispositivos previstos, usar Z2M desde o dia 1.
5. **Coordenador Zigbee em cabo extensor USB** -- USB 3.0 interfere em 2.4GHz. Cabo extensor de 50cm+ e obrigatorio.
6. **Inversor solar compativel com HA** -- verificar Modbus local ANTES de comprar. Growatt tem integracao oficial. Perguntar ao instalador.

## Implications for Roadmap

### Fase 0: Infraestrutura Fisica (URGENTE -- durante obra)
**Rationale:** Casa na fase de fundacao. Erros de cabeamento sao irrecuperaveis sem quebrar parede. Precede qualquer software.
**Delivers:** Projeto eletrico validado com requisitos smart home, eletrodutos dimensionados, posicao do rack definida.
**Addresses:** Neutro em interruptores, separacao forca/dados, tomada para tablet, eletroduto QDG-rack, pontos de rede.
**Avoids:** Todos os pitfalls de infraestrutura fisica (os mais caros de corrigir).
**Acoes concretas:** Reuniao com eletricista para revisar diagrama unifilar. Definir posicao do rack. Marcar pontos de tablet na parede.

### Fase 1: Shell do Dashboard (sem HA, sem dispositivos)
**Rationale:** Frontend pode ser desenvolvido em paralelo com a obra. Nao depende de hardware IoT.
**Delivers:** Dashboard visual completo com cards das 12 zonas, dados mock, PWA instalavel, layout responsivo tablet/mobile.
**Addresses:** Layout responsivo, agrupamento por zona, modo escuro, relogio/data, PWA manifest + SW.
**Avoids:** Dashboard que mostra tudo de uma vez (design minimalista desde o inicio).

### Fase 2: Conexao com Home Assistant
**Rationale:** Depende do Pi estar rodando com pelo menos 1 dispositivo. Transforma mock em dados reais.
**Delivers:** Dashboard controlando dispositivos reais via WebSocket. Tap = acao imediata.
**Uses:** home-assistant-js-websocket, StateStore reativo, ha-connection.js com reconnect.
**Addresses:** Status em tempo real, toggle por zona, controle AC, feedback visual, indicador de conexao.
**Avoids:** REST polling (usar WebSocket), estado esperado vs real (sempre refletir estado do HA).

### Fase 3: Controles Avancados + Dispositivos
**Rationale:** Depois que a conexao basica funciona, cada tipo de dispositivo ganha UI dedicada.
**Delivers:** ControlFactory completo (light dimmer, climate temp/modo, media volume/source, switch com confirmacao, cover portao).
**Addresses:** Controle AC completo, portao com confirmacao, bomba dagua, TV/som.
**Avoids:** Pareamento Zigbee no local errado (parear JA no local definitivo), rede sem roteadores.

### Fase 4: Energia e Solar
**Rationale:** Depende do inversor solar e sensores de energia instalados e configurados no HA.
**Delivers:** Painel de energia em tempo real: consumo (W), geracao solar (W), saldo liquido, gauge visual.
**Uses:** energy-monitor.js, uPlot para graficos intraday, sensores Shelly EM + Growatt.
**Addresses:** Saldo solar visual, consumo instantaneo, bandeira tarifaria, economia em R$.
**Avoids:** Inversor incompativel (validar Modbus antes de comprar), dados em kWh sem conversao para R$.

### Fase 5: Historico e Supabase
**Rationale:** Depende de dados de energia acumulados. Supabase entra so quando ha dados para persistir.
**Delivers:** Graficos de consumo por periodo, ranking por zona, economia mensal, background sync offline.
**Uses:** supabase-sync.js, IndexedDB queue, Chart.js para graficos estaticos.
**Addresses:** Historico de consumo, comparativos, tendencias.
**Avoids:** Dashboard dependente de internet (controles ficam 100% local, Supabase e opcional).

### Fase 6: Polish e Kiosk
**Rationale:** So faz sentido polir quando o core funciona no dia a dia.
**Delivers:** Screensaver inteligente, tema automatico, gestos touch, notificacoes de anomalia, experiencia final.
**Addresses:** Burn-in prevention, modo idle util, alertas proativos.
**Avoids:** Tablet com tela sempre ligada queimando, automacoes complexas demais.

### Phase Ordering Rationale

- Fase 0 precede tudo porque a casa esta em obra -- janela de oportunidade fecha quando as paredes fecham
- Fase 1 pode rodar em PARALELO com a obra fisica (frontend puro, sem dependencia de hardware)
- Fases 2 e 3 sao sequenciais (precisa de conexao antes de controles avancados)
- Fases 3 e 4 podem ser parcialmente paralelas (energia nao depende de controles avancados)
- Fase 5 depende de Fase 4 (precisa de dados de energia para historico)
- Fase 6 depende de todas as anteriores (polish e a ultima camada)

### Research Flags

Fases que precisam de pesquisa aprofundada durante o planejamento:
- **Fase 0 (Infra Fisica):** especificidades da NBR 5410, dimensionamento exato por trecho, consulta com eletricista local
- **Fase 4 (Energia Solar):** depende do modelo exato do inversor escolhido, configuracao Modbus, tarifa local da Celpe/Neoenergia

Fases com padroes bem documentados (pular pesquisa):
- **Fase 1 (Shell UI):** HTML/CSS/JS vanilla + PWA, padrao do Duam, zero incerteza
- **Fase 2 (HA Connection):** WebSocket API do HA e muito bem documentada, biblioteca oficial, exemplos abundantes
- **Fase 5 (Supabase):** Duam ja usa Supabase em todos os projetos, padrao estabelecido

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Docs oficiais HA, comunidade unanime em Pi 5 + Zigbee + WebSocket |
| Features | MEDIUM-HIGH | Baseado em dashboards de referencia (ha-fusion, Mushroom) e UX IoT. Contexto brasileiro validado |
| Architecture | HIGH | APIs HA bem documentadas, patterns vanilla JS familiares, separacao de camadas clara |
| Pitfalls | HIGH | Multiplas fontes, comunidade ativa, problemas bem catalogados. Infra fisica validada por NBR |

**Overall confidence:** HIGH

### Gaps to Address

- **Modelo exato do inversor solar:** Growatt e a recomendacao, mas o modelo depende do dimensionamento do sistema (kWp). Definir com instalador solar.
- **Disponibilidade de dispositivos Zigbee no Brasil:** Sonoff ZBMINI-L2 e Aqara FP2 podem nao estar disponiveis localmente. Ter alternativas mapeadas.
- **Tablet para parede:** Modelo exato depende do que estiver disponivel. Lenovo M11 e Fire HD 10 sao sugestoes, nao certezas.
- **Tarifa exata da Celpe/Neoenergia em Jupi-PE:** Necessario para calcular economia em R$. Consultar fatura atual.
- **Posicao exata do rack na planta:** Depende de revisao da planta baixa com eletricista. Deve ser central e ventilado.
- **AC com WiFi nativo vs IR blaster:** IR blaster e mais barato mas desincroniza. AC com WiFi e bidirecional mas custa mais. Decidir por orcamento.
- **Zigbee2MQTT vs ZHA:** Pesquisa recomenda Z2M (mais estavel com 30+ devices), mas STACK.md menciona ZHA. Decisao firme: usar Zigbee2MQTT.

## Cross-Cutting Themes

Padroes que apareceram em MULTIPLOS documentos de pesquisa:

1. **WebSocket > REST:** Mencionado em STACK, ARCHITECTURE e PITFALLS. Unanime.
2. **Offline-first:** STACK (PWA + SW), FEATURES (table stake), ARCHITECTURE (cache strategy), PITFALLS (dashboard que depende de internet).
3. **Zigbee como protocolo principal:** STACK (4000+ devices, mesh), FEATURES (funciona sem internet), PITFALLS (configuracao cuidadosa de rede mesh).
4. **NVMe obrigatorio (nao microSD):** STACK (ponto de falha) e PITFALLS (corrupcao a cada 3-6 meses).
5. **Interface para nao-dev:** FEATURES (anti-features: jargao, entidades cruas) e PITFALLS (Elyda desiste se nao entender).
6. **Energia em R$, nao kWh:** FEATURES (diferenciador) e PITFALLS (dado abstrato sem conversao).

## Sources

### Primary (HIGH confidence)
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/)
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)
- [home-assistant-js-websocket GitHub](https://github.com/home-assistant/home-assistant-js-websocket)
- [Home Assistant Installation - Raspberry Pi](https://www.home-assistant.io/installation/raspberrypi/)
- [Home Assistant Connect ZBT-2](https://www.home-assistant.io/blog/2025/11/19/home-assistant-connect-zbt-2/)
- [MDN Service Workers / Offline PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)

### Secondary (MEDIUM-HIGH confidence)
- [Zigbee2MQTT vs ZHA 2025 - HA Community](https://community.home-assistant.io/t/zigbee2mqtt-vs-zha-in-2025-stability/840615)
- [Zigbee Network Optimization - HA Community](https://community.home-assistant.io/t/zigbee-network-optimization)
- [Smart Home Dashboard UX Design - Developex](https://developex.com/blog/smart-home-dashboard-ux-design/)
- [uPlot GitHub](https://github.com/leeoniya/uPlot)
- [Growatt Integration HA oficial](https://www.home-assistant.io/integrations/growatt_server/)
- [Fully Kiosk Browser HA integration](https://www.home-assistant.io/integrations/fully_kiosk/)

### Tertiary (MEDIUM confidence)
- [Smart Home Protocols Comparison 2026](https://www.smarthomeexplorer.com/guides/matter-vs-zigbee-vs-zwave-vs-wifi-protocol-comparison)
- [Smart Home Failures 2026 - Trunetto](https://www.trunetto.com/blog/most-common-smart-home-failures-in-2026-based-on-50-000-troubleshooting-queries)
- [Bandeiras Tarifarias Brasil](https://blog.luvik.com.br/bandeiras-tarifarias-um-guia-completo/)

---
*Research completed: 2026-04-12*
*Ready for roadmap: yes*
