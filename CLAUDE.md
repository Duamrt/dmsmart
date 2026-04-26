# dmsmart — SaaS de Automação Residencial

Sempre responda em português brasileiro.

## Projeto
- **Stack:** HTML + CSS + JS vanilla + Supabase (PostgreSQL)
- **Deploy:** `./deploy.sh "mensagem"` → app.dmstack.com.br (GitHub Pages, branch main)
- **Branches:** dev → main
- **Servidor local:** `npx serve -s . -l 5555` → localhost:5555
- **Supabase:** `ojuzuojdjnhqiuwvhstv.supabase.co`
- **Home Assistant local:** `http://localhost:8123` (Docker container `homeassistant`)
- **Tunnel público:** `https://ha.dmstack.com.br` → subir: `bash ~/cf.sh tunnel run ha-dmsmart`

## Arquitetura
- Dashboard white-label sobre Home Assistant — HA nunca visível ao usuário final
- Multi-instalação: `InstallationStore` (localStorage) + `ActiveInstallation` + sync Supabase
- Token HA em `~/dmsmart/.env.local` (gitignored) — **NUNCA colar no chat** (quebra linha)
- Protocolo IoT: Zigbee2MQTT

## ⚠️ PRODUTO, não casa do Duam
Casa Jupi + Escritório EDR = clientes/instalações de teste. **Nunca hardcodar entity_id, zona ou layout específico.** O produto tem que funcionar pra qualquer cliente com HA.

## Licenciamento
- Básico (grátis/1 install) · Profissional (R$49/mês) · Integrador (R$39/install/mês)
- `user_profiles.plan` no Supabase controla o plano
- Feature-lock: energia, relatórios, alertas, painel integrador bloqueados no Básico

## Gotchas críticos
- **Listener accumulation:** `_bindCardControls` SÓ na criação do card, nunca dentro do closure `update()` — duplica listener → flood buffer 4096 msgs HA
- **state_changed flood:** filtrar com `watched = new Set(ZoneRegistry.allEntityIds())` antes de `StateStore.update()` — 100+ entidades internas do HA floodam o store
- **Relatórios CORS:** SEMPRE usar `HAClient.fetchHistory()` via WebSocket — NUNCA fetch REST direto ao HA
- **Formato histórico WS:** objeto keyed por entity_id com `{s, lc}` (lc = unix seconds) — diferente do REST

## Fases
01 Shell ✅ · 02 HA MVP ✅ · 03 Setup Wizard ✅ · 04 Backend Supabase ✅ · **05 Controles** (em andamento: 05-01·02·03 ✅, 05-04 persiana pendente) · 06 Energia · 07 Histórico · 08 Polish

## Início de sessão
Ao iniciar qualquer sessão neste repo, leia primeiro:
`G:/DUAM - ECOSISTEMA/DUAM - ECOSISTEMA/01_DM SMART/_CONTEXTO_MESTRE.md`
Esse arquivo tem: estado atual, pendências priorizadas, bugs abertos, próxima task.
