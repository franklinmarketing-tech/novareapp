import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  ArrowLeft, Save, TrendingUp, TrendingDown, Wallet, Shield,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Banknote, PiggyBank,
  Scale, CircleDollarSign, FileText, Activity, Gauge, Target,
} from "lucide-react";
import { sendClientEmail } from "@/lib/sendClientEmail";

// ── Palette ──────────────────────────────────────────

const CHART_COLORS = [
  "hsl(215, 50%, 23%)",
  "hsl(16, 65%, 50%)",
  "hsl(152, 55%, 41%)",
  "hsl(38, 92%, 50%)",
  "hsl(260, 50%, 55%)",
  "hsl(190, 60%, 45%)",
  "hsl(340, 55%, 50%)",
  "hsl(0, 0%, 55%)",
];

// ── Types ────────────────────────────────────────────

interface DiagnosisData {
  totalIncome: number;
  totalExpenses: number;
  totalDebts: number;
  totalAssets: number;
  monthlyDebtPayments: number;
  savingsCapacity: number;
  debtRatio: number;
  riskClassification: string;
  expensesByCategory: { category: string; amount: number; percentage: number }[];
  incomeBreakdown: { description: string; amount: number; frequency: string }[];
  debtBreakdown: { type: string; total_amount: number; monthly_payment: number; interest_rate: number | null; creditor: string | null }[];
  assetBreakdown: { type: string; estimated_value: number; description: string | null }[];
}

// ── Classification config ────────────────────────────

const classificationConfig: Record<string, {
  label: string;
  emoji: string;
  gradient: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  description: string;
  advice: string;
}> = {
  A: {
    label: "Excelente",
    emoji: "🟢",
    gradient: "from-emerald-500/10 to-emerald-500/5",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    description: "Capacidade de poupança acima de 30%",
    advice: "Cliente com excelente saúde financeira. Foco em otimização e crescimento patrimonial.",
  },
  B: {
    label: "Bom",
    emoji: "🔵",
    gradient: "from-blue-500/10 to-blue-500/5",
    textColor: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    description: "Capacidade de poupança entre 10% e 30%",
    advice: "Bom potencial. Trabalhar para aumentar poupança e diversificar investimentos.",
  },
  C: {
    label: "Neutro",
    emoji: "🟡",
    gradient: "from-amber-500/10 to-amber-500/5",
    textColor: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    description: "Capacidade de poupança entre 0% e 10%",
    advice: "Precisa reduzir despesas e criar margem de poupança. Atenção ao orçamento.",
  },
  D: {
    label: "Atenção",
    emoji: "🟠",
    gradient: "from-orange-500/10 to-orange-500/5",
    textColor: "text-orange-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    description: "Déficit ou próximo de zero",
    advice: "Situação requer intervenção imediata na redução de despesas e renegociação de dívidas.",
  },
  E: {
    label: "Crítico",
    emoji: "🔴",
    gradient: "from-red-500/10 to-red-500/5",
    textColor: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    description: "Endividamento elevado, sem capacidade de honrar despesas",
    advice: "Situação crítica. Priorizar renegociação de dívidas e corte drástico de gastos.",
  },
};

function calculateRisk(savingsRate: number): string {
  if (savingsRate >= 30) return "A";
  if (savingsRate >= 10) return "B";
  if (savingsRate >= 0) return "C";
  if (savingsRate >= -10) return "D";
  return "E";
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ── Gauge component ──────────────────────────────────

const SavingsGauge = ({ value, label }: { value: number; label: string }) => {
  const clampedValue = Math.max(-30, Math.min(50, value));
  const normalized = ((clampedValue + 30) / 80) * 100;
  const gaugeColor = value >= 30 ? "hsl(152, 55%, 41%)" : value >= 10 ? "hsl(215, 50%, 45%)" : value >= 0 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 51%)";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-full max-w-[200px] h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${normalized}%`, backgroundColor: gaugeColor }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-2xl font-bold tabular-nums" style={{ color: gaugeColor }}>
          {value >= 0 ? "+" : ""}{fmtPct(value)}
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
};

// ── Metric card ──────────────────────────────────────

const MetricCard = ({
  label, value, icon: Icon, trend, subtitle, className = "",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  className?: string;
}) => {
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Activity;

  return (
    <Card className={`group hover:shadow-lg transition-shadow duration-300 ${className}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-xl bg-muted/60">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          {trend && <TrendIcon className={`h-6 w-6 ${trendColor}`} />}
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight leading-none mb-1">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};

// ── Main component ───────────────────────────────────

const ClientDiagnosis = () => {
  const { clientId } = useClientId();
  const navigate = useNavigate();
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [existingDiagnosisId, setExistingDiagnosisId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      setLoading(true);
      const [incomeRes, expenseRes, debtRes, assetRes, diagRes] = await Promise.all([
        supabase.from("income").select("*").eq("client_id", clientId),
        supabase.from("expenses").select("*").eq("client_id", clientId),
        supabase.from("debts").select("*").eq("client_id", clientId),
        supabase.from("assets").select("*").eq("client_id", clientId),
        supabase.from("diagnosis").select("*").eq("client_id", clientId).maybeSingle(),
      ]);

      if (diagRes.data) {
        setExistingDiagnosisId(diagRes.data.id);
        setNotes(diagRes.data.notes || "");
      }

      const incomes = incomeRes.data || [];
      const expenses = expenseRes.data || [];
      const debts = debtRes.data || [];
      const assets = assetRes.data || [];

      const totalIncome = incomes.reduce((sum, i) => {
        const amt = i.amount || 0;
        return sum + (i.frequency === "anual" ? amt / 12 : amt);
      }, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalDebts = debts.reduce((sum, d) => sum + (d.total_amount || 0), 0);
      const monthlyDebtPayments = debts.reduce((sum, d) => sum + (d.monthly_payment || 0), 0);
      const totalAssets = assets.reduce((sum, a) => sum + (a.estimated_value || 0), 0);

      const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
      const savingsCapacity = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
      const debtRatio = totalIncome > 0 ? (monthlyDebtPayments / totalIncome) * 100 : 0;
      const riskClassification = calculateRisk(savingsCapacity);

      // Group expenses
      const catMap: Record<string, number> = {};
      expenses.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0); });
      const expensesByCategory = Object.entries(catMap)
        .map(([category, amount]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          amount,
          percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      const incomeBreakdown = incomes.map((i) => ({
        description: i.description,
        amount: i.frequency === "anual" ? (i.amount || 0) / 12 : (i.amount || 0),
        frequency: i.frequency,
      }));

      const debtBreakdown = debts.map((d) => ({
        type: d.type,
        total_amount: d.total_amount || 0,
        monthly_payment: d.monthly_payment || 0,
        interest_rate: d.interest_rate,
        creditor: d.creditor,
      }));

      const assetBreakdown = assets.map((a) => ({
        type: a.type,
        estimated_value: a.estimated_value || 0,
        description: a.description,
      }));

      setDiagnosis({
        totalIncome, totalExpenses, totalDebts, totalAssets, monthlyDebtPayments,
        savingsCapacity, debtRatio, riskClassification,
        expensesByCategory, incomeBreakdown, debtBreakdown, assetBreakdown,
      });
      setLoading(false);
    };
    load();
  }, [clientId]);

  const handleSave = async () => {
    if (!clientId || !diagnosis) return;
    setSaving(true);
    const payload = {
      client_id: clientId,
      total_income: diagnosis.totalIncome,
      total_expenses: diagnosis.totalExpenses,
      total_debts: diagnosis.totalDebts,
      total_assets: diagnosis.totalAssets,
      savings_capacity: diagnosis.savingsCapacity,
      debt_ratio: diagnosis.debtRatio,
      risk_classification: diagnosis.riskClassification as any,
      notes: notes || null,
    };
    if (existingDiagnosisId) {
      await supabase.from("diagnosis").update(payload).eq("id", existingDiagnosisId);
    } else {
      const { data } = await supabase.from("diagnosis").insert(payload).select("id").single();
      if (data) setExistingDiagnosisId(data.id);
    }
    await supabase.from("clients").update({ status: "em_diagnostico" as any }).eq("id", clientId);
    sendClientEmail(clientId, "diagnosis-update", {
      totalIncome: diagnosis.totalIncome,
      totalExpenses: diagnosis.totalExpenses,
      riskClassification: diagnosis.riskClassification,
      savingsCapacity: diagnosis.savingsCapacity,
    });
    toast({ title: "Diagnóstico salvo!", description: "Os dados foram registrados com sucesso." });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="animate-pulse text-muted-foreground">Calculando diagnóstico...</span>
      </div>
    );
  }
  if (!diagnosis) return null;

  const risk = classificationConfig[diagnosis.riskClassification] || classificationConfig.C;
  const netCashFlow = diagnosis.totalIncome - diagnosis.totalExpenses;
  const netWealth = diagnosis.totalAssets - diagnosis.totalDebts;
  const expenseRatio = diagnosis.totalIncome > 0 ? (diagnosis.totalExpenses / diagnosis.totalIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clientes")} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Diagnóstico Financeiro</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Análise calculada automaticamente a partir dos dados do onboarding</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => navigate(`/admin/cliente/${clientSlug}/objetivos`)} className="gap-2 flex-1 sm:flex-none">
            <Target className="h-4 w-4" />
            Objetivos de Vida
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 flex-1 sm:flex-none">
            <Save className="h-6 w-6" />
            {saving ? "Salvando..." : "Salvar Diagnóstico"}
          </Button>
        </div>
      </div>

      {/* ── 1. Classification Hero ──────────────── */}
      <Card className={`border ${risk.borderColor} overflow-hidden`}>
        <div className={`bg-gradient-to-r ${risk.gradient}`}>
          <CardContent className="py-5 sm:py-6 px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6">
              <div className="flex items-start gap-4">
                {/* Grade badge */}
                <div className={`flex flex-col items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl ${risk.bgColor} shrink-0`}>
                  <span className={`text-2xl sm:text-3xl font-black ${risk.textColor}`}>{diagnosis.riskClassification}</span>
                  <span className={`text-[10px] font-semibold ${risk.textColor} mt-0.5`}>{risk.label}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{risk.description}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{risk.advice}</p>
                </div>
              </div>

              {/* Key indicators */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 lg:flex-1">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Poupança:</span>
                  <span className={`text-xs font-bold ${risk.textColor}`}>{fmtPct(diagnosis.savingsCapacity)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Comprometimento:</span>
                  <span className={`text-xs font-bold ${diagnosis.debtRatio > 30 ? "text-red-500" : "text-foreground"}`}>{fmtPct(diagnosis.debtRatio)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Despesas/Renda:</span>
                  <span className={`text-xs font-bold ${expenseRatio > 80 ? "text-orange-500" : "text-foreground"}`}>{fmtPct(expenseRatio)}</span>
                </div>
              </div>

              {/* Savings gauge */}
              <div className="shrink-0 w-full lg:w-auto flex justify-center lg:justify-end">
                <SavingsGauge value={diagnosis.savingsCapacity} label="Cap. de poupança" />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Actionable Insight ("E daí?") ──────── */}
      {(() => {
        const insights: { text: string; severity: "warning" | "destructive" | "success"; action?: string; actionLabel?: string }[] = [];
        if (diagnosis.savingsCapacity < 0) insights.push({ text: `O cliente gasta ${Math.abs(diagnosis.savingsCapacity).toFixed(0)}% mais do que ganha. Priorize corte de despesas.`, severity: "destructive" });
        if (diagnosis.debtRatio > 30) insights.push({ text: `${fmtPct(diagnosis.debtRatio)} da renda comprometida com dívidas — acima do limite saudável de 30%.`, severity: "warning" });
        if (expenseRatio > 80 && diagnosis.savingsCapacity >= 0) insights.push({ text: `Despesas consomem ${fmtPct(expenseRatio)} da renda. Margem de segurança perigosamente baixa.`, severity: "warning" });
        if (diagnosis.savingsCapacity >= 20) insights.push({ text: `Excelente capacidade de poupança de ${fmtPct(diagnosis.savingsCapacity)}. Continue desenvolvendo sua estratégia no Parecer.`, severity: "success" });
        if (insights.length === 0 && diagnosis.savingsCapacity >= 0) insights.push({ text: `Situação estável com ${fmtPct(diagnosis.savingsCapacity)} de poupança. Há espaço para crescer.`, severity: "success" });

        return insights.slice(0, 2).map((ins, i) => {
          const colors = { warning: "border-warning/30 bg-warning/[0.04]", destructive: "border-destructive/30 bg-destructive/[0.04]", success: "border-success/30 bg-success/[0.04]" };
          const iconColor = { warning: "text-warning", destructive: "text-destructive", success: "text-success" };
          const InsIcon = ins.severity === "success" ? TrendingUp : AlertTriangle;
          return (
            <div key={i} className={`flex items-center gap-3 rounded-2xl border ${colors[ins.severity]} px-5 py-4`}>
              <InsIcon className={`h-6 w-6 ${iconColor[ins.severity]} shrink-0`} />
              <p className="text-sm text-foreground flex-1 font-medium">{ins.text}</p>
            </div>
          );
        });
      })()}

      {/* ── 2. KPI Cards ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Renda Mensal"
          value={fmt(diagnosis.totalIncome)}
          icon={Banknote}
          trend="up"
          subtitle={`${diagnosis.incomeBreakdown.length} fonte${diagnosis.incomeBreakdown.length !== 1 ? "s" : ""} de renda`}
          className="card-glow-success"
        />
        <MetricCard
          label="Despesas Mensais"
          value={fmt(diagnosis.totalExpenses)}
          icon={TrendingDown}
          trend="down"
          subtitle={`${fmtPct(expenseRatio)} da renda`}
        />
        <MetricCard
          label="Patrimônio Total"
          value={fmt(diagnosis.totalAssets)}
          icon={Wallet}
          trend="neutral"
          subtitle={`${diagnosis.assetBreakdown.length} ativo${diagnosis.assetBreakdown.length !== 1 ? "s" : ""}`}
          className="card-glow-primary"
        />
        <MetricCard
          label="Dívida Total"
          value={fmt(diagnosis.totalDebts)}
          icon={AlertTriangle}
          trend={diagnosis.totalDebts > 0 ? "down" : "neutral"}
          subtitle={diagnosis.monthlyDebtPayments > 0 ? `${fmt(diagnosis.monthlyDebtPayments)}/mês` : "Sem parcelas"}
          className={diagnosis.debtRatio > 30 ? "card-glow-destructive" : "card-glow-warning"}
        />
      </div>

      {/* ── 3. Cash Flow + Balance (visual) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cash Flow */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <CircleDollarSign className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-sm">Fluxo de Caixa Mensal</CardTitle>
                <CardDescription className="text-[11px]">Receitas vs Despesas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Visual bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Receitas</span>
                <span className="text-sm font-semibold text-emerald-600">{fmt(diagnosis.totalIncome)}</span>
              </div>
              <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Despesas</span>
                <span className="text-sm font-semibold text-red-500">- {fmt(diagnosis.totalExpenses)}</span>
              </div>
              <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(expenseRatio, 100)}%` }} />
              </div>
            </div>
            {diagnosis.monthlyDebtPayments > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Parcelas dívidas</span>
                  <span className="text-sm font-semibold text-orange-500">- {fmt(diagnosis.monthlyDebtPayments)}</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(diagnosis.totalIncome > 0 ? (diagnosis.monthlyDebtPayments / diagnosis.totalIncome) * 100 : 0, 100)}%` }} />
                </div>
              </div>
            )}
            <div className="pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Saldo Líquido</span>
              <span className={`text-xl font-bold ${netCashFlow >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {netCashFlow >= 0 ? "+" : ""}{fmt(netCashFlow)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Balance Sheet */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Scale className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-sm">Balanço Patrimonial</CardTitle>
                <CardDescription className="text-[11px]">Ativos vs Passivos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Ativos</span>
                <span className="text-sm font-semibold text-blue-600">{fmt(diagnosis.totalAssets)}</span>
              </div>
              <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Passivos (dívidas)</span>
                <span className="text-sm font-semibold text-red-500">- {fmt(diagnosis.totalDebts)}</span>
              </div>
              <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full"
                  style={{ width: `${diagnosis.totalAssets > 0 ? Math.min((diagnosis.totalDebts / diagnosis.totalAssets) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Patrimônio Líquido</span>
              <span className={`text-xl font-bold ${netWealth >= 0 ? "text-blue-600" : "text-red-500"}`}>
                {netWealth >= 0 ? "" : "-"}{fmt(Math.abs(netWealth))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Expense Breakdown ────────────────── */}
      {diagnosis.expensesByCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <TrendingDown className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle className="text-sm">Despesas por Categoria</CardTitle>
                <CardDescription className="text-[11px]">Distribuição dos gastos mensais — {diagnosis.expensesByCategory.length} categorias</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart */}
              <div className="flex items-center justify-center">
                <div className="h-48 sm:h-56 w-full max-w-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={diagnosis.expensesByCategory}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={55}
                        strokeWidth={3}
                        stroke="hsl(var(--card))"
                      >
                        {diagnosis.expensesByCategory.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => fmt(value)}
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "12px",
                          padding: "8px 12px",
                          boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legend list */}
              <div className="space-y-2">
                {diagnosis.expensesByCategory.map((cat, i) => {
                  const isHighest = i === 0;
                  return (
                    <div
                      key={cat.category}
                      className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${isHighest ? "bg-muted/40" : "hover:bg-muted/20"}`}
                    >
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-sm text-foreground flex-1 truncate">{cat.category}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px] px-1.5 font-normal">
                          {cat.percentage}%
                        </Badge>
                        <span className="text-sm font-semibold text-foreground tabular-nums w-[110px] text-right">
                          {fmt(cat.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 5. Income + Assets + Debts breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Income */}
        {diagnosis.incomeBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <CardTitle className="text-sm">Fontes de Renda</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {diagnosis.incomeBreakdown.map((inc, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{inc.description}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{inc.frequency}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums ml-3">{fmt(inc.amount)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between px-2">
                  <span className="text-xs font-medium text-muted-foreground">Total mensal</span>
                  <span className="text-sm font-bold text-foreground">{fmt(diagnosis.totalIncome)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assets */}
        {diagnosis.assetBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Wallet className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-sm">Patrimônio</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {diagnosis.assetBreakdown.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate capitalize">{asset.type}</p>
                      {asset.description && <p className="text-[10px] text-muted-foreground truncate">{asset.description}</p>}
                    </div>
                    <span className="text-sm font-semibold text-blue-600 tabular-nums ml-3">{fmt(asset.estimated_value)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between px-2">
                  <span className="text-xs font-medium text-muted-foreground">Total</span>
                  <span className="text-sm font-bold text-foreground">{fmt(diagnosis.totalAssets)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debts */}
        {diagnosis.debtBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <CardTitle className="text-sm">Dívidas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {diagnosis.debtBreakdown.map((debt, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate capitalize">{debt.type}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {debt.creditor && <span className="text-[10px] text-muted-foreground">{debt.creditor}</span>}
                        {debt.interest_rate != null && debt.interest_rate > 0 && (
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${debt.interest_rate > 5 ? "border-red-300 text-red-500" : "border-border"}`}>
                            {debt.interest_rate}% a.m.
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold text-red-500 tabular-nums">{fmt(debt.total_amount)}</p>
                      {debt.monthly_payment > 0 && (
                        <p className="text-[10px] text-muted-foreground">{fmt(debt.monthly_payment)}/mês</p>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between px-2">
                  <span className="text-xs font-medium text-muted-foreground">Total</span>
                  <span className="text-sm font-bold text-red-500">{fmt(diagnosis.totalDebts)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
};

export default ClientDiagnosis;
