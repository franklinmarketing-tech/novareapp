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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";

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
  { keywords: ["dívida", "divida", "quitar", "pagar dívida", "sair das dívidas"], accent: "#f87171", bg: "linear-gradient(145deg, #2a1215 0%, #7f1d1d 50%, #2a1215 100%)", icon3d: goalDividasIcon, label: "Dívidas" },
  { keywords: ["emergência", "emergencia", "reserva"], accent: "#fbbf24", bg: "linear-gradient(145deg, #2d2a1a 0%, #422006 50%, #2d2a1a 100%)", icon3d: goalReservaIcon, label: "Reserva" },
  { keywords: ["invest", "aplicar", "renda passiva", "começar a investir"], accent: "#34d399", bg: "linear-gradient(145deg, #0f2d2a 0%, #064e3b 50%, #0f2d2a 100%)", icon3d: goalInvestimentosIcon, label: "Investimentos" },
  { keywords: ["aposentadoria", "previdência", "previdencia", "futuro"], accent: "#a78bfa", bg: "linear-gradient(145deg, #1e1a33 0%, #312e81 50%, #1e1a33 100%)", icon3d: goalAposentadoriaIcon, label: "Aposentadoria" },
  { keywords: ["casa", "imóvel", "imovel", "apartamento", "moradia"], accent: "#38bdf8", bg: "linear-gradient(145deg, #0c2a3d 0%, #0c4a6e 50%, #0c2a3d 100%)", icon3d: goalImovelIcon, label: "Imóvel" },
  { keywords: ["filho", "filhos", "educação", "educacao", "faculdade", "escola", "vida melhor"], accent: "#f472b6", bg: "linear-gradient(145deg, #2d1a28 0%, #831843 50%, #2d1a28 100%)", icon3d: goalFamiliaIcon, label: "Família" },
  { keywords: ["viagem", "viajar", "férias"], accent: "#22d3ee", bg: "linear-gradient(145deg, #0c2a33 0%, #155e75 50%, #0c2a33 100%)", icon3d: goalViagemIcon, label: "Viagem" },
  { keywords: ["carro", "veículo", "veiculo", "moto"], accent: "#94a3b8", bg: "linear-gradient(145deg, #111827 0%, #1e293b 50%, #111827 100%)", icon3d: goalVeiculoIcon, label: "Veículo" },
  { keywords: ["curso", "estudo", "formação", "formacao", "certificação"], accent: "#818cf8", bg: "linear-gradient(145deg, #1a1a33 0%, #312e81 50%, #1a1a33 100%)", icon3d: goalEducacaoIcon, label: "Educação" },
  { keywords: ["protecao", "proteção", "seguro", "segurança"], accent: "#2dd4bf", bg: "linear-gradient(145deg, #0d2926 0%, #134e4a 50%, #0d2926 100%)", icon3d: goalProtecaoIcon, label: "Proteção" },
];

const getGoalStyle = (description: string) => {
  const lower = description.toLowerCase();
  for (const cfg of goalTypeConfig) {
    if (cfg.keywords.some(k => lower.includes(k))) {
      return { accent: cfg.accent, bg: cfg.bg, icon3d: cfg.icon3d, badge: cfg.label };
    }
  }
  return { accent: "#60a5fa", bg: "linear-gradient(145deg, #111c2e 0%, #1e3a5f 50%, #111c2e 100%)", icon3d: goalDefaultIcon, badge: "Objetivo" };
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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [{ data: client }, { data: profileData }] = await Promise.all([
        supabase.from("clients").select("id, status").eq("user_id", user.id).single(),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!client) return;
      setClientStatus(client.status);
      if (profileData) setProfile(profileData);

      const [{ data: diag }, incomeRes, expensesRes, assetsRes, debtsRes, { data: plans }, { data: goalsData }] = await Promise.all([
        supabase.from("diagnosis").select("*").eq("client_id", client.id).maybeSingle(),
        supabase.from("income").select("amount").eq("client_id", client.id),
        supabase.from("expenses").select("amount").eq("client_id", client.id),
        supabase.from("assets").select("estimated_value").eq("client_id", client.id),
        supabase.from("debts").select("total_amount").eq("client_id", client.id),
        supabase.from("action_plans").select("id").eq("client_id", client.id),
        supabase.from("goals").select("*").eq("client_id", client.id),
      ]);

      if (diag) setDiagnosis(diag);
      setFinancials({
        totalIncome: (incomeRes.data || []).reduce((s, r) => s + Number(r.amount), 0),
        totalExpenses: (expensesRes.data || []).reduce((s, r) => s + Number(r.amount), 0),
        totalAssets: (assetsRes.data || []).reduce((s, r) => s + Number(r.estimated_value), 0),
        totalDebts: (debtsRes.data || []).reduce((s, r) => s + Number(r.total_amount), 0),
      });

      let allItems: { status: string; parent_id: string | null; goal_id: string | null }[] = [];

      if (plans && plans.length > 0) {
        const { data: items } = await supabase
          .from("action_items").select("status, parent_id, goal_id").eq("action_plan_id", plans[0].id);
        if (items) {
          allItems = items;
          const children = items.filter((i) => i.parent_id);
          setActionProgress({ total: children.length, done: children.filter((i) => i.status === "concluido").length });
        }
      }

      // Build goals with task progress
      if (goalsData && goalsData.length > 0) {
        const goalsWithProgress: GoalWithProgress[] = goalsData.map((g) => {
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
    };
    fetchData();
  }, [user]);

  const totalIncome = diagnosis?.total_income || financials?.totalIncome || 0;
  const totalExpenses = diagnosis?.total_expenses || financials?.totalExpenses || 0;
  const totalAssets = diagnosis?.total_assets || financials?.totalAssets || 0;
  const totalDebts = diagnosis?.total_debts || financials?.totalDebts || 0;
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
                  <ArrowRight className="h-6 w-6" />
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
                {insight.actionLabel} <ChevronRight className="h-6 w-6" />
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
              Revisar <ChevronRight className="h-6 w-6" />
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
                      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
                      style={{
                        background: config.bg,
                        border: `1px solid ${config.accent}18`,
                        borderTop: `1px solid ${config.accent}25`,
                        borderBottom: "1px solid rgba(0,0,0,0.3)",
                        boxShadow: `0 1px 0 ${config.accent}08 inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 8px 24px -6px rgba(0,0,0,0.4)`,
                      }}
                      onClick={() => navigate("/cliente/plano-acao")}
                    >
                      {/* Floating icon */}
                      <motion.div
                        className="absolute -top-3 -right-3 w-28 h-28 pointer-events-none"
                        animate={{ y: [0, -3, 0], rotate: [0, 2, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <img src={config.icon3d} alt="" className="w-full h-full object-contain opacity-[0.12] group-hover:opacity-[0.2] transition-opacity duration-700" loading="lazy" />
                      </motion.div>

                      <div className="relative z-10 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: `${config.accent}99` }}>
                            {config.badge}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${config.accent}15`,
                              color: config.accent,
                              border: `1px solid ${config.accent}25`,
                            }}>
                            {goal.priority === "alta" ? "Alta" : goal.priority === "baixa" ? "Baixa" : "Média"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <motion.div className="w-10 h-10 shrink-0 drop-shadow-lg" whileHover={{ scale: 1.1, rotate: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                            <img src={config.icon3d} alt="" className="w-full h-full object-contain" loading="lazy" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-[15px] leading-snug truncate">{goal.description}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {goal.target_amount && (
                                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                                  Meta: {fmtShort(goal.target_amount)}
                                </span>
                              )}
                              {deadlineStr && (
                                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                                  até {deadlineStr}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-3xl font-black text-white tracking-tight">{taskPct}%</span>
                            <span className="ml-1.5 text-xs font-medium" style={{ color: config.accent }}>
                              {goal.tasksDone}/{goal.tasksTotal}
                              {taskPct > 0 && <TrendingUp className="inline-block h-6 w-6 ml-1 -mt-0.5" />}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-white/30 bg-white/[0.06] px-2.5 py-1 rounded-md">
                            {goal.tasksTotal} {goal.tasksTotal === 1 ? "ação" : "ações"}
                          </span>
                        </div>

                        <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-white/[0.08]">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: config.accent }}
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
                          border: `1px solid ${config.accent}40`,
                          boxShadow: `0 0 20px ${config.accent}15 inset`,
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
                    Ver próximas tarefas <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </Card3D>
          </motion.div>
        );
      })()}


      {/* ── Quick Actions ── */}
      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once: true }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: "Meus Dados", icon: ClipboardList, to: "/cliente/meus-dados", color: "bg-primary/10 text-primary" },
          { label: "Plano de Ação", icon: Target, to: "/cliente/plano-acao", color: "bg-accent/10 text-accent" },
          { label: "Acompanhamento", icon: TrendingUp, to: "/cliente/acompanhamento", color: "bg-success/10 text-success" },
        ].map((action, i) => (
          <motion.div key={action.label} variants={fadeUp} custom={i}>
            <Card3D
              clickable
              interactive
              className="group"
              onClick={() => navigate(action.to)}
            >
              <div className="p-4 text-center">
                <div className={`w-9 h-9 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-foreground">{action.label}</p>
              </div>
            </Card3D>
          </motion.div>
        ))}
      </motion.div>
    </PageTransition>
  );
};

export default ClientDashboard;
