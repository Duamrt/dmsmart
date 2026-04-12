# Stack Research -- dmsmart

**Projeto:** dmsmart (dashboard de automacao residencial)
**Pesquisado:** 2026-04-12
**Modo:** Ecosystem

---

## Hardware

### Servidor Local -- Raspberry Pi

| Hardware | Modelo | Preco Estimado | Racional |
|----------|--------|----------------|----------|
| **Raspberry Pi 5 8GB** | BCM2712, 2.4GHz quad-core | ~R$700-900 | Recomendado para novas instalacoes em 2025/2026. CPU 2-3x mais rapida que Pi 4, suporta NVMe via HAT (elimina microSD como ponto de falha), headroom para rodar HA + addons + servir frontend |
| Case com cooler ativo | Argon ONE V3 ou case oficial Pi 5 | ~R$150 | Pi 5 esquenta mais que Pi 4 -- cooler ativo e obrigatorio para operacao 24/7 |
| NVMe SSD 256GB | Qualquer M.2 2230/2242 + Pi 5 NVMe HAT | ~R$200 | microSD degrada com escritas constantes do HA. NVMe resolve confiabilidade e performance |
| Fonte oficial Pi 5 | 27W USB-C (5.1V 5A) | ~R$80 | Pi 5 exige mais corrente que Pi 4. Fonte generica causa undervoltage |

**Confianca:** ALTA -- Raspberry Pi 5 e a recomendacao unanime da comunidade HA e dos docs oficiais para 2025/2026.

**NAO usar Pi 4:** Ainda funciona, mas para uma instalacao nova em 2026, o Pi 5 custa pouco mais e oferece NVMe nativo + performance muito superior. Pi 4 so faz sentido se ja tiver um em maos.

### Coordenador Zigbee

| Hardware | Modelo | Preco Estimado | Racional |
|----------|--------|----------------|----------|
| **Home Assistant Connect ZBT-2** | EFR32MG24, antena externa 4.16dBi | ~US$30 (~R$170) | Coordenador oficial do HA, chip MG24 de ultima geracao, baud rate 4x maior que SkyConnect, antena externa com base separada (reduz interferencia USB). Suporta Zigbee + Thread (nao simultaneamente) |
| Cabo extensao USB 1m | Qualquer USB-A macho/femea | ~R$15 | Obrigatorio -- afastar o dongle do Pi reduz interferencia eletromagnetica |

**Alternativa mais barata:** Sonoff ZBDongle-E (~US$15 / ~R$90). Chip MG21 mais antigo mas funciona perfeitamente. Milhares de instalacoes estaveis. Escolher este se o ZBT-2 nao estiver disponivel no Brasil.

**NAO usar:** SkyConnect/ZBT-1 (descontinuado, antena interna fraca). ConBee II (Phoscon, firmware proprietario, menos atualizacoes).

**Confianca:** ALTA -- ZBT-2 lancado nov/2025 com reviews excelentes. ZBDongle-E e o fallback mais testado da comunidade.

### Monitoramento Solar

| Hardware | Modelo | Racional |
|----------|--------|----------|
| **Inversor Growatt** (string, residencial) | Growatt MIN 3-6kW (ex: MIN 5000TL-X) | Lider do mercado residencial brasileiro. Integracao oficial no HA (`growatt_server`). API cloud funciona mas tambem suporta Modbus local via Shine-X stick |
| **Shine WiFi-X stick** | Acessorio Growatt | Conecta o inversor ao WiFi. Dados chegam na cloud Growatt e o HA puxa via integracao oficial. Para monitoramento local (sem depender de internet), usar Modbus TCP direto |
| **Sensor de consumo geral** | Shelly EM ou Shelly Pro 3EM | Medidor de consumo por CT clamp (abraca o cabo sem cortar). Instala no quadro eletrico. WiFi nativo, integracao oficial HA. Shelly Pro 3EM mede 3 fases |

**Alternativa inversor:** Deye (lider em hibridos/micro no Brasil). Integracao via Solarman HACS ou SolarAssistant (MQTT). Growatt tem integracao oficial mais madura.

**Fluxo de dados solar:**
```
Paineis solares --> Inversor Growatt --> Shine WiFi-X --> Home Assistant (growatt_server)
Rede eletrica --> Quadro --> Shelly EM (CT clamp) --> Home Assistant (shelly)
HA calcula: geracao solar - consumo rede = saldo
```

**Confianca:** ALTA para Growatt (integracao oficial HA, lider BR). MEDIA para Shelly EM (funciona bem mas depende de WiFi estavel no quadro eletrico).

---

## Protocolos

### Recomendacao: Zigbee como protocolo principal + WiFi para excecoes

| Protocolo | Usar Para | NAO Usar Para | Racional |
|-----------|-----------|---------------|----------|
| **Zigbee 3.0** | Iluminacao (todas as 12 zonas), sensores de presenca, sensores de porta/janela, interruptores | Dispositivos que so existem em WiFi (ex: inversor solar, Shelly) | Mesh network estavel, nao congestiona WiFi, funciona sem internet, bateria dura anos em sensores |
| **WiFi** | Inversor solar, medidor de energia Shelly, AC (via IR blaster), TV (via rede) | Iluminacao e sensores em massa (mata o roteador com 30+ dispositivos) | Necessario para dispositivos que nao tem Zigbee |
| **Infravermelho** | Ar-condicionado, TV (backup), sistema de som | Qualquer coisa que tenha protocolo IP/Zigbee | Broadlink RM4 Pro ou Switchbot Hub Mini como IR blaster. AC e TV tradicionais so respondem a IR |

**NAO usar Matter (ainda):** So ~800 dispositivos certificados vs 4000+ Zigbee. Ecossistema imaturo no Brasil. Quando Matter amadurecer (2027+), o HA suporta nativamente e o ZBT-2 ja tem Thread. Nao apostar nisso agora.

**NAO usar Z-Wave:** Frequencia 908MHz (EUA) nao e a mesma do Brasil (921.4MHz). Dispositivos caros e raros no mercado brasileiro. Zigbee resolve tudo que Z-Wave faria.

**Confianca:** ALTA -- Zigbee + WiFi hibrido e o padrao da comunidade HA em 2025/2026. Matter unanimemente considerado "promissor mas prematuro".

---

## Dispositivos Recomendados por Zona

| Zona | Dispositivo | Protocolo | Modelo Sugerido |
|------|-------------|-----------|-----------------|
| Iluminacao (todas) | Rele inteligente no interruptor | Zigbee | Sonoff ZBMINI-L2 (sem neutro) ou ZBMINI-L (com neutro) |
| Iluminacao (alternativa) | Lampada inteligente | Zigbee | Ikea TRADFRI ou Sonoff B02-BL-A60 |
| AC (Sala, Suite, Q1, Q2) | IR Blaster | WiFi | Broadlink RM4 Mini ou Switchbot Hub Mini |
| TV (Sala) | IR + rede local | WiFi | Broadlink RM4 + integracao nativa (Samsung/LG tem integracao HA) |
| Som (Sala, Suite) | Smart speaker ou amplificador | WiFi | Depende do sistema de som escolhido |
| Bomba d'agua | Rele de potencia | Zigbee/WiFi | Sonoff POWR3 (WiFi, mede consumo) ou Shelly Plus 1PM |
| Portao garagem | Rele seco | WiFi | Shelly Plus 1 (contato seco para acionar motor existente) |
| Sensores presenca | Sensor de movimento | Zigbee | Aqara FP2 (mmWave, detecta presenca parada) ou Sonoff SNZB-03 (PIR, mais barato) |

**Confianca:** MEDIA -- modelos especificos dependem de disponibilidade no Brasil. Marcas (Sonoff Zigbee, Shelly WiFi, Broadlink IR) sao as mais acessiveis e bem integradas com HA.

---

## Home Assistant -- Integracao com o Frontend

### WebSocket API (principal) -- para dados em tempo real

| Aspecto | Detalhe |
|---------|---------|
| **Biblioteca** | `home-assistant-js-websocket` (oficial, 0 dependencias) |
| **Versao** | Ultima estavel no npm |
| **Autenticacao** | Long-Lived Access Token (gerado em HA > Perfil > Tokens) |
| **Protocolo** | WebSocket em `ws://IP_DO_PI:8123/api/websocket` |
| **Funcoes principais** | `createLongLivedTokenAuth()`, `createConnection()`, `subscribeEntities()`, `subscribeConfig()` |
| **Reconexao** | Automatica -- a biblioteca reconecta e re-subscribe sozinha |
| **Uso no dmsmart** | Conectar ao HA via WS, subscribe em todas as entidades, callback atualiza o DOM em tempo real |

**Exemplo de uso (vanilla JS):**
```javascript
import {
  createLongLivedTokenAuth,
  createConnection,
  subscribeEntities
} from 'home-assistant-js-websocket';

const auth = createLongLivedTokenAuth('http://192.168.1.X:8123', 'TOKEN_AQUI');
const conn = await createConnection({ auth });

subscribeEntities(conn, (entities) => {
  // entities['sensor.growatt_power'] -> geracao solar em tempo real
  // entities['light.sala'] -> estado da luz da sala
  // entities['climate.ac_suite'] -> estado do AC
  atualizarDashboard(entities);
});
```

### REST API (secundaria) -- para acoes e historico

| Aspecto | Detalhe |
|---------|---------|
| **Base URL** | `http://IP_DO_PI:8123/api/` |
| **Autenticacao** | Header `Authorization: Bearer TOKEN` |
| **Ligar dispositivo** | `POST /api/services/light/turn_on` com `{"entity_id": "light.sala"}` |
| **Historico** | `GET /api/history/period/2026-04-12T00:00:00` |
| **Uso no dmsmart** | Acionar dispositivos (toggle luz, mudar temperatura AC), buscar historico para graficos |

**Estrategia:** WebSocket para LEITURA em tempo real (estados, sensores). REST para ESCRITA (comandos) e consultas pontuais (historico).

**Confianca:** ALTA -- APIs oficiais, estáveis, bem documentadas. Biblioteca JS oficial com 0 dependencias.

---

## Frontend Stack

### Core (consistente com stack do Duam)

| Tecnologia | Versao | Proposito | Racional |
|------------|--------|-----------|----------|
| HTML5 | - | Estrutura | Stack padrao do Duam |
| CSS3 (custom properties) | - | Estilo, tema dark | Variaveis CSS para tema. Sem framework CSS |
| JavaScript vanilla (ES modules) | ES2022+ | Logica | Consistencia com todos os projetos. Sem React/Vue |
| Supabase JS | v2 | Historico de consumo, logs | Armazena dados historicos que o HA nao guarda por muito tempo. Graficos de longo prazo |

### Bibliotecas Especificas

| Biblioteca | Versao | Proposito | Racional |
|------------|--------|-----------|----------|
| **home-assistant-js-websocket** | latest | Comunicacao tempo real com HA | Biblioteca oficial, 0 deps, reconexao automatica, subscribe em entidades |
| **uPlot** | 1.6+ | Graficos de energia em tempo real | ~50KB, Canvas 2D, 10x mais rapido que Chart.js para time series. Streaming a 60fps com 3600 pontos usa 10% CPU vs 40% do Chart.js |
| **Chart.js** | 4.x | Graficos estaticos (barras consumo por zona, pizza) | ~50KB, facil de usar para graficos que nao precisam de streaming. Complementa uPlot |

**NAO usar:**
- D3.js: Overkill para dashboards simples. Curva de aprendizado absurda para o que o dmsmart precisa.
- ECharts: 1MB+ de bundle, pesado demais para tablet.
- ApexCharts: Bom mas perde para uPlot em performance real-time.
- Highcharts: Licenca comercial paga.

### PWA e Tablet Kiosk

| Aspecto | Solucao | Detalhe |
|---------|---------|---------|
| **Manifest** | `manifest.json` | `display: standalone`, `orientation: landscape`, icones, theme_color |
| **Service Worker** | `sw.js` | Cache de assets para funcionar offline na rede local |
| **Tablet** | Android 10" (Lenovo M11 ou Fire HD 10) | Budget, bom para parede |
| **Kiosk Browser** | Fully Kiosk Browser ($9 licenca) | Tela sempre ligada, wake por movimento, impede sair do app, controle remoto via HA |
| **Suporte de parede** | 3D printed ou comercial | Embutir na parede durante construcao (ideal pois a casa esta em obra) |
| **SSL local** | NAO necessario | Fully Kiosk roda PWA local sem SSL warning. HA na rede local nao precisa HTTPS |

**Fully Kiosk Browser -- configuracoes essenciais:**
- Start URL: `http://192.168.1.X/dmsmart/` (servido pelo Pi ou pelo HA como static)
- Kiosk Mode: ON (impede sair)
- Screen saver: ON (desliga tela apos X minutos)
- Motion detection: ON (acorda tela quando alguem se aproxima)
- Integracao HA: addon `Fully Kiosk Browser` reconhece o tablet e permite controle remoto

**Confianca:** ALTA para PWA + Fully Kiosk (padrao da comunidade HA). MEDIA para modelo especifico de tablet (depende do que estiver disponivel).

---

## Supabase -- Armazenamento de Longo Prazo

| Uso | Tabela | Dados |
|-----|--------|-------|
| Historico de energia | `energy_readings` | timestamp, geracao_solar_w, consumo_rede_w, saldo_w |
| Log de acoes | `device_logs` | timestamp, entity_id, acao, usuario |
| Configuracoes | `zones` | zona, dispositivos vinculados, apelidos |

**Fluxo:** HA coleta dados em tempo real -> Automacao HA envia a cada 5 min via REST para Supabase -> dmsmart consulta Supabase para graficos de longo prazo (dia/semana/mes).

**Racional:** HA guarda historico por padrao 10 dias (configuravel mas pesa o SD/NVMe). Supabase fica com o historico completo para graficos de tendencia, sem pesar o Pi.

**Confianca:** ALTA -- padrao do Duam, ja usa em todos os projetos.

---

## O Que NAO Usar

| Tecnologia | Motivo |
|------------|--------|
| **Matter (como protocolo principal)** | So ~800 dispositivos certificados. Ecossistema imaturo. Poucos dispositivos Matter no mercado BR. Zigbee tem 4000+ e e maduro |
| **Z-Wave** | Frequencia diferente no Brasil, dispositivos caros e raros. Zigbee resolve o mesmo |
| **Tuya/Smart Life como hub** | Depende de cloud, latencia alta, pode sair do ar. HA com Zigbee e 100% local |
| **MQTT direto (sem HA)** | Reinventa a roda. HA ja abstrai todos os protocolos. MQTT so como bridge (ex: SolarAssistant) |
| **React/Vue/Svelte** | Inconsistente com stack do Duam. JS vanilla resolve. Dashboard nao precisa de SPA framework |
| **D3.js** | Overkill. uPlot + Chart.js cobrem 100% dos graficos necessarios |
| **ECharts** | 1MB+ bundle, pesado para tablet |
| **Highcharts** | Licenca comercial paga |
| **Node-RED** | Tentador para automacoes visuais mas adiciona camada de complexidade. HA automations nativas resolvem |
| **Docker no Pi (para HA)** | Usar HAOS (Home Assistant OS) que ja gerencia tudo. Docker manual so complica |
| **microSD como storage principal** | Degrada com escritas constantes. NVMe obrigatorio para confiabilidade 24/7 |

---

## Instalacao Resumida

### No Raspberry Pi 5
```bash
# 1. Gravar HAOS no NVMe (via Raspberry Pi Imager)
# Selecionar: Other specific-purpose OS > Home assistants > Home Assistant OS > Pi 5

# 2. Bootar o Pi, acessar http://homeassistant.local:8123
# 3. Criar conta, configurar rede

# 4. Instalar integracoes:
#    - ZHA (Zigbee Home Automation) -- detecta o ZBT-2 automaticamente
#    - Growatt Server -- para inversor solar
#    - Shelly -- para medidor de energia
#    - Fully Kiosk Browser -- para controlar tablet
```

### No projeto dmsmart (frontend)
```bash
# Nao usa npm/bundler -- CDN ou arquivos locais
# home-assistant-js-websocket via ESM CDN:
# import from 'https://cdn.jsdelivr.net/npm/home-assistant-js-websocket@latest/dist/haws.es.js'

# uPlot via CDN:
# <script src="https://cdn.jsdelivr.net/npm/uplot@1.6/dist/uPlot.iife.min.js"></script>
# <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uplot@1.6/dist/uPlot.min.css">

# Chart.js via CDN:
# <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
```

---

## Niveis de Confianca

| Area | Confianca | Fonte | Notas |
|------|-----------|-------|-------|
| Raspberry Pi 5 | ALTA | Docs oficiais HA + comunidade | Unanime para novas instalacoes |
| ZBT-2 / ZBDongle-E | ALTA | HA blog oficial (nov/2025) + reviews | ZBT-2 e o oficial, ZBDongle-E e fallback comprovado |
| Zigbee como protocolo | ALTA | Multiplas fontes, comunidade HA | Maduro, 4000+ dispositivos, mesh estavel |
| Matter -- evitar por ora | ALTA | Comparativos 2025/2026 | Consenso: promissor mas prematuro |
| Growatt (inversor solar BR) | ALTA | Dados de mercado BR, integracao oficial HA | Lider residencial BR |
| Shelly EM (medidor consumo) | MEDIA | Comunidade HA | Funciona bem mas depende de WiFi no quadro eletrico |
| home-assistant-js-websocket | ALTA | Repo oficial HA, npm | Biblioteca usada pelo proprio frontend do HA |
| uPlot (graficos real-time) | ALTA | Benchmarks publicos, GitHub | 10x mais rapido que Chart.js para time series |
| Fully Kiosk Browser | ALTA | Integracao oficial HA, comunidade | Padrao de facto para tablets de parede |
| Modelos especificos de dispositivos Zigbee | MEDIA | Comunidade HA | Disponibilidade no Brasil pode variar |

---

## Fontes

- [Home Assistant -- Raspberry Pi Installation](https://www.home-assistant.io/installation/raspberrypi/)
- [Home Assistant Connect ZBT-2 (blog oficial)](https://www.home-assistant.io/blog/2025/11/19/home-assistant-connect-zbt-2/)
- [Home Assistant WebSocket API (dev docs)](https://developers.home-assistant.io/docs/api/websocket/)
- [Home Assistant REST API (dev docs)](https://developers.home-assistant.io/docs/api/rest/)
- [home-assistant-js-websocket (GitHub)](https://github.com/home-assistant/home-assistant-js-websocket)
- [Home Assistant ZHA Integration](https://www.home-assistant.io/integrations/zha/)
- [Growatt Integration (HA oficial)](https://www.home-assistant.io/integrations/growatt_server/)
- [Fully Kiosk Browser (HA integration)](https://www.home-assistant.io/integrations/fully_kiosk/)
- [uPlot (GitHub)](https://github.com/leeoniya/uPlot)
- [SmartHomeScene -- Best Zigbee Coordinators 2026](https://smarthomescene.com/blog/best-zigbee-dongles-for-home-assistant-2023/)
- [Growatt e Deye lideres no Brasil (Aldo Solar)](https://www.aldo.com.br/blog/growatt-e-deye-sao-lideres/)
- [Smart Home Protocols Comparison 2026](https://www.smarthomeexplorer.com/guides/matter-vs-zigbee-vs-zwave-vs-wifi-protocol-comparison)
- [XDA -- Switched to ZBT-2 review](https://www.xda-developers.com/switched-home-assistant-connect-zbt-2-zigbee/)
- [Digi-DIY -- Tablet Dashboard 2025 Guide](https://digi-diy.com/home-assistant-tablet-dashboard/)
