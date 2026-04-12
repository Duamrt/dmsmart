# Cliente: Casa Jupi-PE (Duam)

Uma das instalações de referência do dmsmart. Casa residencial do Duam em Jupi-PE, atualmente em obra (fundação concluída, baldrame na sequência). Este documento guarda o contexto **específico desse cliente** — nada aqui deve vazar para o core do produto.

## Status da obra

- Fase atual: sapatas e arranques concretados
- Próxima etapa: baldrame
- Janela crítica: antes de fechar paredes para passar eletroduto/cabeamento

## Arquitetura de automação (planejada)

- **Home Assistant** rodando em Raspberry Pi 5 + NVMe
- **Protocolo principal:** Zigbee2MQTT (não ZHA) para os 30+ dispositivos
- **Solar:** Growatt como inversor recomendado, Shelly EM para medição no quadro
- **Tablet parede:** Fully Kiosk Browser em Android 10" na sala

## 12 zonas mapeadas na planta baixa

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

> Este mapeamento pertence ao cliente, não ao produto. Quando a Casa Jupi usar o dmsmart em produção, essas zonas vão ser criadas pelo próprio wizard (Fase 3) — não vão sair hardcoded do código.

## Milestone: Infraestrutura Física (durante obra)

**Goal:** Garantir que toda a infraestrutura elétrica e de dados esteja preparada antes de fechar as paredes.

**Requisitos (antiga INFRA-01 a INFRA-07):**

- [ ] **CJ-INFRA-01**: Projeto elétrico revisado com neutro em todos os pontos de interruptor
- [ ] **CJ-INFRA-02**: Eletrodutos dimensionados (25mm+ simples, 32mm+ longos), força separada de dados
- [ ] **CJ-INFRA-03**: Posição do rack de automação definida (local central, ventilado, circuito exclusivo)
- [ ] **CJ-INFRA-04**: Eletrodutos de reserva vazios entre rack e cada cômodo (mínimo 1 por cômodo)
- [ ] **CJ-INFRA-05**: Ponto de rede Cat6a em cada cômodo + 2x Cat6a no rack
- [ ] **CJ-INFRA-06**: Caixa embutida para tablet marcada na parede da sala (suíte opcional)
- [ ] **CJ-INFRA-07**: Eletroduto dedicado do rack até o QDG (para sensor Shelly EM)

**Gotchas conhecidos:**
- Neutro em TODOS os interruptores — eletricista BR não faz isso por padrão
- Eletroduto força e dados **sempre separados** — nunca no mesmo tubo
- 16 drops Cat6a — testar continuidade **antes** de rebocar
- Rack no corredor central, elevado 1,2–1,5m, ventilado
- Eletroduto 25mm dedicado rack → QDG

**Checklist interativo:** `docs/eletricista-checklist.html` (com atalho no Desktop)

## Status no produto

- Instalação no dmsmart: **ainda não configurada** (aguarda Pi + Zigbee funcionando)
- Vai virar cliente real do produto quando chegar na Phase 3 do roadmap (setup wizard disponível)
