import { useEffect, useState, useMemo } from "react";
import { Icon3D } from "@/components/ui/Icon3D";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Plus, TrendingUp, TrendingDown, Minus, Camera, Loader2,
  Wallet, PiggyBank, Shield, Target, Calendar, ChevronRight,
  Banknote, CreditCard, BarChart3, ArrowUpRight, ArrowDownRight,
  CheckCircle2,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { sendClientEmail } from "@/lib/sendClientEmail";
import MonthlyClosings from "@/components/monitoring/MonthlyClosings";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Area, AreaChart, Legend,
} from "recharts";

interface Snapshot {
  id: string;
  snapshot_date: string;
  total_income: number | null;
  total_expenses: number | null;
  total_assets: number | null;
  total_debts: number | null;
  savings_rate: number | null;
  emergency_reserve_months: number | null;
  plan_completion_pct: number | null;
  notes: string | null;
}

interface GoalWithProgress {
  id: string;
  description: string;
  target_amount: number | null;
  deadline: string | null;
  priority: string | null;
  tasksDone: number;
  tasksTotal: number;
  pct: number;
}

const fmt = (v: number | null) =>
  v != null ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : "—";
const pct = (v: number | null) => (v != null ? `${v.toFixed(1)}%` : "—");

// ── KPI card ──────────────────────────────────────
const KpiCard = ({
  label, value, icon: Icon, trend, color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color: string;
}) => {
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <Card className="group hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-xl ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <TrendIcon className={`h-6 w-6 ${trendColor}`} />
        </div>
        <p className="text-xl font-bold text-foreground tracking-tight leading-none mb-1">{value}</p>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
};

// ── Snapshot row ──────────────────────────────────
const SnapshotRow = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="p-1.5 rounded-lg bg-muted/50">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <span className="text-xs text-muted-foreground flex-1">{label}</span>
    <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
  </div>
);

// ── Main ──────────────────────────────────────────
const AdminMonitoring = () => {
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [creating, setCreating] = useState(false);
  const [clientName, setClientName] = useState("");

  const [goals, setGoals] = useState<GoalWithProgress[]>([]);

  const loadData = async (silent = false) => {
    if (!clientId) return;
    if (!silent) setLoading(true);

    const [snapRes, goalsRes, planRes, clientRes] = await Promise.all([
      supabase.from("monitoring_snapshots").select("*").eq("client_id", clientId).order("snapshot_date", { ascending: true }),
      supabase.from("goals").select("*").eq("client_id", clientId),
      supabase.from("action_plans").select("id").eq("client_id", clientId).maybeSingle(),
      supabase.from("clients").select("user_id").eq("id", clientId).maybeSingle(),
    ]);

    setSnapshots((snapRes.data as Snapshot[]) || []);
    if (clientRes.data?.user_id) {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", clientRes.data.user_id).maybeSingle();
      if (prof?.full_name) setClientName(prof.full_name);
    }

    // Load action items for goal progress
    let items: any[] = [];
    if (planRes.data) {
      const { data } = await supabase.from("action_items").select("*").eq("action_plan_id", planRes.data.id);
      items = data || [];
    }
    const parentItems = items.filter((a: any) => !a.parent_id);

    const goalsWithProgress: GoalWithProgress[] = (goalsRes.data || []).map((g: any) => {
      const goalTasks = parentItems.filter((a: any) => a.goal_id === g.id);
      const done = goalTasks.filter((a: any) => a.status === "concluido").length;
      const total = goalTasks.length;
      return {
        id: g.id,
        description: g.description,
        target_amount: g.target_amount,
        deadline: g.deadline,
        priority: g.priority,
        tasksDone: done,
        tasksTotal: total,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
    setGoals(goalsWithProgress);

    if (!silent) setLoading(false);
  };

  useEffect(() => { loadData(); }, [clientId]);

  const handleNewSnapshot = async () => {
    if (!clientId) return;
    setCreating(true);

    // Auto-fetch all data
    const [incRes, expRes, assRes, debRes] = await Promise.all([
      supabase.from("income").select("amount, frequency").eq("client_id", clientId),
      supabase.from("expenses").select("amount").eq("client_id", clientId),
      supabase.from("assets").select("estimated_value").eq("client_id", clientId),
      supabase.from("debts").select("total_amount, monthly_payment").eq("client_id", clientId),
    ]);

    const totalIncome = (incRes.data || []).reduce((s, r) => {
      const amt = Number(r.amount) || 0;
      return s + (r.frequency === "anual" ? amt / 12 : amt);
    }, 0);
    const totalExpenses = (expRes.data || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalAssets = (assRes.data || []).reduce((s, r) => s + (Number(r.estimated_value) || 0), 0);
    const totalDebts = (debRes.data || []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    const monthlyDebtPayments = (debRes.data || []).reduce((s, r) => s + (Number(r.monthly_payment) || 0), 0);
    const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
    const emergencyMonths = totalExpenses > 0 ? totalAssets / totalExpenses : 0;

    // Plan completion
    const { data: plan } = await supabase.from("action_plans").select("id").eq("client_id", clientId).maybeSingle();
    let planPct = 0;
    if (plan) {
      const { data: items } = await supabase.from("action_items").select("status").eq("action_plan_id", plan.id);
      if (items && items.length > 0) {
        planPct = Math.round((items.filter(i => i.status === "concluido").length / items.length) * 100);
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    await supabase.from("monitoring_snapshots").insert({
      client_id: clientId,
      snapshot_date: today,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      total_assets: totalAssets,
      total_debts: totalDebts,
      savings_rate: savingsRate,
      emergency_reserve_months: emergencyMonths,
      plan_completion_pct: planPct,
      notes: null,
    });

    const patrimonio = totalAssets - totalDebts;
    sendClientEmail(clientId, "snapshot-update", {
      patrimonio,
      savingsRate: savingsRate.toFixed(1),
      date: new Date(today).toLocaleDateString("pt-BR"),
    });

    
    toast({ title: "Registro criado!", description: "Dados capturados automaticamente a partir do perfil do cliente." });
    await loadData(true);
    setCreating(false);
  };

  // ── Derived data ──────────────────────────────
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  const getTrend = (cur: number | null | undefined, prv: number | null | undefined): "up" | "down" | "neutral" => {
    if (cur == null || prv == null) return "neutral";
    if (cur > prv) return "up";
    if (cur < prv) return "down";
    return "neutral";
  };

  const chartData = snapshots.map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    fullDate: new Date(s.snapshot_date).toLocaleDateString("pt-BR"),
    patrimonio: (s.total_assets || 0) - (s.total_debts || 0),
    ativos: s.total_assets || 0,
    dividas: s.total_debts || 0,
    poupanca: s.savings_rate || 0,
    reserva: s.emergency_reserve_months || 0,
    plano: s.plan_completion_pct || 0,
  }));

  const overallGoalPct = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalTasks = goals.reduce((s, g) => s + g.tasksTotal, 0);
    const doneTasks = goals.reduce((s, g) => s + g.tasksDone, 0);
    return totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  }, [goals]);

  const priorityConfig: Record<string, { label: string; color: string }> = {
    alta: { label: "Alta", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    media: { label: "Média", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    baixa: { label: "Baixa", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  };

  if (loading) {
    return <LoadingState variant="page" rows={3} />;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon3D name="snapshot" size="lg" floating lazy={false} alt="Acompanhamento" />
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Acompanhamento</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Registros periódicos da situação financeira do cliente</p>
          </div>
        </div>
        <Button
          onClick={handleNewSnapshot}
          disabled={creating}
          className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
        >
          {creating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
          {creating ? "Registrando..." : "Registrar Posição Atual"}
        </Button>
      </div>


      {/* ── KPIs (latest) ──────────────────────── */}
      {latest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Patrimônio Líquido"
            value={fmt((latest.total_assets || 0) - (latest.total_debts || 0))}
            icon={Wallet}
            trend={getTrend(
              (latest.total_assets || 0) - (latest.total_debts || 0),
              prev ? (prev.total_assets || 0) - (prev.total_debts || 0) : null
            )}
            color="bg-primary/10 text-primary"
          />
          <KpiCard
            label="Cap. de Poupança"
            value={pct(latest.savings_rate)}
            icon={PiggyBank}
            trend={getTrend(latest.savings_rate, prev?.savings_rate)}
            color="bg-emerald-500/10 text-emerald-600"
          />
          <KpiCard
            label="Reserva de Emergência"
            value={`${(latest.emergency_reserve_months || 0).toFixed(1)} meses`}
            icon={Shield}
            trend={getTrend(latest.emergency_reserve_months, prev?.emergency_reserve_months)}
            color="bg-blue-500/10 text-blue-600"
          />
          <KpiCard
            label="Cumprimento do Plano"
            value={pct(latest.plan_completion_pct)}
            icon={Target}
            trend={getTrend(latest.plan_completion_pct, prev?.plan_completion_pct)}
            color="bg-accent/10 text-accent"
          />
        </div>
      )}

      {/* ── Snapshot History (Accordion) ────────── */}
      {snapshots.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="h-8 w-8 text-accent/40" />
            </div>
            <p className="text-foreground font-semibold mb-1">Comece a acompanhar a evolução</p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">
              Cada registro é uma fotografia financeira do cliente. Com o tempo, você verá tendências claras 
              — patrimônio crescendo, dívidas diminuindo, poupança aumentando.
            </p>
            <Button
              onClick={handleNewSnapshot}
              disabled={creating}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl"
            >
              {creating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              Registrar posição atual
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-muted">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm">Histórico de Registros</CardTitle>
                  <CardDescription className="text-[11px]">
                    {snapshots.length} registro{snapshots.length !== 1 ? "s" : ""} — mais recente primeiro
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {snapshots.length} registro{snapshots.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="space-y-1">
              {[...snapshots].reverse().map((s, idx) => {
                const patrimonio = (s.total_assets || 0) - (s.total_debts || 0);
                const isLatest = idx === 0;

                return (
                  <AccordionItem
                    key={s.id}
                    value={s.id}
                    className={`border rounded-xl px-4 transition-colors ${isLatest ? "border-accent/30 bg-accent/[0.03]" : "border-border/50"}`}
                  >
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-3 w-full pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-foreground">
                            {new Date(s.snapshot_date).toLocaleDateString("pt-BR")}
                          </span>
                          {isLatest && (
                            <Badge className="bg-accent/10 text-accent border-accent/20 text-[9px] px-1.5">
                              Atual
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1" />
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="tabular-nums">Patrimônio: <span className={`font-semibold ${patrimonio >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(patrimonio)}</span></span>
                          <span className="tabular-nums">Poupança: <span className="font-semibold text-foreground">{pct(s.savings_rate)}</span></span>
                          <span className="tabular-nums">Plano: <span className="font-semibold text-foreground">{pct(s.plan_completion_pct)}</span></span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 pt-2">
                        <SnapshotRow label="Renda Mensal" value={fmt(s.total_income)} icon={Banknote} />
                        <SnapshotRow label="Despesas Mensais" value={fmt(s.total_expenses)} icon={CreditCard} />
                        <SnapshotRow label="Ativos Totais" value={fmt(s.total_assets)} icon={Wallet} />
                        <SnapshotRow label="Dívidas Totais" value={fmt(s.total_debts)} icon={TrendingDown} />
                        <SnapshotRow label="Patrimônio Líquido" value={fmt(patrimonio)} icon={BarChart3} />
                        <SnapshotRow label="Cap. de Poupança" value={pct(s.savings_rate)} icon={PiggyBank} />
                        <SnapshotRow label="Reserva de Emergência" value={`${(s.emergency_reserve_months || 0).toFixed(1)} meses`} icon={Shield} />
                        <SnapshotRow label="Cumprimento do Plano" value={pct(s.plan_completion_pct)} icon={Target} />
                      </div>
                      {s.notes && (
                        <div className="mt-3 pt-3 border-t border-border/40">
                          <p className="text-xs text-muted-foreground italic">💬 {s.notes}</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* ── Fechamentos Mensais ─────────────────── */}
      <MonthlyClosings clientId={clientId} clientName={clientName} isAdmin />

      {/* ── Charts (below snapshots) ───────────── */}
      {chartData.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Evolução Patrimonial */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Evolução Patrimonial</CardTitle>
                  <CardDescription className="text-[11px]">Ativos, dívidas e patrimônio líquido</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradAtivos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(215, 50%, 45%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(215, 50%, 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152, 55%, 41%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(152, 55%, 41%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RTooltip
                    formatter={(value: number, name: string) => [fmt(value), name]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      fontSize: "12px",
                      padding: "8px 12px",
                      boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Area type="monotone" dataKey="ativos" name="Ativos" stroke="hsl(215, 50%, 45%)" fill="url(#gradAtivos)" strokeWidth={2} dot={{ r: 3, fill: "hsl(215, 50%, 45%)", strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="dividas" name="Dívidas" stroke="hsl(0, 72%, 51%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "hsl(0, 72%, 51%)", strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="patrimonio" name="Patrimônio Líquido" stroke="hsl(152, 55%, 41%)" fill="url(#gradPatrimonio)" strokeWidth={2.5} dot={{ r: 3.5, fill: "hsl(152, 55%, 41%)", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Taxa de Poupança + Reserva */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <PiggyBank className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">Indicadores de Saúde</CardTitle>
                  <CardDescription className="text-[11px]">Taxa de poupança e reserva de emergência</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="poup" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="res" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}m`} />
                  <RTooltip
                    formatter={(value: number, name: string) =>
                      name === "Poupança" ? [`${value.toFixed(1)}%`, name] : [`${value.toFixed(1)} meses`, name]
                    }
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      fontSize: "12px",
                      padding: "8px 12px",
                      boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Line yAxisId="poup" type="monotone" dataKey="poupanca" name="Poupança" stroke="hsl(152, 55%, 41%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(152, 55%, 41%)", strokeWidth: 2 }} />
                  <Line yAxisId="res" type="monotone" dataKey="reserva" name="Reserva (meses)" stroke="hsl(215, 50%, 45%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: "hsl(215, 50%, 45%)", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Evolução do Plano de Ação */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-accent/10">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-sm">Evolução do Plano</CardTitle>
                  <CardDescription className="text-[11px]">Cumprimento do plano de ação ao longo do tempo</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradPlano" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <RTooltip
                    formatter={(value: number) => [`${value.toFixed(0)}%`, "Plano Concluído"]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      fontSize: "12px",
                      padding: "8px 12px",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  />
                  <Area type="monotone" dataKey="plano" name="Plano Concluído" stroke="hsl(var(--accent))" fill="url(#gradPlano)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(var(--accent))", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminMonitoring;
