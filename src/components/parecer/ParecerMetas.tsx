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

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SourceTable = "income" | "expenses" | "debts" | "assets" | "insurance" | "goals";

interface FinancialItem {
  source_table: SourceTable;
  source_id: string;
  source_label: string;
  current_value: number;
  unit?: string;
  detail?: string;
}

interface ParecerMeta {
  id?: string;
  source_table: string;
  source_id: string;
  meta_text: string;
  prazo?: string;
  meta_valor?: number;
  ai_suggestion?: string;
}

interface AiSuggestion {
  source_table: string;
  source_id: string;
  suggestion_text: string;
  target_value?: number;
  suggested_prazo?: string;
}

const SECTION_LABELS: Record<SourceTable, string> = {
  income: "Rendas",
  expenses: "Despesas",
  debts: "Dívidas",
  assets: "Patrimônio",
  insurance: "Seguros",
  goals: "Objetivos",
};

const SECTION_ORDER: SourceTable[] = [
  "income",
  "expenses",
  "debts",
  "assets",
  "insurance",
  "goals",
];

// Colunas: Item | Valor atual | Prazo | Meta | Salvar
const GRID = "grid-cols-[minmax(0,1.8fr)_120px_130px_minmax(0,2fr)_36px]";

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
  onSave: (
    sourceTable: string,
    sourceId: string,
    metaText: string,
    prazo: string,
    metaValor?: number,
  ) => void;
  saving: boolean;
}) {
  const [metaValue, setMetaValue] = useState(meta?.meta_text || "");
  const [prazo, setPrazo] = useState(meta?.prazo || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!metaValue.trim()) return;
    onSave(item.source_table, item.source_id, metaValue.trim(), prazo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleApplyAI = () => {
    if (!aiSuggestion) return;
    setMetaValue(aiSuggestion.suggestion_text);
    if (aiSuggestion.suggested_prazo) setPrazo(aiSuggestion.suggested_prazo);
  };

  return (
    <div className={`grid ${GRID} gap-3 items-start py-3 border-b border-border/40 last:border-0`}>
      {/* Nome + detalhe + sugestão IA */}
      <div className="min-w-0 pt-1">
        <p className="text-sm font-medium leading-tight">{item.source_label}</p>
        {item.detail && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
        )}
        {aiSuggestion && !metaValue && (
          <button
            onClick={handleApplyAI}
            className="mt-1.5 flex items-start gap-1 text-xs text-novare-blue hover:text-novare-blue-light transition-colors text-left"
          >
            <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{aiSuggestion.suggestion_text}</span>
            <span className="shrink-0 font-semibold ml-1">Aplicar</span>
          </button>
        )}
        {aiSuggestion && metaValue && metaValue !== aiSuggestion.suggestion_text && (
          <button
            onClick={handleApplyAI}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-novare-blue transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>Sugestão IA</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Valor atual */}
      <div className="text-sm text-muted-foreground tabular-nums pt-1.5">
        {item.current_value > 0 ? formatBRL(item.current_value) : "—"}
        {item.unit && <span className="text-xs ml-0.5 text-muted-foreground/70">{item.unit}</span>}
      </div>

      {/* Prazo */}
      <Input
        type="date"
        value={prazo}
        onChange={(e) => setPrazo(e.target.value)}
        className="text-sm h-8"
      />

      {/* Meta */}
      <Input
        value={metaValue}
        onChange={(e) => setMetaValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="Defina a meta..."
        className="text-sm h-8"
      />

      {/* Salvar */}
      <Button
        size="sm"
        variant={saved ? "secondary" : "default"}
        onClick={handleSave}
        disabled={!metaValue.trim() || saving}
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
  );
}

export function ParecerMetas({ clientId }: { clientId: string }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const { data: insurance = [] } = useQuery({
    queryKey: ["insurance", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("insurance").select("*").eq("client_id", clientId);
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

  const saveMeta = useMutation({
    mutationFn: async ({
      sourceTable,
      sourceId,
      sourceLabel,
      currentValue,
      metaText,
      prazo,
      metaValor,
    }: {
      sourceTable: string;
      sourceId: string;
      sourceLabel: string;
      currentValue: number;
      metaText: string;
      prazo: string;
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
          prazo: prazo || null,
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
    prazo: string,
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
        prazo,
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
      toast.success(`IA gerou ${suggestions.length} sugestões`);
    } catch (err) {
      toast.error("Erro ao consultar IA");
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  const allItems: FinancialItem[] = [
    ...income.map((r: any) => ({
      source_table: "income" as SourceTable,
      source_id: r.id,
      source_label: r.description,
      current_value: Number(r.amount),
      unit: `/${r.frequency === "mensal" ? "mês" : r.frequency === "anual" ? "ano" : "eventual"}`,
      detail: `Estabilidade: ${r.stability} · ${r.is_primary ? "Renda principal" : "Renda secundária"}`,
    })),
    ...expenses.map((r: any) => ({
      source_table: "expenses" as SourceTable,
      source_id: r.id,
      source_label: r.category + (r.description ? ` — ${r.description}` : ""),
      current_value: Number(r.amount),
      unit: "/mês",
      detail: r.is_fixed ? "Despesa fixa" : `Despesa variável${r.due_day ? ` · vence dia ${r.due_day}` : ""}`,
    })),
    ...debts.map((r: any) => ({
      source_table: "debts" as SourceTable,
      source_id: r.id,
      source_label: `${r.type}${r.creditor ? ` — ${r.creditor}` : ""}`,
      current_value: Number(r.total_amount),
      detail: [
        r.monthly_payment ? `Parcela: ${formatBRL(Number(r.monthly_payment))}/mês` : null,
        r.interest_rate ? `Juros: ${r.interest_rate}%/mês` : null,
        r.remaining_months ? `${r.remaining_months} meses restantes` : null,
      ].filter(Boolean).join(" · "),
    })),
    ...assets.map((r: any) => ({
      source_table: "assets" as SourceTable,
      source_id: r.id,
      source_label: `${r.type}${r.description ? ` — ${r.description}` : ""}`,
      current_value: Number(r.estimated_value),
    })),
    ...insurance.map((r: any) => ({
      source_table: "insurance" as SourceTable,
      source_id: r.id,
      source_label: `${r.type}${r.provider ? ` — ${r.provider}` : ""}`,
      current_value: Number(r.monthly_premium || 0),
      unit: "/mês",
      detail: r.coverage_amount ? `Cobertura: ${formatBRL(Number(r.coverage_amount))}` : undefined,
    })),
    ...goals.map((r: any) => ({
      source_table: "goals" as SourceTable,
      source_id: r.id,
      source_label: r.description,
      current_value: Number(r.target_amount || 0),
      detail: [
        r.priority ? `Prioridade: ${r.priority}` : null,
        r.deadline ? `Prazo atual: ${new Date(r.deadline).toLocaleDateString("pt-BR")}` : null,
      ].filter(Boolean).join(" · "),
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
        <p className="text-sm text-muted-foreground">
          {totalMetas} de {totalItems} metas definidas
        </p>
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

      {SECTION_ORDER.map((section) => {
        const items = bySection[section];
        if (!items.length) return null;
        const metasCount = metas.filter((m) => m.source_table === section && m.meta_text).length;

        return (
          <div key={section}>
            {/* Título da seção */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS[section]}
              </h3>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              {metasCount > 0 && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                  {metasCount} com meta
                </Badge>
              )}
            </div>

            {/* Cabeçalho das colunas */}
            <div className={`grid ${GRID} gap-3 pb-1 mb-1`}>
              <p className="text-xs text-muted-foreground font-medium">Item</p>
              <p className="text-xs text-muted-foreground font-medium">Valor atual</p>
              <p className="text-xs text-muted-foreground font-medium">Prazo</p>
              <p className="text-xs text-muted-foreground font-medium">Meta</p>
              <div />
            </div>

            <div className="rounded-lg border border-border/60 bg-card px-4">
              {items.map((item) => {
                const meta = metas.find(
                  (m) => m.source_table === item.source_table && m.source_id === item.source_id,
                );
                const aiSuggestion = aiSuggestions.find(
                  (s) => s.source_table === item.source_table && s.source_id === item.source_id,
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
