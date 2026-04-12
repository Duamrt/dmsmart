# Phase 0 Plan: Infraestrutura Fisica

> **Contexto:** Casa do Duam em Jupi-PE, fase de fundacao (sapatas/arranques). Baldrame na proxima semana. Momento ideal para embutir toda a infraestrutura antes de fechar paredes. Erros aqui custam reforma depois.
>
> **Regra de ouro:** Se passa dentro da parede, faz AGORA. Se pluga na tomada, faz DEPOIS.

---

## Plan 00-01: Revisao do Projeto Eletrico com Eletricista

**Objetivo:** Garantir que o projeto eletrico contemple todos os requisitos de automacao (neutro, circuitos exclusivos, eletrodutos dimensionados e separados) antes de puxar a fiacao.
**Quem:** Duam + eletricista responsavel pela obra
**Quando:** Antes de puxar fiacao (obra no baldrame)
**Requirements:** INFRA-01, INFRA-02, INFRA-04, INFRA-07

### Contexto para o eletricista

Explicar ao eletricista que a casa tera automacao (interruptores inteligentes, sensores de energia, tablets de parede). Isso muda 3 coisas no projeto eletrico convencional:

1. **Neutro em todos os interruptores** (ele provavelmente nunca fez assim)
2. **Eletrodutos de dados SEPARADOS dos de forca** (com 30cm de distancia quando paralelos)
3. **Eletrodutos de reserva vazios** entre o rack central e cada comodo

### Tarefas

#### Bloco A -- Neutro e Circuitos (INFRA-01)

- [ ] **00-01-T1**: Confirmar com eletricista: TODOS os pontos de interruptor recebem 3 fios: **fase + retorno + NEUTRO**
  - Eletricista vai dizer "nunca fiz assim" -- e normal. Em obra nova, o custo e ~R$2-3 por ponto (um fio a mais). Sem neutro, interruptores smart ficam limitados a modelos fracos (6A, carga minima 3W)
  - Dica: puxar neutro de 1,5mm2 (mesmo do circuito de iluminacao) ate cada caixa de interruptor

- [ ] **00-01-T2**: Confirmar circuitos exclusivos com disjuntores individuais:
  | Circuito | Secao | Disjuntor | Regra |
  |----------|-------|-----------|-------|
  | Iluminacao (geral) | 1,5mm2 | 10A | Separado de tomadas |
  | Tomadas gerais | 2,5mm2 | 16A | Separado de iluminacao |
  | AC Sala | 2,5mm2 ou 4,0mm2 | 16A ou 20A | Exclusivo -- NAO compartilhar |
  | AC Suite | 2,5mm2 ou 4,0mm2 | 16A ou 20A | Exclusivo |
  | AC Quarto 1 | 2,5mm2 ou 4,0mm2 | 16A ou 20A | Exclusivo |
  | AC Quarto 2 | 2,5mm2 ou 4,0mm2 | 16A ou 20A | Exclusivo |
  | Chuveiro BWC Suite | 6,0mm2 ou 10,0mm2 | 40A ou 50A | Exclusivo (dimensionar para 7500W) |
  | Bomba d'agua | 2,5mm2 | 16A | Exclusivo |
  | Rack automacao | 2,5mm2 | 16A | Exclusivo, dedicado |
  - **Por que cada AC precisa de circuito exclusivo:** se compartilhar, o disjuntor desarma e o dashboard mostra "ligado" mas o AC esta desligado

- [ ] **00-01-T3**: Confirmar disjuntor DR geral no QDG (obrigatorio NBR 5410 para circuitos de tomada)

#### Bloco B -- Eletrodutos Dimensionados (INFRA-02)

- [ ] **00-01-T4**: Confirmar dimensionamento dos eletrodutos de FORCA por zona:
  | Zona | Eletroduto FORCA | Dispositivos |
  |------|-----------------|-------------|
  | Sala | **32mm** | Luz + AC + TV + som |
  | Suite | 25mm | Luz + AC + som |
  | Closet | 20mm | Luz |
  | BWC Suite | 25mm | Luz + chuveiro |
  | Quarto 1 | 25mm | Luz + AC |
  | Quarto 2 | 25mm | Luz + AC |
  | BWC 2 | 20mm | Luz |
  | BWC Social | 20mm | Luz |
  | Cozinha | 25mm | Luz |
  | Area de Servico | 25mm | Luz + bomba |
  | Garagem | 25mm | Luz + portao |
  | Quintal/Externo | 20mm (IP) | Luz externa |

- [ ] **00-01-T5**: Confirmar eletrodutos de DADOS separados (forca e dados NUNCA no mesmo tubo):
  | Zona | Eletroduto DADOS | Motivo |
  |------|-----------------|--------|
  | Sala | **32mm** | 3 drops Cat6a (TV + AP + reserva) |
  | Suite | 25mm | 2 drops Cat6a |
  | Quarto 1 | 25mm | 2 drops Cat6a |
  | Quarto 2 | 25mm | 2 drops Cat6a |
  | Garagem | 25mm | 1 drop (camera/AP futuro) |
  - **Regra:** minimo 30cm de distancia quando paralelos a eletrodutos de forca. Cruzamento a 90 graus

- [ ] **00-01-T6**: Confirmar eletrodutos de RESERVA vazios (INFRA-04):
  | Zona | Reserva | Diametro |
  |------|---------|----------|
  | Sala | 1 vazio | **32mm** |
  | Suite | 1 vazio | 25mm |
  | Closet | 1 vazio | 25mm |
  | BWC Suite | 1 vazio | 20mm |
  | Quarto 1 | 1 vazio | 25mm |
  | Quarto 2 | 1 vazio | 25mm |
  | BWC 2 | 1 vazio | 20mm |
  | BWC Social | 1 vazio | 20mm |
  | Cozinha | 1 vazio | 25mm |
  | Area de Servico | 1 vazio | 25mm |
  | Garagem | 1 vazio | 25mm |
  | Quintal | 1 vazio | 20mm |
  - **Todos vao do rack ate o comodo.** Custo: centavos. Valor futuro: cameras, sensores, HDMI, qualquer coisa

- [ ] **00-01-T7**: Confirmar eletroduto dedicado de 25mm entre rack e QDG (INFRA-07)
  - Finalidade: sensor CT clamp (Shelly EM) para medir consumo + futuro Modbus do inversor solar
  - NAO misturar com cabos de forca

#### Bloco C -- Regras Gerais

- [ ] **00-01-T8**: Confirmar com eletricista:
  - Ocupacao maxima de 40% da secao interna dos eletrodutos
  - Maximo 15 metros sem caixa de passagem em qualquer trecho
  - Maximo 3 curvas de 90 graus entre caixas de passagem
  - Caixas de passagem em locais ACESSIVEIS (acima de 2m, nunca atras de onde tera movel planejado)

#### Bloco D -- Armadilhas para Ficar de Olho

- [ ] **00-01-T9**: Alertas para Duam monitorar durante a obra:
  - **"Nao precisa de neutro no interruptor"** -- PRECISA sim, em todos. Conferir antes de fechar parede
  - **"Vou passar tudo no mesmo tubo"** -- NUNCA. Forca e dados sao eletrodutos separados
  - **"Depois a gente testa"** -- NUNCA. Testar continuidade de tudo ANTES do reboco
  - **Caixa de passagem abaixo de 2m** -- verificar se nao vai ficar atras de armario

---

## Plan 00-02: Rack e Infraestrutura de Rede

**Objetivo:** Definir a posicao exata do rack de automacao e garantir que toda a infraestrutura de rede (Cat6a) e pontos de tablet estejam embutidos antes de levantar paredes internas.
**Quem:** Duam + eletricista
**Quando:** Antes de levantar paredes internas (junto com a fiacao)
**Requirements:** INFRA-03, INFRA-05, INFRA-06

### Tarefas

#### Bloco A -- Posicao do Rack (INFRA-03)

- [ ] **00-02-T1**: Definir posicao do rack na planta real com o eletricista. Criterios:
  - **Central na planta** -- o mais equidistante possivel de todos os comodos (coordenador Zigbee precisa alcançar a casa inteira)
  - **Altura elevada** -- caixa entre 1,2m e 1,5m do chao (Zigbee 2.4GHz propaga melhor de posicao elevada)
  - **Ventilado** -- NAO dentro de armario fechado (Pi + switch geram calor 24/7)
  - **Acessivel** -- nao atras de movel planejado
  - Melhores candidatos: **corredor central** (entre quartos e sala) ou **parede da cozinha voltada pro corredor**
  - EVITAR: garagem (longe), BWC (umidade), dentro de movel

- [ ] **00-02-T2**: Confirmar infraestrutura eletrica do rack:
  - Circuito exclusivo, disjuntor 16A dedicado (ja no Plan 00-01-T2)
  - Tomada dupla ou tripla embutida atras do rack
  - Espaco minimo: 40cm largura x 40cm altura x 15cm profundidade
  - 2 pontos Cat6a chegando da entrada de internet (redundancia)

- [ ] **00-02-T3**: Confirmar que TODOS os eletrodutos (forca, dados, reserva) de TODOS os comodos convergem para o rack
  - Topologia estrela: tudo sai do rack e vai ate cada comodo
  - Nenhum eletroduto "passante" (comodo A -> comodo B sem passar pelo rack)

#### Bloco B -- Cabeamento Cat6a (INFRA-05)

- [ ] **00-02-T4**: Confirmar os 16 drops de Cat6a com o eletricista:
  | Zona | Drops | Destino |
  |------|-------|---------|
  | Sala | 3 | TV + AP WiFi + reserva |
  | Suite | 2 | AP WiFi ou TV + reserva |
  | Quarto 1 | 2 | PC/TV + reserva |
  | Quarto 2 | 2 | PC/TV + reserva |
  | Cozinha | 1 | Reserva (tablet/display futuro) |
  | Garagem | 1 | Camera/AP futuro |
  | Quintal | 1 | Camera/AP futuro |
  | Ponto tablet Sala | 1 | Dedicado ao tablet de parede |
  | Ponto tablet Suite | 1 | Opcional (tablet secundario) |
  | Rack (entrada) | 2 | Do roteador de internet |
  | **TOTAL** | **16** | |

- [ ] **00-02-T5**: Especificacoes do cabo e instalacao:
  - Cabo: **Cat6a U/FTP** (folha de aluminio) -- melhor blindagem
  - Raio minimo de curvatura: 4x o diametro externo do cabo
  - TODOS os cabos terminam no rack (topologia estrela, com patch panel)
  - **Etiquetar AMBAS as pontas** de cada cabo (comodo + numero). Exemplo: "SALA-01", "SALA-02"
  - NAO passar Cat6a no mesmo eletroduto que forca

- [ ] **00-02-T6**: **TESTAR CONTINUIDADE de todos os 16 cabos ANTES de rebocar**
  - Comprar ou pedir emprestado testador de rede (~R$50-100)
  - Testar cada cabo individualmente
  - Marcar como OK ou refazer
  - NAO fechar parede sem testar. Custo de refazer depois: R$300+/cabo

#### Bloco C -- Pontos de Tablet (INFRA-06)

- [ ] **00-02-T7**: Preparar ponto de tablet na **SALA** (obrigatorio):
  - Nicho na parede com profundidade minima de 5cm
  - Abertura: ~28cm x 20cm (para tablet 10"-11")
  - Altura: 1,30m a 1,40m do chao (altura dos olhos, confortavel de pe)
  - Caixa 4x4 embutida ATRAS do nicho contendo:
    - 1 tomada 127V (carregador USB fica atras, cabo nao aparece)
    - 1 terminacao Cat6a (dados + possibilidade PoE futura)
  - Eletroduto de dados 25mm do nicho ate o rack
  - Eletroduto de forca 20mm do nicho ate o circuito mais proximo

- [ ] **00-02-T8**: Preparar ponto de tablet na **SUITE** (opcional -- decidir agora, mesmo se instalar depois):
  - Mesmas specs do ponto da Sala
  - Mesmo que nao instale tablet agora, deixar o nicho + eletrodutos + tomada + Cat6a prontos
  - Custo de fazer agora: ~R$30-50 a mais. Custo de reforma depois: R$300-600

- [ ] **00-02-T9**: Escolher lado da parede para cada tablet:
  - Sala: parede mais visivel ao entrar (evitar parede com janela ou que receba sol direto -- reflexo no tablet)
  - Suite: proximo da porta ou da cabeceira (acessivel deitado e de pe)
  - Considerar layout de moveis planejados -- tablet NAO pode ficar atras de sofa/estante

#### Bloco D -- Malha Zigbee (preparacao)

- [ ] **00-02-T10**: Revisar mapa de cobertura Zigbee com base na posicao real do rack:
  ```
  [Quintal]---[Garagem]---[A.Servico]---[Cozinha]
                                |            |
                           [BWC Social] [Sala]------[Corredor/RACK]
                                         |              |
                                 [BWC 2]---[Q1]---[Q2]---[Suite]
                                                           |
                                                     [Closet]---[BWC Suite]
  ```
  - Cada zona tera 1 interruptor Zigbee (ZBMINI) que funciona como roteador automaticamente
  - Zonas criticas (mais distantes do rack): Quintal e Garagem -- garantir que Area de Servico e intermediaria
  - Coordenador Zigbee ficara no rack, via cabo USB de 1m (NAO direto no Pi)
  - Canal Zigbee: 15 ou 25 (evitar interferencia com WiFi canais 1, 6, 11)
  - Minimo 1 metro entre o dongle Zigbee e o roteador WiFi

---

## Criterios de Conclusao da Fase 0

Antes de rebocar/fechar paredes, TODOS devem estar marcados:

- [ ] **INFRA-01**: Fio neutro confirmado em TODOS os pontos de interruptor (conferido visualmente)
- [ ] **INFRA-02**: Eletrodutos de forca (25-32mm) e dados (25-32mm) separados e dimensionados por zona
- [ ] **INFRA-03**: Posicao do rack definida, circuito exclusivo puxado, tomada embutida
- [ ] **INFRA-04**: Eletroduto de reserva vazio entre rack e CADA comodo (12 eletrodutos vazios)
- [ ] **INFRA-05**: 16 drops Cat6a instalados, etiquetados nas duas pontas, continuidade testada OK
- [ ] **INFRA-06**: Nicho + tomada + Cat6a embutidos no ponto de tablet da Sala (e Suite se decidido)
- [ ] **INFRA-07**: Eletroduto dedicado 25mm do rack ate o QDG instalado

**Validacao final:** Duam percorre cada comodo com o eletricista conferindo os 3 eletrodutos (forca + dados + reserva) e testa todos os cabos Cat6a antes de liberar o reboco.

---

## Lista de Compras -- Infraestrutura (so o que embutir na obra)

| Item | Quantidade | Estimativa |
|------|-----------|-----------|
| Eletroduto corrugado 20mm | ~50m | R$80-120 |
| Eletroduto corrugado 25mm | ~150m | R$300-450 |
| Eletroduto corrugado 32mm | ~30m | R$80-120 |
| Cabo Cat6a U/FTP | ~250m (16 drops x ~15m medio) | R$600-900 |
| Caixas de passagem 4x4 | ~20 | R$100-150 |
| Caixa embutida tablet (Sala) | 1 | R$30-50 |
| Caixa embutida tablet (Suite) | 1 | R$30-50 |
| Testador de cabo de rede | 1 | R$50-100 |
| Etiquetas para cabos | 1 rolo | R$15-20 |
| **Total estimado** | | **R$1.300-1.900** |

> Hardware (Pi, switch, coordenador Zigbee, interruptores, tablets) fica para DEPOIS -- sao itens que plugam na tomada, nao precisam estar na parede.

---

*Plano criado: 2026-04-12*
*Referencia tecnica: .planning/phases/00-infraestrutura-fisica/RESEARCH.md*
