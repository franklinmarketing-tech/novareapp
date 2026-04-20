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
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="font-display text-[1.75rem] md:text-[2rem] font-semibold text-foreground tracking-[-0.03em] leading-[1.15]">Dívidas</h2>
        <p className="font-body text-muted-foreground text-[0.9375rem] leading-relaxed tracking-[-0.01em]">Empréstimos, financiamentos e parcelamentos</p>
      </div>

      <button type="button" onClick={add} className="w-full h-16 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/[0.03] transition-all duration-200 text-base font-semibold font-body flex items-center justify-center gap-3">
        <Plus className="h-6 w-6" /> Adicionar dívida
      </button>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id ?? i} data-item-id={item.id} className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] hover:border-border/80 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">Dívida {i + 1}</span>
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive/60 hover:text-destructive h-7 w-7">
                  <Trash2 className="h-6 w-6" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Tipo</Label>
                <Input value={item.type} onChange={(e) => update(i, "type", e.target.value)} placeholder="Ex: Financiamento imobiliário" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Credor</Label>
                <Input value={item.creditor} onChange={(e) => update(i, "creditor", e.target.value)} placeholder="Ex: Banco do Brasil" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Valor total</Label>
                <CurrencyInput value={item.total_amount} onChange={(v) => update(i, "total_amount", v)} className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Parcela mensal</Label>
                <CurrencyInput value={item.monthly_payment} onChange={(v) => update(i, "monthly_payment", v)} className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Prazo restante (meses)</Label>
                <Input type="number" value={item.remaining_months} onChange={(e) => update(i, "remaining_months", e.target.value)} placeholder="0" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
