import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { CheckCircle2, Clock, Target, TrendingUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryNoteEditor, type NoteCategory } from "@/components/admin/CategoryNoteEditor";

const NOTE_ACCENT: Record<NoteCategory, string> = {
  income:    "hsl(142 71% 45%)",
  expenses:  "hsl(347 77% 50%)",
  debts:     "hsl(0 84% 60%)",
  assets:    "hsl(199 89% 48%)",
  insurance: "hsl(271 81% 56%)",
  goals:     "hsl(var(--novare-blue))",
};

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

/** Cromática por seção — bar + chip + hover + accent */
const SECTION_THEME: Record<SourceTable | "goals", {
  bar: string;
  chipBg: string;
  chipText: string;
  rowHover: string;
  metaText: string;
  metaUnderline: string;
}> = {
  income:    { bar: "bg-emerald-500", chipBg: "bg-emerald-100", chipText: "text-emerald-700", rowHover: "hover:bg-emerald-50/40", metaText: "text-emerald-600", metaUnderline: "decoration-emerald-200" },
  expenses:  { bar: "bg-rose-500",    chipBg: "bg-rose-100",    chipText: "text-rose-700",    rowHover: "hover:bg-rose-50/40",    metaText: "text-rose-600",    metaUnderline: "decoration-rose-200" },
  debts:     { bar: "bg-red-500",     chipBg: "bg-red-100",     chipText: "text-red-700",     rowHover: "hover:bg-red-50/40",     metaText: "text-red-600",     metaUnderline: "decoration-red-200" },
  assets:    { bar: "bg-sky-500",     chipBg: "bg-sky-100",     chipText: "text-sky-700",     rowHover: "hover:bg-sky-50/40",     metaText: "text-sky-600",     metaUnderline: "decoration-sky-200" },
  insurance: { bar: "bg-purple-500",  chipBg: "bg-purple-100",  chipText: "text-purple-700",  rowHover: "hover:bg-purple-50/40",  metaText: "text-purple-600", metaUnderline: "decoration-purple-200" },
  goals:     { bar: "bg-novare-blue",  chipBg: "bg-novare-blue-light", chipText: "text-novare-blue", rowHover: "hover:bg-novare-blue-light/50", metaText: "text-novare-blue dark:text-novare-blue-bright",  metaUnderline: "decoration-novare-blue/30" },
};

const SECTION_ORDER: SourceTable[] = ["income", "expenses", "debts", "assets", "insurance"];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const monthStartISO = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}-01`;

function progressBarColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60)  return "bg-novare-blue";
  if (pct >= 30)  return "bg-amber-500";
  return "bg-rose-500";
}

function progressTextColor(pct: number) {
  if (pct >= 100) return "text-emerald-600";
  if (pct >= 60)  return "text-novare-blue dark:text-novare-blue-bright";
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
  month_ref?: string | null;
}

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  alta:  { label: "Alta",  cls: "bg-rose-100 text-rose-700" },
  media: { label: "Média", cls: "bg-amber-100 text-amber-700" },
  baixa: { label: "Baixa", cls: "bg-novare-blue-light text-novare-blue" },
};

const SectionHeader = ({
  label, count, theme,
}: { label: string; count: number | string; theme: typeof SECTION_THEME[SourceTable] }) => (
  <div className="relative flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-card via-card to-card/60 border border-border/70 shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.12),inset_0_1px_0_hsl(var(--background)/0.6)] backdrop-blur-sm">
    <div className={cn("h-7 w-1.5 rounded-full shadow-[0_0_10px_currentColor] ring-1 ring-background/50", theme.bar)} />
    <h2 className="text-xs font-bold text-foreground tracking-[0.15em] uppercase leading-none drop-shadow-sm">{label}</h2>
    <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full tabular-nums shadow-sm ring-1 ring-inset ring-background/40", theme.chipBg, theme.chipText)}>{count}</span>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="py-8 bg-muted/30 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
    <p className="text-sm font-medium">{message}</p>
  </div>
);

const AdminActionPlan = () => {
  const { clientId } = useClientId();
  const now = new Date();

  // Meses disponíveis = apenas meses com dados salvos (goals.month_ref ou parecer_metas/source linked).
  const { data: availableMonths = [] } = useQuery({
    queryKey: ["available_action_months", clientId],
    queryFn: async () => {
      const [{ data: g }, { data: i }, { data: e }] = await Promise.all([
        supabase.from("goals").select("month_ref").eq("client_id", clientId).not("month_ref", "is", null),
        supabase.from("income").select("month_ref").eq("client_id", clientId).not("month_ref", "is", null),
        supabase.from("expenses").select("month_ref").eq("client_id", clientId).not("month_ref", "is", null),
      ]);
      const set = new Set<string>();
      [...(g || []), ...(i || []), ...(e || [])].forEach((r: any) => {
        if (r.month_ref) set.add(String(r.month_ref).slice(0, 7)); // YYYY-MM
      });
      return Array.from(set).sort().reverse(); // mais recente primeiro
    },
    enabled: !!clientId,
  });

  // Default: mês salvo mais recente; fallback para mês atual
  const defaultYM =
    availableMonths[0] ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedYM, setSelectedYM] = useState<string>(defaultYM);

  // Sincroniza quando a lista carrega
  if (availableMonths.length > 0 && !availableMonths.includes(selectedYM) &&
      selectedYM === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`) {
    // primeiro carregamento — alinha ao mais recente salvo
    setTimeout(() => setSelectedYM(availableMonths[0]), 0);
  }

  const [yStr, mStr] = selectedYM.split("-");
  const filterYear = Number(yStr);
  const filterMonth = Number(mStr);
  const monthRef = monthStartISO(filterYear, filterMonth);
  const monthLabel = `${MONTH_NAMES[filterMonth - 1]} ${filterYear}`;
  const monthFilter = `month_ref.is.null,month_ref.eq.${monthRef}`;

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
    queryKey: ["goals_plan", clientId, monthRef],
    queryFn: async () => {
      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("client_id", clientId)
        .is("completed_at", null)
        .or(monthFilter)
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
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-foreground">
            Ver Ações — <span className="text-novare-blue dark:text-novare-blue-bright">{client?.full_name ?? "Cliente"}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Período: <span className="font-medium text-foreground/80">{monthLabel}</span>
            {" "}• {totalComMeta} de {totalMetas} metas definidas
            {totalGoals > 0 && ` · ${totalGoals} objetivo${totalGoals !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <select
              value={selectedYM}
              onChange={(e) => setSelectedYM(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-novare-blue/30"
              aria-label="Período"
            >
              {availableMonths.length === 0 ? (
                <option value={selectedYM}>{monthLabel}</option>
              ) : (
                availableMonths.map((ym) => {
                  const [y, m] = ym.split("-");
                  return (
                    <option key={ym} value={ym}>
                      {MONTH_NAMES[Number(m) - 1]} {y}
                    </option>
                  );
                })
              )}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <div className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> {totalComMeta} metas
          </div>
          {totalComPrazo > 0 && (
            <div className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> {totalComPrazo} com prazo
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      )}

      {!isLoading && totalMetas === 0 && totalGoals === 0 && (
        <EmptyState message="Nenhuma meta ou objetivo neste período." />
      )}

      {/* Seções de metas */}
      {SECTION_ORDER.map((section) => {
        const items = bySection[section];
        const theme = SECTION_THEME[section];
        const isEmpty = items.length === 0;

        return (
          <section key={section} className={cn("space-y-4", isEmpty && "opacity-75")}>
            <SectionHeader label={SECTION_LABELS[section]} count={items.length} theme={theme} />

            {items.length > 0 ? (
              <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Item</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Valor atual</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prazo</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Meta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((item: any) => {
                        const label: string = item.source_label || "";
                        const [head, ...rest] = label.split("—").map((s) => s.trim());
                        const hasSubtitle = rest.length > 0;
                        return (
                          <tr key={item.id} className={cn("transition-colors", theme.rowHover)}>
                            <td className="px-4 py-3">
                              {hasSubtitle ? (
                                <>
                                  <span className={cn("text-[9px] block mb-0.5 font-bold uppercase tracking-tighter", theme.metaText, "opacity-80")}>
                                    {head}
                                  </span>
                                  <span className="text-sm font-semibold text-foreground">{rest.join(" — ")}</span>
                                </>
                              ) : (
                                <span className="text-sm font-semibold text-foreground">{label}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-foreground/80 font-medium tabular-nums">
                              {item.current_value > 0 ? formatBRL(Number(item.current_value)) : <span className="text-muted-foreground/50">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {item.prazo ? (
                                <span className="text-xs text-novare-blue dark:text-novare-blue-bright font-semibold tabular-nums">{formatDate(item.prazo)}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 italic">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-end">
                                {item.meta_text ? (
                                  <span className={cn("flex items-center gap-1.5 font-bold text-xs text-right", theme.metaText)}>
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    {item.meta_text}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/50 italic">Sem meta definida</span>
                                )}
                                {item.meta_valor && item.meta_valor > 0 && (
                                  <span className="text-[11px] text-muted-foreground mt-1">
                                    Alvo: <span className={cn("text-foreground/80 font-bold underline tabular-nums", theme.metaUnderline)}>
                                      {formatBRL(Number(item.meta_valor))}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState message={`Nenhum item em ${SECTION_LABELS[section]} neste período.`} />
            )}

            <CategoryNoteEditor
              clientId={clientId}
              category={section as NoteCategory}
              accent={NOTE_ACCENT[section as NoteCategory]}
            />
          </section>
        );
      })}

      {/* Objetivos */}
      <section className="space-y-4">
        <div className="relative flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-card via-card to-card/60 border border-border/70 shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.12),inset_0_1px_0_hsl(var(--background)/0.6)] backdrop-blur-sm">
          <div className={cn("h-7 w-1.5 rounded-full shadow-[0_0_10px_currentColor] ring-1 ring-background/50", SECTION_THEME.goals.bar)} />
          <h2 className="text-xs font-bold text-foreground tracking-[0.15em] uppercase leading-none drop-shadow-sm">Objetivos</h2>
          <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full tabular-nums shadow-sm ring-1 ring-inset ring-background/40", SECTION_THEME.goals.chipBg, SECTION_THEME.goals.chipText)}>
            {activeGoals.length}
          </span>
          {goalsEmAndamento > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 shadow-sm ring-1 ring-inset ring-background/40">
              {goalsEmAndamento} em andamento
            </span>
          )}
        </div>

        {activeGoals.length > 0 ? (
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden divide-y divide-border/60">
            {activeGoals.map((goal) => {
              const applied = goal.amount_applied || 0;
              const target  = goal.target_amount || 0;
              const pct     = target > 0 ? Math.min(Math.round((applied / target) * 100), 100) : null;
              const prio    = PRIORITY_LABEL[goal.priority || "media"] || PRIORITY_LABEL.media;

              return (
                <div key={goal.id} className="px-6 py-5 space-y-3 hover:bg-novare-blue-light/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <div className="w-2 h-2 mt-2 rounded-full bg-novare-blue shadow-[0_0_8px_hsl(var(--novare-blue)/0.5)] shrink-0" />
                      <p className="text-sm font-semibold text-foreground flex-1">{goal.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {goal.priority && (
                        <span className={cn("h-5 px-2 inline-flex items-center text-[10px] font-bold rounded-full", prio.cls)}>
                          {prio.label}
                        </span>
                      )}
                      {pct != null && (
                        <span className={cn("text-3xl sm:text-4xl font-black tabular-nums leading-none tracking-tight", progressTextColor(pct))}>
                          {pct}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pl-4">
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
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden ml-4">
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
        ) : (
          <EmptyState message="Nenhum objetivo neste período." />
        )}

        <CategoryNoteEditor
          clientId={clientId}
          category="goals"
          accent={NOTE_ACCENT.goals}
        />
      </section>

      <JourneyFooterNav
        current="plano-acao"
        message="Ações visualizadas. Acompanhe a evolução do cliente."
      />
    </div>
  );
};

export default AdminActionPlan;
