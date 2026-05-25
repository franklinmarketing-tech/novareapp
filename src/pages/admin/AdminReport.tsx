import { useEffect, useState, useRef } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip as RTooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Printer, TrendingUp, TrendingDown, Wallet, Shield, AlertTriangle,
  CheckCircle2, Target, Banknote, PiggyBank, Scale, ArrowRight,
  Calendar, CreditCard, BarChart3, Gem, Clock, ArrowUpRight,
  Download, Loader2, Gauge,
} from "lucide-react";
import { sendClientEmail } from "@/lib/sendClientEmail";
import { toast } from "sonner";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";

// ── Palette ──────────────────────────────────────────
const CHART_COLORS = [
  "hsl(215, 50%, 23%)", "hsl(16, 65%, 50%)", "hsl(152, 55%, 41%)",
  "hsl(38, 92%, 50%)", "hsl(260, 50%, 55%)", "hsl(190, 60%, 45%)",
  "hsl(340, 55%, 50%)", "hsl(0, 0%, 55%)",
];

// ── Classification ───────────────────────────────────
const classificationConfig: Record<string, {
  label: string; gradient: string; textColor: string;
  bgColor: string; borderColor: string; description: string; advice: string;
  glowColor: string;
}> = {
  A: { label: "Excelente", gradient: "from-emerald-500/15 to-emerald-500/5", textColor: "text-emerald-600", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", description: "Capacidade de poupança acima de 30%", advice: "Excelente saúde financeira. Foco em otimização e crescimento patrimonial.", glowColor: "hsl(142 65% 42% / 0.35)" },
  B: { label: "Bom", gradient: "from-blue-500/15 to-blue-500/5", textColor: "text-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20", description: "Capacidade de poupança entre 10% e 30%", advice: "Bom potencial. Trabalhar para aumentar poupança e diversificar.", glowColor: "hsl(215 65% 55% / 0.35)" },
  C: { label: "Neutro", gradient: "from-amber-500/15 to-amber-500/5", textColor: "text-amber-600", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20", description: "Capacidade de poupança entre 0% e 10%", advice: "Precisa reduzir despesas e criar margem de poupança.", glowColor: "hsl(38 95% 48% / 0.35)" },
  D: { label: "Atenção", gradient: "from-orange-500/15 to-orange-500/5", textColor: "text-orange-600", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20", description: "Déficit ou próximo de zero", advice: "Requer intervenção imediata em despesas e dívidas.", glowColor: "hsl(25 90% 50% / 0.35)" },
  E: { label: "Crítico", gradient: "from-red-500/15 to-red-500/5", textColor: "text-red-600", bgColor: "bg-red-500/10", borderColor: "border-red-500/20", description: "Endividamento elevado", advice: "Situação crítica. Priorizar renegociação e corte drástico.", glowColor: "hsl(0 72% 55% / 0.35)" },
};

const AREA_LABELS: Record<string, string> = {
  renda: "Renda", despesas: "Despesas", dividas: "Dívidas",
  investimentos: "Investimentos", protecao: "Proteção", impostos: "Impostos",
};
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  em_andamento: { label: "Em Andamento", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  concluido: { label: "Concluído", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
};

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ── Section header ───────────────────────────────────
const SectionHeader = ({ number, title, subtitle }: { number: number; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div
      className="flex items-center justify-center w-8 h-8 rounded-xl text-[11px] font-black shrink-0 text-white"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.72) 100%)",
        boxShadow: "0 2px 8px hsl(var(--primary) / 0.28)",
      }}
    >
      {String(number).padStart(2, "0")}
    </div>
    <div className="min-w-0">
      <h2 className="text-base font-bold text-foreground tracking-tight leading-tight">{title}</h2>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    <div className="hidden sm:block flex-1 h-px bg-border/50" />
  </div>
);

// ── Stat card ────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color = "bg-muted/60 text-muted-foreground", className = "" }: {
  label: string; value: string; icon: React.ElementType; color?: string; className?: string;
}) => (
  <div
    className={`rounded-2xl overflow-hidden ${className}`}
    style={{
      background: "hsl(var(--card))",
      border: "1.5px solid hsl(var(--foreground) / 0.08)",
      borderTopColor: "hsl(var(--foreground) / 0.13)",
      boxShadow: [
        "0 1px 0 hsl(0 0% 100% / 0.55) inset",
        "0 -1px 0 hsl(0 0% 0% / 0.03) inset",
        "0 2px 10px -3px hsl(0 0% 0% / 0.08)",
      ].join(", "),
    }}
  >
    <div className="p-5 text-center">
      <div className={`p-2.5 rounded-xl ${color} w-fit mx-auto mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5">{label}</p>
      <p className="text-xl font-black text-foreground tracking-tight tabular-nums">{value}</p>
    </div>
  </div>
);

// ── Domain types ─────────────────────────────────────
type ReportClient = {
  id: string;
  user_id: string;
  profession?: string | null;
  [k: string]: unknown;
};
type ReportDiagnosis = { risk_classification?: string | null; [k: string]: unknown };
type ReportIncome = {
  id: string;
  description: string;
  amount: number | null;
  frequency: string;
  is_primary?: boolean | null;
};
type ReportExpense = {
  id: string;
  category: string;
  amount: number | null;
  description?: string | null;
};
type ReportDebt = {
  id: string;
  type: string;
  creditor?: string | null;
  total_amount: number | null;
  monthly_payment: number | null;
  interest_rate?: number | null;
  remaining_months?: number | null;
};
type ReportAsset = {
  id: string;
  type: string;
  description?: string | null;
  estimated_value: number | null;
};
type ReportInsurance = {
  id: string;
  type: string;
  provider?: string | null;
  monthly_premium?: number | null;
  coverage_amount?: number | null;
};
type ReportGoal = {
  id: string;
  description: string;
  target_amount?: number | null;
  deadline?: string | null;
  priority?: string | null;
};
type ReportActionItem = {
  id: string;
  description: string;
  area: string;
  status: string;
  parent_id?: string | null;
  goal_id?: string | null;
  responsible?: string | null;
  deadline?: string | null;
  financial_impact?: number | null;
};
type ReportSnapshot = {
  snapshot_date: string;
  total_assets?: number | null;
  total_debts?: number | null;
  savings_rate?: number | null;
};
type GoalProgress = ReportGoal & { tasksDone: number; tasksTotal: number; pct: number };

type ParecerMeta = {
  id: string;
  source_table: string;
  source_id: string;
  source_label: string;
  meta_text?: string | null;
  meta_valor?: number | null;
  prazo?: string | null;
};

type AcompEntry = {
  id: string;
  meta_id: string | null;
  source_table?: string | null;
  source_id?: string | null;
  source_label?: string | null;
  valor_meta?: number | null;
  prazo?: string | null;
  valor_atual?: number | null;
  estado_atual?: string | null;
  progresso_pct?: number | null;
  snapshotted_at: string;
  is_closing_snapshot: boolean;
};

// V9: variantes do plano (geradas pela IA, cache em action_plans.ai_generated_plans)
type AIPlanVariant = {
  letter: "A" | "B" | "C";
  title: string;
  approach: string;
  horizon_months: number;
  monthly_impact: number;
  actions: Array<{
    area: string;
    description: string;
    objective: string;
    financial_impact: number;
    deadline_offset_days: number;
  }>;
};

// ── Main ─────────────────────────────────────────────
const AdminReport = () => {
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientData, setClientData] = useState<ReportClient | null>(null);
  const [diagnosis, setDiagnosis] = useState<ReportDiagnosis | null>(null);
  const [incomes, setIncomes] = useState<ReportIncome[]>([]);
  const [expenses, setExpenses] = useState<ReportExpense[]>([]);
  const [debts, setDebts] = useState<ReportDebt[]>([]);
  const [assets, setAssets] = useState<ReportAsset[]>([]);
  const [insurance, setInsurance] = useState<ReportInsurance[]>([]);
  const [goals, setGoals] = useState<ReportGoal[]>([]);
  const [actionItems, setActionItems] = useState<ReportActionItem[]>([]);
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [parecerMetas, setParecerMetas] = useState<ParecerMeta[]>([]);
  const [acompEntries, setAcompEntries] = useState<AcompEntry[]>([]);
  const [parecerNote, setParecerNote] = useState<{ title: string; content: string } | null>(null);
  // V9: plano aplicado e variantes geradas pela IA
  const [activePlan, setActivePlan] = useState<{
    objective: string | null;
    applied_variant: string | null;
    applied_at: string | null;
    goal_id: string | null;
    ai_generated_plans: AIPlanVariant[] | null;
  } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      setLoading(true);
      const [clientRes, diagRes, incRes, expRes, debRes, assRes, insRes, goalRes, planRes, snapRes, metaRes, acompRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        supabase.from("diagnosis").select("*").eq("client_id", clientId).maybeSingle(),
        supabase.from("income").select("*").eq("client_id", clientId),
        supabase.from("expenses").select("*").eq("client_id", clientId),
        supabase.from("debts").select("*").eq("client_id", clientId),
        supabase.from("assets").select("*").eq("client_id", clientId),
        supabase.from("insurance").select("*").eq("client_id", clientId),
        supabase.from("goals").select("*").eq("client_id", clientId),
        supabase
          .from("action_plans")
          .select("id, objective, applied_variant, applied_at, goal_id, ai_generated_plans, source_parecer_id")
          .eq("client_id", clientId)
          .maybeSingle(),
        supabase.from("monitoring_snapshots").select("*").eq("client_id", clientId).order("snapshot_date", { ascending: true }),
        supabase.from("parecer_metas").select("*").eq("client_id", clientId).order("created_at"),
        supabase.from("acompanhamento_entradas").select("*").eq("client_id", clientId).order("snapshotted_at", { ascending: false }),
      ]);

      if (clientRes.data) {
        setClientData(clientRes.data as ReportClient);
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", clientRes.data.user_id).maybeSingle();
        if (profile) {
          setClientName(profile.full_name);
          setClientEmail(profile.email);
        }
      }
      setDiagnosis((diagRes.data ?? null) as ReportDiagnosis | null);
      setIncomes((incRes.data ?? []) as ReportIncome[]);
      setExpenses((expRes.data ?? []) as ReportExpense[]);
      setDebts((debRes.data ?? []) as ReportDebt[]);
      setAssets((assRes.data ?? []) as ReportAsset[]);
      setInsurance((insRes.data ?? []) as ReportInsurance[]);
      setGoals((goalRes.data ?? []) as ReportGoal[]);
      setSnapshots((snapRes.data ?? []) as ReportSnapshot[]);
      setParecerMetas((metaRes.data ?? []) as ParecerMeta[]);
      setAcompEntries((acompRes.data ?? []) as AcompEntry[]);

      if (planRes.data) {
        const { data: items } = await supabase.from("action_items").select("*").eq("action_plan_id", planRes.data.id).order("created_at");
        setActionItems((items ?? []) as ReportActionItem[]);
        // V9: guarda info do plano aplicado e as 3 variantes geradas pela IA
        const rawVariants = (planRes.data as any).ai_generated_plans;
        setActivePlan({
          objective: (planRes.data as any).objective ?? null,
          applied_variant: (planRes.data as any).applied_variant ?? null,
          applied_at: (planRes.data as any).applied_at ?? null,
          goal_id: (planRes.data as any).goal_id ?? null,
          ai_generated_plans: Array.isArray(rawVariants) ? (rawVariants as AIPlanVariant[]) : null,
        });
      }
      const { data: notes } = await supabase
        .from("consultant_notes")
        .select("title, content")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (notes) setParecerNote(notes);
      setLoading(false);
    };
    load();
  }, [clientId]);

  if (loading) return (
    <div className="space-y-4 p-4">
      <SkeletonCard lines={2} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
      <SkeletonCard lines={4} />
    </div>
  );

  // ── Calculations ───────────────────────────────
  const totalIncome = incomes.reduce((s: number, i) => s + (i.frequency === "anual" ? (i.amount || 0) / 12 : (i.amount || 0)), 0);
  const totalExpenses = expenses.reduce((s: number, e) => s + (e.amount || 0), 0);
  const totalDebts = debts.reduce((s: number, d) => s + (d.total_amount || 0), 0);
  const monthlyDebtPayments = debts.reduce((s: number, d) => s + (d.monthly_payment || 0), 0);
  const totalAssets = assets.reduce((s: number, a) => s + (a.estimated_value || 0), 0);
  const netWorth = totalAssets - totalDebts;
  const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const debtRatio = totalIncome > 0 ? (monthlyDebtPayments / totalIncome) * 100 : 0;
  const risk = diagnosis?.risk_classification || (savingsRate >= 30 ? "A" : savingsRate >= 10 ? "B" : savingsRate >= 0 ? "C" : savingsRate >= -10 ? "D" : "E");
  const riskInfo = classificationConfig[risk] || classificationConfig.C;

  const catMap: Record<string, number> = {};
  expenses.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0); });
  const expensesByCategory = Object.entries(catMap).map(([category, amount]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    amount, percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
  })).sort((a, b) => b.amount - a.amount);

  // Parent tasks only for progress
  const parentItems = actionItems.filter((a) => !a.parent_id);
  const completedActions = parentItems.filter((a) => a.status === "concluido").length;
  const totalActions = parentItems.length;
  const planPct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
  const totalImpact = actionItems.reduce((s: number, a) => s + (a.financial_impact || 0), 0);

  // Per-goal progress
  const goalProgress = goals.map((g) => {
    const goalTasks = parentItems.filter((a) => a.goal_id === g.id);
    const done = goalTasks.filter((a) => a.status === "concluido").length;
    const total = goalTasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { ...g, tasksDone: done, tasksTotal: total, pct };
  });

  const priorityLabels: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
  const priorityColors: Record<string, string> = {
    alta: "bg-red-500/10 text-red-600 border-red-500/20",
    media: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    baixa: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };

  const chartData = snapshots.map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    patrimonio: (s.total_assets || 0) - (s.total_debts || 0),
    ativos: s.total_assets || 0,
    dividas: s.total_debts || 0,
    poupanca: s.savings_rate || 0,
  }));

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const { generateReportPdf } = await import("@/lib/generateReportPdf");
      await generateReportPdf({
        clientName,
        clientEmail,
        profession: clientData?.profession,
        risk,
        riskLabel: riskInfo.label,
        riskDescription: riskInfo.description,
        savingsRate,
        debtRatio,
        expenseRatio,
        totalIncome,
        totalExpenses,
        totalDebts,
        monthlyDebtPayments,
        totalAssets,
        netWorth,
        netCashFlow,
        incomes,
        expensesByCategory,
        debts,
        assets,
        insurance,
        goals: goalProgress,
        actionItems: parentItems.map((a) => ({
          title: a.description,
          status: a.status,
          financial_impact: a.financial_impact ?? undefined,
          deadline: a.deadline ?? undefined,
        })),
        totalImpact,
        completedActions,
        totalActions,
        planPct,
        snapshots,
        parecerMetas: parecerMetas.map((m) => {
          const entries = acompEntries.filter((e) => e.meta_id === m.id);
          const latest = entries[0];
          return {
            sourceLabel: m.source_label,
            sourceTable: m.source_table,
            metaValor: m.meta_valor ?? undefined,
            metaText: m.meta_text ?? undefined,
            prazo: m.prazo ?? undefined,
            latestValor: latest?.valor_atual ?? undefined,
            latestEstado: latest?.estado_atual ?? undefined,
            progressPct: latest?.progresso_pct ?? undefined,
          };
        }),
        monthlyClosings: (() => {
          const closingEntries = acompEntries.filter((e) => e.is_closing_snapshot);
          const byDate: Record<string, AcompEntry[]> = {};
          closingEntries.forEach((e) => {
            const date = e.snapshotted_at.slice(0, 10);
            if (!byDate[date]) byDate[date] = [];
            byDate[date].push(e);
          });
          return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, entries]) => {
              const snap = snapshots.find((s) => s.snapshot_date.slice(0, 10) === date);
              return {
                date,
                totalAssets: snap?.total_assets ?? undefined,
                totalDebts: snap?.total_debts ?? undefined,
                savingsRate: snap?.savings_rate ?? undefined,
                metas: entries.map((e) => {
                  const meta = parecerMetas.find((m) => m.id === e.meta_id);
                  return {
                    label: meta?.source_label ?? "—",
                    valor: e.valor_atual ?? undefined,
                    estado: e.estado_atual ?? undefined,
                    pct: e.progresso_pct ?? undefined,
                  };
                }),
              };
            });
        })(),
        // V9: plano aplicado + variantes geradas pela IA
        activePlan: activePlan
          ? {
              objective: activePlan.objective,
              appliedVariant: activePlan.applied_variant,
              appliedAt: activePlan.applied_at,
              variants: activePlan.ai_generated_plans || null,
            }
          : null,
      });
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      if (import.meta.env.DEV) console.error("PDF generation error:", err);
      toast.error("Erro ao gerar PDF", { description: "Tente novamente" });
    } finally {
      setGenerating(false);
    }
  };

  const sectionNumber = (() => { let n = 0; return () => ++n; })();

  return (
    <div className="max-w-4xl mx-auto print:max-w-none">
      {/* Screen-only header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8 print:hidden">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Relatório Final</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Documento consolidado para entrega ao cliente</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={handleDownloadPDF} disabled={generating} className="gap-2 flex-1 sm:flex-none">
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            {generating ? "Gerando..." : "Baixar PDF"}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2 flex-1 sm:flex-none">
            <Printer className="h-5 w-5" /> Imprimir
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-10 print:space-y-8">

        {/* ══════ COVER ══════ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground p-6 sm:p-10 print:p-8">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/[0.03] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/[0.02] translate-y-1/2 -translate-x-1/4" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary-foreground/50 mb-4">Método Novare</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-2">
              Relatório de<br />Consultoria Financeira
            </h1>
            <Separator className="bg-primary-foreground/10 my-5 max-w-[200px]" />
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-primary-foreground/70">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-primary-foreground/40 mb-0.5">Cliente</p>
                <p className="font-semibold text-primary-foreground">{clientName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-primary-foreground/40 mb-0.5">Data</p>
                <p className="font-semibold text-primary-foreground">
                  {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              {clientData?.profession && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-primary-foreground/40 mb-0.5">Profissão</p>
                  <p className="font-semibold text-primary-foreground">{clientData.profession}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════ 1. METODOLOGIA ══════ */}
        <section>
          <SectionHeader number={sectionNumber()} title="Método Novare" subtitle="Nossa abordagem em 5 etapas" />
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                O Método Novare é uma abordagem estruturada para organização, clareza e direção financeira, desenvolvida para oferecer resultados mensuráveis em cada etapa do processo.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { icon: BarChart3, title: "Mapear", desc: "Coleta estruturada" },
                  { icon: Target, title: "Diagnosticar", desc: "Análise completa" },
                  { icon: Gem, title: "Planejar", desc: "Plano personalizado" },
                  { icon: ArrowUpRight, title: "Implementar", desc: "Execução assistida" },
                  { icon: TrendingUp, title: "Acompanhar", desc: "Monitoramento contínuo" },
                ].map((s, i) => (
                  <div key={i} className="relative text-center p-4 rounded-xl bg-gradient-to-b from-muted/50 to-transparent border border-border/30">
                    <div className="w-9 h-9 rounded-xl bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center mx-auto mb-3">
                      {i + 1}
                    </div>
                    <p className="text-xs font-semibold text-foreground">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ══════ 2. CLASSIFICAÇÃO ══════ */}
        <section className="print:break-before-page">
          <SectionHeader number={sectionNumber()} title="Classificação de Risco" subtitle="Saúde financeira baseada na capacidade de poupança" />
          <div
            className={`rounded-2xl border overflow-hidden ${riskInfo.borderColor}`}
            style={{
              background: "hsl(var(--card))",
              boxShadow: "0 2px 12px -4px hsl(0 0% 0% / 0.08), 0 1px 3px hsl(0 0% 0% / 0.04)",
            }}
          >
            {/* Barra colorida topo */}
            <div className={`h-1 w-full bg-gradient-to-r ${riskInfo.gradient.replace("/15", "").replace("/5", "/60")}`} />

            <div className={`bg-gradient-to-br ${riskInfo.gradient} px-5 sm:px-6 py-5`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {/* Grade badge + descrição */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`flex flex-col items-center justify-center h-[72px] w-[72px] rounded-2xl shrink-0 border ${riskInfo.bgColor} ${riskInfo.borderColor}`}
                    style={{ boxShadow: `0 0 0 4px hsl(var(--background)), 0 4px 16px -4px ${riskInfo.glowColor}` }}
                  >
                    <span className={`text-[2rem] font-black leading-none ${riskInfo.textColor}`}>{risk}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${riskInfo.textColor}`}>{riskInfo.label}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9375rem] font-semibold text-foreground leading-snug">{riskInfo.description}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{riskInfo.advice}</p>
                  </div>
                </div>

                {/* Divider vertical (desktop) */}
                <div className="hidden sm:block self-stretch w-px bg-foreground/[0.08] shrink-0" />

                {/* Indicadores mini cards */}
                <div className="flex gap-3 shrink-0">
                  {([
                    { icon: PiggyBank, label: "Poupança",    value: fmtPct(savingsRate),  tone: riskInfo.textColor },
                    { icon: Scale,     label: "Compromet.",  value: fmtPct(debtRatio),    tone: debtRatio > 30 ? "text-red-500" : "text-foreground" },
                    { icon: Gauge,     label: "Desp./renda", value: fmtPct(expenseRatio), tone: expenseRatio > 80 ? "text-orange-500" : "text-foreground" },
                  ] as const).map(({ icon: Icon, label, value, tone }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl min-w-[80px]"
                      style={{
                        background: "hsl(var(--background) / 0.6)",
                        border: "1px solid hsl(var(--foreground) / 0.07)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${tone}`} />
                        <span className="text-[10px] text-muted-foreground font-medium leading-none">{label}</span>
                      </div>
                      <span className={`text-xl font-black tabular-nums leading-none ${tone}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escala de classificação */}
              <div className="grid grid-cols-5 gap-1.5 mt-5 pt-5 border-t border-foreground/[0.06]">
                {(["A", "B", "C", "D", "E"] as const).map((l) => (
                  <div
                    key={l}
                    className={`text-center py-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all border ${
                      l === risk
                        ? `${riskInfo.bgColor} ${riskInfo.textColor} ${riskInfo.borderColor}`
                        : "bg-muted/40 text-muted-foreground border-transparent"
                    }`}
                  >
                    <span className="hidden sm:inline">{l} — {classificationConfig[l].label}</span>
                    <span className="sm:hidden font-bold">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════ 3. BALANÇO ══════ */}
        <section>
          <SectionHeader number={sectionNumber()} title="Balanço Patrimonial" subtitle="Visão consolidada de ativos e passivos" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <StatCard label="Ativos Totais" value={fmt(totalAssets)} icon={Wallet} color="bg-blue-500/10 text-blue-600" />
            <StatCard label="Passivos Totais" value={fmt(totalDebts)} icon={AlertTriangle} color="bg-red-500/10 text-red-500" />
            <StatCard label="Patrimônio Líquido" value={fmt(netWorth)} icon={Scale} color={netWorth >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"} className={netWorth >= 0 ? "card-glow-success" : "card-glow-destructive"} />
          </div>
          {assets.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Composição dos Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {assets.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2 px-2 rounded-lg  text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="text-foreground capitalize">{a.type}</span>
                        {a.description && <span className="text-muted-foreground ml-2 text-xs">— {a.description}</span>}
                      </div>
                      <span className="font-semibold text-foreground tabular-nums">{fmt(a.estimated_value || 0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ══════ 4. FLUXO DE CAIXA ══════ */}
        <section className="print:break-before-page">
          <SectionHeader number={sectionNumber()} title="Fluxo de Caixa Mensal" subtitle="Receitas, despesas e saldo líquido" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Receitas */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10"><TrendingUp className="h-6 w-6 text-emerald-600" /></div>
                  <CardTitle className="text-sm">Receitas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {incomes.map((i) => (
                    <div key={i.id} className="flex items-center justify-between py-1.5 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-foreground truncate">{i.description}</span>
                        {i.is_primary && <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">Principal</Badge>}
                      </div>
                      <span className="font-semibold text-emerald-600 tabular-nums ml-3">{fmt(i.frequency === "anual" ? (i.amount || 0) / 12 : (i.amount || 0))}</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total Receitas</span>
                    <span className="text-emerald-600">{fmt(totalIncome)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Despesas */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-500/10"><TrendingDown className="h-6 w-6 text-red-500" /></div>
                  <CardTitle className="text-sm">Despesas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {expensesByCategory.map((e, i) => (
                    <div key={e.category} className="flex items-center justify-between py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-foreground">{e.category}</span>
                        <span className="text-[10px] text-muted-foreground">({e.percentage}%)</span>
                      </div>
                      <span className="font-semibold text-foreground tabular-nums">{fmt(e.amount)}</span>
                    </div>
                  ))}
                  {monthlyDebtPayments > 0 && (
                    <div className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-foreground">Parcelas de Dívidas</span>
                      <span className="font-semibold text-foreground tabular-nums">{fmt(monthlyDebtPayments)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total Saídas</span>
                    <span className="text-red-500">{fmt(totalExpenses + monthlyDebtPayments)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Saldo */}
          <Card className={netCashFlow >= 0 ? "card-glow-success" : "card-glow-destructive"}>
            <CardContent className="py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${netCashFlow >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <PiggyBank className={`h-6 w-6 ${netCashFlow >= 0 ? "text-emerald-600" : "text-red-500"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Saldo Líquido Mensal</p>
                  <p className="text-[11px] text-muted-foreground">Receitas − Despesas − Parcelas</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {netCashFlow >= 0 ? "+" : ""}{fmt(netCashFlow)}
              </span>
            </CardContent>
          </Card>

          {/* Pie chart */}
          {expensesByCategory.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Despesas</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="flex items-center justify-center">
                    <div className="h-52 w-full max-w-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={expensesByCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={85} innerRadius={50} strokeWidth={3} stroke="hsl(var(--card))">
                            {expensesByCategory.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                          </Pie>
                          <RTooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: "12px", padding: "8px 12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {expensesByCategory.map((cat, i) => (
                      <div key={cat.category} className={`flex items-center gap-3 py-1.5 px-2 rounded-lg ${i === 0 ? "bg-muted/30" : ""}`}>
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-foreground flex-1 truncate">{cat.category}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 font-normal">{cat.percentage}%</Badge>
                        <span className="text-xs font-semibold text-foreground tabular-nums w-[100px] text-right">{fmt(cat.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ══════ 5. DÍVIDAS ══════ */}
        {debts.length > 0 && (
          <section>
            <SectionHeader number={sectionNumber()} title="Mapa de Dívidas" subtitle={`${debts.length} dívida${debts.length !== 1 ? "s" : ""} ativa${debts.length !== 1 ? "s" : ""}`} />

            {/* Mobile: cards */}
            <div className="sm:hidden space-y-2">
              {debts.map((d) => (
                <div key={d.id} className="rounded-xl border border-border/50 bg-card p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground capitalize">{d.type}</p>
                      {d.creditor && <p className="text-xs text-muted-foreground">{d.creditor}</p>}
                    </div>
                    <p className="text-sm font-bold text-foreground tabular-nums">{fmt(d.total_amount || 0)}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Parcela: <span className="font-medium text-foreground">{fmt(d.monthly_payment || 0)}</span></span>
                    {d.interest_rate && <span className={d.interest_rate > 5 ? "text-red-500 font-semibold" : ""}>Juros: {d.interest_rate}% a.m.</span>}
                    {d.remaining_months && <span>Prazo: {d.remaining_months} meses</span>}
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold px-1 pt-1 border-t border-border">
                <span>Total</span>
                <span className="tabular-nums">{fmt(totalDebts)}</span>
              </div>
            </div>

            {/* Desktop: tabela */}
            <Card className="hidden sm:block">
              <CardContent className="py-4">
                <ScrollableTable>
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border">
                        {["Tipo", "Credor", "Saldo", "Parcela", "Juros", "Prazo"].map(h => (
                          <th key={h} className={`py-2.5 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium ${h === "Tipo" || h === "Credor" ? "text-left" : "text-right"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {debts.map((d) => (
                        <tr key={d.id} className="border-b border-border/30">
                          <td className="py-2.5 px-2 text-foreground capitalize">{d.type}</td>
                          <td className="py-2.5 px-2 text-muted-foreground">{d.creditor || "—"}</td>
                          <td className="py-2.5 px-2 text-right font-semibold text-foreground tabular-nums">{fmt(d.total_amount || 0)}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">{fmt(d.monthly_payment || 0)}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums">
                            {d.interest_rate ? <span className={d.interest_rate > 5 ? "text-red-500 font-semibold" : "text-muted-foreground"}>{d.interest_rate}% a.m.</span> : "—"}
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">{d.remaining_months ? `${d.remaining_months} meses` : "—"}</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-foreground">
                        <td colSpan={2} className="py-2.5 px-2">Total</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{fmt(totalDebts)}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{fmt(monthlyDebtPayments)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </ScrollableTable>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ══════ 6. SEGUROS ══════ */}
        {insurance.length > 0 && (
          <section>
            <SectionHeader number={sectionNumber()} title="Proteção e Seguros" subtitle="Cobertura de riscos e seguros ativos" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insurance.map((ins) => (
                <Card key={ins.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 shrink-0"><Shield className="h-6 w-6 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{ins.type}</p>
                        {ins.provider && <p className="text-[11px] text-muted-foreground">{ins.provider}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-muted-foreground">Prêmio: <span className="font-semibold text-foreground">{fmt(ins.monthly_premium || 0)}/mês</span></span>
                          <span className="text-muted-foreground">Cobertura: <span className="font-semibold text-foreground">{fmt(ins.coverage_amount || 0)}</span></span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ══════ 7. OBJETIVOS ══════ */}
        {goals.length > 0 && (
          <section className="print:break-before-page">
            <SectionHeader number={sectionNumber()} title="Objetivos Financeiros" subtitle={`${goals.length} objetivo${goals.length !== 1 ? "s" : ""} • Progresso geral: ${planPct}%`} />

            {/* Overall goal progress bar */}
            <Card className="mb-4">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">Progresso Geral dos Objetivos</span>
                  <span className="text-sm font-bold text-accent">{planPct}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${planPct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{completedActions} de {totalActions} ações concluídas</span>
                  <span>Impacto estimado: {fmt(totalImpact)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Per-goal cards */}
            <div className="space-y-3">
              {goalProgress.map((g) => {
                const prio = priorityLabels[g.priority] || g.priority || "Média";
                const prioColor = priorityColors[g.priority] || priorityColors.media;
                const goalItems = parentItems.filter((a) => a.goal_id === g.id);
                return (
                  <Card key={g.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="p-2.5 rounded-xl bg-accent/10 shrink-0">
                          <Target className="h-6 w-6 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{g.description}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${prioColor}`}>
                              {prio}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {g.target_amount && <span>Meta: <span className="font-semibold text-foreground">{fmt(g.target_amount)}</span></span>}
                            {g.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-6 w-6" />
                                {new Date(g.deadline).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-muted-foreground">{g.tasksDone} de {g.tasksTotal} ações</span>
                          <span className={`text-xs font-bold ${g.pct === 100 ? "text-emerald-600" : "text-foreground"}`}>{g.pct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${g.pct === 100 ? "bg-emerald-500" : "bg-accent"}`}
                            style={{ width: `${g.pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Task list for this goal */}
                      {goalItems.length > 0 && (
                        <div className="border-t border-border/50 pt-3 space-y-1.5">
                          {goalItems.map((a) => {
                            const st = STATUS_MAP[a.status] || STATUS_MAP.pendente;
                            return (
                              <div key={a.id} className="flex items-center gap-2 text-xs">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0 ${st.color}`}>
                                  {a.status === "concluido" && <CheckCircle2 className="h-2.5 w-2.5" />}
                                  {st.label}
                                </span>
                                <span className="text-foreground truncate">{a.description}</span>
                                {a.financial_impact > 0 && (
                                  <span className="text-emerald-600 font-semibold tabular-nums ml-auto shrink-0">+{fmt(a.financial_impact)}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {goalItems.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/60 italic">Nenhuma ação vinculada a este objetivo ainda.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ══════ 8. PLANO DE AÇÃO ══════ */}
        {actionItems.length > 0 && (
          <section className="print:break-before-page">
            <SectionHeader number={sectionNumber()} title="Plano de Ação" subtitle={`${totalActions} ações • ${completedActions} concluídas`} />

            {/* Progress summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total de Ações</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalActions}</p>
                </CardContent>
              </Card>
              <Card className="card-glow-success">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Concluídas</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{planPct}%</p>
                  <Progress value={planPct} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
              <Card className="card-glow-accent">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Impacto Estimado</p>
                  <p className="text-2xl font-bold text-accent mt-1">{fmt(totalImpact)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Mobile: action cards */}
            <div className="sm:hidden space-y-2">
              {actionItems.map((a) => {
                const st = STATUS_MAP[a.status] || STATUS_MAP.pendente;
                return (
                  <div key={a.id} className="rounded-xl border border-border/50 bg-card p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px] shrink-0">{AREA_LABELS[a.area] || a.area}</Badge>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap shrink-0 ${st.color}`}>
                        {a.status === "concluido" && <CheckCircle2 className="h-3 w-3" />}
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-snug">{a.description}</p>
                    {(a.responsible || a.deadline) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.responsible || "Novare"}
                        {a.deadline && <> · {new Date(a.deadline).toLocaleDateString("pt-BR")}</>}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: tabela */}
            <Card className="hidden sm:block">
              <CardContent className="py-4">
                <ScrollableTable>
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border">
                        {["Área", "Ação", "Responsável", "Prazo", "Status"].map(h => (
                          <th key={h} className="py-2.5 px-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {actionItems.map((a) => {
                        const st = STATUS_MAP[a.status] || STATUS_MAP.pendente;
                        return (
                          <tr key={a.id} className="border-b border-border/30">
                            <td className="py-2.5 px-2">
                              <Badge variant="outline" className="text-[10px]">{AREA_LABELS[a.area] || a.area}</Badge>
                            </td>
                            <td className="py-2.5 px-2 text-foreground max-w-[260px]">{a.description}</td>
                            <td className="py-2.5 px-2 text-muted-foreground">{a.responsible || "Novare"}</td>
                            <td className="py-2.5 px-2 text-muted-foreground tabular-nums whitespace-nowrap">{a.deadline ? new Date(a.deadline).toLocaleDateString("pt-BR") : "—"}</td>
                            <td className="py-2.5 px-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${st.color}`}>
                                {a.status === "concluido" && <CheckCircle2 className="h-3 w-3" />}
                                {st.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollableTable>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ══════ 9. PROJEÇÕES ══════ */}
        <section className="print:break-before-page">
          <SectionHeader number={sectionNumber()} title="Projeção de Ganhos" subtitle="Estimativa de impacto após implementação completa" />
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* Current */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-muted"><Clock className="h-6 w-6 text-muted-foreground" /></div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Situação Atual</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo mensal</span>
                      <span className={`font-semibold ${netCashFlow >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(netCashFlow)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Poupança em 12 meses</span>
                      <span className="font-semibold text-foreground">{fmt(Math.max(0, netCashFlow * 12))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patrimônio líquido</span>
                      <span className="font-semibold text-foreground">{fmt(netWorth)}</span>
                    </div>
                  </div>
                </div>
                {/* After */}
                <div className="p-6 bg-gradient-to-br from-accent/[0.03] to-transparent">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-accent/10"><ArrowRight className="h-6 w-6 text-accent" /></div>
                    <p className="text-xs font-semibold text-accent uppercase tracking-wider">Após Implementação</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ganho mensal estimado</span>
                      <span className="font-bold text-emerald-600">+ {fmt(totalImpact)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Novo saldo mensal</span>
                      <span className="font-bold text-emerald-600">{fmt(netCashFlow + totalImpact)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Poupança em 12 meses</span>
                      <span className="font-bold text-emerald-600">{fmt(Math.max(0, (netCashFlow + totalImpact) * 12))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ══════ 10. EVOLUÇÃO ══════ */}
        {chartData.length >= 2 && (
          <section>
            <SectionHeader number={sectionNumber()} title="Evolução Histórica" subtitle="Acompanhamento ao longo dos registros periódicos" />
            <Card>
              <CardContent className="py-5 px-2 sm:px-6">
                <ResponsiveContainer width="100%" height={220} className="sm:!h-[260px]">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rptGradAtivos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(215, 50%, 45%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(215, 50%, 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rptGradPat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 55%, 41%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(152, 55%, 41%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RTooltip formatter={(v: number, n: string) => [fmt(v), n]} contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: "12px", padding: "8px 12px", backgroundColor: "hsl(var(--card))" }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Area type="monotone" dataKey="ativos" name="Ativos" stroke="hsl(215, 50%, 45%)" fill="url(#rptGradAtivos)" strokeWidth={2} dot={{ r: 3, fill: "hsl(215, 50%, 45%)", strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="dividas" name="Dívidas" stroke="hsl(0, 72%, 51%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "hsl(0, 72%, 51%)", strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="patrimonio" name="Patrimônio Líquido" stroke="hsl(152, 55%, 41%)" fill="url(#rptGradPat)" strokeWidth={2.5} dot={{ r: 3.5, fill: "hsl(152, 55%, 41%)", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ══════ PARECER TÉCNICO ══════ */}
        {parecerNote && (
          <section>
            <SectionHeader number={sectionNumber()} title="Parecer Técnico" subtitle="Análise e recomendações do consultor" />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">{parecerNote.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-foreground [&_p]:mb-2 [&_ul]:pl-4 [&_li]:mb-1 [&_strong]:font-semibold text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: parecerNote.content }}
                />
              </CardContent>
            </Card>
          </section>
        )}

        {/* ══════ PLANO DE AÇÃO APLICADO + ALTERNATIVAS (V9) ══════ */}
        {(() => {
          const variants = activePlan?.ai_generated_plans || [];
          const appliedLetter = activePlan?.applied_variant || null;
          if (!appliedLetter || variants.length === 0) return null;

          const variantInfo: Record<"A" | "B" | "C", { label: string; cardCls: string; badgeCls: string; dotCls: string }> = {
            A: { label: "Cauteloso",   cardCls: "border-blue-400/40 bg-blue-500/5",       badgeCls: "bg-blue-500/10 text-blue-700 border-blue-400/30",       dotCls: "bg-blue-500" },
            B: { label: "Equilibrado", cardCls: "border-emerald-400/40 bg-emerald-500/5", badgeCls: "bg-emerald-500/10 text-emerald-700 border-emerald-400/30", dotCls: "bg-emerald-500" },
            C: { label: "Acelerado",   cardCls: "border-orange-400/40 bg-orange-500/5",   badgeCls: "bg-orange-500/10 text-orange-700 border-orange-400/30",     dotCls: "bg-orange-500" },
          };

          const applied = variants.find((v) => v.letter === appliedLetter);
          const alternatives = variants.filter((v) => v.letter !== appliedLetter);

          return (
            <section className="print:break-before-page">
              <SectionHeader
                number={sectionNumber()}
                title="Plano de Ação Aplicado"
                subtitle={
                  activePlan?.objective
                    ? `Objetivo entrelaçado: ${activePlan.objective}`
                    : "Estratégia escolhida pelo consultor"
                }
              />

              {/* Plano APLICADO em destaque */}
              {applied && (
                <Card className={`border-2 ${variantInfo[applied.letter].cardCls} rounded-2xl mb-4`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Badge className={`text-[11px] font-bold px-2.5 py-1 border ${variantInfo[applied.letter].badgeCls}`}>
                        Plano {applied.letter} · {variantInfo[applied.letter].label}
                      </Badge>
                      <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
                        <span>Horizonte: <span className="font-semibold text-foreground">{applied.horizon_months} {applied.horizon_months === 1 ? "mês" : "meses"}</span></span>
                        <span>Impacto/mês: <span className="font-semibold text-emerald-600">{fmt(applied.monthly_impact)}</span></span>
                      </div>
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground mt-2">
                      {applied.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {applied.approach}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-2">
                      Ações do plano ({applied.actions.length})
                    </p>
                    <ul className="space-y-1.5">
                      {applied.actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                          <span className={`shrink-0 mt-1 h-1.5 w-1.5 rounded-full ${variantInfo[applied.letter].dotCls}`} />
                          <div className="flex-1">
                            <p className="leading-snug">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1.5">
                                {AREA_LABELS[a.area] || a.area}
                              </span>
                              {a.description}
                            </p>
                            {a.objective && (
                              <p className="text-[10.5px] text-muted-foreground mt-0.5">→ {a.objective}</p>
                            )}
                          </div>
                          {a.financial_impact > 0 && (
                            <span className="text-emerald-600 text-[11px] font-semibold tabular-nums shrink-0">
                              {fmt(a.financial_impact)}/mês
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Alternativas consideradas */}
              {alternatives.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-2">
                    Alternativas consideradas
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {alternatives.map((plan) => (
                      <Card key={plan.letter} className={`border ${variantInfo[plan.letter].cardCls} rounded-xl`}>
                        <CardHeader className="pb-2">
                          <Badge className={`self-start text-[10px] font-bold px-2 py-0.5 border ${variantInfo[plan.letter].badgeCls}`}>
                            Plano {plan.letter} · {variantInfo[plan.letter].label}
                          </Badge>
                          <CardTitle className="text-xs font-bold text-foreground mt-1.5">
                            {plan.title}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {plan.approach}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                            <span>{plan.horizon_months} {plan.horizon_months === 1 ? "mês" : "meses"}</span>
                            <span>·</span>
                            <span>Impacto/mês: {fmt(plan.monthly_impact)}</span>
                            <span>·</span>
                            <span>{plan.actions.length} ações</span>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </section>
          );
        })()}

        {/* ══════ CRONOGRAMA ══════ */}
        <section>
          <SectionHeader number={sectionNumber()} title="Cronograma de Acompanhamento" subtitle="Fases previstas para implementação" />
          <Card>
            <CardContent className="py-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[18px] top-4 bottom-4 w-px bg-border" />
                <div className="space-y-6">
                  {[
                    { phase: "Mês 1–2", title: "Implementação das ações prioritárias", desc: "Ajustes de orçamento, renegociação de dívidas e organização de reservas", color: "bg-accent text-accent-foreground" },
                    { phase: "Mês 3–4", title: "Estruturação de investimentos", desc: "Direcionamento de poupança, adequação de portfólio e diversificação", color: "bg-primary text-primary-foreground" },
                    { phase: "Mês 5–6", title: "Consolidação e ajustes finos", desc: "Revisão dos resultados, ajustes tributários e educação financeira", color: "bg-emerald-600 text-white" },
                    { phase: "Contínuo", title: "Acompanhamento recorrente", desc: "Registros mensais, evolução de indicadores e realinhamento de metas", color: "bg-muted text-muted-foreground" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div className={`flex items-center justify-center w-9 h-9 rounded-full text-[10px] font-bold shrink-0 z-10 ${item.color}`}>
                        {i + 1}
                      </div>
                      <div className="pt-1.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-[10px] px-2">{item.phase}</Badge>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ══════ FOOTER ══════ */}
        <div className="text-center py-10 border-t border-border/50">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 mb-3">
            <Gem className="h-6 w-6 text-accent" />
            <span className="text-xs font-semibold text-foreground tracking-wider uppercase">Novare Consultoria Financeira</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Relatório gerado em {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">Este documento é confidencial e de uso exclusivo do cliente.</p>
        </div>
      </div>

      {/* V9: marcador de jornada concluida (etapa 6, final) */}
      <div className="mt-6 print:hidden">
        <JourneyFooterNav
          current="relatorio"
          message="Jornada de análise concluída — o cliente recebe o relatório final."
        />
      </div>
    </div>
  );
};

export default AdminReport;
