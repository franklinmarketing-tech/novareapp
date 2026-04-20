import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

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

  const update = (index: number, field: keyof GoalItem, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const add = () => onChange([...items, emptyGoal()]);
  const remove = (i: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="font-display text-[1.75rem] md:text-[2rem] font-semibold text-foreground tracking-[-0.03em] leading-[1.15]">Objetivos</h2>
        <p className="font-body text-muted-foreground text-[0.9375rem] leading-relaxed tracking-[-0.01em]">Suas metas e objetivos financeiros</p>
      </div>

      <button type="button" onClick={add} className="w-full h-16 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/[0.03] transition-all duration-200 text-base font-semibold font-body flex items-center justify-center gap-3">
        <Plus className="h-6 w-6" /> Adicionar objetivo
      </button>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id ?? i} className="p-5 rounded-2xl border border-border bg-card space-y-4 hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] hover:border-border/80 transition-all duration-200 shadow-[0_1px_4px_0_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">Objetivo {i + 1}</span>
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive/60 hover:text-destructive h-7 w-7">
                  <Trash2 className="h-6 w-6" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Descrição</Label>
                <Input value={item.description} onChange={(e) => update(i, "description", e.target.value)} placeholder="Ex: Reserva de emergência" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Valor alvo</Label>
                <CurrencyInput value={item.target_amount} onChange={(v) => update(i, "target_amount", v)} className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Prazo</Label>
                <Input type="date" value={item.deadline} onChange={(e) => update(i, "deadline", e.target.value)} className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-muted-foreground text-[0.8125rem]">Prioridade</Label>
                <Select value={item.priority} onValueChange={(v) => update(i, "priority", v)}>
                  <SelectTrigger className="border-border bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
