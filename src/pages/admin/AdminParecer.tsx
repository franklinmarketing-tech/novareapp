import { useEffect, useState } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { NoteEditor } from "@/components/parecer/NoteEditor";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, TrendingDown, CreditCard, Landmark } from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface SelectableItem {
  id: string;
  type: "despesa" | "divida" | "ativo";
  label: string;
  currentValue: number;
  metaValue: string;
  selected: boolean;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const calcReduction = (current: number, meta: number) => {
  if (!current || !meta || meta >= current) return null;
  return ((current - meta) / current) * 100;
};

// ── Component ──────────────────────────────────────────

const AdminParecer = () => {
  const { clientId } = useClientId();
  const [items, setItems] = useState<SelectableItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: expenses }, { data: debts }, { data: assets }] = await Promise.all([
        supabase.from("expenses").select("id, description, amount").eq("client_id", clientId),
        supabase.from("debts").select("id, description, total_amount").eq("client_id", clientId),
        supabase.from("assets").select("id, description, current_value").eq("client_id", clientId),
      ]);

      const built: SelectableItem[] = [
        ...(expenses || []).map((e) => ({
          id: `exp-${e.id}`,
          type: "despesa" as const,
          label: e.description,
          currentValue: e.amount,
          metaValue: "",
          selected: false,
        })),
        ...(debts || []).map((d) => ({
          id: `dbt-${d.id}`,
          type: "divida" as const,
          label: d.description,
          currentValue: d.total_amount,
          metaValue: "",
          selected: false,
        })),
        ...(assets || []).map((a) => ({
          id: `ast-${a.id}`,
          type: "ativo" as const,
          label: a.description,
          currentValue: a.current_value,
          metaValue: "",
          selected: false,
        })),
      ];
      setItems(built);
      setLoading(false);
    };
    load();
  }, [clientId]);

  const toggle = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));

  const setMeta = (id: string, val: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, metaValue: val } : i)));

  const selectedItems = items.filter((i) => i.selected);
  const totalReducao = selectedItems.reduce((acc, i) => {
    const meta = parseFloat(i.metaValue.replace(/\D/g, "")) || 0;
    const red = calcReduction(i.currentValue, meta);
    return red !== null ? acc + (i.currentValue - meta) : acc;
  }, 0);

  const typeConfig = {
    despesa: { label: "Despesa", color: "bg-red-500/10 text-red-700 border-red-200", icon: TrendingDown },
    divida: { label: "Dívida", color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: CreditCard },
    ativo: { label: "Ativo", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: Landmark },
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* ── Painel de Seleção de Itens ────────────── */}
      <div className="xl:col-span-1">
        <Card className="border-border/40 shadow-soft rounded-2xl sticky top-16">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <ClipboardCheck className="h-5 w-5 text-accent" />
              </div>
              Alinhamento Consultivo
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Selecione os itens que serão foco de ajuste e defina as metas.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-xs text-muted-foreground animate-pulse">Carregando dados...</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum dado de onboarding encontrado.</p>
            ) : (
              <>
                {(["despesa", "divida", "ativo"] as const).map((type) => {
                  const group = items.filter((i) => i.type === type);
                  if (!group.length) return null;
                  const cfg = typeConfig[type];
                  const Icon = cfg.icon;
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {cfg.label}s
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.map((item) => {
                          const meta = parseFloat(item.metaValue.replace(/\D/g, "")) || 0;
                          const pct = calcReduction(item.currentValue, meta);
                          return (
                            <div
                              key={item.id}
                              className={`rounded-xl border p-3 transition-colors ${
                                item.selected ? "border-accent/40 bg-accent/5" : "border-border/40 bg-muted/20"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  id={item.id}
                                  checked={item.selected}
                                  onCheckedChange={() => toggle(item.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <label
                                    htmlFor={item.id}
                                    className="text-xs font-medium text-foreground cursor-pointer truncate block"
                                  >
                                    {item.label}
                                  </label>
                                  <span className="text-[11px] text-muted-foreground">
                                    Atual: {fmt(item.currentValue)}
                                  </span>
                                </div>
                              </div>

                              {item.selected && (
                                <div className="mt-2 pl-6">
                                  <Input
                                    placeholder="Meta (R$)"
                                    value={item.metaValue}
                                    onChange={(e) => setMeta(item.id, e.target.value)}
                                    className="h-7 text-xs"
                                  />
                                  {pct !== null && (
                                    <p className="text-[11px] mt-1 text-emerald-600 font-semibold">
                                      ↓ {pct.toFixed(1)}% de redução
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Consolidação */}
                {selectedItems.length > 0 && (
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 mt-2">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                      Consolidação
                    </p>
                    <div className="space-y-1">
                      {selectedItems.map((i) => {
                        const meta = parseFloat(i.metaValue.replace(/\D/g, "")) || 0;
                        const pct = calcReduction(i.currentValue, meta);
                        return (
                          <div key={i.id} className="flex justify-between text-xs">
                            <span className="truncate text-muted-foreground max-w-[130px]">{i.label}</span>
                            <span className="font-medium text-foreground shrink-0">
                              {pct !== null ? `↓ ${pct.toFixed(1)}%` : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {totalReducao > 0 && (
                      <div className="mt-2 pt-2 border-t border-accent/20 flex justify-between text-xs font-bold">
                        <span>Redução total mensal</span>
                        <span className="text-emerald-600">{fmt(totalReducao)}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Editor de Parecer ─────────────────────── */}
      <div className="xl:col-span-2">
        <NoteEditor clientId={clientId} />
      </div>
    </div>
  );
};

export default AdminParecer;
