## Plano

### 1. Corrigir erro da IA (OpenAI 500)
A edge function `analyze-goals-comment` já usa o secret `Open IA GPT`, mas está retornando 500 — provavelmente a chave está inválida/expirada. Vou pedir para você atualizar o secret antes de seguir (botão aparece no chat).

### 2. Filtrar dados de fato por Mês/Ano no Relatório (`AdminReport.tsx`)
Hoje `filterMonth`/`filterYear` só vão para o prompt da IA. Vou:
- Calcular `monthStart` / `monthEnd` (1º dia do mês selecionado → 1º dia do mês seguinte).
- Aplicar nos queries que alimentam relatório **e** PDF:
  - `acompanhamento_entradas`: `snapshotted_at` entre start/end (já existe lógica parcial).
  - `goals`, `income`, `expenses`, `action_items`: filtrar por `month_ref` no mês **OU** `month_ref IS NULL` (legado aparece em todos os meses).
  - `data_confirmations`: `month_ref = monthStart`.
- O `generateReportPdf` recebe os dados já filtrados — sem alterar a lib.
- Mostrar o período selecionado no cabeçalho do PDF.

### 3. Filtros Mês/Ano no Plano de Ação (`AdminActionPlan.tsx`)
- Adicionar os mesmos selects (Mês/Ano) no header, default = mês vigente.
- Filtrar `goals`, `parecer_metas` (via items relacionados), `action_items` por `month_ref` (ou null = legado).
- Atualizar contadores e seções para refletir o período.

### 4. Botões "+ Adicionar nesta seção" no Plano de Ação
Em cada bloco do Plano de Ação adicionar um botão que abre um diálogo simples para criar um item novo já carimbado com `month_ref` = mês selecionado:
- **Rendas** → insert em `income` (description, amount, frequency, month_ref).
- **Despesas** → insert em `expenses` (category, description, amount, is_fixed, month_ref).
- **Objetivos** → insert em `goals` (description, target_amount, deadline, priority, month_ref).
- **Ações do plano** → insert em `action_items` (area, description, deadline, financial_impact, month_ref, action_plan_id).
- Dívidas/Patrimônio/Seguros: por enquanto **fora do escopo** (essas tabelas não têm `month_ref` — pode ser feito depois se quiser).

Após o insert, invalidar a query correspondente para refletir na lista do mês.

### 5. Comportamento de legado
Itens sem `month_ref` continuam visíveis em qualquer mês (regra `month_ref = X OR month_ref IS NULL`), para não esconder dados antigos.

### Técnico
- Helper `monthRange(year, month)` em `src/lib/utils.ts` retornando `{start, end}` ISO.
- Filtros do Supabase: `.or("month_ref.is.null,month_ref.eq.YYYY-MM-01")`.
- Novo componente `AddSectionItemDialog` reutilizado nos 4 botões, com campos dinâmicos por tipo.

### Fora de escopo
- `month_ref` em `debts`, `assets`, `insurance`.
- Edição/migração de itens legados para um mês específico.
- Versionamento histórico além do que `month_ref` já oferece.
