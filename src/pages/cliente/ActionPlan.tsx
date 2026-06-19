import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { planCompletion } from "@/lib/actionPlan";
import {
  ClipboardList, CheckCircle2, TrendingUp, Circle,
  PieChart as PieChartIcon, Target, DollarSign, Info,
  ShieldCheck, Zap, ListChecks, BarChart3, ChevronDown,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import PageBanner from "@/components/PageBanner";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
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

// ── Types ──────────────────────────────────────────────

interface ActionItem {
  id: string;
  area: string;
  description: string;
  objective: string | null;
  responsible: string | null;
  deadline: string | null;
  financial_impact: number | null;
  status: string;
  parent_id: string | null;
  goal_id: string | null;
}

interface GoalInfo {
  id: string;
  description: string;
  target_amount: number | null;
  priority: string | null;
}

interface MetaInfo {
  id: string;
  source_table: string;
  source_id: string;
  source_label: string;
  meta_text: string | null;
  meta_valor: number | null;
  prazo: string | null;
  completed_at: string | null;
}

interface InvestmentRec {
  id: string;
  product_name: string;
  product_type: string;
  allocation_pct: number;
  expected_return: string | null;
  risk_level: string;
  liquidity: string | null;
  min_investment: number | null;
  invested_amount: number | null;
  rationale: string | null;
  status: string;
  priority: number;
}

// ── Constants ──────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  renda_fixa: "Renda Fixa", renda_variavel: "Renda Variável",
  multimercado: "Multimercado", previdencia: "Previdência",
};

const TYPE_COLORS: Record<string, string> = {
  renda_fixa: "hsl(var(--primary))", renda_variavel: "hsl(var(--destructive))",
  multimercado: "hsl(var(--accent))", previdencia: "hsl(var(--warning))",
};

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  baixo: { label: "Conservador", color: "text-emerald-600" },
  medio: { label: "Moderado", color: "text-amber-600" },
  alto: { label: "Arrojado", color: "text-rose-600" },
};

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ── Goal style detection (same as admin) ──────────────

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

// ── Component ──────────────────────────────────────────

const ActionPlan = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [goals, setGoals] = useState<GoalInfo[]>([]);
  const [metas, setMetas] = useState<MetaInfo[]>([]);
  const [recommendations, setRecommendations] = useState<InvestmentRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tarefas" | "investimentos">("tarefas");
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    let clientId: string | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const loadAll = async (cid: string) => {
      const [planRes, goalsRes, recsRes, metasRes] = await Promise.all([
        supabase.from("action_plans").select("id").eq("client_id", cid).maybeSingle(),
        supabase.from("goals").select("id, description, target_amount, priority").eq("client_id", cid).is("completed_at", null),
        supabase.from("investment_recommendations").select("*").eq("client_id", cid).order("priority", { ascending: true }),
        supabase.from("parecer_metas").select("*").eq("client_id", cid).is("completed_at", null).neq("source_table", "goals").order("source_table"),
      ]);

      if (!mounted) return;

      if (planRes.data) {
        const { data: actionItems } = await supabase
          .from("action_items").select("*").eq("action_plan_id", planRes.data.id)
          .order("created_at", { ascending: true });
        if (mounted) setItems((actionItems as ActionItem[]) || []);
      } else {
        setItems([]);
      }

      setGoals((goalsRes.data as GoalInfo[]) || []);
      setMetas((metasRes.data as MetaInfo[]) || []);
      setRecommendations((recsRes.data as any[]) || []);
    };

    // Refetch ao voltar para a aba (cliente volta do WhatsApp/email e ja ve atualizado)
    const onVisibilityChange = () => {
      if (!document.hidden && mounted && clientId) loadAll(clientId);
    };

    const init = async () => {
      const { data: client } = await supabase
        .from("clients").select("id").eq("user_id", user.id).single();
      if (!client || !mounted) { setLoading(false); return; }
      clientId = client.id;
      await loadAll(client.id);
      setLoading(false);

      // Polling a cada 20s — cliente ve novidades do consultor sem precisar F5.
      // Pausado automaticamente quando a aba esta em background.
      pollInterval = setInterval(() => {
        if (!document.hidden && mounted && clientId) loadAll(clientId);
      }, 20000);

      document.addEventListener("visibilitychange", onVisibilityChange);
    };

    init();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando plano de ação...</span>
        </div>
      </div>
    );
  }

  const allParentTasks = items.filter((i) => !i.parent_id);
  const parentTasks = allParentTasks.filter((i) => i.status !== "concluido");
  const childrenOf = (parentId: string) => items.filter((i) => i.parent_id === parentId);
  // Progresso geral por tarefas folha (funciona para planos planos e aninhados),
  // consistente com o dashboard, relatório e fechamento.
  const plan = planCompletion(items);
  const overallPct = plan.pct;

  // Group tasks by goal
  const goalGroups = goals.map(goal => {
    const tasks = allParentTasks.filter(t => t.goal_id === goal.id);
    const children = tasks.flatMap(t => childrenOf(t.id));
    const done = children.filter(c => c.status === "concluido").length;
    const total = children.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const allTasksDone = tasks.length > 0 && tasks.every(t => t.status === "concluido");
    return { goal, tasks, done, total, pct, allTasksDone };
  });

  const ungroupedTasks = parentTasks.filter(t => !t.goal_id);

  const hasActions = allParentTasks.length > 0;
  const hasInvestments = recommendations.length > 0;
  const hasMetas = metas.length > 0;
  const hasGoals = goals.length > 0;
  const hasAnyPlan = hasActions || hasInvestments || hasMetas || hasGoals;

  // Agrupa metas por categoria
  const META_SECTION_LABELS: Record<string, string> = {
    income: "Rendas", expenses: "Despesas", debts: "Dívidas",
    assets: "Patrimônio", insurance: "Seguros",
  };
  const META_SECTION_COLOR: Record<string, string> = {
    income: "#10b981", expenses: "#f43f5e", debts: "#ef4444",
    assets: "#0ea5e9", insurance: "#a855f7",
  };
  const META_SECTION_ORDER = ["income", "expenses", "debts", "assets", "insurance"];
  const metasBySection = META_SECTION_ORDER.reduce((acc, s) => {
    const list = metas.filter((m) => m.source_table === s);
    if (list.length > 0) acc[s] = list;
    return acc;
  }, {} as Record<string, MetaInfo[]>);

  const formatDateBR = (d?: string | null) => {
    if (!d) return null;
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  };

  const toggleGoal = (goalId: string) => setOpenGoalId(prev => prev === goalId ? null : goalId);

  if (!hasAnyPlan) {
    return (
      <PageTransition>
        <PageBanner title="Plano de Ação" description="Metas e recomendações definidas pelo seu consultor" icon3D="clipboard" />
        <Card>
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Seu plano de ação aparecerá aqui quando criado pelo seu consultor.</p>
            <p className="text-xs text-muted-foreground/70 mt-2">Esta página atualiza sozinha — assim que o consultor cadastrar uma meta, ela aparece aqui em até 20 segundos.</p>
          </CardContent>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <SEO title="Plano de Ação" description="Tarefas e recomendações de investimento definidas pelo seu consultor Novare." index={false} />
        <PageBanner title="Plano de Ação" description="Tarefas e recomendações de investimento definidas pelo seu consultor" icon3D="clipboard" />

      {/* ── METAS DO CONSULTOR (parecer_metas) — sincronizado em tempo real ── */}
      {hasMetas && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-novare-blue shrink-0" />
            <Target className="w-5 h-5 text-novare-blue" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Metas definidas pelo seu consultor</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-novare-blue-light text-novare-blue">
              {metas.length}
            </span>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>

          {Object.entries(metasBySection).map(([section, list]) => {
            const accent = META_SECTION_COLOR[section];
            return (
              <div key={section}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: accent }}>
                  {META_SECTION_LABELS[section]}
                </p>
                <div className="space-y-2">
                  {list.map((meta) => (
                    <div
                      key={meta.id}
                      className="rounded-xl border border-border/60 bg-card p-4 hover:shadow-md transition-shadow"
                      style={{ borderLeft: `4px solid ${accent}` }}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground leading-tight">{meta.source_label}</p>
                          {meta.meta_text && (
                            <p className="text-xs text-muted-foreground mt-1 leading-snug">{meta.meta_text}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs shrink-0">
                          {meta.meta_valor && meta.meta_valor > 0 && (
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Alvo</span>
                              <span className="font-bold tabular-nums" style={{ color: accent }}>{fmt(Number(meta.meta_valor))}</span>
                            </div>
                          )}
                          {meta.prazo && (
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Prazo</span>
                              <span className="font-bold tabular-nums text-foreground/80">{formatDateBR(meta.prazo)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3D PROGRESS HERO ────────────────────── */}
      {plan.total > 0 && (
        <div className="mb-6" style={{ perspective: "800px" }}>
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, #0d1b2a 0%, #1b3a5c 35%, #1a2d4a 65%, #0d1b2a 100%)",
              border: "1px solid rgba(96,165,250,0.12)",
              borderTop: "1px solid rgba(96,165,250,0.18)",
              borderBottom: "1px solid rgba(0,0,0,0.3)",
              boxShadow: "0 1px 0 rgba(96,165,250,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 12px 40px -10px rgba(0,0,0,0.5)",
            }}
          >
            <motion.div
              className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)" }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative z-10 p-6">
              <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: "rgba(96,165,250,0.6)" }}>Progresso Geral</span>
              <div className="flex items-end justify-between mt-2 mb-4">
                <motion.span
                  className="text-5xl font-black text-white tracking-tight"
                  style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {overallPct}%
                </motion.span>
                <span className="text-[11px] font-medium text-white/30 px-3 py-1.5 rounded-lg" style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  {plan.done} de {plan.total} ações
                </span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{
                background: "rgba(255,255,255,0.05)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4) inset",
              }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                >
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #60a5fa 0%, #2563eb 50%, #1d4ed8 100%)" }} />
                  <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TABS ────────────────────────── */}
      {hasActions && hasInvestments && (
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setActiveTab("tarefas")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "tarefas"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListChecks className="h-6 w-6" />
            Tarefas
          </button>
          <button
            onClick={() => setActiveTab("investimentos")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "investimentos"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-6 w-6" />
            Investimentos
          </button>
        </div>
      )}

      {/* ── TAREFAS — 3D Goal Cards ────────────────── */}
      {(activeTab === "tarefas" || !hasInvestments) && hasActions && (
        <div className="space-y-4">
          {/* Goal cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goalGroups.map(({ goal, tasks, done, total, pct, allTasksDone }, idx) => {
              const isOpen = openGoalId === goal.id;
              const config = getGoalStyle(goal.description);
              const isCompleted = allTasksDone && tasks.length > 0;

              const isEndOfRow = idx % 2 === 1 || idx === goalGroups.length - 1;
              const openInThisRow = (() => {
                if (!isEndOfRow || !openGoalId) return null;
                const rowStart = idx % 2 === 1 ? idx - 1 : idx;
                return goalGroups.slice(rowStart, idx + 1).find(g => g.goal.id === openGoalId) || null;
              })();

              return (
                <React.Fragment key={goal.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.5 }}
                  >
                    <div className="relative">
                      {/* Goal Card */}
                      <div
                        onClick={() => toggleGoal(goal.id)}
                        className={`group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-400
                          ${isOpen ? 'scale-[1.01]' : 'hover:-translate-y-0.5'}
                        `}
                        style={{
                          background: config.bg,
                          border: `1px solid ${config.accent}18`,
                          borderTop: `1px solid ${config.accent}25`,
                          borderBottom: "1px solid rgba(0,0,0,0.3)",
                          boxShadow: isOpen
                            ? `0 20px 60px -15px rgba(0,0,0,0.4), 0 0 0 1px ${config.accent}15`
                            : `0 1px 0 ${config.accent}08 inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 8px 24px -6px rgba(0,0,0,0.4)`,
                        }}
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
                            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.08] shrink-0">
                              <ChevronDown className="h-6 w-6 text-white/50" />
                            </motion.div>
                          </div>

                          <div className="flex items-center gap-3 mb-4">
                            <motion.div className="w-11 h-11 shrink-0 drop-shadow-lg" whileHover={{ scale: 1.1, rotate: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                              <img src={config.icon3d} alt="" className="w-full h-full object-contain" loading="lazy" />
                            </motion.div>
                            <h3 className="font-bold text-white text-[15px] leading-snug truncate">{goal.description}</h3>
                          </div>

                          <div className="flex items-end justify-between">
                            <div>
                              <span className="text-3xl font-black text-white tracking-tight">{pct}%</span>
                              <span className="ml-1.5 text-xs font-medium" style={{ color: config.accent }}>
                                {done}/{total}
                                {pct > 0 && <TrendingUp className="inline-block h-6 w-6 ml-1 -mt-0.5" />}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-white/30 bg-white/[0.06] px-2.5 py-1 rounded-md">
                              {tasks.length} {tasks.length === 1 ? "ação" : "ações"}
                            </span>
                          </div>

                          <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-white/[0.08]">
                            <motion.div className="h-full rounded-full" style={{ backgroundColor: config.accent }}
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: idx * 0.08 }} />
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
                          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{done} ações finalizadas</p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>

                  {/* Expanded panel */}
                  {isEndOfRow && openInThisRow && (() => {
                    const expandConfig = getGoalStyle(openInThisRow.goal.description);
                    return (
                      <motion.div
                        key={`expand-${openInThisRow.goal.id}`}
                        className="md:col-span-2"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="relative">
                          <div className="flex justify-center mb-2">
                            <motion.div className="w-0.5 h-4 rounded-full" style={{ background: `linear-gradient(to bottom, ${expandConfig.accent}60, transparent)` }}
                              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3 }} />
                          </div>
                          <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                              background: expandConfig.bg,
                              border: `1px solid ${expandConfig.accent}15`,
                              boxShadow: `0 8px 32px -8px rgba(0,0,0,0.4)`,
                            }}
                          >
                            <div className="relative z-10 p-5">
                              <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                                <img src={expandConfig.icon3d} alt="" className="w-8 h-8 object-contain drop-shadow-lg" loading="lazy" />
                                <span className="text-sm font-bold text-white">{openInThisRow.goal.description}</span>
                              </div>
                              {openInThisRow.tasks.length > 0 ? (
                                <div className="space-y-3">
                                  {openInThisRow.tasks.map((parent, ti) => {
                                    const children = childrenOf(parent.id);
                                    const doneCount = children.filter(c => c.status === "concluido").length;
                                    const taskPct = children.length > 0 ? Math.round((doneCount / children.length) * 100) : 0;

                                    return (
                                      <motion.div
                                        key={parent.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: ti * 0.1 }}
                                        className="rounded-xl overflow-hidden"
                                        style={{
                                          background: "rgba(255,255,255,0.03)",
                                          border: "1px solid rgba(255,255,255,0.06)",
                                        }}
                                      >
                                        <div className="p-4">
                                          <div className="flex items-start justify-between gap-3 mb-2">
                                            <span className="font-semibold text-white text-sm">{parent.description}</span>
                                            {children.length > 0 && (
                                              <span className="text-xs font-bold text-white shrink-0">{taskPct}%</span>
                                            )}
                                          </div>
                                          {parent.objective && <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>{parent.objective}</p>}
                                          {children.length > 0 && (
                                            <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.08]">
                                              <motion.div className="h-full rounded-full" style={{ backgroundColor: expandConfig.accent }}
                                                initial={{ width: 0 }} animate={{ width: `${taskPct}%` }} transition={{ duration: 0.8 }} />
                                            </div>
                                          )}
                                        </div>
                                        {children.length > 0 && (
                                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                                            {children.map((child) => {
                                              const isDone = child.status === "concluido";
                                              const isInProgress = child.status === "em_andamento";
                                              return (
                                                <div key={child.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                                  {isDone ? (
                                                    <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: expandConfig.accent }} />
                                                  ) : isInProgress ? (
                                                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: `2px solid ${expandConfig.accent}80` }}>
                                                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: expandConfig.accent }} />
                                                    </div>
                                                  ) : (
                                                    <Circle className="h-6 w-6 shrink-0 text-white/20" />
                                                  )}
                                                  <span className={`text-sm ${isDone ? "line-through" : ""}`} style={{ color: isDone ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.8)" }}>
                                                    {child.description}
                                                  </span>
                                                  {isDone && <span className="ml-auto text-[10px] font-medium" style={{ color: expandConfig.accent }}>✓</span>}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="py-8 text-center">
                                  <ClipboardList className="h-8 w-8 text-white/20 mx-auto mb-2" />
                                  <p className="text-white/50 text-sm">Nenhuma ação cadastrada para este objetivo.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </div>

          {/* Ungrouped tasks */}
          {ungroupedTasks.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">Outras Tarefas</h3>
              </div>
              <div className="space-y-3">
                {ungroupedTasks.map((parent) => {
                  const children = childrenOf(parent.id);
                  const doneCount = children.filter(c => c.status === "concluido").length;
                  const pct = children.length > 0 ? Math.round((doneCount / children.length) * 100) : 0;

                  return (
                    <Card key={parent.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-foreground">{parent.description}</h3>
                              {parent.objective && <p className="text-sm text-muted-foreground mt-1">{parent.objective}</p>}
                            </div>
                            {children.length > 0 && (
                              <div className="flex flex-col items-end shrink-0">
                                <span className="text-2xl font-bold text-foreground">{pct}%</span>
                                <span className="text-xs text-muted-foreground">{doneCount}/{children.length}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {children.length > 0 && (
                          <div className="border-t border-border/40">
                            {children.map((child, ci) => {
                              const isDone = child.status === "concluido";
                              const isInProgress = child.status === "em_andamento";
                              return (
                                <div key={child.id} className={`flex items-start gap-3 px-5 py-3.5 ${ci !== children.length - 1 ? "border-b border-border/30" : ""} ${isDone ? "bg-muted/20" : ""}`}>
                                  <div className="mt-0.5 shrink-0">
                                    {isDone ? (
                                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                      </div>
                                    ) : isInProgress ? (
                                      <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full border-2 border-border" />
                                    )}
                                  </div>
                                  <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{child.description}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INVESTIMENTOS ────────────────────────── */}
      {(activeTab === "investimentos" || !hasActions) && hasInvestments && (
        <InvestmentsSection recommendations={recommendations} />
      )}
    </PageTransition>
  );
};

// ── Investments Section ────────────────────────────────

const InvestmentsSection = ({ recommendations }: { recommendations: InvestmentRec[] }) => {
  const totalAllocation = recommendations.reduce((s, r) => s + r.allocation_pct, 0);
  const appliedCount = recommendations.filter((r) => r.status === "aplicado").length;
  const totalInvested = recommendations.reduce((s, r) => s + (r.invested_amount || 0), 0);

  const typeMap: Record<string, number> = {};
  recommendations.forEach((r) => {
    typeMap[r.product_type] = (typeMap[r.product_type] || 0) + r.allocation_pct;
  });
  const donutData = Object.entries(typeMap).map(([type, pct]) => ({
    name: TYPE_LABELS[type] || type,
    value: pct,
    color: TYPE_COLORS[type] || "hsl(var(--muted-foreground))",
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Investido</p>
            <p className="text-xl font-bold text-foreground">{fmt(totalInvested)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{appliedCount} de {recommendations.length} aplicados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Produtos Recomendados</p>
            <p className="text-xl font-bold text-foreground">{recommendations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Alocação Total</p>
            <p className="text-xl font-bold text-foreground">{totalAllocation}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChartIcon className="h-6 w-6 text-primary" />
            Alocação Sugerida
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} strokeWidth={3} stroke="hsl(var(--card))">
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => [`${value}%`, "Alocação"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "0.75rem" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3 flex-1 w-full sm:w-auto">
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-sm text-foreground font-medium flex-1">{d.name}</span>
                  <span className="text-sm font-bold text-foreground">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Target className="h-6 w-6 text-primary" />
          Recomendações do Consultor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => {
            const risk = RISK_CONFIG[rec.risk_level] || RISK_CONFIG.baixo;
            const isApplied = rec.status === "aplicado";

            return (
              <Card key={rec.id} className="overflow-hidden transition-shadow hover:shadow-md h-fit">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <h4 className="text-base font-semibold text-foreground leading-tight">{rec.product_name}</h4>
                      {isApplied ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 text-xs">Aplicado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-xs">Pendente</Badge>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-3xl font-bold text-foreground tracking-tight">{rec.allocation_pct}%</span>
                      <p className="text-xs text-muted-foreground">alocação</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {(rec.invested_amount ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                        <DollarSign className="h-6 w-6" /> {fmt(rec.invested_amount!)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PieChartIcon className="h-6 w-6" /> {TYPE_LABELS[rec.product_type] || rec.product_type}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${risk.color}`}>
                      <ShieldCheck className="h-6 w-6" /> {risk.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {rec.expected_return && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendingUp className="h-6 w-6" /> {rec.expected_return}
                      </span>
                    )}
                    {rec.liquidity && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Zap className="h-6 w-6" /> {rec.liquidity}
                      </span>
                    )}
                    {(rec.min_investment ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <DollarSign className="h-6 w-6" /> Mín. {fmt(rec.min_investment!)}
                      </span>
                    )}
                  </div>

                  {rec.rationale && (
                    <div className="flex gap-2.5 p-3 bg-muted/30 rounded-xl border border-border/30">
                      <Info className="h-6 w-6 text-primary/50 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActionPlan;
