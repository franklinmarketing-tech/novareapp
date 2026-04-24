# Melhorias na Calculadora de Investimentos

Após analisar a tela atual, identifiquei **8 melhorias** organizadas por impacto. Cada uma é independente — você pode aprovar todas ou só algumas.

---

## 1. Hierarquia tipográfica dos labels (alta prioridade)

**Problema:** Labels dos inputs ("Qual sua idade hoje?", "Quanto consegue investir por mês?") estão em `text-white/50` — muito apagados, parecem desabilitados. O olho não sabe onde focar.

**Solução:**

- Labels principais: `text-white/85 font-semibold` (legível mas não compete com o valor)
- Mantém mini-hint abaixo em `text-white/40` quando necessário
- Aumenta peso da pergunta para `font-semibold` (atual é regular)

---

## 2. Cards de seleção de taxa (Prefixado / Pós-fixado / IPCA+)

**Problema:** O card selecionado (Prefixado) tem borda/glow terracota muito sutil. Já o IPCA+ usa "IPCA + 7%" em branco enquanto os outros mostram o valor em terracota — falta consistência.

**Solução:**

- Padronizar todos os 3 valores no mesmo destaque terracota (`text-accent`)
- Card selecionado: borda `border-accent` (sólida, não `/40`) + ring `ring-2 ring-accent/30` para destaque inequívoco
- Card não-selecionado: `border-white/10` com hover `border-white/25` (estado intermediário claro)
- Check mark do selecionado: aumentar de 14px para 16px

---

## 3. Botão "Simular Aposentadoria" — peso visual

**Problema:** O botão está bom, mas a seta dentro de um quadradinho compete visualmente com o ícone do gráfico.

**Solução:**

- Remover o "container" da seta — apenas `<ArrowRight>` simples ao lado direito
- Aumentar gap interno para respirar
- Animar a seta com `translate-x-1` no hover (microinteração sutil)

---

## 4. Painel de resultados — diferenciação dos KPIs

**Problema:** Os 3 mini-KPIs no canto inferior direito (Investido / Ganho líq. / Imposto) usam 3 cores diferentes (terracota, verde, amarelo), mas o "Imposto" em `text-warning` (amarelo) vibra demais — parece um aviso de erro, não uma informação neutra.

**Solução:**

- "Imposto" muda de `text-warning` (amarelo vibrante) para `text-white/80` (neutro) com apenas o ícone em terracota suave
- Mantém apenas **Ganho líq.** em verde (a única métrica que realmente é "positiva")
- Investido continua terracota (cor da marca = ação do usuário)

---

## 5. Card "Patrimônio Bruto" — desperdício de espaço

**Problema:** O card grande mostra "R$ 0" gigante no centro, com muito espaço vazio quando o usuário não simulou ainda. Período / Líquido após IR ficam empurrados para baixo sem hierarquia clara.

**Solução:**

- Adicionar badge sutil "aguardando simulação" no estado vazio (em vez de só "R$ 0")
- Reduzir tamanho do número de `text-[2.5rem]` para `text-[2rem]` — sobra espaço para os subvalores
- Período e Líquido após IR ganham ícones pequenos (Calendar / Receipt) à esquerda dos labels

---

## 6. Estado focus dos inputs

**Problema:** Foco atual usa `focus:ring-1 ring-accent/20` — quase invisível. Usuário não percebe qual campo está ativo ao navegar com Tab.

**Solução:**

- `focus:ring-2 focus:ring-accent/50` (mais grosso e visível)
- Adicionar `focus:border-accent` (borda sólida no foco)
- Mantém transição suave já existente

---

## 7. Estados hover/disabled padronizados

**Problema:** Botão "Simular" tem disabled bem definido, mas botões secundários (toggle % mês/ano, cards de taxa) não têm feedback de hover claro.

**Solução:**

- Toggle % mês/ano: hover do botão inativo → `bg-white/[0.04]` (background sutil)
- Cards de taxa não-selecionados: `hover:bg-white/[0.03]` + `hover:scale-[1.01]`
- Botão "Ver rendimento mensal em PDF": adicionar `disabled:opacity-50 disabled:cursor-not-allowed` quando não houver resultado

---

## 8. Card "Próximo Passo" / CTA final — refinamento

**Problema:** O bloco "Pronto para sair do papel?" tem o mesmo peso visual dos cards de KPI acima. Como é o CTA principal, deveria se destacar mais.

**Solução:**

- Adicionar gradient de fundo sutil terracota: `linear-gradient(135deg, hsl(var(--accent)/0.08), transparent)`
- Borda superior em terracota: `border-t-2 border-accent/30`
- Ícone do telefone ao lado dos badges "Gratuito · Sem compromisso · Resposta em até 1h" para reforçar urgência
- Botão "Falar com especialista": adicionar pulso sutil no shadow (já existe no botão PDF)

---

## Resumo técnico

**Arquivo único afetado:** `src/pages/YieldGuide.tsx`

**Tokens usados (sem cores arbitrárias):**

- `text-accent` / `bg-accent` / `border-accent` (terracota da marca)
- `text-white/85`, `/70`, `/60`, `/40` (escala neutra sobre fundo escuro)
- `text-success` (apenas no "Ganho líq.")
- Removido: `text-warning` no "Imposto" (vibrava demais)

**Sem mudança estrutural:** apenas ajustes de classes Tailwind nos elementos existentes. Nenhuma lógica de cálculo, nenhum componente novo, nenhuma migração.

**Estimativa:** ~30-40 linhas alteradas em 8 trechos do arquivo.

---

Quer que eu aplique **todas as 8 melhorias** ou prefere selecionar apenas algumas? Se for par