# Modernização do Onboarding — Versão 2026

Proposta de melhorias para deixar o fluxo mais moderno, fluido e com sensação premium (estilo Linear / Notion / Stripe). Dividido em **4 fases** que podem ser implementadas independentemente.

## Fase 1 — Polish visual e micro-interações (quick wins)

**Header e progresso**

&nbsp;

- Barra de progresso "morphing": além da linha de 2px, adicionar um indicador numérico fixo "4 / 23" no canto, com animação tabular-nums.
- Steppers de seção com **tooltip ao hover** mostrando o nome da seção e se já foi concluída.

**Cards de item (Renda, Despesas, Patrimônio, etc.)**

- Animação de **entrada/saída em layout** com `layout` do framer-motion — quando o usuário adiciona ou remove um item, os outros deslizam suavemente.
- Estado vazio ilustrado: quando não há nenhum item ainda, mostrar um placeholder amigável com ícone + microcopy ("Ainda nada por aqui — clique acima para adicionar sua primeira fonte de renda").
- Hover state mais sutil (sombra + leve translate-y de 1px).

**Botões e navegação**

- Atalhos de teclado: **Enter** avança, **Shift+Enter** volta, **Esc** fecha. Mostrar dica `↵ Enter` no botão Próximo.
- Botão "Próximo" com **estado de sucesso transitório** (✓ verde por 400ms antes de animar para o próximo step).

## Fase 2 — Inteligência e contexto

**Auto-save visível**

- Indicador "Salvo às 14:32" no header (estilo Notion/Google Docs), substituindo o atual save silencioso.
- Toast de erro mais claro com botão "Tentar novamente".

**Resumo lateral / drawer "Meu progresso"**

- Botão flutuante no canto superior que abre um drawer com checklist de tudo que já foi preenchido — o usuário pode pular para qualquer seção concluída.
- Mostra contadores: "3 fontes de renda", "5 despesas", "R$ 4.200 total mensal".

&nbsp;

## Fase 3 — Experiência mobile-first

**Bottom sheet para adicionar itens**

- Em mobile, ao clicar "Adicionar despesa", abrir um **sheet inferior** em vez de criar card inline — reduz fricção e poluição visual.
- Categorias viram **chips selecionáveis grandes** com ícone (touch-friendly).

**Navegação por gestos**

- Swipe horizontal entre steps em mobile (com indicador de "puxe para avançar").
- Sticky bottom CTA com altura aumentada (mín 48px tap target).

**Telas de transição mais cinematográficas**

- StepWelcome e StepTransition com **gradiente animado de fundo** (mesh gradient sutil).
- Mostrar mini-preview animado da próxima seção (ex: ícones flutuando representando "Renda → Despesas → Dívidas").

## Fase 4 — Gamificação e motivação

**Marcos de conquista**

- Após completar Identificação: card de celebração "🎉 Você conhece +30% do seu perfil financeiro" com mini-progresso de "diagnóstico desbloqueado".
- Badge sutil em cada transição: "Seção 2 de 3 concluída".

**Tempo estimado dinâmico**

- Mostrar "≈ 4 min restantes" no header, recalculando conforme o ritmo do usuário.
- Após o welcome: "Vamos lá — leva uns 8 minutos".

**Resumo final pré-finalização**

- Antes do confetti final, uma tela de **resumo visual**: "Aqui está o que você compartilhou conosco" com cards agrupados (renda total, nº de objetivos, perfil comportamental) — antes de clicar Finalizar.

---

## Detalhes técnicos (resumo)

**Arquivos novos:**

- `src/components/onboarding/OnboardingProgressDrawer.tsx` — drawer lateral de progresso
- `src/components/onboarding/SaveIndicator.tsx` — indicador "Salvo às HH:MM"
- `src/components/onboarding/SummaryReview.tsx` — tela de revisão pré-finalização
- `src/hooks/useKeyboardNav.ts` — atalhos Enter/Esc
- `src/hooks/useOnboardingTimer.ts` — estimativa de tempo

**Arquivos editados:**

- `OnboardingProgress.tsx` — adicionar SaveIndicator + tooltip nos dots
- `OnboardingNavigation.tsx` — atalhos visuais + estado de sucesso
- `ClientOnboarding.tsx` — integrar drawer + summary review + lastSavedAt
- `TransitionSteps.tsx` — gradiente animado + mini preview
  &nbsp;
  &nbsp;

**Sem migrations** — todas as mudanças são front-end. Auto-save já existe; só precisamos expor o timestamp.

---

## Recomendação de priorização

Sugiro começar pela **Fase 1 + auto-save visível da Fase 2** — são as mudanças com maior impacto percebido pelo menor esforço. Posso implementar tudo de uma vez ou ir fase a fase, como preferir.

```text
Esforço estimado:
Fase 1  ████░░░░░░  Baixo  — ganho visual imediato
Fase 2  ██████░░░░  Médio  — confiança e clareza
Fase 3  ███████░░░  Médio  — mobile premium
Fase 4  █████░░░░░  Médio  — engajamento e finalização
```

&nbsp;