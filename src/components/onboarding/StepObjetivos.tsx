import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useFocusOnAdd } from "@/hooks/useFocusOnAdd";

export interface GoalItem {
  id?: string;
  description: string;
  target_amount: string;
  deadline: string;
  priority: string;
}

const emptyGoal = (): GoalItem => ({ id: crypto.randomUUID(), description: "", target_amount: "", deadline: "", priority: "media" });

interface Props {
  data: GoalItem[];
  onChange: (data: GoalItem[]) => void;
}

export const StepObjetivos = ({ data, onChange }: Props) => {
  const items = data.length > 0 ? data : [emptyGoal()];
  const [focusId, setFocusId] = useState<string | null>(null);
  useFocusOnAdd(focusId, () => setFocusId(null));

  const update = (index: number, field: keyof GoalItem, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const add = () => {
    const novo = emptyGoal();
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
        <h2 className="font-display font-semibold text-foreground tracking-[-0.025em] text-[clamp(1.375rem,1.15rem+0.9vw,1.75rem)] leading-[1.2]">Objetivos</h2>
        <p className="font-body text-muted-foreground/85 text-[0.875rem] leading-[1.5] tracking-[-0.01em]">Suas metas e objetivos financeiros</p>
      </div>

      <button type="button" onClick={add} className="w-full h-14 rounded-2xl border-2 border-dashed border-border/70 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/[0.03] transition-all duration-200 text-[0.9375rem] font-medium font-body flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Adicionar objetivo
      </button>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id ?? i} data-item-id={item.id} className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 shadow-soft hover:shadow-elevated hover:border-border transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">Objetivo {i + 1}</span>
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive/60 hover:text-destructive hover:bg-destructive/8 h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label>Descrição</Label>
                <SelectWithCustom
                  value={item.description}
                  onValueChange={(v) => update(i, "description", v)}
                  options={[
                    { value: "Reserva de emergência", label: "Reserva de emergência" },
                    { value: "Aposentadoria", label: "Aposentadoria" },
                    { value: "Comprar imóvel", label: "Comprar imóvel" },
                    { value: "Comprar veículo", label: "Comprar veículo" },
                    { value: "Educação dos filhos", label: "Educação dos filhos" },
                    { value: "Viagem", label: "Viagem" },
                    { value: "Quitar dívidas", label: "Quitar dívidas" },
                    { value: "Investir / multiplicar patrimônio", label: "Investir / multiplicar patrimônio" },
                    { value: "Abrir negócio próprio", label: "Abrir negócio próprio" },
                  ]}
                  inputPlaceholder="Ex: Casamento, Intercâmbio..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor alvo</Label>
                <CurrencyInput value={item.target_amount} onChange={(v) => update(i, "target_amount", v)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prazo</Label>
                <Input type="date" value={item.deadline} onChange={(e) => update(i, "deadline", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <SelectWithCustom
                  value={item.priority}
                  onValueChange={(v) => update(i, "priority", v)}
                  options={[
                    { value: "alta", label: "Alta" },
                    { value: "media", label: "Média" },
                    { value: "baixa", label: "Baixa" },
                  ]}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
