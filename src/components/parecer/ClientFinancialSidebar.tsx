import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign, TrendingDown, Landmark, CreditCard, PiggyBank,
  AlertTriangle, Target, ShieldCheck, Loader2,
} from "lucide-react";

export interface ClientFinancials {
  totalIncome: number;
  totalExpenses: number;
  totalAssets: number;
  totalDebts: number;
  savingsCapacity: number;
  expenseRatio: number;
  riskClassification: string | null;
  topExpenses: { category: string; amount: number }[];
  debts: { type: string; creditor: string | null; total_amount: number; monthly_payment: number | null; interest_rate: number | null }[];
  goals: { description: string; target_amount: number | null; priority: string | null; deadline: string | null }[];
  insurance: { type: string; monthly_premium: number | null }[];
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const riskInfo: Record<string, { label: string; color: string }> = {
  A: { label: "Excelente", color: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  B: { label: "Bom", color: "bg-blue-500/10 text-blue-700 border-blue-300" },
  C: { label: "Moderado", color: "bg-amber-500/10 text-amber-700 border-amber-300" },
  D: { label: "Preocupante", color: "bg-orange-500/10 text-orange-700 border-orange-300" },
  E: { label: "Crítico", color: "bg-red-500/10 text-red-700 border-red-300" },
};

interface Props {
  data: ClientFinancials | null;
  loading: boolean;
}

export const ClientFinancialSidebar = ({ data, loading }: Props) => {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-40" />
        Sem dados financeiros
      </div>
    );
  }

  const risk = data.riskClassification ? riskInfo[data.riskClassification] : null;

  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="space-y-4 pr-2">
        {/* Risk Badge */}
        {risk && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${risk.color}`}>
            <ShieldCheck className="h-6 w-6" />
            <span className="text-xs font-semibold">Risco {data.riskClassification}</span>
            <span className="text-xs">— {risk.label}</span>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-2">
          <KpiCard icon={DollarSign} label="Renda" value={fmt(data.totalIncome)} color="text-emerald-600" />
          <KpiCard icon={TrendingDown} label="Despesas" value={fmt(data.totalExpenses)} color="text-red-500" />
          <KpiCard icon={Landmark} label="Patrimônio" value={fmt(data.totalAssets)} color="text-blue-600" />
          <KpiCard icon={CreditCard} label="Dívidas" value={fmt(data.totalDebts)} color="text-orange-600" />
        </div>

        {/* Savings Capacity */}
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="h-6 w-6 text-accent" />
            <span className="text-xs font-semibold text-foreground">Capacidade de Poupança</span>
          </div>
          <p className={`text-lg font-bold ${data.savingsCapacity >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {fmt(data.savingsCapacity)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.expenseRatio > 0 ? `${data.expenseRatio.toFixed(0)}% da renda em despesas` : "—"}
          </p>
        </div>

        <Separator />

        {/* Top Expenses */}
        {data.topExpenses.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Maiores Gastos
            </h4>
            <div className="space-y-1.5">
              {data.topExpenses.slice(0, 5).map((e, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/30">
                  <span className="text-xs text-foreground capitalize">{e.category}</span>
                  <span className="text-xs font-medium text-red-600">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debts */}
        {data.debts.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Dívidas Ativas
            </h4>
            <div className="space-y-1.5">
              {data.debts.map((d, i) => (
                <div key={i} className="px-2 py-1.5 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground capitalize">{d.type}</span>
                    <span className="text-xs font-medium text-orange-600">{fmt(d.total_amount)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[0.6875rem] text-muted-foreground">
                    {d.monthly_payment && <span>Parcela: {fmt(d.monthly_payment)}</span>}
                    {d.interest_rate && d.interest_rate > 0 && <span>• {d.interest_rate}% a.m.</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals */}
        {data.goals.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Objetivos
            </h4>
            <div className="space-y-1.5">
              {data.goals.map((g, i) => (
                <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-muted/30">
                  <Target className="h-6 w-6 text-accent mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground">{g.description}</p>
                    {g.target_amount && (
                      <p className="text-[0.6875rem] text-muted-foreground">Meta: {fmt(g.target_amount)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

const KpiCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
  <div className="rounded-xl border bg-card p-2.5">
    <div className="flex items-center gap-1.5 mb-0.5">
      <Icon className={`h-6 w-6 ${color}`} />
      <span className="text-[0.6875rem] text-muted-foreground">{label}</span>
    </div>
    <p className="text-sm font-bold text-foreground">{value}</p>
  </div>
);
