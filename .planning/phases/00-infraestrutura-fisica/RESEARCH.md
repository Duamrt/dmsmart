# Phase 0: Infraestrutura Fisica - Research

**Researched:** 2026-04-12
**Domain:** Infraestrutura eletrica e dados para automacao residencial durante construcao
**Confidence:** HIGH

## Summary

A Fase 0 e a mais critica do projeto dmsmart porque erros aqui custam reforma depois. A casa esta na fase de fundacao (sapatas/arranques), com baldrame na proxima semana -- o momento ideal para embutir toda a infraestrutura antes de fechar paredes.

A pesquisa cobre 7 dominios: requisitos eletricos para interruptores Zigbee (neutro obrigatorio em construcao nova), dimensionamento de eletrodutos por zona, posicionamento do rack de automacao, cabeamento estruturado Cat6a, itens para pre-instalar vs deixar para depois, instalacao de tablet de parede, e planejamento da malha Zigbee.

**Recomendacao principal:** Puxar neutro em TODOS os interruptores, separar eletrodutos de forca e dados, e deixar eletrodutos vazios de reserva entre o rack central e cada comodo. Custo na obra: centavos. Custo de reforma: milhares.

<phase_requirements>
## Phase Requirements

| ID | Descricao | Suporte na Pesquisa |
|----|-----------|---------------------|
| INFRA-01 | Projeto eletrico revisado com neutro em todos os pontos de interruptor | Secao "Requisitos Eletricos para Interruptores Zigbee" -- NBR 5410 + specs Sonoff ZBMINI |
| INFRA-02 | Eletrodutos dimensionados (25mm+ simples, 32mm+ longos), forca separada de dados | Secao "Dimensionamento de Eletrodutos por Zona" -- NBR 5410 + NBR 16415 |
| INFRA-03 | Posicao do rack definida (central, ventilado, circuito exclusivo) | Secao "Rack de Automacao" -- requisitos HA + Zigbee + ventilacao |
| INFRA-04 | Eletrodutos de reserva vazios entre rack e cada comodo (minimo 1 por comodo) | Secao "O Que Pre-Instalar vs Deixar Para Depois" -- eletrodutos reserva |
| INFRA-05 | Ponto de rede Cat6a em cada comodo + 2x Cat6a no rack | Secao "Cabeamento Estruturado Cat6a" -- drops por zona |
| INFRA-06 | Caixas embutidas para tablets (sala obrigatorio, suite opcional) | Secao "Instalacao de Tablet de Parede" -- caixa, energia, rede |
| INFRA-07 | Eletroduto dedicado do rack ate o QDG | Secao "Rack de Automacao" -- conexao com QDG para sensores CT clamp |
</phase_requirements>

## Requisitos Eletricos para Interruptores Zigbee

### Fio Neutro -- OBRIGATORIO em construcao nova

**Regra absoluta:** Em construcao nova, puxar fase + retorno + NEUTRO em TODAS as caixas de interruptor. Sem excecao.

**Por que:** Embora existam interruptores "sem neutro" (como o Sonoff ZBMINI-L2), ter neutro disponivel da liberdade total de escolha futura. Interruptores com neutro sao mais estaveis, tem mais opcoes de mercado, e nao tem restricao de carga minima.

**Sonoff ZBMINI-L2 (sem neutro):**
- Rating: 6A / 250V max
- Carga minima: 3W (lampadas abaixo disso nao funcionam)
- NAO funciona com carga indutiva (ventiladores)
- Tamanho: 39.5 x 32 x 18.4mm -- cabe em caixa 4x2 brasileira
- Zigbee 3.0, funciona como roteador na mesh

**Sonoff ZBMINI (com neutro):**
- Rating: 10A / 250V max -- QUASE O DOBRO de corrente
- Sem restricao de carga minima
- Funciona com qualquer tipo de carga
- Mais estavel, menos problemas de conectividade

**Conclusao:** Mesmo que o ZBMINI-L2 funcione sem neutro, com neutro disponivel voce usa o ZBMINI original (10A, sem restricoes) ou qualquer outro modelo do mercado. Custo de puxar o neutro na obra: ~R$2-3 por ponto (um fio a mais). Custo de quebrar parede depois: R$200-500 por ponto.

**Confianca:** HIGH -- specs oficiais Sonoff + NBR 5410.

### Dimensionamento de Circuitos (NBR 5410)

| Circuito | Secao minima | Disjuntor | Observacao |
|----------|-------------|-----------|------------|
| Iluminacao | 1,5 mm2 (cobre) | 10A | Circuito exclusivo para iluminacao |
| Tomadas gerais | 2,5 mm2 (cobre) | 16A | Separado da iluminacao |
| Ar-condicionado | 2,5 mm2 ou 4,0 mm2 | 16A ou 20A | Circuito EXCLUSIVO por AC -- disjuntor individual |
| Chuveiro eletrico | 6,0 mm2 ou 10,0 mm2 | 40A ou 50A | Depende da potencia. Circuito exclusivo |
| Bomba d'agua | 2,5 mm2 | 16A | Circuito exclusivo |
| Rack automacao | 2,5 mm2 | 16A | Circuito exclusivo, dedicado |

**Regra NBR 5410:** Iluminacao e tomadas devem ser circuitos SEPARADOS. Em residencia, juntar no mesmo circuito e permitido mas nao recomendado.

**Para o eletricista:** Cada AC deve ter circuito exclusivo com disjuntor individual. Se compartilhar circuito, o disjuntor desarma e o dashboard mostra "ligado" mas o AC esta desligado.

**Confianca:** HIGH -- NBR 5410, norma brasileira vigente.

## Dimensionamento de Eletrodutos por Zona

### Regras gerais (NBR 5410 + NBR 16415)

| Regra | Especificacao |
|-------|---------------|
| Ocupacao maxima | 40% da secao interna do eletroduto |
| Comprimento maximo sem caixa de passagem | 15 metros (NBR 16415) |
| Separacao forca/dados | Eletrodutos SEPARADOS, minimo 30cm de distancia quando paralelos |
| Cruzamento forca/dados | Quando inevitavel, cruzar a 90 graus |
| Curvas | Maximo 3 curvas de 90 graus entre caixas de passagem |

### Dimensionamento por tipo de zona

| Tipo de Zona | Eletroduto FORCA | Eletroduto DADOS | Eletroduto RESERVA |
|-------------|-----------------|-----------------|-------------------|
| **Sala** (luz + AC + TV + som) | 32mm | 32mm | 32mm vazio |
| **Suite** (luz + AC + som) | 25mm | 25mm | 25mm vazio |
| **Closet** (luz) | 20mm | -- | 25mm vazio |
| **BWC Suite** (luz + chuveiro) | 25mm (chuveiro precisa de circuito robusto) | -- | 20mm vazio |
| **Quarto 1** (luz + AC) | 25mm | 25mm | 25mm vazio |
| **Quarto 2** (luz + AC) | 25mm | 25mm | 25mm vazio |
| **BWC 2** (luz) | 20mm | -- | 20mm vazio |
| **BWC Social** (luz) | 20mm | -- | 20mm vazio |
| **Cozinha** (luz) | 25mm | -- | 25mm vazio |
| **Area de Servico** (luz + bomba) | 25mm | -- | 25mm vazio |
| **Garagem** (luz + portao) | 25mm | 25mm | 25mm vazio |
| **Quintal** (luz externa) | 20mm (com protecao IP) | -- | 20mm vazio |

### Por que eletroduto de RESERVA e obrigatorio

O eletroduto de reserva (vazio) custa centavos na obra mas vale ouro depois. Usos futuros:
- Cameras de seguranca (fora de escopo agora, mas virara necessidade)
- Sensor de presenca com fio
- HDMI para TV (alternativa ao wireless)
- Cabo de energia para dispositivo nao previsto

**Regra:** Minimo 1 eletroduto vazio de 25mm entre o rack e cada comodo. Nos comodos com mais dispositivos (Sala), usar 32mm.

**Confianca:** HIGH -- NBR 5410 e NBR 16415 para dimensionamento, comunidade de automacao para reservas.

## Rack de Automacao

### Requisitos do local

| Requisito | Especificacao | Motivo |
|-----------|--------------|--------|
| **Posicao na planta** | Centro da casa, o mais equidistante possivel de todos os comodos | Coordenador Zigbee precisa de alcance para toda a casa |
| **Altura** | Elevado (1,2m a 1,5m do chao) | Zigbee 2.4GHz propaga melhor de posicao elevada |
| **Ventilacao** | Local ventilado, NAO dentro de armario fechado | Raspberry Pi 5 + switch + equipamentos geram calor 24/7 |
| **Circuito eletrico** | Exclusivo, disjuntor dedicado 16A | Equipamentos de rede nao podem compartilhar circuito com eletrodomesticos que causam pico |
| **Pontos de rede** | 2x Cat6a (redundancia) chegando da entrada de internet | Servidor local precisa de conexao cabeada, nunca WiFi |
| **Tamanho** | Minimo 40x40x15cm (profundidade) | Cabe: Pi 5, switch 8 portas, patch panel pequeno, organizador |

### Melhor posicao na planta de Jupi

Considerando as 12 zonas, o local ideal e um ponto entre a Sala e a Cozinha ou no corredor de acesso aos quartos -- o ponto mais central da planta. Opcoes:

1. **Corredor central** (entre quartos e sala) -- IDEAL se houver espaco na parede
2. **Parede da cozinha** voltada para o corredor -- acessivel, ventilado
3. **Area de servico** -- funcional mas nao e central (Zigbee pode nao alcançar os quartos)

**EVITAR:** Garagem (longe demais), BWC (umidade), dentro de movel planejado (sem ventilacao).

### O que vai no rack

| Equipamento | Funcao |
|------------|--------|
| Raspberry Pi 5 8GB + NVMe | Home Assistant OS -- cerebro de automacao |
| Coordenador Zigbee (ZBT-2 ou ZBDongle-E) | Coordenador da malha Zigbee (via cabo USB 1m, NAO direto no Pi) |
| Switch Ethernet 8 portas (Gigabit) | Distribui rede cabeada para os comodos |
| Patch panel 8-12 portas (Cat6a) | Organiza as terminacoes do cabeamento estruturado |
| Nobreak/UPS pequeno (600VA) | Mantem automacao funcionando em queda de energia (5-15min) |
| Roteador WiFi | Rede wireless da casa (separado do switch cabeado) |

### Eletroduto do rack ao QDG (INFRA-07)

Obrigatorio: eletroduto dedicado de 25mm entre o rack e o Quadro de Distribuicao Geral. Finalidade:
- Passar cabo do sensor CT clamp (Shelly EM) que monitora consumo no QDG
- Futuro: passar cabo de dados do inversor solar (Modbus RS485)
- Nunca misturar este eletroduto com cabos de forca

**Confianca:** HIGH -- requisitos de HA + Zigbee bem documentados.

## Cabeamento Estruturado Cat6a

### Por que Cat6a e nao Cat6

Para uma casa nova em 2026 onde os cabos ficam dentro da parede por 20+ anos, Cat6a e o investimento correto:
- Suporta 10 Gbps ate 100m (Cat6 suporta 10G apenas ate 55m)
- Melhor blindagem contra interferencia (importante pois corre perto de forca na parede)
- WiFi 7 access points futuros podem exigir 10G no backhaul
- Diferenca de custo: ~30% a mais que Cat6 (justificavel em construcao nova)

### Drops por zona

| Zona | Drops Cat6a | Destino | Justificativa |
|------|------------|---------|---------------|
| **Sala** | 3 | 1 TV, 1 AP WiFi, 1 reserva | TV e AP precisam de cabo. Reserva para console/soundbar |
| **Suite** | 2 | 1 AP WiFi ou TV, 1 reserva | Depende do layout |
| **Closet** | 0 | -- | Sem necessidade |
| **BWC Suite** | 0 | -- | Sem necessidade (dispositivos Zigbee) |
| **Quarto 1** | 2 | 1 uso geral (PC/TV), 1 reserva | Pode virar home office |
| **Quarto 2** | 2 | 1 uso geral (PC/TV), 1 reserva | Pode virar home office |
| **BWC 2** | 0 | -- | Sem necessidade |
| **BWC Social** | 0 | -- | Sem necessidade |
| **Cozinha** | 1 | 1 reserva | Para tablet/display futuro |
| **Area de Servico** | 0 | -- | Sem necessidade |
| **Garagem** | 1 | 1 camera/AP futuro | Seguranca futura |
| **Quintal** | 1 | 1 camera/AP futuro | Seguranca futura |
| **Rack** | 2 (entrada) | 2 do roteador de internet | Redundancia, entrada principal da internet |
| **Ponto tablet Sala** | 1 | Dedicado ao tablet de parede | Alimentacao PoE + dados |
| **Ponto tablet Suite** | 1 (opcional) | Tablet secundario | Se decidir instalar |
| **TOTAL** | ~16 drops | | |

### Regras de instalacao

- Todos os cabos terminam no rack (topologia estrela)
- Etiquetar AMBAS as pontas do cabo (comodo + numero)
- Testar continuidade antes de fechar a parede
- Cabo Cat6a U/FTP (folha de aluminio) para melhor blindagem
- Raio minimo de curvatura: 4x o diametro externo do cabo
- NAO passar Cat6a no mesmo eletroduto que forca -- usar eletroduto de dados separado

**Confianca:** HIGH -- NBR 16415 + melhores praticas CEDIA para residential structured cabling.

## O Que Pre-Instalar vs Deixar Para Depois

### PRE-INSTALAR NA OBRA (antes de fechar paredes)

| Item | Motivo | Custo se deixar pra depois |
|------|--------|---------------------------|
| Fio neutro em todas as caixas de interruptor | Impossivel adicionar sem quebrar parede | R$200-500/ponto de reforma |
| Eletrodutos de forca dimensionados (25-32mm) | Trocar eletroduto = quebrar parede | R$300-800/trecho |
| Eletrodutos de dados SEPARADOS dos de forca | Separar depois = obra completa | R$500-1000/trecho |
| Eletrodutos de RESERVA vazios (rack -> cada comodo) | Adicionar eletroduto = quebrar parede | R$200-500/trecho |
| Cabeamento Cat6a (todos os drops) | Passar cabo com parede fechada e muito dificil | R$150-300/drop (com reforma) |
| Caixa embutida para tablet (sala + suite) | Abrir nicho na parede pronta = reforma | R$300-600/ponto |
| Eletroduto rack -> QDG | Fundamental para sensores de energia | R$200-400 |
| Caixas de passagem em locais acessiveis | Caixa atras de movel = inacessivel | Impossivel corrigir |
| Circuito exclusivo para rack de automacao | Adicionar circuito ao QDG depois e simples, mas o eletroduto nao | Medio |

### DEIXAR PARA DEPOIS (nao precisa agora)

| Item | Motivo | Quando fazer |
|------|--------|-------------|
| Raspberry Pi 5 + SSD | Hardware, compra quando chegar na fase de software | Fase 1 (apos mudanca) |
| Coordenador Zigbee (ZBT-2) | Hardware | Fase 1 |
| Switch Ethernet | Hardware, comprar proximo da mudanca | Fase 1 |
| Interruptores Zigbee (ZBMINI) | Instalar depois de rebocar/pintar | Apos acabamento |
| IR Blasters (Broadlink) | Plug and play, nao precisa de infra | Apos instalar AC |
| Shelly EM (sensor consumo) | Instala no QDG, nao precisa de obra | Fase 4 |
| Tablet de parede | Comprar proximo da mudanca | Fase 1-2 |
| Nobreak/UPS | Hardware simples | Fase 1 |
| Inversor solar + paineis | Projeto solar separado, pode ser durante ou apos obra | Fase 4 |

**Regra de ouro:** Se passa dentro da parede, faz AGORA. Se pluga na tomada, faz DEPOIS.

**Confianca:** HIGH -- consenso absoluto da comunidade de automacao residencial.

## Instalacao de Tablet de Parede

### Especificacoes da caixa embutida

| Aspecto | Especificacao |
|---------|---------------|
| **Tipo de caixa** | Caixa de passagem embutida retangular, maior que 4x4 padrao |
| **Dimensoes recomendadas** | Abertura de ~28cm x 20cm x 5cm (profundidade) para tablet 10" |
| **Alternativa simples** | Caixa 4x4 para energia + rede, com suporte superficial para tablet |
| **Altura de instalacao** | 1,30m a 1,40m do chao (altura dos olhos, confortavel de pe) |
| **Energia** | Tomada embutida ATRAS do tablet (nao aparece cabo) -- 127V para carregador USB |
| **Rede** | Ponto Cat6a dedicado (possibilita PoE com adaptador, eliminando carregador USB) |
| **Acabamento** | Borda do nicho rente a parede (flush mount), moldura decorativa opcional |

### Pontos de tablet planejados

| Local | Prioridade | Descricao |
|-------|-----------|-----------|
| **Sala** | OBRIGATORIO | Painel principal, ponto de maior visibilidade e uso |
| **Suite** | OPCIONAL | Controle do quarto (AC, luz) sem pegar celular |

### O que embutir na obra (por ponto de tablet)

1. Nicho na parede com profundidade minima de 5cm
2. Eletroduto de dados (25mm) do nicho ate o rack -- para Cat6a
3. Eletroduto de forca (20mm) do nicho ate o circuito mais proximo -- para energia
4. Caixa 4x4 ATRAS do nicho com tomada + terminacao Cat6a

**Se preferir PoE (Power over Ethernet):** So o eletroduto de dados e necessario. O cabo Cat6a leva energia + dados. Precisa de switch PoE no rack + adaptador PoE no tablet. Vantagem: 1 cabo so. Desvantagem: custo do switch PoE.

### Modelos de tablet recomendados para kiosk

| Modelo | Tela | Preco estimado | Observacao |
|--------|------|----------------|-----------|
| Lenovo Tab M11 | 11" | ~R$1.200 | Bom custo-beneficio, tela IPS |
| Amazon Fire HD 10 | 10.1" | ~R$800 | Mais barato, precisa desbloquear para instalar apps |
| Samsung Galaxy Tab A9+ | 11" | ~R$1.500 | Melhor qualidade, mais caro |

**Software kiosk:** Fully Kiosk Browser (R$45 licenca unica). Tela sempre ligada, wake por movimento, impede sair do app, integracao nativa com HA.

**Confianca:** HIGH para infraestrutura (caixa + eletroduto). MEDIUM para modelo especifico de tablet (depende de disponibilidade).

## Planejamento da Malha Zigbee

### Conceitos fundamentais

| Conceito | Explicacao |
|----------|-----------|
| **Coordenador** | O dongle USB (ZBT-2) no rack. So pode ter 1. Gerencia a rede |
| **Roteador** | Dispositivo Zigbee energizado 24/7 (tomada, interruptor smart). Retransmite sinais, forma a mesh |
| **End-device** | Dispositivo a bateria (sensor de porta, sensor temp). NAO retransmite. Depende de roteador proximo |
| **Regra de ouro** | 1 roteador para cada 6-8 end-devices |

### Estrategia para as 12 zonas

O interruptor Zigbee de cada zona (ZBMINI) funciona como ROTEADOR automaticamente, porque esta sempre energizado. Com 12 zonas de iluminacao, a casa ja tera 12+ roteadores Zigbee formando uma malha densa.

### Mapa de cobertura recomendado

```
[Quintal]---[Garagem]---[A.Servico]---[Cozinha]
                              |            |
                         [BWC Social] [Sala]------[Corredor]
                                       |              |
                               [BWC 2]---[Q1]---[Q2]---[Suite]
                                                         |
                                                   [Closet]---[BWC Suite]
```

**Cada caixa no diagrama = 1 interruptor Zigbee = 1 roteador.**

### Regras de posicionamento

| Regra | Detalhe |
|-------|---------|
| Coordenador no centro | Rack no corredor central, elevado 1.2-1.5m |
| Distancia maxima entre roteadores | 10-15 metros em ambiente interno (paredes reduzem alcance) |
| Zonas criticas (mais distantes) | Quintal e Garagem -- garantir roteador intermediario (A. Servico) |
| Evitar obstrucoes | Metal e vidro bloqueam 2.4GHz. Coordenador longe de geladeira, micro-ondas, espelhos grandes |
| Canal Zigbee | Configurar canal 15 ou 25 (distante dos canais WiFi 1, 6, 11) |
| WiFi 2.4GHz | Configurar nos canais 1 e 6. NUNCA canal 11 se Zigbee estiver no 25 |
| Distancia coordenador-roteador WiFi | Minimo 1 metro entre o dongle Zigbee e o roteador WiFi |

### Pareamento -- ordem CORRETA

1. Instalar todos os interruptores Zigbee (roteadores) nos locais definitivos
2. Parear os interruptores com o coordenador -- eles formam a malha
3. Depois (dias/semanas depois), parear sensores (end-devices) JA no local definitivo
4. NUNCA parear tudo na bancada e depois instalar -- a rota Zigbee grava o caminho errado

### Zonas que podem precisar de roteador extra

| Zona | Risco | Solucao |
|------|-------|---------|
| Quintal/Externo | Mais distante do rack, parede externa bloqueia sinal | Smart plug Zigbee na Area de Servico como roteador intermediario |
| Garagem | Portao metalico bloqueia sinal | Smart plug Zigbee na garagem (sempre ligado) |
| BWC Suite (se afastado) | Parede + umidade + espelho | Interruptor da Suite ja cobre, mas monitorar |

**Confianca:** HIGH -- guias oficiais de Zigbee2MQTT + comunidade HA.

## Common Pitfalls

### Pitfall 1: Eletricista que "nao precisa de neutro no interruptor"

**O que da errado:** Eletricista pensa em instalacao convencional e puxa so fase + retorno.
**Por que acontece:** Neutro no interruptor nao e padrao em instalacao convencional brasileira.
**Como evitar:** Documento escrito para o eletricista: "TODOS os pontos de interruptor recebem fase, retorno E neutro". Conferir antes de fechar a parede.
**Sinais de alerta:** Eletricista dizendo "nunca fiz assim" ou "vai gastar fio atoa".

### Pitfall 2: Caixa de passagem atras de movel planejado

**O que da errado:** Precisa puxar cabo novo mas a caixa de passagem esta inacessivel.
**Por que acontece:** Projeto eletrico e feito antes do projeto de moveis planejados.
**Como evitar:** Mapear layout de moveis ANTES de definir posicoes de caixas. Caixas devem ficar em locais acessiveis (alto na parede, acima de portas, no teto com tampa).
**Sinais de alerta:** Caixa de passagem abaixo de 2m em parede onde tera armario.

### Pitfall 3: Eletroduto de dados junto com forca

**O que da errado:** Cabo Cat6a pega interferencia eletromagnetica, rede instavel.
**Por que acontece:** Eletricista usa o mesmo eletroduto pra tudo.
**Como evitar:** Eletrodutos fisicamente separados, minimo 30cm de distancia quando paralelos. Se cruzarem, a 90 graus.
**Sinais de alerta:** Eletricista puxando cabos de dados e forca no mesmo tubo.

### Pitfall 4: Nao testar cabeamento antes de fechar parede

**O que da errado:** Cabo Cat6a com defeito (dobra, rommpimento) so descoberto apos rebocar.
**Por que acontece:** Pressa para fechar parede, confianca de que "esta ok".
**Como evitar:** Testar continuidade de TODOS os cabos Cat6a com testador de rede antes de reboco. Custo do testador: R$50-100. Custo de refazer: R$300+/cabo.
**Sinais de alerta:** "Depois a gente testa".

### Pitfall 5: Rack em local sem ventilacao

**O que da errado:** Equipamentos superaquecem, Pi trava, rede cai.
**Por que acontece:** Rack "escondido" dentro de armario fechado por estetica.
**Como evitar:** Local com circulacao de ar. Se for em armario, furos de ventilacao ou cooler.
**Sinais de alerta:** Rack planejado dentro de armario de alvenaria sem abertura.

## Checklist Para o Eletricista

Documento para imprimir e entregar ao eletricista:

```
CHECKLIST INFRAESTRUTURA SMART HOME -- Casa Duam, Jupi-PE

[ ] 1. NEUTRO em TODOS os pontos de interruptor (fase + retorno + neutro)
[ ] 2. Eletrodutos de FORCA: minimo 25mm (32mm na Sala e rack)
[ ] 3. Eletrodutos de DADOS: SEPARADOS dos de forca, minimo 25mm
[ ] 4. Distancia minima 30cm entre eletrodutos de forca e dados (paralelos)
[ ] 5. Eletroduto de RESERVA vazio (25mm) do rack a CADA comodo
[ ] 6. Eletroduto dedicado 25mm entre rack e QDG
[ ] 7. Circuito exclusivo para rack de automacao (disjuntor 16A)
[ ] 8. Circuito exclusivo para CADA ar-condicionado
[ ] 9. Ponto de rede Cat6a em: Sala(3), Suite(2), Q1(2), Q2(2), Cozinha(1), Garagem(1), Quintal(1), Tablet Sala(1), Tablet Suite(1), Rack(2) = 16 drops
[ ] 10. Caixa embutida para tablet: Sala (obrigatorio) + Suite (opcional)
[ ] 11. Tomada 127V atras do ponto de tablet
[ ] 12. Caixas de passagem em locais ACESSIVEIS (acima de moveis, nunca atras)
[ ] 13. Maximo 15m sem caixa de passagem em qualquer trecho
[ ] 14. Etiquetar ambas as pontas de cada cabo Cat6a
[ ] 15. Testar continuidade de todos os cabos ANTES de reboco
```

## Itens que Precisam de Validacao Profissional

| Item | Profissional | O que validar |
|------|-------------|---------------|
| Dimensionamento dos circuitos | Engenheiro eletricista / eletricista qualificado | Calculo de demanda total, secoes dos condutores, disjuntores |
| Posicao exata do rack | Engenheiro eletricista + Duam | Melhor ponto central na planta real |
| Projeto solar (inversor + paineis) | Empresa de energia solar | Dimensionamento kWp, inclinacao, inversor Growatt com Modbus |
| Circuito do chuveiro (BWC Suite) | Eletricista | Secao do condutor depende da potencia do chuveiro escolhido |
| Disjuntor DR geral | Eletricista | Obrigatorio pela NBR 5410 para circuitos de tomada |

## Don't Hand-Roll

| Problema | Nao faca voce mesmo | Contrate/compre | Motivo |
|----------|-------------------|----------------|--------|
| Cabeamento estruturado | Crimpar Cat6a sem certificacao | Eletricista com crimpador Cat6a e testador | Cat6a e sensivel a crimpage ruim, perde performance |
| Projeto eletrico | Diagrama "de cabeca" | Projeto eletrico formal (engenheiro) | NBR 5410 exige, seguro exige, banco exige |
| Dimensionamento solar | Calcular kWp no chute | Empresa especializada com simulacao | Sombreamento, inclinacao, compensacao ANEEL sao complexos |

## State of the Art

| Abordagem antiga | Abordagem atual (2026) | Impacto |
|-----------------|----------------------|---------|
| Cat5e/Cat6 | Cat6a em construcao nova | 10G ready, futuro-proof para WiFi 7 |
| Interruptor sem neutro (reforma) | Neutro em todos os pontos (obra nova) | Liberdade total de dispositivos |
| Rack com hub/switch no armario | Rack ventilado, central, acessivel | Confiabilidade 24/7 |
| WiFi mesh pra tudo | Zigbee mesh + WiFi segmentado | Estabilidade IoT, nao congestiona WiFi |
| PoE restrito a comercial | PoE em residencias (tablets, APs, cameras) | 1 cabo = energia + dados |

## Open Questions

1. **Posicao exata do rack na planta**
   - O que sabemos: deve ser central, ventilado, elevado
   - O que falta: a planta baixa real para definir o ponto exato
   - Recomendacao: Duam define com o eletricista/engenheiro quando tiver a planta em maos

2. **Chuveiro inteligente (BWC Suite)**
   - O que sabemos: esta no escopo (CTRL-07), precisa de circuito exclusivo robusto
   - O que falta: definicao do modelo/marca do chuveiro smart
   - Recomendacao: dimensionar o circuito para 7500W (padrao chuveiro BR) e decidir modelo depois

3. **Inversor solar: Growatt ou Deye?**
   - O que sabemos: Growatt tem integracao oficial HA, Deye cresce no BR
   - O que falta: cotacao com instalador local em Jupi-PE
   - Recomendacao: priorizar inversor com Modbus local (Growatt MIN com Shine-X ou Deye com SolarAssistant)

## Sources

### Primary (HIGH confidence)
- [NBR 5410 - Secao Minima Condutores](https://lglengenharia.com.br/secao-minima-de-condutores-nbr-5410/)
- [NBR 16415 - Caminhos e Espacos Cabeamento](https://www.normas.com.br/visualizar/abnt-nbr-nm/35121/abnt-nbr16415-caminhos-e-espacos-para-cabeamento-estruturado)
- [Sonoff ZBMINI-L2 Official Specs](https://sonoff.tech/en-us/products/sonoff-zbmini-extreme-zigbee-smart-switch-zbminil2)
- [Home Assistant Zigbee Network Optimization Guide](https://community.home-assistant.io/t/zigbee-network-optimization-a-how-to-guide-for-avoiding-radio-frequency-interference-adding-zigbee-router-devices-repeaters-extenders-to-get-a-stable-zigbee-network-mesh-with-best-possible-range-and-coverage-by-fully-utilizing-zigbee-mesh-networking/515752)
- [CEDIA - Structured Cabling Cat6A vs Cat7 vs Fibre](https://cedia.org/en-us/smart-home-professionals/news/structured-cabling-for-the-future-cat6a-vs-cat7-vs-fibre-in-smart-homes/)
- [SmartHomeScene - Build Stable Zigbee Network](https://smarthomescene.com/guides/how-to-build-a-stable-and-robust-zigbee-network/)

### Secondary (MEDIUM confidence)
- [Smart Home Wiring Guide 2026 - ModuBlox](https://www.modublox.com/guides/smart-home-wiring-guide)
- [Cat6 vs Cat6A When It Matters - DataWireSolutions](https://datawiresolutions.com/blog/cat6-vs-cat6a-when-it-matters)
- [Smart Home Electrical Planning - NewCenturySales](https://newcenturysalesinc.com/how-to-plan-electrical-systems-for-smart-homes/)
- [Dueto Automacao - Preparar Casa na Obra](https://duetoautomacao.com.br/como-preparar-automacao-na-obra)

### Tertiary (LOW confidence)
- Modelos especificos de tablet (disponibilidade e preco variam)
- Posicao exata do rack (depende da planta real)

## Metadata

**Confidence breakdown:**
- Requisitos eletricos (neutro, circuitos): HIGH -- NBR 5410, specs oficiais Sonoff
- Dimensionamento eletrodutos: HIGH -- NBR 5410 + NBR 16415
- Rack de automacao: HIGH -- documentacao HA + comunidade
- Cabeamento Cat6a: HIGH -- NBR 16415 + CEDIA guidelines
- Tablet de parede: MEDIUM -- infraestrutura HIGH, modelo especifico MEDIUM
- Malha Zigbee: HIGH -- guias oficiais Zigbee2MQTT + comunidade HA
- Pitfalls: HIGH -- documentados extensivamente na comunidade + PITFALLS.md do projeto

**Research date:** 2026-04-12
**Valid until:** 2026-07-12 (90 dias -- infraestrutura fisica e estavel, nao muda rapido)
