# Pitfalls Research -- dmsmart

**Domain:** Smart Home Dashboard + Residential Automation (casa em construcao)
**Researched:** 2026-04-12
**Overall confidence:** HIGH (multiplas fontes, comunidade ativa, problemas bem documentados)

---

## Physical Infrastructure Mistakes

Estes sao os pitfalls mais criticos porque a casa esta na fase de fundacao -- erros aqui custam reforma depois.

### CRITICO: Fio neutro em TODAS as caixas de interruptor

**O que da errado:** Interruptores inteligentes (Zigbee, WiFi) precisam de fio neutro para funcionar. Em instalacoes brasileiras tradicionais, o eletricista so puxa fase e retorno ate o interruptor -- sem neutro. Resultado: voce compra o interruptor smart e nao consegue instalar.

**Prevencao:** Exigir no projeto eletrico que TODAS as caixas de interruptor recebam fase, retorno E neutro. Isso e barato na construcao (um fio a mais) e impossivel de consertar depois sem quebrar parede.

**Deteccao:** Revisar o diagrama unifilar com o eletricista antes de puxar fios. Se ele disser "nao precisa de neutro no interruptor", insistir -- ele esta pensando em instalacao convencional.

### CRITICO: Eletrodutos subdimensionados

**O que da errado:** Eletroduto de 20mm (3/4") mal passa 3 cabos. Se voce precisar adicionar um cabo de rede ou um fio extra depois, nao cabe. A NBR 5410 limita a ocupacao a 40% da secao do eletroduto.

**Prevencao:** 
- Eletrodutos de forca (110/220V): minimo 25mm (1") para pontos simples, 32mm para pontos com muitos circuitos
- Eletrodutos de dados/automacao: SEPARADOS dos de forca, minimo 25mm
- Deixar eletrodutos vazios (reserva) entre o QDC (quadro de conectividade) e cada comodo -- um eletroduto vazio de 32mm custa centavos na obra e vale ouro depois
- Maximo 15 metros sem caixa de passagem (norma NBR 16415)

**Deteccao:** Contar quantos cabos passam por cada trecho e calcular ocupacao. Se estiver acima de 40%, aumentar o diametro.

### CRITICO: Nao separar cabeamento de forca e dados

**O que da errado:** Cabo de rede (Cat6) passando junto com cabo de forca sofre interferencia eletromagnetica. Resultado: rede instavel, perda de pacotes, Zigbee com problemas.

**Prevencao:** 
- Eletrodutos separados fisicamente: um para forca (127/220V), outro para dados (Cat6, HDMI, coaxial)
- Se cruzarem, cruzar a 90 graus
- Distancia minima de 30cm entre eletrodutos de forca e dados correndo paralelos

### CRITICO: Nao prever ponto de rede e energia para o hub central

**O que da errado:** O Raspberry Pi com Home Assistant precisa ficar em local central da casa (para o Zigbee ter alcance), com cabo de rede (nao WiFi -- servidor precisa ser estavel), tomada dedicada (nao no mesmo circuito de eletrodomesticos que causam pico).

**Prevencao:**
- Definir agora onde fica o "rack" (mesmo que seja uma caixa na parede)
- Puxar 2x Cat6a ate la (redundancia)
- Tomada em circuito exclusivo para equipamentos de rede
- Local ventilado (nao dentro de armario fechado sem ventilacao)
- Posicao central na planta, preferencialmente elevada

### IMPORTANTE: Tomadas USB em pontos estrategicos

**O que da errado:** Tablets de parede (modo kiosk) precisam de energia constante. Se nao tiver tomada atras do ponto do tablet, fica um cabo aparente descendo pela parede.

**Prevencao:**
- Prever tomada embutida (ou saida USB) atras de cada ponto onde vai ter tablet/painel fixo
- Para a sala (painel principal): caixa 4x4 com tomada + ponto de rede na altura do tablet
- Considerar alimentacao PoE (Power over Ethernet) se usar tablet com adaptador PoE

### IMPORTANTE: Caixas de passagem acessiveis

**O que da errado:** Eletricista embutir caixa de passagem atras de movel planejado ou em local inacessivel. Quando precisar puxar cabo novo, nao consegue acessar.

**Prevencao:** Mapear layout de moveis ANTES de definir posicao das caixas de passagem. Caixas devem ficar em locais acessiveis (alto na parede, acima de portas, no teto com tampa).

### MODERADO: Nao prever circuitos dedicados para AC

**O que da errado:** Ar-condicionado smart (controlado via IR blaster ou integracao direta) precisa de circuito dedicado. Se compartilhar circuito com outros aparelhos, o disjuntor desarma e o AC "desliga sozinho" -- o dashboard mostra ligado mas esta desligado.

**Prevencao:** Circuito exclusivo para cada AC, com disjuntor individual no QDG.

### MODERADO: Nao prever eletroduto do QDG ao rack de automacao

**O que da errado:** Sensores de consumo de energia (CT clamps) ficam no quadro de distribuicao. O Raspberry Pi fica no rack. Se nao tiver eletroduto entre os dois, nao tem como passar o cabo do sensor.

**Prevencao:** Eletroduto dedicado de 25mm entre o QDG e o local do rack/servidor.

---

## Home Assistant Configuration Mistakes

### CRITICO: Usar REST API em vez de WebSocket para o dashboard

**O que da errado:** A REST API do HA e para consultas pontuais. Se o dashboard ficar fazendo polling via REST (ex: fetch a cada 2 segundos), gera latencia, carga desnecessaria e a interface fica "defasada" -- voce liga a luz e o dashboard demora 2-3s para refletir.

**Prevencao:** Usar WebSocket API do Home Assistant para o dashboard. WebSocket e bidirecional, ~50ms de latencia, e recebe eventos em tempo real sem polling. A REST API esta sendo gradualmente descontinuada em favor do WebSocket.

**Impacto no dmsmart:** O projeto esta planejado para usar REST API. MUDAR para WebSocket e a decisao mais impactante desta pesquisa. O codigo JS vanilla conecta via WebSocket normalmente -- nao precisa de framework.

### CRITICO: Rodar Home Assistant em cartao SD

**O que da errado:** Cartao SD corrompe com as escritas constantes do HA (logs, banco de dados, estados). Relatos de corrupcao a cada 3-6 meses. Voce perde toda a configuracao, historico e automacoes.

**Prevencao:** 
- Usar SSD via USB desde o dia 1 (nao SD)
- Raspberry Pi 5 suporta boot direto por USB/NVMe
- Se usar Pi 4, boot via USB 3.0 com SSD SATA em case USB
- NUNCA ter duas unidades com HA OS conectadas ao mesmo tempo
- Backup automatico semanal para nuvem (Google Drive addon)

**Deteccao:** Monitorar saude do disco via addon "System Monitor". Cartao SD com erros de I/O = morte iminente.

### CRITICO: Escolher ZHA quando vai escalar para muitos dispositivos

**O que da errado:** ZHA (Zigbee Home Automation) e built-in e facil de configurar, mas a partir de ~15 dispositivos comeca a ter desconexoes aleatorias. Suporte a dispositivos mais limitado (especialmente Tuya, Aqara).

**Prevencao:** Comecar com Zigbee2MQTT desde o inicio. Sim, requer instalar Mosquitto (MQTT broker) como addon, mas:
- Suporta ~4000 dispositivos vs menos no ZHA
- Mais estavel em redes grandes
- Atualizacao de firmware OTA para mais fabricantes
- Comunidade maior e converters mais rapidos para dispositivos novos

**Para o dmsmart:** Com 12 zonas e multiplos dispositivos por zona, facilmente passa de 30 dispositivos Zigbee. Zigbee2MQTT e a escolha certa.

### IMPORTANTE: Nao fazer backup antes de atualizar HA

**O que da errado:** Atualizacao do Home Assistant quebra integracao, addon ou automacao. Sem backup, nao tem como voltar.

**Prevencao:** Backup automatico antes de cada atualizacao (configuravel no HA). Manter pelo menos 3 backups.

### MODERADO: Instalar tipo errado do HA

**O que da errado:** Instalar HA Container (Docker) sem experiencia com Docker = sem addons, sem supervisor, atualizacao manual. Ou instalar HA Core (Python venv) = ainda pior.

**Prevencao:** Instalar Home Assistant OS (HAOS) no Raspberry Pi. E a opcao completa: supervisor, addons, atualizacoes automaticas, backups integrados.

---

## Dashboard UX Mistakes

### CRITICO: Dashboard que mostra tudo de uma vez

**O que da errado:** Colocar todos os 12 comodos, todos os dispositivos, graficos de energia, cameras -- tudo numa tela so. Resultado: ninguem usa porque nao acha o que precisa. Elyda (esposa) desiste e volta a usar interruptor fisico.

**Prevencao:** 
- Tela principal: so o essencial (luzes das zonas ativas, AC, status geral de energia)
- Detalhes em sub-telas (clicar em "Sala" para ver controles detalhados)
- Regra: se tem mais de 8-10 controles visiveis, esta lotado demais
- Pensar "o que alguem quer fazer as 23h sonolento?" -- ligar/desligar luz, ajustar AC, so isso

### CRITICO: Dashboard que so o dev entende

**O que da errado:** Voce (dev) cria dashboard com entidades nomeadas "switch.sonoff_1001a2b3", graficos com eixos tecnicos, terminologia de HA. Funciona pra voce. Elyda olha e nao entende nada.

**Prevencao:**
- Nomes humanos: "Luz da Sala", nao "switch.zigbee_0x00158d..."
- Icones grandes e claros
- Feedback visual imediato (luz acesa = icone amarelo, apagada = cinza)
- Testar com Elyda antes de considerar "pronto"
- Zero jargao tecnico na interface

### IMPORTANTE: Controles que nao refletem estado real

**O que da errado:** Voce clica "ligar luz" e o botao fica "ligado", mas a luz nao acendeu (dispositivo offline, zigbee falhou). O dashboard mente.

**Prevencao:**
- Sempre refletir o estado real do dispositivo (via WebSocket), nao o estado "esperado"
- Indicador visual de dispositivo offline/indisponivel (ex: icone com borda vermelha)
- Nao confiar em "otimistic mode" para dispositivos criticos

### IMPORTANTE: Graficos de energia sem contexto

**O que da errado:** Grafico mostra "3.2 kWh" e ninguem sabe se isso e muito ou pouco. Numero sem comparacao e inutil.

**Prevencao:**
- Comparar com dia anterior, semana anterior, mes anterior
- Mostrar em reais (R$), nao so kWh -- custo tangivel
- Destaque visual quando consumo esta acima do normal
- Meta de consumo visivel

### MODERADO: Dashboard que depende de internet

**O que da errado:** Graficos carregam do Supabase (nuvem). Internet cai. Dashboard fica em branco ou com erro.

**Prevencao:**
- Controles de dispositivos: 100% via rede local (WebSocket pro HA)
- Historico/graficos: cache local dos ultimos 7 dias, Supabase e para historico longo
- Service Worker com fallback offline para controles basicos

### MODERADO: Tablet de parede com tela sempre ligada queima

**O que da errado:** Tablet em modo kiosk com tela sempre 100% de brilho. Em 6-12 meses: burn-in, bateria inchada, superaquecimento.

**Prevencao:**
- Sensor de presenca (PIR) para ligar tela so quando alguem se aproxima
- Brilho automatico (sensor de luz ambiente)
- Desligar tela entre 23h e 6h (ou brilho minimo)
- Se possivel, tablet com carregamento lento (nao fast charge) para preservar bateria
- Considerar alimentacao direta removendo bateria (mod avancado)

---

## Zigbee Network Mistakes

### CRITICO: Coordenador Zigbee plugado direto no Raspberry Pi USB 3.0

**O que da errado:** Portas USB 3.0 emitem interferencia na faixa 2.4GHz -- exatamente onde o Zigbee opera. Resultado: alcance reduzido drasticamente, dispositivos caem.

**Prevencao:**
- Cabo extensor USB de pelo menos 50cm (blindado) entre o dongle Zigbee e o Pi
- Usar porta USB 2.0 se disponivel
- Nunca colocar o dongle atras do Pi encostado na placa

### CRITICO: Pareamento de dispositivos no local errado

**O que da errado:** Voce pareia todos os sensores/lampadas perto do coordenador (na bancada) e depois instala nos comodos. O dispositivo Zigbee grava a rota direta para o coordenador. Quando vai para o comodo distante, fica fora de alcance e nao reconecta direito.

**Prevencao:**
- Instalar os roteadores Zigbee (lampadas smart, tomadas smart) nos locais finais PRIMEIRO
- Depois parear os end-devices (sensores, interruptores) JA no local definitivo
- Roteadores formam o backbone da mesh -- sem eles no lugar, a mesh nao existe

### CRITICO: Rede so com end-devices, sem roteadores

**O que da errado:** Sensores de porta, sensores de temperatura, interruptores de bateria sao "end-devices" -- nao retransmitem sinal. Se sua rede so tem esses + o coordenador, nao tem mesh. Alcance = alcance direto do coordenador.

**Prevencao:**
- Regra: 1 roteador para cada 6-8 end-devices
- Roteadores comuns: lampadas smart, tomadas smart (com fio, sempre ligadas)
- Posicionar roteadores estrategicamente para cobrir a casa toda
- No dmsmart: as 12 zonas de iluminacao com lampadas Zigbee JA sao roteadores se forem sempre energizadas (interruptor smart no lugar do interruptor fisico, nao corta energia da lampada)

### IMPORTANTE: Canal Zigbee conflitando com WiFi

**O que da errado:** Zigbee opera em 2.4GHz, mesmo espectro do WiFi. WiFi emite "sideband lobes" que podem afogar o Zigbee mesmo sem sobreposicao direta.

**Prevencao:**
- Configurar WiFi nos canais 1 e 6 (ou 1 e 11)
- Configurar Zigbee no canal 15 ou 25 (distante dos canais WiFi)
- Evitar WiFi canal 11 se Zigbee estiver nos canais 22-24
- Roteador WiFi e coordenador Zigbee: distancia minima de 1 metro

### MODERADO: Coordenador em local ruim

**O que da errado:** Coordenador Zigbee atras da TV, dentro de rack fechado, no chao, encostado em metal ou vidro. Metal e vidro bloqueiam/refletem 2.4GHz.

**Prevencao:**
- Posicao central na casa, elevado (1.5m+)
- Longe de metal, vidro, micro-ondas
- Area aberta, nao dentro de armario
- No dmsmart: considerar essa posicao ao definir onde fica o rack de automacao

---

## Solar Integration Gotchas

### CRITICO: Escolher inversor sem checar compatibilidade com Home Assistant

**O que da errado:** Voce compra o inversor solar e descobre que nao tem integracao com HA, ou a integracao e via API cloud do fabricante (instavel, fora do ar as vezes, sem modo offline).

**Prevencao:**
- Marcas com boa integracao HA: **Fronius**, **SMA**, **Huawei** (via Modbus local), **SolarEdge**
- No Brasil, marcas comuns: **Growatt** (tem integracao HACS via cloud -- funcional mas depende de internet), **Canadian Solar** (limitado), **Deye/Solis** (instavel via SolisCloud API)
- IDEAL: inversor com Modbus local (nao depende de cloud do fabricante)
- Perguntar ao instalador ANTES de comprar: "esse inversor tem Modbus RS485 ou TCP local?"

### IMPORTANTE: Fronius em modo economia nao reporta dados

**O que da errado:** Inversores Fronius entram em modo economia a noite (sem sol). Nesse modo, a integracao HA nao recebe dados fotovoltaicos. Se voce adicionar a integracao a noite, ela nao encontra entidades solares.

**Prevencao:** Configurar integracao solar durante o dia, com sol. Entidades noturnas (consumo da rede) funcionam sempre.

### IMPORTANTE: Modbus so aceita uma conexao

**O que da errado:** Inversores Huawei/SMA via Modbus so aceitam UMA conexao simultanea. Se o app do fabricante estiver conectado, a integracao HA nao conecta (e vice-versa).

**Prevencao:** Desabilitar monitoramento do app do fabricante se usar Modbus direto com HA. Ou usar integracao via cloud (menos ideal).

### MODERADO: Dados de energia sem conversao para R$

**O que da errado:** HA mostra kWh gerados/consumidos. Sem conversao para reais, o dado e abstrato e ninguem presta atencao.

**Prevencao:** Configurar o Energy Dashboard do HA com o custo por kWh da concessionaria (Celpe/Neoenergia em PE). Atualizar quando a tarifa mudar. No dmsmart, mostrar sempre em R$.

### MODERADO: Sincronizacao de horario

**O que da errado:** Diferenca de horario entre Raspberry Pi e servidor do inversor maior que 15 minutos causa falha na API.

**Prevencao:** NTP ativado no HA OS (padrao), mas verificar apos instalacao. Fuso horario configurado corretamente (America/Recife).

---

## "Works in Demo, Fails Daily" Patterns

### Automacao de luz por sensor de presenca: falso positivo e falso negativo

**O que da errado na demo:** Voce entra no comodo, luz acende. Sai, luz apaga. Perfeito.
**O que da errado na vida real:** 
- Voce esta sentado lendo (sem movimento) -> luz apaga
- Ventilador de teto aciona sensor -> luz acende sozinha as 3h
- Gato passa -> luz acende

**Prevencao:** Nao automatizar 100% da iluminacao principal. Automatizar luzes de passagem (corredor, banheiro social) e manter controle manual (via dashboard/interruptor) para areas de permanencia (sala, quarto). Timer de presenca: minimo 5 minutos antes de apagar.

### Controle de AC via IR Blaster: "desincroniza"

**O que da errado na demo:** Broadlink/Switchbot IR manda comando "ligar AC 23C". AC liga. Perfeito.
**O que da errado na vida real:**
- Alguem usa o controle fisico -> HA nao sabe que o estado mudou
- IR falha (angulo, distancia) -> HA acha que ligou mas nao ligou
- AC tem modos (cool, dry, fan) que o IR blaster nao detecta

**Prevencao:**
- Posicionar IR blaster com linha de visao direta para o AC (sem obstrucao)
- Aceitar que o estado pode estar errado -- nao confiar 100% no dashboard para AC via IR
- Considerar AC com WiFi nativo (integracao direta e bidirecional) se orcamento permitir

### WiFi device "funciona por 2 semanas e desconecta"

**O que da errado:** Dispositivos WiFi baratos (Tuya generico) funcionam bem no inicio. Depois de 2-4 semanas, comecam a desconectar aleatoriamente. Roteador nao aguenta muitos dispositivos WiFi simultaneos.

**Prevencao:**
- Zigbee para tudo que puder (nao sobrecarrega WiFi)
- Se usar WiFi IoT: roteador com suporte a muitos clientes simultaneos (minimo 50)
- VLAN separada para IoT (isolamento de seguranca e performance)
- Firmware Tasmota/ESPHome em dispositivos Tuya quando possivel (local, sem cloud)

### Automacao complexa que ninguem mantem

**O que da errado na demo:** 15 automacoes encadeadas, cenas elaboradas, rotinas de bom dia/boa noite.
**O que da errado na vida real:** Uma automacao quebra, cascata de problemas. Voce muda de rotina (ferias, visita, doenca) e as automacoes atrapalham em vez de ajudar. Elyda nao consegue desativar.

**Prevencao:**
- Comecar com 3-5 automacoes simples e viver com elas por 1 mes
- Cada automacao deve ter "escape hatch" (botao para desativar no dashboard)
- Preferir automacoes que ASSISTEM (notificacao "portao aberto ha 10min") em vez de automacoes que AGEM (fechar portao automaticamente)
- Regra de ouro: se voce nao consegue explicar a automacao em 1 frase, ela e complexa demais

### Dashboard bonito mas lento

**O que da errado na demo:** Dashboard com animacoes CSS, transicoes, planta da casa em SVG interativa.
**O que da errado na vida real:** Tablet barato (Android Go) engasga. Pagina demora 3-4 segundos para carregar. Voce quer ligar a luz e espera a animacao terminar.

**Prevencao:**
- Performance > estetica
- Testar no dispositivo real (tablet que vai na parede), nao no notebook dev
- Evitar animacoes pesadas, SVG complexo, graficos com muitos pontos
- Tempo de carga maximo: 1 segundo para tela principal
- Controles devem responder em <200ms

---

## Phase Mapping

| Pitfall | Fase que deve enderecar | Urgencia |
|---------|------------------------|----------|
| Neutro em interruptores | **ANTES da Fase 1** -- projeto eletrico AGORA | BLOQUEANTE |
| Eletrodutos dimensionados | **ANTES da Fase 1** -- projeto eletrico AGORA | BLOQUEANTE |
| Separacao forca/dados | **ANTES da Fase 1** -- projeto eletrico AGORA | BLOQUEANTE |
| Ponto de rede/energia para hub | **ANTES da Fase 1** -- projeto eletrico AGORA | BLOQUEANTE |
| Tomada para tablet parede | **ANTES da Fase 1** -- projeto eletrico AGORA | IMPORTANTE |
| Eletroduto QDG ao rack | **ANTES da Fase 1** -- projeto eletrico AGORA | IMPORTANTE |
| SSD em vez de SD card | Fase 1 (infra HA) | CRITICO |
| Zigbee2MQTT em vez de ZHA | Fase 1 (infra HA) | CRITICO |
| WebSocket em vez de REST API | Fase 2 (dashboard core) | CRITICO |
| Dashboard minimalista | Fase 2 (dashboard core) | CRITICO |
| Interface para nao-dev (Elyda) | Fase 2 (dashboard core) | IMPORTANTE |
| Coordenador Zigbee com extensor | Fase 3 (dispositivos) | CRITICO |
| Pareamento no local definitivo | Fase 3 (dispositivos) | CRITICO |
| Roteadores antes de end-devices | Fase 3 (dispositivos) | CRITICO |
| Canal Zigbee vs WiFi | Fase 3 (dispositivos) | IMPORTANTE |
| Inversor com Modbus/HA compativel | Fase 4 (energia solar) | CRITICO |
| Energia em R$ nao so kWh | Fase 4 (energia solar) | IMPORTANTE |
| Automacoes simples primeiro | Fase 5 (automacoes) | IMPORTANTE |
| Estado real vs estado esperado | Fase 2-3 (dashboard + dispositivos) | IMPORTANTE |
| Tablet kiosk burn-in | Fase 2 (dashboard deploy) | MODERADO |
| Fallback offline | Fase 2 (dashboard core) | MODERADO |

### Prioridade absoluta (fazer AGORA, antes de fechar paredes):

1. Revisar projeto eletrico para incluir neutro em TODOS os interruptores
2. Dimensionar eletrodutos (minimo 25mm, separar forca de dados)
3. Definir posicao do rack de automacao (central, ventilado, com rede e energia dedicada)
4. Puxar eletrodutos reserva (vazios) entre rack e cada comodo
5. Prever tomada embutida nos pontos de tablet de parede
6. Eletroduto dedicado entre QDG e rack para sensores de energia

---

## Sources

- [Tom's Guide - Neutral Wire](https://www.tomsguide.com/news/diy-smart-home-whats-a-neutral-wire-and-what-do-to-if-you-dont-have-one)
- [Smart Home Electrical Planning Guide](https://newcenturysalesinc.com/how-to-plan-electrical-systems-for-smart-homes/)
- [Future-Proof Home Wiring](https://freemansconstruction.com/how-to-future-proof-low-voltage-home-wiring-with-smurf-tube/)
- [XDA - 4 HA Automation Mistakes](https://www.xda-developers.com/home-assistant-mistakes-that-can-break-your-automations/)
- [Top 5 HA Beginner Mistakes](https://siytek.com/top-5-mistakes-home-assistant/)
- [10 HA Mistakes](https://make-it.ai/blog/common-home-assistant-mistakes)
- [HowToGeek - Dashboard Mistake](https://www.howtogeek.com/big-mistake-on-home-assistant-dashboards/)
- [Zigbee Network Optimization Guide - HA Community](https://community.home-assistant.io/t/zigbee-network-optimization-a-how-to-guide-for-avoiding-radio-frequency-interference-adding-zigbee-router-devices-repeaters-extenders-to-get-a-stable-zigbee-network-mesh-with-best-possible-range-and-coverage-by-fully-utilizing-zigbee-mesh-networking/515752)
- [XDA - 7 Zigbee Mistakes](https://www.xda-developers.com/mistakes-to-avoid-when-setting-up-your-first-zigbee-network/)
- [Zigbee2MQTT - Improve Range](https://www.zigbee2mqtt.io/advanced/zigbee/02_improve_network_range_and_stability.html)
- [HA - Solar Panels Integration](https://www.home-assistant.io/docs/energy/solar-panels/)
- [HA WebSocket API](https://www.home-assistant.io/integrations/websocket_api/)
- [HA REST API Developer Docs](https://developers.home-assistant.io/docs/api/rest/)
- [Zigbee2MQTT vs ZHA 2025 - HA Community](https://community.home-assistant.io/t/zigbee2mqtt-vs-zha-in-2025-stability/840615)
- [SD Card Corruption - HA Community](https://community.home-assistant.io/t/sd-card-corruption-problem-couple-tips/95596)
- [Smart Home Failures 2026 - Trunetto](https://www.trunetto.com/blog/most-common-smart-home-failures-in-2026-based-on-50-000-troubleshooting-queries)
- [NBR 16264 - Cabeamento Estruturado Residencial](https://www.normas.com.br/visualizar/abnt-nbr-nm/33990/abnt-nbr16264-cabeamento-estruturado-residencial)
- [Tabela Dimensionamento Eletroduto](https://www.mundodaeletrica.com.br/tabela-de-dimensionamento-de-eletroduto/)
