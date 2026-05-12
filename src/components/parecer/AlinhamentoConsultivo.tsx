import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  Plus,
  ChevronDown,
  Search,
  User,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  Shield,
  Target,
} from "lucide-react";
import {
  fmtBRL,
  SOURCE_CONFIG,
  type SnapshotChip,
  type SnapshotSource,
} from "./snapshotTypes";

// ── Tipos internos ─────────────────────────────────────

interface SourceItem {
  id: string;
  label: string;
  value?: number;
  meta?: Record<string, unknown>;
}

interface SourceData {
  source: SnapshotSource;
  items: SourceItem[];
  /** Soma agregada quando aplicavel (despesas, dividas, ativos) */
  total?: number;
  /** Texto extra no header (ex: "12 itens", "casado · 2 dependentes") */
  subtitle?: string;
}

const ICONS: Record<SnapshotSource, typeof User> = {
  client: User,
  income: TrendingUp,
  expense: TrendingDown,
  debt: CreditCard,
  asset: Wallet,
  insurance: Shield,
  goal: Target,
};

const TONE: Record<SnapshotSource, string> = {
  client: "bg-indigo-500/10 text-indigo-600 border-indigo-500/25",
  income: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
  expense: "bg-red-500/10 text-red-600 border-red-500/25",
  debt: "bg-orange-500/10 text-orange-600 border-orange-500/25",
  asset: "bg-blue-500/10 text-blue-600 border-blue-500/25",
  insurance: "bg-purple-500/10 text-purple-600 border-purple-500/25",
  goal: "bg-violet-500/10 text-violet-600 border-violet-500/25",
};

// Mapeia o estado civil enum -> label
const MARITAL_LABEL: Record<string, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  uniao_estavel: "União estável",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

// ── Componente ─────────────────────────────────────────

interface Props {
  clientId: string;
  onInsertChip: (chip: SnapshotChip) => void;
}

const ALL_SOURCES: SnapshotSource[] = [
  "client",
  "income",
  "expense",
  "debt",
  "asset",
  "insurance",
  "goal",
];

export const AlinhamentoConsultivo = ({ clientId, onInsertChip }: Props) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<SnapshotSource, SourceData>>(
    {} as Record<SnapshotSource, SourceData>,
  );
  const [visible, setVisible] = useState<Set<SnapshotSource>>(new Set(ALL_SOURCES));
  const [expanded, setExpanded] = useState<Set<SnapshotSource>>(
    new Set<SnapshotSource>(["expense", "debt", "asset"]),
  );
  const [search, setSearch] = useState("");

  // ── Carga dos dados do onboarding ──────────────────
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [
        clientRes,
        incomeRes,
        expenseRes,
        debtRes,
        assetRes,
        insuranceRes,
        goalRes,
      ] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
        supabase.from("income").select("*").eq("client_id", clientId).order("created_at"),
        supabase.from("expenses").select("*").eq("client_id", clientId).order("amount", { ascending: false }),
        supabase.from("debts").select("*").eq("client_id", clientId).order("total_amount", { ascending: false }),
        supabase.from("assets").select("*").eq("client_id", clientId).order("estimated_value", { ascending: false }),
        supabase.from("insurance").select("*").eq("client_id", clientId),
        supabase.from("goals").select("*").eq("client_id", clientId).order("priority"),
      ]);
      if (cancelled) return;

      // Cliente: busca nome do profile + monta campos individuais
      let clientName = "";
      let clientEmail = "";
      if (clientRes.data?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", clientRes.data.user_id)
          .maybeSingle();
        if (profile) {
          clientName = profile.full_name || "";
          clientEmail = profile.email || "";
        }
      }

      const clientItems: SourceItem[] = [];
      const c = clientRes.data;
      if (c) {
        if (clientName) clientItems.push({ id: "name", label: "Nome", meta: { value: clientName } });
        if (clientEmail) clientItems.push({ id: "email", label: "E-mail", meta: { value: clientEmail } });
        if (c.profession) clientItems.push({ id: "profession", label: "Profissão", meta: { value: c.profession } });
        if (c.company) clientItems.push({ id: "company", label: "Empresa", meta: { value: c.company } });
        if (c.marital_status)
          clientItems.push({
            id: "marital",
            label: "Estado civil",
            meta: { value: MARITAL_LABEL[c.marital_status as string] || c.marital_status },
          });
        if (c.dependents_count != null)
          clientItems.push({
            id: "dependents",
            label: "Dependentes",
            meta: {
              value:
                c.dependents_count +
                (c.dependents_ages ? ` (${c.dependents_ages})` : ""),
            },
          });
        if (c.city || c.state)
          clientItems.push({
            id: "location",
            label: "Localização",
            meta: { value: [c.city, c.state].filter(Boolean).join(" / ") },
          });
        if (c.date_of_birth) {
          const dob = new Date(c.date_of_birth);
          const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          clientItems.push({
            id: "age",
            label: "Idade",
            meta: { value: `${age} anos`, date_of_birth: c.date_of_birth },
          });
        }
      }

      const incomeItems: SourceItem[] = (incomeRes.data || []).map((r) => {
        const monthly = r.frequency === "anual" ? (r.amount || 0) / 12 : r.amount || 0;
        return {
          id: r.id,
          label: r.description || "Renda",
          value: monthly,
          meta: {
            frequency: r.frequency,
            original_amount: r.amount,
            is_primary: r.is_primary,
            stability: r.stability,
          },
        };
      });

      const expenseItems: SourceItem[] = (expenseRes.data || []).map((r) => ({
        id: r.id,
        label: [r.category, r.description].filter(Boolean).join(" — ") || "Despesa",
        value: r.amount || 0,
        meta: { category: r.category, is_fixed: r.is_fixed, due_day: r.due_day },
      }));

      const debtItems: SourceItem[] = (debtRes.data || []).map((r) => ({
        id: r.id,
        label: [r.type, r.creditor].filter(Boolean).join(" — ") || "Dívida",
        value: r.total_amount || 0,
        meta: {
          type: r.type,
          creditor: r.creditor,
          monthly_payment: r.monthly_payment,
          interest_rate: r.interest_rate,
          remaining_months: r.remaining_months,
        },
      }));

      const assetItems: SourceItem[] = (assetRes.data || []).map((r) => ({
        id: r.id,
        label: [r.type, r.description].filter(Boolean).join(" — ") || "Ativo",
        value: r.estimated_value || 0,
        meta: { type: r.type },
      }));

      const insuranceItems: SourceItem[] = (insuranceRes.data || []).map((r) => ({
        id: r.id,
        label: [r.type, r.provider].filter(Boolean).join(" — ") || "Seguro",
        value: r.coverage_amount || 0,
        meta: {
          type: r.type,
          provider: r.provider,
          monthly_premium: r.monthly_premium,
        },
      }));

      const goalItems: SourceItem[] = (goalRes.data || []).map((r) => ({
        id: r.id,
        label: r.description || "Objetivo",
        value: r.target_amount || 0,
        meta: { priority: r.priority, deadline: r.deadline, category: r.category },
      }));

      const sumValues = (arr: SourceItem[]) =>
        arr.reduce((acc, i) => acc + (i.value || 0), 0);

      const next: Record<SnapshotSource, SourceData> = {
        client: {
          source: "client",
          items: clientItems,
          subtitle: clientName || "Sem identificação",
        },
        income: {
          source: "income",
          items: incomeItems,
          total: sumValues(incomeItems),
          subtitle: `${incomeItems.length} ${incomeItems.length === 1 ? "fonte" : "fontes"}`,
        },
        expense: {
          source: "expense",
          items: expenseItems,
          total: sumValues(expenseItems),
          subtitle: `${expenseItems.length} ${expenseItems.length === 1 ? "item" : "itens"}`,
        },
        debt: {
          source: "debt",
          items: debtItems,
          total: sumValues(debtItems),
          subtitle: `${debtItems.length} ${debtItems.length === 1 ? "dívida" : "dívidas"}`,
        },
        asset: {
          source: "asset",
          items: assetItems,
          total: sumValues(assetItems),
          subtitle: `${assetItems.length} ${assetItems.length === 1 ? "ativo" : "ativos"}`,
        },
        insurance: {
          source: "insurance",
          items: insuranceItems,
          subtitle: `${insuranceItems.length} ${insuranceItems.length === 1 ? "seguro" : "seguros"}`,
        },
        goal: {
          source: "goal",
          items: goalItems,
          total: sumValues(goalItems),
          subtitle: `${goalItems.length} ${goalItems.length === 1 ? "objetivo" : "objetivos"}`,
        },
      };
      setData(next);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // ── Filtragem por busca ───────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    const next = {} as Record<SnapshotSource, SourceData>;
    for (const src of ALL_SOURCES) {
      const d = data[src];
      if (!d) continue;
      next[src] = {
        ...d,
        items: d.items.filter((i) =>
          (i.label + " " + JSON.stringify(i.meta || {})).toLowerCase().includes(q),
        ),
      };
    }
    return next;
  }, [data, search]);

  // ── Acoes ─────────────────────────────────────────
  const toggleVisible = (src: SnapshotSource) => {
    setVisible((prev) => {
      const next = new Set(prev);
      next.has(src) ? next.delete(src) : next.add(src);
      return next;
    });
  };

  const toggleExpanded = (src: SnapshotSource) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(src) ? next.delete(src) : next.add(src);
      return next;
    });
  };

  const insertItem = (src: SnapshotSource, item: SourceItem) => {
    const chip: SnapshotChip = {
      chipId: crypto.randomUUID(),
      source: src,
      kind: "item",
      label: item.label,
      value: item.value,
      meta: { id: item.id, ...(item.meta || {}) },
      capturedAt: new Date().toISOString(),
    };
    onInsertChip(chip);
  };

  const insertGroup = (src: SnapshotSource) => {
    const d = data[src];
    if (!d || d.items.length === 0) return;
    const cfg = SOURCE_CONFIG[src];
    const chip: SnapshotChip = {
      chipId: crypto.randomUUID(),
      source: src,
      kind: "group",
      label: cfg.pluralLabel,
      value: d.total,
      meta: {
        count: d.items.length,
        items: d.items.map((i) => ({
          id: i.id,
          label: i.label,
          value: i.value,
          meta: i.meta,
        })),
      },
      capturedAt: new Date().toISOString(),
    };
    onInsertChip(chip);
  };

  // ── Render ────────────────────────────────────────
  return (
    <Card className="border-border/40 shadow-soft rounded-2xl sticky top-16">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-accent/10 shrink-0">
            <ClipboardCheck className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-tight">
              Alinhamento Consultivo
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Clique no <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded bg-accent/15 text-accent align-middle"><Plus className="h-2.5 w-2.5" strokeWidth={3} /></span> para referenciar
              um dado do onboarding no parecer. A IA usará isso como contexto.
            </p>
          </div>
        </div>

        {/* Chips toggle das fontes */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_SOURCES.map((src) => {
            const isOn = visible.has(src);
            const cfg = SOURCE_CONFIG[src];
            return (
              <button
                key={src}
                onClick={() => toggleVisible(src)}
                className={cn(
                  "inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-medium border transition-colors",
                  isOn
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <span className="text-[11px]">{cfg.emoji}</span>
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar item..."
            className="h-8 pl-7 text-xs"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {loading && (
          <p className="text-xs text-muted-foreground animate-pulse py-4 text-center">
            Carregando dados do onboarding...
          </p>
        )}

        {!loading &&
          ALL_SOURCES.filter((src) => visible.has(src)).map((src) => {
            const d = filtered[src];
            if (!d) return null;
            const cfg = SOURCE_CONFIG[src];
            const Icon = ICONS[src];
            const tone = TONE[src];
            const isOpen = expanded.has(src);
            const hasItems = d.items.length > 0;
            const canGroupInsert = hasItems && src !== "client";

            return (
              <div
                key={src}
                className={cn(
                  "rounded-xl border transition-colors",
                  hasItems ? "border-border/50 bg-card" : "border-border/30 bg-muted/15",
                )}
              >
                {/* Header da categoria */}
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <button
                    onClick={() => toggleExpanded(src)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left group/header"
                    disabled={!hasItems}
                  >
                    <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center border", tone)}>
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[12.5px] font-semibold text-foreground">
                          {cfg.pluralLabel}
                        </span>
                        {d.total != null && d.total > 0 && (
                          <span className="text-[10.5px] font-semibold text-foreground/80 tabular-nums">
                            {fmtBRL(d.total)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/80 truncate block">
                        {d.subtitle || "Sem dados"}
                      </span>
                    </div>
                    {hasItems && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground/50 transition-transform shrink-0",
                          isOpen && "rotate-180",
                        )}
                      />
                    )}
                  </button>
                  {canGroupInsert && (
                    <button
                      onClick={() => insertGroup(src)}
                      title={`Inserir todos os ${cfg.pluralLabel.toLowerCase()} como bloco no parecer`}
                      className="h-7 w-7 rounded-lg flex items-center justify-center bg-accent/10 hover:bg-accent/20 text-accent transition-colors shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  )}
                </div>

                {/* Lista de itens */}
                {isOpen && hasItems && (
                  <div className="border-t border-border/30 px-2 py-1.5 space-y-1">
                    {d.items.map((item) => {
                      const display =
                        item.value != null && item.value > 0
                          ? fmtBRL(item.value)
                          : (item.meta?.value as string) || "";
                      return (
                        <div
                          key={item.id}
                          className="group/item flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[11.5px] text-foreground font-medium truncate leading-tight">
                              {item.label}
                            </p>
                            {display && (
                              <p className="text-[10.5px] text-muted-foreground tabular-nums leading-tight mt-0.5">
                                {display}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => insertItem(src, item)}
                            title="Inserir no parecer"
                            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:bg-accent/15 hover:text-accent transition-colors opacity-0 group-hover/item:opacity-100 focus:opacity-100 shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
};
