import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar, CartesianGrid, Cell,
} from "recharts";
import {
  Activity, TrendingUp, TrendingDown, Minus, CheckCircle2, Target,
  Wallet, Receipt, CreditCard, Building2, Shield, Trophy, Clock,
  Sparkles, AlertTriangle, AlertCircle, Pause, ArrowDownRight,
  CalendarClock, Zap, type LucideIcon,
} from "lucide-react";

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

const monthLabel = (iso: string) => {
  const d = new Date(iso.length === 7 ? iso + "-01T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(/^\w/, (c) => c.toUpperCase());
};

const formatDate = (d?: string | null) => {
  if (!d) return null;
  return new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("pt-BR");
};

type SourceTable = "income" | "expenses" | "debts" | "assets" | "insurance";
const SECTION_LABEL: Record<SourceTable, string> = {
  income: "Rendas", expenses: "Despesas", debts: "Dívidas", assets: "Patrimônio", insurance: "Seguros",
};
const SECTION_ICON: Record<SourceTable, LucideIcon> = {
  income: Wallet, expenses: Receipt, debts: CreditCard, assets: Building2, insurance: Shield,
};
const SECTION_COLOR: Record<SourceTable, string> = {
  income: "hsl(142 71% 45%)",
  expenses: "hsl(347 77% 50%)",
  debts: "hsl(0 84% 60%)",
  assets: "hsl(199 89% 48%)",
  insurance: "hsl(271 81% 56%)",
};

interface AcompEntry {
  id: string;
  meta_id: string | null;
  source_id: string;
  source_table: string;
  source_label: string;
  valor_atual: number | null;
  valor_meta: number | null;
  progresso_pct: number | null;
  estado_atual: string | null;
  is_closing_snapshot: boolean;
  snapshotted_at: string;
}

interface Meta {
  id: string;
  source_table: string;
  source_id: string;
  source_label: string;
  meta_text: string | null;
  meta_valor: number | null;
  prazo: string | null;
  completed_at: string | null;
}

interface Goal {
  id: string;
  description: string;
  target_amount: number | null;
  deadline: string | null;
  priority: string | null;
  amount_applied: number | null;
  completed_at: string | null;
  created_at: string;
}

function progressColor(pct: number) {
  if (pct >= 100) return "text-emerald-600";
  if (pct >= 60)  return "text-blue-600";
  if (pct >= 30)  return "text-amber-600";
  return "text-rose-600";
}
function progressBarColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60)  return "bg-blue-500";
  if (pct >= 30)  return "bg-amber-500";
  return "bg-rose-500";
}

function TrendIcon({ current, prev }: { current?: number | null; prev?: number | null }) {
  if (current == null || prev == null) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  if (current > prev) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (current < prev) return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

const AdminAcompanhamentoEvolucao = () => {
  const { clientId } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client_profile", clientId],
    queryFn: async () => {
      const { data: c } = await supabase.from("clients").select("user_id").eq("id", clientId).maybeSingle();
      if (!c?.user_id) return null;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", c.user_id).maybeSingle();
      return p;
    },
    enabled: !!clientId,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["acompanhamento_evolucao", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("acompanhamento_entradas")
        .select("*")
        .eq("client_id", clientId)
        .order("snapshotted_at", { ascending: true });
      return (data || []) as AcompEntry[];
    },
    enabled: !!clientId,
  });

  const { data: metas = [] } = useQuery({
    queryKey: ["parecer_metas_all", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parecer_metas")
        .select("*")
        .eq("client_id", clientId)
        .order("source_table");
      return (data || []) as Meta[];
    },
    enabled: !!clientId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals_evolucao", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at");
      return (data || []) as Goal[];
    },
    enabled: !!clientId,
  });

  // Fechamentos mensais — base para cashflow e saúde financeira
  const { data: closings = [] } = useQuery({
    queryKey: ["monthly_closings_evolucao", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("monthly_closings")
        .select("month_ref, total_income, total_expenses, total_assets, total_debts, monthly_debt_payments, net_worth, savings_rate, emergency_reserve_months")
        .eq("client_id", clientId)
        .order("month_ref", { ascending: true });
      return (data || []) as Array<{
        month_ref: string;
        total_income: number | null;
        total_expenses: number | null;
        total_assets: number | null;
        total_debts: number | null;
        monthly_debt_payments: number | null;
        net_worth: number | null;
        savings_rate: number | null;
        emergency_reserve_months: number | null;
      }>;
    },
    enabled: !!clientId,
  });

  // ── Resumo geral ──
  const summary = useMemo(() => {
    const metasAtivas = metas.filter((m) => !m.completed_at && m.source_table !== "goals");
    const metasConcluidas = metas.filter((m) => m.completed_at && m.source_table !== "goals");
    const goalsConcluidos = goals.filter((g) => g.completed_at);
    const goalsAtivos = goals.filter((g) => !g.completed_at);

    // Progresso médio: usa último entry por (source_table:source_label)
    // — chave persistente entre clones mensais
    const latestByMeta = new Map<string, AcompEntry>();
    entries.forEach((e) => {
      if (e.is_closing_snapshot || !e.source_label) return;
      const key = `${e.source_table}:${e.source_label}`;
      const prev = latestByMeta.get(key);
      if (!prev || new Date(e.snapshotted_at) > new Date(prev.snapshotted_at)) {
        latestByMeta.set(key, e);
      }
    });
    const allPct = Array.from(latestByMeta.values())
      .map((e) => e.progresso_pct)
      .filter((p): p is number => p != null);
    const avgProgress = allPct.length > 0 ? Math.round(allPct.reduce((a, b) => a + b, 0) / allPct.length) : null;

    // Progresso médio dos objetivos
    const goalProgress = goals
      .filter((g) => !g.completed_at && g.target_amount && g.target_amount > 0)
      .map((g) => Math.min(Math.round(((g.amount_applied || 0) / (g.target_amount || 1)) * 100), 100));
    const avgGoalProgress = goalProgress.length > 0 ? Math.round(goalProgress.reduce((a, b) => a + b, 0) / goalProgress.length) : null;

    return {
      metasAtivas: metasAtivas.length,
      metasConcluidas: metasConcluidas.length,
      goalsAtivos: goalsAtivos.length,
      goalsConcluidos: goalsConcluidos.length,
      avgProgress,
      avgGoalProgress,
      totalSnapshots: entries.filter((e) => !e.is_closing_snapshot).length,
    };
  }, [metas, goals, entries]);

  // ── Evolução agregada ao longo do tempo (por mês YYYY-MM) ──
  const monthlyEvolution = useMemo(() => {
    const byMonth = new Map<string, { month: string; pcts: number[] }>();
    entries
      .filter((e) => !e.is_closing_snapshot && e.progresso_pct != null && e.meta_id)
      .forEach((e) => {
        const m = e.snapshotted_at.slice(0, 7);
        if (!byMonth.has(m)) byMonth.set(m, { month: m, pcts: [] });
        byMonth.get(m)!.pcts.push(e.progresso_pct as number);
      });
    return Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => ({
        month: monthLabel(d.month),
        progressoMedio: Math.round(d.pcts.reduce((a, b) => a + b, 0) / d.pcts.length),
      }));
  }, [entries]);

  // ── Cashflow (renda − despesas) e tendência ──
  const cashflow = useMemo(() => {
    if (!closings.length) return null;
    const series = closings.map((c) => {
      const income = Number(c.total_income ?? 0);
      const expense = Number(c.total_expenses ?? 0);
      return {
        month: c.month_ref.slice(0, 7),
        monthLabel: monthLabel(c.month_ref.slice(0, 7)),
        income,
        expense,
        net: income - expense,
        savingsRate: c.savings_rate,
        netWorth: c.net_worth,
        emergency_reserve_months: c.emergency_reserve_months,
      };
    });
    const last = series[series.length - 1];
    const prev = series.length > 1 ? series[series.length - 2] : null;
    const delta = prev ? last.net - prev.net : null;
    const deltaPct = prev && prev.net !== 0 ? (delta! / Math.abs(prev.net)) * 100 : null;
    const avg6 = series.slice(-6).reduce((s, p) => s + p.net, 0) / Math.min(series.length, 6);
    return { series: series.slice(-6), last, prev, delta, deltaPct, avg6 };
  }, [closings]);

  // ── Forecast: projeta quando cada meta deve ser atingida no ritmo atual ──
  type ForecastStatus = "achieved" | "ahead" | "on_track" | "delayed" | "stalled" | "no_data";
  interface MetaForecast {
    status: ForecastStatus;
    monthsToTarget: number | null;   // meses até atingir no ritmo atual
    projectedDate: Date | null;
    deadlineDate: Date | null;
    diffMonths: number | null;        // negativo = adiantado; positivo = atrasado
    velocity: number | null;          // delta médio mensal de valor_atual
    daysSinceLastUpdate: number | null;
  }
  const forecastByMeta = useMemo(() => {
    const map = new Map<string, MetaForecast>();
    const today = new Date();
    metas.forEach((meta) => {
      // Match estendido: meta_id direto OU source_table+source_label (cross-month)
      const history = (entries
        .filter((e) =>
          !e.is_closing_snapshot && e.valor_atual != null && (
            e.meta_id === meta.id ||
            (e.source_table === meta.source_table && e.source_label === meta.source_label)
          )
        ))
        .slice()
        .sort((a, b) => new Date(a.snapshotted_at).getTime() - new Date(b.snapshotted_at).getTime());

      const last = history[history.length - 1];
      const daysSince = last
        ? Math.floor((today.getTime() - new Date(last.snapshotted_at).getTime()) / 86400000)
        : null;

      // Já atingiu?
      const lastPct = last?.progresso_pct;
      if (lastPct != null && lastPct >= 100) {
        map.set(meta.id, { status: "achieved", monthsToTarget: 0, projectedDate: null, deadlineDate: meta.prazo ? new Date(meta.prazo + "T00:00:00") : null, diffMonths: null, velocity: null, daysSinceLastUpdate: daysSince });
        return;
      }

      // Sem histórico suficiente
      if (history.length < 2 || !meta.meta_valor) {
        map.set(meta.id, { status: "no_data", monthsToTarget: null, projectedDate: null, deadlineDate: meta.prazo ? new Date(meta.prazo + "T00:00:00") : null, diffMonths: null, velocity: null, daysSinceLastUpdate: daysSince });
        return;
      }

      // Velocidade média (delta de valor_atual / delta em meses)
      const first = history[0];
      const monthsSpan = Math.max(0.5,
        (new Date(last.snapshotted_at).getTime() - new Date(first.snapshotted_at).getTime()) / (1000 * 60 * 60 * 24 * 30.4),
      );
      const velocity = ((last.valor_atual ?? 0) - (first.valor_atual ?? 0)) / monthsSpan; // R$/mês

      // Direção do progresso depende do tipo de meta:
      // - debts: meta_valor < valor_atual inicial (reduzir) → velocity esperada < 0
      // - expenses: similar (reduzir) → velocity < 0
      // - income/assets/goals: aumentar → velocity > 0
      // Como temos progresso_pct, vamos usá-lo: queremos ver progresso_pct chegar a 100.
      // Se progresso_pct está estagnado (mesmo valor há tempo), está stalled.
      const pctVelocity = (() => {
        if (last.progresso_pct == null || first.progresso_pct == null) return null;
        return (last.progresso_pct - first.progresso_pct) / monthsSpan; // pp/mês
      })();

      const currentPct = last.progresso_pct ?? 0;
      const remaining = 100 - currentPct;

      // Parada (velocity zero ou negativa quando deveria crescer) → stalled
      if (pctVelocity == null || pctVelocity <= 0 || daysSince == null || daysSince > 60) {
        map.set(meta.id, {
          status: "stalled",
          monthsToTarget: null,
          projectedDate: null,
          deadlineDate: meta.prazo ? new Date(meta.prazo + "T00:00:00") : null,
          diffMonths: null,
          velocity,
          daysSinceLastUpdate: daysSince,
        });
        return;
      }

      const monthsToTarget = remaining / pctVelocity;
      const projectedDate = new Date(today.getTime() + monthsToTarget * 30.4 * 86400000);

      let status: ForecastStatus = "on_track";
      let diffMonths: number | null = null;

      if (meta.prazo) {
        const deadlineDate = new Date(meta.prazo + "T00:00:00");
        const monthsToDeadline = (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
        diffMonths = monthsToTarget - monthsToDeadline; // positivo = atrasada
        if (diffMonths <= -1) status = "ahead";
        else if (diffMonths >= 1) status = "delayed";
        else status = "on_track";
      } else {
        status = "on_track";
      }

      map.set(meta.id, {
        status,
        monthsToTarget,
        projectedDate,
        deadlineDate: meta.prazo ? new Date(meta.prazo + "T00:00:00") : null,
        diffMonths,
        velocity,
        daysSinceLastUpdate: daysSince,
      });
    });
    return map;
  }, [metas, entries]);

  // ── Alertas inteligentes ──
  interface Alert {
    id: string;
    severity: "danger" | "warning" | "info";
    icon: LucideIcon;
    title: string;
    description: string;
  }
  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    const today = new Date();

    // 1) Cashflow negativo
    if (cashflow?.last && cashflow.last.net < 0) {
      out.push({
        id: "cashflow_negative",
        severity: "danger",
        icon: ArrowDownRight,
        title: "Cashflow negativo no último fechamento",
        description: `Despesas superaram a renda em ${fmtBRL(Math.abs(cashflow.last.net))} (${cashflow.last.monthLabel}).`,
      });
    }

    // 2) Taxa de poupança baixa (< 10%)
    if (cashflow?.last?.savingsRate != null && cashflow.last.savingsRate < 10 && cashflow.last.savingsRate >= 0) {
      out.push({
        id: "low_savings",
        severity: "warning",
        icon: AlertTriangle,
        title: "Taxa de poupança abaixo de 10%",
        description: `Atual: ${cashflow.last.savingsRate.toFixed(1)}%. Recomendado: ≥ 20%.`,
      });
    }

    // 3) Reserva abaixo do mínimo (< 3 meses)
    if (cashflow?.last?.emergency_reserve_months != null && cashflow.last.emergency_reserve_months < 3) {
      out.push({
        id: "low_reserve",
        severity: "warning",
        icon: AlertTriangle,
        title: "Reserva de emergência abaixo do mínimo",
        description: `Atual: ${cashflow.last.emergency_reserve_months.toFixed(1)} meses. Mínimo: 3 meses.`,
      });
    }

    // 4) Metas paradas há mais de 30 dias
    const stalledMetas: string[] = [];
    metas.forEach((meta) => {
      if (meta.completed_at || meta.source_table === "goals") return;
      const f = forecastByMeta.get(meta.id);
      if (f && (f.status === "stalled" || (f.daysSinceLastUpdate != null && f.daysSinceLastUpdate > 30))) {
        stalledMetas.push(meta.source_label);
      }
    });
    if (stalledMetas.length > 0) {
      out.push({
        id: "stalled_metas",
        severity: "warning",
        icon: Pause,
        title: `${stalledMetas.length} meta${stalledMetas.length !== 1 ? "s" : ""} parada${stalledMetas.length !== 1 ? "s" : ""}`,
        description: `Sem progresso há mais de 30 dias: ${stalledMetas.slice(0, 3).join(", ")}${stalledMetas.length > 3 ? "…" : ""}`,
      });
    }

    // 5) Metas atrasadas (forecast > prazo)
    const delayedMetas = metas.filter((m) => {
      const f = forecastByMeta.get(m.id);
      return f && f.status === "delayed";
    });
    if (delayedMetas.length > 0) {
      out.push({
        id: "delayed_metas",
        severity: "danger",
        icon: AlertCircle,
        title: `${delayedMetas.length} meta${delayedMetas.length !== 1 ? "s" : ""} no ritmo atual não bate${delayedMetas.length === 1 ? "" : "m"} o prazo`,
        description: delayedMetas.slice(0, 3).map((m) => m.source_label).join(", ") + (delayedMetas.length > 3 ? "…" : ""),
      });
    }

    // 6) Objetivos com prazo < 30 dias
    const expiring = goals.filter((g) => {
      if (g.completed_at || !g.deadline) return false;
      const d = new Date(g.deadline + "T00:00:00");
      const days = (d.getTime() - today.getTime()) / 86400000;
      return days >= 0 && days <= 30;
    });
    if (expiring.length > 0) {
      out.push({
        id: "expiring_goals",
        severity: "warning",
        icon: CalendarClock,
        title: `${expiring.length} objetivo${expiring.length !== 1 ? "s" : ""} com prazo nos próximos 30 dias`,
        description: expiring.slice(0, 3).map((g) => g.description).join(", ") + (expiring.length > 3 ? "…" : ""),
      });
    }

    return out;
  }, [cashflow, metas, goals, forecastByMeta]);

  // ── Histórico por (source_table:source_label) — preserva sparkline entre clones ──
  const historyByMeta = useMemo(() => {
    const map = new Map<string, AcompEntry[]>();
    entries
      .filter((e) => !e.is_closing_snapshot && e.source_label)
      .forEach((e) => {
        const key = `${e.source_table}:${e.source_label}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
      });
    map.forEach((arr) => arr.sort((a, b) => new Date(a.snapshotted_at).getTime() - new Date(b.snapshotted_at).getTime()));
    return map;
  }, [entries]);

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Selecione um cliente para ver a evolução.
      </div>
    );
  }

  const hasAnyData = entries.length > 0 || metas.length > 0 || goals.length > 0;
  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-border/60">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Activity className="h-4.5 w-4.5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              Acompanhamento — {client?.full_name ?? "Cliente"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Evolução do cliente em metas e objetivos.
            </p>
          </div>
        </div>
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-border bg-muted/20">
          <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sem dados de evolução ainda.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Volte para <strong>Lançamento do mês</strong> e registre o estado atual das metas para ver a evolução aqui.
          </p>
        </div>
        <JourneyFooterNav current="evolucao" />
      </div>
    );
  }

  // metas ativas (não concluídas e não goals)
  const activeMetas = metas.filter((m) => !m.completed_at && m.source_table !== "goals");

  return (
    <div className="space-y-10">
      {/* Header — hero */}
      <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.06] via-card to-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent via-novare-blue to-accent/60" />
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <div className="h-14 w-14 rounded-2xl bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center shrink-0 shadow-sm">
            <Activity className="h-7 w-7 text-accent" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent/80">Etapa 6 · Acompanhamento</p>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight truncate">
              {client?.full_name ?? "Cliente"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Visão da evolução em metas e objetivos. Alimente este painel pelo <span className="font-semibold text-foreground/80">Lançamento do mês</span>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Alertas inteligentes ── */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-amber-500 shrink-0" />
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Sinais de atenção</h3>
            <Badge variant="outline" className="text-xs font-bold ml-1">{alerts.length}</Badge>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((a) => {
              const AIcon = a.icon;
              const tone = a.severity === "danger"
                ? { border: "border-rose-300/60", bg: "bg-rose-50/70 dark:bg-rose-950/30", icon: "bg-rose-500 text-white", title: "text-rose-800 dark:text-rose-200" }
                : a.severity === "warning"
                ? { border: "border-amber-300/60", bg: "bg-amber-50/70 dark:bg-amber-950/30", icon: "bg-amber-500 text-white", title: "text-amber-800 dark:text-amber-200" }
                : { border: "border-sky-300/60", bg: "bg-sky-50/70 dark:bg-sky-950/30", icon: "bg-sky-500 text-white", title: "text-sky-800 dark:text-sky-200" };
              return (
                <div key={a.id} className={cn("rounded-xl border-2 p-4 flex items-start gap-3", tone.border, tone.bg)}>
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm", tone.icon)}>
                    <AIcon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold leading-tight", tone.title)}>{a.title}</p>
                    <p className="text-xs text-foreground/75 mt-1 leading-snug">{a.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Resumo geral ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-novare-blue/40" />
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-novare-blue" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Metas ativas</p>
            </div>
            <p className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-foreground">
              {summary.metasAtivas}
            </p>
            {summary.metasConcluidas > 0 && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                +{summary.metasConcluidas} concluída{summary.metasConcluidas !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500/40" />
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Objetivos ativos</p>
            </div>
            <p className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-foreground">
              {summary.goalsAtivos}
            </p>
            {summary.goalsConcluidos > 0 && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                +{summary.goalsConcluidos} concluído{summary.goalsConcluidos !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            summary.avgProgress == null ? "bg-muted" :
            summary.avgProgress >= 100 ? "bg-emerald-500/60" :
            summary.avgProgress >= 60  ? "bg-blue-500/60" :
            summary.avgProgress >= 30  ? "bg-amber-500/60" : "bg-rose-500/60",
          )} />
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Progresso · metas</p>
            </div>
            <p className={cn(
              "text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none",
              summary.avgProgress != null ? progressColor(summary.avgProgress) : "text-muted-foreground",
            )}>
              {summary.avgProgress != null ? `${summary.avgProgress}%` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">média entre todas as metas</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            summary.avgGoalProgress == null ? "bg-muted" :
            summary.avgGoalProgress >= 100 ? "bg-emerald-500/60" :
            summary.avgGoalProgress >= 60  ? "bg-blue-500/60" :
            summary.avgGoalProgress >= 30  ? "bg-amber-500/60" : "bg-rose-500/60",
          )} />
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Progresso · objetivos</p>
            </div>
            <p className={cn(
              "text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none",
              summary.avgGoalProgress != null ? progressColor(summary.avgGoalProgress) : "text-muted-foreground",
            )}>
              {summary.avgGoalProgress != null ? `${summary.avgGoalProgress}%` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">média entre todos os objetivos</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Cashflow: renda − despesas com tendência ── */}
      {cashflow && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-emerald-500 shrink-0" />
            <Zap className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Cashflow mensal</h3>
            <Badge variant="outline" className="text-xs font-bold ml-1">
              {cashflow.series.length} fechamento{cashflow.series.length !== 1 ? "s" : ""}
            </Badge>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>

          <Card className="overflow-hidden">
            <div className={cn(
              "h-1.5",
              cashflow.last.net >= 0 ? "bg-emerald-500" : "bg-rose-500",
            )} />
            <CardContent className="p-5 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
                {/* Resumo numérico */}
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Saldo do mês ({cashflow.last.monthLabel})
                    </p>
                    <p className={cn(
                      "text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none mt-1",
                      cashflow.last.net >= 0 ? "text-emerald-600" : "text-rose-600",
                    )}>
                      {cashflow.last.net >= 0 ? "+" : "−"}{fmtBRL(Math.abs(cashflow.last.net))}
                    </p>
                    {cashflow.delta != null && cashflow.prev && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                        {cashflow.delta > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        ) : cashflow.delta < 0 ? (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className={cn(
                          "font-bold tabular-nums",
                          cashflow.delta > 0 ? "text-emerald-600" : cashflow.delta < 0 ? "text-rose-600" : "text-muted-foreground",
                        )}>
                          {cashflow.delta > 0 ? "+" : ""}{fmtBRL(cashflow.delta)}
                        </span>
                        <span className="text-muted-foreground">vs {cashflow.prev.monthLabel}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-emerald-600" />
                        Renda
                      </p>
                      <p className="text-base font-bold tabular-nums mt-0.5">{fmtBRL(cashflow.last.income)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-rose-600" />
                        Despesas
                      </p>
                      <p className="text-base font-bold tabular-nums mt-0.5">{fmtBRL(cashflow.last.expense)}</p>
                    </div>
                    {cashflow.last.savingsRate != null && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tx. poupança</p>
                        <p className={cn(
                          "text-base font-bold tabular-nums mt-0.5",
                          cashflow.last.savingsRate >= 20 ? "text-emerald-600" :
                          cashflow.last.savingsRate >= 10 ? "text-amber-600" : "text-rose-600",
                        )}>
                          {cashflow.last.savingsRate.toFixed(1)}%
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Média 6m</p>
                      <p className={cn(
                        "text-base font-bold tabular-nums mt-0.5",
                        cashflow.avg6 >= 0 ? "text-foreground" : "text-rose-600",
                      )}>
                        {cashflow.avg6 >= 0 ? "+" : "−"}{fmtBRL(Math.abs(cashflow.avg6))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mini gráfico de barras */}
                <div className="h-[200px] -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashflow.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                      <XAxis dataKey="monthLabel" stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={6} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : String(v)} />
                      <ReTooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, fontWeight: 500 }}
                        labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                        formatter={(v: number) => [fmtBRL(v), "Saldo"]}
                      />
                      <Bar dataKey="net" radius={[6, 6, 0, 0]}>
                        {cashflow.series.map((p, i) => (
                          <Cell key={i} fill={p.net >= 0 ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Linha do tempo agregada ── */}
      {monthlyEvolution.length > 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-accent shrink-0" />
            <Activity className="w-5 h-5 text-accent" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Evolução do progresso médio</h3>
            <Badge variant="outline" className="text-xs font-bold ml-1">
              {summary.totalSnapshots} lançamento{summary.totalSnapshots !== 1 ? "s" : ""}
            </Badge>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>
          <Card>
            <CardContent className="p-5 sm:p-6">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyEvolution} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.35)" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={6} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <ReTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 14px hsl(var(--foreground) / 0.1)" }}
                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                    formatter={(v: number) => [`${v}%`, "Progresso médio"]}
                  />
                  <Area type="monotone" dataKey="progressoMedio" stroke="hsl(var(--accent))" strokeWidth={3} fill="url(#gradProgress)" dot={{ r: 3, fill: "hsl(var(--accent))" }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Metas com sparkline ── */}
      {activeMetas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-novare-blue shrink-0" />
            <Target className="w-5 h-5 text-novare-blue" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Evolução por meta</h3>
            <Badge variant="outline" className="text-xs font-bold ml-1">
              {activeMetas.length} ativa{activeMetas.length !== 1 ? "s" : ""}
            </Badge>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>
          <div className="space-y-2.5">
            {activeMetas.map((meta) => {
              const sourceColor = SECTION_COLOR[meta.source_table as SourceTable] ?? "hsl(var(--primary))";
              const Icon = SECTION_ICON[meta.source_table as SourceTable] ?? Target;
              const history = historyByMeta.get(`${meta.source_table}:${meta.source_label}`) || [];
              const last = history[history.length - 1];
              const prev = history[history.length - 2];
              const sparkData = history.slice(-12).map((e) => ({
                t: e.snapshotted_at.slice(0, 10),
                pct: e.progresso_pct ?? 0,
                valor: e.valor_atual ?? 0,
              }));
              const pct = last?.progresso_pct ?? null;

              const forecast = forecastByMeta.get(meta.id);
              const forecastBadge = (() => {
                if (!forecast) return null;
                switch (forecast.status) {
                  case "achieved":
                    return { label: "Meta atingida", cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700", icon: CheckCircle2 };
                  case "ahead":
                    return { label: `Adiantada · ${Math.abs(Math.round(forecast.diffMonths || 0))} ${Math.abs(Math.round(forecast.diffMonths || 0)) === 1 ? "mês" : "meses"} antes`, cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700", icon: TrendingUp };
                  case "on_track":
                    return { label: forecast.projectedDate ? `No prazo · projeção ${forecast.projectedDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}` : "No prazo", cls: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700", icon: Activity };
                  case "delayed":
                    return { label: `Atrasada · +${Math.round(forecast.diffMonths || 0)} ${Math.round(forecast.diffMonths || 0) === 1 ? "mês" : "meses"}`, cls: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700", icon: AlertCircle };
                  case "stalled":
                    return { label: forecast.daysSinceLastUpdate != null && forecast.daysSinceLastUpdate > 30 ? `Parada · ${forecast.daysSinceLastUpdate}d` : "Parada", cls: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700", icon: Pause };
                  default:
                    return null;
                }
              })();
              const FIcon = forecastBadge?.icon;
              const deltaPp = prev?.progresso_pct != null && last?.progresso_pct != null
                ? last.progresso_pct - prev.progresso_pct
                : null;

              return (
                <div
                  key={meta.id}
                  className="group relative overflow-hidden rounded-xl border border-border/70 bg-card hover:shadow-md hover:-translate-y-px transition-all duration-200"
                  style={{ borderLeft: `4px solid ${sourceColor}` }}
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5">
                    {/* ── Ícone ── */}
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${sourceColor}18`, border: `1px solid ${sourceColor}30` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: sourceColor }} strokeWidth={2.2} />
                    </div>

                    {/* ── Identificação ── */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: sourceColor }}>
                          {SECTION_LABEL[meta.source_table as SourceTable] ?? meta.source_table}
                        </span>
                        {forecastBadge && FIcon && (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border",
                            forecastBadge.cls,
                          )}>
                            <FIcon className="w-2.5 h-2.5" />
                            {forecastBadge.label}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold leading-tight text-foreground truncate mt-0.5">
                        {meta.source_label}
                      </p>
                      {meta.meta_text && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{meta.meta_text}</p>
                      )}
                    </div>

                    {/* ── Percentage + delta ── */}
                    <div className="flex flex-col items-end gap-0 shrink-0">
                      <span className={cn("text-3xl font-black tabular-nums leading-none tracking-tight", pct != null ? progressColor(pct) : "text-muted-foreground")}>
                        {pct != null ? `${pct}%` : "—"}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <TrendIcon current={last?.progresso_pct} prev={prev?.progresso_pct} />
                        <span className="font-semibold tabular-nums">
                          {deltaPp != null ? `${deltaPp >= 0 ? "+" : ""}${deltaPp}pp` : "novo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Linhas de informação (uma por dado) ── */}
                  <div className="border-t border-border/40 divide-y divide-border/30">
                    {/* Alvo */}
                    {meta.meta_valor && (
                      <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                          <Target className="w-3 h-3" />
                          Alvo
                        </span>
                        <span className="font-bold tabular-nums" style={{ color: sourceColor }}>{fmtBRL(meta.meta_valor)}</span>
                      </div>
                    )}
                    {/* Atual */}
                    {last?.valor_atual != null && (
                      <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                          <Activity className="w-3 h-3" />
                          Atual
                        </span>
                        <span className="font-bold tabular-nums text-foreground">{fmtBRL(last.valor_atual)}</span>
                      </div>
                    )}
                    {/* Prazo */}
                    {meta.prazo && (
                      <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                          <Clock className="w-3 h-3" />
                          Prazo
                        </span>
                        <span className="font-bold tabular-nums text-foreground/85">{formatDate(meta.prazo)}</span>
                      </div>
                    )}
                    {/* Projeção (quando disponível) */}
                    {forecast?.projectedDate && forecast.status !== "achieved" && forecast.status !== "stalled" && (
                      <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                          <CalendarClock className="w-3 h-3" />
                          Projeção (ritmo atual)
                        </span>
                        <span className="font-bold tabular-nums text-foreground/85">
                          {forecast.projectedDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                        </span>
                      </div>
                    )}
                    {/* Sparkline ou status de poucos dados */}
                    {sparkData.length > 1 ? (
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                            <Activity className="w-3 h-3" />
                            Evolução
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            últimos {sparkData.length} lançamentos
                          </span>
                        </div>
                        <div className="h-[50px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                              <Line type="monotone" dataKey="pct" stroke={sourceColor} strokeWidth={2} dot={{ r: 2, fill: sourceColor }} activeDot={{ r: 4 }} />
                              <ReTooltip
                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, padding: "6px 10px", boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)" }}
                                labelFormatter={(t) => new Date(t).toLocaleDateString("pt-BR")}
                                formatter={(v: number) => [`${v}%`, "Progresso"]}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-muted-foreground/70 italic">
                        <Minus className="w-3 h-3" />
                        Sem evolução ainda — registre mais lançamentos para ver o gráfico.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />
        </div>
      )}

      {/* ── Objetivos com barra de progresso ── */}
      {goals.filter((g) => !g.completed_at).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-emerald-500 shrink-0" />
            <Trophy className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Evolução dos objetivos</h3>
            <Badge variant="outline" className="text-xs font-bold ml-1">
              {goals.filter((g) => !g.completed_at).length} ativo{goals.filter((g) => !g.completed_at).length !== 1 ? "s" : ""}
            </Badge>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {goals.filter((g) => !g.completed_at).map((goal) => {
              const applied = goal.amount_applied || 0;
              const target  = goal.target_amount || 0;
              const pct     = target > 0 ? Math.min(Math.round((applied / target) * 100), 100) : null;
              return (
                <Card key={goal.id} className="overflow-hidden hover:shadow-md transition-all duration-200">
                  <div className={cn(
                    "h-1.5",
                    pct == null ? "bg-muted" :
                    pct >= 100 ? "bg-emerald-500" :
                    pct >= 60  ? "bg-blue-500" :
                    pct >= 30  ? "bg-amber-500" : "bg-rose-500",
                  )} />
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-base sm:text-lg font-bold leading-tight flex-1 text-foreground">{goal.description}</p>
                      <span className={cn("text-3xl sm:text-4xl font-black tabular-nums leading-none tracking-tight", pct != null ? progressColor(pct) : "text-muted-foreground")}>
                        {pct != null ? `${pct}%` : "—"}
                      </span>
                    </div>
                    {target > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-bold tabular-nums text-foreground">{fmtBRL(applied)}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">de <span className="font-semibold text-foreground/80">{fmtBRL(target)}</span></span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", pct != null ? progressBarColor(pct) : "bg-muted-foreground/30")}
                            style={{ width: pct != null ? `${pct}%` : "0%" }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/40">
                      {goal.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(goal.deadline)}
                        </span>
                      )}
                      {goal.priority && (
                        <Badge variant="outline" className="text-xs capitalize font-bold">{goal.priority}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Conquistas (concluídos) ── */}
      {(summary.metasConcluidas > 0 || summary.goalsConcluidos > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-emerald-500 shrink-0" />
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Conquistas</h3>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>
          <Card className="border-emerald-300/50 bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-card dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-card overflow-hidden">
            <div className="h-1 bg-emerald-500" />
            <CardContent className="p-6 grid grid-cols-2 gap-6 text-center">
              <div className="space-y-1.5">
                <p className="text-5xl sm:text-6xl font-black tabular-nums text-emerald-700 dark:text-emerald-400 leading-none tracking-tight">{summary.metasConcluidas}</p>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">
                  meta{summary.metasConcluidas !== 1 ? "s" : ""} arquivada{summary.metasConcluidas !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-5xl sm:text-6xl font-black tabular-nums text-emerald-700 dark:text-emerald-400 leading-none tracking-tight">{summary.goalsConcluidos}</p>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">
                  objetivo{summary.goalsConcluidos !== 1 ? "s" : ""} concluído{summary.goalsConcluidos !== 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <JourneyFooterNav current="evolucao" />
    </div>
  );
};

export default AdminAcompanhamentoEvolucao;
