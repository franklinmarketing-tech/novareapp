import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useFocusOnAdd } from "@/hooks/useFocusOnAdd";
import { mergeCustomOptions } from "@/lib/customOptions";

const cleanValue = (value?: string) => value?.replace(/^custom:/, "").trim() || "";
const formatMoney = (value?: string) => {
  const amount = parseFloat(value || "");
  return amount > 0 ? `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sem valor";
};

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
  const descriptionOptions = mergeCustomOptions([
    { value: "Reserva de emergência", label: "Reserva de emergência" },
    { value: "Aposentadoria", label: "Aposentadoria" },
    { value: "Comprar imóvel", label: "Comprar imóvel" },
    { value: "Comprar veículo", label: "Comprar veículo" },
    { value: "Educação dos filhos", label: "Educação dos filhos" },
    { value: "Viagem", label: "Viagem" },
    { value: "Quitar dívidas", label: "Quitar dívidas" },
    { value: "Investir / multiplicar patrimônio", label: "Investir / multiplicar patrimônio" },
    { value: "Abrir negócio próprio", label: "Abrir negócio próprio" },
  ], items.map((item) => item.description));
  const priorityOptions = mergeCustomOptions([
    { value: "alta", label: "Alta" },
    { value: "media", label: "Média" },
    { value: "baixa", label: "Baixa" },
  ], items.map((item) => item.priority));

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
    const item = items[i];
    const hasData = Object.values(item).some((value) => cleanValue(String(value)).length > 0);
    if (hasData && !window.confirm("Excluir este objetivo?")) return;
    onChange(items.length <= 1 ? [] : items.filter((_, idx) => idx !== i));
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">Objetivo {i + 1}</span>
                <p className="mt-1 truncate text-[0.9375rem] font-semibold text-foreground">{cleanValue(item.description) || "Novo objetivo"}</p>
                <p className="text-xs font-medium text-muted-foreground">{formatMoney(item.target_amount)} · Prioridade {cleanValue(item.priority) || "média"}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => remove(i)} className="shrink-0 gap-1 text-destructive hover:text-destructive hover:bg-destructive/8">
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label>Descrição</Label>
                <SelectWithCustom
                  value={item.description}
                  onValueChange={(v) => update(i, "description", v)}
                  options={descriptionOptions}
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
                  options={priorityOptions}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
