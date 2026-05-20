// V9: Diagnostico reformulado
// - IA dispara automaticamente ao abrir (analyze-diagnosis)
// - Resumo + insights estruturados (criticos / alertas / oportunidades / pontos fortes)
// - Visual coerente com a jornada (chips, cards, hierarquia consultiva)
// - Botao Objetivos de Vida abre Dialog com <AdminObjetivos />
// - CTA "Avancar para Parecer" no rodape
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useClientId } from "@/contexts/ClientContext";
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
        supabase.from("income").select("*").eq("client_id", clientId),
        supabase.from("expenses").select("*").eq("client_id", clientId),
        supabase.from("debts").select("*").eq("client_id", clientId),
        supabase.from("assets").select("*").eq("client_id", clientId),
        supabase.from("diagnosis").select("*").eq("client_id", clientId).maybeSingle(),
      ]);

      if (diagRes.data) {
        setExistingDiagnosisId(diagRes.data.id);
        if (diagRes.data.ai_summary) {
          setAiSummary(diagRes.data.ai_summary as string);
          setAiInsights(
            ((diagRes.data.ai_insights as Insight[]) || []).sort((a, b) => {
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
  }, [clientId]);

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

  return (
    <div className="space-y-6">
      {/* ── HEADER ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-accent" />
            Diagnóstico Financeiro
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análise automática dos dados do onboarding. A IA gera os insights iniciais para você refinar no Parecer.
          </p>
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
            Avançar para Plano de Ação
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
                  variant="ghost"
                  size="sm"
                  onClick={() => runAnalyzeAI(false)}
                  disabled={aiAnalyzing}
                  className="gap-1.5 h-7 text-[11px] text-accent hover:bg-accent/10 hover:text-accent shrink-0"
                >
                  {aiAnalyzing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
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
          <SourceList
            title="Rendas"
            icon={TrendingUp}
            iconBg="bg-emerald-500/10 text-emerald-600"
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
          <SourceList
            title="Patrimônio"
            icon={Wallet}
            iconBg="bg-blue-500/10 text-blue-600"
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
          <SourceList
            title="Dívidas"
            icon={CreditCard}
            iconBg="bg-orange-500/10 text-orange-600"
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

const InsightCard = ({ insight, index }: { insight: Insight; index: number }) => {
  const tone = INSIGHT_TONES[insight.kind];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3, ease: "easeOut" }}
      className={cn(
        "group relative rounded-2xl border overflow-hidden flex flex-col",
        tone.bg, tone.border
      )}
    >
      {/* Linha de cor no topo */}
      <div className={cn("h-0.5 w-full", tone.border.replace("border-", "bg-").replace("/35", "/60").replace("/30", "/60"))} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Topo: emoji + tipo + metric */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-lg leading-none", tone.iconBg)}>
              {tone.emoji}
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
              tone.bg, tone.border,
              tone.iconBg.split(" ").find(c => c.startsWith("text-")) || "text-foreground"
            )}>
              {tone.label}
            </span>
          </div>
          {insight.metric_value != null && (
            <span className="text-[11px] font-bold tabular-nums text-foreground/70 bg-background/60 px-2 py-0.5 rounded-lg border border-border/40">
              {insight.metric_label ? `${insight.metric_label}: ` : ""}
              {insight.metric_value < 100 && insight.metric_value > -100
                ? `${insight.metric_value.toFixed(1)}%`
                : fmtBRL(insight.metric_value)}
            </span>
          )}
        </div>

        {/* Título */}
        <div>
          <p className="text-[0.9375rem] font-bold text-foreground tracking-tight leading-snug">
            {insight.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
            {insight.description}
          </p>
        </div>

        {/* Sugestão */}
        {insight.suggested_action && (
          <div className="mt-auto pt-3 border-t border-border/30">
            <div className="flex items-start gap-2">
              <div className={cn("h-4 w-4 rounded flex items-center justify-center shrink-0 mt-0.5", tone.iconBg)}>
                <ArrowRight className="h-2.5 w-2.5" strokeWidth={3} />
              </div>
              <p className="text-[11.5px] leading-snug text-foreground/80">
                <span className="font-semibold">Sugestão: </span>
                {insight.suggested_action}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const SourceList = ({
  title,
  icon: Icon,
  iconBg,
  items,
  totalLabel,
  totalValue,
}: {
  title: string;
  icon: React.ElementType;
  iconBg: string;
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
}) => (
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

export default ClientDiagnosis;
