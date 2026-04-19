

## Plano: Refinamento Visual Global (Design System Polish)

Vou aplicar uma camada de polimento visual em todo o sistema, **sem mexer em copy, estrutura, rotas ou lógica**. O foco é elevar a percepção de qualidade através de tokens de design mais consistentes e refinamento dos componentes base.

### Estratégia

A melhor forma de melhorar 100+ telas sem refatorar cada uma é atuar nos **3 pontos de alavancagem máxima**:

1. **Tokens globais** (`src/index.css`) — afetam todo o sistema instantaneamente
2. **Componentes base do design system** (`ui/*`) — propagam para todos os usos
3. **Layouts compartilhados** (`AdminLayout`, `ClientLayout`, `PageBanner`) — afetam toda a navegação

### O que será alterado

**1. `src/index.css` — Tokens & tipografia global**
- Refinar escala tipográfica (h1-h4) com tracking mais apertado e line-height mais elegante
- Adicionar variáveis de **shadow** suaves e consistentes (`--shadow-sm`, `--shadow-card`, `--shadow-elevated`)
- Adicionar variável de **transição** padrão (`--transition-base`)
- Melhorar contraste de `--muted-foreground` (atualmente 46% → 42% para melhor legibilidade)
- Refinar `--border` para um tom levemente mais suave
- Adicionar utility `.focus-ring` padronizado
- Manter exatamente as mesmas cores brand (terracota + azul Novare)

**2. `src/components/ui/button.tsx`**
- Adicionar micro-interação consistente (shadow no hover em todas variantes)
- Padronizar altura do `size="sm"` para alinhar com inputs sm
- Refinar variant `outline` (border mais sutil + hover mais elegante)

**3. `src/components/ui/card.tsx`**
- Sombra mais suave e moderna (camada dupla sutil)
- Hover state mais discreto (atual está OK, só refinar)
- Padding do `CardHeader` ligeiramente mais generoso

**4. `src/components/ui/input.tsx` & `textarea.tsx`**
- Estado de foco mais elegante (ring com a cor accent suave)
- Estado de erro mais visível (`aria-invalid`)
- Placeholder com peso visual menor

**5. `src/components/ui/label.tsx`**
- Aumentar levemente contraste (de `foreground/70` → `foreground/80`) para melhor legibilidade

**6. `src/components/ui/badge.tsx` (se existir)**
- Padronizar padding e font-weight

**7. `src/components/layouts/AdminLayout.tsx` & `ClientLayout.tsx`**
- Refinar espaçamento do conteúdo principal (padding consistente)
- Garantir max-width consistente do container

**8. `src/components/PageBanner.tsx`**
- Refinar hierarquia (título + descrição) com spacing mais respirado

### O que NÃO será alterado

- ❌ Nenhuma copy/texto
- ❌ Nenhuma estrutura de página ou componente
- ❌ Nenhuma rota, fluxo ou lógica
- ❌ Cores brand (terracota #D17B3F e azul Novare permanecem)
- ❌ Onboarding (acabou de ser ajustado)
- ❌ Dashboard cliente (acabou de ser reorganizado)

### Resultado visual esperado

```text
ANTES                          DEPOIS
─────                          ──────
Sombras genéricas      →       Sombras em camadas suaves
Foco com ring duro     →       Foco com glow elegante
Tipografia padrão      →       Tracking refinado, hierarquia clara
Hovers abruptos        →       Transições suaves 200ms
Labels apagados        →       Contraste otimizado para leitura
Inputs achatados       →       Inputs com profundidade sutil
```

### Arquivos editados (estimativa)

8 arquivos no total, todos do design system base. Zero alteração de páginas individuais — o efeito se propaga automaticamente.

