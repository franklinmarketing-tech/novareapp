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
