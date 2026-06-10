import { useEffect, useState, useRef } from "react";
import { useClientId, useSelectedMonth } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip as RTooltip, CartesianGrid, Legend, LineChart, Line,
  BarChart, Bar, LabelList,
} from "recharts";
import {
  Printer, TrendingUp, TrendingDown, Wallet, Shield, AlertTriangle,
  CheckCircle2, Target, Banknote, PiggyBank, Scale, ArrowRight,
  Calendar, CreditCard, BarChart3, Gem, Clock, ArrowUpRight,
  Download, Loader2, Gauge, Sparkles, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Layers, Activity,
  ShieldCheck, Lightbulb, Percent, Coins, Building2, Droplet, Hourglass,
} from "lucide-react";
import { sendClientEmail } from "@/lib/sendClientEmail";
import { toast } from "sonner";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  cpf?: string | null;
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
  amount_applied?: number | null;
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
type GoalProgress = ReportGoal & { tasksDone: number; tasksTotal: number; pct: number; appliedValue: number };

type ParecerMeta = {
  id: string;
  source_table: string;
  source_id: string;
  source_label: string;
  meta_text?: string | null;
  meta_valor?: number | null;
  prazo?: string | null;
  completed_at?: string | null;
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
// Helpers de mês
const monthStartISO = (year: number, month: number) => {
  const d = new Date(year, month - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const nextMonthStartISO = (year: number, month: number) => {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const monthLabel = (year: number, month: number) =>
  new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const AdminReport = () => {
  const { clientId } = useClientId();
  const { selectedMonth, setSelectedMonth } = useSelectedMonth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const now = new Date();
  // Sincroniza com mês escolhido no Onboarding (contexto compartilhado).
  // Quando o usuário muda mês/ano aqui, propaga para todas as outras abas.
  const initialMonth = selectedMonth
    ? Number(selectedMonth.split("-")[1])
    : now.getMonth() + 1;
  const initialYear = selectedMonth
    ? Number(selectedMonth.split("-")[0])
    : now.getFullYear();
  const [filterMonth, setFilterMonthState] = useState<number>(initialMonth);
  const [filterYear, setFilterYearState] = useState<number>(initialYear);

  // Sempre que selectedMonth mudar (vindo de outra aba), atualiza filtros locais
  useEffect(() => {
    if (!selectedMonth) return;
    const m = Number(selectedMonth.split("-")[1]);
    const y = Number(selectedMonth.split("-")[0]);
    setFilterMonthState(m);
    setFilterYearState(y);
  }, [selectedMonth]);

  // Wrappers que propagam para o contexto global ao mudar localmente
  const setFilterMonth = (m: number) => {
    setFilterMonthState(m);
    setSelectedMonth(`${filterYear}-${String(m).padStart(2, "0")}-01`);
  };
  const setFilterYear = (y: number) => {
    setFilterYearState(y);
    setSelectedMonth(`${y}-${String(filterMonth).padStart(2, "0")}-01`);
  };
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
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
  // Histórico de fechamentos mensais — usado para mostrar a evolução do cliente
  const [closings, setClosings] = useState<Array<{
    month_ref: string;
    total_income: number | null;
    total_expenses: number | null;
    total_debts: number | null;
    total_assets: number | null;
    net_worth: number | null;
    savings_rate: number | null;
    emergency_reserve_months: number | null;
    plan_completion_pct: number | null;
  }>>([]);
  const [parecerNote, setParecerNote] = useState<{ title: string; content: string } | null>(null);
  // V9: plano aplicado e variantes geradas pela IA
  const [activePlan, setActivePlan] = useState<{
    objective: string | null;
    applied_variant: string | null;
    applied_at: string | null;
    goal_id: string | null;
    ai_generated_plans: AIPlanVariant[] | null;
  } | null>(null);

  const periodLabel = monthLabel(filterYear, filterMonth);
  const monthStart = monthStartISO(filterYear, filterMonth);
  const monthEnd = nextMonthStartISO(filterYear, filterMonth);


  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      setLoading(true);
      // Filtro mensal: itens do mês selecionado OU itens legados (month_ref nulo)
      const monthFilter = `month_ref.is.null,month_ref.eq.${monthStart}`;
      const [clientRes, diagRes, incRes, expRes, debRes, assRes, insRes, goalRes, planRes, snapRes, metaRes, acompRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        supabase.from("diagnosis").select("*").eq("client_id", clientId).maybeSingle(),
        supabase.from("income").select("*").eq("client_id", clientId).or(monthFilter),
        supabase.from("expenses").select("*").eq("client_id", clientId).or(monthFilter),
        supabase.from("debts").select("*").eq("client_id", clientId),
        supabase.from("assets").select("*").eq("client_id", clientId),
        supabase.from("insurance").select("*").eq("client_id", clientId),
        supabase.from("goals").select("*").eq("client_id", clientId).or(monthFilter),
        supabase
          .from("action_plans")
          .select("id, objective, applied_variant, applied_at, goal_id, ai_generated_plans, source_parecer_id")
          .eq("client_id", clientId)
          .maybeSingle(),
        supabase.from("monitoring_snapshots").select("*").eq("client_id", clientId).order("snapshot_date", { ascending: true }),
        supabase.from("parecer_metas").select("*").eq("client_id", clientId).order("created_at"),
        // Histórico de lançamentos: busca TODOS do cliente (sem filtro de mês)
        // para que o relatório mostre a evolução consultiva completa, não só
        // o que aconteceu no mês selecionado.
        supabase
          .from("acompanhamento_entradas")
          .select("*")
          .eq("client_id", clientId)
          .order("snapshotted_at", { ascending: false }),
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

      // Histórico de fechamentos mensais (para a seção de evolução)
      const { data: closingsData } = await supabase
        .from("monthly_closings")
        .select("month_ref, total_income, total_expenses, total_debts, total_assets, net_worth, savings_rate, emergency_reserve_months, plan_completion_pct")
        .eq("client_id", clientId)
        .order("month_ref", { ascending: true });
      setClosings((closingsData ?? []) as any);

      if (planRes.data) {
        const { data: items } = await supabase
          .from("action_items")
          .select("*")
          .eq("action_plan_id", planRes.data.id)
          .or(monthFilter)
          .order("created_at");
        setActionItems((items ?? []) as ReportActionItem[]);
        const rawVariants = (planRes.data as any).ai_generated_plans;
        setActivePlan({
          objective: (planRes.data as any).objective ?? null,
          applied_variant: (planRes.data as any).applied_variant ?? null,
          applied_at: (planRes.data as any).applied_at ?? null,
          goal_id: (planRes.data as any).goal_id ?? null,
          ai_generated_plans: Array.isArray(rawVariants) ? (rawVariants as AIPlanVariant[]) : null,
        });
      } else {
        setActionItems([]);
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
  }, [clientId, monthStart, monthEnd]);

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
    const applied = Number(g.amount_applied || 0);
    const target = Number(g.target_amount || 0);
    // Preferir progresso financeiro (valor aplicado / meta) quando houver meta financeira.
    // Caso contrário, usar conclusão das tarefas.
    const pct = target > 0
      ? Math.min(Math.round((applied / target) * 100), 100)
      : total > 0
        ? Math.round((done / total) * 100)
        : 0;
    return { ...g, tasksDone: done, tasksTotal: total, pct, appliedValue: applied };
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

  // Gera o PDF de fato (usa o texto já validado pela IA)
  const buildAndDownloadPdf = async (aiComment: string) => {
    setGenerating(true);
    try {
      const { generateReportPdf } = await import("@/lib/generateReportPdf");
      await generateReportPdf({
        clientName,
        clientEmail,
        profession: clientData?.profession,
        cpf: clientData?.cpf ?? undefined,
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
          // Match cross-month: meta_id direto OU source_label (mesmo item em meses diferentes)
          const entries = acompEntries
            .filter((e) =>
              !e.is_closing_snapshot && (
                e.meta_id === m.id ||
                (e.source_table === m.source_table && e.source_label === m.source_label)
              )
            )
            .sort((a, b) => b.snapshotted_at.localeCompare(a.snapshotted_at));
          const latest = entries[0];
          // Histórico para a tabela do PDF (até 12 últimos lançamentos)
          const history = entries.slice(0, 12).map((e) => ({
            date: e.snapshotted_at.slice(0, 10),
            valor: e.valor_atual ?? null,
            pct: e.progresso_pct ?? null,
            estado: e.estado_atual ?? null,
          }));
          return {
            sourceLabel: m.source_label,
            sourceTable: m.source_table,
            metaValor: m.meta_valor ?? undefined,
            metaText: m.meta_text ?? undefined,
            prazo: m.prazo ?? undefined,
            latestValor: latest?.valor_atual ?? undefined,
            latestEstado: latest?.estado_atual ?? undefined,
            progressPct: latest?.progresso_pct ?? undefined,
            history,
            totalLancamentos: entries.length,
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
        activePlan: activePlan
          ? {
              objective: activePlan.objective,
              appliedVariant: activePlan.applied_variant,
              appliedAt: activePlan.applied_at,
              variants: activePlan.ai_generated_plans || null,
            }
          : null,
        goalsAnalysisComment: aiComment || undefined,
      });
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      if (import.meta.env.DEV) console.error("PDF generation error:", err);
      toast.error("Erro ao gerar PDF", { description: "Tente novamente" });
    } finally {
      setGenerating(false);
    }
  };

  // Etapa 1: ao clicar em "Baixar PDF" → chama IA OpenAI e abre o popup
  const handleDownloadPDF = async () => {
    setAiDialogOpen(true);
    setAiLoading(true);
    setAiDraft("");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-goals-comment", {
        body: { clientId, periodLabel, monthStart, monthEnd },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiDraft(data?.comment || "");
    } catch (err: any) {
      toast.error("Erro ao gerar análise", { description: err?.message || "Tente novamente" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleRegenerateAi = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-goals-comment", {
        body: { clientId, periodLabel, monthStart, monthEnd },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiDraft(data?.comment || "");
      toast.success("Análise regenerada");
    } catch (err: any) {
      toast.error("Erro ao regenerar", { description: err?.message || "Tente novamente" });
    } finally {
      setAiLoading(false);
    }
  };

  // Etapa 2: validar comentário e baixar PDF
  const handleValidateAndDownload = async () => {
    const comment = aiDraft.trim();
    setAiDialogOpen(false);
    await buildAndDownloadPdf(comment);
  };

  // Baixar sem análise IA
  const handleSkipAi = async () => {
    setAiDialogOpen(false);
    await buildAndDownloadPdf("");
  };


  const sectionNumber = (() => { let n = 0; return () => ++n; })();

  return (
    <div className="max-w-4xl mx-auto print:max-w-none">
      {/* Screen-only header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8 print:hidden">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Relatório Final</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Documento consolidado · Período: <span className="font-semibold capitalize">{periodLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filtro Mês */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            aria-label="Mês"
          >
            {MONTH_NAMES.map((n, i) => (
              <option key={i} value={i + 1}>{n}</option>
            ))}
          </select>
          {/* Filtro Ano */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            aria-label="Ano"
          >
            {Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button onClick={handleDownloadPDF} disabled={generating || aiLoading} className="gap-2 flex-1 sm:flex-none">
            {generating || aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            {generating ? "Gerando PDF..." : aiLoading ? "Analisando..." : "Baixar PDF"}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2 flex-1 sm:flex-none">
            <Printer className="h-5 w-5" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Dialog: Análise IA + Validação antes de baixar */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Análise de Metas e Objetivos
            </DialogTitle>
            <DialogDescription>
              A IA analisou o alcance das metas no período <span className="font-semibold capitalize">{periodLabel}</span>.
              Edite à vontade e valide para gerar o PDF com o comentário ao final.
            </DialogDescription>
          </DialogHeader>
          {aiLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Gerando análise...
            </div>
          ) : (
            <Textarea
              value={aiDraft}
              onChange={(e) => setAiDraft(e.target.value)}
              rows={12}
              className="resize-none text-sm"
              placeholder="O comentário aparecerá aqui..."
            />
          )}
          <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
            <Button variant="ghost" onClick={handleSkipAi} disabled={aiLoading} className="gap-2">
              Pular e baixar sem análise
            </Button>
            <Button variant="outline" onClick={handleRegenerateAi} disabled={aiLoading} className="gap-2">
              <Sparkles className="h-4 w-4" /> Regenerar
            </Button>
            <Button onClick={handleValidateAndDownload} disabled={aiLoading || !aiDraft.trim()} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Validar e baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <div ref={reportRef} className="space-y-10 print:space-y-8">

        {/* ══════ COVER ══════ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground p-6 sm:p-10 print:p-8">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/[0.03] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/[0.02] translate-y-1/2 -translate-x-1/4" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary-foreground/50 mb-4">Método Novare</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-2 text-primary-foreground">
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

          {/* Gauge de saúde financeira + Composição da renda */}
          {totalIncome > 0 && (() => {
            const riskGaugeMap: Record<string, { value: number; color: string }> = {
              A: { value: 95, color: "#16a34a" },
              B: { value: 75, color: "#2563eb" },
              C: { value: 55, color: "#d97706" },
              D: { value: 30, color: "#ea580c" },
              E: { value: 10, color: "#dc2626" },
            };
            const gauge = riskGaugeMap[risk] || riskGaugeMap.C;
            const savingsAbs = Math.max(0, totalIncome * (savingsRate / 100));
            const expensesTotal = totalExpenses + monthlyDebtPayments;
            const incomeBase = Math.max(totalIncome, expensesTotal + Math.max(savingsAbs, 0));
            const pctExp = incomeBase > 0 ? (expensesTotal / incomeBase) * 100 : 0;
            const pctSav = incomeBase > 0 ? (savingsAbs / incomeBase) * 100 : 0;
            const gaugeData = [
              { name: "score", value: gauge.value, fill: gauge.color },
              { name: "rest", value: 100 - gauge.value, fill: "hsl(var(--muted))" },
            ];
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Gauge */}
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">Saúde Financeira</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative h-[170px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={gaugeData}
                            startAngle={180}
                            endAngle={0}
                            cy="85%"
                            innerRadius="80%"
                            outerRadius="100%"
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                          >
                            {gaugeData.map((d, i) => (<Cell key={i} fill={d.fill} />))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                        <span className="text-4xl font-black tabular-nums" style={{ color: gauge.color }}>{risk}</span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-0.5">
                          {riskInfo.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-center text-muted-foreground mt-1 leading-snug">
                      {riskInfo.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Composição da Renda — stacked bar */}
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">Composição da Renda</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col h-[170px] justify-center gap-3">
                      <p className="text-[11px] text-muted-foreground">
                        Distribuição da renda mensal de <span className="font-semibold text-foreground">{fmt(totalIncome)}</span>
                      </p>
                      <div className="w-full h-7 rounded-lg overflow-hidden flex border border-border/50">
                        <div
                          className="h-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ width: `${pctExp}%`, background: "#dc2626" }}
                          title={`Despesas: ${fmtPct(pctExp)}`}
                        >
                          {pctExp > 12 && `${pctExp.toFixed(0)}%`}
                        </div>
                        <div
                          className="h-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ width: `${pctSav}%`, background: "#16a34a" }}
                          title={`Poupança: ${fmtPct(pctSav)}`}
                        >
                          {pctSav > 12 && `${pctSav.toFixed(0)}%`}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/15">
                          <div className="w-2.5 h-2.5 rounded-sm bg-red-600 mt-1 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Despesas</p>
                            <p className="text-sm font-bold text-foreground tabular-nums truncate">{fmt(expensesTotal)}</p>
                            <p className="text-[10px] text-muted-foreground">{fmtPct(pctExp)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600 mt-1 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Poupança</p>
                            <p className="text-sm font-bold text-foreground tabular-nums truncate">{fmt(savingsAbs)}</p>
                            <p className="text-[10px] text-muted-foreground">{fmtPct(pctSav)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* ── Critérios da avaliação ──────────────────────────── */}
          {totalIncome > 0 && (() => {
            type Criterion = {
              icon: React.ElementType;
              label: string;
              hint: string;
              value: number;
              displayValue: string;
              target: number;
              direction: "higher" | "lower";
              ranges: { good: number; warn: number };
            };
            const criteria: Criterion[] = [
              {
                icon: PiggyBank,
                label: "Taxa de poupança",
                hint: "Quanto da renda sobra para investir e construir patrimônio.",
                value: savingsRate,
                displayValue: fmtPct(savingsRate),
                target: 20,
                direction: "higher",
                ranges: { good: 20, warn: 10 },
              },
              {
                icon: Scale,
                label: "Comprometimento com dívidas",
                hint: "Parcelas de dívidas sobre a renda mensal — ideal abaixo de 30%.",
                value: debtRatio,
                displayValue: fmtPct(debtRatio),
                target: 30,
                direction: "lower",
                ranges: { good: 30, warn: 50 },
              },
              {
                icon: Gauge,
                label: "Despesas sobre renda",
                hint: "Custo de vida total sobre a renda — quanto menor, mais folga.",
                value: expenseRatio,
                displayValue: fmtPct(expenseRatio),
                target: 70,
                direction: "lower",
                ranges: { good: 70, warn: 90 },
              },
            ];

            const statusOf = (c: Criterion) => {
              if (c.direction === "higher") {
                if (c.value >= c.ranges.good) return { label: "Saudável", tone: "emerald" as const };
                if (c.value >= c.ranges.warn) return { label: "Atenção", tone: "amber" as const };
                return { label: "Crítico", tone: "red" as const };
              }
              if (c.value <= c.ranges.good) return { label: "Saudável", tone: "emerald" as const };
              if (c.value <= c.ranges.warn) return { label: "Atenção", tone: "amber" as const };
              return { label: "Crítico", tone: "red" as const };
            };
            const toneCfg: Record<"emerald" | "amber" | "red", { bar: string; chip: string; text: string }> = {
              emerald: { bar: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25", text: "text-emerald-600" },
              amber:   { bar: "bg-amber-500",   chip: "bg-amber-500/10 text-amber-700 border-amber-500/25",     text: "text-amber-600" },
              red:     { bar: "bg-red-500",     chip: "bg-red-500/10 text-red-700 border-red-500/25",           text: "text-red-600" },
            };

            return (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10"><ShieldCheck className="h-4 w-4 text-primary" /></div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm">Critérios da avaliação</CardTitle>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Os três pilares que geram a nota <span className="font-semibold text-foreground">{risk}</span> — cada um comparado ao benchmark de mercado.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {criteria.map((c) => {
                    const st = statusOf(c);
                    const tone = toneCfg[st.tone];
                    const pct = c.direction === "higher"
                      ? Math.min(100, (c.value / Math.max(c.ranges.good, 1)) * 100)
                      : Math.max(0, 100 - Math.min(100, (c.value / Math.max(c.ranges.warn, 1)) * 100));
                    const targetLabel = c.direction === "higher"
                      ? `meta ≥ ${c.target}%`
                      : `teto ≤ ${c.target}%`;
                    return (
                      <div key={c.label} className="rounded-xl border border-border/60 bg-card p-3.5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-md ${tone.chip} border shrink-0`}>
                              <c.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-foreground leading-tight">{c.label}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{c.hint}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-base font-black tabular-nums leading-none ${tone.text}`}>{c.displayValue}</p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{targetLabel}</p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${tone.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${tone.chip}`}>
                            {st.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {c.direction === "higher" ? "Quanto maior, melhor" : "Quanto menor, melhor"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })()}

          {/* ── Recomendações estratégicas para a classificação atual ── */}
          {(() => {
            const recommendationsMap: Record<string, { tone: string; items: { title: string; desc: string }[] }> = {
              A: {
                tone: "emerald",
                items: [
                  { title: "Diversificar carteira de investimentos", desc: "Distribuir capital entre renda fixa, variável e ativos internacionais conforme o perfil de risco." },
                  { title: "Estruturar previdência privada", desc: "PGBL/VGBL para otimização tributária e construção de renda futura." },
                  { title: "Planejamento sucessório", desc: "Holding patrimonial, testamento e seguros de vida com cobertura adequada." },
                  { title: "Metas de longo prazo", desc: "Aposentadoria, independência financeira e projetos de impacto familiar." },
                ],
              },
              B: {
                tone: "blue",
                items: [
                  { title: "Elevar taxa de poupança para 25%+", desc: "Identificar despesas evitáveis e direcionar para investimentos automáticos." },
                  { title: "Consolidar reserva de emergência", desc: "Atingir 6 meses de despesas em ativos de alta liquidez (CDB, Tesouro Selic)." },
                  { title: "Diversificar começando aos poucos", desc: "Incluir renda variável de forma gradual conforme tolerância." },
                  { title: "Revisar seguros essenciais", desc: "Vida, saúde e residencial proporcionais ao patrimônio." },
                ],
              },
              C: {
                tone: "amber",
                items: [
                  { title: "Mapear e cortar 10–15% das despesas", desc: "Categorizar gastos, eliminar duplicidades de assinaturas e renegociar contratos recorrentes." },
                  { title: "Criar reserva mínima de 3 meses", desc: "Antes de investir em produtos de maior risco, garantir colchão financeiro." },
                  { title: "Renegociar dívidas com juros altos", desc: "Trocar cartão e cheque especial por crédito consignado ou portabilidade." },
                  { title: "Definir orçamento mensal escrito", desc: "Método 50/30/20 ou envelopes — controle ativo das saídas." },
                ],
              },
              D: {
                tone: "orange",
                items: [
                  { title: "Estancar o déficit imediatamente", desc: "Listar todas as despesas e cortar agora as não essenciais — meta de equilíbrio em 60 dias." },
                  { title: "Consolidar dívidas em uma única operação", desc: "Trocar várias dívidas caras por uma com juros menores (consignado, garantia)." },
                  { title: "Buscar renda extra recorrente", desc: "Trabalho complementar, monetização de habilidades ou aluguel de ativos parados." },
                  { title: "Acompanhamento quinzenal", desc: "Revisões frequentes com o consultor até estabilizar fluxo de caixa." },
                ],
              },
              E: {
                tone: "red",
                items: [
                  { title: "Plano de emergência financeira", desc: "Levantamento completo de dívidas e renegociação prioritária com credores." },
                  { title: "Corte drástico de despesas", desc: "Reduzir custo de vida em 25–40% nos próximos 90 dias — todas as despesas variáveis na mira." },
                  { title: "Evitar novas dívidas", desc: "Cancelar cartões e linhas de crédito ativas até reequilibrar." },
                  { title: "Apoio profissional contínuo", desc: "Acompanhamento semanal com consultor financeiro até sair da zona crítica." },
                ],
              },
            };
            const rec = recommendationsMap[risk] || recommendationsMap.C;
            const toneStyles: Record<string, { ring: string; bg: string; icon: string; dot: string }> = {
              emerald: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/5", icon: "text-emerald-600", dot: "bg-emerald-500" },
              blue:    { ring: "ring-blue-500/20",    bg: "bg-blue-500/5",    icon: "text-blue-600",    dot: "bg-blue-500" },
              amber:   { ring: "ring-amber-500/20",   bg: "bg-amber-500/5",   icon: "text-amber-600",   dot: "bg-amber-500" },
              orange:  { ring: "ring-orange-500/20",  bg: "bg-orange-500/5",  icon: "text-orange-600",  dot: "bg-orange-500" },
              red:     { ring: "ring-red-500/20",     bg: "bg-red-500/5",     icon: "text-red-600",     dot: "bg-red-500" },
            };
            const ts = toneStyles[rec.tone];
            return (
              <Card className={`mt-4 ring-1 ${ts.ring}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${ts.bg}`}><Lightbulb className={`h-4 w-4 ${ts.icon}`} /></div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm">Recomendações para a classificação {risk}</CardTitle>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{riskInfo.advice}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {rec.items.map((it, idx) => (
                      <div key={idx} className={`rounded-xl border border-border/50 ${ts.bg} p-3 flex gap-2.5`}>
                        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${ts.dot} shrink-0`} />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-foreground leading-tight">{it.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{it.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </section>


        {/* ══════ 3. BALANÇO ══════ */}
        <section>
          <SectionHeader number={sectionNumber()} title="Balanço Patrimonial" subtitle="Visão consolidada de ativos e passivos" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <StatCard label="Ativos Totais" value={fmt(totalAssets)} icon={Wallet} color="bg-blue-500/10 text-blue-600" />
            <StatCard label="Passivos Totais" value={fmt(totalDebts)} icon={AlertTriangle} color="bg-red-500/10 text-red-500" />
            <StatCard label="Patrimônio Líquido" value={fmt(netWorth)} icon={Scale} color={netWorth >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"} className={netWorth >= 0 ? "card-glow-success" : "card-glow-destructive"} />
          </div>

          {/* ── Indicadores Patrimoniais ─────────────────────── */}
          {(() => {
            const monthlyOutflow = totalExpenses + monthlyDebtPayments;
            const annualIncome = totalIncome * 12;

            // Classificação heurística dos ativos
            const liquidRegex = /poupanc|conta|cdb|tesouro|cdi|caixa|aplicac|renda fixa|fundo|liquid/i;
            const investRegex = /investiment|acao|ação|bolsa|fii|etf|cripto|previd/i;
            const realEstateRegex = /imove|imóvel|casa|apartamento|terreno|sala/i;
            const vehicleRegex = /carro|moto|veicul|veículo|caminh/i;

            let liquidValue = 0, investValue = 0, realEstateValue = 0, vehicleValue = 0, otherValue = 0;
            assets.forEach((a) => {
              const v = a.estimated_value || 0;
              const key = `${a.type || ""} ${a.description || ""}`;
              if (liquidRegex.test(key)) liquidValue += v;
              else if (investRegex.test(key)) investValue += v;
              else if (realEstateRegex.test(key)) realEstateValue += v;
              else if (vehicleRegex.test(key)) vehicleValue += v;
              else otherValue += v;
            });

            const liquidityMonths = monthlyOutflow > 0 ? liquidValue / monthlyOutflow : 0;
            const leverage = totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 0;
            const pwYears = annualIncome > 0 ? netWorth / annualIncome : 0;
            const liquidPct = totalAssets > 0 ? ((liquidValue + investValue) / totalAssets) * 100 : 0;

            type IndCard = { icon: React.ElementType; label: string; value: string; hint: string; tone: "emerald" | "blue" | "amber" | "red" };
            const indicators: IndCard[] = [
              {
                icon: Hourglass,
                label: "Reserva de emergência",
                value: liquidValue > 0 && monthlyOutflow > 0 ? `${liquidityMonths.toFixed(1)}m` : "—",
                hint: liquidityMonths >= 6
                  ? "Cobertura saudável (≥ 6 meses)"
                  : liquidityMonths >= 3
                  ? "Construir até 6 meses"
                  : "Insuficiente — meta mínima 3 meses",
                tone: liquidityMonths >= 6 ? "emerald" : liquidityMonths >= 3 ? "amber" : "red",
              },
              {
                icon: Scale,
                label: "Alavancagem",
                value: totalAssets > 0 ? fmtPct(leverage) : "—",
                hint: leverage <= 30
                  ? "Endividamento saudável"
                  : leverage <= 50
                  ? "Atenção — meta abaixo de 30%"
                  : "Elevado — priorizar quitação",
                tone: leverage <= 30 ? "emerald" : leverage <= 50 ? "amber" : "red",
              },
              {
                icon: Clock,
                label: "Patrimônio × Renda anual",
                value: annualIncome > 0 ? `${pwYears.toFixed(1)}x` : "—",
                hint: pwYears >= 3
                  ? "Trajetória sólida de acumulação"
                  : pwYears >= 1
                  ? "Em construção — manter aporte"
                  : "Acelerar acumulação patrimonial",
                tone: pwYears >= 3 ? "emerald" : pwYears >= 1 ? "blue" : "amber",
              },
              {
                icon: Droplet,
                label: "Liquidez do patrimônio",
                value: totalAssets > 0 ? fmtPct(liquidPct) : "—",
                hint: liquidPct >= 30
                  ? "Boa proporção líquida/investida"
                  : liquidPct >= 15
                  ? "Aumentar parcela investida"
                  : "Patrimônio muito imobilizado",
                tone: liquidPct >= 30 ? "emerald" : liquidPct >= 15 ? "amber" : "red",
              },
            ];
            const toneMap: Record<string, { bg: string; text: string; border: string }> = {
              emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/25" },
              blue:    { bg: "bg-blue-500/10",    text: "text-blue-600",    border: "border-blue-500/25" },
              amber:   { bg: "bg-amber-500/10",   text: "text-amber-700",   border: "border-amber-500/25" },
              red:     { bg: "bg-red-500/10",     text: "text-red-600",     border: "border-red-500/25" },
            };

            // Composição por categoria do patrimônio
            const composition = [
              { label: "Líquido", value: liquidValue, color: "#2563eb", icon: Droplet },
              { label: "Investido", value: investValue, color: "#16a34a", icon: TrendingUp },
              { label: "Imóveis", value: realEstateValue, color: "#7c3aed", icon: Building2 },
              { label: "Veículos", value: vehicleValue, color: "#ea580c", icon: Activity },
              { label: "Outros", value: otherValue, color: "#64748b", icon: Layers },
            ].filter((c) => c.value > 0);

            return (
              <>
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10"><Gauge className="h-4 w-4 text-primary" /></div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm">Indicadores patrimoniais</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Métricas-chave que mostram a saúde estrutural do patrimônio — solvência, liquidez e ritmo de acumulação.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {indicators.map((it) => {
                        const tm = toneMap[it.tone];
                        return (
                          <div key={it.label} className={`rounded-xl border ${tm.border} ${tm.bg} p-3.5`}>
                            <div className="flex items-center gap-2 mb-2">
                              <it.icon className={`h-4 w-4 ${tm.text}`} />
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{it.label}</p>
                            </div>
                            <p className={`text-2xl font-black tabular-nums leading-none ${tm.text}`}>{it.value}</p>
                            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{it.hint}</p>
                          </div>
                        );
                      })}
                    </div>

                    {composition.length > 0 && totalAssets > 0 && (
                      <div className="mt-5 pt-4 border-t border-border/50">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                          Qualidade do patrimônio
                        </p>
                        <div className="w-full h-3 rounded-full overflow-hidden flex border border-border/40">
                          {composition.map((c) => (
                            <div
                              key={c.label}
                              style={{ width: `${(c.value / totalAssets) * 100}%`, background: c.color }}
                              title={`${c.label}: ${fmt(c.value)}`}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3">
                          {composition.map((c) => (
                            <div key={c.label} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">{c.label}</p>
                                <p className="text-[11.5px] font-semibold text-foreground tabular-nums truncate">
                                  {((c.value / totalAssets) * 100).toFixed(0)}% · {fmt(c.value)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}

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

                {/* Gráfico de barras horizontais — top 8 ativos */}
                {(() => {
                  const assetBars = assets
                    .filter((a) => (a.estimated_value || 0) > 0)
                    .sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0))
                    .slice(0, 8)
                    .map((a, i) => ({
                      name: a.description || a.type || "Ativo",
                      value: a.estimated_value || 0,
                      fill: CHART_COLORS[i % CHART_COLORS.length],
                    }));
                  if (assetBars.length < 2) return null;
                  return (
                    <div className="mt-4 pt-4 border-t border-border/40">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                        Distribuição visual
                      </p>
                      <div style={{ height: Math.max(assetBars.length * 32 + 30, 140) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={assetBars}
                            layout="vertical"
                            margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
                            barCategoryGap={6}
                          >
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                            <XAxis
                              type="number"
                              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={110}
                              tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <RTooltip
                              formatter={(v: number) => fmt(v)}
                              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "6px 10px", backgroundColor: "hsl(var(--card))" }}
                            />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {assetBars.map((d, i) => (<Cell key={i} fill={d.fill} />))}
                              <LabelList
                                dataKey="value"
                                position="right"
                                formatter={(v: number) => fmt(v)}
                                style={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}
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

          {/* Comparativo Receitas | Despesas | Saldo */}
          {totalIncome > 0 && (() => {
            const flowBars = [
              { name: "Receitas", value: totalIncome, fill: "#16a34a" },
              { name: "Despesas", value: totalExpenses + monthlyDebtPayments, fill: "#dc2626" },
              { name: "Saldo", value: Math.max(netCashFlow, 0), fill: netCashFlow >= 0 ? "#2563eb" : "#d97706" },
            ];
            return (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Receitas × Despesas × Saldo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[210px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={flowBars} margin={{ top: 20, right: 12, left: 8, bottom: 4 }} barCategoryGap="22%">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RTooltip
                          formatter={(v: number) => fmt(v)}
                          contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "6px 10px", backgroundColor: "hsl(var(--card))" }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {flowBars.map((d, i) => (<Cell key={i} fill={d.fill} />))}
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(v: number) => fmt(v)}
                            style={{ fontSize: 11, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {netCashFlow < 0 && (
                    <p className="text-[11px] text-rose-600 mt-2 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Despesas superam as receitas em {fmt(Math.abs(netCashFlow))}.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })()}

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
                          <span className="text-[11px] text-muted-foreground">
                            {g.target_amount && g.target_amount > 0
                              ? <>{fmt(g.appliedValue)} de {fmt(g.target_amount)}</>
                              : <>{g.tasksDone} de {g.tasksTotal} ações</>}
                          </span>
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

            {/* Top 6 ações por impacto financeiro */}
            {(() => {
              const topActions = actionItems
                .filter((a) => (a.financial_impact || 0) > 0)
                .sort((a, b) => (b.financial_impact || 0) - (a.financial_impact || 0))
                .slice(0, 6)
                .map((a, i) => ({
                  name: a.description.length > 38 ? a.description.slice(0, 36) + "…" : a.description,
                  value: a.financial_impact || 0,
                  fill: CHART_COLORS[i % CHART_COLORS.length],
                }));
              if (topActions.length < 2) return null;
              return (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top ações por impacto financeiro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ height: Math.max(topActions.length * 34 + 30, 160) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topActions}
                          layout="vertical"
                          margin={{ top: 4, right: 70, left: 8, bottom: 4 }}
                          barCategoryGap={8}
                        >
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                          <XAxis
                            type="number"
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={150}
                            tick={{ fontSize: 10.5, fill: "hsl(var(--foreground))" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <RTooltip
                            formatter={(v: number) => fmt(v)}
                            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "6px 10px", backgroundColor: "hsl(var(--card))" }}
                          />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {topActions.map((d, i) => (<Cell key={i} fill={d.fill} />))}
                            <LabelList
                              dataKey="value"
                              position="right"
                              formatter={(v: number) => fmt(v)}
                              style={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
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

        {/* ══════ ACOMPANHAMENTO ══════ */}
        {acompEntries.length > 0 && (() => {
          // Agrupa por (source_table:source_label) — chave preservada após clones mensais
          const groups: Record<string, { label: string; sourceTable: string; meta?: ParecerMeta; entries: AcompEntry[] }> = {};
          acompEntries.forEach((e) => {
            const label = e.source_label || "Item acompanhado";
            const sourceTable = e.source_table || "";
            const key = `${sourceTable}:${label}`;
            // Procura a meta vigente para este item (pelo label, pega a mais recente)
            const meta = parecerMetas.find((m) => m.source_table === sourceTable && m.source_label === label && !m.completed_at)
              || parecerMetas.find((m) => m.id === e.meta_id);
            if (!groups[key]) groups[key] = { label, sourceTable, meta, entries: [] };
            else if (!groups[key].meta && meta) groups[key].meta = meta;
            groups[key].entries.push(e);
          });
          const grouped = Object.values(groups).map((g) => ({
            ...g,
            entries: [...g.entries].sort((a, b) => b.snapshotted_at.localeCompare(a.snapshotted_at)),
          }));
          const totalRegistros = acompEntries.length;
          return (
            <section className="print:break-before-page">
              <SectionHeader
                number={sectionNumber()}
                title="Lançamento do mês"
                subtitle={`${grouped.length} item${grouped.length !== 1 ? "ns" : ""} acompanhado${grouped.length !== 1 ? "s" : ""} • ${totalRegistros} registro${totalRegistros !== 1 ? "s" : ""}`}
              />
              <div className="space-y-3">
                {grouped.map((g, idx) => {
                  const latest = g.entries[0];
                  const target = g.meta?.meta_valor ?? latest?.valor_meta ?? null;
                  const pct = latest?.progresso_pct ?? null;
                  return (
                    <Card key={idx}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{g.label}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                              {target != null && <span>Alvo: <span className="font-semibold text-foreground">{fmt(target)}</span></span>}
                              {latest?.valor_atual != null && <span>Atual: <span className="font-semibold text-foreground">{fmt(latest.valor_atual)}</span></span>}
                              {g.meta?.prazo && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(g.meta.prazo).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                              <span>Última atualização: {new Date(latest.snapshotted_at).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>
                          {pct != null && (
                            <span className={`text-xs font-bold tabular-nums ${pct >= 100 ? "text-emerald-600" : "text-accent"}`}>{Math.round(pct)}%</span>
                          )}
                        </div>
                        {pct != null && (
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-accent"}`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        )}
                        {latest?.estado_atual && (
                          <p className="text-xs text-foreground/80 italic mb-2">"{latest.estado_atual}"</p>
                        )}

                        {/* ── Histórico de evolução com sparkline + tabela ── */}
                        {g.entries.length > 1 && (() => {
                          // Ordenar cronologicamente (mais antigo primeiro) para o gráfico
                          const sortedAsc = [...g.entries].sort((a, b) => a.snapshotted_at.localeCompare(b.snapshotted_at));
                          const sparkData = sortedAsc.slice(-12).map((e) => ({
                            date: new Date(e.snapshotted_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
                            valor: Number(e.valor_atual ?? 0),
                            pct: Number(e.progresso_pct ?? 0),
                          }));
                          const isReducing = g.sourceTable === "expenses" || g.sourceTable === "debts" || g.sourceTable === "insurance";
                          const lineColor = isReducing ? "hsl(38 95% 48%)" : "hsl(142 65% 42%)";
                          const firstValor = sortedAsc[0]?.valor_atual ?? null;
                          const lastValor = latest?.valor_atual ?? null;
                          const delta = firstValor != null && lastValor != null ? Number(lastValor) - Number(firstValor) : null;
                          const verbo = isReducing ? "Reduziu" : "Cresceu";

                          return (
                            <div className="border-t border-border/50 pt-3 mt-2 space-y-2">
                              {/* Resumo da evolução */}
                              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Evolução</span>
                                  <span className="font-bold">
                                    {g.entries.length} lançamento{g.entries.length !== 1 ? "s" : ""}
                                  </span>
                                  {delta != null && delta !== 0 && (
                                    <span className={`font-bold tabular-nums ${(isReducing && delta > 0) || (!isReducing && delta < 0) ? "text-rose-600" : "text-emerald-600"}`}>
                                      ({verbo.toLowerCase()} {fmt(Math.abs(delta))})
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  {new Date(sortedAsc[0].snapshotted_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })} → {new Date(latest.snapshotted_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                                </span>
                              </div>

                              {/* Sparkline — gráfico de linha da evolução */}
                              {sparkData.length > 1 && (
                                <div className="h-[80px] -mx-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.25)" vertical={false} />
                                      <XAxis dataKey="date" hide />
                                      <YAxis hide domain={["auto", "auto"]} />
                                      <RTooltip
                                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11, padding: "4px 8px" }}
                                        formatter={(v: number) => fmt(v)}
                                      />
                                      <Line type="monotone" dataKey="valor" stroke={lineColor} strokeWidth={2.5} dot={{ r: 2.5, fill: lineColor }} activeDot={{ r: 4 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              )}

                              {/* Tabela compacta de lançamentos */}
                              <div className="space-y-0.5">
                                {sortedAsc.slice(-6).reverse().map((e) => {
                                  const prevIdx = sortedAsc.findIndex((x) => x.id === e.id) - 1;
                                  const prevEntry = prevIdx >= 0 ? sortedAsc[prevIdx] : null;
                                  const dValor = prevEntry?.valor_atual != null && e.valor_atual != null
                                    ? Number(e.valor_atual) - Number(prevEntry.valor_atual) : null;
                                  return (
                                    <div key={e.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/20 last:border-0">
                                      <span className="tabular-nums shrink-0 text-muted-foreground w-20">
                                        {new Date(e.snapshotted_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                                      </span>
                                      {e.valor_atual != null && (
                                        <span className="font-bold text-foreground tabular-nums">{fmt(e.valor_atual)}</span>
                                      )}
                                      {dValor != null && dValor !== 0 && (
                                        <span className={`text-[10px] tabular-nums ${dValor > 0 ? (isReducing ? "text-rose-600" : "text-emerald-600") : (isReducing ? "text-emerald-600" : "text-rose-600")}`}>
                                          {dValor > 0 ? "+" : ""}{fmt(dValor)}
                                        </span>
                                      )}
                                      {e.progresso_pct != null && (
                                        <span className="ml-auto font-bold tabular-nums text-accent">{Math.round(e.progresso_pct)}%</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ══════ ANÁLISE VISUAL DAS METAS ══════ */}
        {(parecerMetas.length > 0 || acompEntries.length > 0) && (() => {
          const CATEGORY_LABELS: Record<string, string> = {
            income: "Renda",
            expenses: "Despesa",
            debts: "Dívida",
            assets: "Patrimônio",
            insurance: "Seguro",
          };
          const CATEGORY_COLORS: Record<string, string> = {
            income: "hsl(152, 55%, 41%)",
            expenses: "hsl(16, 65%, 50%)",
            debts: "hsl(0, 72%, 55%)",
            assets: "hsl(215, 50%, 45%)",
            insurance: "hsl(260, 50%, 55%)",
          };

          // Último lançamento por meta (chave source_table:source_id ou meta_id)
          const latestByMeta = new Map<string, AcompEntry>();
          const allByMeta = new Map<string, AcompEntry[]>();
          acompEntries.forEach((e) => {
            const key = e.meta_id ?? `${e.source_table ?? ""}:${e.source_id ?? ""}:${e.source_label ?? ""}`;
            const existing = latestByMeta.get(key);
            if (!existing || e.snapshotted_at > existing.snapshotted_at) {
              latestByMeta.set(key, e);
            }
            const arr = allByMeta.get(key) ?? [];
            arr.push(e);
            allByMeta.set(key, arr);
          });

          // ── 1. Status das Metas (Pizza Donut) ──
          const today = new Date();
          let concluidas = 0;
          let emAndamento = 0;
          let semLanc = 0;
          let atrasadas = 0;
          parecerMetas.forEach((m) => {
            const key = `${m.source_table}:${m.source_id}:${m.source_label}`;
            const latest = latestByMeta.get(key) ?? latestByMeta.get(m.id);
            const pct = latest?.progresso_pct ?? null;
            const venceu = m.prazo ? new Date(m.prazo) < today : false;
            if (pct == null) {
              semLanc++;
            } else if (pct >= 100) {
              concluidas++;
            } else if (venceu) {
              atrasadas++;
            } else {
              emAndamento++;
            }
          });
          const totalMetas = parecerMetas.length;
          const statusData = [
            { name: "Concluídas", value: concluidas, color: "hsl(152, 60%, 42%)" },
            { name: "Em andamento", value: emAndamento, color: "hsl(215, 60%, 50%)" },
            { name: "Sem lançamentos", value: semLanc, color: "hsl(0, 0%, 60%)" },
            { name: "Atrasadas", value: atrasadas, color: "hsl(0, 72%, 55%)" },
          ].filter((s) => s.value > 0);

          // ── 2. Progresso por Meta (Barras horizontais) ──
          const progressoMetas = parecerMetas
            .map((m) => {
              const key = `${m.source_table}:${m.source_id}:${m.source_label}`;
              const latest = latestByMeta.get(key) ?? latestByMeta.get(m.id);
              if (!latest || latest.progresso_pct == null) return null;
              const pct = Number(latest.progresso_pct);
              let cor = "hsl(0, 72%, 55%)";
              if (pct >= 100) cor = "hsl(152, 60%, 42%)";
              else if (pct >= 60) cor = "hsl(215, 60%, 50%)";
              else if (pct >= 30) cor = "hsl(38, 92%, 50%)";
              const nomeCurto = m.source_label.length > 28 ? m.source_label.slice(0, 26) + "…" : m.source_label;
              return {
                nome: nomeCurto,
                nomeCompleto: m.source_label,
                pct: Math.min(150, pct),
                pctReal: pct,
                valor_atual: Number(latest.valor_atual ?? 0),
                valor_meta: Number(m.meta_valor ?? latest.valor_meta ?? 0),
                cor,
                categoria: CATEGORY_LABELS[m.source_table] ?? m.source_table,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x != null)
            .sort((a, b) => b.pctReal - a.pctReal);
          const progressoTop = progressoMetas.length > 12
            ? [...progressoMetas.slice(0, 11), {
              nome: `Outras (${progressoMetas.length - 11})`,
              nomeCompleto: `Outras ${progressoMetas.length - 11} metas`,
              pct: progressoMetas.slice(11).reduce((s, x) => s + x.pct, 0) / (progressoMetas.length - 11),
              pctReal: progressoMetas.slice(11).reduce((s, x) => s + x.pctReal, 0) / (progressoMetas.length - 11),
              valor_atual: 0,
              valor_meta: 0,
              cor: "hsl(0, 0%, 55%)",
              categoria: "—",
            }]
            : progressoMetas;

          // ── 3. Metas por Categoria (Pizza) ──
          const catCount = new Map<string, number>();
          parecerMetas.forEach((m) => {
            const label = CATEGORY_LABELS[m.source_table] ?? m.source_table;
            catCount.set(label, (catCount.get(label) ?? 0) + 1);
          });
          const categoriaData = Array.from(catCount.entries()).map(([name, value]) => {
            const tableKey = Object.entries(CATEGORY_LABELS).find(([, lbl]) => lbl === name)?.[0];
            return {
              name,
              value,
              color: tableKey ? CATEGORY_COLORS[tableKey] : "hsl(0, 0%, 55%)",
            };
          });

          // ── 4. Alvo vs Atual (Barras agrupadas, top 8) ──
          const alvoVsAtual = parecerMetas
            .map((m) => {
              const key = `${m.source_table}:${m.source_id}:${m.source_label}`;
              const latest = latestByMeta.get(key) ?? latestByMeta.get(m.id);
              const alvo = Number(m.meta_valor ?? latest?.valor_meta ?? 0);
              const atual = Number(latest?.valor_atual ?? 0);
              if (alvo <= 0) return null;
              const nomeCurto = m.source_label.length > 18 ? m.source_label.slice(0, 16) + "…" : m.source_label;
              return {
                nome: nomeCurto,
                nomeCompleto: m.source_label,
                Alvo: alvo,
                Atual: atual,
                atingiu: atual >= alvo,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x != null)
            .sort((a, b) => b.Alvo - a.Alvo)
            .slice(0, 8);

          // ── 5. Evolução mensal (Linhas múltiplas, top 6 metas com mais lançamentos) ──
          const metasComHistoria = Array.from(allByMeta.entries())
            .map(([key, entries]) => ({ key, entries: [...entries].sort((a, b) => a.snapshotted_at.localeCompare(b.snapshotted_at)) }))
            .filter((g) => g.entries.length >= 2)
            .sort((a, b) => b.entries.length - a.entries.length)
            .slice(0, 6);

          const allDatesSet = new Set<string>();
          metasComHistoria.forEach((g) => {
            g.entries.forEach((e) => {
              const d = new Date(e.snapshotted_at);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              allDatesSet.add(key);
            });
          });
          const allDatesSorted = Array.from(allDatesSet).sort();

          const metaNameByKey = new Map<string, string>();
          metasComHistoria.forEach((g) => {
            const first = g.entries[0];
            const label = first.source_label ?? "Meta";
            const short = label.length > 22 ? label.slice(0, 20) + "…" : label;
            metaNameByKey.set(g.key, short);
          });

          const evolucaoData = allDatesSorted.map((ymKey) => {
            const [yyyy, mm] = ymKey.split("-");
            const row: Record<string, string | number | null> = {
              periodo: `${mm}/${yyyy.slice(2)}`,
            };
            metasComHistoria.forEach((g) => {
              const matchEntries = g.entries.filter((e) => {
                const d = new Date(e.snapshotted_at);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === ymKey;
              });
              const nome = metaNameByKey.get(g.key)!;
              if (matchEntries.length > 0) {
                const last = matchEntries[matchEntries.length - 1];
                row[nome] = last.progresso_pct != null ? Number(last.progresso_pct) : null;
              } else {
                row[nome] = null;
              }
            });
            return row;
          });

          // ── 6. Lançamentos por mês (Barras empilhadas) ──
          const monthCatMap = new Map<string, Record<string, number>>();
          acompEntries.forEach((e) => {
            const d = new Date(e.snapshotted_at);
            const ymKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const cat = CATEGORY_LABELS[e.source_table ?? ""] ?? "Outros";
            const row = monthCatMap.get(ymKey) ?? {};
            row[cat] = (row[cat] ?? 0) + 1;
            monthCatMap.set(ymKey, row);
          });
          const lancamentosPorMes = Array.from(monthCatMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([ymKey, row]) => {
              const [yyyy, mm] = ymKey.split("-");
              return { periodo: `${mm}/${yyyy.slice(2)}`, ...row };
            });
          const catsPresentes = Array.from(new Set(
            lancamentosPorMes.flatMap((r) => Object.keys(r).filter((k) => k !== "periodo"))
          ));

          const lineColors = [
            "hsl(215, 60%, 50%)",
            "hsl(16, 65%, 50%)",
            "hsl(152, 60%, 42%)",
            "hsl(38, 92%, 50%)",
            "hsl(260, 50%, 55%)",
            "hsl(190, 60%, 45%)",
          ];

          // Não renderiza nada se não há nenhum gráfico útil
          const hasAnyChart = statusData.length > 0 || progressoTop.length > 0 || categoriaData.length > 0 || alvoVsAtual.length > 0 || evolucaoData.length > 0 || lancamentosPorMes.length > 0;
          if (!hasAnyChart) return null;

          return (
            <section className="print:break-before-page">
              <SectionHeader
                number={sectionNumber()}
                title="Análise Visual das Metas"
                subtitle="Distribuição, progresso e evolução das metas em gráficos"
              />
              <div className="space-y-3">
                {/* Linha 1: Status + Categoria */}
                {(statusData.length > 0 || categoriaData.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {statusData.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-novare-blue" />
                            Status das Metas
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground -mt-0.5">Distribuição por situação atual</p>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="relative">
                            <ResponsiveContainer width="100%" height={230}>
                              <PieChart>
                                <defs>
                                  {statusData.map((s, i) => (
                                    <linearGradient key={i} id={`statusGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={s.color} stopOpacity={1} />
                                      <stop offset="100%" stopColor={s.color} stopOpacity={0.75} />
                                    </linearGradient>
                                  ))}
                                </defs>
                                <Pie
                                  data={statusData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={58}
                                  outerRadius={85}
                                  paddingAngle={3}
                                  stroke="hsl(var(--card))"
                                  strokeWidth={2}
                                >
                                  {statusData.map((_, i) => (
                                    <Cell key={i} fill={`url(#statusGrad-${i})`} />
                                  ))}
                                </Pie>
                                <RTooltip
                                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "8px 12px", backgroundColor: "hsl(var(--card))", boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)" }}
                                  labelStyle={{ fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}
                                  itemStyle={{ padding: "2px 0" }}
                                  formatter={(v: number, n: string) => [`${v} meta${v !== 1 ? "s" : ""} (${totalMetas > 0 ? ((v / totalMetas) * 100).toFixed(1) : 0}%)`, n]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-3xl font-black text-foreground tabular-nums leading-none">{totalMetas}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold">{totalMetas === 1 ? "meta" : "metas"}</span>
                            </div>
                          </div>
                          <div className="mt-3 space-y-1.5">
                            {statusData.map((s) => (
                              <div key={s.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full border tabular-nums font-bold text-[10px]"
                                    style={{ background: `${s.color}1a`, borderColor: `${s.color}66`, color: s.color }}
                                  >
                                    {s.value}
                                  </span>
                                  <span className="text-foreground font-medium">{s.name}</span>
                                </div>
                                <span className="tabular-nums text-muted-foreground font-semibold">
                                  {totalMetas > 0 ? ((s.value / totalMetas) * 100).toFixed(0) : 0}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {categoriaData.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-novare-blue" />
                            Metas por Categoria
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground -mt-0.5">Composição por área financeira</p>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="relative">
                            <ResponsiveContainer width="100%" height={230}>
                              <PieChart>
                                <defs>
                                  {categoriaData.map((c, i) => (
                                    <linearGradient key={i} id={`catGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={c.color} stopOpacity={1} />
                                      <stop offset="100%" stopColor={c.color} stopOpacity={0.75} />
                                    </linearGradient>
                                  ))}
                                </defs>
                                <Pie
                                  data={categoriaData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={58}
                                  outerRadius={85}
                                  paddingAngle={3}
                                  stroke="hsl(var(--card))"
                                  strokeWidth={2}
                                >
                                  {categoriaData.map((_, i) => (
                                    <Cell key={i} fill={`url(#catGrad-${i})`} />
                                  ))}
                                </Pie>
                                <RTooltip
                                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "8px 12px", backgroundColor: "hsl(var(--card))", boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)" }}
                                  labelStyle={{ fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}
                                  itemStyle={{ padding: "2px 0" }}
                                  formatter={(v: number, n: string) => [`${v} meta${v !== 1 ? "s" : ""} (${totalMetas > 0 ? ((v / totalMetas) * 100).toFixed(1) : 0}%)`, n]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-3xl font-black text-foreground tabular-nums leading-none">{categoriaData.length}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold">{categoriaData.length === 1 ? "categoria" : "categorias"}</span>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                            {categoriaData.map((c) => (
                              <div key={c.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full border tabular-nums font-bold text-[10px] shrink-0"
                                    style={{ background: `${c.color}1a`, borderColor: `${c.color}66`, color: c.color }}
                                  >
                                    {c.value}
                                  </span>
                                  <span className="text-foreground truncate font-medium">{c.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Linha 2: Barras horizontais Progresso por Meta */}
                {progressoTop.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-novare-blue" />
                        Progresso por Meta
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground -mt-0.5">Percentual de atingimento de cada meta</p>
                    </CardHeader>
                    <CardContent className="pt-2">
                      {/* Legenda custom (Cell variável quebra Legend do Recharts) */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(152, 60%, 42%)" }} />
                          <span className="text-muted-foreground">100%+ Concluída</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(215, 60%, 50%)" }} />
                          <span className="text-muted-foreground">60-99% Avançada</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(38, 92%, 50%)" }} />
                          <span className="text-muted-foreground">30-59% Em curso</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(0, 72%, 55%)" }} />
                          <span className="text-muted-foreground">&lt;30% Inicial</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={Math.max(220, progressoTop.length * 32 + 40)}>
                        <BarChart
                          data={progressoTop}
                          layout="vertical"
                          margin={{ top: 8, right: 56, left: 8, bottom: 4 }}
                          barCategoryGap="20%"
                        >
                          <defs>
                            <linearGradient id="progBgGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity={0.5} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" horizontal={false} />
                          <XAxis
                            type="number"
                            domain={[0, 150]}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => `${v}%`}
                          />
                          <YAxis
                            dataKey="nome"
                            type="category"
                            width={160}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <RTooltip
                            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                            contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "8px 12px", backgroundColor: "hsl(var(--card))", boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)" }}
                            labelStyle={{ fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}
                            itemStyle={{ padding: "2px 0" }}
                            formatter={(_: unknown, __: unknown, item: { payload?: { pctReal?: number; valor_atual?: number; valor_meta?: number; nomeCompleto?: string } }) => {
                              const p = item?.payload;
                              if (!p) return ["", ""];
                              return [
                                `${(p.pctReal ?? 0).toFixed(1)}% • Atual: ${fmt(p.valor_atual ?? 0)} • Alvo: ${fmt(p.valor_meta ?? 0)}`,
                                p.nomeCompleto ?? "",
                              ];
                            }}
                            labelFormatter={() => ""}
                          />
                          <Bar
                            dataKey="pct"
                            radius={[0, 6, 6, 0]}
                            barSize={20}
                            background={{ fill: "hsl(var(--muted) / 0.35)", radius: 6 }}
                          >
                            {progressoTop.map((d, i) => (
                              <Cell key={i} fill={d.cor} />
                            ))}
                            <LabelList
                              dataKey="pctReal"
                              position="right"
                              formatter={(v: number) => `${v.toFixed(0)}%`}
                              style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 700 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Linha 3: Barras agrupadas Alvo vs Atual */}
                {alvoVsAtual.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-novare-blue" />
                        Valor Alvo vs Valor Atual <span className="text-muted-foreground font-normal">(Top 8)</span>
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground -mt-0.5">Comparação entre objetivo e progresso real • barras com contorno verde indicam meta atingida</p>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <ResponsiveContainer width="100%" height={340}>
                        <BarChart
                          data={alvoVsAtual}
                          margin={{ top: 16, right: 16, left: 8, bottom: 70 }}
                          barGap={4}
                          barCategoryGap="18%"
                        >
                          <defs>
                            <linearGradient id="alvoGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(215, 15%, 70%)" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="hsl(215, 15%, 70%)" stopOpacity={0.6} />
                            </linearGradient>
                            <linearGradient id="atualGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(215, 75%, 55%)" stopOpacity={1} />
                              <stop offset="100%" stopColor="hsl(215, 75%, 45%)" stopOpacity={0.85} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                          <XAxis
                            dataKey="nome"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            angle={-30}
                            textAnchor="end"
                            interval={0}
                            height={70}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            tickCount={5}
                            domain={[0, "dataMax"]}
                            tickFormatter={(v: number) => {
                              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                              if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
                              return `${v}`;
                            }}
                          />
                          <RTooltip
                            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                            contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "8px 12px", backgroundColor: "hsl(var(--card))", boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)" }}
                            labelStyle={{ fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}
                            itemStyle={{ padding: "2px 0" }}
                            formatter={(v: number, n: string, item: { payload?: { Alvo?: number; Atual?: number } }) => {
                              const p = item?.payload;
                              if (n === "Atual" && p && p.Alvo) {
                                const pct = (p.Atual ?? 0) / p.Alvo * 100;
                                return [`${fmt(v)} (${pct.toFixed(1)}%)`, n];
                              }
                              return [fmt(v), n];
                            }}
                            labelFormatter={(_, payload: ReadonlyArray<{ payload?: { nomeCompleto?: string } }>) => payload?.[0]?.payload?.nomeCompleto ?? ""}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                            iconType="circle"
                            iconSize={9}
                          />
                          <Bar dataKey="Alvo" fill="url(#alvoGrad)" radius={[6, 6, 0, 0]} barSize={20} />
                          <Bar dataKey="Atual" fill="url(#atualGrad)" radius={[6, 6, 0, 0]} barSize={20}>
                            {alvoVsAtual.map((d, i) => (
                              <Cell
                                key={i}
                                stroke={d.atingiu ? "hsl(152, 60%, 42%)" : "transparent"}
                                strokeWidth={d.atingiu ? 2 : 0}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Linha 4: Evolução mensal (Linhas múltiplas) */}
                {evolucaoData.length >= 2 && metasComHistoria.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <LineChartIcon className="w-4 h-4 text-novare-blue" />
                        Evolução Mensal das Metas Ativas
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground -mt-0.5">Trajetória de progresso ao longo dos meses</p>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart
                          data={evolucaoData}
                          margin={{ top: 16, right: 16, left: 8, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                          <XAxis
                            dataKey="periodo"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            padding={{ left: 8, right: 8 }}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => `${v}%`}
                            domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax / 10) * 10)]}
                          />
                          <RTooltip
                            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "3 3" }}
                            contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "8px 12px", backgroundColor: "hsl(var(--card))", boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)" }}
                            labelStyle={{ fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}
                            itemStyle={{ padding: "2px 0" }}
                            formatter={(v: number, n: string) => [v != null ? `${v.toFixed(1)}%` : "—", n]}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                            iconType="circle"
                            iconSize={9}
                          />
                          {metasComHistoria.map((g, i) => {
                            const nome = metaNameByKey.get(g.key)!;
                            const cor = lineColors[i % lineColors.length];
                            return (
                              <Line
                                key={g.key}
                                type="monotone"
                                dataKey={nome}
                                stroke={cor}
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: cor, strokeWidth: 0 }}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                                connectNulls
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Linha 5: Barras empilhadas — Lançamentos por mês */}
                {lancamentosPorMes.length >= 2 && catsPresentes.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-novare-blue" />
                        Lançamentos por Mês <span className="text-muted-foreground font-normal">(por Categoria)</span>
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground -mt-0.5">Volume de registros mensais agrupados por área</p>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={lancamentosPorMes}
                          margin={{ top: 16, right: 16, left: 8, bottom: 4 }}
                          barCategoryGap="22%"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                          <XAxis
                            dataKey="periodo"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <RTooltip
                            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                            contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "8px 12px", backgroundColor: "hsl(var(--card))", boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)" }}
                            labelStyle={{ fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}
                            itemStyle={{ padding: "2px 0" }}
                            formatter={(v: number, n: string) => [`${v} lançamento${v !== 1 ? "s" : ""}`, n]}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                            iconType="circle"
                            iconSize={9}
                          />
                          {catsPresentes.map((cat, i) => {
                            const tableKey = Object.entries(CATEGORY_LABELS).find(([, lbl]) => lbl === cat)?.[0];
                            const cor = tableKey ? CATEGORY_COLORS[tableKey] : lineColors[i % lineColors.length];
                            return (
                              <Bar
                                key={cat}
                                dataKey={cat}
                                stackId="lanc"
                                fill={cor}
                                barSize={28}
                                radius={i === catsPresentes.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                              />
                            );
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          );
        })()}

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

        {/* ══════ EVOLUÇÃO DA TAXA DE POUPANÇA ══════ */}
        {(() => {
          const rateSnaps = snapshots.filter((s) => s.savings_rate != null);
          if (rateSnaps.length < 2) return null;
          const rateSorted = rateSnaps
            .slice()
            .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
          const rateData = rateSorted.map((s) => {
            const v = Number(s.savings_rate || 0);
            const fill = v >= 30 ? "#16a34a" : v >= 10 ? "#2563eb" : v >= 0 ? "#d97706" : "#dc2626";
            return {
              name: new Date(s.snapshot_date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
              value: v,
              fill,
            };
          });
          const rVals = rateData.map((d) => d.value);
          const firstRate = rVals[0];
          const lastRate = rVals[rVals.length - 1];
          const deltaRate = lastRate - firstRate;
          const avgRate = rVals.reduce((a, b) => a + b, 0) / rVals.length;
          return (
            <section className="print:break-before-page">
              <SectionHeader
                number={sectionNumber()}
                title="Evolução da Taxa de Poupança"
                subtitle={`${rateSorted.length} registros históricos`}
              />
              <Card>
                <CardContent className="py-5 px-2 sm:px-6">
                  <div className="h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rateData} margin={{ top: 20, right: 12, left: 8, bottom: 4 }} barCategoryGap="18%">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => `${v.toFixed(0)}%`}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RTooltip
                          formatter={(v: number) => `${v.toFixed(1)}%`}
                          contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "6px 10px", backgroundColor: "hsl(var(--card))" }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {rateData.map((d, i) => (<Cell key={i} fill={d.fill} />))}
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(v: number) => `${v.toFixed(1)}%`}
                            style={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <div className="mt-3 grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Início</p>
                    <p className="text-lg font-black tabular-nums mt-0.5">{firstRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Atual</p>
                    <p className="text-lg font-black tabular-nums mt-0.5">{lastRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card className={deltaRate >= 0 ? "border-emerald-300/40" : "border-rose-300/40"}>
                  <CardContent className="p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Variação</p>
                    <p className={`text-lg font-black tabular-nums mt-0.5 ${deltaRate >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {deltaRate >= 0 ? "+" : ""}{deltaRate.toFixed(1)} p.p.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Média</p>
                    <p className="text-lg font-black tabular-nums mt-0.5">{avgRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>
            </section>
          );
        })()}

        {/* ══════ HISTÓRICO MENSAL (FECHAMENTOS) ══════ */}
        {closings.length > 0 && (
          <section className="print:break-before-page">
            <SectionHeader
              number={sectionNumber()}
              title="Histórico Mensal"
              subtitle={`Evolução de ${closings.length} fechamento${closings.length !== 1 ? "s" : ""} consolidado${closings.length !== 1 ? "s" : ""} do cliente`}
            />
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Mês</th>
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Renda</th>
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Despesas</th>
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Patrim. Líq.</th>
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Tx. Poup.</th>
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Reserva</th>
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Plano %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {closings.map((c, idx) => {
                      const prev = idx > 0 ? closings[idx - 1] : null;
                      const dNet = prev?.net_worth != null && c.net_worth != null
                        ? Number(c.net_worth) - Number(prev.net_worth) : null;
                      const ml = new Date(c.month_ref + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
                      return (
                        <tr key={c.month_ref} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-bold tabular-nums">{ml.charAt(0).toUpperCase() + ml.slice(1)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{c.total_income != null ? fmt(Number(c.total_income)) : "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-rose-700 dark:text-rose-400">{c.total_expenses != null ? fmt(Number(c.total_expenses)) : "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <span className="font-semibold">{c.net_worth != null ? fmt(Number(c.net_worth)) : "—"}</span>
                            {dNet != null && (
                              <span className={`block text-[10px] tabular-nums ${dNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {dNet >= 0 ? "+" : ""}{fmt(dNet)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{c.savings_rate != null ? `${Number(c.savings_rate).toFixed(1)}%` : "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{c.emergency_reserve_months != null ? `${Number(c.emergency_reserve_months).toFixed(1)}m` : "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{c.plan_completion_pct != null ? `${Math.round(Number(c.plan_completion_pct))}%` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Resumo de evolução total */}
            {closings.length >= 2 && (() => {
              const first = closings[0];
              const last = closings[closings.length - 1];
              const dNet = (Number(last.net_worth) || 0) - (Number(first.net_worth) || 0);
              const dPct = first.net_worth ? ((Number(last.net_worth) - Number(first.net_worth)) / Number(first.net_worth)) * 100 : null;
              return (
                <div className="mt-3 grid gap-3 grid-cols-2 lg:grid-cols-4">
                  <Card className="border-emerald-300/40">
                    <CardContent className="p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Evolução total</p>
                      <p className={`text-lg font-black tabular-nums mt-0.5 ${dNet >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {dNet >= 0 ? "+" : ""}{fmt(dNet)}
                      </p>
                      {dPct != null && (
                        <p className="text-[11px] text-muted-foreground">
                          {dPct >= 0 ? "+" : ""}{dPct.toFixed(1)}% vs primeiro fechamento
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tx. poupança média</p>
                      <p className="text-lg font-black tabular-nums mt-0.5">
                        {(closings.filter((c) => c.savings_rate != null).reduce((s, c) => s + Number(c.savings_rate || 0), 0) / closings.filter((c) => c.savings_rate != null).length || 0).toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Meses fechados</p>
                      <p className="text-lg font-black tabular-nums mt-0.5">{closings.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Período</p>
                      <p className="text-xs font-bold tabular-nums mt-0.5">
                        {new Date(first.month_ref + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })} → {new Date(last.month_ref + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
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
