import { useQuery } from "@tanstack/react-query";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, Circle, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d?: string | null) => {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
};

type SourceTable = "income" | "expenses" | "debts" | "assets" | "insurance";

const SECTION_LABELS: Record<SourceTable, string> = {
  income:    "Rendas",
  expenses:  "Despesas",
  debts:     "Dívidas",
  assets:    "Patrimônio",
  insurance: "Seguros",
};

const SECTION_ORDER: SourceTable[] = ["income", "expenses", "debts", "assets", "insurance"];

const GRID = "grid-cols-[minmax(0,1.8fr)_120px_110px_minmax(0,2fr)]";

function progressBarColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60)  return "bg-blue-500";
  if (pct >= 30)  return "bg-amber-500";
  return "bg-rose-500";
}

function progressTextColor(pct: number) {
  if (pct >= 100) return "text-emerald-600";
  if (pct >= 60)  return "text-blue-600";
  if (pct >= 30)  return "text-amber-600";
  return "text-rose-600";
}

interface GoalItem {
  id: string;
  description: string;
  target_amount?: number | null;
  deadline?: string | null;
  priority?: string | null;
  category?: string | null;
  amount_applied?: number | null;
  completed_at?: string | null;
}

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  alta:  { label: "Alta",  cls: "border-destructive/30 text-destructive bg-destructive/10" },
  media: { label: "Média", cls: "border-warning/30 text-warning bg-warning/10" },
  baixa: { label: "Baixa", cls: "border-primary/30 text-primary bg-primary/10" },
};

const AdminActionPlan = () => {
  const { clientId } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data: c } = await supabase.from("clients").select("user_id").eq("id", clientId).maybeSingle();
      if (!c?.user_id) return null;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", c.user_id).maybeSingle();
      return p;
    },
    enabled: !!clientId,
  });

  const { data: metas = [], isLoading: loadingMetas } = useQuery({
    queryKey: ["parecer_metas", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parecer_metas")
        .select("*")
        .eq("client_id", clientId)
        .is("completed_at", null)
        .order("source_table");
      return (data || []).filter((m: any) => m.source_table !== "goals");
    },
    enabled: !!clientId,
  });

  const { data: activeGoals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ["goals", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("client_id", clientId)
        .is("completed_at", null)
        .order("created_at");
      return (data || []) as GoalItem[];
    },
    enabled: !!clientId,
  });

  const isLoading = loadingMetas || loadingGoals;

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Selecione um cliente para ver as ações.
      </div>
    );
  }

  const bySection = SECTION_ORDER.reduce(
    (acc, section) => {
      acc[section] = metas.filter((m: any) => m.source_table === section);
      return acc;
    },
    {} as Record<SourceTable, any[]>,
  );

  const totalMetas      = metas.length;
  const totalComMeta    = metas.filter((m: any) => m.meta_text).length;
  const totalComPrazo   = metas.filter((m: any) => m.prazo).length;
  const totalGoals      = activeGoals.length;
  const goalsEmAndamento = activeGoals.filter((g) => g.amount_applied && g.amount_applied > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold">
            Ver Ações — {client?.full_name ?? "Cliente"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalComMeta} de {totalMetas} metas definidas
            {totalGoals > 0 && ` · ${totalGoals} objetivo${totalGoals !== 1 ? "s" : ""} financeiro${totalGoals !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            {totalComMeta} metas
          </Badge>
          {totalComPrazo > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="w-3 h-3 text-blue-500" />
              {totalComPrazo} com prazo
            </Badge>
          )}
          {totalGoals > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Target className="w-3 h-3 text-emerald-500" />
              {totalGoals} objetivo{totalGoals !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      )}

      {!isLoading && totalMetas === 0 && totalGoals === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Circle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm">Nenhuma meta ou objetivo definido ainda.</p>
          <p className="text-xs mt-1">Vá para Plano de Ação para definir as metas e adicione Objetivos.</p>
        </div>
      )}

      {/* Seções de metas (income, expenses, debts, assets, insurance) */}
      {SECTION_ORDER.map((section) => {
        const items = bySection[section];
        if (!items.length) return null;
        const comMeta = items.filter((i: any) => i.meta_text).length;

        return (
          <div key={section}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS[section]}
              </h3>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              {comMeta > 0 && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                  {comMeta} com meta
                </Badge>
              )}
            </div>

            <div className={`grid ${GRID} gap-3 pb-1 mb-1`}>
              <p className="text-xs text-muted-foreground font-medium">Item</p>
              <p className="text-xs text-muted-foreground font-medium">Valor atual</p>
              <p className="text-xs text-muted-foreground font-medium">Prazo</p>
              <p className="text-xs text-muted-foreground font-medium">Meta</p>
            </div>

            <div className="rounded-lg border border-border/60 bg-card px-4">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className={`grid ${GRID} gap-3 items-start py-3 border-b border-border/40 last:border-0`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.source_label}</p>
                  </div>

                  <p className="text-sm text-muted-foreground tabular-nums pt-0.5">
                    {item.current_value > 0 ? formatBRL(Number(item.current_value)) : "—"}
                  </p>

                  <p className="text-sm tabular-nums pt-0.5">
                    {item.prazo ? (
                      <span className="text-blue-600 font-medium">{formatDate(item.prazo)}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </p>

                  <div className="flex flex-col gap-0.5 pt-0.5">
                    {item.meta_text ? (
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-sm">{item.meta_text}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic">Sem meta definida</p>
                    )}
                    {item.meta_valor && item.meta_valor > 0 && (
                      <p className="text-xs text-muted-foreground tabular-nums flex items-center gap-1 mt-0.5">
                        <Target className="w-3 h-3" />
                        Alvo: <span className="font-semibold text-foreground/80">{formatBRL(Number(item.meta_valor))}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="mt-6" />
          </div>
        );
      })}

      {/* Objetivos financeiros — direto da tabela goals */}
      {activeGoals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Objetivos
            </h3>
            <Badge variant="secondary" className="text-xs">{activeGoals.length}</Badge>
            {goalsEmAndamento > 0 && (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-600/30">
                {goalsEmAndamento} em andamento
              </Badge>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-card divide-y divide-border/40">
            {activeGoals.map((goal) => {
              const applied = goal.amount_applied || 0;
              const target  = goal.target_amount || 0;
              const pct     = target > 0 ? Math.min(Math.round((applied / target) * 100), 100) : null;
              const prio    = PRIORITY_LABEL[goal.priority || "media"] || PRIORITY_LABEL.media;

              return (
                <div key={goal.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium flex-1">{goal.description}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {goal.priority && (
                        <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", prio.cls)}>
                          {prio.label}
                        </Badge>
                      )}
                      {pct != null && (
                        <span className={cn("text-4xl sm:text-[2.6rem] font-black tabular-nums leading-none tracking-tight", progressTextColor(pct))}>
                          {pct}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {target > 0 && (
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Meta: <span className="font-semibold tabular-nums text-foreground/80">{formatBRL(target)}</span>
                      </span>
                    )}
                    {applied > 0 && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        Aplicado: <span className="font-semibold tabular-nums text-foreground/80">{formatBRL(applied)}</span>
                      </span>
                    )}
                    {goal.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Prazo: <span className="font-medium text-foreground/70">{formatDate(goal.deadline)}</span>
                      </span>
                    )}
                  </div>

                  {pct != null && target > 0 && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", progressBarColor(pct))}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Separator className="mt-6" />
        </div>
      )}

      <JourneyFooterNav
        current="plano-acao"
        message="Ações visualizadas. Acompanhe a evolução do cliente."
      />
    </div>
  );
};

export default AdminActionPlan;
