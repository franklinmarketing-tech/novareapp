import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Save, Loader2, Check, ChevronDown, ChevronRight,
  Clock, Target, TrendingUp, TrendingDown, Minus, History,
  Wallet, Receipt, CreditCard, Building2, Shield,
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

const SECTION_ORDER: SourceTable[] = ["income", "expenses", "debts", "assets", "insurance", "goals"];

function progressColor(pct: number) {
  if (pct >= 100) return "text-emerald-600";
  if (pct >= 60) return "text-blue-600";
  if (pct >= 30) return "text-amber-600";
  return "text-rose-600";
}

function progressBarColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 30) return "bg-amber-500";
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

function MetaAcompRow({
  meta,
  latestEntry,
  history,
  onSave,
  saving,
}: {
  meta: MetaEntry;
  latestEntry?: AcompEntry;
  history: AcompEntry[];
  onSave: (metaId: string, estadoAtual: string, valorAtual: string) => void;
  saving: boolean;
}) {
  const [estado, setEstado] = useState(latestEntry?.estado_atual || "");
  const [valor, setValor] = useState(
    latestEntry?.valor_atual != null ? String(latestEntry.valor_atual) : "",
  );
  const [saved, setSaved] = useState(false);
  const [histOpen, setHistOpen] = useState(false);

  const valorNum = parseFloat(valor) || 0;
  const pct = meta.meta_valor && valorNum > 0
    ? Math.round((valorNum / meta.meta_valor) * 100)
    : latestEntry?.progresso_pct ?? null;

  const prevEntry = history[1];

  const handleSave = () => {
    if (!estado.trim() && !valor.trim()) return;
    onSave(meta.id, estado.trim(), valor.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="py-4 border-b border-border/30 last:border-0 space-y-3">
      {/* Layout: Plano (esquerda) | Tracking (direita) */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 items-start">

        {/* ── ESQUERDA: dados do Plano de Ação (read-only) ── */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold leading-tight">{meta.source_label}</p>

          {meta.meta_text ? (
            <div className="flex items-start gap-1.5 rounded-md bg-muted/40 px-2.5 py-1.5">
              <Target className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
              <p className="text-xs text-foreground/80 leading-snug">{meta.meta_text}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">Sem meta definida no plano</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {meta.prazo && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Prazo: <span className="font-medium text-foreground/70">{formatDate(meta.prazo)}</span>
              </span>
            )}
            {meta.meta_valor ? (
              <span className="flex items-center gap-1">
                <span>Meta:</span>
                <span className="font-medium tabular-nums text-foreground/70">{formatBRL(meta.meta_valor)}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* ── DIREITA: tracking (editable) ── */}
        <div className="space-y-2">
          {/* Linha: valor atual + botão salvar */}
          <div className="flex items-center gap-2">
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Valor atual (R$)"
              className="h-8 text-sm tabular-nums flex-1"
              type="number"
              min={0}
            />
            <Button
              size="sm"
              variant={saved ? "secondary" : "default"}
              onClick={handleSave}
              disabled={(!estado.trim() && !valor.trim()) || saving}
              className="h-8 w-9 p-0 shrink-0"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>

          {/* Estado atual */}
          <Textarea
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            placeholder="Como está agora? Descreva o estado atual..."
            className="text-sm min-h-[60px] resize-none py-1.5"
            rows={2}
          />

          {/* Progresso */}
          {pct != null && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm font-bold tabular-nums", progressColor(pct))}>
                  {pct}%
                </span>
                <TrendIcon current={pct} prev={prevEntry?.progresso_pct} />
                {latestEntry && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatDateTime(latestEntry.snapshotted_at)}
                  </span>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", progressBarColor(pct))}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Histórico colapsável */}
      {history.length > 0 && (
        <Collapsible open={histOpen} onOpenChange={setHistOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <History className="w-3 h-3" />
            {history.length} registro{history.length > 1 ? "s" : ""} anterior{history.length > 1 ? "es" : ""}
            {histOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 ml-1 border-l-2 border-border/40 pl-3 space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground/70">
                      {formatDateTime(entry.snapshotted_at)}
                    </span>
                    {entry.is_closing_snapshot && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        fechamento
                      </Badge>
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
      )}
    </div>
  );
}

export function AcompanhamentoMetas({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const bySection = SECTION_ORDER.reduce(
    (acc, section) => {
      acc[section] = metas.filter((m) => m.source_table === section);
      return acc;
    },
    {} as Record<SourceTable, MetaEntry[]>,
  );

  const totalMetas = metas.length;
  const totalComAcomp = new Set(entradas.map((e) => e.meta_id)).size;

  if (totalMetas === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhuma meta definida.</p>
        <p className="text-xs mt-1">Vá para Plano de Ação e salve as metas primeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalComAcomp} de {totalMetas} metas com acompanhamento registrado
        </p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/60">Plano de Ação</span>
          <span>→</span>
          <span className="font-medium text-foreground/60">Estado atual</span>
        </div>
      </div>

      {SECTION_ORDER.map((section) => {
        const items = bySection[section];
        if (!items.length) return null;
        const cfg = SECTION_CONFIG[section];
        const Icon = cfg.icon;
        const comAcomp = items.filter((m) =>
          entradas.some((e) => e.meta_id === m.id),
        ).length;

        return (
          <div key={section}>
            {/* Cabeçalho da seção */}
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

            {/* Cabeçalho das colunas */}
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 px-4 pb-1 text-xs text-muted-foreground font-medium border-b border-border/30">
              <span>Meta definida no Plano de Ação</span>
              <span>Acompanhamento atual</span>
            </div>

            <div className="rounded-lg border border-border/60 bg-card px-4">
              {items.map((meta) => {
                const metaHistory = entradas
                  .filter((e) => e.meta_id === meta.id && !e.is_closing_snapshot)
                  .slice(0, 10);
                const latest = metaHistory[0];

                return (
                  <MetaAcompRow
                    key={meta.id}
                    meta={meta}
                    latestEntry={latest}
                    history={metaHistory}
                    onSave={handleSave}
                    saving={savingId === meta.id}
                  />
                );
              })}
            </div>

            <Separator className="mt-6" />
          </div>
        );
      })}
    </div>
  );
}

// Exporta função utilitária usada pelo MonthlyClosings para criar snapshots de fechamento
export async function criarSnapshotFechamento(
  clientId: string,
  monthClosingId: string,
  metas: MetaEntry[],
  entradas: AcompEntry[],
) {
  if (!metas.length) return;

  const rows = metas.map((meta) => {
    const latest = entradas.find(
      (e) => e.meta_id === meta.id && !e.is_closing_snapshot,
    );
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
