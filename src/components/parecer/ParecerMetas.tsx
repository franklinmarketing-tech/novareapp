import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Save, Loader2, ChevronDown, CalendarDays,
  Wallet, Receipt, CreditCard, Building2, Shield, Target,
  TrendingUp, TrendingDown, Trash2, Minus,
  type LucideIcon,
} from "lucide-react";

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
}

type Direction = "increase" | "reduce" | "eliminate" | "maintain";

interface AiSuggestion {
  source_table: string;
  source_id: string;
  suggestion_text: string;
  target_value?: number;
  suggested_prazo?: string;
  direction?: Direction;
}

const DIRECTION_CONFIG: Record<Direction, {
  label: string; icon: LucideIcon;
  card: string; badge: string; iconClass: string;
}> = {
  increase:  { label: "Crescer",  icon: TrendingUp,   card: "bg-emerald-500/5 border-emerald-500/25",  badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", iconClass: "text-emerald-500" },
  reduce:    { label: "Reduzir",  icon: TrendingDown,  card: "bg-amber-500/5 border-amber-500/25",      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",       iconClass: "text-amber-500" },
  eliminate: { label: "Quitar",   icon: Trash2,        card: "bg-rose-500/5 border-rose-500/25",        badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",           iconClass: "text-rose-500" },
  maintain:  { label: "Manter",   icon: Minus,         card: "bg-blue-500/5 border-blue-500/25",        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",           iconClass: "text-blue-500" },
};

interface FieldState {
  metaText: string;
  prazo: string;
  metaValor: string;
}

const SECTION_CONFIG: Record<SourceTable, { label: string; icon: LucideIcon; color: string }> = {
  income:    { label: "Rendas",      icon: Wallet,    color: "bg-success/10 text-success" },
  expenses:  { label: "Despesas",    icon: Receipt,   color: "bg-destructive/10 text-destructive" },
  debts:     { label: "Dívidas",     icon: CreditCard, color: "bg-warning/10 text-warning" },
  assets:    { label: "Patrimônio",  icon: Building2, color: "bg-primary/10 text-primary" },
  insurance: { label: "Seguros",     icon: Shield,    color: "bg-accent/10 text-accent" },
  goals:     { label: "Objetivos",   icon: Target,    color: "bg-success/10 text-success" },
};

const SECTION_ORDER: SourceTable[] = ["income", "expenses", "debts", "assets", "insurance", "goals"];

// direction auto-detect helper
function inferDirection(table: SourceTable): Direction {
  if (table === "expenses") return "reduce";
  if (table === "debts")    return "eliminate";
  return "increase";
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full">
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 text-sm pl-3 pr-8",
          "[&::-webkit-calendar-picker-indicator]:opacity-0",
          "[&::-webkit-calendar-picker-indicator]:absolute",
          "[&::-webkit-calendar-picker-indicator]:right-0",
          "[&::-webkit-calendar-picker-indicator]:top-0",
          "[&::-webkit-calendar-picker-indicator]:h-full",
          "[&::-webkit-calendar-picker-indicator]:w-8",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
        )}
      />
      <CalendarDays className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10" />
    </div>
  );
}

export function ParecerMetas({ clientId }: { clientId: string }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Record<string, FieldState>>({});
  const [expanded, setExpanded] = useState<Record<SourceTable, boolean>>(
    Object.fromEntries(SECTION_ORDER.map((s) => [s, true])) as Record<SourceTable, boolean>,
  );

  const { data: income = [] } = useQuery({
    queryKey: ["income", clientId],
    queryFn: async () => { const { data } = await supabase.from("income").select("*").eq("client_id", clientId); return data || []; },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", clientId],
    queryFn: async () => { const { data } = await supabase.from("expenses").select("*").eq("client_id", clientId); return data || []; },
  });
  const { data: debts = [] } = useQuery({
    queryKey: ["debts", clientId],
    queryFn: async () => { const { data } = await supabase.from("debts").select("*").eq("client_id", clientId); return data || []; },
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["assets", clientId],
    queryFn: async () => { const { data } = await supabase.from("assets").select("*").eq("client_id", clientId); return data || []; },
  });
  const { data: insurance = [] } = useQuery({
    queryKey: ["insurance", clientId],
    queryFn: async () => { const { data } = await supabase.from("insurance").select("*").eq("client_id", clientId); return data || []; },
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["goals", clientId],
    queryFn: async () => { const { data } = await supabase.from("goals").select("*").eq("client_id", clientId); return data || []; },
  });

  const { data: metas = [] } = useQuery({
    queryKey: ["parecer_metas", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("parecer_metas").select("*").eq("client_id", clientId);
      return (data || []) as ParecerMeta[];
    },
  });

  // Populate fields from saved metas (only for keys not yet touched by user)
  useEffect(() => {
    if (!metas.length) return;
    setFields((prev) => {
      const next = { ...prev };
      for (const m of metas) {
        if (next[m.source_id] === undefined) {
          next[m.source_id] = {
            metaText: m.meta_text || "",
            prazo: m.prazo || "",
            metaValor: m.meta_valor != null ? String(m.meta_valor) : "",
          };
        }
      }
      return next;
    });
  }, [metas]);

  const updateField = (sourceId: string, key: keyof FieldState, value: string) => {
    setFields((prev) => ({
      ...prev,
      [sourceId]: { metaText: "", prazo: "", metaValor: "", ...prev[sourceId], [key]: value },
    }));
  };

  const allItems: FinancialItem[] = [
    ...(income as any[]).map((r) => ({
      source_table: "income" as SourceTable,
      source_id: r.id,
      source_label: r.description,
      current_value: Number(r.amount),
      unit: `/${r.frequency === "mensal" ? "mês" : r.frequency === "anual" ? "ano" : "eventual"}`,
      detail: `Estabilidade: ${r.stability}${r.is_primary ? " · Principal" : ""}`,
    })),
    ...(expenses as any[]).map((r) => ({
      source_table: "expenses" as SourceTable,
      source_id: r.id,
      source_label: r.category + (r.description ? ` — ${r.description}` : ""),
      current_value: Number(r.amount),
      unit: "/mês",
      detail: r.is_fixed ? "Fixa" : `Variável${r.due_day ? ` · vence dia ${r.due_day}` : ""}`,
    })),
    ...(debts as any[]).map((r) => ({
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
    ...(assets as any[]).map((r) => ({
      source_table: "assets" as SourceTable,
      source_id: r.id,
      source_label: `${r.type}${r.description ? ` — ${r.description}` : ""}`,
      current_value: Number(r.estimated_value),
    })),
    ...(insurance as any[]).map((r) => ({
      source_table: "insurance" as SourceTable,
      source_id: r.id,
      source_label: `${r.type}${r.provider ? ` — ${r.provider}` : ""}`,
      current_value: Number(r.monthly_premium || 0),
      unit: "/mês",
      detail: r.coverage_amount ? `Cobertura: ${formatBRL(Number(r.coverage_amount))}` : undefined,
    })),
    ...(goals as any[]).filter((r) => !r.completed_at).map((r) => ({
      source_table: "goals" as SourceTable,
      source_id: r.id,
      source_label: r.description,
      current_value: Number(r.amount_applied || 0),
      unit: " aplicado",
      detail: [
        r.target_amount ? `Meta total: ${formatBRL(Number(r.target_amount))}` : null,
        r.priority ? `Prioridade: ${r.priority}` : null,
        r.deadline ? `Prazo: ${new Date(r.deadline).toLocaleDateString("pt-BR")}` : null,
      ].filter(Boolean).join(" · "),
    })),
  ];

  const bySection = SECTION_ORDER.reduce(
    (acc, s) => { acc[s] = allItems.filter((i) => i.source_table === s); return acc; },
    {} as Record<SourceTable, FinancialItem[]>,
  );

  const totalItems = allItems.length;
  const totalMetas = metas.filter((m) => m.meta_text).length;

  const handleSaveAll = async () => {
    const toSave = allItems.filter((item) => fields[item.source_id]?.metaText?.trim());
    if (!toSave.length) { toast.error("Nenhuma meta preenchida"); return; }
    setSaving(true);
    try {
      const rows = toSave.map((item) => {
        const f = fields[item.source_id];
        const metaValorNum = f.metaValor ? (parseFloat(f.metaValor) || null) : null;
        return {
          client_id: clientId,
          source_table: item.source_table,
          source_id: item.source_id,
          source_label: item.source_label,
          current_value: item.current_value,
          meta_text: f.metaText.trim(),
          prazo: f.prazo || null,
          meta_valor: metaValorNum,
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase
        .from("parecer_metas")
        .upsert(rows, { onConflict: "client_id,source_table,source_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["parecer_metas", clientId] });
      toast.success(`${toSave.length} meta${toSave.length !== 1 ? "s" : ""} salva${toSave.length !== 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleAI = async () => {
    if (!session?.access_token) { toast.error("Sessão expirada, faça login novamente"); return; }
    setLoadingAI(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const resp = await fetch(`${supabaseUrl}/functions/v1/suggest-metas`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({ clientId }),
      });
      const respData = await resp.json();
      if (!resp.ok) {
        const detail = respData?.error || `HTTP ${resp.status}`;
        console.error("[suggest-metas] erro:", detail, respData);
        throw new Error(detail);
      }
      const suggestions: AiSuggestion[] = respData?.suggestions || [];
      if (!suggestions.length) { toast.info("IA não retornou sugestões"); return; }
      setAiSuggestions(suggestions);
      setExpanded(Object.fromEntries(SECTION_ORDER.map((s) => [s, true])) as Record<SourceTable, boolean>);
      toast.success(`IA gerou ${suggestions.length} sugestões — clique em Aplicar para usar`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      toast.error("Erro IA: " + msg);
      console.error("[suggest-metas]", msg);
    } finally {
      setLoadingAI(false);
    }
  };

  if (totalItems === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhum dado financeiro encontrado.</p>
        <p className="text-xs mt-1">O cliente precisa completar o onboarding primeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground shrink-0">
          {totalMetas} de {totalItems} metas definidas
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={handleAI} disabled={loadingAI || totalItems === 0} variant="outline" className="gap-2">
            {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-novare-blue" />}
            {loadingAI ? "Analisando..." : "IA: Sugerir metas"}
          </Button>
          <Button onClick={handleSaveAll} disabled={saving} className="gap-2 min-w-[130px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar tudo"}
          </Button>
        </div>
      </div>

      {/* Section cards */}
      {SECTION_ORDER.map((section) => {
        const cfg = SECTION_CONFIG[section];
        const items = bySection[section];
        if (!items.length) return null;
        const Icon = cfg.icon;
        const isExpanded = expanded[section];
        const metasCount = items.filter((item) => {
          const f = fields[item.source_id];
          return f?.metaText?.trim() || metas.find((m) => m.source_id === item.source_id && m.meta_text);
        }).length;

        return (
          <div key={section} className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-subtle">
            {/* Card header — click to expand */}
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [section]: !prev[section] }))}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", cfg.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                <p className="text-[0.6875rem] text-muted-foreground">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                  {metasCount > 0 && ` · ${metasCount} com meta`}
                  {aiSuggestions.filter((s) => s.source_table === section).length > 0 && (
                    <span className="ml-1.5 text-novare-blue font-medium">
                      · {aiSuggestions.filter((s) => s.source_table === section).length} sugestão IA
                    </span>
                  )}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">{items.length}</Badge>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-muted-foreground/40 shrink-0"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            {/* Card content */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-4 pb-4 pt-3 border-t border-border/30 space-y-3">
                    {items.map((item) => {
                      const aiSugg = aiSuggestions.find(
                        (s) => s.source_table === item.source_table && s.source_id === item.source_id,
                      );
                      const f = fields[item.source_id] || { metaText: "", prazo: "", metaValor: "" };
                      const hasAI = !!aiSugg && aiSugg.suggestion_text !== f.metaText;
                      const dir = aiSugg?.direction ?? inferDirection(item.source_table);
                      const dcfg = DIRECTION_CONFIG[dir] || DIRECTION_CONFIG.increase;
                      const DirIcon = dcfg.icon;
                      const hasMeta = !!(f.metaText?.trim() || metas.find((m) => m.source_id === item.source_id && m.meta_text));

                      return (
                        <div
                          key={item.source_id}
                          className="rounded-xl border border-border/50 overflow-hidden bg-card"
                        >
                          {/* Item header: name + current value */}
                          <div className="flex items-start gap-4 px-4 py-3 bg-muted/30 border-b border-border/40">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <p className="text-sm font-semibold leading-tight">{item.source_label}</p>
                                <span className={cn("inline-flex items-center gap-1 text-[0.6rem] font-semibold rounded-full px-2 py-0.5 shrink-0", dcfg.badge)}>
                                  <DirIcon className="w-2.5 h-2.5" />
                                  {dcfg.label}
                                </span>
                              </div>
                              {item.detail && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{item.detail}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0 pl-4 border-l border-border/40">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Hoje</p>
                              <p className="text-sm font-bold tabular-nums text-foreground">
                                {item.current_value > 0 ? formatBRL(item.current_value) : "—"}
                              </p>
                              {item.unit && <p className="text-[10px] text-muted-foreground">{item.unit}</p>}
                            </div>
                          </div>

                          {/* Meta fields */}
                          <div className="px-4 py-3 space-y-3">
                            {/* Meta text */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Meta {hasMeta && <span className="text-emerald-600 ml-1">✓</span>}
                              </label>
                              <Input
                                value={f.metaText}
                                onChange={(e) => updateField(item.source_id, "metaText", e.target.value)}
                                placeholder="Descreva a meta para este item..."
                                className="h-9 text-sm bg-background"
                              />
                            </div>

                            {/* Prazo + Valor alvo side by side */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prazo</label>
                                <DateInput value={f.prazo} onChange={(v) => updateField(item.source_id, "prazo", v)} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Valor alvo</label>
                                <CurrencyInput
                                  value={f.metaValor}
                                  onChange={(v) => updateField(item.source_id, "metaValor", v)}
                                  placeholder="R$ 0,00"
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>

                            {/* AI suggestion */}
                            {hasAI && (
                              <div className={cn("flex items-start gap-3 px-3 py-2.5 rounded-lg border", dcfg.card)}>
                                <Sparkles className="w-3.5 h-3.5 text-novare-blue shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                                  {aiSugg!.suggestion_text}
                                </p>
                                <button
                                  onClick={() => {
                                    updateField(item.source_id, "metaText", aiSugg!.suggestion_text);
                                    if (aiSugg!.target_value != null)
                                      updateField(item.source_id, "metaValor", String(aiSugg!.target_value));
                                    if (aiSugg!.suggested_prazo)
                                      updateField(item.source_id, "prazo", aiSugg!.suggested_prazo);
                                  }}
                                  className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors self-start"
                                >
                                  Aplicar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

    </div>
  );
}
