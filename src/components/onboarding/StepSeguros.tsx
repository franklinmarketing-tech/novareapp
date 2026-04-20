import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useFocusOnAdd } from "@/hooks/useFocusOnAdd";

export interface InsuranceItem {
  id?: string;
  type: string;
  provider: string;
  monthly_premium: string;
  coverage_amount: string;
}

const emptyInsurance = (): InsuranceItem => ({ id: crypto.randomUUID(), type: "", provider: "", monthly_premium: "", coverage_amount: "" });

interface Props {
  data: InsuranceItem[];
  onChange: (data: InsuranceItem[]) => void;
}

export const StepSeguros = ({ data, onChange }: Props) => {
  const items = data.length > 0 ? data : [emptyInsurance()];
  const [focusId, setFocusId] = useState<string | null>(null);
  useFocusOnAdd(focusId, () => setFocusId(null));

  const update = (index: number, field: keyof InsuranceItem, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const add = () => {
    const novo = emptyInsurance();
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
        <h2 className="font-display text-[1.75rem] md:text-[2rem] font-semibold text-foreground tracking-[-0.03em] leading-[1.15]">Seguros</h2>
        <p className="font-body text-muted-foreground text-[0.9375rem] leading-relaxed tracking-[-0.01em]">Seguros que você possui atualmente</p>
      </div>

      <button type="button" onClick={add} className="w-full h-16 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-accent/40 hover:text-accent hover:bg-accent/[0.03] transition-all duration-200 text-base font-semibold font-body flex items-center justify-center gap-3">
        <Plus className="h-6 w-6" /> Adicionar seguro
      </button>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id ?? i} className="p-5 rounded-2xl border border-border bg-card space-y-4 hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] hover:border-border/80 transition-all duration-200 shadow-[0_1px_4px_0_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">Seguro {i + 1}</span>
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive/60 hover:text-destructive h-7 w-7">
                  <Trash2 className="h-6 w-6" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Tipo</Label>
                <Input value={item.type} onChange={(e) => update(i, "type", e.target.value)} placeholder="Ex: Vida, Auto, Residencial" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Seguradora</Label>
                <Input value={item.provider} onChange={(e) => update(i, "provider", e.target.value)} placeholder="Ex: Porto Seguro" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Prêmio mensal</Label>
                <CurrencyInput value={item.monthly_premium} onChange={(v) => update(i, "monthly_premium", v)} className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Cobertura</Label>
                <CurrencyInput value={item.coverage_amount} onChange={(v) => update(i, "coverage_amount", v)} className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
