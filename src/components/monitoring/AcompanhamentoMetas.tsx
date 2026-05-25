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
  CheckCircle2, CalendarDays,
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
  id: string;                    // meta_id quando existe; senão "synthetic-<source_table>-<source_id>"
  source_table: string;
  source_id: string;
  source_label: string;
  meta_text?: string;
  meta_valor?: number;
  prazo?: string;
  current_value?: number | null; // valor cadastrado no onboarding (renda, despesa, dívida etc.)
  is_synthetic?: boolean;        // true quando não há meta cadastrada
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

function sectionBorderColor(sourceTable: string): string {
  switch (sourceTable) {
    case "income":   return "border-l-emerald-400";
    case "expenses": return "border-l-amber-400";
    case "debts":    return "border-l-rose-500";
    case "assets":   return "border-l-novare-blue-bright";
    case "insurance":return "border-l-purple-400";
    default:         return "border-l-border";
  }
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
  const dir = inferDirection(meta.source_table);
  const DirIcon = dir.icon;

  const handleSave = () => {
    if (!estado.trim() && !valor.trim()) return;
    onSave(meta.id, estado.trim(), valor.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={cn("rounded-xl border border-border/50 border-l-[3px] overflow-hidden bg-card", sectionBorderColor(meta.source_table))}>

      {/* ── Header: nome + direção + progresso ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-novare-blue-light/30 dark:bg-novare-blue/10">
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-novare-blue dark:text-novare-blue-bright leading-tight">{meta.source_label}</p>
          <span className={cn("inline-flex items-center gap-1 text-[0.6rem] font-semibold rounded-full px-2 py-0.5 shrink-0", dir.cls)}>
            <DirIcon className="w-2.5 h-2.5" />
            {dir.label}
          </span>
        </div>
        {pct != null && (
          <div className="flex items-center gap-2 shrink-0">
            <TrendIcon current={pct} prev={prevEntry?.progresso_pct} />
            <span className={cn("text-2xl font-black tabular-nums leading-none", progressColor(pct))}>{pct}%</span>
          </div>
        )}
      </div>

      {/* ── Barra de progresso full-width ── */}
      {pct != null && (
        <div className="h-[4px] bg-muted">
          <div
            className={cn("h-full transition-all duration-500", progressBarColor(pct))}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}

      {/* ── Corpo: Plano | Atualizar ── */}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] divide-x divide-border/40">

        {/* LEFT — Plano de Ação */}
        <div className="px-4 py-3 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-novare-terracotta">Plano de Ação</p>

          {meta.meta_text ? (
            <div className="rounded-lg bg-novare-terracotta-light dark:bg-novare-terracotta/10 border border-novare-terracotta/20 px-2.5 py-2">
              <div className="flex items-start gap-1.5">
                <Target className="w-3 h-3 mt-0.5 shrink-0 text-novare-terracotta" />
                <p className="text-xs text-foreground/80 leading-snug">{meta.meta_text}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">Sem meta definida</p>
          )}

          <div className="flex flex-col gap-1.5">
            {meta.meta_valor && (
              <div className="flex items-center gap-1.5 text-xs">
                <Target className="w-3 h-3 text-novare-blue-bright shrink-0" />
                <span className="text-muted-foreground">Alvo:</span>
                <span className="font-semibold tabular-nums text-novare-blue dark:text-novare-blue-bright">{formatBRL(meta.meta_valor)}</span>
              </div>
            )}
            {meta.prazo && (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Prazo:</span>
                <span className="font-medium text-foreground/70">{formatDate(meta.prazo)}</span>
              </div>
            )}
            {latestEntry && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mt-0.5">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                últ: {formatDateTime(latestEntry.snapshotted_at)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Atualizar */}
        <div className="px-4 py-3 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-novare-blue dark:text-novare-blue-bright">Registrar estado atual</p>

          <div className="flex items-center gap-2">
            <CurrencyInput
              value={valor}
              onChange={(v) => setValor(v)}
              placeholder="Valor atual..."
              className="h-9 text-sm flex-1 bg-background border-border/60 focus:border-novare-blue-bright/50"
            />
            <Button
              size="sm"
              variant={saved ? "secondary" : "default"}
              onClick={handleSave}
              disabled={(!estado.trim() && !valor.trim()) || saving}
              title={(!estado.trim() && !valor.trim()) ? "Preencha o valor ou o estado atual para salvar" : "Salvar registro"}
              className={cn("h-9 w-9 p-0 shrink-0", !saved && "bg-novare-terracotta hover:bg-novare-terracotta/90 text-white border-0")}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            </Button>
          </div>

          <Textarea
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            placeholder="Como está agora? Descreva brevemente..."
            className="text-sm min-h-[52px] resize-none py-2 bg-background border-border/60"
            rows={2}
          />
        </div>
      </div>

      {/* ── Meta atingida ── */}
      {pct != null && pct >= 100 && (
        <div className="mx-4 mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300/40 p-3 space-y-2">
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

      {/* ── Histórico ── */}
      {history.length > 0 && (
        <div className="border-t border-border/30 px-4 py-2">
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
        .is("completed_at", null)
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
    onSuccess: async () => {
      // Refetch agressivo: força atualização de TODAS as queries do cliente,
      // mesmo as inativas (cliente off-line / outras abas / KPIs em background).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["acompanhamento_entradas", clientId], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["parecer_metas", clientId], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["goals", clientId], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["daily_progress_snapshots", clientId], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["client", clientId], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["client_financials", clientId], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["monthly_closings", clientId], refetchType: "all" }),
        queryClient.refetchQueries({ queryKey: ["acompanhamento_entradas", clientId], type: "all" }),
      ]);
      toast.success("Acompanhamento salvo", { description: "Dados atualizados em tempo real para o cliente." });
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + (err?.message || "tente novamente")),
  });

  const handleSave = async (metaId: string, estadoAtual: string, valorAtualStr: string) => {
    const meta = metas.find((m) => m.id === metaId);
    if (!meta) return;
    setSavingId(metaId);
    // Reset completed_at if new progress drops below 100%
    if (meta.meta_valor && valorAtualStr) {
      const newPct = Math.round((parseFloat(valorAtualStr) / meta.meta_valor) * 100);
      if (newPct < 100) {
        await supabase.from("parecer_metas").update({ completed_at: null }).eq("id", metaId);
      }
    }
    saveEntrada.mutate(
      { meta, estadoAtual, valorAtualStr },
      { onSettled: () => setSavingId(null) },
    );
  };

  const handleConfirmMetaDone = async (metaId: string) => {
    setConfirmingMetaId(metaId);
    try {
      const completedAt = new Date().toISOString();
      const { error } = await supabase
        .from("parecer_metas")
        .update({ completed_at: completedAt })
        .eq("id", metaId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["parecer_metas", clientId] });
      toast.success("Meta concluída!", {
        description: "Ficará registrada no fechamento do mês como conquista.",
        action: {
          label: "Desfazer",
          onClick: async () => {
            await supabase.from("parecer_metas").update({ completed_at: null }).eq("id", metaId);
            queryClient.invalidateQueries({ queryKey: ["parecer_metas", clientId] });
            toast.success("Meta reativada");
          },
        },
        duration: 6000,
      });
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
      toast.success("Objetivo concluído!", {
        description: "Marcado como conquista no painel de Objetivos.",
        action: {
          label: "Desfazer",
          onClick: async () => {
            await supabase.from("goals").update({ completed_at: null }).eq("id", goalId);
            queryClient.invalidateQueries({ queryKey: ["goals", clientId] });
            toast.success("Objetivo reativado");
          },
        },
        duration: 6000,
      });
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
  const lastSyncDate           = entradas[0]?.snapshotted_at
    ? new Date(entradas[0].snapshotted_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

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
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {lastSyncDate && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 text-[10px] font-medium">
              <Clock className="h-2.5 w-2.5" />
              Sincronizado em {lastSyncDate}
            </span>
          )}
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

        const sectionAccent: Record<string, string> = {
            income:    "hsl(142 65% 42%)",
            expenses:  "hsl(0 72% 55%)",
            debts:     "hsl(38 95% 48%)",
            assets:    "hsl(210 75% 62%)",
            insurance: "hsl(260 60% 58%)",
            goals:     "hsl(142 65% 42%)",
          };
          const accent = sectionAccent[section] ?? "hsl(var(--primary))";

        return (
          <div key={section}>
            <div className="flex items-center gap-2.5 mb-3">
              {/* Barra lateral colorida */}
              <div className="h-5 w-[3px] rounded-full shrink-0" style={{ background: accent }} />

              {/* Ícone */}
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
              >
                <Icon className="w-3 h-3" style={{ color: accent }} />
              </div>

              {/* Label uppercase */}
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/55">{cfg.label}</h3>

              {/* Contagem */}
              <span
                className="text-[10px] font-bold tabular-nums h-[18px] min-w-[18px] px-1.5 rounded-full flex items-center justify-center"
                style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
              >
                {items.length}
              </span>

              {/* Badge "com entrada" */}
              {comAcomp > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {comAcomp} com entrada
                </span>
              )}

              {/* Linha separadora */}
              <div className="flex-1 h-px bg-border/50" />
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
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-5 w-[3px] rounded-full shrink-0 bg-success" />
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "hsl(142 65% 42% / 0.12)", border: "1px solid hsl(142 65% 42% / 0.28)" }}
            >
              <Target className="w-3 h-3" style={{ color: "hsl(142 65% 42%)" }} />
            </div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/55">Objetivos</h3>
            <span
              className="text-[10px] font-bold tabular-nums h-[18px] min-w-[18px] px-1.5 rounded-full flex items-center justify-center"
              style={{ background: "hsl(142 65% 42% / 0.12)", color: "hsl(142 65% 42%)", border: "1px solid hsl(142 65% 42% / 0.22)" }}
            >
              {activeGoals.length}
            </span>
            {goalsWithInvestment > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                {goalsWithInvestment} em andamento
              </span>
            )}
            <div className="flex-1 h-px bg-border/50" />
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
