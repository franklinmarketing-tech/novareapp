
Vou corrigir os dois problemas no editor do onboarding/admin:

1. Corrigir o scroll da janela de edição
- Ajustar o `DialogContent` usado em `src/pages/admin/ClientOnboarding.tsx` para ter altura real limitada à tela (`max-h`/`h-[calc(...)]`) e estrutura flexível correta.
- Trocar o miolo com `ScrollArea` para um container com rolagem vertical confiável (`overflow-y-auto`, `min-h-0`, `overscroll-contain`), garantindo que listas longas como Dívidas, Despesas, Renda e Patrimônio rolem dentro do modal.
- Manter o cabeçalho e os botões `Cancelar/Salvar` fixos/visíveis no modal, enquanto apenas o formulário central rola.
- Ajustar responsividade do modal para telas menores de desktop e mobile (`w-[calc(100vw-...)]`, padding menor no mobile), evitando conteúdo cortado.

2. Fazer valores personalizados aparecerem corretamente depois
- Padronizar a exibição de valores salvos com prefixo `custom:` no resumo/read-only do admin.
- Criar uma função auxiliar para transformar:
  - `custom:Minha despesa` em `Minha despesa`
  - valores normais como `moradia` em seus labels amigáveis quando existirem
  - valores desconhecidos em texto limpo, sem prefixo técnico
- Aplicar essa limpeza principalmente em:
  - Despesas
  - Dívidas
  - Renda
  - Patrimônio
  - Seguros
  - Objetivos
- Corrigir o fluxo do `MobileAddSheet` para Despesas: hoje ele salva a categoria personalizada como `custom:...` sem normalizar, diferente de Dívidas/Renda/Patrimônio. Vou ajustar para preservar corretamente o texto escolhido e exibir sem `custom:`.

3. Melhorar a visualização dos cards no resumo
- Ajustar os cards read-only com `min-w-0`, `break-words` e layout responsivo para textos longos não estourarem.
- Evitar que nome de dívida, credor, despesa personalizada ou objetivo longo fique cortado ou invisível.
- Melhorar a quebra entre descrição e valor em telas estreitas, usando coluna no mobile e linha no desktop.

4. Validar o salvamento
- Conferir o `saveSection` para garantir que itens personalizados em Despesas/Dívidas/etc. sejam enviados ao Supabase com o texto correto.
- Manter compatibilidade com dados já salvos que possuam `custom:` no banco, exibindo-os corretamente sem precisar migrar dados.

Arquivos que pretendo alterar:
- `src/pages/admin/ClientOnboarding.tsx`
- `src/components/onboarding/StepDespesas.tsx`
- Possivelmente `src/components/ui/dialog.tsx` se for melhor corrigir o comportamento de rolagem de todos os diálogos do app de forma global.
