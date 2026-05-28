import { supabase } from "@/integrations/supabase/client";

/**
 * Avança um YYYY-MM-01 para o mês seguinte (primeiro dia).
 * Ex.: "2026-06-01" → "2026-07-01"
 */
export function nextMonthRef(currentMonthRef: string): string {
  const [y, m] = currentMonthRef.split("-").map(Number);
  const date = new Date(y, m, 1); // m sem -1 → vai para o mês seguinte
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

interface CloneResult {
  income: number;
  expenses: number;
  debts: number;
  assets: number;
  insurance: number;
  goals: number;
}

/**
 * Ao fechar um mês, clona TODOS os itens financeiros para o próximo mês,
 * garantindo que o cliente comece o novo período com o mesmo cenário.
 *
 * Regras:
 * - Idempotente: se já existem registros para o próximo mês, NÃO duplica.
 * - Itens "globais" (month_ref NULL) são considerados pertencentes ao mês fechado
 *   apenas se não existir nenhum registro com aquele month_ref específico.
 * - Goals concluídos (completed_at != null) NÃO são clonados.
 *
 * @param clientId          ID do cliente
 * @param closedMonthRef    Mês que foi fechado (formato YYYY-MM-01)
 * @returns                 Contagem de itens clonados por categoria
 */
export async function cloneToNextMonth(
  clientId: string,
  closedMonthRef: string,
): Promise<CloneResult> {
  const nextRef = nextMonthRef(closedMonthRef);
  const result: CloneResult = { income: 0, expenses: 0, debts: 0, assets: 0, insurance: 0, goals: 0 };

  // ── Etapa 0: ATRIBUI month_ref aos registros legados (NULL) do cliente.
  // Sem isso, eles vazariam para TODOS os meses no filtro e causariam duplicação
  // quando o clone copiasse para o próximo mês.
  await Promise.all([
    supabase.from("income").update({ month_ref: closedMonthRef }).eq("client_id", clientId).is("month_ref", null),
    supabase.from("expenses").update({ month_ref: closedMonthRef }).eq("client_id", clientId).is("month_ref", null),
    supabase.from("debts").update({ month_ref: closedMonthRef }).eq("client_id", clientId).is("month_ref", null),
    supabase.from("assets").update({ month_ref: closedMonthRef }).eq("client_id", clientId).is("month_ref", null),
    supabase.from("insurance").update({ month_ref: closedMonthRef }).eq("client_id", clientId).is("month_ref", null),
    supabase.from("goals").update({ month_ref: closedMonthRef }).eq("client_id", clientId).is("month_ref", null),
  ]);

  // ── Etapa 1: lê o ÚLTIMO valor lançado em acompanhamento_entradas para cada item.
  // O valor_atual representa o PROGRESSO (delta) em direção à meta:
  //   - expenses/debts/insurance: redução conseguida (subtrai do original)
  //   - income/assets: aumento conseguido (soma ao original)
  // Ex.: despesa cadastrada R$ 2.500, lançou redução de R$ 200 → próximo mês = R$ 2.300
  const { data: lancamentos } = await supabase
    .from("acompanhamento_entradas")
    .select("source_table, source_id, valor_atual, snapshotted_at")
    .eq("client_id", clientId)
    .eq("is_closing_snapshot", false)
    .order("snapshotted_at", { ascending: false });
  const deltaMap = new Map<string, number>();
  (lancamentos || []).forEach((l: any) => {
    if (l.valor_atual == null) return;
    const key = `${l.source_table}:${l.source_id}`;
    // Como ordenamos DESC, o primeiro que aparece é o mais recente
    if (!deltaMap.has(key)) {
      deltaMap.set(key, Number(l.valor_atual));
    }
  });

  // Direção da meta por tabela: -1 reduz (despesa/divida/seguro), +1 cresce (renda/patrimonio)
  const isReducing = (table: string) =>
    table === "expenses" || table === "debts" || table === "insurance";

  const applyDelta = (table: string, id: string, original: number): number => {
    const delta = deltaMap.get(`${table}:${id}`);
    if (delta == null) return original;
    const next = isReducing(table) ? original - delta : original + delta;
    return Math.max(0, next); // nunca negativo
  };

  // Mapping oldId → newId por tabela — usado depois para clonar parecer_metas
  const idMapping: Record<string, Map<string, string>> = {
    income: new Map(), expenses: new Map(), debts: new Map(),
    assets: new Map(), insurance: new Map(), goals: new Map(),
  };

  // ── INCOME ──
  const { data: incomeExisting } = await supabase
    .from("income").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!incomeExisting || incomeExisting.length === 0) {
    const { data: src } = await supabase
      .from("income")
      .select("id, description, amount, frequency, is_primary, stability")
      .eq("client_id", clientId)
      .eq("month_ref", closedMonthRef);
    if (src && src.length > 0) {
      const rows = src.map(({ id, ...r }) => ({
        ...r,
        client_id: clientId,
        month_ref: nextRef,
        amount: applyDelta("income", id as string, Number(r.amount) || 0),
      }));
      const { data: inserted, error } = await supabase.from("income").insert(rows).select("id");
      if (!error && inserted) {
        result.income = inserted.length;
        src.forEach((s, i) => idMapping.income.set(s.id as string, inserted[i].id as string));
      }
    }
  }

  // ── EXPENSES ──
  const { data: expensesExisting } = await supabase
    .from("expenses").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!expensesExisting || expensesExisting.length === 0) {
    const { data: src } = await supabase
      .from("expenses")
      .select("id, category, description, amount, is_fixed, due_day")
      .eq("client_id", clientId)
      .eq("month_ref", closedMonthRef);
    if (src && src.length > 0) {
      const rows = src.map(({ id, ...r }) => ({
        ...r,
        client_id: clientId,
        month_ref: nextRef,
        amount: applyDelta("expenses", id as string, Number(r.amount) || 0),
      }));
      const { data: inserted, error } = await supabase.from("expenses").insert(rows).select("id");
      if (!error && inserted) {
        result.expenses = inserted.length;
        src.forEach((s, i) => idMapping.expenses.set(s.id as string, inserted[i].id as string));
      }
    }
  }

  // ── DEBTS ──
  const { data: debtsExisting } = await supabase
    .from("debts").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!debtsExisting || debtsExisting.length === 0) {
    const { data: src } = await supabase
      .from("debts")
      .select("id, type, creditor, total_amount, monthly_payment, interest_rate, remaining_months")
      .eq("client_id", clientId)
      .eq("month_ref", closedMonthRef);
    if (src && src.length > 0) {
      const rows = src.map(({ id, ...r }) => ({
        ...r,
        client_id: clientId,
        month_ref: nextRef,
        total_amount: applyDelta("debts", id as string, Number(r.total_amount) || 0),
      }));
      const { data: inserted, error } = await supabase.from("debts").insert(rows).select("id");
      if (!error && inserted) {
        result.debts = inserted.length;
        src.forEach((s, i) => idMapping.debts.set(s.id as string, inserted[i].id as string));
      }
    }
  }

  // ── ASSETS ──
  const { data: assetsExisting } = await supabase
    .from("assets").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!assetsExisting || assetsExisting.length === 0) {
    const { data: src } = await supabase
      .from("assets")
      .select("id, type, description, estimated_value")
      .eq("client_id", clientId)
      .eq("month_ref", closedMonthRef);
    if (src && src.length > 0) {
      const rows = src.map(({ id, ...r }) => ({
        ...r,
        client_id: clientId,
        month_ref: nextRef,
        estimated_value: applyDelta("assets", id as string, Number(r.estimated_value) || 0),
      }));
      const { data: inserted, error } = await supabase.from("assets").insert(rows).select("id");
      if (!error && inserted) {
        result.assets = inserted.length;
        src.forEach((s, i) => idMapping.assets.set(s.id as string, inserted[i].id as string));
      }
    }
  }

  // ── INSURANCE ──
  const { data: insExisting } = await supabase
    .from("insurance").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!insExisting || insExisting.length === 0) {
    const { data: src } = await supabase
      .from("insurance")
      .select("id, type, provider, monthly_premium, coverage_amount")
      .eq("client_id", clientId)
      .eq("month_ref", closedMonthRef);
    if (src && src.length > 0) {
      const rows = src.map(({ id, ...r }) => ({
        ...r,
        client_id: clientId,
        month_ref: nextRef,
        monthly_premium: applyDelta("insurance", id as string, Number(r.monthly_premium) || 0),
      }));
      const { data: inserted, error } = await supabase.from("insurance").insert(rows).select("id");
      if (!error && inserted) {
        result.insurance = inserted.length;
        src.forEach((s, i) => idMapping.insurance.set(s.id as string, inserted[i].id as string));
      }
    }
  }

  // ── GOALS (só não concluídos) ──
  const { data: goalsExisting } = await supabase
    .from("goals").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!goalsExisting || goalsExisting.length === 0) {
    const { data: src } = await supabase
      .from("goals")
      .select("id, description, target_amount, deadline, priority, amount_applied")
      .eq("client_id", clientId)
      .is("completed_at", null)
      .eq("month_ref", closedMonthRef);
    if (src && src.length > 0) {
      const rows = src.map(({ id, ...r }) => ({ ...r, client_id: clientId, month_ref: nextRef }));
      const { data: inserted, error } = await supabase.from("goals").insert(rows).select("id");
      if (!error && inserted) {
        result.goals = inserted.length;
        src.forEach((s, i) => idMapping.goals.set(s.id as string, inserted[i].id as string));
      }
    }
  }

  // ── Etapa 2: ATUALIZA parecer_metas para apontar ao novo source_id ──
  // Em vez de criar uma nova parecer_meta para cada clone (o que causava
  // duplicação visual: 10 metas em vez de 5), atualizamos o source_id da
  // meta existente para apontar ao item do novo mês. Mantém uma única meta
  // por item conceitual do cliente — historico consultivo continuo.
  for (const [table, mapping] of Object.entries(idMapping)) {
    if (mapping.size === 0) continue;

    for (const [oldId, newId] of mapping.entries()) {
      // Re-aponta a meta existente para o item do próximo mês
      await supabase
        .from("parecer_metas")
        .update({ source_id: newId })
        .eq("client_id", clientId)
        .eq("source_table", table)
        .eq("source_id", oldId);
    }
  }

  return result;
}

/**
 * Detecta o mês de baseline (D-0) — o mês mais antigo com dados do cliente.
 * Retorna null se nenhum dado existir ainda.
 */
export async function detectBaselineMonth(clientId: string): Promise<string | null> {
  const tables = ["income", "expenses", "debts", "assets", "insurance", "goals"] as const;
  let oldest: string | null = null;
  for (const t of tables) {
    const { data } = await supabase
      .from(t)
      .select("month_ref")
      .eq("client_id", clientId)
      .not("month_ref", "is", null)
      .order("month_ref", { ascending: true })
      .limit(1);
    const ref = (data?.[0] as { month_ref?: string | null } | undefined)?.month_ref;
    if (ref && (!oldest || ref < oldest)) oldest = ref;
  }
  return oldest;
}
