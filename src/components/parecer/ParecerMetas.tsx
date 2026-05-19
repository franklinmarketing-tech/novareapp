import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Sparkles, Save, Check, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SourceTable = "income" | "expenses" | "debts" | "assets" | "goals";

interface FinancialItem {
  source_table: SourceTable;
  source_id: string;
  source_label: string;
  current_value: number;
  unit?: string;
}

interface ParecerMeta {
  id?: string;
  source_table: string;
  source_id: string;
  meta_text: string;
  meta_valor?: number;
  ai_suggestion?: string;
}

interface AiSuggestion {
  source_table: string;
  source_id: string;
  suggestion_text: string;
  target_value?: number;
}

const SECTION_LABELS: Record<SourceTable, string> = {
  income: "Rendas",
  expenses: "Despesas",
  debts: "Dívidas",
  assets: "Patrimônio",
  goals: "Objetivos",
};

const SECTION_ORDER: SourceTable[] = ["income", "expenses", "debts", "assets", "goals"];

function MetaRow({
  item,
  meta,
  aiSuggestion,
  onSave,
  saving,
}: {
  item: FinancialItem;
  meta?: ParecerMeta;
  aiSuggestion?: AiSuggestion;
  onSave: (sourceTable: string, sourceId: string, metaText: string, metaValor?: number) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(meta?.meta_text || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!value.trim()) return;
    onSave(item.source_table, item.source_id, value.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleApplyAI = () => {
    if (!aiSuggestion) return;
    setValue(aiSuggestion.suggestion_text);
  };

  return (
    <div className="grid grid-cols-[1fr_140px_1fr_auto] gap-3 items-center py-3 border-b border-border/40 last:border-0">
      {/* Nome */}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{item.source_label}</p>
        {aiSuggestion && !value && (
          <button
            onClick={handleApplyAI}
            className="mt-1 flex items-center gap-1 text-xs text-novare-blue hover:text-novare-blue-light transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span className="truncate max-w-[200px]">{aiSuggestion.suggestion_text}</span>
            <span className="shrink-0 font-semibold">Aplicar</span>
          </button>
        )}
        {aiSuggestion && value && value !== aiSuggestion.suggestion_text && (
          <button
            onClick={handleApplyAI}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-novare-blue transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span className="shrink-0">Ver sugestão IA</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Valor atual */}
      <div className="text-sm text-muted-foreground tabular-nums">
        {item.current_value > 0 ? formatBRL(item.current_value) : "—"}
        {item.unit && <span className="text-xs ml-0.5">{item.unit}</span>}
      </div>

      {/* Campo meta */}
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="Defina a meta para este item..."
        className="text-sm h-8"
      />

      {/* Salvar */}
      <Button
        size="sm"
        variant={saved ? "secondary" : "default"}
        onClick={handleSave}
        disabled={!value.trim() || saving}
        className="h-8 w-8 p-0 shrink-0"
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
  );
}

export function ParecerMetas({ clientId }: { clientId: string }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Carrega dados financeiros
  const { data: income = [] } = useQuery({
    queryKey: ["income", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("income").select("*").eq("client_id", clientId);
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").eq("client_id", clientId);
      return data || [];
    },
  });

  const { data: debts = [] } = useQuery({
    queryKey: ["debts", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("debts").select("*").eq("client_id", clientId);
      return data || [];
    },
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").eq("client_id", clientId);
      return data || [];
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("*").eq("client_id", clientId);
      return data || [];
    },
  });

  // Carrega metas salvas
  const { data: metas = [] } = useQuery({
    queryKey: ["parecer_metas", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parecer_metas")
        .select("*")
        .eq("client_id", clientId);
      return (data || []) as ParecerMeta[];
    },
  });

  // Mutation para salvar meta
  const saveMeta = useMutation({
    mutationFn: async ({
      sourceTable,
      sourceId,
      sourceLabel,
      currentValue,
      metaText,
      metaValor,
    }: {
      sourceTable: string;
      sourceId: string;
      sourceLabel: string;
      currentValue: number;
      metaText: string;
      metaValor?: number;
    }) => {
      const { error } = await supabase.from("parecer_metas").upsert(
        {
          client_id: clientId,
          source_table: sourceTable,
          source_id: sourceId,
          source_label: sourceLabel,
          current_value: currentValue,
          meta_text: metaText,
          meta_valor: metaValor ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,source_table,source_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parecer_metas", clientId] });
      toast.success("Meta salva");
    },
    onError: () => toast.error("Erro ao salvar meta"),
  });

  const handleSave = (
    sourceTable: string,
    sourceId: string,
    metaText: string,
    metaValor?: number,
  ) => {
    const item = allItems.find(
      (i) => i.source_table === sourceTable && i.source_id === sourceId,
    );
    if (!item) return;
    setSavingId(sourceId);
    saveMeta.mutate(
      {
        sourceTable,
        sourceId,
        sourceLabel: item.source_label,
        currentValue: item.current_value,
        metaText,
        metaValor,
      },
      { onSettled: () => setSavingId(null) },
    );
  };

  const handleAI = async () => {
    if (!session?.access_token) return;
    setLoadingAI(true);
    try {
      const resp = await supabase.functions.invoke("suggest-metas", {
        body: { clientId },
      });
      if (resp.error) throw resp.error;
      const suggestions: AiSuggestion[] = resp.data?.suggestions || [];
      setAiSuggestions(suggestions);
      toast.success(`IA gerou ${suggestions.length} sugestões de metas`);
    } catch (err) {
      toast.error("Erro ao consultar IA");
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  // Monta lista estruturada
  const allItems: FinancialItem[] = [
    ...income.map((r: any) => ({
      source_table: "income" as SourceTable,
      source_id: r.id,
      source_label: r.description,
      current_value: Number(r.amount),
      unit: `/${r.frequency === "mensal" ? "mês" : r.frequency}`,
    })),
    ...expenses.map((r: any) => ({
      source_table: "expenses" as SourceTable,
      source_id: r.id,
      source_label: r.category + (r.description ? ` — ${r.description}` : ""),
      current_value: Number(r.amount),
      unit: "/mês",
    })),
    ...debts.map((r: any) => ({
      source_table: "debts" as SourceTable,
      source_id: r.id,
      source_label: `${r.type}${r.creditor ? ` (${r.creditor})` : ""}`,
      current_value: Number(r.total_amount),
    })),
    ...assets.map((r: any) => ({
      source_table: "assets" as SourceTable,
      source_id: r.id,
      source_label: `${r.type}${r.description ? `: ${r.description}` : ""}`,
      current_value: Number(r.estimated_value),
    })),
    ...goals.map((r: any) => ({
      source_table: "goals" as SourceTable,
      source_id: r.id,
      source_label: r.description,
      current_value: Number(r.target_amount || 0),
    })),
  ];

  const bySection = SECTION_ORDER.reduce(
    (acc, section) => {
      acc[section] = allItems.filter((i) => i.source_table === section);
      return acc;
    },
    {} as Record<SourceTable, FinancialItem[]>,
  );

  const totalItems = allItems.length;
  const totalMetas = metas.filter((m) => m.meta_text).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {totalMetas} de {totalItems} metas definidas
          </p>
        </div>
        <Button
          onClick={handleAI}
          disabled={loadingAI || totalItems === 0}
          className="gap-2"
          variant="outline"
        >
          {loadingAI ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-novare-blue" />
          )}
          {loadingAI ? "Analisando..." : "IA: Sugerir metas"}
        </Button>
      </div>

      {totalItems === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum dado financeiro encontrado.</p>
          <p className="text-xs mt-1">O cliente precisa completar o onboarding primeiro.</p>
        </div>
      )}

      {/* Seções */}
      {SECTION_ORDER.map((section) => {
        const items = bySection[section];
        if (!items.length) return null;
        return (
          <div key={section}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS[section]}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
              {metas.filter((m) => m.source_table === section && m.meta_text).length > 0 && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                  {metas.filter((m) => m.source_table === section && m.meta_text).length} com meta
                </Badge>
              )}
            </div>

            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[1fr_140px_1fr_auto] gap-3 pb-1 mb-1">
              <p className="text-xs text-muted-foreground font-medium">Item</p>
              <p className="text-xs text-muted-foreground font-medium">Valor atual</p>
              <p className="text-xs text-muted-foreground font-medium">Meta</p>
              <div className="w-8" />
            </div>

            <div className="rounded-lg border border-border/60 bg-card px-4">
              {items.map((item) => {
                const meta = metas.find(
                  (m) => m.source_table === item.source_table && m.source_id === item.source_id,
                );
                const aiSuggestion = aiSuggestions.find(
                  (s) =>
                    s.source_table === item.source_table && s.source_id === item.source_id,
                );
                return (
                  <MetaRow
                    key={item.source_id}
                    item={item}
                    meta={meta}
                    aiSuggestion={aiSuggestion}
                    onSave={handleSave}
                    saving={savingId === item.source_id}
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
