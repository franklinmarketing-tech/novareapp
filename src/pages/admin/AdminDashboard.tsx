import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Card3D } from "@/components/ui/card-3d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Clock, AlertTriangle, CheckCircle, Target,
  ChevronRight, LayoutDashboard, TrendingUp, Sparkles,
  ArrowRight, Zap, ClipboardCheck, CalendarDays, ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import PageBanner from "@/components/PageBanner";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";
import AdvancedMetrics from "@/components/admin/AdvancedMetrics";
import DashboardCharts from "@/components/admin/DashboardCharts";

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

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

type PeriodPreset = "this_month" | "last_month" | "last_3" | "last_6" | "this_year" | "last_year" | "custom";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [periodMonths, setPeriodMonths] = useState(1); // quantos meses o período cobre (1, 3, 6, 12)
  const [activePreset, setActivePreset] = useState<PeriodPreset>("this_month");
  const [adminName, setAdminName] = useState("");
  const [stats, setStats] = useState({ total: 0, onboarding: 0, diagnostico: 0, acompanhamento: 0 });
  const [netWealth, setNetWealth] = useState(0);
  const [avgPlanProgress, setAvgPlanProgress] = useState(0);
  const [unclassifiedCount, setUnclassifiedCount] = useState(0);
  const [recentClients, setRecentClients] = useState<{ id: string; slug: string; status: string; name: string; risk?: string }[]>([]);
  const [pendingActions, setPendingActions] = useState<{ id: string; description: string; area: string; client_name?: string; client_slug?: string }[]>([]);
  const [unconfirmedClients, setUnconfirmedClients] = useState<{ id: string; slug: string; name: string; lastConfirmed?: string }[]>([]);

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear() && periodMonths === 1;
  const monthRef = useMemo(() => `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`, [selectedMonth, selectedYear]);

  // Período selecionado: termina no fim do selectedMonth/selectedYear, começa periodMonths atrás
  const periodLabel = useMemo(() => {
    if (periodMonths === 1) return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    const startD = new Date(selectedYear, selectedMonth - (periodMonths - 1), 1);
    if (periodMonths === 12 && selectedMonth === 11) return `${selectedYear}`;
    return `${MONTH_NAMES[startD.getMonth()].slice(0, 3)}/${startD.getFullYear()} → ${MONTH_NAMES[selectedMonth].slice(0, 3)}/${selectedYear}`;
  }, [selectedMonth, selectedYear, periodMonths]);

  const applyPreset = (preset: PeriodPreset) => {
    setActivePreset(preset);
    const today = new Date();
    if (preset === "this_month") {
      setSelectedMonth(today.getMonth()); setSelectedYear(today.getFullYear()); setPeriodMonths(1);
    } else if (preset === "last_month") {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      setSelectedMonth(d.getMonth()); setSelectedYear(d.getFullYear()); setPeriodMonths(1);
    } else if (preset === "last_3") {
      setSelectedMonth(today.getMonth()); setSelectedYear(today.getFullYear()); setPeriodMonths(3);
    } else if (preset === "last_6") {
      setSelectedMonth(today.getMonth()); setSelectedYear(today.getFullYear()); setPeriodMonths(6);
    } else if (preset === "this_year") {
      setSelectedMonth(today.getMonth()); setSelectedYear(today.getFullYear()); setPeriodMonths(today.getMonth() + 1);
    } else if (preset === "last_year") {
      setSelectedMonth(11); setSelectedYear(today.getFullYear() - 1); setPeriodMonths(12);
    }
  };

  const goToPrevMonth = () => {
    setActivePreset("custom");
    setPeriodMonths(1);
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    setActivePreset("custom");
    setPeriodMonths(1);
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setAdminName(data.full_name?.split(" ")[0] || ""); });
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      // Período: termina no fim do selectedMonth, começa no início de (selectedMonth - periodMonths + 1)
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
      const startOfMonth = new Date(selectedYear, selectedMonth - (periodMonths - 1), 1);
      const startISO = startOfMonth.toISOString();
      const endISO = endOfMonth.toISOString();

      const { data: clients } = await supabase
        .from("clients").select("id, status, user_id, slug, created_at")
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });
      if (!clients || clients.length === 0) {
        setStats({ total: 0, onboarding: 0, diagnostico: 0, acompanhamento: 0 });
        setRecentClients([]);
        setPendingActions([]);
        setUnconfirmedClients([]);
        setNetWealth(0);
        setAvgPlanProgress(0);
        return;
      }

      const onboarding = clients.filter((c) => c.status === "onboarding_pendente").length;
      const diagnostico = clients.filter((c) => c.status === "em_diagnostico").length;
      const acompanhamento = clients.filter((c) => c.status === "em_acompanhamento").length;
      setStats({ total: clients.length, onboarding, diagnostico, acompanhamento });

      const userIds = clients.map((c) => c.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = p.full_name || "Sem nome"; });
      const clientMap: Record<string, string> = {};
      clients.forEach((c) => { clientMap[c.id] = profileMap[c.user_id] || "Sem nome"; });

      const clientIds = clients.map((c) => c.id);
      const { data: diagnoses } = await supabase.from("diagnosis").select("client_id, risk_classification").in("client_id", clientIds);
      const diagMap: Record<string, string> = {};
      diagnoses?.forEach((d) => { diagMap[d.client_id] = d.risk_classification || "C"; });

      const classifiedIds = new Set(diagnoses?.map((d) => d.client_id) || []);
      setUnclassifiedCount(clients.filter((c) => !classifiedIds.has(c.id)).length);

      const slugMap: Record<string, string> = {};
      clients.forEach((c) => { slugMap[c.id] = c.slug; });

      setRecentClients(clients.slice(0, 5).map((c) => ({
        id: c.id, slug: c.slug, status: c.status, name: clientMap[c.id], risk: diagMap[c.id],
      })));

      // ── Wealth & Progress: use snapshots for past months, live for current ──
      if (isCurrentMonth) {
        const [assetsRes, debtsRes] = await Promise.all([
          supabase.from("assets").select("estimated_value").in("client_id", clientIds),
          supabase.from("debts").select("total_amount").in("client_id", clientIds),
        ]);
        const assets = assetsRes.data?.reduce((s, r) => s + (r.estimated_value || 0), 0) || 0;
        const debts = debtsRes.data?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0;
        setNetWealth(assets - debts);
      } else {
        // Use monitoring_snapshots closest to end of selected month
        const { data: snapshots } = await supabase
          .from("monitoring_snapshots")
          .select("total_assets, total_debts, plan_completion_pct, client_id")
          .in("client_id", clientIds)
          .gte("snapshot_date", startISO.slice(0, 10))
          .lte("snapshot_date", endISO.slice(0, 10));
        if (snapshots && snapshots.length > 0) {
          // Use the latest snapshot per client
          const latestByClient: Record<string, typeof snapshots[0]> = {};
          snapshots.forEach((s) => { latestByClient[s.client_id] = s; });
          const vals = Object.values(latestByClient);
          const totalAssets = vals.reduce((s, r) => s + (r.total_assets || 0), 0);
          const totalDebts = vals.reduce((s, r) => s + (r.total_debts || 0), 0);
          setNetWealth(totalAssets - totalDebts);
          const withProgress = vals.filter((v) => v.plan_completion_pct != null);
          setAvgPlanProgress(withProgress.length > 0
            ? Math.round(withProgress.reduce((s, v) => s + (v.plan_completion_pct || 0), 0) / withProgress.length)
            : 0);
        } else {
          setNetWealth(0);
          setAvgPlanProgress(0);
        }
      }

      // ── Action plans & progress (current month only for live progress) ──
      const { data: actionPlans } = await supabase.from("action_plans").select("id, client_id").in("client_id", clientIds);
      if (actionPlans && actionPlans.length > 0) {
        const planIds = actionPlans.map((p) => p.id);
        const planClientMap: Record<string, string> = {};
        actionPlans.forEach((p) => { planClientMap[p.id] = p.client_id; });

        const { data: allItems } = await supabase
          .from("action_items").select("id, description, area, status, action_plan_id, parent_id")
          .in("action_plan_id", planIds);

        if (allItems) {
          const pending = allItems.filter((i) => i.status === "pendente" && i.parent_id).slice(0, 5)
            .map((item) => {
              const cId = planClientMap[item.action_plan_id];
              return { ...item, client_name: clientMap[cId] || "—", client_slug: slugMap[cId] || cId };
            });
          setPendingActions(pending);

          if (isCurrentMonth) {
            const planProgressMap: Record<string, { done: number; total: number }> = {};
            allItems.forEach((item) => {
              if (item.parent_id) {
                if (!planProgressMap[item.action_plan_id]) planProgressMap[item.action_plan_id] = { done: 0, total: 0 };
                planProgressMap[item.action_plan_id].total++;
                if (item.status === "concluido") planProgressMap[item.action_plan_id].done++;
              }
            });
            const progressValues = Object.values(planProgressMap).filter((p) => p.total > 0);
            setAvgPlanProgress(progressValues.length > 0
              ? Math.round(progressValues.reduce((s, p) => s + (p.done / p.total) * 100, 0) / progressValues.length)
              : 0);
          }
        }
      } else {
        setPendingActions([]);
        if (isCurrentMonth) setAvgPlanProgress(0);
      }

      // Fetch clients who haven't confirmed data this month
      const { data: confirmations } = await supabase
        .from("data_confirmations")
        .select("client_id")
        .eq("month_ref", monthRef);
      const confirmedIds = new Set(confirmations?.map((c) => c.client_id) || []);
      const activeClients = clients.filter((c) => c.status !== "onboarding_pendente");
      const unconfirmed = activeClients
        .filter((c) => !confirmedIds.has(c.id))
        .slice(0, 5)
        .map((c) => ({ id: c.id, slug: c.slug, name: clientMap[c.id] }));
      setUnconfirmedClients(unconfirmed);
    };
    fetchData();
  }, [monthRef, isCurrentMonth, selectedMonth, selectedYear, periodMonths]);

  const statusLabels: Record<string, string> = {
    onboarding_pendente: "Onboarding",
    em_diagnostico: "Diagnóstico",
    em_acompanhamento: "Acompanhamento",
  };

  const statusColors: Record<string, string> = {
    onboarding_pendente: "bg-accent/10 text-accent",
    em_diagnostico: "bg-destructive/10 text-destructive",
    em_acompanhamento: "bg-success/10 text-success",
  };

  /* ── Generate smart insight ──────────────────────── */
  const generateInsight = () => {
    if (stats.total === 0) return { text: "Cadastre seu primeiro cliente para começar", action: "/admin/novo-cliente", actionLabel: "Novo cliente" };
    if (stats.onboarding > 0) return { text: `${stats.onboarding} cliente${stats.onboarding > 1 ? "s" : ""} aguardando onboarding — avance para não perder o timing`, action: "/admin/clientes", actionLabel: "Ver clientes" };
    if (unclassifiedCount > 0) return { text: `${unclassifiedCount} cliente${unclassifiedCount > 1 ? "s" : ""} sem diagnóstico — classifique para liberar o plano de ação`, action: "/admin/clientes", actionLabel: "Diagnosticar" };
    if (pendingActions.length > 0) return { text: `${pendingActions.length} ações pendentes nos planos — resolva para manter o progresso`, action: null, actionLabel: "" };
    return { text: "Tudo em dia! Seus clientes estão progredindo bem 🎉", action: null, actionLabel: "" };
  };

  const insight = generateInsight();

  return (
    <PageTransition className="space-y-6">
      <SEO title="Dashboard" description="Visão geral da sua consultoria Novare: clientes, métricas e progresso." index={false} />
      <PageBanner title="Dashboard" description="Visão geral da sua consultoria" icon={LayoutDashboard} />

      {/* ── Month Selector ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">Competência</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Atalhos rápidos */}
          <div className="flex flex-wrap items-center gap-1 bg-muted/50 rounded-xl p-1">
            {([
              { key: "this_month", label: "Este mês" },
              { key: "last_month", label: "Mês anterior" },
              { key: "last_3", label: "Últimos 3m" },
              { key: "last_6", label: "Últimos 6m" },
              { key: "this_year", label: "Este ano" },
              { key: "last_year", label: "Ano anterior" },
            ] as { key: PeriodPreset; label: string }[]).map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activePreset === p.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Navegação mês a mês */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
            <button
              onClick={goToPrevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="px-3 py-1.5 text-xs font-semibold text-foreground min-w-[120px] sm:min-w-[160px] text-center">
              {periodLabel}
            </span>
            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isCurrentMonth ? "opacity-30 cursor-not-allowed" : "hover:bg-background"}`}
              title="Próximo mês"
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Smart Insight Card ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-4 rounded-2xl border border-accent/20 bg-accent/[0.04] px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Zap className="h-6 w-6 text-accent" />
          </div>
          <p className="text-sm text-foreground flex-1 font-medium">{insight.text}</p>
          {insight.action && (
            <Button size="sm" variant="ghost" onClick={() => navigate(insight.action!)} className="shrink-0 text-accent hover:text-accent gap-1">
              {insight.actionLabel} <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── North Star + Supporting KPIs ── */}
      <motion.div initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* North Star: Total Clients */}
        <motion.div variants={fadeUp} custom={0}>
          <Card3D interactive glowColor="rgba(96,165,250,0.1)">
            <div className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-6 w-6 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Clientes ativos</span>
              </div>
              <p className="text-5xl font-bold text-foreground tracking-tight tabular-nums">{stats.total}</p>
              <div className="flex items-center gap-3 mt-4">
                <PipelineDot color="bg-accent" label="Onboarding" count={stats.onboarding} />
                <PipelineDot color="bg-destructive" label="Diagnóstico" count={stats.diagnostico} />
                <PipelineDot color="bg-success" label="Acompanhamento" count={stats.acompanhamento} />
              </div>
            </div>
          </Card3D>
        </motion.div>

        {/* Supporting: AUM */}
        <motion.div variants={fadeUp} custom={1}>
          <Card3D interactive glowColor="rgba(52,211,153,0.08)">
            <div className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-6 w-6 text-success" />
                <span className="text-xs text-muted-foreground font-medium">Patrimônio sob gestão</span>
              </div>
              <p className={`text-3xl font-bold tracking-tight tabular-nums ${netWealth >= 0 ? "text-foreground" : "text-destructive"}`}>
                {fmtShort(netWealth)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? `Média de ${fmtShort(Math.round(netWealth / stats.total))} por cliente` : "—"}
              </p>
            </div>
          </Card3D>
        </motion.div>

        {/* Supporting: Plan progress */}
        <motion.div variants={fadeUp} custom={2}>
          <Card3D interactive glowColor="rgba(245,158,11,0.08)">
            <div className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-6 w-6 text-accent" />
                <span className="text-xs text-muted-foreground font-medium">Progresso dos planos</span>
              </div>
              <p className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{avgPlanProgress}%</p>
              <Progress value={avgPlanProgress} className="h-2 rounded-full mt-3 [&>div]:bg-accent" />
            </div>
          </Card3D>
        </motion.div>
      </motion.div>

      {/* ── Advanced Metrics: MRR, Funnel, Birthdays ── */}
      <AdvancedMetrics selectedMonth={selectedMonth} selectedYear={selectedYear} />

      {/* ── Charts: wealth evolution + risk distribution ── */}
      <DashboardCharts selectedMonth={selectedMonth} selectedYear={selectedYear} />

      {/* ── Attention: Clients + Actions side by side ── */}
      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once: true }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Recent clients */}
        <motion.div variants={fadeUp} custom={0}>
          <Card3D>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-foreground">Clientes recentes</p>
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clientes")} className="text-xs text-muted-foreground hover:text-foreground gap-1 h-auto py-1 px-2">
                  Ver todos <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
              {recentClients.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  variant="compact"
                  tone="accent"
                  title="Nenhum cliente cadastrado"
                  description="Comece cadastrando seu primeiro cliente."
                  action={
                    <Button variant="premium" size="sm" onClick={() => navigate("/admin/novo-cliente")} className="rounded-xl gap-2">
                      <Sparkles className="h-4 w-4" /> Cadastrar primeiro cliente
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-0.5">
                  {recentClients.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-2.5 px-3 -mx-3 cursor-pointer hover:bg-muted/40 rounded-xl transition-all duration-200 group"
                      onClick={() => navigate(`/admin/cliente/${c.slug}/onboarding`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-semibold text-primary">{c.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium ${statusColors[c.status] || "bg-muted text-muted-foreground"}`}>
                          {statusLabels[c.status] || c.status}
                        </span>
                        <ArrowRight className="h-6 w-6 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card3D>
        </motion.div>

        {/* Pending actions */}
        <motion.div variants={fadeUp} custom={1}>
          <Card3D>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Próximas ações</p>
                  {pendingActions.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-semibold rounded-full px-2">
                      {pendingActions.length}
                    </Badge>
                  )}
                </div>
              </div>
              {pendingActions.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  variant="compact"
                  tone="success"
                  title="Nenhuma ação pendente"
                  description="Seus clientes estão em dia 🎉"
                />
              ) : (
                <div className="space-y-0.5">
                  {pendingActions.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2.5 px-3 -mx-3 cursor-pointer hover:bg-muted/40 rounded-xl transition-all duration-200 group"
                      onClick={() => item.client_slug && navigate(`/admin/cliente/${item.client_slug}/plano-acao`)}
                    >
                      <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
                        <p className="text-[11px] text-muted-foreground">{item.client_name}</p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-muted-foreground/0 group-hover:text-muted-foreground transition-all shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card3D>
        </motion.div>
      </motion.div>

      {/* ── Unconfirmed data clients ── */}
      {unconfirmedClients.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <Card3D>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-6 w-6 text-warning" />
                  <p className="text-sm font-semibold text-foreground">Dados não confirmados este mês</p>
                  <Badge variant="secondary" className="text-[10px] font-semibold rounded-full px-2">
                    {unconfirmedClients.length}
                  </Badge>
                </div>
              </div>
              <div className="space-y-0.5">
                {unconfirmedClients.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2.5 px-3 -mx-3 cursor-pointer hover:bg-muted/40 rounded-xl transition-all duration-200 group"
                    onClick={() => navigate(`/admin/cliente/${c.slug}/onboarding`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-semibold text-warning">{c.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground truncate block">{c.name}</span>
                        <span className="text-[11px] text-muted-foreground">Ainda não confirmou os dados</span>
                      </div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground/0 group-hover:text-muted-foreground transition-all shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </Card3D>
        </motion.div>
      )}
    </PageTransition>
  );
};

/* ── Tiny inline component ── */
const PipelineDot = ({ color, label, count }: { color: string; label: string; count: number }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2 h-2 rounded-full ${color}`} />
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-[11px] font-bold text-foreground tabular-nums">{count}</span>
  </div>
);

export default AdminDashboard;
