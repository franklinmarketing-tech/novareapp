import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Card3D } from "@/components/ui/card-3d";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Wallet, TrendingUp, Shield, Target, ClipboardList,
  AlertTriangle, ArrowRight, ChevronRight,
  PiggyBank, Sparkles, CheckCircle, Zap, Trophy,
  Star, Flame, Award, Medal, Crown,
  Calendar, History, BarChart3, Landmark, Receipt, CreditCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";

// 3D Goal Icons
import goalDividasIcon from "@/assets/icons/goal-dividas.png";
import goalReservaIcon from "@/assets/icons/goal-reserva.png";
import goalInvestimentosIcon from "@/assets/icons/goal-investimentos.png";
import goalAposentadoriaIcon from "@/assets/icons/goal-aposentadoria.png";
import goalImovelIcon from "@/assets/icons/goal-imovel.png";
import goalFamiliaIcon from "@/assets/icons/goal-familia.png";
import goalViagemIcon from "@/assets/icons/goal-viagem.png";
import goalVeiculoIcon from "@/assets/icons/goal-veiculo.png";
import goalEducacaoIcon from "@/assets/icons/goal-educacao.png";
import goalProtecaoIcon from "@/assets/icons/goal-protecao.png";
import goalDefaultIcon from "@/assets/icons/goal-default.png";
import goalCheckDoneIcon from "@/assets/icons/goal-check-done.png";

// ── Goal style detection ──
const goalTypeConfig = [
  { keywords: ["dívida", "divida", "quitar", "pagar dívida", "sair das dívidas"], cssVar: "--goal-dividas", icon3d: goalDividasIcon, label: "Dívidas" },
  { keywords: ["emergência", "emergencia", "reserva"], cssVar: "--goal-reserva", icon3d: goalReservaIcon, label: "Reserva" },
  { keywords: ["invest", "aplicar", "renda passiva", "começar a investir"], cssVar: "--goal-investimentos", icon3d: goalInvestimentosIcon, label: "Investimentos" },
  { keywords: ["aposentadoria", "previdência", "previdencia", "futuro"], cssVar: "--goal-aposentadoria", icon3d: goalAposentadoriaIcon, label: "Aposentadoria" },
  { keywords: ["casa", "imóvel", "imovel", "apartamento", "moradia"], cssVar: "--goal-imovel", icon3d: goalImovelIcon, label: "Imóvel" },
  { keywords: ["filho", "filhos", "educação", "educacao", "faculdade", "escola", "vida melhor"], cssVar: "--goal-familia", icon3d: goalFamiliaIcon, label: "Família" },
  { keywords: ["viagem", "viajar", "férias"], cssVar: "--goal-viagem", icon3d: goalViagemIcon, label: "Viagem" },
  { keywords: ["carro", "veículo", "veiculo", "moto"], cssVar: "--goal-veiculo", icon3d: goalVeiculoIcon, label: "Veículo" },
  { keywords: ["curso", "estudo", "formação", "formacao", "certificação"], cssVar: "--goal-educacao", icon3d: goalEducacaoIcon, label: "Educação" },
  { keywords: ["protecao", "proteção", "seguro", "segurança"], cssVar: "--goal-protecao", icon3d: goalProtecaoIcon, label: "Proteção" },
];

const getGoalStyle = (description: string) => {
  const lower = description.toLowerCase();
  for (const cfg of goalTypeConfig) {
    if (cfg.keywords.some(k => lower.includes(k))) {
      return { cssVar: cfg.cssVar, icon3d: cfg.icon3d, badge: cfg.label };
    }
  }
  return { cssVar: "--goal-default", icon3d: goalDefaultIcon, badge: "Objetivo" };
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const fmtShort = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (abs >= 1_000) return `${sign}R$ ${Math.round(abs / 1_000)}k`;
  return `${sign}R$ ${Math.round(abs)}`;
};

interface GoalWithProgress {
  id: string;
  description: string;
  target_amount: number | null;
  deadline: string | null;
  priority: string | null;
  tasksDone: number;
  tasksTotal: number;
}

interface IncomeItem { id: string; description: string; amount: number; frequency?: string | null; month_ref?: string | null }
interface ExpenseItem { id: string; category: string; amount: number; month_ref?: string | null }
interface DebtItem { id: string; type: string; total_amount: number; monthly_payment: number | null; month_ref?: string | null }
interface AssetItem { id: string; type: string; estimated_value: number; month_ref?: string | null }
interface InsuranceItem { id: string; type: string; provider: string | null; monthly_premium: number | null; coverage_amount: number | null; month_ref?: string | null }
interface GoalItem { id: string; description: string; target_amount: number | null; month_ref?: string | null }
interface MonthlyClosing {
  month_ref: string;
  total_income: number | null;
  total_expenses: number | null;
  total_debts: number | null;
  total_assets: number | null;
  net_worth: number | null;
  savings_rate: number | null;
  plan_completion_pct: number | null;
  emergency_reserve_months: number | null;
}

const fmtCurrencyFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtMonthLabel = (monthRef: string) => {
  const d = new Date(monthRef + (monthRef.length === 7 ? "-01" : "") + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
};

const normalizeDateOnly = (value?: string | null) => value?.slice(0, 10) ?? null;

const preferMonthRows = <T extends { month_ref?: string | null }>(rows: T[], monthRef: string): T[] => {
  const exactRows = rows.filter((row) => normalizeDateOnly(row.month_ref) === monthRef);
  if (exactRows.length > 0) return exactRows;
  return rows.filter((row) => !row.month_ref);
};

const pickMonthRow = <T extends { month_ref?: string | null; updated_at?: string | null; created_at?: string | null }>(rows: T[], monthRef: string): T | null => {
  const candidates = preferMonthRows(rows, monthRef);
  return candidates
    .slice()
    .sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))[0] ?? null;
};

const ClientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clientStatus, setClientStatus] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [financials, setFinancials] = useState<{ totalIncome: number; totalExpenses: number; totalAssets: number; totalDebts: number } | null>(null);
  const [actionProgress, setActionProgress] = useState<{ total: number; done: number } | null>(null);
  const [dataConfirmedThisMonth, setDataConfirmedThisMonth] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [fetchError, setFetchError] = useState(false);
  // Detalhes do onboarding (resumo consolidado)
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [debtItems, setDebtItems] = useState<DebtItem[]>([]);
  const [assetItems, setAssetItems] = useState<AssetItem[]>([]);
  const [insuranceItems, setInsuranceItems] = useState<InsuranceItem[]>([]);
  const [goalItems, setGoalItems] = useState<GoalItem[]>([]);
  // Histórico mensal
  const [monthlyClosings, setMonthlyClosings] = useState<MonthlyClosing[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {

      const [{ data: client }, { data: profileData }] = await Promise.all([
        supabase.from("clients").select("id, status").eq("user_id", user.id).single(),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!client) return;
      setClientStatus(client.status);
      if (profileData) setProfile(profileData);

      // Filtro mensal: pega itens do mês corrente OU itens legados (month_ref nulo).
      // Isso evita somar maio + junho quando o fechamento mensal clona os dados.
      const currentMonthRef = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
      const monthFilter = `month_ref.is.null,month_ref.eq.${currentMonthRef}`;

      const [
        diagRes, incomeRes, expensesRes, assetsRes, debtsRes,
        { data: plans }, { data: goalsData }, insuranceRes, closingsRes,
      ] = await Promise.all([
        supabase.from("diagnosis").select("*").eq("client_id", client.id).or(monthFilter).order("updated_at", { ascending: false }),
        supabase.from("income").select("id, description, amount, frequency, month_ref").eq("client_id", client.id).or(monthFilter),
        supabase.from("expenses").select("id, category, amount, month_ref").eq("client_id", client.id).or(monthFilter),
        supabase.from("assets").select("id, type, estimated_value, month_ref").eq("client_id", client.id).or(monthFilter),
        supabase.from("debts").select("id, type, total_amount, monthly_payment, month_ref").eq("client_id", client.id).or(monthFilter),
        supabase.from("action_plans").select("id").eq("client_id", client.id),
        supabase.from("goals").select("*").eq("client_id", client.id).or(monthFilter),
        supabase.from("insurance").select("id, type, provider, monthly_premium, coverage_amount, month_ref").eq("client_id", client.id).or(monthFilter),
        supabase
          .from("monthly_closings")
          .select("month_ref, total_income, total_expenses, total_debts, total_assets, net_worth, savings_rate, plan_completion_pct, emergency_reserve_months")
          .eq("client_id", client.id)
          .order("month_ref", { ascending: true }),
      ]);

      const diag = pickMonthRow((diagRes.data || []) as any[], currentMonthRef);
      if (diag) setDiagnosis(diag);

      const incList: IncomeItem[] = preferMonthRows((incomeRes.data || []) as any[], currentMonthRef).map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.frequency === "anual" ? Number(r.amount || 0) / 12 : r.amount), frequency: r.frequency, month_ref: r.month_ref }));
      const expList: ExpenseItem[] = preferMonthRows((expensesRes.data || []) as any[], currentMonthRef).map((r: any) => ({ id: r.id, category: r.category, amount: Number(r.amount), month_ref: r.month_ref }));
      const debtList: DebtItem[] = preferMonthRows((debtsRes.data || []) as any[], currentMonthRef).map((r: any) => ({ id: r.id, type: r.type, total_amount: Number(r.total_amount), monthly_payment: r.monthly_payment != null ? Number(r.monthly_payment) : null, month_ref: r.month_ref }));
      const assetList: AssetItem[] = preferMonthRows((assetsRes.data || []) as any[], currentMonthRef).map((r: any) => ({ id: r.id, type: r.type, estimated_value: Number(r.estimated_value), month_ref: r.month_ref }));
      const insList: InsuranceItem[] = preferMonthRows((insuranceRes.data || []) as any[], currentMonthRef).map((r: any) => ({ id: r.id, type: r.type, provider: r.provider, monthly_premium: r.monthly_premium != null ? Number(r.monthly_premium) : null, coverage_amount: r.coverage_amount != null ? Number(r.coverage_amount) : null, month_ref: r.month_ref }));
      const activeGoalsData = preferMonthRows((goalsData || []) as any[], currentMonthRef);
      const goalList: GoalItem[] = activeGoalsData.map((g: any) => ({ id: g.id, description: g.description, target_amount: g.target_amount != null ? Number(g.target_amount) : null, month_ref: g.month_ref }));
      const closings: MonthlyClosing[] = (closingsRes.data || []).map((c: any) => ({
        month_ref: c.month_ref,
        total_income: c.total_income != null ? Number(c.total_income) : null,
        total_expenses: c.total_expenses != null ? Number(c.total_expenses) : null,
        total_debts: c.total_debts != null ? Number(c.total_debts) : null,
        total_assets: c.total_assets != null ? Number(c.total_assets) : null,
        net_worth: c.net_worth != null ? Number(c.net_worth) : null,
        savings_rate: c.savings_rate != null ? Number(c.savings_rate) : null,
        plan_completion_pct: c.plan_completion_pct != null ? Number(c.plan_completion_pct) : null,
        emergency_reserve_months: c.emergency_reserve_months != null ? Number(c.emergency_reserve_months) : null,
      }));

      setIncomeItems(incList);
      setExpenseItems(expList);
      setDebtItems(debtList);
      setAssetItems(assetList);
      setInsuranceItems(insList);
      setGoalItems(goalList);
      setMonthlyClosings(closings);

      setFinancials({
        totalIncome: incList.reduce((s, r) => s + r.amount, 0),
        totalExpenses: expList.reduce((s, r) => s + r.amount, 0),
        totalAssets: assetList.reduce((s, r) => s + r.estimated_value, 0),
        totalDebts: debtList.reduce((s, r) => s + r.total_amount, 0),
      });

      let allItems: { status: string; parent_id: string | null; goal_id: string | null }[] = [];

      if (plans && plans.length > 0) {
        const { data: items } = await supabase
          .from("action_items").select("status, parent_id, goal_id, month_ref").eq("action_plan_id", plans[0].id).or(monthFilter);
        if (items) {
          allItems = preferMonthRows(items as any[], currentMonthRef);
          const children = allItems.filter((i) => i.parent_id);
          setActionProgress({ total: children.length, done: children.filter((i) => i.status === "concluido").length });
        }
      }

      // Build goals with task progress
      if (activeGoalsData.length > 0) {
        const goalsWithProgress: GoalWithProgress[] = activeGoalsData.map((g) => {
          const goalTasks = allItems.filter((t) => t.goal_id === g.id);
          return {
            id: g.id,
            description: g.description,
            target_amount: g.target_amount ? Number(g.target_amount) : null,
            deadline: g.deadline,
            priority: g.priority,
            tasksDone: goalTasks.filter((t) => t.status === "concluido").length,
            tasksTotal: goalTasks.length,
          };
        });
        setGoals(goalsWithProgress);
      }

      const monthRef = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
      const { data: conf } = await supabase
        .from("data_confirmations").select("id").eq("client_id", client.id).eq("month_ref", monthRef).maybeSingle();
      setDataConfirmedThisMonth(!!conf);
      } catch {
        setFetchError(true);
      }
    };
    fetchData();
  }, [user]);

  const totalIncome = financials?.totalIncome ?? diagnosis?.total_income ?? 0;
  const totalExpenses = financials?.totalExpenses ?? diagnosis?.total_expenses ?? 0;
  const totalAssets = financials?.totalAssets ?? diagnosis?.total_assets ?? 0;
  const totalDebts = financials?.totalDebts ?? diagnosis?.total_debts ?? 0;
  const netWorth = totalAssets - totalDebts;
  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;
  const emergencyMonths = totalExpenses > 0 ? Math.round(totalAssets / totalExpenses) : 0;
  const planPct = actionProgress && actionProgress.total > 0 ? Math.round((actionProgress.done / actionProgress.total) * 100) : 0;
  const hasData = totalIncome > 0 || totalAssets > 0 || totalDebts > 0;
  const firstName = profile?.full_name?.split(" ")[0] || "Cliente";

  /* ── Generate contextual insight ── */
  const generateInsight = () => {
    if (clientStatus === "onboarding_pendente") return null; // CTA below handles this
    if (!hasData) return { text: "Seus dados financeiros ainda não foram preenchidos", icon: AlertTriangle, color: "text-warning" };
    if (savingsRate < 0) return { text: `Suas despesas superam sua renda em ${Math.abs(savingsRate)}% — revise seus gastos para equilibrar`, icon: AlertTriangle, color: "text-destructive", action: "/cliente/meus-dados", actionLabel: "Revisar dados" };
    if (savingsRate >= 20) return { text: `Parabéns! Você poupa ${savingsRate}% da renda — continue assim! 🎉`, icon: Sparkles, color: "text-success" };
    if (savingsRate >= 10) return { text: `Sua taxa de poupança está em ${savingsRate}% — próximo passo: chegar a 20%`, icon: TrendingUp, color: "text-accent" };
    return { text: `Sua taxa de poupança está em ${savingsRate}% — um bom plano pode dobrar isso`, icon: Zap, color: "text-accent", action: "/cliente/plano-acao", actionLabel: "Ver plano" };
  };

  const insight = generateInsight();

  /* ── Resumo do onboarding ── */
  const topIncome = [...incomeItems].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const expensesByCategory = expenseItems.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const topExpenses = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const totalMonthlyDebtPayments = debtItems.reduce((s, d) => s + (d.monthly_payment || 0), 0);
  const totalInsuranceCoverage = insuranceItems.reduce((s, i) => s + (i.coverage_amount || 0), 0);
  const totalInsurancePremium = insuranceItems.reduce((s, i) => s + (i.monthly_premium || 0), 0);
  const totalGoalsTarget = goalItems.reduce((s, g) => s + (g.target_amount || 0), 0);
  const hasOnboardingData =
    incomeItems.length > 0 || expenseItems.length > 0 || debtItems.length > 0 ||
    assetItems.length > 0 || insuranceItems.length > 0 || goalItems.length > 0;

  /* ── Histórico mensal ── */
  const closingsChartData = monthlyClosings.map((c) => ({
    month: fmtMonthLabel(c.month_ref),
    patrimonio: c.net_worth ?? 0,
    ativos: c.total_assets ?? 0,
    dividas: c.total_debts ?? 0,
  }));
  const lastClosings = [...monthlyClosings].slice(-6).reverse();
  const firstClosing = monthlyClosings[0];
  const lastClosing = monthlyClosings[monthlyClosings.length - 1];
  const totalEvolution =
    firstClosing && lastClosing && firstClosing !== lastClosing
      ? (lastClosing.net_worth ?? 0) - (firstClosing.net_worth ?? 0)
      : 0;
  const avgSavingsRate = monthlyClosings.length > 0
    ? Math.round(
        monthlyClosings.reduce((s, c) => s + (c.savings_rate ?? 0), 0) / monthlyClosings.length
      )
    : 0;
  const periodLabel = monthlyClosings.length > 0
    ? `${fmtMonthLabel(monthlyClosings[0].month_ref)} → ${fmtMonthLabel(monthlyClosings[monthlyClosings.length - 1].month_ref)}`
    : "—";

  if (fetchError) return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive/60" />
        <p className="text-sm font-medium text-foreground">Não foi possível carregar seus dados</p>
        <p className="text-xs text-muted-foreground">Verifique sua conexão e recarregue a página.</p>
      </div>
    </PageTransition>
  );

  return (
    <PageTransition className="space-y-6">
      <SEO title="Meu Dashboard" description="Visão geral da sua jornada financeira na Novare: metas, plano e progresso." index={false} />
      {/* ── Greeting ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-[hsl(215_45%_30%)] px-7 py-8 shadow-elevated"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground tracking-tight">
            Olá, {firstName} 👋
          </h1>
          <p className="text-sm text-primary-foreground/60 mt-1">
            {hasData ? "Aqui está o que importa agora" : "Complete seus dados para começar"}
          </p>
        </div>
      </motion.div>

      {/* ── Onboarding CTA ── */}
      {clientStatus === "onboarding_pendente" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-accent/30 bg-accent/[0.04] rounded-2xl overflow-hidden">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0 shadow-[0_0_20px_hsl(var(--accent)/0.15)]">
                <ClipboardList className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Complete seu cadastro</p>
                <p className="text-sm text-muted-foreground mt-0.5">Preencha seus dados para que seu consultor inicie o diagnóstico.</p>
              </div>
              <Button onClick={() => navigate("/cliente/onboarding")} variant="premium" className="shrink-0 rounded-2xl gap-2">
                Preencher
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-foreground/20">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Smart Insight ── */}
      {insight && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card px-5 py-4">
            <insight.icon className={`h-6 w-6 ${insight.color} shrink-0`} />
            <p className="text-sm text-foreground flex-1 font-medium">{insight.text}</p>
            {insight.action && (
              <Button size="sm" variant="ghost" onClick={() => navigate(insight.action!)} className="shrink-0 text-accent hover:text-accent gap-1">
                {insight.actionLabel} <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Data review alert ── */}
      {!dataConfirmedThisMonth && clientStatus !== "onboarding_pendente" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/[0.04] px-5 py-4">
            <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
            <p className="text-sm text-foreground flex-1">Revise seus dados financeiros deste mês</p>
            <Button size="sm" variant="ghost" onClick={() => navigate("/cliente/meus-dados")} className="shrink-0 text-warning hover:text-warning">
              Revisar <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Goals Progress — 3D Cards ── */}
      {goals.length > 0 && (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
          {/* Congratulations banner for completed goals */}
          {goals.some(g => g.tasksTotal > 0 && g.tasksDone === g.tasksTotal) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative rounded-2xl overflow-hidden px-5 py-4"
              style={{
                background: "linear-gradient(145deg, #0a1f1a 0%, #064e3b 50%, #0a1f1a 100%)",
                border: "1px solid rgba(52,211,153,0.15)",
                boxShadow: "0 1px 0 rgba(52,211,153,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 8px 24px -6px rgba(0,0,0,0.4)",
              }}
            >
              <motion.div
                className="absolute -top-4 -right-4 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative z-10 flex items-center gap-3">
                <motion.div
                  animate={{ y: [0, -3, 0], rotate: [0, 5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Trophy className="h-6 w-6" style={{ color: "#34d399" }} />
                </motion.div>
                <div>
                  <p className="text-sm font-bold text-white">Parabéns! 🎉</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Você concluiu {goals.filter(g => g.tasksTotal > 0 && g.tasksDone === g.tasksTotal).length} objetivo{goals.filter(g => g.tasksTotal > 0 && g.tasksDone === g.tasksTotal).length > 1 ? "s" : ""}! Continue assim.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex items-center gap-2 px-1">
            <Target className="h-6 w-6 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Meus Objetivos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal, i) => {
              const taskPct = goal.tasksTotal > 0 ? Math.round((goal.tasksDone / goal.tasksTotal) * 100) : 0;
              const isCompleted = taskPct === 100 && goal.tasksTotal > 0;
              const config = getGoalStyle(goal.description);
              const deadlineStr = goal.deadline
                ? new Date(goal.deadline + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                : null;

              return (
                <motion.div key={goal.id} variants={fadeUp} custom={i}>
                  <div className="relative">
                    <div
                      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5 bg-card"
                      style={{
                        border: `1px solid hsl(var(${config.cssVar}) / 0.2)`,
                        borderTop: `2px solid hsl(var(${config.cssVar}) / 0.5)`,
                        boxShadow: `0 2px 12px -4px hsl(var(${config.cssVar}) / 0.15), 0 1px 0 hsl(var(${config.cssVar}) / 0.08) inset`,
                      }}
                      onClick={() => navigate("/cliente/plano-acao")}
                    >
                      {/* Floating icon */}
                      <motion.div
                        className="absolute -top-3 -right-3 w-28 h-28 pointer-events-none"
                        animate={{ y: [0, -3, 0], rotate: [0, 2, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <img src={config.icon3d} alt="" className="w-full h-full object-contain opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-700" loading="lazy" />
                      </motion.div>

                      <div className="relative z-10 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: `hsl(var(${config.cssVar}))` }}>
                            {config.badge}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: `hsl(var(${config.cssVar}) / 0.12)`,
                              color: `hsl(var(${config.cssVar}))`,
                              border: `1px solid hsl(var(${config.cssVar}) / 0.25)`,
                            }}>
                            {goal.priority === "alta" ? "Alta" : goal.priority === "baixa" ? "Baixa" : "Média"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <motion.div className="w-10 h-10 shrink-0 drop-shadow-lg" whileHover={{ scale: 1.1, rotate: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                            <img src={config.icon3d} alt="" className="w-full h-full object-contain" loading="lazy" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground text-[15px] leading-snug truncate">{goal.description}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {goal.target_amount && (
                                <span className="text-[11px] font-medium text-muted-foreground">
                                  Meta: {fmtShort(goal.target_amount)}
                                </span>
                              )}
                              {deadlineStr && (
                                <span className="text-[11px] text-muted-foreground/70">
                                  até {deadlineStr}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-3xl font-black text-foreground tracking-tight">{taskPct}%</span>
                            <span className="ml-1.5 text-xs font-medium" style={{ color: `hsl(var(${config.cssVar}))` }}>
                              {goal.tasksDone}/{goal.tasksTotal}
                              {taskPct > 0 && <TrendingUp className="inline-block h-4 w-4 ml-1 -mt-0.5" />}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                            {goal.tasksTotal} {goal.tasksTotal === 1 ? "ação" : "ações"}
                          </span>
                        </div>

                        <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-muted/40">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: `hsl(var(${config.cssVar}))` }}
                            initial={{ width: 0 }} animate={{ width: `${taskPct}%` }} transition={{ duration: 1, delay: i * 0.08 }} />
                        </div>
                      </div>
                    </div>

                    {/* Completed overlay */}
                    {isCompleted && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center z-20"
                        style={{
                          background: "rgba(0,0,0,0.5)",
                          backdropFilter: "blur(3px)",
                          border: `1px solid hsl(var(${config.cssVar}) / 0.25)`,
                          boxShadow: `0 0 20px hsl(var(${config.cssVar}) / 0.08) inset`,
                        }}
                      >
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                          <img src={goalCheckDoneIcon} alt="" className="w-12 h-12 object-contain drop-shadow-lg mb-2" />
                        </motion.div>
                        <p className="text-sm font-bold text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>Objetivo Concluído! 🎉</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{goal.tasksDone} ações finalizadas</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Financial Overview ── */}
      {hasData && (
        <motion.div initial="hidden" animate="visible" className="space-y-4">
          {/* Row 1: Net Worth (hero) + Cash Flow + Emergency */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* North Star */}
            <motion.div variants={fadeUp} custom={0} className="lg:col-span-2">
              <Card3D interactive glowColor="rgba(96,165,250,0.1)" className="h-full">
                <div className="p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-6 w-6 text-primary" />
                    <span className="text-xs text-muted-foreground font-medium">Patrimônio Líquido</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">Tudo que você tem, menos o que deve</p>
                  <p className={`text-4xl md:text-5xl font-bold tracking-tight tabular-nums ${netWorth >= 0 ? "text-foreground" : "text-destructive"}`}>
                    {fmtShort(netWorth)}
                  </p>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
                    <div>
                      <span className="text-[11px] text-muted-foreground">O que você tem</span>
                      <p className="text-sm font-semibold text-success tabular-nums">{fmtShort(totalAssets)}</p>
                    </div>
                    <div className="w-px h-8 bg-border/40" />
                    <div>
                      <span className="text-[11px] text-muted-foreground">O que você deve</span>
                      <p className="text-sm font-semibold text-destructive tabular-nums">{fmtShort(totalDebts)}</p>
                    </div>
                  </div>
                </div>
              </Card3D>
            </motion.div>

            {/* Cash Flow */}
            <motion.div variants={fadeUp} custom={1}>
              <Card3D interactive glowColor={netCashFlow >= 0 ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)"} className="h-full">
                <div className="p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className={`h-6 w-6 ${netCashFlow >= 0 ? "text-success" : "text-destructive"}`} />
                    <span className="text-xs text-muted-foreground font-medium">Sobra Mensal</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">O que sobra todo mês</p>
                  <p className={`text-2xl font-bold tracking-tight tabular-nums ${netCashFlow >= 0 ? "text-success" : "text-destructive"}`}>
                    {netCashFlow >= 0 ? "+" : ""}{fmtShort(netCashFlow)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {savingsRate > 0 ? `Você guarda ${savingsRate}% da renda` : "Gastos maiores que a renda"}
                  </p>
                </div>
              </Card3D>
            </motion.div>

            {/* Emergency Reserve */}
            <motion.div variants={fadeUp} custom={2}>
              <Card3D interactive glowColor={emergencyMonths >= 6 ? "rgba(52,211,153,0.08)" : "rgba(245,158,11,0.08)"} className="h-full">
                <div className="p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className={`h-6 w-6 ${emergencyMonths >= 6 ? "text-success" : emergencyMonths >= 3 ? "text-warning" : "text-destructive"}`} />
                    <span className="text-xs text-muted-foreground font-medium">Reserva de Emergência</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">Quanto tempo você aguenta sem renda</p>
                  <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
                    {emergencyMonths} <span className="text-base font-medium text-muted-foreground">meses</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {emergencyMonths >= 6 ? "Reserva saudável ✓" : emergencyMonths >= 3 ? "Quase no ideal de 6 meses" : "O ideal é ter 6 meses"}
                  </p>
                </div>
              </Card3D>
            </motion.div>
          </div>

          {/* Row 2: Income vs Expenses breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={fadeUp} custom={3}>
              <Card3D>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center">
                        <PiggyBank className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-foreground">Renda Mensal</span>
                        <p className="text-[11px] text-muted-foreground">Tudo que entra por mês</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-success tabular-nums">{fmtShort(totalIncome)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-success transition-all" style={{ width: "100%" }} />
                  </div>
                </div>
              </Card3D>
            </motion.div>

            <motion.div variants={fadeUp} custom={4}>
              <Card3D>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-foreground">Gastos Mensais</span>
                        <p className="text-[11px] text-muted-foreground">Tudo que sai por mês</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-destructive tabular-nums">{fmtShort(totalExpenses)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-destructive/70 transition-all" style={{ width: `${totalIncome > 0 ? Math.min(100, Math.round((totalExpenses / totalIncome) * 100)) : 0}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {totalIncome > 0 ? `${Math.round((totalExpenses / totalIncome) * 100)}% da sua renda vai para gastos` : "—"}
                  </p>
                </div>
              </Card3D>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ── Plan Progress + Gamification Push ── */}
      {actionProgress && actionProgress.total > 0 && (() => {
        const milestones = [
          { pct: 25, emoji: "🔥", label: "Início Forte", color: "#f97316", unlocked: planPct >= 25 },
          { pct: 50, emoji: "⭐", label: "Metade do Caminho", color: "#eab308", unlocked: planPct >= 50 },
          { pct: 75, emoji: "🏅", label: "Quase Lá", color: "#3b82f6", unlocked: planPct >= 75 },
          { pct: 100, emoji: "👑", label: "Plano Completo", color: "#a855f7", unlocked: planPct >= 100 },
        ];
        const currentMilestone = [...milestones].reverse().find(m => m.unlocked);
        const nextMilestone = milestones.find(m => !m.unlocked);

        return (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            {/* Progress bar card */}
            <Card3D interactive glowColor="rgba(96,165,250,0.08)">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Plano de Ação</p>
                      <p className="text-[11px] text-muted-foreground">{actionProgress.done} de {actionProgress.total} concluídas</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-primary tabular-nums">{planPct}%</span>
                </div>
                <Progress value={planPct} className="h-2 rounded-full" />

                {/* Push notification — next milestone or celebration */}
                {planPct === 100 ? (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(52,211,153,0.08))",
                      border: "1px solid rgba(168,85,247,0.15)",
                    }}
                  >
                    <span className="text-base">👑</span>
                    <span className="text-xs font-semibold text-foreground">Plano 100% concluído! Você é incrível! 🎉</span>
                  </motion.div>
                ) : nextMilestone ? (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/20"
                  >
                    <span className="text-base">{currentMilestone?.emoji || "🎯"}</span>
                    <p className="text-[11px] text-muted-foreground flex-1">
                      Faltam <span className="font-bold text-foreground">{nextMilestone.pct - planPct}%</span> para "{nextMilestone.label}" {nextMilestone.emoji}
                    </p>
                  </motion.div>
                ) : null}

                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/cliente/plano-acao")} className="text-[11px] text-primary hover:text-primary gap-1 h-7 px-2">
                    Ver próximas tarefas <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card3D>
          </motion.div>
        );
      })()}

      {/* ── Seus dados consolidados ── */}
      {hasOnboardingData && (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <ClipboardList className="h-6 w-6 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Seus dados consolidados</h2>
              <p className="text-[11px] text-muted-foreground">Visão completa do seu onboarding atualizada</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Renda */}
            <motion.div variants={fadeUp} custom={0}>
              <Card3D interactive glowColor="rgba(52,211,153,0.08)" className="h-full">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center">
                      <PiggyBank className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground">Renda</span>
                      <p className="text-[11px] text-muted-foreground">{incomeItems.length} {incomeItems.length === 1 ? "fonte" : "fontes"}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-success tracking-tight tabular-nums">{fmtCurrencyFull(totalIncome)}</p>
                  {topIncome.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {topIncome.map((i) => (
                        <li key={i.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground truncate pr-2">{i.description}</span>
                          <span className="font-semibold text-foreground tabular-nums">{fmtShort(i.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card3D>
            </motion.div>

            {/* Despesas */}
            <motion.div variants={fadeUp} custom={1}>
              <Card3D interactive glowColor="rgba(239,68,68,0.08)" className="h-full">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground">Despesas</span>
                      <p className="text-[11px] text-muted-foreground">{Object.keys(expensesByCategory).length} {Object.keys(expensesByCategory).length === 1 ? "categoria" : "categorias"}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-destructive tracking-tight tabular-nums">{fmtCurrencyFull(totalExpenses)}</p>
                  {topExpenses.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {topExpenses.map((e) => (
                        <li key={e.category} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground truncate pr-2 capitalize">{e.category}</span>
                          <span className="font-semibold text-foreground tabular-nums">{fmtShort(e.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card3D>
            </motion.div>

            {/* Dívidas */}
            <motion.div variants={fadeUp} custom={2}>
              <Card3D interactive glowColor="rgba(245,158,11,0.08)" className="h-full">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground">Dívidas</span>
                      <p className="text-[11px] text-muted-foreground">{debtItems.length} {debtItems.length === 1 ? "dívida" : "dívidas"}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-warning tracking-tight tabular-nums">{fmtCurrencyFull(totalDebts)}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Parcela mensal</span>
                    <span className="font-semibold text-foreground tabular-nums">{fmtCurrencyFull(totalMonthlyDebtPayments)}</span>
                  </div>
                </div>
              </Card3D>
            </motion.div>

            {/* Patrimônio */}
            <motion.div variants={fadeUp} custom={3}>
              <Card3D interactive glowColor="rgba(96,165,250,0.08)" className="h-full">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Landmark className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground">Patrimônio</span>
                      <p className="text-[11px] text-muted-foreground">{assetItems.length} {assetItems.length === 1 ? "ativo" : "ativos"}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-primary tracking-tight tabular-nums">{fmtCurrencyFull(totalAssets)}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Patrimônio líquido</span>
                    <span className={`font-semibold tabular-nums ${netWorth >= 0 ? "text-success" : "text-destructive"}`}>
                      {fmtCurrencyFull(netWorth)}
                    </span>
                  </div>
                </div>
              </Card3D>
            </motion.div>

            {/* Seguros */}
            <motion.div variants={fadeUp} custom={4}>
              <Card3D interactive glowColor="rgba(168,85,247,0.08)" className="h-full">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground">Seguros</span>
                      <p className="text-[11px] text-muted-foreground">{insuranceItems.length} {insuranceItems.length === 1 ? "apólice" : "apólices"}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-accent tracking-tight tabular-nums">{fmtCurrencyFull(totalInsuranceCoverage)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">cobertura total</p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Prêmio mensal</span>
                    <span className="font-semibold text-foreground tabular-nums">{fmtCurrencyFull(totalInsurancePremium)}</span>
                  </div>
                </div>
              </Card3D>
            </motion.div>

            {/* Objetivos */}
            <motion.div variants={fadeUp} custom={5}>
              <Card3D interactive glowColor="rgba(96,165,250,0.08)" className="h-full">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground">Objetivos</span>
                      <p className="text-[11px] text-muted-foreground">{goalItems.length} {goalItems.length === 1 ? "objetivo" : "objetivos"}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-foreground tracking-tight tabular-nums">{fmtCurrencyFull(totalGoalsTarget)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">meta total acumulada</p>
                </div>
              </Card3D>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ── Histórico mensal de evolução ── */}
      {monthlyClosings.length >= 1 && (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <History className="h-6 w-6 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Sua evolução mês a mês</h2>
              <p className="text-[11px] text-muted-foreground">Acompanhe a transformação do seu patrimônio</p>
            </div>
          </div>

          {/* Gráfico */}
          <motion.div variants={fadeUp} custom={0}>
            <Card3D>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Patrimônio, ativos e dívidas</span>
                </div>
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={closingsChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradAtivos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradDividas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtShort(Number(v))} />
                      <RTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = {
                            patrimonio: "Patrimônio líquido",
                            ativos: "Ativos",
                            dividas: "Dívidas",
                          };
                          return [fmtCurrencyFull(Number(value)), labels[name] || name];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "11px" }}
                        formatter={(value) => {
                          const labels: Record<string, string> = {
                            patrimonio: "Patrimônio líquido",
                            ativos: "Ativos",
                            dividas: "Dívidas",
                          };
                          return labels[value] || value;
                        }}
                      />
                      <Area type="monotone" dataKey="ativos" stroke="hsl(var(--success))" fill="url(#gradAtivos)" strokeWidth={2} />
                      <Area type="monotone" dataKey="dividas" stroke="hsl(var(--destructive))" fill="url(#gradDividas)" strokeWidth={2} />
                      <Area type="monotone" dataKey="patrimonio" stroke="hsl(var(--primary))" fill="url(#gradPatrimonio)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card3D>
          </motion.div>

          {/* Tabela compacta */}
          {lastClosings.length > 0 && (
            <motion.div variants={fadeUp} custom={1}>
              <Card3D>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-accent" />
                    <span className="text-xs font-semibold text-foreground">Últimos fechamentos</span>
                  </div>
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-[11px] min-w-[480px]">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/40">
                          <th className="text-left font-medium py-2 px-2">Mês</th>
                          <th className="text-right font-medium py-2 px-2">Renda</th>
                          <th className="text-right font-medium py-2 px-2">Despesas</th>
                          <th className="text-right font-medium py-2 px-2">Patrim. Líquido</th>
                          <th className="text-right font-medium py-2 px-2">Tx. Poupança</th>
                          <th className="text-right font-medium py-2 px-2">Plano %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastClosings.map((c, idx) => {
                          // calcula delta vs o fechamento anterior (cronológico)
                          const orderedIndex = monthlyClosings.findIndex((x) => x.month_ref === c.month_ref);
                          const prev = orderedIndex > 0 ? monthlyClosings[orderedIndex - 1] : null;
                          const deltaNet = prev ? (c.net_worth ?? 0) - (prev.net_worth ?? 0) : 0;
                          return (
                            <tr key={c.month_ref} className={`${idx > 0 ? "border-t border-border/20" : ""}`}>
                              <td className="py-2 px-2 font-medium text-foreground capitalize">{fmtMonthLabel(c.month_ref)}</td>
                              <td className="py-2 px-2 text-right tabular-nums text-emerald-500">{fmtShort(c.total_income ?? 0)}</td>
                              <td className="py-2 px-2 text-right tabular-nums text-rose-500">{fmtShort(c.total_expenses ?? 0)}</td>
                              <td className="py-2 px-2 text-right tabular-nums font-semibold text-foreground">
                                {fmtShort(c.net_worth ?? 0)}
                                {prev && deltaNet !== 0 && (
                                  <span className={`block text-[9px] font-normal ${deltaNet >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                    {deltaNet >= 0 ? "+" : ""}{fmtShort(deltaNet)}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                {c.savings_rate != null ? `${Math.round(c.savings_rate)}%` : "—"}
                              </td>
                              <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                {c.plan_completion_pct != null ? `${Math.round(c.plan_completion_pct)}%` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card3D>
            </motion.div>
          )}

          {/* Mini stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div variants={fadeUp} custom={2}>
              <Card3D className="h-full">
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className={`h-4 w-4 ${totalEvolution >= 0 ? "text-success" : "text-destructive"}`} />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Evolução total</span>
                  </div>
                  <p className={`text-lg font-black tabular-nums tracking-tight ${totalEvolution >= 0 ? "text-success" : "text-destructive"}`}>
                    {totalEvolution >= 0 ? "+" : ""}{fmtShort(totalEvolution)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">patrimônio líquido</p>
                </div>
              </Card3D>
            </motion.div>
            <motion.div variants={fadeUp} custom={3}>
              <Card3D className="h-full">
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PiggyBank className="h-4 w-4 text-accent" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Tx. poupança média</span>
                  </div>
                  <p className="text-lg font-black tabular-nums tracking-tight text-foreground">{avgSavingsRate}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">no período</p>
                </div>
              </Card3D>
            </motion.div>
            <motion.div variants={fadeUp} custom={4}>
              <Card3D className="h-full">
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Meses fechados</span>
                  </div>
                  <p className="text-lg font-black tabular-nums tracking-tight text-foreground">{monthlyClosings.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{monthlyClosings.length === 1 ? "fechamento" : "fechamentos"}</p>
                </div>
              </Card3D>
            </motion.div>
            <motion.div variants={fadeUp} custom={5}>
              <Card3D className="h-full">
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Período</span>
                  </div>
                  <p className="text-sm font-black tabular-nums tracking-tight text-foreground capitalize">{periodLabel}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">primeiro → último</p>
                </div>
              </Card3D>
            </motion.div>
          </div>
        </motion.div>
      )}

    </PageTransition>
  );
};

export default ClientDashboard;
