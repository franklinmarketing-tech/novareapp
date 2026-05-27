import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar, CartesianGrid,
} from "recharts";
import {
  Activity, TrendingUp, TrendingDown, Minus, CheckCircle2, Target,
  Wallet, Receipt, CreditCard, Building2, Shield, Trophy, Clock,
  Sparkles, type LucideIcon,
} from "lucide-react";

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

const monthLabel = (iso: string) => {
  const d = new Date(iso.length === 7 ? iso + "-01T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(/^\w/, (c) => c.toUpperCase());
};

const formatDate = (d?: string | null) => {
  if (!d) return null;
  return new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("pt-BR");
};

type SourceTable = "income" | "expenses" | "debts" | "assets" | "insurance";
const SECTION_LABEL: Record<SourceTable, string> = {
  income: "Rendas", expenses: "Despesas", debts: "Dívidas", assets: "Patrimônio", insurance: "Seguros",
};
const SECTION_ICON: Record<SourceTable, LucideIcon> = {
  income: Wallet, expenses: Receipt, debts: CreditCard, assets: Building2, insurance: Shield,
};
const SECTION_COLOR: Record<SourceTable, string> = {
  income: "hsl(142 71% 45%)",
  expenses: "hsl(347 77% 50%)",
  debts: "hsl(0 84% 60%)",
  assets: "hsl(199 89% 48%)",
  insurance: "hsl(271 81% 56%)",
};

interface AcompEntry {
  id: string;
  meta_id: string | null;
  source_id: string;
  source_table: string;
  source_label: string;
  valor_atual: number | null;
  valor_meta: number | null;
  progresso_pct: number | null;
  estado_atual: string | null;
  is_closing_snapshot: boolean;
  snapshotted_at: string;
}

interface Meta {
  id: string;
  source_table: string;
  source_id: string;
  source_label: string;
  meta_text: string | null;
  meta_valor: number | null;
  prazo: string | null;
  completed_at: string | null;
}

interface Goal {
  id: string;
  description: string;
  target_amount: number | null;
  deadline: string | null;
  priority: string | null;
  amount_applied: number | null;
  completed_at: string | null;
  created_at: string;
}

function progressColor(pct: number) {
  if (pct >= 100) return "text-emerald-600";
  if (pct >= 60)  return "text-blue-600";
  if (pct >= 30)  return "text-amber-600";
  return "text-rose-600";
}
function progressBarColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60)  return "bg-blue-500";
  if (pct >= 30)  return "bg-amber-500";
  return "bg-rose-500";
}

function TrendIcon({ current, prev }: { current?: number | null; prev?: number | null }) {
  if (current == null || prev == null) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  if (current > prev) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (current < prev) return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

const AdminAcompanhamentoEvolucao = () => {
  const { clientId } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client_profile", clientId],
    queryFn: async () => {
      const { data: c } = await supabase.from("clients").select("user_id").eq("id", clientId).maybeSingle();
      if (!c?.user_id) return null;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", c.user_id).maybeSingle();
      return p;
    },
    enabled: !!clientId,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["acompanhamento_evolucao", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("acompanhamento_entradas")
        .select("*")
        .eq("client_id", clientId)
        .order("snapshotted_at", { ascending: true });
      return (data || []) as AcompEntry[];
    },
    enabled: !!clientId,
  });

  const { data: metas = [] } = useQuery({
    queryKey: ["parecer_metas_all", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parecer_metas")
        .select("*")
        .eq("client_id", clientId)
        .order("source_table");
      return (data || []) as Meta[];
    },
    enabled: !!clientId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals_evolucao", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at");
      return (data || []) as Goal[];
    },
    enabled: !!clientId,
  });

  // ── Resumo geral ──
  const summary = useMemo(() => {
    const metasAtivas = metas.filter((m) => !m.completed_at && m.source_table !== "goals");
    const metasConcluidas = metas.filter((m) => m.completed_at && m.source_table !== "goals");
    const goalsConcluidos = goals.filter((g) => g.completed_at);
    const goalsAtivos = goals.filter((g) => !g.completed_at);

    // Progresso médio: usa último entry por meta
    const latestByMeta = new Map<string, AcompEntry>();
    entries.forEach((e) => {
      if (!e.meta_id || e.is_closing_snapshot) return;
      const prev = latestByMeta.get(e.meta_id);
      if (!prev || new Date(e.snapshotted_at) > new Date(prev.snapshotted_at)) {
        latestByMeta.set(e.meta_id, e);
      }
    });
    const allPct = Array.from(latestByMeta.values())
      .map((e) => e.progresso_pct)
      .filter((p): p is number => p != null);
    const avgProgress = allPct.length > 0 ? Math.round(allPct.reduce((a, b) => a + b, 0) / allPct.length) : null;

    // Progresso médio dos objetivos
    const goalProgress = goals
      .filter((g) => !g.completed_at && g.target_amount && g.target_amount > 0)
      .map((g) => Math.min(Math.round(((g.amount_applied || 0) / (g.target_amount || 1)) * 100), 100));
    const avgGoalProgress = goalProgress.length > 0 ? Math.round(goalProgress.reduce((a, b) => a + b, 0) / goalProgress.length) : null;

    return {
      metasAtivas: metasAtivas.length,
      metasConcluidas: metasConcluidas.length,
      goalsAtivos: goalsAtivos.length,
      goalsConcluidos: goalsConcluidos.length,
      avgProgress,
      avgGoalProgress,
      totalSnapshots: entries.filter((e) => !e.is_closing_snapshot).length,
    };
  }, [metas, goals, entries]);

  // ── Evolução agregada ao longo do tempo (por mês YYYY-MM) ──
  const monthlyEvolution = useMemo(() => {
    const byMonth = new Map<string, { month: string; pcts: number[] }>();
    entries
      .filter((e) => !e.is_closing_snapshot && e.progresso_pct != null && e.meta_id)
      .forEach((e) => {
        const m = e.snapshotted_at.slice(0, 7);
        if (!byMonth.has(m)) byMonth.set(m, { month: m, pcts: [] });
        byMonth.get(m)!.pcts.push(e.progresso_pct as number);
      });
    return Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => ({
        month: monthLabel(d.month),
        progressoMedio: Math.round(d.pcts.reduce((a, b) => a + b, 0) / d.pcts.length),
      }));
  }, [entries]);

  // ── Histórico por meta (sparkline) ──
  const historyByMeta = useMemo(() => {
    const map = new Map<string, AcompEntry[]>();
    entries
      .filter((e) => !e.is_closing_snapshot && e.meta_id)
      .forEach((e) => {
        if (!map.has(e.meta_id!)) map.set(e.meta_id!, []);
        map.get(e.meta_id!)!.push(e);
      });
    map.forEach((arr) => arr.sort((a, b) => new Date(a.snapshotted_at).getTime() - new Date(b.snapshotted_at).getTime()));
    return map;
  }, [entries]);

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Selecione um cliente para ver a evolução.
      </div>
    );
  }

  const hasAnyData = entries.length > 0 || metas.length > 0 || goals.length > 0;
  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-border/60">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Activity className="h-4.5 w-4.5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              Acompanhamento — {client?.full_name ?? "Cliente"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Evolução do cliente em metas e objetivos.
            </p>
          </div>
        </div>
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-border bg-muted/20">
          <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sem dados de evolução ainda.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Volte para <strong>Lançamento do mês</strong> e registre o estado atual das metas para ver a evolução aqui.
          </p>
        </div>
        <JourneyFooterNav current="evolucao" />
      </div>
    );
  }

  // metas ativas (não concluídas e não goals)
  const activeMetas = metas.filter((m) => !m.completed_at && m.source_table !== "goals");

  return (
    <div className="space-y-10">
      {/* Header — hero */}
      <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.06] via-card to-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent via-novare-blue to-accent/60" />
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <div className="h-14 w-14 rounded-2xl bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center shrink-0 shadow-sm">
            <Activity className="h-7 w-7 text-accent" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent/80">Etapa 6 · Acompanhamento</p>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight truncate">
              {client?.full_name ?? "Cliente"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Visão da evolução em metas e objetivos. Alimente este painel pelo <span className="font-semibold text-foreground/80">Lançamento do mês</span>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Resumo geral ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-novare-blue/40" />
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-novare-blue" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Metas ativas</p>
            </div>
            <p className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-foreground">
              {summary.metasAtivas}
            </p>
            {summary.metasConcluidas > 0 && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                +{summary.metasConcluidas} concluída{summary.metasConcluidas !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500/40" />
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Objetivos ativos</p>
            </div>
            <p className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-foreground">
              {summary.goalsAtivos}
            </p>
            {summary.goalsConcluidos > 0 && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                +{summary.goalsConcluidos} concluído{summary.goalsConcluidos !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            summary.avgProgress == null ? "bg-muted" :
            summary.avgProgress >= 100 ? "bg-emerald-500/60" :
            summary.avgProgress >= 60  ? "bg-blue-500/60" :
            summary.avgProgress >= 30  ? "bg-amber-500/60" : "bg-rose-500/60",
          )} />
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Progresso · metas</p>
            </div>
            <p className={cn(
              "text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none",
              summary.avgProgress != null ? progressColor(summary.avgProgress) : "text-muted-foreground",
            )}>
              {summary.avgProgress != null ? `${summary.avgProgress}%` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">média entre todas as metas</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            summary.avgGoalProgress == null ? "bg-muted" :
            summary.avgGoalProgress >= 100 ? "bg-emerald-500/60" :
            summary.avgGoalProgress >= 60  ? "bg-blue-500/60" :
            summary.avgGoalProgress >= 30  ? "bg-amber-500/60" : "bg-rose-500/60",
          )} />
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Progresso · objetivos</p>
            </div>
            <p className={cn(
              "text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none",
              summary.avgGoalProgress != null ? progressColor(summary.avgGoalProgress) : "text-muted-foreground",
            )}>
              {summary.avgGoalProgress != null ? `${summary.avgGoalProgress}%` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">média entre todos os objetivos</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Linha do tempo agregada ── */}
      {monthlyEvolution.length > 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-accent shrink-0" />
            <Activity className="w-5 h-5 text-accent" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Evolução do progresso médio</h3>
            <Badge variant="outline" className="text-xs font-bold ml-1">
              {summary.totalSnapshots} lançamento{summary.totalSnapshots !== 1 ? "s" : ""}
            </Badge>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>
          <Card>
            <CardContent className="p-5 sm:p-6">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyEvolution} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.35)" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={6} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <ReTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 14px hsl(var(--foreground) / 0.1)" }}
                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                    formatter={(v: number) => [`${v}%`, "Progresso médio"]}
                  />
                  <Area type="monotone" dataKey="progressoMedio" stroke="hsl(var(--accent))" strokeWidth={3} fill="url(#gradProgress)" dot={{ r: 3, fill: "hsl(var(--accent))" }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Metas com sparkline ── */}
      {activeMetas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-novare-blue shrink-0" />
            <Target className="w-5 h-5 text-novare-blue" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Evolução por meta</h3>
            <Badge variant="outline" className="text-xs font-bold ml-1">
              {activeMetas.length} ativa{activeMetas.length !== 1 ? "s" : ""}
            </Badge>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {activeMetas.map((meta) => {
              const sourceColor = SECTION_COLOR[meta.source_table as SourceTable] ?? "hsl(var(--primary))";
              const Icon = SECTION_ICON[meta.source_table as SourceTable] ?? Target;
              const history = historyByMeta.get(meta.id) || [];
              const last = history[history.length - 1];
              const prev = history[history.length - 2];
              const sparkData = history.slice(-12).map((e) => ({
                t: e.snapshotted_at.slice(0, 10),
                pct: e.progresso_pct ?? 0,
                valor: e.valor_atual ?? 0,
              }));
              const pct = last?.progresso_pct ?? null;

              return (
                <Card key={meta.id} className="overflow-hidden hover:shadow-md transition-all duration-200">
                  <div className="h-1.5" style={{ background: sourceColor }} />
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    {/* Header do card */}
                    <div className="flex items-start gap-3">
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ background: `${sourceColor}20`, border: `1px solid ${sourceColor}35` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: sourceColor }} strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: sourceColor }}>
                          {SECTION_LABEL[meta.source_table as SourceTable] ?? meta.source_table}
                        </p>
                        <p className="text-base sm:text-lg font-bold leading-tight truncate text-foreground mt-0.5">
                          {meta.source_label}
                        </p>
                        {meta.meta_text && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-snug">{meta.meta_text}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className={cn("text-3xl sm:text-4xl font-black tabular-nums leading-none tracking-tight", pct != null ? progressColor(pct) : "text-muted-foreground")}>
                          {pct != null ? `${pct}%` : "—"}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <TrendIcon current={last?.progresso_pct} prev={prev?.progresso_pct} />
                          <span className="font-semibold">
                            {prev?.progresso_pct != null && last?.progresso_pct != null
                              ? `${last.progresso_pct - prev.progresso_pct >= 0 ? "+" : ""}${last.progresso_pct - prev.progresso_pct}pp`
                              : "novo"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sparkline */}
                    {sparkData.length > 1 ? (
                      <div className="h-[80px] -mx-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                            <Line type="monotone" dataKey="pct" stroke={sourceColor} strokeWidth={2.5} dot={{ r: 2.5, fill: sourceColor }} activeDot={{ r: 4 }} />
                            <ReTooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, padding: "6px 10px", boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)" }}
                              labelFormatter={(t) => new Date(t).toLocaleDateString("pt-BR")}
                              formatter={(v: number) => [`${v}%`, "Progresso"]}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-muted/30 px-3 py-4 text-center">
                        <p className="text-xs italic text-muted-foreground/80">
                          Apenas 1 lançamento — evolução aparece a partir do 2º.
                        </p>
                      </div>
                    )}

                    {/* Rodapé com valores */}
                    <div className="flex items-center justify-between gap-3 text-xs pt-2 border-t border-border/40">
                      {meta.meta_valor ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Alvo</span>
                          <span className="text-sm font-bold tabular-nums text-foreground" style={{ color: sourceColor }}>{fmtBRL(meta.meta_valor)}</span>
                        </div>
                      ) : <span />}
                      {last?.valor_atual != null && (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Atual</span>
                          <span className="text-sm font-bold tabular-nums text-foreground">{fmtBRL(last.valor_atual)}</span>
                        </div>
                      )}
                      {meta.prazo && (
                        <div className="flex flex-col items-end ml-auto">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Prazo
                          </span>
                          <span className="text-sm font-bold tabular-nums text-foreground/85">{formatDate(meta.prazo)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator />
        </div>
      )}

      {/* ── Objetivos com barra de progresso ── */}
      {goals.filter((g) => !g.completed_at).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-emerald-500 shrink-0" />
            <Trophy className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Evolução dos objetivos</h3>
            <Badge variant="outline" className="text-xs font-bold ml-1">
              {goals.filter((g) => !g.completed_at).length} ativo{goals.filter((g) => !g.completed_at).length !== 1 ? "s" : ""}
            </Badge>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {goals.filter((g) => !g.completed_at).map((goal) => {
              const applied = goal.amount_applied || 0;
              const target  = goal.target_amount || 0;
              const pct     = target > 0 ? Math.min(Math.round((applied / target) * 100), 100) : null;
              return (
                <Card key={goal.id} className="overflow-hidden hover:shadow-md transition-all duration-200">
                  <div className={cn(
                    "h-1.5",
                    pct == null ? "bg-muted" :
                    pct >= 100 ? "bg-emerald-500" :
                    pct >= 60  ? "bg-blue-500" :
                    pct >= 30  ? "bg-amber-500" : "bg-rose-500",
                  )} />
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-base sm:text-lg font-bold leading-tight flex-1 text-foreground">{goal.description}</p>
                      <span className={cn("text-3xl sm:text-4xl font-black tabular-nums leading-none tracking-tight", pct != null ? progressColor(pct) : "text-muted-foreground")}>
                        {pct != null ? `${pct}%` : "—"}
                      </span>
                    </div>
                    {target > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-bold tabular-nums text-foreground">{fmtBRL(applied)}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">de <span className="font-semibold text-foreground/80">{fmtBRL(target)}</span></span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", pct != null ? progressBarColor(pct) : "bg-muted-foreground/30")}
                            style={{ width: pct != null ? `${pct}%` : "0%" }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/40">
                      {goal.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(goal.deadline)}
                        </span>
                      )}
                      {goal.priority && (
                        <Badge variant="outline" className="text-xs capitalize font-bold">{goal.priority}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Conquistas (concluídos) ── */}
      {(summary.metasConcluidas > 0 || summary.goalsConcluidos > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-emerald-500 shrink-0" />
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">Conquistas</h3>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>
          <Card className="border-emerald-300/50 bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-card dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-card overflow-hidden">
            <div className="h-1 bg-emerald-500" />
            <CardContent className="p-6 grid grid-cols-2 gap-6 text-center">
              <div className="space-y-1.5">
                <p className="text-5xl sm:text-6xl font-black tabular-nums text-emerald-700 dark:text-emerald-400 leading-none tracking-tight">{summary.metasConcluidas}</p>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">
                  meta{summary.metasConcluidas !== 1 ? "s" : ""} arquivada{summary.metasConcluidas !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-5xl sm:text-6xl font-black tabular-nums text-emerald-700 dark:text-emerald-400 leading-none tracking-tight">{summary.goalsConcluidos}</p>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">
                  objetivo{summary.goalsConcluidos !== 1 ? "s" : ""} concluído{summary.goalsConcluidos !== 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <JourneyFooterNav current="evolucao" />
    </div>
  );
};

export default AdminAcompanhamentoEvolucao;
