

# Polimento das telas de onboarding

Refinamento visual completo do fluxo de onboarding (23 micro-passos), focando em **progresso mais elegante**, **espaçamento consistente entre perguntas** e **transições suaves entre steps**. Sem alterar copy, ordem dos steps, validações ou lógica de save.

## O que vai mudar

### 1. Progresso (`OnboardingProgress.tsx`) — mais elegante
- **Barra de progresso refinada**: altura 2px (em vez de 3px), com gradient mais suave (`from-primary/80 via-primary to-accent`), animação spring em vez de ease, e sutil "glow" embaixo para dar profundidade.
- **Header mais limpo**: reduzir densidade vertical, melhorar alinhamento entre emoji da seção, label e contador (`X/Y` com ponto separador estilo `· 3 de 23`).
- **Emoji da seção**: container com sombra sutil (`shadow-soft`), tamanho refinado (`w-9 h-9`), background `bg-primary/8` com leve borda interna.
- **Tipografia**: título do step com tamanho consistente (`text-[0.9375rem]`, peso 500), label da seção com letter-spacing refinado (`tracking-[0.14em]`).
- **Encorajamento**: tipografia mais delicada, sem itálico forçado em telas pequenas, spacing-top melhor (`mt-1.5`).
- **Botão fechar (X)**: ícone reduzido (`h-4 w-4`, hoje está h-6), hover state mais discreto.

### 2. Navegação inferior (`OnboardingNavigation.tsx`)
- **Section dots**: dots com largura mais harmônica (active: w-6, complete: w-2.5, pending: w-1.5), altura 1.5px, transição suave 400ms; dot ativo com leve glow `shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]`.
- **Botões**: altura unificada para 44px (em vez de 12 inconsistente com tokens), ícones reduzidos para `h-4 w-4` (hoje `h-6 w-6` — desproporcional ao botão).
- **CTA "Próximo"**: usar a variante `premium` já refinada nos tokens, com sombra mais suave, sem variação custom de success no último step (apenas mudar variant para `success`).
- **Spacing**: padding-x reduzido em mobile (`px-4 sm:px-6`), gap entre dots e botões mais arejado (`space-y-3.5`).
- **Loading state**: spinner menor (`h-4 w-4`) e melhor alinhado verticalmente.

### 3. Steps individuais — espaçamento entre perguntas
Padronização dos componentes `Wrapper`, `Question`, `Hint`, `FieldGroup` (atualmente duplicados em `IdentificacaoSteps.tsx` e `ComportamentalSteps.tsx`):

- **Wrapper**: `space-y-7` (em vez de `space-y-6`) — mais respiro entre pergunta, hint e campos.
- **Question (título da pergunta)**:
  - Tipografia escalonada com `clamp()` para responsividade fluida.
  - `tracking-[-0.025em]` (mais legível em mobile que `-0.03em`).
  - `leading-[1.2]` (em vez de 1.15) — melhora respiração vertical.
  - max-width unificado em `max-w-xl`.
- **Hint**: cor refinada para `text-muted-foreground/85`, max-width `max-w-md`, `leading-[1.55]`.
- **Indicador "Passo 01"**: pill mais elegante — pequeno fundo `bg-primary/8` + padding `px-2.5 py-1` + radius full em vez de só texto solto. Mantém copy.
- **FieldGroup**: spacing entre campos `space-y-4` (em vez de `space-y-3`/`space-y-4` inconsistente entre arquivos), max-width unificado `max-w-md`.
- **Inputs do onboarding**: altura padronizada `h-12` (em vez de mistura de h-13/h-14), focus ring usando o novo token `ring-ring/15` definido nos primitivos refinados, remover overrides inconsistentes (`focus-visible:ring-primary/30`) — herdar do componente base.
- **Labels**: usar componente `<Label>` refinado nos tokens, sem override de `text-muted-foreground`.

### 4. Transições entre steps (mais suaves)
Em `ClientOnboarding.tsx`:
- **Variants**: reduzir o desloc horizontal de 50px para 24px (movimento mais sutil, estilo Apple).
- **Scale**: remover (`scale: 0.98` → 1) — apenas opacity + leve translate é mais elegante.
- **Easing**: trocar `[0.25, 0.46, 0.45, 0.94]` por `[0.32, 0.72, 0, 1]` (curva tipo iOS spring).
- **Duração**: 0.28s (mais responsivo, hoje 0.3s).
- **Transition steps (boas-vindas, transições)**: orquestração já existe via `delay` — apenas refinar timings (delays de 0.15/0.3/0.5/0.7s para 0.1/0.2/0.35/0.5s).

### 5. Steps especiais (Welcome / Transition)
- Reduzir tamanho do emoji em telas pequenas (`text-5xl` no mobile, hoje fica grande demais em viewports curtos).
- Spacing vertical mais consistente (`space-y-5 md:space-y-7`).
- Sparkle decorativo no Welcome com `opacity-10` (hoje 0.15) — mais sutil.
- Badge "Identificação completa!" no Transition com radius e padding alinhados ao novo padrão de `Badge`.

### 6. Loading state inicial
- Substituir emoji 💰 estático por animação de carregamento mais elegante: dot pulse trio + texto, alinhado ao padrão visual do sistema.

### 7. Responsividade
- Header de progresso colapsa título em telas <380px (mantém apenas seção + contador).
- Botões de navegação: largura mínima reduzida em mobile (`min-w-[120px]` em vez de 150px).
- Padding lateral fluido (`px-4 sm:px-5 md:px-6`).
- Container do step com `pb-28` mobile / `pb-24` desktop para evitar sobreposição com nav fixa em telas pequenas.

## Garantias

- **Zero alteração** em copy, ordem dos passos, validações, save, confetti, navegação, ou estrutura de dados.
- **Zero remoção** de campos ou componentes.
- Mudanças puramente visuais e de timing/animação.
- Light e dark mode revisados em paralelo (usa tokens já refinados).

## Arquivos a editar

- `src/components/onboarding/OnboardingProgress.tsx`
- `src/components/onboarding/OnboardingNavigation.tsx`
- `src/components/onboarding/steps/IdentificacaoSteps.tsx`
- `src/components/onboarding/steps/ComportamentalSteps.tsx`
- `src/components/onboarding/steps/TransitionSteps.tsx`
- `src/pages/cliente/ClientOnboarding.tsx` (apenas variants, loading state e padding do container)

