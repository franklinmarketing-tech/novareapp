// V9: Diagnostico reformulado
// - IA dispara automaticamente ao abrir (analyze-diagnosis)
// - Resumo + insights estruturados (criticos / alertas / oportunidades / pontos fortes)
// - Visual coerente com a jornada (chips, cards, hierarquia consultiva)
// - Botao Objetivos de Vida abre Dialog com <AdminObjetivos />
// - CTA "Avancar para Parecer" no rodape
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useClientId, useSelectedMonth, ensureMonth } from "@/contexts/ClientContext";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Flame,
  Gauge,
  Lightbulb,
  Loader2,
  PiggyBank,
  RefreshCw,
  Scale,
  Sparkles,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import AdminObjetivos from "@/pages/admin/AdminObjetivos";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  RadialBarChart,
  RadialBar,
} from "recharts";

// ── Tipos ───────────────────────────────────────────────

interface DiagnosisData {
  totalIncome: number;
  totalExpenses: number;
  totalDebts: number;
  totalAssets: number;
  monthlyDebtPayments: number;
  savingsCapacity: number;
  debtRatio: number;
  expenseRatio: number;
  riskClassification: string;
  expensesByCategory: { category: string; amount: number; percentage: number }[];
  incomeBreakdown: { description: string; amount: number; frequency: string }[];
  debtBreakdown: {
    type: string;
    total_amount: number;
    monthly_payment: number;
    interest_rate: number | null;
    creditor: string | null;
  }[];
  assetBreakdown: { type: string; estimated_value: number; description: string | null }[];
}

interface Insight {
  kind: "critico" | "alerta" | "oportunidade" | "ponto_forte";
  severity: "alta" | "media" | "baixa";
  title: string;
  description: string;
  metric_value?: number;
  metric_label?: string;
  suggested_action?: string;
}

// ── Constantes visuais ──────────────────────────────────

const CHART_COLORS = [
  "hsl(215, 50%, 35%)",
  "hsl(16, 65%, 50%)",
  "hsl(152, 55%, 41%)",
  "hsl(38, 92%, 50%)",
  "hsl(260, 50%, 55%)",
  "hsl(190, 60%, 45%)",
  "hsl(340, 55%, 50%)",
  "hsl(0, 0%, 55%)",
];

const classificationConfig: Record<
  string,
  {
    label: string;
    gradient: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    description: string;
    advice: string;
  }
> = {
  A: {
    label: "Excelente",
    gradient: "from-emerald-500/15 to-emerald-500/5",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/25",
    description: "Capacidade de poupança acima de 30%",
    advice: "Excelente saúde financeira. Foco em otimização e crescimento patrimonial.",
  },
  B: {
    label: "Bom",
    gradient: "from-blue-500/15 to-blue-500/5",
    textColor: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/25",
    description: "Capacidade de poupança entre 10% e 30%",
    advice: "Bom potencial. Trabalhar para aumentar poupança e diversificar.",
  },
  C: {
    label: "Neutro",
    gradient: "from-amber-500/15 to-amber-500/5",
    textColor: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/25",
    description: "Capacidade de poupança entre 0% e 10%",
    advice: "Precisa reduzir despesas e criar margem de poupança.",
  },
  D: {
    label: "Atenção",
    gradient: "from-orange-500/15 to-orange-500/5",
    textColor: "text-orange-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/25",
    description: "Déficit ou próximo de zero",
    advice: "Requer intervenção imediata em despesas e dívidas.",
  },
  E: {
    label: "Crítico",
    gradient: "from-red-500/15 to-red-500/5",
    textColor: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/25",
    description: "Endividamento elevado",
    advice: "Situação crítica. Priorizar renegociação e corte drástico.",
  },
};

const calculateRisk = (savingsRate: number): string => {
  if (savingsRate >= 30) return "A";
  if (savingsRate >= 10) return "B";
  if (savingsRate >= 0) return "C";
  if (savingsRate >= -10) return "D";
  return "E";
};

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const INSIGHT_TONES: Record<
  Insight["kind"],
  { label: string; bg: string; border: string; iconBg: string; icon: React.ElementType; emoji: string }
> = {
  critico: {
    label: "Crítico",
    bg: "bg-red-500/[0.06]",
    border: "border-red-500/35",
    iconBg: "bg-red-500/15 text-red-600",
    icon: AlertTriangle,
    emoji: "🚨",
  },
  alerta: {
    label: "Atenção",
    bg: "bg-amber-500/[0.06]",
    border: "border-amber-500/35",
    iconBg: "bg-amber-500/15 text-amber-600",
    icon: Flame,
    emoji: "⚠️",
  },
  oportunidade: {
    label: "Oportunidade",
    bg: "bg-accent/[0.05]",
    border: "border-accent/30",
    iconBg: "bg-accent/15 text-accent",
    icon: Lightbulb,
    emoji: "💡",
  },
  ponto_forte: {
    label: "Ponto forte",
    bg: "bg-success/[0.06]",
    border: "border-success/30",
    iconBg: "bg-success/15 text-success",
    icon: CheckCircle2,
    emoji: "✅",
  },
};

// ── Componente principal ────────────────────────────────

const ClientDiagnosis = () => {
  const { clientId } = useClientId();
  const { selectedMonth } = useSelectedMonth();
  const activeMonth = ensureMonth(selectedMonth);
  const navigate = useNavigate();
  const { clientSlug } = useParams<{ clientSlug: string }>();

  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [existingDiagnosisId, setExistingDiagnosisId] = useState<string | null>(null);

  const [objetivosOpen, setObjetivosOpen] = useState(false);

  // IA insights
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiInsights, setAiInsights] = useState<Insight[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiTriggered, setAiTriggered] = useState(false);
  const [aiAnalyzedAt, setAiAnalyzedAt] = useState<string | null>(null);
  // true = já existe análise salva, não dispara automático
  const [aiAlreadySaved, setAiAlreadySaved] = useState(false);

  // ── Carga inicial dos dados ──────────────────────
  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      setLoading(true);
      const [incomeRes, expenseRes, debtRes, assetRes, diagRes] = await Promise.all([
        supabase.from("income").select("*").eq("client_id", clientId).eq("month_ref", activeMonth),
        supabase.from("expenses").select("*").eq("client_id", clientId).eq("month_ref", activeMonth),
        supabase.from("debts").select("*").eq("client_id", clientId).eq("month_ref", activeMonth),
        supabase.from("assets").select("*").eq("client_id", clientId).eq("month_ref", activeMonth),
        supabase.from("diagnosis").select("*").eq("client_id", clientId).eq("month_ref", activeMonth).maybeSingle(),
      ]);

      if (diagRes.data) {
        setExistingDiagnosisId(diagRes.data.id);
        if (diagRes.data.ai_summary) {
          setAiSummary(diagRes.data.ai_summary as string);
          setAiInsights(
            ((diagRes.data.ai_insights as unknown as Insight[]) || []).sort((a, b) => {
              const orderKind = { critico: 0, alerta: 1, oportunidade: 2, ponto_forte: 3 };
              const orderSev = { alta: 0, media: 1, baixa: 2 };
              return (
                orderKind[a.kind] - orderKind[b.kind] || orderSev[a.severity] - orderSev[b.severity]
              );
            })
          );
          setAiAnalyzedAt(diagRes.data.ai_analyzed_at as string | null);
          setAiAlreadySaved(true);
        }
      }

      const incomes = incomeRes.data || [];
      const expenses = expenseRes.data || [];
      const debts = debtRes.data || [];
      const assets = assetRes.data || [];

      const totalIncome = incomes.reduce((s, i) => {
        const a = i.amount || 0;
        return s + (i.frequency === "anual" ? a / 12 : a);
      }, 0);
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalDebts = debts.reduce((s, d) => s + (d.total_amount || 0), 0);
      const monthlyDebtPayments = debts.reduce((s, d) => s + (d.monthly_payment || 0), 0);
      const totalAssets = assets.reduce((s, a) => s + (a.estimated_value || 0), 0);

      const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
      const savingsCapacity = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
      const debtRatio = totalIncome > 0 ? (monthlyDebtPayments / totalIncome) * 100 : 0;
      const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
      const riskClassification = calculateRisk(savingsCapacity);

      const catMap: Record<string, number> = {};
      expenses.forEach((e) => {
        catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0);
      });
      const expensesByCategory = Object.entries(catMap)
        .map(([category, amount]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          amount,
          percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      const incomeBreakdown = incomes.map((i) => ({
        description: i.description,
        amount: i.frequency === "anual" ? (i.amount || 0) / 12 : i.amount || 0,
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

      const data: DiagnosisData = {
        totalIncome,
        totalExpenses,
        totalDebts,
        totalAssets,
        monthlyDebtPayments,
        savingsCapacity,
        debtRatio,
        expenseRatio,
        riskClassification,
        expensesByCategory,
        incomeBreakdown,
        debtBreakdown,
        assetBreakdown,
      };
      setDiagnosis(data);

      // Auto-save diagnosis row (sem campo de notes manual)
      const payload = {
        client_id: clientId,
        month_ref: activeMonth,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        total_debts: totalDebts,
        total_assets: totalAssets,
        savings_capacity: savingsCapacity,
        debt_ratio: debtRatio,
        risk_classification: riskClassification as any,
      };
      if (diagRes.data?.id) {
        await supabase.from("diagnosis").update(payload).eq("id", diagRes.data.id);
      } else {
        const { data: created } = await supabase
          .from("diagnosis")
          .insert(payload)
          .select("id")
          .single();
        if (created) setExistingDiagnosisId(created.id);
      }
      await supabase
        .from("clients")
        .update({ status: "em_diagnostico" as any })
        .eq("id", clientId);

      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, activeMonth]);

  // ── Executa análise da IA e persiste no banco ────
  const runAnalyzeAI = async (silent = false) => {
    if (!clientId) return;
    setAiAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-diagnosis", {
        body: { clientId },
      });
      if (error) throw error;

      const summary = (data?.summary as string) || "";
      const insights = ((data?.insights as Insight[]) || []).sort((a, b) => {
        const orderKind = { critico: 0, alerta: 1, oportunidade: 2, ponto_forte: 3 };
        const orderSev = { alta: 0, media: 1, baixa: 2 };
        return (
          orderKind[a.kind] - orderKind[b.kind] || orderSev[a.severity] - orderSev[b.severity]
        );
      });
      const analyzedAt = new Date().toISOString();

      setAiSummary(summary);
      setAiInsights(insights);
      setAiAnalyzedAt(analyzedAt);
      setAiAlreadySaved(true);

      // Persiste no banco
      if (existingDiagnosisId) {
        await supabase
          .from("diagnosis")
          .update({ ai_summary: summary, ai_insights: insights as any, ai_analyzed_at: analyzedAt })
          .eq("id", existingDiagnosisId);
      }

      if (!silent) {
        toast.success("Análise concluída", {
          description: `${insights.length} insights gerados pela IA.`,
        });
      }
    } catch (e: any) {
      if (!silent) {
        toast.error("Erro ao analisar", {
          description: (e as any)?.message || "Tente novamente",
        });
      }
    }
    setAiAnalyzing(false);
  };

  // Dispara IA automaticamente apenas se não há análise salva
  useEffect(() => {
    if (!diagnosis || aiTriggered || !clientId || aiAlreadySaved) return;
    setAiTriggered(true);
    runAnalyzeAI(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnosis, clientId, aiAlreadySaved]);

  // ── Derivados visuais ────────────────────────────
  const risk = diagnosis ? classificationConfig[diagnosis.riskClassification] || classificationConfig.C : null;
  const netCashFlow = diagnosis ? diagnosis.totalIncome - diagnosis.totalExpenses - diagnosis.monthlyDebtPayments : 0;
  const netWealth = diagnosis ? diagnosis.totalAssets - diagnosis.totalDebts : 0;

  const groupedInsights = useMemo(() => {
    const groups: Record<Insight["kind"], Insight[]> = {
      critico: [],
      alerta: [],
      oportunidade: [],
      ponto_forte: [],
    };
    for (const i of aiInsights) groups[i.kind].push(i);
    return groups;
  }, [aiInsights]);

  // ── Render ───────────────────────────────────────
  if (loading || !diagnosis || !risk) return <LoadingState variant="page" rows={4} />;

  // Label legível do mês ativo
  const monthLabel = (() => {
    const [y, m] = activeMonth.split("-").map(Number);
    const names = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    return `${names[m - 1]} ${y}`;
  })();

  return (
    <div className="space-y-6">
      {/* ── HEADER ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-accent" />
            Diagnóstico Financeiro
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análise automática dos dados do mês ativo. A IA gera os insights iniciais para você refinar no Parecer.
          </p>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-novare-blue-light/40 dark:bg-novare-blue/15 border border-novare-blue/25">
            <CalendarDays className="h-3.5 w-3.5 text-novare-blue dark:text-novare-blue-bright" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-novare-blue/70 dark:text-novare-blue-bright/80">Mês ativo:</span>
            <span className="text-xs font-bold text-novare-blue dark:text-novare-blue-bright">{monthLabel}</span>
            <span className="text-[10px] text-muted-foreground ml-1">(altere em Onboarding)</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setObjetivosOpen(true)}
            className="gap-2 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent"
          >
            <Target className="h-4 w-4" />
            Objetivos de Vida
          </Button>
          <Button
            onClick={() => navigate(`/admin/cliente/${clientSlug}/parecer`)}
            className="bg-novare-terracotta hover:bg-novare-terracotta/90 text-white gap-2 shadow-sm shadow-novare-terracotta/25"
          >
            Ver Ações
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── 1. CLASSIFICAÇÃO HERO ─────────────────── */}
      <div
        className={cn("rounded-2xl border overflow-hidden", risk.borderColor)}
        style={{
          background: "hsl(var(--card))",
          boxShadow: "0 2px 12px -4px hsl(0 0% 0% / 0.08), 0 1px 3px hsl(0 0% 0% / 0.04)",
        }}
      >
        {/* Barra colorida topo */}
        <div className={cn("h-1 w-full bg-gradient-to-r", risk.gradient.replace("/15", "").replace("/5", "/60"))} />

        <div className={cn("bg-gradient-to-br", risk.gradient, "px-5 sm:px-6 py-5")}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">

            {/* Grade badge + descrição */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div
                className={cn(
                  "flex flex-col items-center justify-center h-[72px] w-[72px] rounded-2xl shrink-0 border",
                  risk.bgColor,
                  risk.borderColor,
                )}
                style={{
                  boxShadow: `0 0 0 4px hsl(var(--background)), 0 4px 16px -4px ${
                    risk.textColor.includes("emerald") ? "hsl(142 65% 42% / 0.35)"
                    : risk.textColor.includes("blue") ? "hsl(215 65% 55% / 0.35)"
                    : risk.textColor.includes("amber") ? "hsl(38 95% 48% / 0.35)"
                    : risk.textColor.includes("orange") ? "hsl(25 90% 50% / 0.35)"
                    : "hsl(0 72% 55% / 0.35)"
                  }`,
                }}
              >
                <span className={cn("text-[2rem] font-black leading-none", risk.textColor)}>
                  {diagnosis.riskClassification}
                </span>
                <span className={cn("text-[9px] font-bold uppercase tracking-widest mt-1", risk.textColor)}>
                  {risk.label}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-semibold text-foreground leading-snug">
                  {risk.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {risk.advice}
                </p>
              </div>
            </div>

            {/* Divider vertical (desktop) */}
            <div className="hidden sm:block self-stretch w-px bg-foreground/[0.08] shrink-0" />

            {/* Indicadores */}
            <div className="flex gap-3 shrink-0">
              <IndicatorMini
                icon={PiggyBank}
                label="Poupança"
                value={fmtPct(diagnosis.savingsCapacity)}
                tone={risk.textColor}
              />
              <IndicatorMini
                icon={Scale}
                label="Compromet."
                value={fmtPct(diagnosis.debtRatio)}
                tone={diagnosis.debtRatio > 30 ? "text-red-500" : "text-foreground"}
              />
              <IndicatorMini
                icon={Gauge}
                label="Desp./renda"
                value={fmtPct(diagnosis.expenseRatio)}
                tone={diagnosis.expenseRatio > 80 ? "text-orange-500" : "text-foreground"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. RESUMO DA IA + KPIs ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div
            className="rounded-2xl border border-accent/20 h-full overflow-hidden flex flex-col"
            style={{
              background: "hsl(var(--card))",
              boxShadow: "0 2px 12px -4px hsl(0 0% 0% / 0.06), 0 1px 3px hsl(0 0% 0% / 0.03)",
            }}
          >
            {/* Cabeçalho com gradiente sutil */}
            <div className="bg-gradient-to-br from-accent/[0.07] to-transparent border-b border-accent/15 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Ícone com ring sutil */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center ring-1 ring-accent/20 ring-offset-1 ring-offset-card">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">Diagnóstico pela IA</span>
                      <span className="bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full">
                        IA
                      </span>
                    </div>
                    {aiAnalyzedAt && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        Última análise:{" "}
                        {new Date(aiAnalyzedAt).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => runAnalyzeAI(false)}
                  disabled={aiAnalyzing}
                  className="gap-2 h-9 px-4 text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-lg shadow-accent/30 ring-1 ring-accent/40 hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shrink-0 rounded-full"
                >
                  {aiAnalyzing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Nova Análise
                </Button>
              </div>
            </div>

            {/* Corpo do card */}
            <div className="flex-1 px-5 py-5">
              {/* Estado: carregando */}
              {aiAnalyzing && !aiSummary && (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-accent" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                      <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">Gerando diagnóstico com IA</p>
                    <p className="text-xs text-muted-foreground">Analisando renda, despesas, dívidas e patrimônio...</p>
                  </div>
                  {/* Barra de progresso animada */}
                  <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent rounded-full"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Estado: com resultado */}
              {aiSummary && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-0.5 bg-accent/40 rounded-full shrink-0 mt-1" />
                    <p className="text-[0.9375rem] text-foreground leading-relaxed">{aiSummary}</p>
                  </div>
                  {aiInsights.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <Badge
                        variant="outline"
                        className="gap-1 text-[10px] border-accent/30 text-accent bg-accent/5"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {aiInsights.length} insights identificados
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">↓ veja abaixo</span>
                    </div>
                  )}
                </div>
              )}

              {/* Estado: sem análise ainda */}
              {!aiSummary && !aiAnalyzing && (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground/70">Nenhuma análise gerada</p>
                    <p className="text-xs text-muted-foreground">
                      Clique em Nova Análise para gerar o diagnóstico pela IA.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="py-5 px-5 space-y-3.5">
              <KpiLine label="Renda mensal" value={fmtBRL(diagnosis.totalIncome)} icon={TrendingUp} tone="text-emerald-600" />
              <KpiLine
                label="Despesas mensais"
                value={fmtBRL(diagnosis.totalExpenses + diagnosis.monthlyDebtPayments)}
                icon={TrendingDown}
                tone="text-red-500"
              />
              <KpiLine
                label="Saldo líquido"
                value={`${netCashFlow >= 0 ? "+" : ""}${fmtBRL(netCashFlow)}`}
                icon={Banknote}
                tone={netCashFlow >= 0 ? "text-success" : "text-destructive"}
              />
              <div className="border-t border-border/50 pt-3" />
              <KpiLine label="Ativos" value={fmtBRL(diagnosis.totalAssets)} icon={Wallet} tone="text-blue-600" />
              <KpiLine label="Dívidas" value={fmtBRL(diagnosis.totalDebts)} icon={CreditCard} tone="text-orange-500" />
              <KpiLine
                label="Patrimônio líquido"
                value={fmtBRL(netWealth)}
                icon={Scale}
                tone={netWealth >= 0 ? "text-blue-600" : "text-destructive"}
                bold
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 2.5. PAINEL DE GAUGES FINANCEIROS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 — Fluxo de Caixa */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Banknote className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              Fluxo de Caixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const flowData = [
                { name: "Renda", value: diagnosis.totalIncome, fill: "hsl(152, 55%, 41%)" },
                { name: "Despesas", value: diagnosis.totalExpenses, fill: "hsl(0, 70%, 65%)" },
                { name: "Dívidas", value: diagnosis.monthlyDebtPayments, fill: "hsl(25, 90%, 60%)" },
                {
                  name: "Saldo",
                  value: Math.max(
                    0,
                    diagnosis.totalIncome - diagnosis.totalExpenses - diagnosis.monthlyDebtPayments,
                  ),
                  fill: "hsl(215, 50%, 35%)",
                },
              ];
              const hasData = flowData.some((d) => d.value > 0);
              if (!hasData) {
                return (
                  <div className="h-[160px] flex items-center justify-center text-[11px] text-muted-foreground">
                    Sem dados de fluxo
                  </div>
                );
              }
              return (
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={flowData}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                      barCategoryGap={6}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={64}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RTooltip
                        formatter={(value: number) => fmtBRL(value)}
                        cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "12px",
                          padding: "8px 12px",
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                        {flowData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Card 2 — Saúde Financeira (Gauge) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Gauge className="h-3.5 w-3.5 text-accent" />
              </div>
              Saúde Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const rate = diagnosis.savingsCapacity;
              const clamped = Math.max(0, Math.min(100, rate));
              const color =
                rate >= 30
                  ? "hsl(152, 55%, 41%)"
                  : rate >= 10
                  ? "hsl(215, 65%, 55%)"
                  : rate >= 0
                  ? "hsl(38, 92%, 50%)"
                  : "hsl(0, 72%, 55%)";
              const label =
                rate >= 30 ? "Excelente" : rate >= 10 ? "Bom" : rate >= 0 ? "Neutro" : "Negativo";
              const gaugeData = [{ name: "Poupança", value: clamped, fill: color }];
              return (
                <div className="h-[160px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="75%"
                      innerRadius="80%"
                      outerRadius="130%"
                      barSize={14}
                      data={gaugeData}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        background={{ fill: "hsl(var(--muted) / 0.5)" }}
                        dataKey="value"
                        cornerRadius={8}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div
                    className="absolute inset-x-0 bottom-2 flex flex-col items-center pointer-events-none"
                  >
                    <span
                      className="text-2xl font-black tabular-nums leading-none"
                      style={{ color }}
                    >
                      {rate.toFixed(1)}%
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider mt-1"
                      style={{ color }}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Card 3 — Composição Patrimonial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Scale className="h-3.5 w-3.5 text-blue-600" />
              </div>
              Composição Patrimonial
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const wealthData = [
                { name: "Ativos", value: diagnosis.totalAssets, fill: "hsl(215, 65%, 50%)" },
                { name: "Dívidas", value: diagnosis.totalDebts, fill: "hsl(0, 70%, 55%)" },
              ].filter((d) => d.value > 0);
              if (wealthData.length === 0) {
                return (
                  <div className="h-[160px] flex items-center justify-center text-[11px] text-muted-foreground">
                    Sem dados patrimoniais
                  </div>
                );
              }
              return (
                <div className="h-[160px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={wealthData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={62}
                        strokeWidth={3}
                        stroke="hsl(var(--card))"
                      >
                        {wealthData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Pie>
                      <RTooltip
                        formatter={(value: number) => fmtBRL(value)}
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "12px",
                          padding: "8px 12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Líquido
                    </span>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums leading-tight",
                        netWealth >= 0 ? "text-blue-600" : "text-destructive",
                      )}
                    >
                      {fmtBRL(netWealth)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* ── 3. INSIGHTS DA IA AGRUPADOS ───────────── */}
      {aiInsights.length > 0 && (
        <div className="space-y-4">
          {/* Header da seção */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Pontos identificados pela IA</h3>
                <p className="text-[10px] text-muted-foreground">{aiInsights.length} pontos analisados</p>
              </div>
            </div>
            {/* Resumo por categoria — inline no header */}
            <div className="hidden sm:flex items-center gap-1.5">
              {(["critico", "alerta", "oportunidade", "ponto_forte"] as const).map((k) => {
                const tone = INSIGHT_TONES[k];
                const count = groupedInsights[k].length;
                const Icon = tone.icon;
                return (
                  <div
                    key={k}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border",
                      tone.bg, tone.border,
                      tone.iconBg.split(" ").find(c => c.startsWith("text-")) || "text-foreground"
                    )}
                  >
                    <Icon className="h-3 w-3" strokeWidth={2.5} />
                    <span>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid de cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence initial={false}>
              {aiInsights.map((ins, i) => (
                <InsightCard key={`${ins.kind}-${i}`} insight={ins} index={i} />
              ))}
            </AnimatePresence>
          </div>

          {/* Resumo mobile */}
          <div className="flex sm:hidden gap-2 flex-wrap">
            {(["critico", "alerta", "oportunidade", "ponto_forte"] as const).map((k) => {
              const tone = INSIGHT_TONES[k];
              const count = groupedInsights[k].length;
              const Icon = tone.icon;
              return (
                <div
                  key={k}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold border",
                    tone.bg, tone.border,
                    tone.iconBg.split(" ").find(c => c.startsWith("text-")) || "text-foreground"
                  )}
                >
                  <Icon className="h-3 w-3" strokeWidth={2.5} />
                  {count} {tone.label.toLowerCase()}{count !== 1 ? "s" : ""}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. DISTRIBUIÇÃO DE DESPESAS ─────────── */}
      {diagnosis.expensesByCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/10">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              Despesas por categoria
              <Badge variant="outline" className="text-[10px]">
                {diagnosis.expensesByCategory.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-center">
              <div className="h-48 sm:h-56 w-full max-w-[260px] mx-auto">
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
                    <RTooltip
                      formatter={(value: number) => fmtBRL(value)}
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "12px",
                        padding: "8px 12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1">
                {diagnosis.expensesByCategory.map((cat, i) => (
                  <div
                    key={cat.category}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-sm text-foreground flex-1 truncate">{cat.category}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 font-normal">
                      {cat.percentage}%
                    </Badge>
                    <span className="text-sm font-semibold text-foreground tabular-nums w-[100px] text-right">
                      {fmtBRL(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 5. DETALHES POR FONTE ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {diagnosis.incomeBreakdown.length > 0 && (
          <SourceCard
            title="Rendas"
            icon={TrendingUp}
            iconBg="bg-emerald-500/10 text-emerald-600"
            chartColor="hsl(152, 55%, 41%)"
            chartData={diagnosis.incomeBreakdown.map((i) => ({
              name: i.description,
              value: i.amount,
            }))}
            items={diagnosis.incomeBreakdown.map((i, idx) => ({
              key: `inc-${idx}`,
              primary: i.description,
              secondary: i.frequency,
              value: fmtBRL(i.amount),
              valueTone: "text-emerald-600",
            }))}
            totalLabel="Total mensal"
            totalValue={fmtBRL(diagnosis.totalIncome)}
          />
        )}
        {diagnosis.assetBreakdown.length > 0 && (
          <SourceCard
            title="Patrimônio"
            icon={Wallet}
            iconBg="bg-blue-500/10 text-blue-600"
            chartColor="hsl(215, 65%, 50%)"
            chartData={diagnosis.assetBreakdown.map((a) => ({
              name: a.type,
              value: a.estimated_value,
            }))}
            items={diagnosis.assetBreakdown.map((a, idx) => ({
              key: `ast-${idx}`,
              primary: a.type,
              secondary: a.description || undefined,
              value: fmtBRL(a.estimated_value),
              valueTone: "text-blue-600",
            }))}
            totalLabel="Total"
            totalValue={fmtBRL(diagnosis.totalAssets)}
          />
        )}
        {diagnosis.debtBreakdown.length > 0 && (
          <SourceCard
            title="Dívidas"
            icon={CreditCard}
            iconBg="bg-orange-500/10 text-orange-600"
            chartColor="hsl(0, 70%, 55%)"
            chartData={diagnosis.debtBreakdown.map((d) => ({
              name: d.type,
              value: d.total_amount,
            }))}
            items={diagnosis.debtBreakdown.map((d, idx) => ({
              key: `dbt-${idx}`,
              primary: d.type,
              secondary:
                [d.creditor, d.interest_rate ? `${d.interest_rate}% a.m.` : null]
                  .filter(Boolean)
                  .join(" · ") || undefined,
              value: fmtBRL(d.total_amount),
              valueTone: "text-red-500",
              extra: d.monthly_payment > 0 ? `${fmtBRL(d.monthly_payment)}/mês` : undefined,
            }))}
            totalLabel="Total"
            totalValue={fmtBRL(diagnosis.totalDebts)}
          />
        )}
      </div>

      {/* ── 6. CTA RODAPÉ ──────────────────────────── */}
      <JourneyFooterNav
        current="diagnostico"
        message="Diagnóstico concluído. Refine os pontos identificados pela IA junto com o cliente no Parecer."
      />

      {/* ── DIALOG OBJETIVOS ───────────────────────── */}
      <Dialog open={objetivosOpen} onOpenChange={setObjetivosOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-accent" />
              Objetivos de Vida / Desejos
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre e priorize os objetivos do cliente. Eles serão cruzados pela IA no Plano de Ação.
            </DialogDescription>
          </DialogHeader>
          <AdminObjetivos />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Subcomponentes ─────────────────────────────────────

const IndicatorMini = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) => (
  <div
    className="flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl min-w-[80px]"
    style={{
      background: "hsl(var(--background) / 0.6)",
      border: "1px solid hsl(var(--foreground) / 0.07)",
      backdropFilter: "blur(8px)",
    }}
  >
    <div className="flex items-center gap-1.5">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} />
      <span className="text-[10px] text-muted-foreground font-medium leading-none">{label}</span>
    </div>
    <span className={cn("text-xl font-black tabular-nums leading-none", tone)}>{value}</span>
  </div>
);

const KpiLine = ({
  icon: Icon,
  label,
  value,
  tone,
  bold,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
  bold?: boolean;
}) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
        <Icon className={cn("h-3.5 w-3.5", tone)} />
      </div>
      <span className={cn("text-xs text-muted-foreground truncate", bold && "font-semibold text-foreground")}>
        {label}
      </span>
    </div>
    <span className={cn("text-sm font-semibold tabular-nums shrink-0", tone, bold && "text-base font-bold")}>
      {value}
    </span>
  </div>
);

const INSIGHT_STYLES: Record<Insight["kind"], {
  borderColor: string; barGradient: string; bgGradient: string;
  iconRing: string; iconShadow: string;
  metricText: string; dividerGradient: string;
  calloutBg: string; calloutBorder: string;
  shadow: string; shadowHover: string;
}> = {
  critico: {
    borderColor: "hsl(0 72% 55% / 0.25)",
    barGradient: "linear-gradient(90deg, hsl(0 72% 55% / 0.9), hsl(0 72% 55% / 0.4), transparent)",
    bgGradient: "radial-gradient(ellipse at 0% 0%, hsl(0 72% 55% / 0.07) 0%, transparent 60%)",
    iconRing: "ring-red-500/25",
    iconShadow: "0 4px 12px -2px hsl(0 72% 55% / 0.3)",
    metricText: "text-red-600 dark:text-red-400",
    dividerGradient: "linear-gradient(90deg, hsl(0 72% 55% / 0.35), hsl(0 72% 55% / 0.08) 60%, transparent)",
    calloutBg: "hsl(0 72% 55% / 0.06)",
    calloutBorder: "hsl(0 72% 55% / 0.5)",
    shadow: "0 1px 3px hsl(0 0% 0% / 0.07), 0 4px 16px -4px hsl(0 72% 55% / 0.12)",
    shadowHover: "0 4px 24px -4px hsl(0 72% 55% / 0.25), 0 8px 32px -8px hsl(0 0% 0% / 0.1)",
  },
  alerta: {
    borderColor: "hsl(38 95% 48% / 0.25)",
    barGradient: "linear-gradient(90deg, hsl(38 95% 48% / 0.9), hsl(38 95% 48% / 0.4), transparent)",
    bgGradient: "radial-gradient(ellipse at 0% 0%, hsl(38 95% 48% / 0.07) 0%, transparent 60%)",
    iconRing: "ring-amber-500/25",
    iconShadow: "0 4px 12px -2px hsl(38 95% 48% / 0.3)",
    metricText: "text-amber-600 dark:text-amber-400",
    dividerGradient: "linear-gradient(90deg, hsl(38 95% 48% / 0.35), hsl(38 95% 48% / 0.08) 60%, transparent)",
    calloutBg: "hsl(38 95% 48% / 0.06)",
    calloutBorder: "hsl(38 95% 48% / 0.5)",
    shadow: "0 1px 3px hsl(0 0% 0% / 0.07), 0 4px 16px -4px hsl(38 95% 48% / 0.12)",
    shadowHover: "0 4px 24px -4px hsl(38 95% 48% / 0.25), 0 8px 32px -8px hsl(0 0% 0% / 0.1)",
  },
  oportunidade: {
    borderColor: "hsl(var(--accent) / 0.25)",
    barGradient: "linear-gradient(90deg, hsl(var(--accent) / 0.9), hsl(var(--accent) / 0.4), transparent)",
    bgGradient: "radial-gradient(ellipse at 0% 0%, hsl(var(--accent) / 0.07) 0%, transparent 60%)",
    iconRing: "ring-accent/25",
    iconShadow: "0 4px 12px -2px hsl(var(--accent) / 0.3)",
    metricText: "text-accent",
    dividerGradient: "linear-gradient(90deg, hsl(var(--accent) / 0.35), hsl(var(--accent) / 0.08) 60%, transparent)",
    calloutBg: "hsl(var(--accent) / 0.06)",
    calloutBorder: "hsl(var(--accent) / 0.5)",
    shadow: "0 1px 3px hsl(0 0% 0% / 0.07), 0 4px 16px -4px hsl(var(--accent) / 0.12)",
    shadowHover: "0 4px 24px -4px hsl(var(--accent) / 0.25), 0 8px 32px -8px hsl(0 0% 0% / 0.1)",
  },
  ponto_forte: {
    borderColor: "hsl(var(--success) / 0.25)",
    barGradient: "linear-gradient(90deg, hsl(var(--success) / 0.9), hsl(var(--success) / 0.4), transparent)",
    bgGradient: "radial-gradient(ellipse at 0% 0%, hsl(var(--success) / 0.07) 0%, transparent 60%)",
    iconRing: "ring-success/25",
    iconShadow: "0 4px 12px -2px hsl(var(--success) / 0.3)",
    metricText: "text-success",
    dividerGradient: "linear-gradient(90deg, hsl(var(--success) / 0.35), hsl(var(--success) / 0.08) 60%, transparent)",
    calloutBg: "hsl(var(--success) / 0.06)",
    calloutBorder: "hsl(var(--success) / 0.5)",
    shadow: "0 1px 3px hsl(0 0% 0% / 0.07), 0 4px 16px -4px hsl(var(--success) / 0.12)",
    shadowHover: "0 4px 24px -4px hsl(var(--success) / 0.25), 0 8px 32px -8px hsl(0 0% 0% / 0.1)",
  },
};

const InsightCard = ({ insight, index }: { insight: Insight; index: number }) => {
  const tone = INSIGHT_TONES[insight.kind];
  const style = INSIGHT_STYLES[insight.kind];
  const Icon = tone.icon;
  const textColor = tone.iconBg.split(" ").find(c => c.startsWith("text-")) || "text-foreground";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{
        y: -4,
        boxShadow: style.shadowHover,
        transition: { duration: 0.22, ease: "easeOut" },
      }}
      transition={{ delay: Math.min(index * 0.07, 0.28), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl border bg-card overflow-hidden flex flex-col cursor-default"
      style={{
        borderColor: style.borderColor,
        boxShadow: style.shadow,
      }}
    >
      {/* Barra superior colorida */}
      <div className="h-[2.5px] w-full shrink-0" style={{ background: style.barGradient }} />

      {/* Gradiente de fundo sutil */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{ background: style.bgGradient }}
      />

      {/* Brilho interno topo */}
      <div className="absolute inset-x-0 top-[2.5px] h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="relative z-10 p-5 flex flex-col gap-4 flex-1">

        {/* LINHA 1: ícone + tipo + métrica */}
        <div className="flex items-center justify-between gap-3">

          {/* Ícone + label */}
          <div className="flex items-center gap-3">
            <motion.div
              className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ring-1", tone.iconBg, style.iconRing)}
              style={{ boxShadow: style.iconShadow }}
              whileHover={{ rotate: 6, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </motion.div>
            <div className="flex flex-col gap-0.5">
              <span className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", textColor)}>
                {tone.label}
              </span>
              {insight.severity === "alta" && (
                <span className="text-[9px] font-semibold uppercase tracking-wider text-destructive">
                  · severidade alta
                </span>
              )}
            </div>
          </div>

          {/* Métrica */}
          {insight.metric_value != null && (
            <div className="flex flex-col items-end shrink-0">
              <span className={cn("text-xl font-black tabular-nums leading-none tracking-tight", style.metricText)}>
                {insight.metric_value < 100 && insight.metric_value > -100
                  ? `${insight.metric_value.toFixed(1)}%`
                  : fmtBRL(insight.metric_value)}
              </span>
              {insight.metric_label && (
                <span className="text-[9.5px] text-muted-foreground mt-0.5 font-medium">{insight.metric_label}</span>
              )}
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="h-px w-full" style={{ background: style.dividerGradient }} />

        {/* Título + descrição */}
        <div className="space-y-2">
          <p className="text-[0.9375rem] font-bold text-foreground tracking-tight leading-snug">
            {insight.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.description}
          </p>
        </div>

        {/* Ação recomendada — callout */}
        {insight.suggested_action && (
          <div
            className="mt-auto rounded-xl px-3.5 py-2.5 flex items-start gap-2.5"
            style={{ background: style.calloutBg, borderLeft: `3px solid ${style.calloutBorder}` }}
          >
            <ArrowRight className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", textColor)} strokeWidth={2.5} />
            <p className="text-[11.5px] leading-snug text-foreground/80">
              <span className={cn("font-semibold", textColor)}>Ação: </span>
              {insight.suggested_action}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const SourceCard = ({
  title,
  icon: Icon,
  iconBg,
  chartColor,
  chartData,
  items,
  totalLabel,
  totalValue,
}: {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  chartColor: string;
  chartData: { name: string; value: number }[];
  items: {
    key: string;
    primary: string;
    secondary?: string;
    value: string;
    valueTone: string;
    extra?: string;
  }[];
  totalLabel: string;
  totalValue: string;
}) => {
  const validChart = chartData.filter((d) => d.value > 0);
  const chartHeight = Math.min(120, Math.max(60, validChart.length * 28));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", iconBg)}>
            <Icon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {validChart.length > 0 && (
          <>
            <div
              className="w-full"
              style={{ height: `${chartHeight}px` }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={validChart}
                  layout="vertical"
                  margin={{ top: 2, right: 8, left: 4, bottom: 2 }}
                  barCategoryGap={4}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={70}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) =>
                      v.length > 10 ? `${v.slice(0, 10)}…` : v
                    }
                  />
                  <RTooltip
                    formatter={(value: number) => fmtBRL(value)}
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                  />
                  <Bar dataKey="value" fill={chartColor} radius={[3, 3, 3, 3]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="my-3 border-t border-border/50" />
          </>
        )}
        <div className="space-y-1.5">
          {items.map((it) => (
            <div
              key={it.key}
              className="flex items-start justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground capitalize truncate">{it.primary}</p>
                {it.secondary && (
                  <p className="text-[10.5px] text-muted-foreground truncate">{it.secondary}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className={cn("text-sm font-semibold tabular-nums", it.valueTone)}>{it.value}</p>
                {it.extra && <p className="text-[10px] text-muted-foreground">{it.extra}</p>}
              </div>
            </div>
          ))}
          <div className="pt-2 mt-1 border-t border-border/50 flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">{totalLabel}</span>
            <span className="text-sm font-bold text-foreground tabular-nums">{totalValue}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientDiagnosis;
