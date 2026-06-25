// Cálculos financeiros centrais — fonte única de verdade do sistema.
// Mantém as definições consistentes entre painel do cliente, painel do admin,
// fechamentos mensais e relatórios.

export interface AssetLike {
  type?: string | null;
  description?: string | null;
  estimated_value?: number | null;
}

const norm = (s?: string | null) =>
  (s ?? "").toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * Base da reserva de emergência = ativos líquidos.
 * Prioriza ativos rotulados como "reserva"/"emergência"; se não houver, usa
 * ativos líquidos (investimento, poupança, conta, caixa, tesouro, CDB).
 * Nunca inclui imóvel/veículo (não-líquidos) nem o patrimônio total.
 */
export const emergencyReserveBase = (assets: AssetLike[]): number => {
  const labeled = assets.filter(
    (a) => /reserva|emergenc/.test(norm(a.type)) || /reserva|emergenc/.test(norm(a.description)),
  );
  const pool =
    labeled.length > 0
      ? labeled
      : assets.filter((a) => /investiment|poupanc|conta|caixa|tesouro|cdb|liquid/.test(norm(a.type)));
  return pool.reduce((s, a) => s + (Number(a.estimated_value) || 0), 0);
};

/** Reserva de emergência em meses = base líquida ÷ despesas mensais. */
export const emergencyReserveMonths = (assets: AssetLike[], monthlyExpenses: number): number =>
  monthlyExpenses > 0 ? emergencyReserveBase(assets) / monthlyExpenses : 0;

/**
 * Saldo líquido de caixa do mês = renda − despesas − parcelas de dívida.
 * Esta é a definição canônica usada em todo o sistema (inclui o pagamento
 * mensal de dívidas, não só as despesas correntes).
 */
export const netMonthlyCashFlow = (
  totalIncome: number,
  totalExpenses: number,
  monthlyDebtPayments: number,
): number => totalIncome - totalExpenses - monthlyDebtPayments;

/** Taxa de poupança (%) = saldo líquido de caixa ÷ renda. */
export const savingsRatePct = (
  totalIncome: number,
  totalExpenses: number,
  monthlyDebtPayments: number,
): number =>
  totalIncome > 0
    ? (netMonthlyCashFlow(totalIncome, totalExpenses, monthlyDebtPayments) / totalIncome) * 100
    : 0;

// ── Recalculo de totais mensais a partir dos dados ao vivo ──────────────────
// Usado para meses "reabertos" (snapshot do fechamento desatualizado): recalcula
// com a MESMA lógica do fechamento, garantindo consistência com o relatório.

const dateOnly = (v?: string | null) => v?.slice(0, 10) ?? null;

/**
 * Seleciona as linhas pertinentes a um mês: prioriza as do mês exato; se não
 * houver nenhuma, usa as linhas sem mês (baseline do onboarding).
 */
export const preferMonthRows = <T extends { month_ref?: string | null }>(
  rows: T[],
  monthRef: string,
): T[] => {
  const exact = rows.filter((r) => dateOnly(r.month_ref) === monthRef);
  return exact.length > 0 ? exact : rows.filter((r) => !r.month_ref);
};

export interface MonthlyTotals {
  total_income: number;
  total_expenses: number;
  monthly_debt_payments: number;
  total_debts: number;
  total_assets: number;
  net_worth: number;
  savings_rate: number;
  emergency_reserve_months: number;
}

/** Recalcula os totais financeiros de um mês a partir dos dados ao vivo. */
export const computeMonthlyTotals = (
  monthRef: string,
  data: { income?: any[]; expenses?: any[]; debts?: any[]; assets?: any[] },
): MonthlyTotals => {
  const income = preferMonthRows(data.income || [], monthRef);
  const expenses = preferMonthRows(data.expenses || [], monthRef);
  const debts = preferMonthRows(data.debts || [], monthRef);
  const assets = preferMonthRows(data.assets || [], monthRef);

  const total_income = income.reduce(
    (s, r: any) => s + (r.frequency === "anual" ? Number(r.amount) / 12 : Number(r.amount) || 0),
    0,
  );
  const total_expenses = expenses.reduce((s, r: any) => s + (Number(r.amount) || 0), 0);
  const monthly_debt_payments = debts.reduce((s, r: any) => s + (Number(r.monthly_payment) || 0), 0);
  const total_debts = debts.reduce((s, r: any) => s + (Number(r.total_amount) || 0), 0);
  const total_assets = assets.reduce((s, r: any) => s + (Number(r.estimated_value) || 0), 0);

  return {
    total_income,
    total_expenses,
    monthly_debt_payments,
    total_debts,
    total_assets,
    net_worth: total_assets - total_debts,
    savings_rate: savingsRatePct(total_income, total_expenses, monthly_debt_payments),
    emergency_reserve_months: emergencyReserveMonths(assets as AssetLike[], total_expenses),
  };
};
