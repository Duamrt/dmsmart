# Cliente: Escritório EDR Engenharia

Primeira instalação real conectada ao dmsmart. Usada como ambiente de teste end-to-end do produto — cada feature nova do core passa por aqui antes de ir pra base.

## Contexto

- **Local:** escritório da EDR Engenharia
- **Home Assistant:** rodando em container Docker na máquina Windows do Duam (`localhost:8123`)
- **Volume de config HA:** `~/dmsmart/homeassistant-config/` (gitignored)
- **Hardware real na instalação:** ar-condicionado do escritório físico (ainda não integrado ao HA — precisa definir método)

## Zonas atuais (mock via `input_boolean`)

Durante Phase 2 o config.json ainda é hardcoded. As zonas de teste são:

| Zona | Devices |
|------|---------|
| Sala de Reunião | Luz (`input_boolean.dmsmart_luz_sala`) |
| Suíte | Luz (`input_boolean.dmsmart_luz_suite`) + AC (`input_boolean.dmsmart_ar_suite`) |
| Cozinha | Luz (`input_boolean.dmsmart_luz_cozinha`) |
| Garagem | Portão (`input_boolean.dmsmart_portao`) |

Essas zonas sobrevivem **apenas até a Phase 3** — quando o wizard subir, elas viram config do cliente, não do código-fonte.

## AC do escritório

O ar-condicionado real existe fisicamente, mas ainda não está integrado no HA. Opções em aberto:
- Integração via IR (controle remoto) com blaster IR (ex: Broadlink RM4)
- Se o modelo for Wi-Fi com integração, conectar diretamente
- Depende de identificar marca/modelo

Quando integrado, a entidade `climate.xxx` vai ser criada no HA e substituir o `input_boolean.dmsmart_ar_suite` na instalação — sem mudar código do produto.

## Ambiente de desenvolvimento

- **Dev server dmsmart:** `http://localhost:5555` (via `npx serve -s . -l 5555` na pasta `~/dmsmart/`)
- **HA URL:** `http://localhost:8123`
- **Token:** armazenado em `~/dmsmart/.env.local` (gitignored) — NUNCA colar token via chat (quebra linha)

## Status no produto

- Conectado via Phase 2 (MVP de conexão HA) ✅
- Funcional: 4 zonas, toggle individual por badge e toggle do conjunto por clique no ícone
- Bugs resolvidos: listener accumulation (v04121420), clique individual (v04121510)
- Vai migrar para o wizard quando Phase 3 for entregue
