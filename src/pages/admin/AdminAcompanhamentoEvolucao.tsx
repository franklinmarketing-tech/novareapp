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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border/60">
        <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Activity className="h-4.5 w-4.5 text-accent" />
        </div>
        <div>
          <h2 className="text-base font-semibold">
            Acompanhamento — {client?.full_name ?? "Cliente"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Visão da evolução do cliente em metas e objetivos. Use o Lançamento do mês para alimentar este painel.
          </p>
        </div>
      </div>

      {/* ── Resumo geral ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Metas ativas</p>
            <p className="text-2xl font-black tabular-nums">{summary.metasAtivas}</p>
            {summary.metasConcluidas > 0 && (
              <p className="text-[11px] text-emerald-600">+{summary.metasConcluidas} concluída{summary.metasConcluidas !== 1 ? "s" : ""}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Objetivos ativos</p>
            <p className="text-2xl font-black tabular-nums">{summary.goalsAtivos}</p>
            {summary.goalsConcluidos > 0 && (
              <p className="text-[11px] text-emerald-600">+{summary.goalsConcluidos} concluído{summary.goalsConcluidos !== 1 ? "s" : ""}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progresso médio (metas)</p>
            <p className={cn("text-2xl font-black tabular-nums", summary.avgProgress != null ? progressColor(summary.avgProgress) : "text-muted-foreground")}>
              {summary.avgProgress != null ? `${summary.avgProgress}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progresso médio (objetivos)</p>
            <p className={cn("text-2xl font-black tabular-nums", summary.avgGoalProgress != null ? progressColor(summary.avgGoalProgress) : "text-muted-foreground")}>
              {summary.avgGoalProgress != null ? `${summary.avgGoalProgress}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Linha do tempo agregada ── */}
      {monthlyEvolution.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold">Evolução do progresso médio ao longo do tempo</h3>
            <Badge variant="outline" className="text-[10px]">{summary.totalSnapshots} lançamento{summary.totalSnapshots !== 1 ? "s" : ""}</Badge>
          </div>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyEvolution}>
                  <defs>
                    <linearGradient id="gradProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <ReTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, "Progresso médio"]}
                  />
                  <Area type="monotone" dataKey="progressoMedio" stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#gradProgress)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Metas com sparkline ── */}
      {activeMetas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-novare-blue" />
            <h3 className="text-sm font-bold">Evolução por meta</h3>
            <Badge variant="outline" className="text-[10px]">{activeMetas.length} ativa{activeMetas.length !== 1 ? "s" : ""}</Badge>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
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
                <Card key={meta.id} className="overflow-hidden">
                  <div className="h-1" style={{ background: sourceColor }} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${sourceColor}18`, border: `1px solid ${sourceColor}30` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: sourceColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {SECTION_LABEL[meta.source_table as SourceTable] ?? meta.source_table}
                        </p>
                        <p className="text-sm font-semibold leading-tight truncate">{meta.source_label}</p>
                        {meta.meta_text && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{meta.meta_text}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <TrendIcon current={last?.progresso_pct} prev={prev?.progresso_pct} />
                        <span className={cn("text-xl font-black tabular-nums leading-none", pct != null ? progressColor(pct) : "text-muted-foreground")}>
                          {pct != null ? `${pct}%` : "—"}
                        </span>
                      </div>
                    </div>

                    {sparkData.length > 1 ? (
                      <div className="h-[60px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparkData}>
                            <Line type="monotone" dataKey="pct" stroke={sourceColor} strokeWidth={2} dot={{ r: 2, fill: sourceColor }} />
                            <ReTooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11, padding: "4px 8px" }}
                              labelFormatter={(t) => new Date(t).toLocaleDateString("pt-BR")}
                              formatter={(v: number) => [`${v}%`, "Progresso"]}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-[11px] italic text-muted-foreground/70 py-3 text-center">
                        Apenas 1 lançamento até o momento — sem evolução suficiente para o gráfico.
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      {meta.meta_valor && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Alvo: <span className="font-semibold tabular-nums text-foreground/80">{fmtBRL(meta.meta_valor)}</span>
                        </span>
                      )}
                      {last?.valor_atual != null && (
                        <span className="flex items-center gap-1">
                          Atual: <span className="font-semibold tabular-nums text-foreground/80">{fmtBRL(last.valor_atual)}</span>
                        </span>
                      )}
                      {meta.prazo && (
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {formatDate(meta.prazo)}
                        </span>
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold">Evolução dos objetivos</h3>
            <Badge variant="outline" className="text-[10px]">
              {goals.filter((g) => !g.completed_at).length} ativo{goals.filter((g) => !g.completed_at).length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {goals.filter((g) => !g.completed_at).map((goal) => {
              const applied = goal.amount_applied || 0;
              const target  = goal.target_amount || 0;
              const pct     = target > 0 ? Math.min(Math.round((applied / target) * 100), 100) : null;
              return (
                <Card key={goal.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-tight flex-1">{goal.description}</p>
                      <span className={cn("text-xl font-black tabular-nums leading-none", pct != null ? progressColor(pct) : "text-muted-foreground")}>
                        {pct != null ? `${pct}%` : "—"}
                      </span>
                    </div>
                    {target > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>{fmtBRL(applied)}</span>
                          <span>de {fmtBRL(target)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", pct != null ? progressBarColor(pct) : "bg-muted-foreground/30")}
                            style={{ width: pct != null ? `${pct}%` : "0%" }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {goal.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(goal.deadline)}
                        </span>
                      )}
                      {goal.priority && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px] capitalize">{goal.priority}</Badge>
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold">Conquistas</h3>
          </div>
          <Card className="border-emerald-300/50 bg-emerald-50/40 dark:bg-emerald-950/20">
            <CardContent className="p-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">{summary.metasConcluidas}</p>
                <p className="text-[11px] text-muted-foreground">meta{summary.metasConcluidas !== 1 ? "s" : ""} arquivada{summary.metasConcluidas !== 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">{summary.goalsConcluidos}</p>
                <p className="text-[11px] text-muted-foreground">objetivo{summary.goalsConcluidos !== 1 ? "s" : ""} concluído{summary.goalsConcluidos !== 1 ? "s" : ""}</p>
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
