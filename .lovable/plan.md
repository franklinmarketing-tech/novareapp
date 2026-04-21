

# Refinamento visual completo do sistema

Polimento geral de design, tipografia, espaçamento e responsividade — **sem alterar estrutura, copy, fluxos ou funcionalidades**. Tudo é feito via tokens globais (`index.css`, `tailwind.config.ts`) e primitivos UI (`Card`, `Button`, `Input`, `Label`, `Badge`), garantindo que todas as 50+ páginas se beneficiem automaticamente.

## O que vai mudar (resumo visual)

- **Tipografia mais hierárquica e legível** — escala consistente entre títulos de página, seções e cards.
- **Cards mais elegantes** — sombras mais suaves, bordas refinadas, hover sutil, padding harmonizado.
- **Botões mais consistentes** — alturas padronizadas, hover/active mais discretos, foco mais limpo.
- **Inputs e formulários mais arejados** — labels com peso correto, espaçamento entre campos uniforme, foco refinado.
- **Sidebar e header mais polidos** — densidade reduzida, separação melhor entre seções, breadcrumb mais legível.
- **Responsividade mobile/tablet** — paddings adaptativos, tamanhos de toque mínimos, quebras corrigidas.
- **Consistência geral** — radius, sombras, cores e espaçamentos unificados via tokens.

## Áreas de intervenção

### 1. Tokens globais (`src/index.css`)
- Refinar a escala tipográfica usando `clamp()` para fluidez entre breakpoints.
- Adicionar utilitários: `.surface-card`, `.surface-elevated`, `.stack-sm/md/lg` para espaçamento consistente.
- Refinar os tons `muted-foreground` e `border` no light/dark para melhor contraste (WCAG AA).
- Adicionar transições padrão suaves (`--transition-base`).

### 2. Tailwind config (`tailwind.config.ts`)
- Adicionar tamanhos de espaçamento intermediários (`5.5`, `7.5`, `13`).
- Refinar `boxShadow` (sombras mais sutis, multi-camada estilo Apple/Linear).
- Adicionar keyframes/animation: `fade-in`, `slide-up`, `scale-in` para reuso.

### 3. Primitivos UI (mudanças que se propagam para todo o app)
- **`Card`**: padding harmonizado (`p-5`/`p-6` consistente), sombra mais suave, hover mais discreto, header com separador opcional.
- **`Button`**: alturas refinadas (`sm` 36px, `default` 40px, `lg` 44px), hover sem `translate` agressivo, focus ring mais limpo, ícones melhor alinhados.
- **`Input` / `Textarea` / `Select`**: altura uniforme (40px default, 44px em formulários longos), foco com ring suave, estado de erro mais claro.
- **`Label`**: peso 500, tamanho 13px, cor `foreground/85` para melhor leitura.
- **`Badge`**: padding e radius padronizados, variantes com contraste melhor.
- **`Tabs`**: indicador ativo mais sutil, espaçamento horizontal uniforme.
- **`Dialog` / `Sheet` / `Dropdown`**: padding e radius consistentes, sombra de elevação refinada.

### 4. Layouts (`AdminLayout`, `ClientLayout`, `SuperAdminLayout`, `AdminClientLayout`)
- Sidebar: espaçamento entre seções uniforme, hover states mais sutis, item ativo com indicador lateral elegante.
- Header/breadcrumb: altura unificada (44px), tipografia mais clara, separador `ChevronRight` menor (14px em vez de 24px).
- Main content: padding responsivo padronizado (`p-4 sm:p-6 lg:p-8`).
- Mobile header: melhor altura de toque, transição da sidebar suave.

### 5. Páginas principais (apenas refinamentos visuais — nenhuma estrutura ou copy alterada)
- **Login**: melhor espaçamento entre campos, botão CTA mais consistente com o resto do sistema.
- **AdminDashboard**: padding dos cards KPI uniforme, melhor hierarquia entre seletor de período e botões de preset.
- **ClientList**: linhas da lista com espaçamento melhor, ações (editar/excluir) com hover discreto.
- **Onboarding (todos os steps)**: melhor espaçamento entre perguntas, progresso mais elegante.
- **Configurações / Workspace / Parecer / Investimentos**: cards e formulários alinhados ao novo padrão.

### 6. Responsividade
- Revisar `text-` classes em headers para escalar com viewport.
- Garantir botões com `min-h-[40px]` em mobile.
- Corrigir grids que quebram em 768-900px (ex: cards 3-col → 2-col → 1-col).
- Sidebar mobile com largura adaptativa.

## Princípios de design aplicados

```text
Hierarquia    → Title (20-24px, semibold) > Section (16-17px, semibold) > Body (14-15px) > Meta (12-13px)
Espaçamento   → Múltiplos de 4px (4, 8, 12, 16, 20, 24, 32, 40)
Radius        → Cards 16px / Inputs 12px / Buttons 12px / Badges 8px
Sombra        → 3 níveis: subtle (cards) / soft (hover) / elevated (modals)
Cor           → Mantém paleta atual (terracotta/blue/Novare) — apenas melhora contraste
Movimento     → 200ms ease-out padrão; sem translates agressivos
```

## Garantias

- **Zero alteração** em copy, rotas, fluxos, funcionalidades, lógica de negócio, queries Supabase ou edge functions.
- **Zero remoção** de componentes ou seções.
- Todas as mudanças são **visuais** e propagadas via tokens/primitivos — risco mínimo de quebra funcional.
- Light e dark mode revisados em paralelo.

## Arquivos principais a editar

- `src/index.css` (tokens, utilitários, dark mode)
- `tailwind.config.ts` (escala, sombras, animações)
- `src/components/ui/{card,button,input,textarea,label,badge,tabs,dialog,sheet,dropdown-menu,select}.tsx`
- `src/components/layouts/{AdminLayout,ClientLayout,SuperAdminLayout,AdminClientLayout}.tsx`
- Ajustes pontuais em páginas com layout customizado: `Login.tsx`, `AdminDashboard.tsx`, `ClientList.tsx`, steps de onboarding.

