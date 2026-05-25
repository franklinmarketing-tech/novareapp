## 1. Plano de Ação — aumentar % visual

`src/pages/admin/AdminActionPlan.tsx`

- Aumentar a fonte do percentual exibido (linha ~462: `text-2xl` → `text-4xl sm:text-[2.6rem] font-black tabular-nums tracking-tight`), igualando o destaque já usado no Acompanhamento.
- Manter mesma escala de cor (`progressColor`).

## 2. Acompanhamento — diminuir % e adicionar botão "Editar" pós-save

`src/components/monitoring/AcompanhamentoMetas.tsx`

- Reduzir o número grande do %: `text-4xl sm:text-[2.6rem]` → `text-2xl sm:text-3xl` (linha 185), mantendo tracking/leading.
- Após salvar (quando `latestEntry` existe), além do "+ Novo registro", exibir botão **Editar** que reabre o formulário pré-preenchido com `valor_atual` / `estado_atual` do último registro e ao salvar faz `update` do mesmo `id` (não cria novo). Não altera histórico anterior.

## 3. Baixar PDF integrado à IA (OpenAI) + popup de validação

`src/pages/admin/AdminReport.tsx` + nova edge function

- Remover o botão separado "Análise de Metas (IA)" e seu dialog atual.
- O botão **Baixar PDF** passa a:
  1. Disparar a análise (loading "Gerando análise…").
  2. Abrir o popup com o texto da IA num `Textarea` editável + botões **Regenerar**, **Cancelar** e **Validar e baixar PDF**.
  3. Ao validar, gerar o PDF incluindo o comentário no final (fluxo existente em `generateReportPdf` permanece).
- Nova edge function `analyze-goals-comment-openai/index.ts` (ou trocar a existente) usando o secret `**Open IA GPT**` (já presente) via `https://api.openai.com/v1/chat/completions` com `gpt-4o-mini`. Mantém validação JWT + has_role('admin') e mesma estrutura de prompt da função atual.
- Front: substituir `supabase.functions.invoke("analyze-goals-comment", …)` por `analyze-goals-comment-openai`.

## 4. Filtros de mês/ano no Relatório e Plano de Ação

Ambas as páginas (`AdminReport.tsx`, `AdminActionPlan.tsx`):

- Adicionar dois selects no header: **Mês** (1–12) e **Ano** (últimos 3 anos + atual), default = mês/ano vigente.
- O filtro aplica-se a:
  - `acompanhamento_entradas` → filtrar `snapshotted_at` pelo intervalo do mês.
  - `action_items` → filtrar pelo novo campo `month_ref` (ver §5) ou, na ausência, por `created_at`.
  - `goals`, `income`, `expenses`, `debts`, `assets`, `insurance` → filtrar pelo novo `month_ref` quando preenchido; itens sem `month_ref` (legados) aparecem em todos os meses.
- O PDF gerado respeita o filtro selecionado (passa o intervalo para `generateReportPdf` e para a edge function de IA).

## 5. Permitir incluir novos itens do Plano de Ação por mês

Migração de banco (adicionar coluna mensal opcional):

```sql
ALTER TABLE public.goals       ADD COLUMN month_ref date;
ALTER TABLE public.income      ADD COLUMN month_ref date;
ALTER TABLE public.expenses    ADD COLUMN month_ref date;
ALTER TABLE public.action_items ADD COLUMN month_ref date;
```

- `month_ref` = primeiro dia do mês ao qual o item pertence; nulo = item legado/recorrente (visível em todos os meses).
- No `AdminActionPlan.tsx`, em cada seção (Objetivos, Receitas, Despesas, Ações) adicionar botão **+ Adicionar nesta seção** que abre dialog simples e insere o registro já com `month_ref = mês selecionado no filtro`.
- Sem alterar RLS (políticas existentes cobrem os campos novos).

## 6. Limpeza

- Remover estados `goalsCommentOpen`, `goalsComment`, `goalsCommentDraft` do botão antigo no `AdminReport.tsx` e reorganizá-los no fluxo do Baixar PDF.
- A edge function `analyze-goals-comment`

  |                      |        |                      |            |                    |                    |                    |     |
  | -------------------- | ------ | -------------------- | ---------- | ------------------ | ------------------ | ------------------ | --- |
  | NOVA CHAVE DA NOVARE | Active | key_fRwzEkD98DEFjNiI | sk-...xPoA | 19 de mai. de 2026 | 25 de mai. de 2026 | marketingcastriani | All |


- Filtro de mês = intervalo `[YYYY-MM-01, YYYY-MM-01 + 1 mês)`.
- Default sempre mês vigente em `pt-BR` (`new Date()`).
- Edge function OpenAI: header `Authorization: Bearer ${Deno.env.get("Open IA GPT")}`, modelo `gpt-4o-mini`, mesmo system prompt da versão Gemini.
- Não mexer em `generateReportPdf.ts` exceto para receber `goalsAnalysisComment` (já recebe) e opcionalmente `periodLabel` para mostrar "Mês de referência: ...".

## Fora de escopo

- Edição de registros antigos do histórico de Acompanhamento (somente o último).
- Versionamento profundo de metas (item legado sem `month_ref` continua aparecendo em todos os meses).