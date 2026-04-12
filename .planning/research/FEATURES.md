# Features Research --- dmsmart

**Dominio:** Dashboard de automacao residencial com monitoramento solar
**Pesquisado:** 2026-04-12
**Confianca geral:** MEDIUM-HIGH (baseado em analise de ha-fusion, Mushroom dashboards, DAKboard, comunidade HA, e praticas brasileiras de energia solar)

---

## Table Stakes

Funcionalidades que o usuario espera. Se faltar, o dashboard parece quebrado ou amador.

| Feature | Por que e esperado | Complexidade | Notas |
|---------|-------------------|-------------|-------|
| Toggle liga/desliga por dispositivo | Funcao primaria de qualquer dashboard IoT | Baixa | Botao grande, feedback visual instantaneo (cor muda antes da confirmacao do HA) |
| Agrupamento por zona/comodo | Sem isso, 30+ dispositivos viram uma lista ilegivel | Baixa | Sala, Suite, Cozinha etc. — corresponde ao mapa mental do usuario |
| Status em tempo real | Se o AC esta ligado ou desligado precisa estar correto AGORA | Media | WebSocket do HA ou polling curto (2-5s). Estado stale = dashboard inutil |
| Controle de temperatura do AC | Ligar/desligar AC sem ajustar temperatura e meia funcionalidade | Baixa | Slider ou +/- com valor visivel. Mostrar temperatura atual vs setpoint |
| Feedback visual de estado | Lampada acesa = icone iluminado, portao aberto = icone aberto | Baixa | Sem isso, usuario nao sabe se o comando funcionou |
| Responsivo tablet + celular | Dois dispositivos principais sao tablet na parede e celular | Media | Layout diferente por breakpoint, nao so "encolher" |
| Funcionar offline na rede local | Casa sem internet = dashboard precisa continuar funcionando | Alta | PWA com service worker. HA API local. Supabase so pra historico (nao critico) |
| Tempo de resposta < 300ms | Apertar botao e esperar 2s = frustrante no dia a dia | Media | Optimistic UI: mudar estado visual imediatamente, reverter se HA falhar |
| Relogio e data visivel | Tablet na parede SEMPRE precisa mostrar hora. E a primeira coisa que a pessoa olha | Baixa | Header ou canto. Formato 24h (padrao brasileiro) |
| Icones intuitivos sem texto | Na parede a 2 metros de distancia, texto pequeno nao funciona | Baixa | Icones grandes (48px+), cores de estado, texto so como label secundario |

## Differentiators

Funcionalidades que separam um dashboard premium de um generico. Nao sao esperadas, mas quando existem, impressionam.

| Feature | Proposta de valor | Complexidade | Notas |
|---------|------------------|-------------|-------|
| Saldo solar em tempo real | "Estou gerando mais do que consumo?" — resposta visual instantanea. Gauge ou barra que mostra fluxo de energia: rede -> casa ou casa -> rede | Media | Icone de sol animado quando gerando. Cor verde = superavit, vermelho = deficit |
| Planta baixa interativa | Ver a casa de cima, tocar no comodo para controlar. Contexto espacial imediato | Alta | SVG da planta com hotspots por zona. Comodos iluminados = lampadas acesas. Muito impactante visualmente |
| Modo idle/screensaver inteligente | Apos 60s sem toque, dashboard vira relogio bonito + clima + saldo solar. Previne burn-in e continua util | Media | Transicao suave. Micro-shifts de 0.5px pra evitar burn-in. Toque retorna ao dashboard |
| Animacoes de fluxo de energia | Particulas animadas mostrando energia fluindo do painel solar -> casa -> rede. Visual tipo Powerwall da Tesla | Alta | Diferencial visual forte. Tesla Energy fez isso virar referencia |
| Clima integrado (temperatura + umidade externa) | Contexto para decisao: "Ta quente la fora, ligar o AC" | Baixa | API OpenWeather ou sensor HA externo. Mostrar junto do controle de AC |
| Controle de cena com 1 toque | "Cinema" = TV liga, som liga, luzes baixam. "Boa noite" = tudo desliga | Media | HA ja suporta cenas. Dashboard so precisa do botao bonito |
| Historico de consumo com comparativo | "Gastei mais ou menos que o mes passado?" — grafico de barras simples | Media | Supabase armazena historico. Grafico simples, nao dashboard BI complexo |
| Notificacao visual de anomalia | Consumo 3x acima do normal = alerta vermelho na tela. Bomba d'agua ligada ha 2h = aviso | Media | Regras simples no backend. Visual: badge pulsante ou banner |
| Bandeira tarifaria visivel | Mostrar se a bandeira esta verde/amarela/vermelha. Impacto direto no custo | Baixa | Dado publico da ANEEL. Afeta decisao de quando usar aparelhos pesados |
| Economia acumulada do mes | "R$ X economizados com energia solar" — validacao constante do investimento | Media | Calculo: geracao solar * tarifa vigente. Motiva o dono |
| Gestos de toque (long press, swipe) | Long press numa lampada = dimmer. Swipe lateral = trocar zona | Media | Touch events nativos. Eleva a sensacao de app nativo |

## Anti-Features

Funcionalidades que parecem boas na teoria mas no uso diario irritam. Evitar deliberadamente.

| Anti-Feature | Por que evitar | O que fazer em vez disso |
|--------------|---------------|------------------------|
| Menu hamburger ou navegacao profunda | Tablet na parede = 1 toque pra qualquer acao. 3 niveis de menu = ninguem usa | Tudo visivel na tela principal ou 1 toque de distancia. Maximo 2 niveis |
| Graficos complexos na tela principal | Dashboard de energia nao e BI. Grafico de linhas com 6 series = poluicao visual | Numero grande + tendencia (seta pra cima/baixo). Graficos detalhados em tela secundaria |
| Confirmacao "tem certeza?" em acoes comuns | "Deseja realmente desligar a luz da sala?" 50x por dia = odio | Acao direta sem confirmacao. Desfazer e mais elegante que confirmar. Confirmacao SO para portao/bomba (seguranca) |
| Refresh manual / pull-to-refresh | Se o usuario precisa puxar pra atualizar, o dashboard falhou | Atualizacao automatica via WebSocket ou polling. Nunca depender de acao manual |
| Muitas cores e estilos misturados | 8 cores diferentes pra 8 tipos de dispositivo = carnaval visual | Paleta restrita: 2-3 cores de estado (ligado/desligado/alerta) + cor de marca |
| Texto pequeno ou informacao densa | A 2 metros do tablet, fonte 12px e invisivel | Fonte minima 16px no tablet. Informacao critica em 24px+. Densidade baixa |
| Loading spinners em toda acao | Spinner pra ligar lampada = sensacao de lentidao | Optimistic UI: mudar visual imediatamente. Spinner so se passar 3s+ sem resposta |
| Notificacoes push constantes | "Lampada da sala desligada" — ninguem quer saber disso | Notificar SO anomalias: consumo anormal, dispositivo offline, bomba ligada demais |
| Mostrar entidades cruas do HA | "switch.shelly_1pm_relay_0" aparecendo na tela = amador | Mapeamento nome amigavel obrigatorio. Nenhuma entidade crua visivel |
| Configuracao exposta no dashboard | Botao de config, YAML, entidades — zero disso na interface do usuario | Config via codigo ou HA. Dashboard e so pra USAR, nao pra configurar |
| Automacoes complexas no dashboard | Criar automacao "se X entao Y" direto na interface | Home Assistant ja faz isso. Dashboard controla, nao programa |
| Login/senha para acessar | E um tablet na parede da SUA casa. Pedir senha e absurdo | Acesso livre na rede local. Autenticacao so se expor pra internet (futuro) |
| Scroll vertical infinito | Dashboard com scroll = informacao importante some "abaixo da dobra" | Tudo visivel sem scroll. Se nao cabe, dividir em abas/zonas com 1 toque |

## Energy Monitoring Features

Funcionalidades especificas para monitoramento de energia solar + consumo, adaptadas ao contexto brasileiro.

### Metricas em Tempo Real (tela principal)

| Metrica | Visualizacao | Por que importa |
|---------|-------------|-----------------|
| Consumo instantaneo (W) | Numero grande + icone | "Quanto estou gastando agora" |
| Geracao solar instantanea (W) | Numero grande + icone sol | "Quanto estou gerando agora" |
| Saldo liquido (W) | Barra ou gauge: verde (superavit) / vermelho (deficit) | Resposta rapida: gerando mais ou consumindo mais? |
| Consumo acumulado hoje (kWh) | Numero medio | Progresso do dia |
| Geracao acumulada hoje (kWh) | Numero medio | Quanto o painel ja produziu |

### Metricas Historicas (tela secundaria)

| Metrica | Periodo | Visualizacao |
|---------|---------|-------------|
| Consumo vs geracao por dia | Ultimos 7/30 dias | Grafico de barras empilhadas simples |
| Consumo por zona | Mes atual | Barras horizontais rankeadas (maior consumidor primeiro) |
| Economia mensal em R$ | Mes atual + historico | Numero grande + comparativo mes anterior |
| Autonomia solar (%) | Mes atual | "X% do consumo veio do sol" — gauge circular |
| Creditos de energia acumulados | Acumulado | Saldo de kWh injetados na rede (compensacao ANEEL) |

### Features Especificas Brasil

| Feature | Detalhes | Impacto |
|---------|---------|---------|
| Bandeira tarifaria atual | Verde/Amarela/Vermelha patamar 1 e 2. Dado publico ANEEL | Afeta custo real. Vermelho P2 = +R$78,77/MWh |
| Horario de ponta destacado | 17h30-21h30 (varia por concessionaria). Visual: fundo levemente vermelho no relogio durante ponta | Conscientiza: evitar ligar AC/chuveiro nesse horario |
| Custo estimado em R$ (nao so kWh) | Converter kWh pra reais usando tarifa local + bandeira | kWh nao significa nada pro usuario. R$ sim |
| Alerta de consumo anormal | Consumo 2x acima da media do mesmo dia/horario | Detectar torneira aberta, bomba travada, equipamento com defeito |
| Projecao de conta | "Se continuar assim, sua conta sera ~R$ X" | Antecipa surpresas na fatura |

## Wall Tablet UX Patterns

Padroes especificos para tablet fixo na parede (modo kiosk, always-on).

### Layout e Hierarquia

| Padrao | Detalhes | Racional |
|--------|---------|----------|
| Informacao ambiental no topo | Hora, data, clima, saldo solar | Olhar rapido sem tocar — funciona como relogio de parede inteligente |
| Controles por zona no centro | Grid de zonas com status visual | Area principal de interacao. Maximo 6-8 zonas visiveis sem scroll |
| Alertas/status na base | Dispositivos offline, consumo anormal | Menos importante, mas sempre visivel |
| Fonte minima 18px | Labels e valores | A 1.5-2m de distancia, menor que isso e ilegivel |
| Alvos de toque minimo 48x48px | Botoes e toggles | Dedo humano = ~44px de area de contato |
| Contraste alto | Fundo escuro, elementos claros | Tablet em ambiente com iluminacao variavel. Modo escuro por padrao |

### Burn-in Prevention (Critico)

| Estrategia | Implementacao |
|-----------|--------------|
| Screensaver apos 60s idle | Transicao para modo relogio + clima. Elementos em movimento sutil |
| Micro-shift de pixels | Layout inteiro se move 1-2px a cada 30s. Imperceptivel pro usuario |
| Brilho automatico | Sensor de luz ambiente (se tablet suportar) ou horario: 70% dia, 30% noite |
| Rotacao de fundo | Fundo muda sutilmente de tom a cada X minutos |
| Wake on proximity | Se tablet suportar, tela acende ao detectar presenca. Desliga apos idle |

### Modo Idle (Screensaver Inteligente)

Nao e tela preta — e informacao passiva util:
- Relogio grande (digital ou analogico)
- Temperatura externa
- Saldo solar do dia (geracao - consumo)
- Proximo compromisso (se integrar calendario — futuro)
- Animacao sutil de fundo (particulas ou gradiente lento)

## Mobile UX Patterns

Padroes para acesso rapido via celular (PWA).

### Principios

| Principio | Detalhes |
|-----------|---------|
| Acesso em < 3 segundos | Abrir PWA, ver status, tocar, fechar. Nao e app pra ficar navegando |
| Acao primaria: controlar dispositivo | 80% do uso mobile = ligar/desligar algo. Priorizar isso |
| Status como informacao passiva | Abriu o app, viu que ta tudo ok, fechou. Sem precisar interagir |
| Uma mao so | Botoes na metade inferior da tela. Polegar alcanca tudo |

### Layout Mobile

| Elemento | Posicao | Tamanho |
|----------|---------|---------|
| Saldo solar + status geral | Topo (hero compacto) | 20% da tela |
| Quick actions (favoritos) | Centro-superior | 3-4 botoes grandes |
| Zonas (accordion ou tabs) | Centro | Cada zona expande pra mostrar dispositivos |
| Energia detalhada | Tab separada ou scroll abaixo | Nao polui a tela principal |

### Diferencas do Tablet

| Aspecto | Tablet (parede) | Celular |
|---------|----------------|---------|
| Densidade de informacao | Alta (tela grande, olhar passivo) | Baixa (tela pequena, uso rapido) |
| Graficos | Sim, na tela principal | Nao na tela principal, so em sub-tela |
| Screensaver | Essencial (burn-in) | Irrelevante |
| Navegacao | Tudo visivel, 1 toque | Tabs ou accordion, 1-2 toques |
| Fonte minima | 18px | 14px |
| Uso medio | Sempre ligado, olhadas passivas | 10-30s por sessao |

## Feature Dependencies

```
Status em tempo real --> Tudo (sem status, nada funciona)
Toggle dispositivo --> Status em tempo real (precisa saber estado atual)
Consumo instantaneo --> Integracao sensor de energia no HA
Geracao solar --> Integracao inversor solar no HA
Saldo solar --> Consumo instantaneo + Geracao solar
Historico --> Supabase (armazenamento)
Economia em R$ --> Historico + Tarifa configurada
Planta baixa --> SVG desenhado + mapeamento de zonas
Cenas --> Configuracao no HA + botoes no dashboard
Screensaver --> Timer idle + layout alternativo
Modo kiosk --> PWA fullscreen + meta tags
```

## MVP Recommendation

Priorizar (Fase 1 --- essencial para o dashboard funcionar e impressionar):

1. **Status em tempo real de todos os dispositivos** --- sem isso nao e dashboard, e pagina estatica
2. **Toggle liga/desliga por zona** --- funcao primaria
3. **Controle AC (temperatura)** --- segundo uso mais frequente
4. **Relogio + clima no header** --- tablet precisa disso pra justificar estar na parede
5. **Layout responsivo tablet + mobile** --- dois dispositivos principais
6. **Modo escuro por padrao** --- burn-in prevention + estetica

Priorizar (Fase 2 --- energia e polish):

7. **Consumo + geracao solar em tempo real** --- core value do projeto
8. **Saldo solar visual (gauge/barra)** --- diferencial principal
9. **Screensaver inteligente** --- protege o tablet, mantem utilidade
10. **Portao da garagem + bomba d'agua** --- dispositivos com confirmacao

Defer para fases posteriores:

- **Planta baixa interativa**: Alta complexidade, requer SVG customizado. Impressionante mas nao essencial
- **Animacoes de fluxo de energia**: Eye candy. Fazer depois que o basico estiver solido
- **Historico detalhado com graficos**: Supabase ja vai armazenar. Visualizacao pode esperar
- **Cenas**: HA ja suporta. Adicionar botoes no dashboard e rapido quando a base estiver pronta
- **Projecao de conta em R$**: Requer tarifa configurada + historico acumulado. Fase 3+
- **Creditos de energia ANEEL**: Complexidade regulatoria. Fase 4+

## Sources

- [ha-fusion GitHub](https://github.com/matt8707/ha-fusion) --- dashboard custom moderno para HA
- [Mushroom + Sections Dashboard](https://www.michaelsleen.com/dashboard-update/) --- padrao visual dominante em 2025
- [WallPanel Screensaver](https://github.com/j-a-n/lovelace-wallpanel) --- referencia de idle screen para tablets
- [Smart Home Dashboard UX Design](https://developex.com/blog/smart-home-dashboard-ux-design/) --- principios de UX para IoT
- [Seeed Studio - Best HA Dashboards](https://www.seeedstudio.com/blog/2026/01/09/best-home-assistant-dashboards/) --- overview 2025-2026
- [Dashboard Design Principles - UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/) --- anti-patterns gerais
- [Bandeiras Tarifarias Brasil](https://blog.luvik.com.br/bandeiras-tarifarias-um-guia-completo-para-integradores-de-energia-solar/) --- contexto brasileiro
- [Tarifa Branca CPFL](https://www.cpfl.com.br/tarifa-branca) --- horario de ponta
- [DAKboard](https://dakboard.com/site) --- referencia de ambient display
- [Burn-in Prevention LCD](https://www.displaymodule.com/blogs/knowledge/how-to-prevent-lcd-screen-burn-in-static-duration-brightness-control-regular-switching) --- estrategias tecnicas
- [Home Assistant 2025 Roadmap](https://www.home-assistant.io/blog/2025/05/09/roadmap-2025h1/) --- direcao oficial do HA
- [WEG Solar Monitoring](https://www.weg.net/solar/blog/monitoramento-da-producao-de-energia-solar-do-sistema-fotovoltaico-e-possivel/) --- monitoramento solar Brasil
