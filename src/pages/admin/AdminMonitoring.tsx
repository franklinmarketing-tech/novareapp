// V9: Acompanhamento (admin) — dados sempre atuais + comparativo + IA + fechamento mensal
import { useEffect, useMemo, useState } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Camera,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Loader2,
  Lightbulb,
  Lock,
  Minus,
  PiggyBank,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import MonthlyClosings from "@/components/monitoring/MonthlyClosings";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { motion, AnimatePresence } from "framer-motion";

// ── Tipos ───────────────────────────────────────────────

interface Snapshot {
  snapshot_date: string;
  total_income: number | null;
  total_expenses: number | null;
  total_assets: number | null;
  total_debts: number | null;
  savings_rate: number | null;
}

interface GoalRow {
  id: string;
  description: string;
  target_amount: number | null;
  deadline: string | null;
  priority: string | null;
}

interface ActionItem {
  id: string;
  goal_id: string | null;
  financial_impact: number | null;
  realized_impact: number | null;
  status: string;
  parent_id: string | null;
  description: string;
  area: string;
  objective: string | null;
}

interface ActivePlan {
  id: string;
  objective: string | null;
  applied_variant: string | null;
  applied_at: string | null;
}

interface MonthlyClosingLite {
  id: string;
  month_ref: string;
  status: string;
  total_income: number | null;
  total_expenses: number | null;
  total_assets: number | null;
  total_debts: number | null;
  monthly_debt_payments: number | null;
  net_worth: number | null;
  savings_rate: number | null;
}

// V9: snapshot diario para comparacao fine-grained (hoje vs ontem)
interface DailySnapshot {
  id: string;
  snapshot_date: string;
  total_income: number | null;
  total_expenses: number | null;
  total_debts: number | null;
  total_assets: number | null;
  monthly_debt_payments: number | null;
  net_worth: number | null;
  savings_rate: number | null;
  completed_actions: number | null;
  total_actions: number | null;
  completed_impact: number | null;
}

interface Insight {
  kind: "evolution" | "attention" | "next_step";
  title: string;
  description: string;
  financial_impact?: number;
  source_label?: string;
}

// ── Helpers ─────────────────────────────────────────────

const fmtBRL = (v?: number | null) =>
  typeof v === "number"
    ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : "—";

const fmtPct = (v?: number | null) => (typeof v === "number" ? `${v.toFixed(1)}%` : "—");

const monthRefLabel = (ref: string) => {
  const d = new Date(ref + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

const deltaInfo = (a: number, b: number) => {
  const diff = b - a;
  const pct = a !== 0 ? (diff / Math.abs(a)) * 100 : 0;
  return { diff, pct };
};

// ── Componente principal ────────────────────────────────

const AdminMonitoring = () => {
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");

  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [closings, setClosings] = useState<MonthlyClosingLite[]>([]);
  const [dailySnapshots, setDailySnapshots] = useState<DailySnapshot[]>([]);

  // Totais atuais (calculados em tempo real, nao snapshot)
  const [current, setCurrent] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalDebts: 0,
    totalAssets: 0,
    monthlyDebtPayments: 0,
  });

  // Comparativo: default hoje vs ontem (mais granular do que mês-vs-mês)
  const [compareA, setCompareA] = useState<string>("__yesterday__");
  const [compareB, setCompareB] = useState<string>("__now__");

  // IA insights
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // ── Carga ─────────────────────────────────────────
  const loadAll = async (silent = false) => {
    if (!clientId) return;
    if (!silent) setLoading(true);

    const [clientRes, incomeRes, expensesRes, debtsRes, assetsRes, goalsRes, planRes, closingsRes, dailyRes] = await Promise.all([
      supabase.from("clients").select("user_id").eq("id", clientId).maybeSingle(),
      supabase.from("income").select("amount, frequency").eq("client_id", clientId),
      supabase.from("expenses").select("amount").eq("client_id", clientId),
      supabase.from("debts").select("total_amount, monthly_payment").eq("client_id", clientId),
      supabase.from("assets").select("estimated_value").eq("client_id", clientId),
      supabase.from("goals").select("id, description, target_amount, deadline, priority").eq("client_id", clientId).order("priority"),
      supabase.from("action_plans").select("id, objective, applied_variant, applied_at").eq("client_id", clientId).maybeSingle(),
      supabase
        .from("monthly_closings")
        .select(
          "id, month_ref, status, total_income, total_expenses, total_assets, total_debts, monthly_debt_payments, net_worth, savings_rate",
        )
        .eq("client_id", clientId)
        .order("month_ref", { ascending: false }),
      // V9: snapshots diarios — pega ate 30 dias para escolher comparativos
      (supabase as any)
        .from("daily_progress_snapshots")
        .select(
          "id, snapshot_date, total_income, total_expenses, total_debts, total_assets, monthly_debt_payments, net_worth, savings_rate, completed_actions, total_actions, completed_impact",
        )
        .eq("client_id", clientId)
        .order("snapshot_date", { ascending: false })
        .limit(30),
    ]);

    if (clientRes.data?.user_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", clientRes.data.user_id)
        .maybeSingle();
      if (prof?.full_name) setClientName(prof.full_name);
    }

    const totalIncome = (incomeRes.data || []).reduce((s, r) => {
      const a = Number(r.amount) || 0;
      return s + (r.frequency === "anual" ? a / 12 : a);
    }, 0);
    const totalExpenses = (expensesRes.data || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalDebts = (debtsRes.data || []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    const totalAssets = (assetsRes.data || []).reduce((s, r) => s + (Number(r.estimated_value) || 0), 0);
    const monthlyDebtPayments = (debtsRes.data || []).reduce(
      (s, r) => s + (Number(r.monthly_payment) || 0),
      0,
    );

    setCurrent({ totalIncome, totalExpenses, totalDebts, totalAssets, monthlyDebtPayments });
    setGoals((goalsRes.data as GoalRow[]) || []);
    setClosings((closingsRes.data as MonthlyClosingLite[]) || []);
    setPlan(planRes.data as ActivePlan | null);
    setDailySnapshots((dailyRes?.data as DailySnapshot[]) || []);

    let loadedActions: ActionItem[] = [];
    if (planRes.data?.id) {
      const { data: items } = await supabase
        .from("action_items")
        .select("id, goal_id, financial_impact, realized_impact, status, parent_id, description, area, objective")
        .eq("action_plan_id", planRes.data.id);
      loadedActions = (items as ActionItem[]) || [];
      setActions(loadedActions);
    }

    // V9: upsert do snapshot diario de HOJE (sobrescreve se ja existir hoje)
    // Faz em background — nao bloqueia o load
    const parentActionsLocal = loadedActions.filter((a) => !a.parent_id);
    const doneActions = parentActionsLocal.filter((a) => a.status === "concluido");
    const completedImpactValue = doneActions.reduce(
      (s, a) => s + (a.realized_impact ?? a.financial_impact ?? 0),
      0,
    );
    const netCashFlowToday = totalIncome - totalExpenses - monthlyDebtPayments;
    const savingsRateToday = totalIncome > 0 ? (netCashFlowToday / totalIncome) * 100 : 0;
    const today = new Date().toISOString().slice(0, 10);
    (supabase as any)
      .from("daily_progress_snapshots")
      .upsert(
        {
          client_id: clientId,
          snapshot_date: today,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          total_debts: totalDebts,
          total_assets: totalAssets,
          monthly_debt_payments: monthlyDebtPayments,
          net_worth: totalAssets - totalDebts,
          savings_rate: savingsRateToday,
          completed_actions: doneActions.length,
          total_actions: parentActionsLocal.length,
          completed_impact: completedImpactValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,snapshot_date" },
      )
      .then(({ error: snapErr }: { error: any }) => {
        if (snapErr) {
          console.warn("[AdminMonitoring] falha ao salvar snapshot diário:", snapErr.message);
          return;
        }
        // Recarrega a lista de snapshots para incluir o de hoje (silencioso)
        (supabase as any)
          .from("daily_progress_snapshots")
          .select(
            "id, snapshot_date, total_income, total_expenses, total_debts, total_assets, monthly_debt_payments, net_worth, savings_rate, completed_actions, total_actions, completed_impact",
          )
          .eq("client_id", clientId)
          .order("snapshot_date", { ascending: false })
          .limit(30)
          .then(({ data: refreshed }: { data: any }) => {
            if (refreshed) setDailySnapshots(refreshed as DailySnapshot[]);
          });
      });

    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ── Derivados ─────────────────────────────────────
  const netCashFlow = current.totalIncome - current.totalExpenses - current.monthlyDebtPayments;
  const savingsRate = current.totalIncome > 0 ? (netCashFlow / current.totalIncome) * 100 : 0;
  const netWorth = current.totalAssets - current.totalDebts;

  // Progresso por objetivo (baseado em acoes-pai concluidas vinculadas)
  const parentActions = actions.filter((a) => !a.parent_id);
  const goalsWithProgress = useMemo(() => {
    return goals.map((g) => {
      const linked = parentActions.filter((a) => a.goal_id === g.id);
      const done = linked.filter((a) => a.status === "concluido").length;
      const total = linked.length;
      const completedImpact = linked
        .filter((a) => a.status === "concluido")
        .reduce((s, a) => s + (a.financial_impact || 0), 0);
      const totalImpact = linked.reduce((s, a) => s + (a.financial_impact || 0), 0);
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      const daysToDeadline = g.deadline
        ? Math.ceil((new Date(g.deadline + "T12:00:00").getTime() - Date.now()) / 86400000)
        : null;

      return {
        ...g,
        linkedCount: total,
        doneCount: done,
        pct,
        completedImpact,
        totalImpact,
        daysToDeadline,
      };
    });
  }, [goals, parentActions]);

  // Comparativo: resolve datasets A e B
  // Tokens especiais: __now__, __yesterday__ (snapshot D-1), __previous__ (ultimo fechamento mensal)
  // ID com prefixo "d:" -> snapshot diario. ID puro UUID -> closing mensal.
  const resolveDataset = (token: string): Dataset | null => {
    if (token === "__now__") return buildCurrentDataset(current);
    if (token === "__yesterday__") {
      // Pega o snapshot mais recente que NAO seja hoje
      const today = new Date().toISOString().slice(0, 10);
      const sorted = [...dailySnapshots].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
      const yesterday = sorted.find((s) => s.snapshot_date < today);
      return yesterday ? buildDailyDataset(yesterday) : null;
    }
    if (token === "__previous__") {
      const sorted = [...closings].sort((a, b) => b.month_ref.localeCompare(a.month_ref));
      const prev = sorted.find((c) => c.status === "fechado");
      return prev ? buildClosingDataset(prev) : null;
    }
    if (token.startsWith("d:")) {
      const date = token.slice(2);
      const snap = dailySnapshots.find((s) => s.snapshot_date === date);
      return snap ? buildDailyDataset(snap) : null;
    }
    const found = closings.find((c) => c.id === token);
    return found ? buildClosingDataset(found) : null;
  };

  const datasetA = useMemo(() => resolveDataset(compareA), [compareA, closings, current, dailySnapshots]);
  const datasetB = useMemo(() => resolveDataset(compareB), [compareB, closings, current, dailySnapshots]);

  const actionPlanCompletion = useMemo(() => {
    if (parentActions.length === 0) return null;
    const done = parentActions.filter((a) => a.status === "concluido").length;
    return {
      done,
      total: parentActions.length,
      pct: Math.round((done / parentActions.length) * 100),
      totalImpact: parentActions.reduce((s, a) => s + (a.financial_impact || 0), 0),
    };
  }, [parentActions]);

  // ── Acoes ─────────────────────────────────────────
  // V9 item 11: salva o valor realizado de uma acao (apenas consultor pode preencher)
  const saveRealized = async (actionId: string, raw: string) => {
    const trimmed = raw.trim();
    const value = trimmed
      ? Number.parseFloat(trimmed.replace(/[^\d.,-]/g, "").replace(",", "."))
      : null;
    const finalValue = value != null && !Number.isNaN(value) ? value : null;
    await supabase.from("action_items").update({ realized_impact: finalValue }).eq("id", actionId);
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, realized_impact: finalValue } : a)),
    );
  };

  const runAnalyze = async (silent = false) => {
    if (!clientId) return;
    if (!silent) setAnalyzing(true);
    if (!silent) setInsights(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-progress", {
        body: { clientId },
      });
      if (error) throw error;
      const arr = (data?.insights || []) as Insight[];
      if (!arr.length) {
        if (!silent) throw new Error("IA não retornou insights");
        return;
      }
      setInsights(arr);
      if (!silent) {
        toast({
          title: "Análise concluída",
          description: `${arr.length} insights gerados pela IA.`,
        });
      }
    } catch (e: any) {
      if (!silent) {
        toast({
          title: "Erro ao analisar",
          description: e?.message || "Tente novamente",
          variant: "destructive",
        });
      }
    }
    if (!silent) setAnalyzing(false);
  };

  // Auto-dispara analise interna quando ja tem plano em andamento ou pareceres
  useEffect(() => {
    if (autoTriggered || loading || !clientId) return;
    // So dispara automaticamente se houver contexto util (plano aplicado ou acoes)
    if (plan?.applied_variant || parentActions.length > 0) {
      setAutoTriggered(true);
      runAnalyze(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, loading, plan?.applied_variant, parentActions.length]);

  // ── Render ────────────────────────────────────────
  if (loading) return <LoadingState variant="page" rows={4} />;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Acompanhamento
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Os dados abaixo refletem o estado <span className="font-semibold text-foreground">atual</span> do cliente.
            Para preservar o histórico, feche o mês quando concluir um ciclo.
          </p>
        </div>
      </div>

      {/* KPIs ATUAIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Renda mensal"
          value={fmtBRL(current.totalIncome)}
          icon={TrendingUp}
          tone="bg-emerald-500/10 text-emerald-600"
        />
        <KpiCard
          label="Despesas mensais"
          value={fmtBRL(current.totalExpenses)}
          icon={TrendingDown}
          tone="bg-red-500/10 text-red-600"
          sub={current.monthlyDebtPayments > 0 ? `+ ${fmtBRL(current.monthlyDebtPayments)} parcelas` : undefined}
        />
        <KpiCard
          label="Dívida total"
          value={fmtBRL(current.totalDebts)}
          icon={CreditCard}
          tone="bg-orange-500/10 text-orange-600"
        />
        <KpiCard
          label="Patrimônio líquido"
          value={fmtBRL(netWorth)}
          icon={Wallet}
          tone={netWorth >= 0 ? "bg-blue-500/10 text-blue-600" : "bg-red-500/10 text-red-600"}
          sub={`Ativos ${fmtBRL(current.totalAssets)}`}
        />
      </div>

      {/* SALDO + SAVINGS RATE em destaque */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="py-5 px-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/85 mb-1">
                Saldo líquido mensal
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  netCashFlow >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {netCashFlow >= 0 ? "+" : ""}
                {fmtBRL(netCashFlow)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Receitas − Despesas − Parcelas</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/85 mb-1">
                Taxa de poupança
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  savingsRate >= 20
                    ? "text-success"
                    : savingsRate >= 0
                      ? "text-foreground"
                      : "text-destructive",
                )}
              >
                {fmtPct(savingsRate)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">% da renda que sobra</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/85 mb-1">
                Plano em andamento
              </p>
              {plan?.applied_variant ? (
                <>
                  <p className="text-base font-bold tracking-tight text-foreground truncate">
                    Plano {plan.applied_variant}
                    {plan.objective ? <> · <span className="text-muted-foreground font-medium">{plan.objective}</span></> : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {actionPlanCompletion
                      ? `${actionPlanCompletion.done}/${actionPlanCompletion.total} ações · impacto ${fmtBRL(actionPlanCompletion.totalImpact)}/mês`
                      : "Sem ações"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhum plano aplicado</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* COMPARATIVO */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              Comparar evolução
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <DateSelect value={compareA} onChange={setCompareA} closings={closings} daily={dailySnapshots} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <DateSelect value={compareB} onChange={setCompareB} closings={closings} daily={dailySnapshots} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {datasetA && datasetB ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <DeltaRow label="Renda mensal" a={datasetA.totalIncome} b={datasetB.totalIncome} positiveGood />
              <DeltaRow label="Despesas mensais" a={datasetA.totalExpenses} b={datasetB.totalExpenses} positiveGood={false} />
              <DeltaRow label="Parcelas dívidas" a={datasetA.monthlyDebtPayments} b={datasetB.monthlyDebtPayments} positiveGood={false} />
              <DeltaRow label="Dívida total" a={datasetA.totalDebts} b={datasetB.totalDebts} positiveGood={false} />
              <DeltaRow label="Patrimônio total" a={datasetA.totalAssets} b={datasetB.totalAssets} positiveGood />
              <DeltaRow label="Patrimônio líquido" a={datasetA.netWorth} b={datasetB.netWorth} positiveGood />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-6 text-center">
              {compareA === "__yesterday__" && dailySnapshots.length <= 1
                ? "Ainda não há snapshot de ontem. Volte amanhã para comparar a evolução diária — os snapshots são salvos automaticamente todo dia que você abre esta tela."
                : closings.length === 0 && dailySnapshots.length <= 1
                  ? "Sem dados anteriores para comparar. Feche um mês ou acesse novamente amanhã."
                  : "Selecione 2 datas válidas para ver o comparativo."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* PROGRESSO DOS OBJETIVOS */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Target className="h-4 w-4 text-violet-600" />
            </div>
            Progresso dos objetivos
            <Badge variant="outline" className="text-[10px]">
              {goalsWithProgress.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goalsWithProgress.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Sem objetivos cadastrados"
              description="Cadastre objetivos no Diagnóstico para acompanhar a progressão aqui."
              variant="compact"
              tone="neutral"
            />
          ) : (
            <div className="space-y-3">
              {goalsWithProgress.map((g) => (
                <GoalRowCard key={g.id} goal={g} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TABELA DE METAS (V9 item 11): Descricao | Area | Meta | Realizado | % Atingido */}
      {parentActions.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <ClipboardList className="h-4 w-4 text-amber-600" />
                </div>
                Tabela de Metas e Realizado
                <Badge variant="outline" className="text-[10px]">
                  {parentActions.length}
                </Badge>
              </CardTitle>
              <span className="text-[10.5px] text-muted-foreground inline-flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Coluna "Realizado" é de uso exclusivo do consultor
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="py-2.5 px-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Descrição</th>
                    <th className="py-2.5 px-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Área</th>
                    <th className="py-2.5 px-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Meta (R$/mês)</th>
                    <th className="py-2.5 px-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Realizado (R$/mês)</th>
                    <th className="py-2.5 px-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium">% Atingido</th>
                  </tr>
                </thead>
                <tbody>
                  {parentActions.map((a) => {
                    const meta = a.financial_impact || 0;
                    const realized = a.realized_impact || 0;
                    const pct = meta > 0 ? Math.round((realized / meta) * 100) : 0;
                    const reached = pct >= 100;
                    const partial = pct > 0 && pct < 100;
                    const areaTone =
                      a.area === "dividas" ? "bg-orange-500/10 text-orange-600 border-orange-500/25" :
                      a.area === "despesas" ? "bg-red-500/10 text-red-600 border-red-500/25" :
                      a.area === "renda" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25" :
                      a.area === "investimentos" ? "bg-blue-500/10 text-blue-600 border-blue-500/25" :
                      a.area === "protecao" ? "bg-purple-500/10 text-purple-600 border-purple-500/25" :
                      "bg-amber-500/10 text-amber-600 border-amber-500/25";
                    return (
                      <tr key={a.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 align-top">
                          <p className="text-[12.5px] text-foreground leading-snug font-medium">{a.description}</p>
                          {a.objective && (
                            <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-relaxed">
                              → {a.objective}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", areaTone)}>
                            {a.area}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-foreground font-semibold align-top">
                          {meta > 0 ? `R$ ${meta.toLocaleString("pt-BR")}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right align-top">
                          <input
                            type="number"
                            step="any"
                            defaultValue={a.realized_impact ?? ""}
                            placeholder="0"
                            onBlur={(e) => saveRealized(a.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            className="w-24 h-8 text-right tabular-nums text-sm bg-card border border-border/60 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right align-top">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[11.5px] font-semibold tabular-nums",
                              reached && "text-success",
                              partial && "text-foreground",
                              !partial && !reached && "text-muted-foreground/60",
                            )}
                          >
                            {meta > 0 ? `${pct}%` : "—"}
                            {reached && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Linha de totais */}
                  {(() => {
                    const totalMeta = parentActions.reduce((s, a) => s + (a.financial_impact || 0), 0);
                    const totalReal = parentActions.reduce((s, a) => s + (a.realized_impact || 0), 0);
                    const totalPct = totalMeta > 0 ? Math.round((totalReal / totalMeta) * 100) : 0;
                    return (
                      <tr className="bg-muted/30 font-bold">
                        <td className="py-2.5 px-3 text-[11px] text-foreground uppercase tracking-wider">Total</td>
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-foreground">R$ {totalMeta.toLocaleString("pt-BR")}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-success">R$ {totalReal.toLocaleString("pt-BR")}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <span className={cn(totalPct >= 100 ? "text-success" : "text-foreground")}>{totalPct}%</span>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* INSIGHTS DA IA */}
      <Card className="border-accent/20 bg-gradient-to-br from-accent/[0.03] via-card to-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Evolução pela IA</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Analisa os pareceres recentes e as ações concluídas para narrar a progressão.
                </p>
              </div>
            </div>
            <Button
              onClick={() => runAnalyze(false)}
              disabled={analyzing}
              size="sm"
              className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {analyzing ? "Analisando..." : insights ? "Reanalisar" : "Analisar evolução"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!insights && !analyzing && (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Clique em <span className="font-semibold text-foreground">Analisar evolução</span> para a IA gerar uma timeline dos avanços e pontos de atenção.
            </p>
          )}
          {analyzing && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <p className="text-xs text-muted-foreground">
                Lendo os últimos pareceres e ações concluídas...
              </p>
            </div>
          )}
          {insights && insights.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {insights.map((it, i) => (
                  <InsightCard key={i} insight={it} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FECHAMENTOS MENSAIS (componente existente) */}
      {clientId && (
        <MonthlyClosings clientId={clientId} clientName={clientName} isAdmin={true} />
      )}

      {/* V9: CTA para proxima etapa */}
      <JourneyFooterNav
        current="acompanhamento"
        message="Acompanhamento atualizado. Gere o Relatório consolidado para entregar ao cliente."
      />
    </div>
  );
};

// ── Subcomponentes ─────────────────────────────────────

const KpiCard = ({
  label,
  value,
  icon: Icon,
  tone,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: string;
  sub?: string;
}) => (
  <Card className="overflow-hidden border-border/50">
    <CardContent className="p-3.5">
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", tone)}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <p className="text-base sm:text-lg font-bold text-foreground tabular-nums tracking-tight leading-none">
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-[10.5px] text-muted-foreground/85 mt-1 truncate">{sub}</p>}
    </CardContent>
  </Card>
);

const DateSelect = ({
  value,
  onChange,
  closings,
  daily,
}: {
  value: string;
  onChange: (v: string) => void;
  closings: MonthlyClosingLite[];
  daily: DailySnapshot[];
}) => {
  const closed = closings.filter((c) => c.status === "fechado");
  const today = new Date().toISOString().slice(0, 10);
  // Snapshots passados (sem incluir hoje), mais recentes primeiro
  const pastDaily = [...daily]
    .filter((d) => d.snapshot_date < today)
    .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))
    .slice(0, 14); // ate 2 semanas no menu
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__now__" className="text-xs">
          Hoje (dados atuais)
        </SelectItem>
        <SelectItem value="__yesterday__" className="text-xs">
          Ontem (último snapshot)
        </SelectItem>
        <SelectItem value="__previous__" className="text-xs">
          Último fechamento mensal
        </SelectItem>
        {pastDaily.length > 0 && (
          <>
            <div className="my-1 border-t border-border" />
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 px-2 py-1 font-semibold">
              Dias anteriores
            </div>
            {pastDaily.map((d) => {
              const label = new Date(d.snapshot_date + "T12:00:00").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              });
              return (
                <SelectItem key={d.id} value={`d:${d.snapshot_date}`} className="text-xs">
                  {label}
                </SelectItem>
              );
            })}
          </>
        )}
        {closed.length > 0 && (
          <>
            <div className="my-1 border-t border-border" />
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 px-2 py-1 font-semibold">
              Fechamentos mensais
            </div>
            {closed.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs capitalize">
                {monthRefLabel(c.month_ref)}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
};

type Dataset = {
  totalIncome: number;
  totalExpenses: number;
  totalDebts: number;
  totalAssets: number;
  monthlyDebtPayments: number;
  netWorth: number;
};

const buildCurrentDataset = (c: {
  totalIncome: number;
  totalExpenses: number;
  totalDebts: number;
  totalAssets: number;
  monthlyDebtPayments: number;
}): Dataset => ({
  ...c,
  netWorth: c.totalAssets - c.totalDebts,
});

const buildClosingDataset = (c: MonthlyClosingLite): Dataset => ({
  totalIncome: Number(c.total_income || 0),
  totalExpenses: Number(c.total_expenses || 0),
  totalDebts: Number(c.total_debts || 0),
  totalAssets: Number(c.total_assets || 0),
  monthlyDebtPayments: Number(c.monthly_debt_payments || 0),
  netWorth: Number(c.net_worth || 0),
});

const buildDailyDataset = (s: DailySnapshot): Dataset => ({
  totalIncome: Number(s.total_income || 0),
  totalExpenses: Number(s.total_expenses || 0),
  totalDebts: Number(s.total_debts || 0),
  totalAssets: Number(s.total_assets || 0),
  monthlyDebtPayments: Number(s.monthly_debt_payments || 0),
  netWorth: Number(s.net_worth || 0),
});

const DeltaRow = ({
  label,
  a,
  b,
  positiveGood,
}: {
  label: string;
  a: number;
  b: number;
  /** se true, aumento eh bom (renda, patrimonio); se false, aumento eh ruim (despesas, dividas) */
  positiveGood: boolean;
}) => {
  const { diff, pct } = deltaInfo(a, b);
  const isUp = diff > 0;
  const isDown = diff < 0;
  const isGood = positiveGood ? isUp : isDown;
  const isBad = positiveGood ? isDown : isUp;
  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const color = isGood ? "text-success" : isBad ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-1.5">
        {label}
      </p>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground tabular-nums truncate">{fmtBRL(a)}</p>
          <p className="text-sm font-bold text-foreground tabular-nums truncate">{fmtBRL(b)}</p>
        </div>
        <div className={cn("flex items-center gap-0.5 text-[11px] font-semibold tabular-nums", color)}>
          <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {Math.abs(pct).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

const GoalRowCard = ({
  goal,
}: {
  goal: {
    id: string;
    description: string;
    target_amount: number | null;
    deadline: string | null;
    priority: string | null;
    pct: number;
    doneCount: number;
    linkedCount: number;
    completedImpact: number;
    totalImpact: number;
    daysToDeadline: number | null;
  };
}) => {
  const overdue = goal.daysToDeadline != null && goal.daysToDeadline < 0 && goal.pct < 100;
  const remaining =
    goal.target_amount && goal.completedImpact
      ? Math.max(0, goal.target_amount - goal.completedImpact)
      : goal.target_amount || 0;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground tracking-tight leading-snug">
            {goal.description}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {goal.target_amount != null && goal.target_amount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Target className="h-3 w-3" />
                Meta {fmtBRL(goal.target_amount)}
              </Badge>
            )}
            {goal.deadline && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] gap-1",
                  overdue && "border-destructive/40 text-destructive",
                )}
              >
                <Calendar className="h-3 w-3" />
                {new Date(goal.deadline + "T12:00:00").toLocaleDateString("pt-BR")}
                {goal.daysToDeadline != null && (
                  <span className="ml-0.5">
                    ({overdue ? `${Math.abs(goal.daysToDeadline)}d atraso` : goal.daysToDeadline === 0 ? "hoje" : `${goal.daysToDeadline}d`})
                  </span>
                )}
              </Badge>
            )}
            {goal.priority && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {goal.priority}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-xl font-black tabular-nums", goal.pct === 100 ? "text-success" : "text-foreground")}>
            {goal.pct}%
          </p>
          <p className="text-[10px] text-muted-foreground">
            {goal.doneCount}/{goal.linkedCount || 0} ações
          </p>
        </div>
      </div>
      <Progress value={goal.pct} className={cn("h-1.5", goal.pct === 100 && "[&>div]:bg-success")} />
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">
          {goal.completedImpact > 0 ? (
            <>Impacto já conquistado: <span className="font-semibold text-success">{fmtBRL(goal.completedImpact)}</span>/mês</>
          ) : (
            <span className="italic">Sem ações concluídas vinculadas ainda</span>
          )}
        </span>
        {goal.target_amount != null && goal.target_amount > 0 && remaining > 0 && (
          <span className="text-muted-foreground">
            Falta <span className="font-semibold text-foreground">{fmtBRL(remaining)}</span>
          </span>
        )}
      </div>
    </div>
  );
};

const InsightCard = ({ insight, index }: { insight: Insight; index: number }) => {
  const tone = {
    evolution: {
      bg: "bg-success/[0.06]",
      border: "border-success/30",
      icon: TrendingUp,
      iconBg: "bg-success/15 text-success",
      label: "Evolução",
      labelTone: "bg-success/10 text-success border-success/30",
    },
    attention: {
      bg: "bg-warning/[0.06]",
      border: "border-warning/35",
      icon: AlertTriangle,
      iconBg: "bg-warning/15 text-warning",
      label: "Atenção",
      labelTone: "bg-warning/10 text-warning border-warning/30",
    },
    next_step: {
      bg: "bg-accent/[0.04]",
      border: "border-accent/30",
      icon: Lightbulb,
      iconBg: "bg-accent/15 text-accent",
      label: "Próximo passo",
      labelTone: "bg-accent/10 text-accent border-accent/30",
    },
  }[insight.kind];

  const Icon = tone.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className={cn("rounded-xl border p-3.5", tone.bg, tone.border)}
    >
      <div className="flex items-start gap-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", tone.iconBg)}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className={cn("text-[10px] border px-1.5 py-0", tone.labelTone)}>
              {tone.label}
            </Badge>
            {typeof insight.financial_impact === "number" && insight.financial_impact !== 0 && (
              <span
                className={cn(
                  "text-[10.5px] font-semibold tabular-nums",
                  insight.financial_impact > 0 ? "text-success" : "text-destructive",
                )}
              >
                {insight.financial_impact > 0 ? "+" : ""}
                {fmtBRL(insight.financial_impact)}/mês
              </span>
            )}
            {insight.source_label && (
              <span className="text-[10px] text-muted-foreground/85">
                · {insight.source_label}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground tracking-tight leading-snug">
            {insight.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            {insight.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminMonitoring;
