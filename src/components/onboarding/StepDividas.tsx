import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useFocusOnAdd } from "@/hooks/useFocusOnAdd";

export interface DebtItem {
  id?: string;
  type: string;
  creditor: string;
  total_amount: string;
  monthly_payment: string;
  interest_rate: string;
  remaining_months: string;
}

const emptyDebt = (): DebtItem => ({
  id: crypto.randomUUID(), type: "", creditor: "", total_amount: "", monthly_payment: "", interest_rate: "", remaining_months: "",
});

interface Props {
  data: DebtItem[];
  onChange: (data: DebtItem[]) => void;
}

export const StepDividas = ({ data, onChange }: Props) => {
  const items = data.length > 0 ? data : [emptyDebt()];
  const [focusId, setFocusId] = useState<string | null>(null);
  useFocusOnAdd(focusId, () => setFocusId(null));

  const update = (index: number, field: keyof DebtItem, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const add = () => {
    const novo = emptyDebt();
    onChange([novo, ...items]);
    setFocusId(novo.id!);
  };
  const remove = (i: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="font-display font-semibold text-foreground tracking-[-0.025em] text-[clamp(1.5rem,1.25rem+1vw,2rem)] leading-[1.2]">Dívidas</h2>
        <p className="font-body text-muted-foreground/85 text-[0.9375rem] leading-[1.55] tracking-[-0.01em]">Empréstimos, financiamentos e parcelamentos</p>
      </div>

      <button type="button" onClick={add} className="w-full h-14 rounded-2xl border-2 border-dashed border-border/70 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/[0.03] transition-all duration-200 text-[0.9375rem] font-medium font-body flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Adicionar dívida
      </button>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id ?? i} data-item-id={item.id} className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 shadow-soft hover:shadow-elevated hover:border-border transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">Dívida {i + 1}</span>
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive/60 hover:text-destructive hover:bg-destructive/8 h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Input value={item.type} onChange={(e) => update(i, "type", e.target.value)} placeholder="Ex: Financiamento imobiliário" />
              </div>
              <div className="space-y-1.5">
                <Label>Credor</Label>
                <Input value={item.creditor} onChange={(e) => update(i, "creditor", e.target.value)} placeholder="Ex: Banco do Brasil" />
              </div>
              <div className="space-y-1.5">
                <Label>Valor total</Label>
                <CurrencyInput value={item.total_amount} onChange={(v) => update(i, "total_amount", v)} />
              </div>
              <div className="space-y-1.5">
                <Label>Parcela mensal</Label>
                <CurrencyInput value={item.monthly_payment} onChange={(v) => update(i, "monthly_payment", v)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prazo restante (meses)</Label>
                <Input type="number" value={item.remaining_months} onChange={(e) => update(i, "remaining_months", e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
