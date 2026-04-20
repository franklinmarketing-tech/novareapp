import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useFocusOnAdd } from "@/hooks/useFocusOnAdd";

export interface IncomeItem {
  id?: string;
  description: string;
  amount: string;
  frequency: string;
  is_primary: boolean;
  stability: string;
}

const emptyIncome = (): IncomeItem => ({
  id: crypto.randomUUID(), description: "", amount: "", frequency: "mensal", is_primary: false, stability: "media",
});

interface Props {
  data: IncomeItem[];
  onChange: (data: IncomeItem[]) => void;
}

export const StepRenda = ({ data, onChange }: Props) => {
  const items = data.length > 0 ? data : [emptyIncome()];

  const update = (index: number, field: keyof IncomeItem, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  // Insere a nova renda logo após a Principal (índice 0), no topo da lista de adicionais
  const add = () => {
    if (items.length === 0) return onChange([emptyIncome()]);
    const [first, ...rest] = items;
    onChange([first, emptyIncome(), ...rest]);
  };
  const remove = (i: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, idx) => idx !== i));
  };

  const primaryIndex = items.findIndex((r) => r.is_primary);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="font-display text-[1.75rem] md:text-[2rem] font-semibold text-foreground tracking-[-0.03em] leading-[1.15]">Fontes de renda</h2>
        <p className="font-body text-muted-foreground text-[0.9375rem] leading-relaxed tracking-[-0.01em]">
          Informe a renda mensal principal (líquida) e rendas adicionais
        </p>
      </div>

      {/* Add button at top — always visible */}
      <button
        type="button"
        onClick={add}
        className="w-full h-16 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-accent/40 hover:text-accent hover:bg-accent/[0.03] transition-all duration-200 text-base font-semibold font-body flex items-center justify-center gap-3"
      >
        <Plus className="h-6 w-6" /> Adicionar renda adicional
      </button>

      <div className="space-y-3">
        {items.map((item, i) => {
          const isPrimary = item.is_primary || (primaryIndex === -1 && i === 0);
          return (
            <div
              key={item.id ?? i}
              className={`p-5 rounded-2xl border space-y-4 transition-all duration-200 shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] ${isPrimary ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-card hover:border-border/80"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">
                  {isPrimary ? "Renda Principal (líquida)" : `Renda Adicional ${i}`}
                </span>
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive/60 hover:text-destructive h-7 w-7">
                    <Trash2 className="h-6 w-6" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="font-body text-muted-foreground text-[0.8125rem]">Descrição</Label>
                  <Input value={item.description} onChange={(e) => update(i, "description", e.target.value)} placeholder={isPrimary ? "Ex: Salário CLT (líquido)" : "Ex: Aluguel, Comissão"} className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-muted-foreground text-[0.8125rem]">Valor</Label>
                  <CurrencyInput value={item.amount} onChange={(v) => update(i, "amount", v)} className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-muted-foreground text-[0.8125rem]">Frequência</Label>
                  <SelectWithCustom
                    value={item.frequency}
                    onValueChange={(v) => update(i, "frequency", v)}
                    options={[
                      { value: "mensal", label: "Mensal" },
                      { value: "anual", label: "Anual" },
                      { value: "eventual", label: "Eventual" },
                    ]}
                    inputPlaceholder="Ex: Trimestral, Semestral..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-muted-foreground text-[0.8125rem]">Estabilidade</Label>
                  <SelectWithCustom
                    value={item.stability}
                    onValueChange={(v) => update(i, "stability", v)}
                    options={[
                      { value: "alta", label: "Alta" },
                      { value: "media", label: "Média" },
                      { value: "baixa", label: "Baixa" },
                    ]}
                    inputPlaceholder="Ex: Variável por comissão"
                  />
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <Checkbox
                    checked={item.is_primary}
                    onCheckedChange={(v) => {
                      const next = items.map((it, idx) => ({ ...it, is_primary: idx === i ? !!v : false }));
                      onChange(next);
                    }}
                  />
                  <Label className="cursor-pointer text-sm font-body text-muted-foreground">Renda principal</Label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
