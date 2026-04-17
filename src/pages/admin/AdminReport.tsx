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
  Download, Loader2,
} from "lucide-react";
import { sendClientEmail } from "@/lib/sendClientEmail";
import { toast } from "@/hooks/use-toast";

// ── Palette ──────────────────────────────────────────
const CHART_COLORS = [
  "hsl(215, 50%, 23%)", "hsl(16, 65%, 50%)", "hsl(152, 55%, 41%)",
  "hsl(38, 92%, 50%)", "hsl(260, 50%, 55%)", "hsl(190, 60%, 45%)",
  "hsl(340, 55%, 50%)", "hsl(0, 0%, 55%)",
];

// ── Classification ───────────────────────────────────
const classificationConfig: Record<string, {
  label: string; gradient: string; textColor: string;
  bgColor: string; borderColor: string; description: string;
}> = {
  A: { label: "Excelente", gradient: "from-emerald-500/15 to-emerald-500/5", textColor: "text-emerald-600", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", description: "Capacidade de poupança acima de 30%" },
  B: { label: "Bom", gradient: "from-blue-500/15 to-blue-500/5", textColor: "text-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20", description: "Capacidade de poupança entre 10% e 30%" },
  C: { label: "Neutro", gradient: "from-amber-500/15 to-amber-500/5", textColor: "text-amber-600", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20", description: "Capacidade de poupança entre 0% e 10%" },
  D: { label: "Atenção", gradient: "from-orange-500/15 to-orange-500/5", textColor: "text-orange-600", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20", description: "Déficit ou próximo de zero" },
  E: { label: "Crítico", gradient: "from-red-500/15 to-red-500/5", textColor: "text-red-600", bgColor: "bg-red-500/10", borderColor: "border-red-500/20", description: "Endividamento elevado" },
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
    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-bold shrink-0">
      {number}
    </div>
    <div>
      <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ── Stat card ────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color = "bg-muted/60 text-muted-foreground", className = "" }: {
  label: string; value: string; icon: React.ElementType; color?: string; className?: string;
}) => (
  <Card className={`${className}`}>
    <CardContent className="p-5 text-center">
      <div className={`p-2.5 rounded-xl ${color} w-fit mx-auto mb-3`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
    </CardContent>
  </Card>
);

// ── Main ─────────────────────────────────────────────
const AdminReport = () => {
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientData, setClientData] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      setLoading(true);
      const [clientRes, diagRes, incRes, expRes, debRes, assRes, insRes, goalRes, planRes, snapRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        supabase.from("diagnosis").select("*").eq("client_id", clientId).maybeSingle(),
        supabase.from("income").select("*").eq("client_id", clientId),
        supabase.from("expenses").select("*").eq("client_id", clientId),
        supabase.from("debts").select("*").eq("client_id", clientId),
        supabase.from("assets").select("*").eq("client_id", clientId),
        supabase.from("insurance").select("*").eq("client_id", clientId),
        supabase.from("goals").select("*").eq("client_id", clientId),
        supabase.from("action_plans").select("id").eq("client_id", clientId).maybeSingle(),
        supabase.from("monitoring_snapshots").select("*").eq("client_id", clientId).order("snapshot_date", { ascending: true }),
      ]);

      if (clientRes.data) {
        setClientData(clientRes.data);
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", clientRes.data.user_id).maybeSingle();
        if (profile) {
          setClientName(profile.full_name);
          setClientEmail(profile.email);
        }
      }
      setDiagnosis(diagRes.data);
      setIncomes(incRes.data || []);
      setExpenses(expRes.data || []);
      setDebts(debRes.data || []);
      setAssets(assRes.data || []);
      setInsurance(insRes.data || []);
      setGoals(goalRes.data || []);
      setSnapshots(snapRes.data || []);

      if (planRes.data) {
        const { data: items } = await supabase.from("action_items").select("*").eq("action_plan_id", planRes.data.id).order("created_at");
        setActionItems(items || []);
      }
      setLoading(false);
    };
    load();
  }, [clientId]);

  if (loading) return <div className="flex items-center justify-center py-20"><span className="animate-pulse text-muted-foreground">Gerando relatório...</span></div>;

  // ── Calculations ───────────────────────────────
  const totalIncome = incomes.reduce((s: number, i: any) => s + (i.frequency === "anual" ? (i.amount || 0) / 12 : (i.amount || 0)), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const totalDebts = debts.reduce((s: number, d: any) => s + (d.total_amount || 0), 0);
  const monthlyDebtPayments = debts.reduce((s: number, d: any) => s + (d.monthly_payment || 0), 0);
  const totalAssets = assets.reduce((s: number, a: any) => s + (a.estimated_value || 0), 0);
  const netWorth = totalAssets - totalDebts;
  const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const debtRatio = totalIncome > 0 ? (monthlyDebtPayments / totalIncome) * 100 : 0;
  const risk = diagnosis?.risk_classification || (savingsRate >= 30 ? "A" : savingsRate >= 10 ? "B" : savingsRate >= 0 ? "C" : savingsRate >= -10 ? "D" : "E");
  const riskInfo = classificationConfig[risk] || classificationConfig.C;

  const catMap: Record<string, number> = {};
  expenses.forEach((e: any) => { catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0); });
  const expensesByCategory = Object.entries(catMap).map(([category, amount]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    amount, percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
  })).sort((a, b) => b.amount - a.amount);

  // Parent tasks only for progress
  const parentItems = actionItems.filter((a: any) => !a.parent_id);
  const completedActions = parentItems.filter((a: any) => a.status === "concluido").length;
  const totalActions = parentItems.length;
  const planPct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
  const totalImpact = actionItems.reduce((s: number, a: any) => s + (a.financial_impact || 0), 0);

  // Per-goal progress
  const goalProgress = goals.map((g: any) => {
    const goalTasks = parentItems.filter((a: any) => a.goal_id === g.id);
    const done = goalTasks.filter((a: any) => a.status === "concluido").length;
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

  const chartData = snapshots.map((s: any) => ({
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
        actionItems: parentItems,
        totalImpact,
        completedActions,
        totalActions,
        planPct,
      });
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({ title: "Erro ao gerar PDF", description: "Tente novamente", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const sectionNumber = (() => { let n = 0; return () => ++n; })();

  return (
    <div className="max-w-4xl mx-auto print:max-w-none">
      {/* Screen-only header */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Relatório Final</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Documento consolidado para entrega ao cliente</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadPDF} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            {generating ? "Gerando..." : "Baixar PDF"}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-5 w-5" /> Imprimir
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-10 print:space-y-8">

        {/* ══════ COVER ══════ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground p-10 print:p-8">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/[0.03] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/[0.02] translate-y-1/2 -translate-x-1/4" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary-foreground/50 mb-4">Método Novare</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-2">
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
              <div className="grid grid-cols-5 gap-2">
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
          <Card className={`border ${riskInfo.borderColor} overflow-hidden`}>
            <div className={`bg-gradient-to-r ${riskInfo.gradient}`}>
              <CardContent className="py-6">
                <div className="flex items-center gap-6">
                  <div className={`flex flex-col items-center justify-center h-24 w-24 rounded-2xl ${riskInfo.bgColor} shrink-0`}>
                    <span className={`text-4xl font-black ${riskInfo.textColor}`}>{risk}</span>
                    <span className={`text-[10px] font-semibold ${riskInfo.textColor} mt-0.5`}>{riskInfo.label}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-3">{riskInfo.description}</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Poupança</p>
                        <p className={`text-lg font-bold ${riskInfo.textColor}`}>{fmtPct(savingsRate)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Comprometimento</p>
                        <p className={`text-lg font-bold ${debtRatio > 30 ? "text-red-500" : "text-foreground"}`}>{fmtPct(debtRatio)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Despesas/Renda</p>
                        <p className={`text-lg font-bold ${expenseRatio > 80 ? "text-orange-500" : "text-foreground"}`}>{fmtPct(expenseRatio)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Scale */}
                <div className="grid grid-cols-5 gap-1 mt-5">
                  {(["A", "B", "C", "D", "E"] as const).map((l) => (
                    <div key={l} className={`text-center py-2 rounded-lg text-xs font-medium transition-all ${l === risk ? `${riskInfo.bgColor} ${riskInfo.textColor} ring-1 ring-current/20` : "bg-muted/50 text-muted-foreground"}`}>
                      {l} — {classificationConfig[l].label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </div>
          </Card>
        </section>

        {/* ══════ 3. BALANÇO ══════ */}
        <section>
          <SectionHeader number={sectionNumber()} title="Balanço Patrimonial" subtitle="Visão consolidada de ativos e passivos" />
          <div className="grid grid-cols-3 gap-3 mb-4">
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
                  {assets.map((a: any) => (
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
                  {incomes.map((i: any) => (
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
            <Card>
              <CardContent className="py-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Tipo", "Credor", "Saldo", "Parcela", "Juros", "Prazo"].map(h => (
                          <th key={h} className={`py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium ${h === "Tipo" || h === "Credor" ? "text-left" : "text-right"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {debts.map((d: any) => (
                        <tr key={d.id} className="border-b border-border/30 ">
                          <td className="py-2.5 text-foreground capitalize">{d.type}</td>
                          <td className="py-2.5 text-muted-foreground">{d.creditor || "—"}</td>
                          <td className="py-2.5 text-right font-semibold text-foreground tabular-nums">{fmt(d.total_amount || 0)}</td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmt(d.monthly_payment || 0)}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            {d.interest_rate ? (
                              <span className={d.interest_rate > 5 ? "text-red-500 font-semibold" : "text-muted-foreground"}>{d.interest_rate}% a.m.</span>
                            ) : "—"}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">{d.remaining_months ? `${d.remaining_months} meses` : "—"}</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-foreground">
                        <td colSpan={2} className="py-2.5">Total</td>
                        <td className="py-2.5 text-right tabular-nums">{fmt(totalDebts)}</td>
                        <td className="py-2.5 text-right tabular-nums">{fmt(monthlyDebtPayments)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ══════ 6. SEGUROS ══════ */}
        {insurance.length > 0 && (
          <section>
            <SectionHeader number={sectionNumber()} title="Proteção e Seguros" subtitle="Cobertura de riscos e seguros ativos" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insurance.map((ins: any) => (
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
              {goalProgress.map((g: any) => {
                const prio = priorityLabels[g.priority] || g.priority || "Média";
                const prioColor = priorityColors[g.priority] || priorityColors.media;
                const goalItems = parentItems.filter((a: any) => a.goal_id === g.id);
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
                          {goalItems.map((a: any) => {
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
            <div className="grid grid-cols-3 gap-3 mb-4">
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

            {/* Action items table */}
            <Card>
              <CardContent className="py-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Área", "Ação", "Responsável", "Prazo", "Status"].map(h => (
                          <th key={h} className="py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {actionItems.map((a: any) => {
                        const st = STATUS_MAP[a.status] || STATUS_MAP.pendente;
                        return (
                          <tr key={a.id} className="border-b border-border/30 ">
                            <td className="py-2.5">
                              <Badge variant="outline" className="text-[10px]">{AREA_LABELS[a.area] || a.area}</Badge>
                            </td>
                            <td className="py-2.5 text-foreground max-w-[220px]">{a.description}</td>
                            <td className="py-2.5 text-muted-foreground">{a.responsible || "Novare"}</td>
                            <td className="py-2.5 text-muted-foreground tabular-nums">{a.deadline ? new Date(a.deadline).toLocaleDateString("pt-BR") : "—"}</td>
                            <td className="py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${st.color}`}>
                                {a.status === "concluido" && <CheckCircle2 className="h-6 w-6" />}
                                {st.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
            <SectionHeader number={sectionNumber()} title="Evolução Histórica" subtitle="Acompanhamento ao longo dos snapshots" />
            <Card>
              <CardContent className="py-5">
                <ResponsiveContainer width="100%" height={260}>
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
                    { phase: "Contínuo", title: "Acompanhamento recorrente", desc: "Snapshots mensais, evolução de indicadores e realinhamento de metas", color: "bg-muted text-muted-foreground" },
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
    </div>
  );
};

export default AdminReport;
