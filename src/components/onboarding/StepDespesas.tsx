import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const DEFAULT_CATEGORIES = [
  { key: "moradia", label: "Moradia", hint: "Aluguel, condomínio, IPTU, água, luz, gás, internet" },
  { key: "educacao", label: "Educação", hint: "Escola, faculdade, cursos, material" },
  { key: "saude", label: "Saúde", hint: "Plano de saúde, medicamentos, consultas" },
  { key: "transporte", label: "Transporte", hint: "Combustível, IPVA, seguro auto, transporte público" },
  { key: "alimentacao", label: "Alimentação", hint: "Supermercado, restaurantes, delivery" },
  { key: "lazer", label: "Lazer", hint: "Viagens, entretenimento, streaming, hobbies" },
  { key: "vestuario", label: "Vestuário", hint: "Roupas, calçados, acessórios" },
  { key: "outros", label: "Outros", hint: "Demais despesas fixas não categorizadas" },
];

const DEFAULT_KEYS = new Set(DEFAULT_CATEGORIES.map((c) => c.key));

export interface ExpenseItem {
  id?: string;
  category: string;
  amount: string;
  description: string;
}

interface Props {
  data: ExpenseItem[];
  onChange: (data: ExpenseItem[]) => void;
}

export const StepDespesas = ({ data, onChange }: Props) => {
  // Build items: default categories + any custom ones from data
  const defaultItems: ExpenseItem[] = DEFAULT_CATEGORIES.map((cat) => {
    const existing = data.find((d) => d.category === cat.key);
    return existing || { category: cat.key, amount: "", description: "" };
  });
  const customItems = data.filter((d) => !DEFAULT_KEYS.has(d.category));

  const allItems = [...defaultItems, ...customItems];
  const totalValue = allItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const update = (category: string, field: "amount" | "description" | "category", value: string) => {
    const next = allItems.map((item) =>
      item.category === category ? { ...item, [field]: value } : item
    );
    onChange(next);
  };

  const updateCustom = (index: number, field: "amount" | "description" | "category", value: string) => {
    const customIdx = index - DEFAULT_CATEGORIES.length;
    const nextCustom = [...customItems];
    nextCustom[customIdx] = { ...nextCustom[customIdx], [field]: value };
    onChange([...defaultItems, ...nextCustom]);
  };

  const addCustom = () => {
    const newItem: ExpenseItem = { category: `custom_${Date.now()}`, amount: "", description: "" };
    onChange([...allItems, newItem]);
  };

  const removeCustom = (index: number) => {
    const customIdx = index - DEFAULT_CATEGORIES.length;
    const nextCustom = customItems.filter((_, i) => i !== customIdx);
    onChange([...defaultItems, ...nextCustom]);
  };

  const getPercentage = (amount: string) => {
    const val = parseFloat(amount) || 0;
    if (totalValue === 0) return 0;
    return Math.round((val / totalValue) * 100);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="font-display text-[1.75rem] md:text-[2rem] font-semibold text-foreground tracking-[-0.03em] leading-[1.15]">Despesas fixas mensais</h2>
        <p className="font-body text-muted-foreground text-[0.9375rem] leading-relaxed tracking-[-0.01em]">
          Valor mensal por categoria — o percentual será exibido no diagnóstico
        </p>
      </div>

      <button
        type="button"
        onClick={addCustom}
        className="w-full h-16 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-accent/40 hover:text-accent hover:bg-accent/[0.03] transition-all duration-200 text-base font-semibold font-body flex items-center justify-center gap-3"
      >
        <Plus className="h-6 w-6" /> Adicionar despesa personalizada
      </button>

      {totalValue > 0 && (
        <div className="p-5 rounded-2xl border border-border bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">Distribuição</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted/50 gap-px">
            {allItems.map((item) => {
              const pct = getPercentage(item.amount);
              if (pct === 0) return null;
              return (
                <div key={item.category} className="h-full bg-primary/70 first:rounded-l-full last:rounded-r-full transition-all duration-300" style={{ width: `${pct}%` }} />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
            {allItems.map((item) => {
              const pct = getPercentage(item.amount);
              if (pct === 0) return null;
              const catInfo = DEFAULT_CATEGORIES.find((c) => c.key === item.category);
              const label = catInfo?.label || item.description || item.category;
              return <span key={item.category} className="font-body text-xs text-muted-foreground">{label} <span className="font-medium text-foreground/70">{pct}%</span></span>;
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEFAULT_CATEGORIES.map((cat) => {
          const item = defaultItems.find((i) => i.category === cat.key)!;
          const pct = getPercentage(item.amount);
          return (
            <div key={cat.key} className="p-4 rounded-2xl border border-border bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] hover:border-border/80 transition-all duration-200">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-foreground">{cat.label}</span>
                  <span className="font-body text-xs text-muted-foreground ml-2">{cat.hint}</span>
                </div>
                {pct > 0 && <span className="text-xs font-semibold text-primary tabular-nums">{pct}%</span>}
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="font-body text-muted-foreground text-[0.8125rem]">Valor (R$)</Label>
                  <Input type="number" value={item.amount} onChange={(e) => update(cat.key, "amount", e.target.value)} placeholder="0,00" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-1">
                  <Label className="font-body text-muted-foreground text-[0.8125rem]">Observação</Label>
                  <Input value={item.description} onChange={(e) => update(cat.key, "description", e.target.value)} placeholder="Opcional" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
                </div>
              </div>
            </div>
          );
        })}

        {/* Custom expense cards */}
        {customItems.map((item, ci) => {
          const globalIdx = DEFAULT_CATEGORIES.length + ci;
          const pct = getPercentage(item.amount);
          return (
            <div key={item.category} className="p-4 rounded-2xl border border-accent/30 bg-accent/[0.02] shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-accent">Despesa personalizada</span>
                <div className="flex items-center gap-2">
                  {pct > 0 && <span className="text-xs font-semibold text-accent tabular-nums">{pct}%</span>}
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCustom(globalIdx)} className="text-destructive/60 hover:text-destructive h-7 w-7">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="font-body text-muted-foreground text-[0.8125rem]">Nome da despesa</Label>
                  <Input value={item.description} onChange={(e) => updateCustom(globalIdx, "description", e.target.value)} placeholder="Ex: Pensão, Doações, Assinaturas" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-1">
                  <Label className="font-body text-muted-foreground text-[0.8125rem]">Valor (R$)</Label>
                  <Input type="number" value={item.amount} onChange={(e) => updateCustom(globalIdx, "amount", e.target.value)} placeholder="0,00" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
