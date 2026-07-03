// Raio-X Financeiro: usa todos os endpoints do Open Finance para analisar a conta.
// Saldos, extrato/gastos por categoria, cartão, dívidas, investimentos e análises cruzadas.
import { useEffect, useMemo, useState } from "react";
import { call } from "../lib/openfinance";
import { brl0 } from "../state/VidaPlanContext";
import { VPCard } from "./ui";
import {
  Loader2, TrendingUp, TrendingDown, Wallet, CreditCard, Landmark, PiggyBank,
  ArrowDownRight, ArrowUpRight, Scale, Receipt, AlertTriangle, RefreshCw, Sparkles,
} from "lucide-react";

const CORES = ["#16314f", "#C8643F", "#2F8F6B", "#E2A03F", "#5B8DB8", "#8E6BC8", "#3FA0A0", "#B4741A"];
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
// Transações — parsing tolerante a formatos diferentes de Open Finance.
const txAbs = (t: any) => Math.abs(num(t.amount ?? t.value ?? t.transactionAmount ?? 0));
const txIsReceita = (t: any) => {
  const ty = String(t.type ?? t.transactionType ?? t.creditDebitType ?? "").toUpperCase();
  if (ty.includes("CREDIT") || ty.includes("INCOME") || ty === "IN") return true;
  if (ty.includes("DEBIT") || ty.includes("EXPENSE") || ty === "OUT") return false;
  return num(t.amount ?? t.value) >= 0; // fallback: sinal do valor
};
const txCat = (t: any) => t.category ?? t.categoryName ?? t.category_name ?? t.merchant?.category ?? t.categoryId ?? "Outros";
const txDesc = (t: any) => t.description ?? t.descriptionRaw ?? t.name ?? t.merchant?.name ?? "Transação";
const txDate = (t: any) => String(t.date ?? t.postingDate ?? t.transactionDate ?? t.createdAt ?? t.datetime ?? "");
const INV_LABEL: Record<string, string> = { FIXED_INCOME: "Renda Fixa", MUTUAL_FUND: "Fundos", EQUITY: "Ações", ETF: "ETFs", COE: "COE", SECURITY: "Títulos", OTHER: "Outros" };
const invBal = (i: any) => num(i.balance ?? i.netWorth ?? i.value ?? i.amount ?? i.grossValue ?? i.marketValue ?? 0);
const accBal = (a: any) => num(a.balance ?? a.currentBalance ?? a.available ?? a.availableBalance ?? a.amount ?? 0);

const RaioXFinanceiro = () => {
  const [loading, setLoading] = useState(true);
  const [conectado, setConectado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);

  const carregar = async () => {
    setLoading(true); setErro(null);
    try {
      const conns = asArray(await call("connections/list").catch(() => null), "connections");
      setConectado(conns.length > 0);
      if (!conns.length) { setLoading(false); return; }
      const hoje = new Date();
      const de = new Date(hoje.getTime() - 90 * 864e5).toISOString().slice(0, 10);
      const ate = hoje.toISOString().slice(0, 10);
      const [acc, tx, inv, cb, ln] = await Promise.all([
        call("accounts/list").catch(() => null),
        call("transactions/list", { from: de, to: ate, dateFrom: de, dateTo: ate }).catch(() => null),
        call("investments/list").catch(() => null),
        call("credit-card-bills/list").catch(() => null),
        call("loans/list").catch(() => null),
      ]);
      setAccounts(asArray(acc, "accounts", "results", "items"));
      setTransactions(asArray(tx, "transactions", "results", "items"));
      setInvestments(asArray(inv, "investments", "results", "items"));
      setBills(asArray(cb, "bills", "results", "items"));
      setLoans(asArray(ln, "loans", "results", "items"));
    } catch (e: any) { setErro(e?.message || "Não foi possível carregar a análise."); }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  // ── Cálculos ──
  const contas = accounts.filter((a) => (a.type || "").toUpperCase() !== "CREDIT");
  const saldoTotal = contas.reduce((s, a) => s + accBal(a), 0);
  const investTotal = investments.reduce((s, i) => s + invBal(i), 0);
  const dividaTotal = loans.reduce((s, l) => s + num(l.balance ?? l.outstandingBalance ?? l.principalAmount ?? l.totalAmount ?? l.amount), 0);
  const faturasAbertas = bills.filter((b) => !["PAID", "CLOSED"].includes(String(b.status ?? "").toUpperCase()));
  const faturaTotal = (faturasAbertas.length ? faturasAbertas : bills).reduce((s, b) => s + num(b.amount ?? b.totalAmount ?? b.balance ?? b.value), 0);
  const patrimonioLiquido = saldoTotal + investTotal - dividaTotal - faturaTotal;

  const receitas = transactions.filter(txIsReceita).reduce((s, t) => s + txAbs(t), 0);
  const despesas = transactions.filter((t) => !txIsReceita(t)).reduce((s, t) => s + txAbs(t), 0);
  const sobra = receitas - despesas;
  const taxaPoupanca = receitas > 0 ? (sobra / receitas) * 100 : 0;

  const porCategoria = useMemo(() => {
    const m: Record<string, number> = {};
    transactions.filter((t) => !txIsReceita(t)).forEach((t) => { const c = String(txCat(t)); m[c] = (m[c] || 0) + txAbs(t); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [transactions]);
  const porTipoInv = useMemo(() => {
    const m: Record<string, number> = {};
    investments.forEach((i) => { const t = (i.type || "OTHER").toUpperCase(); m[t] = (m[t] || 0) + invBal(i); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [investments]);
  const maioresGastos = useMemo(() =>
    transactions.filter((t) => !txIsReceita(t)).sort((a, b) => txAbs(b) - txAbs(a)).slice(0, 6),
  [transactions]);

  if (loading) return <VPCard className="p-8 flex items-center justify-center gap-3 text-[#1b2a3d]/50 text-sm"><Loader2 className="h-5 w-5 animate-spin" /> Analisando sua conta…</VPCard>;
  if (!conectado) return null;

  const semDados = !accounts.length && !transactions.length && !investments.length && !bills.length && !loans.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#C8643F]" />
          <h2 className="font-display text-xl font-bold text-[#16314f]">Raio-X Financeiro</h2>
        </div>
        <button onClick={carregar} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#16314f] hover:bg-black/[0.03]"><RefreshCw className="h-3.5 w-3.5" /> Atualizar</button>
      </div>

      {erro && <p className="text-xs text-[#C8643F] bg-[#C8643F]/[0.07] rounded-lg px-3 py-2 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {erro}</p>}
      {semDados && !erro && (
        <VPCard className="p-6 text-center text-sm text-[#1b2a3d]/60">
          Banco conectado, mas ainda não veio dado detalhado. Alguns bancos levam alguns minutos para sincronizar contas e extrato — clique em <strong>Atualizar</strong> em instantes.
        </VPCard>
      )}

      {/* Patrimônio líquido + resumo */}
      <VPCard className="p-5 bg-[#16314f] text-white" style={{ backgroundColor: "#16314f" }}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Patrimônio líquido (o que tem − o que deve)</p>
        <p className="font-display text-3xl font-bold mt-1 tabular-nums">{brl0(patrimonioLiquido)}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <MiniStat label="Saldo em contas" value={brl0(saldoTotal)} icon={Wallet} />
          <MiniStat label="Investimentos" value={brl0(investTotal)} icon={TrendingUp} />
          <MiniStat label="Dívidas" value={brl0(dividaTotal)} icon={Scale} neg />
          <MiniStat label="Faturas em aberto" value={brl0(faturaTotal)} icon={CreditCard} neg />
        </div>
      </VPCard>

      {/* Fluxo de caixa 90d */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Kpi label="Entrou (90 dias)" value={brl0(receitas)} icon={ArrowUpRight} cor="#2F8F6B" />
        <Kpi label="Saiu (90 dias)" value={brl0(despesas)} icon={ArrowDownRight} cor="#C8643F" />
        <Kpi label={sobra >= 0 ? "Sobrou" : "Faltou"} value={`${brl0(Math.abs(sobra))} · ${taxaPoupanca.toFixed(0)}%`} icon={sobra >= 0 ? PiggyBank : TrendingDown} cor={sobra >= 0 ? "#2F8F6B" : "#C8643F"} />
      </div>

      {/* Gastos por categoria */}
      {porCategoria.length > 0 && (
        <VPCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><Receipt className="h-4 w-4 text-[#16314f]" /><p className="font-display text-base font-bold text-[#16314f]">Gastos por categoria (90 dias)</p></div>
          <BarList data={porCategoria} total={despesas} />
        </VPCard>
      )}

      {/* Carteira de investimentos */}
      {porTipoInv.length > 0 && (
        <VPCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-[#2F8F6B]" /><p className="font-display text-base font-bold text-[#16314f]">Carteira de investimentos</p></div>
          <BarList data={porTipoInv.map(([k, v]) => [INV_LABEL[k] || k, v] as [string, number])} total={investTotal} />
        </VPCard>
      )}

      {/* Maiores gastos */}
      {maioresGastos.length > 0 && (
        <VPCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><ArrowDownRight className="h-4 w-4 text-[#C8643F]" /><p className="font-display text-base font-bold text-[#16314f]">Maiores gastos</p></div>
          <div className="divide-y divide-black/[0.06]">
            {maioresGastos.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0"><p className="font-medium text-[#16314f] truncate">{txDesc(t)}</p><p className="text-xs text-[#1b2a3d]/50">{String(txCat(t))}{txDate(t) ? ` · ${txDate(t).slice(0, 10)}` : ""}</p></div>
                <span className="tabular-nums font-semibold text-[#C8643F] shrink-0 ml-3">− {brl0(txAbs(t))}</span>
              </div>
            ))}
          </div>
        </VPCard>
      )}

      {/* Contas */}
      {contas.length > 0 && (
        <VPCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><Landmark className="h-4 w-4 text-[#16314f]" /><p className="font-display text-base font-bold text-[#16314f]">Suas contas</p></div>
          <div className="divide-y divide-black/[0.06]">
            {contas.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[#16314f]">{a.name || a.marketingName || a.subtype || a.type || "Conta"}</span>
                <span className="tabular-nums font-semibold text-[#16314f]">{brl0(accBal(a))}</span>
              </div>
            ))}
          </div>
        </VPCard>
      )}

      {/* Cartões / faturas */}
      {bills.length > 0 && (
        <VPCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><CreditCard className="h-4 w-4 text-[#8E6BC8]" /><p className="font-display text-base font-bold text-[#16314f]">Faturas de cartão</p></div>
          <div className="divide-y divide-black/[0.06]">
            {bills.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div><p className="font-medium text-[#16314f]">{b.connector_name || b.name || "Cartão"}</p><p className="text-xs text-[#1b2a3d]/50">Vence {String(b.dueDate ?? b.due_date ?? "—").slice(0, 10)} · {String(b.status ?? "")}</p></div>
                <span className="tabular-nums font-semibold text-[#16314f]">{brl0(num(b.amount ?? b.totalAmount ?? b.balance ?? b.value))}</span>
              </div>
            ))}
          </div>
        </VPCard>
      )}

      {/* Dívidas / empréstimos */}
      {loans.length > 0 && (
        <VPCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><Scale className="h-4 w-4 text-[#B4741A]" /><p className="font-display text-base font-bold text-[#16314f]">Empréstimos e financiamentos</p></div>
          <div className="divide-y divide-black/[0.06]">
            {loans.map((l, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div><p className="font-medium text-[#16314f]">{l.name || l.product || l.contractType || "Empréstimo"}</p><p className="text-xs text-[#1b2a3d]/50">{l.installments ? `${l.installments}x` : ""} {l.interestRate ? `· ${(num(l.interestRate) * (num(l.interestRate) < 1 ? 100 : 1)).toFixed(2)}% a.m.` : ""}</p></div>
                <span className="tabular-nums font-semibold text-[#C8643F]">{brl0(num(l.balance ?? l.outstandingBalance ?? l.principalAmount ?? l.totalAmount ?? l.amount))}</span>
              </div>
            ))}
          </div>
        </VPCard>
      )}
    </div>
  );
};

const MiniStat = ({ label, value, icon: Icon, neg }: { label: string; value: string; icon: any; neg?: boolean }) => (
  <div>
    <div className="flex items-center gap-1.5 text-white/50"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wider">{label}</span></div>
    <p className={`font-display text-base font-bold mt-0.5 tabular-nums ${neg ? "text-[#E29578]" : "text-white"}`}>{neg && value !== "R$ 0" ? "− " : ""}{value}</p>
  </div>
);
const Kpi = ({ label, value, icon: Icon, cor }: { label: string; value: string; icon: any; cor: string }) => (
  <VPCard className="p-4">
    <div className="flex items-start justify-between">
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">{label}</p><p className="font-display text-lg font-bold text-[#16314f] mt-1 tabular-nums">{value}</p></div>
      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cor}14`, color: cor }}><Icon className="h-4 w-4" /></div>
    </div>
  </VPCard>
);
const BarList = ({ data, total }: { data: [string, number][]; total: number }) => (
  <div className="space-y-2.5">
    {data.slice(0, 8).map(([label, v], i) => {
      const pct = total > 0 ? (v / total) * 100 : 0;
      return (
        <div key={label}>
          <div className="flex items-center justify-between text-sm mb-1"><span className="font-medium text-[#16314f]">{label}</span><span className="tabular-nums text-[#1b2a3d]/55">{brl0(v)} · {pct.toFixed(0)}%</span></div>
          <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CORES[i % CORES.length] }} /></div>
        </div>
      );
    })}
  </div>
);

export default RaioXFinanceiro;
