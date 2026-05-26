# Botão "Sugerir metas" com destaque + versão para v2.6

## 1. Botão "Sugerir metas" (ParecerMetas.tsx, linhas 452–467)

Aplicar tratamento premium ao botão (independente de ter metas ou não):

- **Gradiente animado** Novare: `from-novare-blue via-novare-blue-bright to-novare-terracotta` com `bg-[length:200%_100%]` deslizando no hover
- **Sombra colorida** com glow azul + inset highlight no topo
- **Ring branco translúcido** para profundidade
- **Hover:** elevação (`-translate-y-0.5`), leve scale (1.03) e sombra mais intensa
- **Shine sweep:** faixa branca atravessando o botão da esquerda para a direita no hover (pseudo-elemento `before`)
- **Ícone Sparkles** com `drop-shadow` branco para efeito brilhante
- Texto sempre branco, semibold, tracking-wide

## 2. Versão do app: v2.5 → v2.6

Atualizar em 4 locais:
- `src/components/layouts/AdminLayout.tsx` (sidebar + mobile header)
- `src/components/layouts/ClientLayout.tsx` (sidebar + mobile header)

## 3. Salvar regra de memória

Criar `mem://preferences/version-bump.md` e adicionar ao `mem://index.md`:
> Sempre que houver qualquer alteração no app, incrementar o número da versão (v2.x → v2.(x+1)) nos 4 locais dos layouts (AdminLayout + ClientLayout, sidebar e mobile header).

Assim toda nova mudança em qualquer sessão futura já vai bumpar a versão automaticamente sem você precisar pedir.
