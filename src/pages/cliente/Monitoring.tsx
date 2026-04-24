import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, TrendingDown, Minus, Target, Calendar,
  Wallet, PiggyBank, Shield, BarChart3,
  Banknote, CreditCard, ArrowUpRight, ArrowDownRight,
  ChevronDown,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import PageBanner from "@/components/PageBanner";
import { SEO } from "@/components/SEO";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import MonthlyClosings from "@/components/monitoring/MonthlyClosings";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Area, AreaChart, Legend,
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

// ── Types ──────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────
const fmt = (v: number | null) =>
  v != null ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : "—";
const pctFmt = (v: number | null) => (v != null ? `${v.toFixed(1)}%` : "—");
const fmtShort = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (abs >= 1_000) return `${sign}R$ ${Math.round(abs / 1_000)}k`;
  return `${sign}R$ ${Math.round(abs)}`;
};

// ── Goal style detection (subtle version) ─────────
const goalTypeConfig = [
  { keywords: ["dívida", "divida", "quitar", "pagar dívida", "sair das dívidas"], icon3d: goalDividasIcon, label: "Dívidas" },
  { keywords: ["emergência", "emergencia", "reserva"], icon3d: goalReservaIcon, label: "Reserva" },
  { keywords: ["invest", "aplicar", "renda passiva", "começar a investir"], icon3d: goalInvestimentosIcon, label: "Investimentos" },
  { keywords: ["aposentadoria", "previdência", "previdencia", "futuro"], icon3d: goalAposentadoriaIcon, label: "Aposentadoria" },
  { keywords: ["casa", "imóvel", "imovel", "apartamento", "moradia"], icon3d: goalImovelIcon, label: "Imóvel" },
  { keywords: ["filho", "filhos", "educação", "educacao", "faculdade", "escola", "vida melhor"], icon3d: goalFamiliaIcon, label: "Família" },
  { keywords: ["viagem", "viajar", "férias"], icon3d: goalViagemIcon, label: "Viagem" },
  { keywords: ["carro", "veículo", "veiculo", "moto"], icon3d: goalVeiculoIcon, label: "Veículo" },
  { keywords: ["curso", "estudo", "formação", "formacao", "certificação"], icon3d: goalEducacaoIcon, label: "Educação" },
  { keywords: ["protecao", "proteção", "seguro", "segurança"], icon3d: goalProtecaoIcon, label: "Proteção" },
];

const getGoalStyle = (description: string) => {
  const lower = description.toLowerCase();
  for (const cfg of goalTypeConfig) {
    if (cfg.keywords.some(k => lower.includes(k))) {
      return { icon3d: cfg.icon3d, badge: cfg.label };
    }
  }
  return { icon3d: goalDefaultIcon, badge: "Objetivo" };
};

// ── 3D KPI Card (Novare palette) ──────────────────
const KpiCard3D = ({
  label, value, icon: Icon, trend, delay = 0,
}: {
  label: string; value: string; icon: React.ElementType;
  trend?: "up" | "down" | "neutral"; delay?: number;
}) => {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="group relative rounded-2xl overflow-hidden bg-card transition-all duration-300 hover:-translate-y-0.5"
      style={{
        border: "1px solid hsl(var(--border))",
        borderTop: "1px solid hsl(var(--border) / 0.8)",
        borderBottom: "1px solid hsl(var(--border) / 0.4)",
        boxShadow: "0 1px 0 hsl(var(--border) / 0.3) inset, 0 -1px 0 hsl(var(--border) / 0.1) inset, 0 8px 24px -6px hsl(var(--foreground) / 0.08)",
      }}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none bg-primary/[0.03]" />
      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/15">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <TrendIcon className={`h-6 w-6 ${trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground/40"}`} />
        </div>
        <p className="text-xl font-black text-foreground tracking-tight leading-none mb-1">{value}</p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
};

// ── Component ─────────────────────────────────────
const Monitoring = () => {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSnapshotId, setOpenSnapshotId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single();
      if (!client) { setLoading(false); return; }
      setClientId(client.id);
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      if (prof?.full_name) setClientName(prof.full_name);
      const [snapRes, goalsRes, planRes] = await Promise.all([
        supabase.from("monitoring_snapshots").select("*").eq("client_id", client.id).order("snapshot_date", { ascending: true }),
        supabase.from("goals").select("*").eq("client_id", client.id),
        supabase.from("action_plans").select("id").eq("client_id", client.id).maybeSingle(),
      ]);

      setSnapshots((snapRes.data as Snapshot[]) || []);

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
          id: g.id, description: g.description, target_amount: g.target_amount,
          deadline: g.deadline, priority: g.priority,
          tasksDone: done, tasksTotal: total,
          pct: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      });
      setGoals(goalsWithProgress);
      setLoading(false);
    };
    load();
  }, [user]);

  // ── Derived ──
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  const getTrend = (cur: number | null | undefined, prv: number | null | undefined): "up" | "down" | "neutral" => {
    if (cur == null || prv == null) return "neutral";
    return cur > prv ? "up" : cur < prv ? "down" : "neutral";
  };

  const chartData = snapshots.map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
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

  if (loading) {
    return (
      <PageTransition className="space-y-6">
        <LoadingState variant="page" rows={4} />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-6">
      <SEO title="Acompanhamento" description="Acompanhe a evolução do seu patrimônio, reservas e indicadores financeiros." index={false} />
      <PageBanner
        title="Acompanhamento"
        description="Evolução financeira baseada nos registros do seu consultor"
        icon3D="snapshot"
      />

      {/* ── Empty state ── */}
      {snapshots.length === 0 && goals.length === 0 && (
        <EmptyState
          icon={BarChart3}
          tone="accent"
          title="Seu progresso aparecerá aqui"
          description="Conforme seu consultor cria registros periódicos, você verá a evolução do seu patrimônio, poupança e objetivos."
        />
      )}

      {/* ── KPI Cards ── */}
      {latest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard3D
            label="Patrimônio Líquido"
            value={fmtShort((latest.total_assets || 0) - (latest.total_debts || 0))}
            icon={Wallet}
            trend={getTrend((latest.total_assets || 0) - (latest.total_debts || 0), prev ? (prev.total_assets || 0) - (prev.total_debts || 0) : null)}
            delay={0}
          />
          <KpiCard3D
            label="Cap. de Poupança"
            value={pctFmt(latest.savings_rate)}
            icon={PiggyBank}
            trend={getTrend(latest.savings_rate, prev?.savings_rate)}
            delay={0.08}
          />
          <KpiCard3D
            label="Reserva Emergência"
            value={`${(latest.emergency_reserve_months || 0).toFixed(1)} meses`}
            icon={Shield}
            trend={getTrend(latest.emergency_reserve_months, prev?.emergency_reserve_months)}
            delay={0.16}
          />
          <KpiCard3D
            label="Plano de Ação"
            value={pctFmt(latest.plan_completion_pct)}
            icon={Target}
            trend={getTrend(latest.plan_completion_pct, prev?.plan_completion_pct)}
            delay={0.24}
          />
        </div>
      )}

      {/* ── Fechamentos Mensais ── */}
      {clientId && (
        <MonthlyClosings clientId={clientId} clientName={clientName} isAdmin={false} />
      )}

      {/* ── Goal Progress — 3D Cards ── */}
      {goals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Target className="h-6 w-6 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Progresso dos Objetivos</h2>
            <span className="text-xs text-muted-foreground ml-auto">{overallGoalPct}% geral</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal, i) => {
              const config = getGoalStyle(goal.description);
              const isCompleted = goal.pct === 100 && goal.tasksTotal > 0;
              const deadlineStr = goal.deadline
                ? new Date(goal.deadline + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                : null;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <div className="relative">
                    <div
                      className="group relative rounded-2xl overflow-hidden bg-card transition-all duration-300 hover:-translate-y-0.5"
                      style={{
                        border: "1px solid hsl(var(--border))",
                        borderTop: "1px solid hsl(var(--border) / 0.8)",
                        borderBottom: "1px solid hsl(var(--border) / 0.4)",
                        boxShadow: "0 1px 0 hsl(var(--border) / 0.3) inset, 0 -1px 0 hsl(var(--border) / 0.1) inset, 0 8px 24px -6px hsl(var(--foreground) / 0.08)",
                      }}
                    >
                      <motion.div
                        className="absolute -top-3 -right-3 w-24 h-24 pointer-events-none"
                        animate={{ y: [0, -3, 0], rotate: [0, 2, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <img src={config.icon3d} alt="" className="w-full h-full object-contain opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-700" loading="lazy" />
                      </motion.div>

                      <div className="relative z-10 p-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
                            {config.badge}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <motion.div className="w-12 h-12 shrink-0 drop-shadow-lg" whileHover={{ scale: 1.1, rotate: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                            <img src={config.icon3d} alt="" className="w-full h-full object-contain" loading="lazy" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground text-sm leading-snug truncate">{goal.description}</h3>
                            {deadlineStr && (
                              <span className="text-[11px] text-muted-foreground/60">até {deadlineStr}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-2xl font-black text-foreground tracking-tight">{goal.pct}%</span>
                            <span className="ml-1.5 text-xs font-medium text-primary">
                              {goal.tasksDone}/{goal.tasksTotal}
                              {goal.pct > 0 && <TrendingUp className="inline-block h-4 w-4 ml-1 -mt-0.5" />}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-muted">
                          <motion.div className="h-full rounded-full bg-primary"
                            initial={{ width: 0 }} animate={{ width: `${goal.pct}%` }} transition={{ duration: 1, delay: i * 0.08 }} />
                        </div>
                      </div>
                    </div>

                    {isCompleted && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center z-20 bg-background/60 backdrop-blur-sm border border-success/30"
                      >
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                          <img src={goalCheckDoneIcon} alt="" className="w-16 h-16 object-contain drop-shadow-lg mb-2" />
                        </motion.div>
                        <p className="text-sm font-bold text-foreground">Concluído! 🎉</p>
                        <p className="text-[11px] mt-0.5 text-muted-foreground">{goal.tasksDone} ações</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Evolution Charts ── */}
      {chartData.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Patrimônio */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div
              className="rounded-2xl overflow-hidden bg-card"
              style={{
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 8px 32px -8px hsl(var(--foreground) / 0.06)",
              }}
            >
              <div className="p-5 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Evolução Patrimonial</p>
                    <p className="text-[10px] text-muted-foreground">Ativos, dívidas e patrimônio</p>
                  </div>
                </div>
              </div>
              <div className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="clientGradAtivos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(215, 50%, 23%)" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="hsl(215, 50%, 23%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="clientGradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 55%, 41%)" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="hsl(152, 55%, 41%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RTooltip
                      formatter={(value: number, name: string) => [fmt(value), name]}
                      contentStyle={{
                        borderRadius: "10px", border: "1px solid hsl(var(--border))",
                        fontSize: "11px", padding: "6px 10px",
                        backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "10px", paddingTop: "4px", color: "hsl(220, 9%, 46%)" }} />
                    <Area type="monotone" dataKey="ativos" name="Ativos" stroke="hsl(215, 50%, 23%)" fill="url(#clientGradAtivos)" strokeWidth={2} dot={{ r: 3, fill: "hsl(215, 50%, 23%)", strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="dividas" name="Dívidas" stroke="hsl(0, 72%, 51%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "hsl(0, 72%, 51%)", strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="patrimonio" name="Patrimônio" stroke="hsl(152, 55%, 41%)" fill="url(#clientGradPatrimonio)" strokeWidth={2.5} dot={{ r: 3.5, fill: "hsl(152, 55%, 41%)", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* Saúde Financeira */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div
              className="rounded-2xl overflow-hidden bg-card"
              style={{
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 8px 32px -8px hsl(var(--foreground) / 0.06)",
              }}
            >
              <div className="p-5 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-success/10">
                    <PiggyBank className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Indicadores de Saúde</p>
                    <p className="text-[10px] text-muted-foreground">Poupança e reserva de emergência</p>
                  </div>
                </div>
              </div>
              <div className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="poup" tick={{ fontSize: 10, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="res" orientation="right" tick={{ fontSize: 10, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}m`} />
                    <RTooltip
                      formatter={(value: number, name: string) => name === "Poupança" ? [`${value.toFixed(1)}%`, name] : [`${value.toFixed(1)} meses`, name]}
                      contentStyle={{
                        borderRadius: "10px", border: "1px solid hsl(var(--border))",
                        fontSize: "11px", padding: "6px 10px",
                        backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "10px", paddingTop: "4px", color: "hsl(220, 9%, 46%)" }} />
                    <Line yAxisId="poup" type="monotone" dataKey="poupanca" name="Poupança" stroke="hsl(152, 55%, 41%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(152, 55%, 41%)", strokeWidth: 2 }} />
                    <Line yAxisId="res" type="monotone" dataKey="reserva" name="Reserva (meses)" stroke="hsl(215, 50%, 23%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: "hsl(215, 50%, 23%)", strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* Plano de ação evolução */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
            <div
              className="rounded-2xl overflow-hidden bg-card"
              style={{
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 8px 32px -8px hsl(var(--foreground) / 0.06)",
              }}
            >
              <div className="p-5 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/10">
                    <Target className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Evolução do Plano</p>
                    <p className="text-[10px] text-muted-foreground">Cumprimento ao longo do tempo</p>
                  </div>
                </div>
              </div>
              <div className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="clientGradPlano" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(16, 65%, 50%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(16, 65%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <RTooltip
                      formatter={(value: number) => [`${value.toFixed(0)}%`, "Plano Concluído"]}
                      contentStyle={{
                        borderRadius: "10px", border: "1px solid hsl(var(--border))",
                        fontSize: "11px", padding: "6px 10px",
                        backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))",
                      }}
                    />
                    <Area type="monotone" dataKey="plano" name="Plano Concluído" stroke="hsl(16, 65%, 50%)" fill="url(#clientGradPlano)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(16, 65%, 50%)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Histórico de Registros ── */}
      {snapshots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-6 w-6 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Histórico de Registros</h2>
            <Badge variant="outline" className="text-[10px] ml-auto">{snapshots.length}</Badge>
          </div>
          <div className="space-y-2">
            {[...snapshots].reverse().map((s, idx) => {
              const patrimonio = (s.total_assets || 0) - (s.total_debts || 0);
              const isLatest = idx === 0;
              const isOpen = openSnapshotId === s.id;

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div
                    className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-card"
                    style={{
                      border: isLatest ? "1px solid hsl(var(--primary) / 0.2)" : "1px solid hsl(var(--border))",
                      boxShadow: isLatest
                        ? "0 8px 24px -6px hsl(var(--foreground) / 0.08)"
                        : "0 2px 8px -2px hsl(var(--foreground) / 0.04)",
                    }}
                    onClick={() => setOpenSnapshotId(isOpen ? null : s.id)}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLatest ? "bg-primary/10 border border-primary/15" : "bg-muted/50"}`}>
                        <Calendar className={`h-6 w-6 ${isLatest ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {new Date(s.snapshot_date).toLocaleDateString("pt-BR")}
                          </span>
                          {isLatest && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              Atual
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                          <span>Patrimônio: <span className={`font-semibold ${patrimonio >= 0 ? "text-success" : "text-destructive"}`}>{fmtShort(patrimonio)}</span></span>
                          <span>Poupança: <span className="font-semibold text-foreground">{pctFmt(s.savings_rate)}</span></span>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <ChevronDown className="h-6 w-6 text-muted-foreground" />
                      </motion.div>
                    </div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0 border-t border-border/30">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-3">
                              {[
                                { label: "Renda Mensal", value: fmt(s.total_income), icon: Banknote },
                                { label: "Despesas", value: fmt(s.total_expenses), icon: CreditCard },
                                { label: "Ativos", value: fmt(s.total_assets), icon: Wallet },
                                { label: "Dívidas", value: fmt(s.total_debts), icon: TrendingDown },
                                { label: "Patrimônio", value: fmt(patrimonio), icon: BarChart3 },
                                { label: "Poupança", value: pctFmt(s.savings_rate), icon: PiggyBank },
                                { label: "Reserva", value: `${(s.emergency_reserve_months || 0).toFixed(1)} meses`, icon: Shield },
                                { label: "Plano", value: pctFmt(s.plan_completion_pct), icon: Target },
                              ].map((row) => (
                                <div key={row.label} className="flex items-center gap-2 py-1.5">
                                  <row.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="text-[11px] flex-1 text-muted-foreground">{row.label}</span>
                                  <span className="text-xs font-semibold tabular-nums text-foreground">{row.value}</span>
                                </div>
                              ))}
                            </div>
                            {s.notes && (
                              <p className="text-[11px] mt-2 pt-2 italic text-muted-foreground border-t border-border/20">
                                💬 {s.notes}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default Monitoring;
