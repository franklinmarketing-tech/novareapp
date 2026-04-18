

## Análise da abertura atual

A imagem mostra o painel direito do `/login` com 3 linhas (Novare, Banco A, Banco B), badges flutuantes e legenda. O conceito está bom, mas tem problemas claros:

**Problemas identificados:**
1. **Novare não se destaca o suficiente** — as 3 linhas têm pesos visuais parecidos, sem hierarquia clara
2. **Badges desconectados** — "+14,75% Taxa Selic" e "~1% Rendimento/mês" não conversam visualmente com a Novare
3. **Animação estática após carregar** — depois que as linhas desenham, não há vida; só o pulse do "live" e os orbs
4. **Dados pouco convincentes** — só "+42%" no fim, sem comparativo claro Novare vs mercado
5. **Anel "35%" solto** no canto, sem contexto
6. **Ring chart e badges flutuam sem narrativa** — falta conectar números à história

## Melhorias propostas

### 1. Hierarquia visual: Novare como protagonista
- Linha Novare **mais espessa** (3.5px), com **glow verde forte** e **gradiente animado** percorrendo a curva (efeito "shimmer")
- Bancos A e B em **cinza/azul dessaturado, mais finos e opacos** (papel claro de "concorrentes")
- Área sob a Novare com **fill verde mais intenso**, bancos quase sem fill

### 2. Storytelling com dados reais comparativos
Substituir badges genéricas por um **painel comparativo "12 meses"** ancorado:

```text
┌─────────────────────────┐
│ ● NOVARE      +24,8% ↑  │  ← destaque verde, animado contando
│ ● CDI         +11,2%    │
│ ● Poupança     +6,4%    │
└─────────────────────────┘
```

Números **animam de 0 até o valor final** (count-up) sincronizado com o desenho da linha.

### 3. Animação contínua e viva (não só na entrada)
- **Pulso percorrendo a linha Novare** em loop (dot brilhante viajando da esquerda à direita a cada ~6s)
- **Tooltip flutuante** que aparece e some em pontos-chave, mostrando "Mar/24: R$ 12.480"
- **Última bolinha pulsando continuamente** (já existe parcialmente, intensificar)
- **Linhas de bancos com leve "breathing"** (opacidade oscilando sutilmente) para parecer dado vivo

### 4. Logo/marca Novare integrada
- Pequena marca **"N"** ou logo discreta perto do ponto final da linha verde, como "assinatura"
- Texto "**NOVARE**" com peso destacado no rodapé/legenda, bancos em caps menores e cinza

### 5. Header narrativo acima do gráfico
Adicionar um título curto sobre o gráfico:

```text
Performance comparada · últimos 12 meses
Sua jornada com a Novare
```

Tipografia leve, peso 500, com a palavra "Novare" em verde accent.

### 6. Eixo temporal sutil
Marcar 4-5 meses no eixo X (Jan, Abr, Jul, Out, Hoje) em texto micro (8px, opacidade 30%) — dá contexto sem poluir.

### 7. Detalhes finos de craft
- **Tooltip "Hoje +24,8%"** próximo ao ponto final, com fundo verde translúcido e seta apontando para a curva
- Remover o ring chart "35%" solto (não agrega) e substituir por um **mini sparkline secundário** ou KPI "+R$ 8.420 acumulado"
- **Grid de pontos mais sutil** (já está bom, manter)
- **Easing customizado** nas curvas (cubic-bezier) para sensação mais premium

### 8. Microinterações
- Ao passar o mouse sobre uma linha (mesmo na tela de login), **destacar** essa série e esmaecer as outras
- Cursor em "default" (não interativo de fato), mas hover em SVG groups dá vida

## Estrutura técnica das mudanças

Tudo dentro de `src/pages/Login.tsx` (painel direito, linhas 288-454):

| Componente | Mudança |
|---|---|
| `AnimatedLine` | Adicionar prop `animated` para shimmer em loop via `<animateTransform>` ou `motion` em `strokeDashoffset` |
| Novo: `CountUp` | Hook simples animando número de 0 ao valor com `requestAnimationFrame` |
| Novo: `ComparisonPanel` | Substitui os 2 badges separados — card unificado com 3 linhas (Novare/CDI/Poupança) |
| Novo: `TravelingPulse` | `<motion.circle>` com `offsetPath` percorrendo a curva Novare em loop |
| Novo: `EndTooltip` | Balão "+24,8% Hoje" no fim da linha verde |
| Remover | `RingChart` solto e badges atuais |
| Adicionar | Header narrativo + eixo X com meses |
| Linhas Banco A/B | Reduzir thickness (1px), opacidade 0.5, sem glow, sem fill (ou fill mínimo) |

## Resultado esperado

Uma abertura que **conta uma história em 3 segundos**: "A Novare entrega muito mais que CDI e Poupança" — comprovado por números animados, hierarquia visual clara e movimento contínuo que mantém o olho engajado enquanto o usuário digita o login.

