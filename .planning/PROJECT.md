# dmsmart

## What This Is

dmsmart é o sistema de automação residencial da casa do Duam — um dashboard 100% personalizado que controla e monitora todos os dispositivos da casa (iluminação, AC, TV, som, bomba d'água, portão) e exibe consumo de energia em tempo real incluindo geração solar. O painel fica fixo na parede e é acessível por celular ou tablet de qualquer ambiente. Nenhuma tela de terceiros é visível ao usuário — tudo é interface própria.

## Core Value

Controlar qualquer dispositivo da casa e ver o consumo de energia em tempo real, de qualquer lugar, sem depender de app de terceiro.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Dashboard & Monitoramento**
- [ ] Painel principal com status em tempo real de todos os dispositivos
- [ ] Consumo de energia em tempo real (rede elétrica + geração solar)
- [ ] Gráficos de consumo por zona e por período
- [ ] Indicador de saldo solar (gerando mais ou consumindo mais que gera)

**Controle de Dispositivos**
- [ ] Ligar/desligar iluminação por zona (12 zonas mapeadas)
- [ ] Controlar ar-condicionado (ligar, desligar, temperatura)
- [ ] Controlar TV (ligar, desligar, volume, entrada)
- [ ] Controlar sistema de som
- [ ] Acionar/desligar bomba d'água
- [ ] Controlar portão da garagem

**Acesso & Interface**
- [ ] Painel fixo na parede (tablet em modo kiosk)
- [ ] Acesso pelo celular via rede local (PWA)
- [ ] Interface 100% própria — zero branding de terceiros visível
- [ ] Responsivo para tablet e celular

**Infraestrutura**
- [ ] Integração com Home Assistant via API REST
- [ ] Supabase para histórico de consumo e logs
- [ ] Funciona offline na rede local (sem depender de internet)

### Out of Scope

- Integração com Alexa/Google Home como interface principal — o dmsmart é a interface, assistentes de voz são periféricos opcionais
- App nativo (iOS/Android) — PWA resolve com menos custo
- Automações complexas (cenas, horários) na fase inicial — Home Assistant já oferece isso nativamente
- Câmeras/segurança — escopo separado futuro

## Context

**Casa:** Residência do Duam em Jupi-PE, em construção. Fase atual: concretagem das sapatas e arranques. Próxima semana: baldrame. Timing ideal para embutir toda a infraestrutura (conduits, cabeamento estruturado, tomadas estratégicas) antes de fechar as paredes.

**Planta baixa mapeada — 12 zonas:**
| Zona | Dispositivos planejados |
|------|------------------------|
| Sala | Luz, AC, TV, som |
| Suíte | Luz, AC, som |
| Closet | Luz |
| BWC Suíte | Luz, chuveiro inteligente |
| Quarto 1 | Luz, AC |
| Quarto 2 | Luz, AC |
| BWC 2 | Luz |
| BWC Social | Luz |
| Cozinha | Luz |
| Área de Serviço | Luz, bomba d'água |
| Garagem | Luz, portão |
| Quintal/Externo | Luz externa |

**Arquitetura híbrida decidida:**
- **Home Assistant** (Raspberry Pi): cérebro dos dispositivos físicos. Fala com sensores, relés, AC via IR, painéis solares. Nunca exposto ao usuário.
- **dmsmart** (HTML + JS + Supabase): painel visual 100% customizado. Consome Home Assistant via API REST. É o que o Duam vê e usa.

**Energia solar:** planejada para instalação junto com a obra. Objetivo: monitorar geração vs consumo em tempo real e identificar onde está o maior custo.

**Ecossistema DM:** dmsmart é parte da família DM.Stack mas roda como projeto independente (`~/dmsmart/`, repo próprio). Pode futuramente se integrar ao DM.Stack como mais um produto monitorado.

## Constraints

- **Stack:** HTML + CSS + JS vanilla + Supabase — consistência com todos os outros projetos do Duam
- **Plataforma IoT:** Home Assistant como middleware obrigatório — evita reinventar protocolos de dispositivos
- **Operação offline:** dashboard deve funcionar na rede local mesmo sem internet — casa é a infraestrutura crítica
- **Hardware:** Raspberry Pi 4 ou 5 como servidor local — custo acessível, roda Home Assistant e serve o frontend
- **Protocolo dispositivos:** Zigbee preferencial (mais estável que WiFi para IoT) + WiFi para dispositivos que não têm Zigbee

## Key Decisions

| Decisão | Racional | Resultado |
|---------|----------|-----------|
| Arquitetura híbrida (HA + dashboard custom) | Home Assistant já resolve protocolos IoT; dmsmart foca na experiência visual | — Pendente |
| Supabase para histórico | Consistência com stack existente; histórico de consumo não precisa de tempo real puro | — Pendente |
| PWA em vez de app nativo | Zero custo de loja, funciona em qualquer dispositivo na rede local | — Pendente |
| Zigbee como protocolo principal | Mais estável que WiFi para dezenas de dispositivos; sem dependência de nuvem do fabricante | — Pendente |
| Repo independente (`~/dmsmart/`) | Evita conflito com .planning do dmstack; projeto tem ciclo de vida próprio | — Pendente |

## Evolution

Este documento evolui a cada transição de fase e milestone.

**Após cada fase:**
1. Requirements invalidados? → Mover para Out of Scope com motivo
2. Requirements validados? → Mover para Validated com referência da fase
3. Novos requirements? → Adicionar em Active
4. Decisões a registrar? → Adicionar em Key Decisions

---
*Last updated: 2026-04-12 após inicialização do projeto*
