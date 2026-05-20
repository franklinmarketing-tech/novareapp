import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Save, Loader2, Check, ChevronDown, ChevronRight,
  Clock, Target, TrendingUp, TrendingDown, Minus, History,
  Wallet, Receipt, CreditCard, Building2, Shield, Trash2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d?: string | null) => {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
};

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

type SourceTable = "income" | "expenses" | "debts" | "assets" | "insurance" | "goals";

const SECTION_CONFIG: Record<SourceTable, { label: string; icon: LucideIcon; color: string }> = {
  income:    { label: "Rendas",     icon: Wallet,    color: "bg-success/10 text-success" },
  expenses:  { label: "Despesas",   icon: Receipt,   color: "bg-destructive/10 text-destructive" },
  debts:     { label: "Dívidas",    icon: CreditCard, color: "bg-warning/10 text-warning" },
  assets:    { label: "Patrimônio", icon: Building2, color: "bg-primary/10 text-primary" },
  insurance: { label: "Seguros",    icon: Shield,    color: "bg-accent/10 text-accent" },
  goals:     { label: "Objetivos",  icon: Target,    color: "bg-success/10 text-success" },
};

// Goals come directly from the goals table — not via parecer_metas
const SECTION_ORDER: SourceTable[] = ["income", "expenses", "debts", "assets", "insurance"];

function inferDirection(sourceTable: string): { label: string; icon: LucideIcon; cls: string } {
  switch (sourceTable) {
    case "debts":    return { label: "Quitar",  icon: Trash2,      cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" };
    case "expenses": return { label: "Reduzir", icon: TrendingDown, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    case "income":   return { label: "Crescer", icon: TrendingUp,   cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    default:         return { label: "Crescer", icon: TrendingUp,   cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
  }
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
  if (current == null || prev == null) return null;
  if (current > prev) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (current < prev) return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

interface MetaEntry {
  id: string;
  source_table: string;
  source_id: string;
  source_label: string;
  meta_text?: string;
  meta_valor?: number;
  prazo?: string;
}

interface AcompEntry {
  id: string;
  meta_id: string;
  source_id: string;
  valor_atual?: number;
  estado_atual?: string;
  progresso_pct?: number;
  snapshotted_at: string;
  is_closing_snapshot: boolean;
}

interface GoalItem {
  id: string;
  description: string;
  target_amount?: number | null;
  deadline?: string | null;
  priority?: string | null;
  category?: string | null;
  amount_applied?: number | null;
}

// ── MetaAcompRow: income, expenses, debts, assets, insurance ──
function MetaAcompRow({
  meta,
  latestEntry,
  history,
  onSave,
  saving,
  onConfirm,
  confirming,
}: {
  meta: MetaEntry;
  latestEntry?: AcompEntry;
  history: AcompEntry[];
  onSave: (metaId: string, estadoAtual: string, valorAtual: string) => void;
  saving: boolean;
  onConfirm: (metaId: string) => void;
  confirming: boolean;
}) {
  const [estado, setEstado] = useState(latestEntry?.estado_atual || "");
  const [valor, setValor] = useState(
    latestEntry?.valor_atual != null ? String(latestEntry.valor_atual) : "",
  );
  const [saved, setSaved] = useState(false);
  const [histOpen, setHistOpen] = useState(false);

  const valorNum = parseFloat(valor) || 0;
  const pct =
    meta.meta_valor && valorNum > 0
      ? Math.round((valorNum / meta.meta_valor) * 100)
      : latestEntry?.progresso_pct ?? null;

  const prevEntry = history[1];

  const handleSave = () => {
    if (!estado.trim() && !valor.trim()) return;
    onSave(meta.id, estado.trim(), valor.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const SaveBtn = (
    <Button
      size="sm"
      variant={saved ? "secondary" : "default"}
      onClick={handleSave}
      disabled={(!estado.trim() && !valor.trim()) || saving}
      className="h-8 w-9 p-0 shrink-0"
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
    </Button>
  );

  const dir = inferDirection(meta.source_table);
  const DirIcon = dir.icon;

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card">

      {/* ── Header: nome + progresso ── */}
      <div className="flex items-start gap-4 px-4 py-3 bg-muted/25 border-b border-border/30">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold leading-tight">{meta.source_label}</p>
            <span className={cn("inline-flex items-center gap-1 text-[0.6rem] font-semibold rounded-full px-2 py-0.5 shrink-0", dir.cls)}>
              <DirIcon className="w-2.5 h-2.5" />
              {dir.label}
            </span>
          </div>
          {meta.meta_text ? (
            <div className="flex items-start gap-1.5">
              <Target className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
              <p className="text-xs text-foreground/75 leading-snug">{meta.meta_text}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">Sem meta definida no plano</p>
          )}
          <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-muted-foreground">
            {meta.prazo && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Prazo: <span className="font-medium text-foreground/60">{formatDate(meta.prazo)}</span>
              </span>
            )}
            {meta.meta_valor && (
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                Alvo: <span className="font-medium tabular-nums text-foreground/60">{formatBRL(meta.meta_valor)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Progresso em destaque */}
        {pct != null && (
          <div className="shrink-0 text-right pl-4 border-l border-border/30">
            <div className="flex items-center gap-1.5 justify-end">
              <TrendIcon current={pct} prev={prevEntry?.progresso_pct} />
              <span className={cn("text-2xl font-bold tabular-nums leading-none", progressColor(pct))}>{pct}%</span>
            </div>
            {latestEntry && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(latestEntry.snapshotted_at)}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Barra de progresso ── */}
      {pct != null && (
        <div className="h-1.5 bg-muted">
          <div
            className={cn("h-full transition-all duration-500", progressBarColor(pct))}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}

      {/* ── Registrar estado atual ── */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Registrar estado atual</p>
        <div className="flex items-center gap-2">
          <CurrencyInput
            value={valor}
            onChange={(v) => setValor(v)}
            placeholder="Valor atual..."
            className="h-9 text-sm flex-1 bg-background"
          />
          {SaveBtn}
        </div>
        <Textarea
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          placeholder="Como está agora? Descreva o estado atual..."
          className="text-sm min-h-[52px] resize-none py-2 bg-background"
          rows={2}
        />

        {/* Meta atingida */}
        {pct != null && pct >= 100 && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300/40 p-3 space-y-2">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Meta atingida!
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-500/70">
              Confirme para arquivar. O item volta ao Plano de Ação pronto para um novo objetivo.
            </p>
            <Button
              onClick={() => onConfirm(meta.id)}
              disabled={confirming}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
            >
              {confirming
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Arquivando...</>
                : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Confirmar e arquivar meta</>
              }
            </Button>
          </div>
        )}
      </div>

      {/* ── Histórico ── */}
      {history.length > 0 && (
        <div className="border-t border-border/30 px-4 py-2.5">
          <Collapsible open={histOpen} onOpenChange={setHistOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <History className="w-3 h-3" />
              {history.length} registro{history.length > 1 ? "s" : ""} anterior{history.length > 1 ? "es" : ""}
              {histOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 ml-1 border-l-2 border-border/40 pl-3 space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground/70">{formatDateTime(entry.snapshotted_at)}</span>
                      {entry.is_closing_snapshot && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4">fechamento</Badge>
                      )}
                      {entry.progresso_pct != null && (
                        <span className={cn("font-semibold", progressColor(entry.progresso_pct))}>
                          {entry.progresso_pct}%
                        </span>
                      )}
                      {entry.valor_atual != null && (
                        <span className="tabular-nums">{formatBRL(Number(entry.valor_atual))}</span>
                      )}
                    </div>
                    {entry.estado_atual && (
                      <p className="text-muted-foreground/80 line-clamp-2">{entry.estado_atual}</p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}

// ── GoalDirectRow: objectives linked directly to the goals table ──
function GoalDirectRow({
  goal,
  onSave,
  saving,
  onConfirm,
  confirming,
}: {
  goal: GoalItem;
  onSave: (goalId: string, amount: number) => void;
  saving: boolean;
  onConfirm: (goalId: string, amount: number) => void;
  confirming: boolean;
}) {
  const [valor, setValor] = useState(
    goal.amount_applied != null && goal.amount_applied > 0 ? String(goal.amount_applied) : "",
  );
  const [saved, setSaved] = useState(false);

  const applied = parseFloat(valor) || 0;
  const target  = goal.target_amount || 0;
  const pct     = target > 0 ? Math.min(Math.round((applied / target) * 100), 100) : null;

  const handleSave = () => {
    const num = parseFloat(valor);
    if (!valor.trim() || isNaN(num)) return;
    onSave(goal.id, num);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const PRIORITY_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

  return (
    <div className="py-4 border-b border-border/30 last:border-0 space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 items-start">

        {/* ── ESQUERDA: info do objetivo ── */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold leading-tight">{goal.description}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {target > 0 && (
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                Meta: <span className="font-medium tabular-nums text-foreground/70">{formatBRL(target)}</span>
              </span>
            )}
            {goal.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Prazo: <span className="font-medium text-foreground/70">{formatDate(goal.deadline)}</span>
              </span>
            )}
            {goal.priority && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                {PRIORITY_LABEL[goal.priority] || goal.priority}
              </Badge>
            )}
          </div>
        </div>

        {/* ── DIREITA: investimento + progresso ── */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <CurrencyInput
                value={valor}
                onChange={(v) => setValor(v)}
                placeholder="Investimento aplicado..."
                className="h-8 text-sm"
              />
            </div>
            <Button
              size="sm"
              variant={saved ? "secondary" : "default"}
              onClick={handleSave}
              disabled={!valor.trim() || saving}
              className="h-8 w-9 p-0 shrink-0"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {target > 0 && (
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 space-y-2">
              <div className="flex items-end justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-[0.6875rem] text-muted-foreground">Progresso da meta</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatBRL(applied)} <span className="mx-0.5 opacity-40">/</span> {formatBRL(target)}
                  </p>
                </div>
                <span className={cn("text-2xl font-bold tabular-nums leading-none", pct != null ? progressColor(pct) : "text-muted-foreground")}>
                  {pct != null ? `${pct}%` : "—"}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", pct != null ? progressBarColor(pct) : "bg-muted-foreground/30")}
                  style={{ width: pct != null ? `${pct}%` : "0%" }}
                />
              </div>
            </div>
          )}

          {pct != null && pct >= 100 && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300/40 p-3 space-y-2">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Meta atingida!
              </p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-500/70">
                Confirme para arquivar. O objetivo aparece como concluído no painel de Objetivos.
              </p>
              <Button
                onClick={() => onConfirm(goal.id, applied)}
                disabled={confirming}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
              >
                {confirming
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Arquivando...</>
                  : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Confirmar e arquivar meta</>
                }
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AcompanhamentoMetas({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId]                 = useState<string | null>(null);
  const [savingGoalId, setSavingGoalId]         = useState<string | null>(null);
  const [confirmingGoalId, setConfirmingGoalId] = useState<string | null>(null);
  const [confirmingMetaId, setConfirmingMetaId] = useState<string | null>(null);

  const { data: metas = [] } = useQuery({
    queryKey: ["parecer_metas", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parecer_metas")
        .select("*")
        .eq("client_id", clientId)
        .order("source_table");
      return (data || []) as MetaEntry[];
    },
    enabled: !!clientId,
  });

  const { data: entradas = [] } = useQuery({
    queryKey: ["acompanhamento_entradas", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("acompanhamento_entradas")
        .select("*")
        .eq("client_id", clientId)
        .order("snapshotted_at", { ascending: false });
      return (data || []) as AcompEntry[];
    },
    enabled: !!clientId,
  });

  const { data: activeGoals = [] } = useQuery({
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

  const saveEntrada = useMutation({
    mutationFn: async ({
      meta,
      estadoAtual,
      valorAtualStr,
    }: {
      meta: MetaEntry;
      estadoAtual: string;
      valorAtualStr: string;
    }) => {
      const valorAtual = valorAtualStr ? parseFloat(valorAtualStr) : null;
      const progressoPct =
        meta.meta_valor && valorAtual != null
          ? Math.round((valorAtual / meta.meta_valor) * 100)
          : null;

      const { error } = await supabase.from("acompanhamento_entradas").insert({
        client_id: clientId,
        meta_id: meta.id,
        source_table: meta.source_table,
        source_id: meta.source_id,
        source_label: meta.source_label,
        valor_meta: meta.meta_valor ?? null,
        prazo: meta.prazo ?? null,
        valor_atual: valorAtual,
        estado_atual: estadoAtual || null,
        progresso_pct: progressoPct,
        is_closing_snapshot: false,
        snapshotted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acompanhamento_entradas", clientId] });
      toast.success("Acompanhamento salvo");
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + (err?.message || "tente novamente")),
  });

  const handleSave = (metaId: string, estadoAtual: string, valorAtualStr: string) => {
    const meta = metas.find((m) => m.id === metaId);
    if (!meta) return;
    setSavingId(metaId);
    saveEntrada.mutate(
      { meta, estadoAtual, valorAtualStr },
      { onSettled: () => setSavingId(null) },
    );
  };

  const handleConfirmMetaDone = async (metaId: string) => {
    setConfirmingMetaId(metaId);
    try {
      const { error } = await supabase.from("parecer_metas").delete().eq("id", metaId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["parecer_metas", clientId] });
      queryClient.invalidateQueries({ queryKey: ["acompanhamento_entradas", clientId] });
      toast.success("Meta arquivada! O item voltou ao Plano de Ação para um novo objetivo.");
    } catch (err: any) {
      toast.error("Erro ao arquivar: " + (err?.message || "tente novamente"));
    } finally {
      setConfirmingMetaId(null);
    }
  };

  const handleSaveGoalInvestment = async (goalId: string, amount: number) => {
    setSavingGoalId(goalId);
    const { error } = await supabase.from("goals").update({ amount_applied: amount }).eq("id", goalId);
    setSavingGoalId(null);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["goals", clientId] });
      toast.success("Investimento registrado");
    }
  };

  const handleConfirmGoalDone = async (goalId: string, amount: number) => {
    setConfirmingGoalId(goalId);
    try {
      const { error } = await supabase
        .from("goals")
        .update({ completed_at: new Date().toISOString(), amount_applied: amount })
        .eq("id", goalId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["goals", clientId] });
      toast.success("Meta arquivada! Objetivo marcado como concluído no painel de Objetivos.");
    } catch (err: any) {
      toast.error("Erro ao arquivar: " + (err?.message || "tente novamente"));
    } finally {
      setConfirmingGoalId(null);
    }
  };

  // Only non-goal sections sourced from parecer_metas
  const bySection = SECTION_ORDER.reduce(
    (acc, section) => {
      acc[section] = metas.filter((m) => m.source_table === section);
      return acc;
    },
    {} as Record<string, MetaEntry[]>,
  );

  const totalMetas             = metas.filter((m) => m.source_table !== "goals").length;
  const totalComAcomp          = new Set(entradas.map((e) => e.meta_id)).size;
  const goalsWithInvestment    = activeGoals.filter((g) => g.amount_applied && g.amount_applied > 0).length;
  const hasContent             = totalMetas > 0 || activeGoals.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhuma meta ou objetivo encontrado.</p>
        <p className="text-xs mt-1">Configure o Plano de Ação e adicione Objetivos primeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {totalMetas > 0 && (
            <span>{totalComAcomp} de {totalMetas} metas com acompanhamento</span>
          )}
          {activeGoals.length > 0 && (
            <span>{goalsWithInvestment} de {activeGoals.length} objetivos com investimento</span>
          )}
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/60">Plano de Ação</span>
          <span>→</span>
          <span className="font-medium text-foreground/60">Estado atual</span>
        </div>
      </div>

      {/* Seções de metas do Plano de Ação */}
      {SECTION_ORDER.map((section) => {
        const items = bySection[section];
        if (!items || !items.length) return null;
        const cfg  = SECTION_CONFIG[section];
        const Icon = cfg.icon;
        const comAcomp = items.filter((m) => entradas.some((e) => e.meta_id === m.id)).length;

        return (
          <div key={section}>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold">{cfg.label}</h3>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              {comAcomp > 0 && (
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-600/30">
                  {comAcomp} atualizada{comAcomp !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 px-4 pb-1 text-xs text-muted-foreground font-medium border-b border-border/30">
              <span>Meta definida no Plano de Ação</span>
              <span>Acompanhamento atual</span>
            </div>

            <div className="space-y-3">
              {items.map((meta) => {
                const metaHistory = entradas
                  .filter((e) => e.meta_id === meta.id && !e.is_closing_snapshot)
                  .slice(0, 10);
                return (
                  <MetaAcompRow
                    key={meta.id}
                    meta={meta}
                    latestEntry={metaHistory[0]}
                    history={metaHistory}
                    onSave={handleSave}
                    saving={savingId === meta.id}
                    onConfirm={handleConfirmMetaDone}
                    confirming={confirmingMetaId === meta.id}
                  />
                );
              })}
            </div>

            <Separator className="mt-6" />
          </div>
        );
      })}

      {/* Objetivos — direto da tabela goals (vinculados ao painel de Objetivos do diagnóstico) */}
      {activeGoals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", SECTION_CONFIG.goals.color)}>
              <Target className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold">Objetivos</h3>
            <Badge variant="secondary" className="text-xs">{activeGoals.length}</Badge>
            {goalsWithInvestment > 0 && (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-600/30">
                {goalsWithInvestment} em andamento
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 px-4 pb-1 text-xs text-muted-foreground font-medium border-b border-border/30">
            <span>Objetivo do cliente</span>
            <span>Investimento aplicado</span>
          </div>

          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <GoalDirectRow
                key={goal.id}
                goal={goal}
                onSave={handleSaveGoalInvestment}
                saving={savingGoalId === goal.id}
                onConfirm={handleConfirmGoalDone}
                confirming={confirmingGoalId === goal.id}
              />
            ))}
          </div>

          <Separator className="mt-6" />
        </div>
      )}
    </div>
  );
}

// Usado pelo MonthlyClosings para criar snapshots de fechamento
export async function criarSnapshotFechamento(
  clientId: string,
  monthClosingId: string,
  metas: MetaEntry[],
  entradas: AcompEntry[],
) {
  if (!metas.length) return;

  const rows = metas.map((meta) => {
    const latest = entradas.find((e) => e.meta_id === meta.id && !e.is_closing_snapshot);
    return {
      client_id: clientId,
      meta_id: meta.id,
      source_table: meta.source_table,
      source_id: meta.source_id,
      source_label: meta.source_label,
      valor_meta: meta.meta_valor ?? null,
      prazo: meta.prazo ?? null,
      valor_atual: latest?.valor_atual ?? null,
      estado_atual: latest?.estado_atual ?? null,
      progresso_pct: latest?.progresso_pct ?? null,
      is_closing_snapshot: true,
      month_closing_id: monthClosingId,
      snapshotted_at: new Date().toISOString(),
    };
  });

  await supabase.from("acompanhamento_entradas").insert(rows);
}
