# dmsmart

## What This Is

dmsmart é um **produto de automação residencial** — um dashboard white-label que roda sobre Home Assistant. Qualquer cliente com HA cria uma conta, conecta a instância dele, mapeia zonas/dispositivos por uma interface própria e passa a usar o dmsmart como a única UI da casa. Home Assistant fica invisível ao usuário final: é infraestrutura, não tela.

O valor é entregue como software: um cliente não precisa editar JSON, tocar em código, ou entender HA pra usar. Abre, loga, conecta, mapeia, usa.

## Core Value

**Produto:** qualquer pessoa com Home Assistant transforma a casa dela num dashboard próprio e controlável sem depender da UI do HA nem de app de terceiro.

**Para cada cliente:** controlar qualquer dispositivo da casa e ver consumo de energia em tempo real, de qualquer lugar, em uma interface que não expõe nada do Home Assistant.

## Clientes e Instalações

dmsmart é multi-instalação desde o dia um do redesign. Uma **instalação** é um par (cliente, Home Assistant) com zonas e dispositivos próprios.

**Instalações de referência (usadas para teste real do produto):**

| Cliente | Instalação | Estado |
|---------|-----------|--------|
| EDR Engenharia | Escritório EDR | Primeiro ambiente real — HA em Docker local, AC físico, zonas mock via `input_boolean` |
| Duam | Casa Jupi-PE | Em obra (fundação) — Pi 5 + Zigbee previstos para 2026 |

A Casa Jupi tem uma fase específica de infraestrutura física (obra elétrica). Ela pertence ao cliente, não ao produto — está documentada em `.planning/customers/casa-jupi.md`.

## Constraints (produto)

- **Stack:** HTML + CSS + JS vanilla + Supabase — consistência com os outros produtos do Duam
- **Dependência obrigatória:** o cliente precisa ter Home Assistant rodando (qualquer lugar — Pi, Docker, HAOS, nuvem desde que exposto com token)
- **Operação offline:** uma vez carregado e configurado, o dashboard precisa operar na rede local do cliente mesmo sem internet
- **Multi-instalação desde o core:** nada de hardcode de entity_id, nome de zona, ou layout de cliente específico no código-fonte
- **Token HA nunca em plaintext no servidor:** cada cliente guarda seu token localmente (localStorage criptografado ou equivalente)

## Key Decisions

| Decisão | Racional | Resultado |
|---------|----------|-----------|
| dmsmart é produto, não painel da casa do Duam | Casa Jupi e Escritório EDR viraram clientes de referência — o produto serve qualquer usuário com HA | Definido 2026-04-12 |
| Arquitetura híbrida (HA + dashboard custom) | HA resolve protocolos IoT; dmsmart foca UX e experiência multi-instalação | Validando |
| Supabase como backend multi-tenant | Mesma stack do resto dos produtos; suporta auth, RLS, sync entre dispositivos do cliente | Pendente (Fase 4) |
| Setup wizard in-app em vez de `config.json` editável | Produto não pode exigir editor de texto do cliente final | Definido 2026-04-12 |
| Zigbee como protocolo recomendado para clientes | Mais estável que WiFi para dezenas de dispositivos; sem dependência de nuvem do fabricante | Recomendação |
| PWA em vez de app nativo | Zero custo de loja, funciona em qualquer dispositivo | Validando |
| Repo independente (`~/dmsmart/`) | Ciclo de vida próprio, fora do dmstack | Definido |

## Out of Scope (v1)

- **Integração Alexa/Google como UI principal** — assistentes de voz são periféricos opcionais
- **App nativo iOS/Android** — PWA resolve
- **Câmeras/segurança** — escopo separado, alta complexidade
- **Automações complexas (cenas, horários)** — HA já oferece; dmsmart pode expor como feature v2
- **Matter como protocolo principal** — imaturo em 2025/2026
- **Billing/monetização no core** — entra em v2 quando houver base validada

## Evolution

**Após cada fase:**
1. Requisitos invalidados → mover para Out of Scope com motivo
2. Requisitos validados → marcar com referência da fase
3. Novos requisitos → adicionar em REQUIREMENTS.md
4. Decisões relevantes → adicionar em Key Decisions

---
*Last updated: 2026-04-12 — redesign para produto SaaS após Fase 01 concluída*
