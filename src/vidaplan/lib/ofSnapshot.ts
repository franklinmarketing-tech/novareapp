// Lê o Open Finance e resume num "retrato financeiro" pronto pra alimentar o plano de vida.
import { call } from "./openfinance";

const asArray = (x: any, ...keys: string[]): any[] => {
  if (Array.isArray(x)) return x;
  for (const k of keys) if (Array.isArray(x?.[k])) return x[k];
  return [];
};
const num = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "object") return num(v.current ?? v.available ?? v.amount ?? v.value ?? v.balance ?? 0);
  return Number(v) || 0;
};
const invBal = (i: any) => num(i.balance ?? i.netWorth ?? i.value ?? i.amount ?? i.grossValue ?? i.marketValue ?? 0);
const accBal = (a: any) => num(a.balance ?? a.currentBalance ?? a.available ?? a.availableBalance ?? a.amount ?? 0);
const txAbs = (t: any) => Math.abs(num(t.amount ?? t.value ?? t.transactionAmount ?? 0));
const txIsReceita = (t: any) => {
  const ty = String(t.type ?? t.transactionType ?? t.creditDebitType ?? "").toUpperCase();
  if (ty.includes("CREDIT") || ty.includes("INCOME") || ty === "IN") return true;
  if (ty.includes("DEBIT") || ty.includes("EXPENSE") || ty === "OUT") return false;
  return num(t.amount ?? t.value) >= 0;
};
const txCat = (t: any) => String(t.category ?? t.categoryName ?? t.category_name ?? t.merchant?.category ?? "Outros");

export interface OFDivida { id: number; nome: string; saldo: number; parcelas: number; jurosAa: number }
export interface OFSnapshot {
  conectado: boolean;
  bancos: string[];
  saldoLiquido: number;      // contas (não-crédito) → reserva/liquidez
  investimentos: number;     // carteira consolidada
  rendaMensal: number;       // média mensal de entradas (90d ÷ 3)
  gastoMensal: number;       // média mensal de saídas
  categorias: { nome: string; valor: number }[]; // gasto médio mensal por categoria
  dividas: OFDivida[];
  transacoes: number;        // qtde de transações lidas
  meses: number;
}

const VAZIO: OFSnapshot = { conectado: false, bancos: [], saldoLiquido: 0, investimentos: 0, rendaMensal: 0, gastoMensal: 0, categorias: [], dividas: [], transacoes: 0, meses: 3 };

export async function fetchOFSnapshot(): Promise<OFSnapshot> {
  const conns = asArray(await call("connections/list").catch(() => null), "connections");
  if (!conns.length) return VAZIO;

  const de = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const ate = new Date().toISOString().slice(0, 10);
  const [accR, invR, txR, lnR] = await Promise.all([
    call("accounts/list").catch(() => null),
    call("investments/list").catch(() => null),
    call("transactions/list", { from: de, to: ate, dateFrom: de, dateTo: ate }).catch(() => null),
    call("loans/list").catch(() => null),
  ]);
  const accounts = asArray(accR, "accounts", "results");
  const investments = asArray(invR, "investments", "results");
  const transactions = asArray(txR, "transactions", "results");
  const loans = asArray(lnR, "loans", "results");
  const meses = 3;

  const saldoLiquido = accounts.filter((a) => String(a.type || "").toUpperCase() !== "CREDIT").reduce((s, a) => s + accBal(a), 0);
  const investimentos = investments.reduce((s, i) => s + invBal(i), 0);
  const rendaMensal = transactions.filter(txIsReceita).reduce((s, t) => s + txAbs(t), 0) / meses;
  const gastoMensal = transactions.filter((t) => !txIsReceita(t)).reduce((s, t) => s + txAbs(t), 0) / meses;

  const catMap: Record<string, number> = {};
  transactions.filter((t) => !txIsReceita(t)).forEach((t) => { const c = txCat(t); catMap[c] = (catMap[c] || 0) + txAbs(t); });
  const categorias = Object.entries(catMap)
    .map(([nome, v]) => ({ nome, valor: Math.round(v / meses) }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const dividas: OFDivida[] = loans.map((l, i) => {
    const r = num(l.interestRate);
    return {
      id: Date.now() + i,
      nome: l.name || l.product || l.contractType || "Empréstimo",
      saldo: num(l.balance ?? l.outstandingBalance ?? l.principalAmount ?? l.totalAmount ?? l.amount),
      parcelas: num(l.installments) || 12,
      jurosAa: r ? (r < 1 ? r * 100 * 12 : r) : 18,
    };
  }).filter((d) => d.saldo > 0);

  return {
    conectado: true,
    bancos: conns.map((c: any) => c.connector_name || "Banco"),
    saldoLiquido, investimentos, rendaMensal, gastoMensal, categorias, dividas,
    transacoes: transactions.length, meses,
  };
}
