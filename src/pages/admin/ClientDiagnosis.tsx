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
import { toast } from "@/hooks/use-toast";
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
  { label: string; bg: string; border: string; iconBg: string; icon: React.ElementType }
> = {
  critico: {
    label: "Crítico",
    bg: "bg-red-500/[0.06]",
    border: "border-red-500/35",
    iconBg: "bg-red-500/15 text-red-600",
    icon: AlertTriangle,
  },
  alerta: {
    label: "Atenção",
    bg: "bg-amber-500/[0.06]",
    border: "border-amber-500/35",
    iconBg: "bg-amber-500/15 text-amber-600",
    icon: Flame,
  },
  oportunidade: {
    label: "Oportunidade",
    bg: "bg-accent/[0.05]",
    border: "border-accent/30",
    iconBg: "bg-accent/15 text-accent",
    icon: Lightbulb,
  },
  ponto_forte: {
    label: "Ponto forte",
    bg: "bg-success/[0.06]",
    border: "border-success/30",
    iconBg: "bg-success/15 text-success",
    icon: CheckCircle2,
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

      if (diagRes.data) setExistingDiagnosisId(diagRes.data.id);

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

  // ── IA dispara automaticamente ao carregar ───────
  const runAnalyzeAI = async (silent = false) => {
    if (!clientId) return;
    if (!silent) setAiAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-diagnosis", {
        body: { clientId },
      });
      if (error) throw error;
      setAiSummary((data?.summary as string) || "");
      setAiInsights(((data?.insights as Insight[]) || []).sort((a, b) => {
        const orderKind = { critico: 0, alerta: 1, oportunidade: 2, ponto_forte: 3 };
        const orderSev = { alta: 0, media: 1, baixa: 2 };
        return (
          orderKind[a.kind] - orderKind[b.kind] || orderSev[a.severity] - orderSev[b.severity]
        );
      }));
      if (!silent) {
        toast({
          title: "Análise concluída",
          description: `${(data?.insights || []).length} insights gerados pela IA.`,
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
    if (!silent) setAiAnalyzing(false);
  };

  // Dispara IA automaticamente assim que o diagnostico estiver pronto
  useEffect(() => {
    if (!diagnosis || aiTriggered || !clientId) return;
    setAiTriggered(true);
    runAnalyzeAI(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnosis, clientId]);

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
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
          >
            Avançar para Parecer
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── 1. CLASSIFICAÇÃO HERO ─────────────────── */}
      <Card className={cn("border overflow-hidden", risk.borderColor)}>
        <div className={cn("bg-gradient-to-r", risk.gradient)}>
          <CardContent className="py-5 sm:py-6 px-5 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-5">
              {/* Grade */}
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl shrink-0",
                    risk.bgColor,
                  )}
                >
                  <span className={cn("text-2xl sm:text-3xl font-black", risk.textColor)}>
                    {diagnosis.riskClassification}
                  </span>
                  <span className={cn("text-[10px] font-semibold mt-0.5", risk.textColor)}>
                    {risk.label}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/85">{risk.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {risk.advice}
                  </p>
                </div>
              </div>

              {/* Indicadores */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 lg:flex-1">
                <IndicatorMini
                  icon={PiggyBank}
                  label="Poupança"
                  value={fmtPct(diagnosis.savingsCapacity)}
                  tone={risk.textColor}
                />
                <IndicatorMini
                  icon={Scale}
                  label="Comprometimento"
                  value={fmtPct(diagnosis.debtRatio)}
                  tone={diagnosis.debtRatio > 30 ? "text-red-500" : "text-foreground"}
                />
                <IndicatorMini
                  icon={Gauge}
                  label="Despesas/renda"
                  value={fmtPct(diagnosis.expenseRatio)}
                  tone={diagnosis.expenseRatio > 80 ? "text-orange-500" : "text-foreground"}
                />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── 2. RESUMO DA IA + KPIs ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="border-accent/20 bg-gradient-to-br from-accent/[0.04] via-card to-card h-full">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                  Diagnóstico pela IA
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => runAnalyzeAI(false)}
                  disabled={aiAnalyzing}
                  className="gap-1.5 h-7 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {aiAnalyzing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!aiSummary && aiAnalyzing && (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <p className="text-xs text-muted-foreground">
                    A IA está analisando os dados do onboarding...
                  </p>
                </div>
              )}
              {!aiSummary && !aiAnalyzing && (
                <p className="text-xs text-muted-foreground italic py-2">
                  Aguardando análise da IA.
                </p>
              )}
              {aiSummary && (
                <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
              )}
            </CardContent>
          </Card>
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              Pontos identificados pela IA
              <Badge variant="outline" className="text-[10px]">
                {aiInsights.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence initial={false}>
                {aiInsights.map((ins, i) => (
                  <InsightCard key={`${ins.kind}-${i}`} insight={ins} index={i} />
                ))}
              </AnimatePresence>
            </div>
            {/* Resumo por categoria */}
            <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["critico", "alerta", "oportunidade", "ponto_forte"] as const).map((k) => {
                const tone = INSIGHT_TONES[k];
                const count = groupedInsights[k].length;
                const Icon = tone.icon;
                return (
                  <div
                    key={k}
                    className={cn(
                      "rounded-lg border px-2.5 py-2 flex items-center gap-2 text-[11px]",
                      tone.border,
                      tone.bg,
                    )}
                  >
                    <div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", tone.iconBg)}>
                      <Icon className="h-3 w-3" strokeWidth={2.5} />
                    </div>
                    <span className="text-foreground">
                      <span className="font-bold">{count}</span> {tone.label.toLowerCase()}
                      {count !== 1 && "s"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
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
      <Card className="border-accent/25 bg-gradient-to-br from-accent/[0.05] via-card to-card">
        <CardContent className="py-5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Diagnóstico concluído</p>
            <p className="text-xs text-muted-foreground">
              Avance para o Parecer e refine os pontos identificados pela IA junto com o cliente.
            </p>
          </div>
          <Button
            onClick={() => navigate(`/admin/cliente/${clientSlug}/parecer`)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
          >
            Avançar para Parecer
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

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
  <div className="flex items-center gap-2 min-w-0">
    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
    <span className="text-xs text-muted-foreground">{label}:</span>
    <span className={cn("text-sm font-bold tabular-nums", tone)}>{value}</span>
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
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", tone.border)}>
              {tone.label}
            </Badge>
            {insight.severity === "alta" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/40 text-destructive">
                Alta
              </Badge>
            )}
            {insight.metric_value != null && (
              <span className="text-[10.5px] font-semibold tabular-nums text-foreground/85">
                {insight.metric_label ? `${insight.metric_label}: ` : ""}
                {insight.metric_value < 100 && insight.metric_value > -100
                  ? `${insight.metric_value.toFixed(1)}%`
                  : fmtBRL(insight.metric_value)}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground tracking-tight leading-snug">
            {insight.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            {insight.description}
          </p>
          {insight.suggested_action && (
            <div className="mt-2 pt-2 border-t border-border/40 flex items-start gap-1.5">
              <ArrowRight className="h-3 w-3 text-accent mt-0.5 shrink-0" />
              <p className="text-[11.5px] text-foreground/85">
                <span className="font-semibold">Sugestão:</span> {insight.suggested_action}
              </p>
            </div>
          )}
        </div>
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
