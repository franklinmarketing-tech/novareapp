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
      const { data } = await supabase
        .from("parecer_metas")
        .select("*")
        .eq("client_id", clientId)
        .is("completed_at", null);
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

  const progressPct = totalItems > 0 ? Math.round((totalMetas / totalItems) * 100) : 0;
  const allDone = totalMetas >= totalItems && totalItems > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar — progresso + ações */}
      <div
        className="sticky top-0 z-20 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 backdrop-blur-md"
        style={{
          background: "hsl(var(--background) / 0.92)",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 4px 12px -6px hsl(0 0% 0% / 0.08)",
        }}
      >
        {/* Progresso */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <span className="text-[12px] font-semibold text-foreground tracking-tight">
              {totalMetas} <span className="text-muted-foreground font-normal">de</span> {totalItems} metas
            </span>
            <span
              className={cn(
                "text-[11px] font-bold tabular-nums",
                allDone ? "text-success" : "text-muted-foreground",
              )}
            >
              {progressPct}%
              {allDone && <span className="ml-1">✓ Completo</span>}
            </span>
          </div>
          <div
            className="relative h-1.5 rounded-full overflow-hidden"
            style={{ background: "hsl(var(--muted) / 0.5)" }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                background: allDone
                  ? "linear-gradient(90deg, hsl(var(--success)) 0%, hsl(var(--success) / 0.85) 100%)"
                  : "linear-gradient(90deg, hsl(var(--accent) / 0.85) 0%, hsl(var(--primary)) 100%)",
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleAI}
            disabled={loadingAI || totalItems === 0}
            variant={totalMetas === 0 ? "default" : "outline"}
            className={cn(
              "gap-2",
              totalMetas === 0 && "bg-gradient-to-r from-novare-blue to-novare-blue-bright text-white hover:opacity-95 shadow-md",
            )}
          >
            {loadingAI ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className={cn("w-4 h-4", totalMetas === 0 ? "text-white" : "text-novare-blue")} />
            )}
            {loadingAI ? "Analisando..." : totalMetas === 0 ? "Começar com IA" : "Sugerir metas"}
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

        const sectionAccentColor: Record<SourceTable, string> = {
          income:    "hsl(142 65% 42%)",
          expenses:  "hsl(0 72% 55%)",
          debts:     "hsl(38 95% 48%)",
          assets:    "hsl(var(--novare-blue-bright))",
          insurance: "hsl(260 60% 58%)",
          goals:     "hsl(142 65% 42%)",
        };
        const accent = sectionAccentColor[section];

        return (
          <div
            key={section}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "hsl(var(--card))",
              border: "1.5px solid hsl(var(--foreground) / 0.10)",
              borderTopColor: "hsl(var(--foreground) / 0.16)",
              boxShadow: [
                "0 1px 0 hsl(0 0% 100% / 0.65) inset",
                "0 -1px 0 hsl(0 0% 0% / 0.04) inset",
                "0 2px 6px -2px hsl(0 0% 0% / 0.06)",
                "0 10px 28px -8px hsl(0 0% 0% / 0.08)",
              ].join(", "),
            }}
          >
            {/* Top accent ribbon */}
            <div aria-hidden className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${accent} 30%, ${accent} 70%, transparent 100%)` }} />

            {/* Card header — click to expand */}
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [section]: !prev[section] }))}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/20"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(145deg, ${accent}22 0%, ${accent}0a 100%)`,
                  border: `1.5px solid ${accent}40`,
                  boxShadow: `0 1px 0 hsl(0 0% 100% / 0.5) inset, 0 2px 6px ${accent}18`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/60">{cfg.label}</span>

                {/* Contagem de itens */}
                <span
                  className="text-[10px] font-bold tabular-nums h-[18px] min-w-[18px] px-1.5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
                >
                  {items.length}
                </span>

                {/* Com meta */}
                {metasCount > 0 && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}28` }}
                  >
                    {metasCount} com meta
                  </span>
                )}

                {/* Sugestão IA */}
                {aiSuggestions.filter((s) => s.source_table === section).length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border border-novare-blue/20 bg-novare-blue-light/40 text-novare-blue dark:text-novare-blue-bright">
                    IA · {aiSuggestions.filter((s) => s.source_table === section).length}
                  </span>
                )}
              </div>
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted-foreground/40 shrink-0">
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
                  <div
                    className="px-4 pb-4 pt-3 space-y-3"
                    style={{ borderTop: "1px solid hsl(var(--border) / 0.3)" }}
                  >
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
                          className="rounded-xl overflow-hidden"
                          style={{
                            background: "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.25) 100%)",
                            border: "1.5px solid hsl(var(--foreground) / 0.09)",
                            borderTopColor: "hsl(var(--foreground) / 0.14)",
                            borderLeft: `3px solid ${accent}`,
                            boxShadow: [
                              "0 1px 0 hsl(0 0% 100% / 0.7) inset",
                              "0 -1px 0 hsl(0 0% 0% / 0.03) inset",
                              "0 2px 8px -2px hsl(0 0% 0% / 0.06)",
                              `0 6px 18px -6px ${accent}18`,
                            ].join(", "),
                          }}
                        >
                          {/* Item header: name + "Hoje" pill */}
                          <div
                            className="flex items-center gap-4 px-4 py-3"
                            style={{
                              background: `linear-gradient(135deg, hsl(var(--novare-blue) / 0.05) 0%, hsl(var(--muted) / 0.15) 100%)`,
                              borderBottom: "1px solid hsl(var(--border) / 0.35)",
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <p className="text-sm font-bold leading-tight text-foreground">{item.source_label}</p>
                                <span className={cn("inline-flex items-center gap-1 text-[0.6rem] font-bold rounded-full px-2 py-0.5 shrink-0", dcfg.badge)}>
                                  <DirIcon className="w-2.5 h-2.5" />
                                  {dcfg.label}
                                </span>
                              </div>
                              {item.detail && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{item.detail}</p>
                              )}
                            </div>

                            {/* "Hoje" dark navy pill */}
                            <div
                              className="text-right shrink-0 rounded-xl px-3.5 py-2"
                              style={{
                                background: "linear-gradient(145deg, hsl(var(--novare-blue)) 0%, hsl(var(--novare-blue) / 0.80) 100%)",
                                boxShadow: "0 1px 0 hsl(0 0% 100% / 0.12) inset, 0 3px 10px hsl(var(--novare-blue) / 0.35)",
                              }}
                            >
                              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "hsl(var(--novare-blue-bright))" }}>Hoje</p>
                              <p className="text-base font-black tabular-nums leading-tight text-white">
                                {item.current_value > 0 ? formatBRL(item.current_value) : "—"}
                              </p>
                              {item.unit && <p className="text-[9px] font-medium" style={{ color: "hsl(0 0% 100% / 0.55)" }}>{item.unit}</p>}
                            </div>
                          </div>

                          {/* Meta fields */}
                          <div
                            className="px-4 py-3.5 space-y-3"
                            style={{ background: "linear-gradient(180deg, hsl(var(--muted) / 0.08) 0%, transparent 100%)" }}
                          >
                            {/* Meta text */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-novare-terracotta flex items-center gap-1.5">
                                Meta {hasMeta && <span className="text-emerald-500 text-xs">✓</span>}
                              </label>
                              <Input
                                value={f.metaText}
                                onChange={(e) => updateField(item.source_id, "metaText", e.target.value)}
                                placeholder="Descreva a meta para este item..."
                                className="h-9 text-sm bg-background/80"
                                style={{ borderColor: hasMeta ? "hsl(var(--novare-terracotta) / 0.4)" : undefined }}
                              />
                            </div>

                            {/* Prazo + Valor alvo side by side */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prazo</label>
                                <DateInput value={f.prazo} onChange={(v) => updateField(item.source_id, "prazo", v)} />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor alvo</label>
                                <CurrencyInput
                                  value={f.metaValor}
                                  onChange={(v) => updateField(item.source_id, "metaValor", v)}
                                  placeholder="R$ 0,00"
                                  className="h-8 text-sm bg-background/80"
                                />
                              </div>
                            </div>

                            {/* AI suggestion */}
                            {hasAI && (
                              <div className={cn("flex items-start gap-3 px-3 py-2.5 rounded-lg border", dcfg.card)}>
                                <Sparkles className="w-3.5 h-3.5 text-novare-blue-bright shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground flex-1 leading-relaxed">{aiSugg!.suggestion_text}</p>
                                <button
                                  onClick={() => {
                                    updateField(item.source_id, "metaText", aiSugg!.suggestion_text);
                                    if (aiSugg!.target_value != null) updateField(item.source_id, "metaValor", String(aiSugg!.target_value));
                                    if (aiSugg!.suggested_prazo) updateField(item.source_id, "prazo", aiSugg!.suggested_prazo);
                                  }}
                                  className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors self-start"
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
