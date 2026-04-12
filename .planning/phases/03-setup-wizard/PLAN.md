# Phase 03 — Setup Wizard e Descoberta de Entidades

## Goal

Qualquer cliente com Home Assistant consegue, pela UI do próprio dmsmart, criar uma instalação nova, conectar ao HA dele, descobrir automaticamente as entidades e mapear zonas/dispositivos — sem editar `config.json` nem tocar em código.

## Success Criteria

1. Primeira abertura do app (sem instalação configurada) mostra tela de boas-vindas e botão "Adicionar instalação"
2. Wizard tem passos claros: **nome da instalação → URL HA → token → validação de conexão**
3. Após conectar, app lista automaticamente todas as entidades do HA agrupadas por domínio (`light`, `switch`, `climate`, `cover`, `media_player`, `fan`, `sensor`, ...)
4. UI permite criar zonas (nome + ícone da biblioteca existente) e atribuir entidades descobertas para dentro de cada zona
5. Cliente marca ações críticas (confirmação obrigatória — ex: portão, bomba)
6. Config salvo em `localStorage` por instalação (ainda sem Supabase — isso vem na Phase 04)
7. Cliente pode ter múltiplas instalações no mesmo dispositivo e alternar entre elas pelo header
8. Editar ou remover instalação existente funciona
9. O `config.json` seed continua existindo como fallback só para desenvolvimento — fluxo real de usuário é 100% wizard

## Non-Goals (escopo fechado)

- **Auth de usuário com Supabase** → Phase 04
- **Sync de config entre dispositivos** → Phase 04
- **Controles avançados por tipo** (slider de temperatura, volume, etc.) → Phase 05
- **Billing/planos** → v2
- **Drag-and-drop visual bonito** — v1 pode ser checkbox ou seleção simples, desde que funcione

## Plans

- [ ] **03-01: Modelo de dados de instalação + storage local**
  - Schema JSON de uma instalação: `{ id, name, haUrl, zones[], createdAt, updatedAt }`
  - Schema de zona: `{ id, name, icon, devices[] }`
  - Schema de device: `{ id, entity, name, type, isCritical? }`
  - Módulo `installation-store.js` com CRUD + persistência em localStorage (chave `dmsmart_installations`)
  - Módulo `active-installation.js` — qual instalação está ativa no momento (chave `dmsmart_active_id`)
  - Migrar o `config.json` existente como seed na primeira abertura (se `dmsmart_installations` estiver vazio, popula com o config.json atual)

- [ ] **03-02: Wizard de conexão (URL, token, validação)**
  - Tela de boas-vindas (quando não há instalações)
  - Passo 1: nome da instalação (ex: "Casa", "Escritório")
  - Passo 2: URL do HA (com validação de formato — http/https obrigatório)
  - Passo 3: token (text area, link para "como criar token no HA")
  - Passo 4: botão "Testar conexão" — dispara HAClient.connect temporário
  - Se falha: mostra erro (auth_invalid, timeout, CORS, etc.) e permite corrigir
  - Se sucesso: avança para a descoberta de entidades (03-03)
  - CSS nova tela (fora do `.zones-grid`), mantém dark mode

- [ ] **03-03: Descoberta de entidades e criação de zonas**
  - Após validar conexão, chama `get_states` no HA e recebe lista de entidades
  - Filtra por domínios úteis (light, switch, climate, cover, media_player, fan, sensor — ignora automation, script, zone, sun, etc.)
  - Agrupa por domínio com contador (ex: "Light (12)", "Climate (3)")
  - UI de criação de zona: nome + ícone (picker dos 9 ícones SVG existentes + "outros")
  - Cliente cria N zonas e atribui entidades (pode ser por checkbox na primeira versão)
  - Checkbox "ação crítica" por device (pede confirmação no clique)
  - Botão "Salvar instalação" → persiste no installation-store + ativa ela + volta pro dashboard

- [ ] **03-04: Seletor de instalação no header + gerenciamento**
  - Dropdown no header (quando > 1 instalação) mostra nome da ativa + lista pra trocar
  - Item "+ Adicionar instalação" reentra no wizard
  - Item "Gerenciar..." abre modal com lista de instalações (editar / remover)
  - Trocar instalação ativa recarrega o dashboard com as novas zonas e reconecta o HAClient com o novo URL+token
  - Token HA continua local ao dispositivo (localStorage separado por instalação, nunca sobe cloud)

## Dependencies

- Phase 01 ✅ (Shell do Dashboard)
- Phase 02 ✅ (HAClient funcional)
- Nenhuma dependência externa nova — tudo client-side puro

## Technical Notes

- **Storage local:** uma chave por instalação para facilitar migração futura pro Supabase
  - `dmsmart_installations` → array de IDs
  - `dmsmart_installation_<id>` → JSON completo da instalação
  - `dmsmart_token_<id>` → token HA (separado porque nunca deve sair da máquina)
  - `dmsmart_active_id` → id da instalação ativa
- **HAClient reusável:** já tem `setConfig({ url, token })` — wizard chama isso antes do `connect()`
- **Descoberta de entidades:** usa `{ type: 'get_states' }` via WebSocket — retorna array completo
- **ZoneRegistry.init(config)** aceita qualquer objeto no formato atual — migrar pra aceitar uma instalação completa é só trocar a fonte
- **UI do wizard:** nova `section.wizard-container` escondida por default, mostra quando `getActiveInstallation()` retorna null OU quando o usuário clica em "nova instalação"

## Deviations allowed

Se durante o plan 03-03 a UI de criação de zonas ficar ambiciosa demais, pode simplificar para:
- Cliente cria 1 zona por vez
- Sem drag-and-drop, só `<select multiple>` das entidades disponíveis
- Ícones limitados aos 9 existentes (sofa, bed, kitchen, shower, car, tree, hanger, washing, monitor)

O importante é o **fluxo funcionar end-to-end**, não parecer bonito. Polish visual pode virar um 03-05 depois se necessário.

## Verification

Ao final da fase, o teste de aceitação é:
1. Limpar `localStorage` do dmsmart
2. Abrir o app → ver tela de boas-vindas
3. Adicionar uma instalação nova apontando pro HA local do escritório
4. Criar 2 zonas ("Reunião" e "Suíte") com entidades descobertas
5. Salvar → dashboard carrega com as 2 zonas
6. Adicionar uma SEGUNDA instalação (pode ser o mesmo HA com outro nome)
7. Trocar entre as duas pelo dropdown → ver zonas diferentes
8. Remover uma instalação → confirma limpeza de token + config
9. Nada de zona/entidade hardcoded aparece em lugar nenhum

## Status

- [ ] Plano criado — 2026-04-12
- [ ] 03-01 pendente
- [ ] 03-02 pendente
- [ ] 03-03 pendente
- [ ] 03-04 pendente
