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

  // ── INCOME ──
  const { data: incomeExisting } = await supabase
    .from("income").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!incomeExisting || incomeExisting.length === 0) {
    const { data: src } = await supabase
      .from("income")
      .select("description, amount, frequency, is_primary, stability")
      .eq("client_id", clientId)
      .or(`month_ref.eq.${closedMonthRef},month_ref.is.null`);
    if (src && src.length > 0) {
      const rows = src.map((r) => ({ ...r, client_id: clientId, month_ref: nextRef }));
      const { error } = await supabase.from("income").insert(rows);
      if (!error) result.income = rows.length;
    }
  }

  // ── EXPENSES ──
  const { data: expensesExisting } = await supabase
    .from("expenses").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!expensesExisting || expensesExisting.length === 0) {
    const { data: src } = await supabase
      .from("expenses")
      .select("category, description, amount, is_fixed, due_day")
      .eq("client_id", clientId)
      .or(`month_ref.eq.${closedMonthRef},month_ref.is.null`);
    if (src && src.length > 0) {
      const rows = src.map((r) => ({ ...r, client_id: clientId, month_ref: nextRef }));
      const { error } = await supabase.from("expenses").insert(rows);
      if (!error) result.expenses = rows.length;
    }
  }

  // ── DEBTS ──
  const { data: debtsExisting } = await supabase
    .from("debts").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!debtsExisting || debtsExisting.length === 0) {
    const { data: src } = await supabase
      .from("debts")
      .select("type, creditor, total_amount, monthly_payment, interest_rate, remaining_months")
      .eq("client_id", clientId)
      .or(`month_ref.eq.${closedMonthRef},month_ref.is.null`);
    if (src && src.length > 0) {
      const rows = src.map((r) => ({ ...r, client_id: clientId, month_ref: nextRef }));
      const { error } = await supabase.from("debts").insert(rows);
      if (!error) result.debts = rows.length;
    }
  }

  // ── ASSETS ──
  const { data: assetsExisting } = await supabase
    .from("assets").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!assetsExisting || assetsExisting.length === 0) {
    const { data: src } = await supabase
      .from("assets")
      .select("type, description, estimated_value")
      .eq("client_id", clientId)
      .or(`month_ref.eq.${closedMonthRef},month_ref.is.null`);
    if (src && src.length > 0) {
      const rows = src.map((r) => ({ ...r, client_id: clientId, month_ref: nextRef }));
      const { error } = await supabase.from("assets").insert(rows);
      if (!error) result.assets = rows.length;
    }
  }

  // ── INSURANCE ──
  const { data: insExisting } = await supabase
    .from("insurance").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!insExisting || insExisting.length === 0) {
    const { data: src } = await supabase
      .from("insurance")
      .select("type, provider, monthly_premium, coverage_amount")
      .eq("client_id", clientId)
      .or(`month_ref.eq.${closedMonthRef},month_ref.is.null`);
    if (src && src.length > 0) {
      const rows = src.map((r) => ({ ...r, client_id: clientId, month_ref: nextRef }));
      const { error } = await supabase.from("insurance").insert(rows);
      if (!error) result.insurance = rows.length;
    }
  }

  // ── GOALS (só não concluídos) ──
  const { data: goalsExisting } = await supabase
    .from("goals").select("id").eq("client_id", clientId).eq("month_ref", nextRef).limit(1);
  if (!goalsExisting || goalsExisting.length === 0) {
    const { data: src } = await supabase
      .from("goals")
      .select("description, target_amount, deadline, priority, amount_applied")
      .eq("client_id", clientId)
      .is("completed_at", null)
      .or(`month_ref.eq.${closedMonthRef},month_ref.is.null`);
    if (src && src.length > 0) {
      const rows = src.map((r) => ({ ...r, client_id: clientId, month_ref: nextRef }));
      const { error } = await supabase.from("goals").insert(rows);
      if (!error) result.goals = rows.length;
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
