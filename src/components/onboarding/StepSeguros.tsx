import { useState } from "react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useFocusOnAdd } from "@/hooks/useFocusOnAdd";
import { mergeCustomOptions } from "@/lib/customOptions";

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
  const typeOptions = mergeCustomOptions([
    { value: "Vida", label: "Vida" },
    { value: "Auto", label: "Auto" },
    { value: "Residencial", label: "Residencial" },
    { value: "Saúde", label: "Saúde" },
    { value: "Invalidez", label: "Invalidez" },
    { value: "Viagem", label: "Viagem" },
    { value: "Empresarial", label: "Empresarial" },
  ], items.map((item) => item.type));
  const providerOptions = mergeCustomOptions([
    { value: "Porto Seguro", label: "Porto Seguro" },
    { value: "Bradesco Seguros", label: "Bradesco Seguros" },
    { value: "SulAmérica", label: "SulAmérica" },
    { value: "Allianz", label: "Allianz" },
    { value: "Mapfre", label: "Mapfre" },
    { value: "Tokio Marine", label: "Tokio Marine" },
    { value: "Liberty", label: "Liberty" },
    { value: "HDI", label: "HDI" },
  ], items.map((item) => item.provider));

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
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display font-semibold text-foreground tracking-[-0.025em] text-[clamp(1.375rem,1.15rem+0.9vw,1.75rem)] leading-[1.2]">Seguros</h2>
        <p className="font-body text-muted-foreground/85 text-[0.875rem] leading-[1.5] tracking-[-0.01em]">Seguros que você possui atualmente</p>
      </div>

      <button type="button" onClick={add} className="w-full h-14 rounded-2xl border-2 border-dashed border-border/70 text-muted-foreground hover:border-accent/50 hover:text-accent hover:bg-accent/[0.03] transition-all duration-200 text-[0.9375rem] font-medium font-body flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Adicionar seguro
      </button>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id ?? i} data-item-id={item.id} className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 shadow-soft hover:shadow-elevated hover:border-border transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">Seguro {i + 1}</span>
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive/60 hover:text-destructive hover:bg-destructive/8 h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <SelectWithCustom
                  value={item.type}
                  onValueChange={(v) => update(i, "type", v)}
                  options={typeOptions}
                  inputPlaceholder="Ex: Pet, Equipamentos..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Seguradora</Label>
                <SelectWithCustom
                  value={item.provider}
                  onValueChange={(v) => update(i, "provider", v)}
                  options={providerOptions}
                  inputPlaceholder="Ex: Azos, Youse..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prêmio mensal</Label>
                <CurrencyInput value={item.monthly_premium} onChange={(v) => update(i, "monthly_premium", v)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cobertura</Label>
                <CurrencyInput value={item.coverage_amount} onChange={(v) => update(i, "coverage_amount", v)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
