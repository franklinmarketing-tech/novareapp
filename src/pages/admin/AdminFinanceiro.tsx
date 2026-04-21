import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { ArrowUpRight, UserPlus, Sparkles, AlertTriangle, Landmark, TrendingUp, TrendingDown, Flame } from "lucide-react";
import PageBanner from "@/components/PageBanner";
import { SEO } from "@/components/SEO";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "framer-motion";
import { ScrollableTable } from "@/components/ui/scrollable-table";

import iconVault from "@/assets/icon-vault-3d.png";
import iconGrowth from "@/assets/icon-growth-3d.png";
import iconPipeline from "@/assets/icon-pipeline-3d.png";
import iconPremium from "@/assets/icon-premium-3d.png";

/* ── Formatters ── */
const fmtShort = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${Math.round(abs)}`;
};

const fmtFull = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const STATUS_MAP: Record<string, { label: string; variant: "warning" | "accent" | "success" }> = {
  onboarding_pendente: { label: "Onboarding", variant: "warning" },
  em_diagnostico: { label: "Diagnóstico", variant: "accent" },
  em_acompanhamento: { label: "Ativo", variant: "success" },
};

const PIPE_COLORS = ["#64748b", "#fbbf24", "#34d399"];

interface ClientFinancial {
  id: string;
  slug: string;
  name: string;
  email: string;
  status: string;
  totalIncome: number;
  totalExpenses: number;
  totalAssets: number;
  totalDebts: number;
}

/* ── Narrative Generator ── */
const getConsultantNarrative = (totalAssets: number, activeClients: number, totalClients: number, conversionRate: number, netWorth: number) => {
  if (totalClients === 0) return null;
  if (conversionRate >= 70 && activeClients >= 3) return { emoji: "🏆", text: `Pipeline rodando com ${conversionRate.toFixed(0)}% de conversão — sua máquina está afiada.`, tone: "positive" as const };
  if (netWorth > 500_000) return { emoji: "🚀", text: `${fmtShort(netWorth)} sob gestão líquida. Você está construindo uma carteira sólida.`, tone: "positive" as const };
  if (conversionRate < 40 && totalClients >= 3) return { emoji: "⚡", text: `Apenas ${conversionRate.toFixed(0)}% convertido — foque em acelerar o onboarding para destravar receita.`, tone: "warning" as const };
  return { emoji: "📈", text: `${activeClients} cliente${activeClients !== 1 ? "s" : ""} ativo${activeClients !== 1 ? "s" : ""} com potencial de crescimento. Continue alimentando o pipeline.`, tone: "positive" as const };
};

/* ── 3D Card wrapper ── */
const Card3D = ({ children, className = "", gradient, glow }: {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  glow?: string;
}) => (
  <div
    className={`relative rounded-2xl overflow-hidden ${className}`}
    style={{
      background: gradient || "linear-gradient(145deg, #0d1b2a 0%, #1b3a5c 35%, #1a2d4a 65%, #0d1b2a 100%)",
      border: "1px solid rgba(96,165,250,0.12)",
      borderTop: "1px solid rgba(96,165,250,0.18)",
      borderBottom: "1px solid rgba(0,0,0,0.3)",
      boxShadow: "0 1px 0 rgba(96,165,250,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 12px 40px -10px rgba(0,0,0,0.5), 0 4px 12px -4px rgba(0,0,0,0.3)",
    }}
  >
    {/* Inner highlight border */}
    <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
      borderTop: "1px solid rgba(96,165,250,0.1)",
      borderLeft: "1px solid rgba(96,165,250,0.05)",
      borderBottom: "1px solid rgba(0,0,0,0.2)",
      borderRight: "1px solid rgba(0,0,0,0.1)",
    }} />
    {/* Glow */}
    {glow && (
      <motion.div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: glow }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    )}
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

/* ── Component ── */
const AdminFinanceiro = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientFinancial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: clientRows } = await supabase.from("clients").select("id, user_id, status, slug");
      if (!clientRows?.length) { setLoading(false); return; }

      const userIds = clientRows.map((c) => c.user_id);
      const clientIds = clientRows.map((c) => c.id);

      const [profilesRes, incomeRes, expensesRes, assetsRes, debtsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds),
        supabase.from("income").select("client_id, amount").in("client_id", clientIds),
        supabase.from("expenses").select("client_id, amount").in("client_id", clientIds),
        supabase.from("assets").select("client_id, estimated_value").in("client_id", clientIds),
        supabase.from("debts").select("client_id, total_amount").in("client_id", clientIds),
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map((p) => [p.user_id, p]));
      const sum = (arr: any[] | null, cid: string, field: string) =>
        (arr || []).filter((r) => r.client_id === cid).reduce((s, r) => s + Number(r[field] || 0), 0);

      setClients(clientRows.map((c) => ({
        id: c.id, slug: c.slug || c.id,
        name: profileMap[c.user_id]?.full_name || "—",
        email: profileMap[c.user_id]?.email || "",
        status: c.status,
        totalIncome: sum(incomeRes.data, c.id, "amount"),
        totalExpenses: sum(expensesRes.data, c.id, "amount"),
        totalAssets: sum(assetsRes.data, c.id, "estimated_value"),
        totalDebts: sum(debtsRes.data, c.id, "total_amount"),
      })));
      setLoading(false);
    };
    load();
  }, []);

  /* ── Derived ── */
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "em_acompanhamento").length;
  const totalIncome = clients.reduce((s, c) => s + c.totalIncome, 0);
  const totalExpenses = clients.reduce((s, c) => s + c.totalExpenses, 0);
  const totalAssets = clients.reduce((s, c) => s + c.totalAssets, 0);
  const totalDebts = clients.reduce((s, c) => s + c.totalDebts, 0);
  const netWorth = totalAssets - totalDebts;
  const avgTicket = totalClients > 0 ? totalIncome / totalClients : 0;
  const conversionRate = totalClients > 0 ? (activeClients / totalClients * 100) : 0;

  const pipelineData = [
    { name: "Onboarding", value: clients.filter((c) => c.status === "onboarding_pendente").length },
    { name: "Diagnóstico", value: clients.filter((c) => c.status === "em_diagnostico").length },
    { name: "Ativos", value: activeClients },
  ];

  const assetData = clients
    .filter((c) => c.totalAssets > 0)
    .sort((a, b) => b.totalAssets - a.totalAssets)
    .slice(0, 8)
    .map((c) => ({ name: c.name.split(" ")[0], patrimonio: c.totalAssets }));

  const narrative = getConsultantNarrative(totalAssets, activeClients, totalClients, conversionRate, netWorth);

  /* ── Insights ── */
  const insights: { text: string; severity: "success" | "warning" | "destructive"; action?: () => void; actionLabel?: string }[] = [];
  const stuckOnboarding = clients.filter((c) => c.status === "onboarding_pendente").length;
  if (stuckOnboarding > 0) insights.push({ text: `${stuckOnboarding} cliente${stuckOnboarding > 1 ? "s" : ""} parado${stuckOnboarding > 1 ? "s" : ""} no onboarding — receita potencial travada.`, severity: "warning", action: () => navigate("/admin/clientes"), actionLabel: "Ver clientes" });
  const highDebtClients = clients.filter((c) => c.totalIncome > 0 && c.totalDebts > c.totalIncome * 12);
  if (highDebtClients.length > 0) insights.push({ text: `${highDebtClients.length} cliente${highDebtClients.length > 1 ? "s" : ""} com dívida superior a 12x a renda anual.`, severity: "destructive" });
  const negativeFlow = clients.filter((c) => c.totalIncome > 0 && c.totalExpenses > c.totalIncome);
  if (negativeFlow.length > 0) insights.push({ text: `${negativeFlow.length} cliente${negativeFlow.length > 1 ? "s" : ""} com fluxo de caixa negativo — atenção imediata.`, severity: "destructive" });
  if (conversionRate >= 60 && totalClients >= 3) insights.push({ text: `Taxa de conversão de ${conversionRate.toFixed(0)}% — ótimo sinal de eficiência.`, severity: "success" });

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl border border-border/60 bg-card space-y-3">
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-7 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="space-y-8">
        <PageBanner title="Financeiro" description="Visão financeira da sua consultoria" icon={Landmark} />
        <Card className="rounded-3xl border-border/40">
          <CardContent className="py-16">
            <EmptyState
              icon={Landmark}
              tone="accent"
              title="Seu panorama financeiro começa aqui"
              description="Conforme você cadastra clientes e preenche dados financeiros, este painel mostrará patrimônio sob gestão, pipeline de conversão e insights acionáveis."
              action={
                <Button onClick={() => navigate("/admin/novo-cliente")} variant="premium" size="lg" className="rounded-2xl gap-2">
                  <UserPlus className="h-6 w-6" /> Cadastrar primeiro cliente
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO title="Financeiro" description="Painel financeiro da consultoria Novare: patrimônio, pipeline e insights." index={false} />
      <PageBanner title="Financeiro" description="Visão financeira da sua consultoria" icon={Landmark} />

      {/* ━━━ HERO: North Star + Narrative ━━━ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
        <Card3D glow="radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)">
          <div className="p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* North Star */}
              <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
                <motion.div
                  className="shrink-0"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <img src={iconVault} alt="" className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]" />
                </motion.div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-medium tracking-widest uppercase" style={{ color: "rgba(96,165,250,0.6)" }}>
                    Patrimônio sob Gestão
                  </span>
                  <motion.p
                    className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white tabular-nums"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    {fmtShort(totalAssets)}
                  </motion.p>
                  {narrative && (
                    <p className="text-xs sm:text-sm mt-2 max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
                      <span className="mr-1">{narrative.emoji}</span>{narrative.text}
                    </p>
                  )}
                </div>
              </div>

              {/* Secondary KPIs */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {[
                  { icon: iconGrowth, value: fmtShort(totalIncome), label: "Receita pot.", accent: "#34d399" },
                  { icon: iconPremium, value: fmtShort(avgTicket), label: "Ticket médio", accent: "#fbbf24" },
                  { icon: iconPipeline, value: `${conversionRate.toFixed(0)}%`, label: "Conversão", accent: "#60a5fa" },
                ].map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    className="text-center lg:text-right"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <div className="flex items-center justify-center lg:justify-end gap-1.5 mb-1">
                      <img src={kpi.icon} alt="" className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md" loading="lazy" />
                    </div>
                    <p className="text-base sm:text-xl lg:text-2xl font-bold text-white tabular-nums">{kpi.value}</p>
                    <p className="text-[0.625rem] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{kpi.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Card3D>
      </motion.div>

      {/* ━━━ Snapshot KPIs (3D Bento Grid) ━━━ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Patrimônio Líquido", value: fmtShort(netWorth), positive: netWorth >= 0, accent: "#60a5fa", gradient: "linear-gradient(145deg, #0d1b2a 0%, #1e3a5f 50%, #0d1b2a 100%)", icon: <Sparkles className="h-6 w-6" style={{ color: "#60a5fa" }} /> },
          { label: "Fluxo de Caixa", value: `${totalIncome - totalExpenses >= 0 ? "+" : ""}${fmtShort(totalIncome - totalExpenses)}`, positive: totalIncome >= totalExpenses, accent: "#34d399", gradient: "linear-gradient(145deg, #0a1f1a 0%, #064e3b 50%, #0a1f1a 100%)", icon: <TrendingUp className="h-6 w-6" style={{ color: "#34d399" }} /> },
          { label: "Total Clientes", value: totalClients.toString(), positive: true, accent: "#fbbf24", gradient: "linear-gradient(145deg, #1a1708 0%, #422006 50%, #1a1708 100%)", icon: <UserPlus className="h-6 w-6" style={{ color: "#fbbf24" }} />, subtitle: `${activeClients} ativo${activeClients !== 1 ? "s" : ""}` },
          { label: "Dívidas Totais", value: fmtShort(totalDebts), positive: totalDebts === 0, accent: "#f87171", gradient: "linear-gradient(145deg, #1a0a0a 0%, #7f1d1d 50%, #1a0a0a 100%)", icon: <TrendingDown className="h-6 w-6" style={{ color: "#f87171" }} /> },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
          >
            <div
              className="relative rounded-2xl overflow-hidden p-4 lg:p-5 hover:-translate-y-0.5 transition-transform duration-300"
              style={{
                background: kpi.gradient,
                border: `1px solid ${kpi.accent}18`,
                borderTop: `1px solid ${kpi.accent}25`,
                borderBottom: "1px solid rgba(0,0,0,0.3)",
                boxShadow: `0 1px 0 ${kpi.accent}08 inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 8px 24px -6px rgba(0,0,0,0.4)`,
              }}
            >
              {/* Inner highlight */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
                borderTop: `1px solid ${kpi.accent}10`,
                borderBottom: "1px solid rgba(0,0,0,0.2)",
              }} />
              <div className="relative z-10">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${kpi.accent}15` }}>
                  {kpi.icon}
                </div>
                <p className={`text-xl lg:text-2xl font-bold tabular-nums text-white`}>{kpi.value}</p>
                <p className="text-[0.6875rem] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{kpi.label}</p>
                {kpi.subtitle && <p className="text-[0.625rem] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{kpi.subtitle}</p>}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ━━━ Insights Acionáveis ━━━ */}
      {insights.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="space-y-2">
          {insights.slice(0, 3).map((ins, i) => {
            const colors = { warning: "border-warning/30 bg-warning/[0.04]", destructive: "border-destructive/30 bg-destructive/[0.04]", success: "border-success/30 bg-success/[0.04]" };
            const iconColor = { warning: "text-warning", destructive: "text-destructive", success: "text-success" };
            const InsIcon = ins.severity === "success" ? Sparkles : ins.severity === "destructive" ? Flame : AlertTriangle;
            return (
              <div key={i} className={`flex items-center gap-3 rounded-2xl border ${colors[ins.severity]} px-5 py-3`}>
                <InsIcon className={`h-6 w-6 ${iconColor[ins.severity]} shrink-0`} />
                <p className="text-sm text-foreground flex-1">{ins.text}</p>
                {ins.action && (
                  <Button size="sm" variant="ghost" onClick={ins.action} className={`shrink-0 ${iconColor[ins.severity]} gap-1 text-xs`}>
                    {ins.actionLabel} <ArrowUpRight className="h-6 w-6" />
                  </Button>
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ━━━ Charts: 3D Dark Cards ━━━ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="grid lg:grid-cols-2 gap-4">
        {/* Pipeline */}
        <Card3D
          gradient="linear-gradient(145deg, #111c2e 0%, #1e3a5f 40%, #111c2e 100%)"
          glow="radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)"
        >
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <motion.img
                src={iconPipeline} alt="" className="w-8 h-8 drop-shadow-lg" loading="lazy"
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
              <div>
                <p className="text-sm font-semibold text-white">Pipeline de Clientes</p>
                <p className="text-[0.6875rem]" style={{ color: "rgba(255,255,255,0.4)" }}>{totalClients} total · {activeClients} convertidos</p>
              </div>
            </div>
            <ChartContainer config={{ pipeline: { label: "Clientes" } }} className="h-[180px] sm:h-[200px] w-full [&_.recharts-text]:!fill-white/50">
              <PieChart>
                <Pie data={pipelineData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} strokeWidth={0}>
                  {pipelineData.map((_, i) => (<Cell key={i} fill={PIPE_COLORS[i]} />))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-5 mt-3">
              {pipelineData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIPE_COLORS[i] }} />
                  {d.name} <span className="font-bold text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card3D>

        {/* Asset distribution */}
        <Card3D
          gradient="linear-gradient(145deg, #0a1f1a 0%, #0f3d2e 40%, #0a1f1a 100%)"
          glow="radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)"
        >
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <motion.img
                src={iconGrowth} alt="" className="w-8 h-8 drop-shadow-lg" loading="lazy"
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
              <div>
                <p className="text-sm font-semibold text-white">Patrimônio por Cliente</p>
                <p className="text-[0.6875rem]" style={{ color: "rgba(255,255,255,0.4)" }}>Top {assetData.length} por valor</p>
              </div>
            </div>
            {assetData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Landmark className="h-8 w-8 mb-2" style={{ color: "rgba(255,255,255,0.15)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Patrimônio aparecerá quando clientes tiverem ativos.</p>
              </div>
            ) : (
              <ChartContainer config={{ patrimonio: { label: "Patrimônio", color: "#34d399" } }} className="h-[180px] sm:h-[200px] w-full">
                <BarChart data={assetData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtFull(Number(value))} />} />
                  <Bar dataKey="patrimonio" fill="#34d399" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </Card3D>
      </motion.div>

      {/* ━━━ Client Table (3D) ━━━ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
        <Card3D
          gradient="linear-gradient(145deg, #0d1b2a 0%, #162d4a 40%, #0d1b2a 100%)"
          glow="radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)"
        >
          <div>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <motion.img
                  src={iconPremium} alt="" className="w-7 h-7 drop-shadow-lg shrink-0" loading="lazy"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">Detalhamento por Cliente</p>
                  <p className="text-[10px] sm:hidden" style={{ color: "rgba(255,255,255,0.4)" }}>← Arraste para ver mais →</p>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-md text-white/30 shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {totalClients} cliente{totalClients !== 1 ? "s" : ""}
              </span>
            </div>
            <ScrollableTable fadeColor="rgba(13,27,42,0.95)">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-t border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Cliente</th>
                    <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Status</th>
                    <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Renda</th>
                    <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Despesas</th>
                    <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Patrimônio</th>
                    <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Dívidas</th>
                    <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, i) => {
                    const saldo = c.totalIncome - c.totalExpenses;
                    const st = STATUS_MAP[c.status] || { label: c.status, variant: "warning" as const };
                    return (
                      <tr
                        key={c.id}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onClick={() => navigate(`/admin/cliente/${c.slug}/onboarding`)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-white text-sm">{c.name}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{c.email}</p>
                        </td>
                        <td className="px-3 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                        <td className="px-3 py-3 text-right tabular-nums text-white/70">{fmtShort(c.totalIncome)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-white/70">{fmtShort(c.totalExpenses)}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-white">{fmtShort(c.totalAssets)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-white/70">{fmtShort(c.totalDebts)}</td>
                        <td className={`px-5 py-3 text-right tabular-nums font-semibold ${saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {saldo >= 0 ? "+" : ""}{fmtShort(saldo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        </Card3D>
      </motion.div>
    </div>
  );
};

export default AdminFinanceiro;
