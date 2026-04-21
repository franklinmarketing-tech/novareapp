import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useFocusOnAdd } from "@/hooks/useFocusOnAdd";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAddSheet } from "./MobileAddSheet";

const CATEGORY_OPTIONS = [
  { value: "moradia", label: "Moradia (aluguel, condomínio, IPTU, contas)" },
  { value: "educacao", label: "Educação (escola, faculdade, cursos)" },
  { value: "saude", label: "Saúde (plano, medicamentos, consultas)" },
  { value: "transporte", label: "Transporte (combustível, IPVA, seguro)" },
  { value: "alimentacao", label: "Alimentação (mercado, restaurantes)" },
  { value: "lazer", label: "Lazer (viagens, streaming, hobbies)" },
  { value: "vestuario", label: "Vestuário (roupas, calçados)" },
  { value: "pensao", label: "Pensão alimentícia" },
  { value: "doacoes", label: "Doações / Dízimo" },
  { value: "assinaturas", label: "Assinaturas digitais" },
  { value: "academia", label: "Academia" },
  { value: "pet", label: "Pet (ração, vet)" },
  { value: "empregada", label: "Empregada / Diarista" },
  { value: "cuidador", label: "Cuidador / Babá" },
  { value: "terapia", label: "Terapia" },
  { value: "cursos", label: "Cursos extras" },
  { value: "outros", label: "Outros" },
];

const MOBILE_CHIPS = [
  { value: "moradia", label: "Moradia", emoji: "🏠" },
  { value: "alimentacao", label: "Alimentação", emoji: "🛒" },
  { value: "transporte", label: "Transporte", emoji: "🚗" },
  { value: "saude", label: "Saúde", emoji: "💊" },
  { value: "educacao", label: "Educação", emoji: "📚" },
  { value: "lazer", label: "Lazer", emoji: "🎬" },
  { value: "assinaturas", label: "Assinaturas", emoji: "📱" },
  { value: "pet", label: "Pet", emoji: "🐾" },
  { value: "academia", label: "Academia", emoji: "🏋️" },
  { value: "vestuario", label: "Vestuário", emoji: "👕" },
];

export interface ExpenseItem {
  id?: string;
  category: string;
  amount: string;
  description: string;
}

const emptyExpense = (): ExpenseItem => ({
  id: crypto.randomUUID(),
  category: "",
  amount: "",
  description: "",
});

interface Props {
  data: ExpenseItem[];
  onChange: (data: ExpenseItem[]) => void;
}

export const StepDespesas = ({ data, onChange }: Props) => {
  const items = data.length > 0 ? data : [emptyExpense()];
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  useFocusOnAdd(focusId, () => setFocusId(null));

  const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const update = (index: number, field: keyof ExpenseItem, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const add = () => {
    if (isMobile) {
      setSheetOpen(true);
      return;
    }
    const novo = emptyExpense();
    onChange([novo, ...items]);
    setFocusId(novo.id!);
  };

  const handleSheetConfirm = ({ category, amount, note }: { category: string; amount: string; note: string }) => {
    const novo: ExpenseItem = { ...emptyExpense(), category, amount, description: note };
    onChange([novo, ...items.filter((i) => i.amount || i.category)]);
  };

  const remove = (i: number) => {
    if (items.length <= 1) {
      onChange([emptyExpense()]);
      return;
    }
    onChange(items.filter((_, idx) => idx !== i));
  };

  const getPercentage = (amount: string) => {
    const val = parseFloat(amount) || 0;
    if (totalValue === 0) return 0;
    return Math.round((val / totalValue) * 100);
  };

  const getCategoryLabel = (category: string) => {
    if (!category) return "";
    if (category.startsWith("custom:")) return category.slice(7);
    const opt = CATEGORY_OPTIONS.find((o) => o.value === category);
    return opt?.label || category;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="font-display font-semibold text-foreground tracking-[-0.025em] text-[clamp(1.5rem,1.25rem+1vw,2rem)] leading-[1.2]">Despesas fixas mensais</h2>
        <p className="font-body text-muted-foreground/85 text-[0.9375rem] leading-[1.55] tracking-[-0.01em]">
          Adicione suas despesas fixas — o percentual será exibido no diagnóstico
        </p>
      </div>

      <button
        type="button"
        onClick={add}
        className="w-full h-14 rounded-2xl border-2 border-dashed border-border/70 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/[0.03] transition-all duration-200 text-[0.9375rem] font-medium font-body flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> Adicionar despesa
      </button>

      {totalValue > 0 && (
        <div className="p-5 rounded-2xl border border-border/60 bg-card shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">Distribuição</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted/50 gap-px">
            {items.map((item, i) => {
              const pct = getPercentage(item.amount);
              if (pct === 0) return null;
              return (
                <div key={item.id ?? i} className="h-full bg-primary/70 first:rounded-l-full last:rounded-r-full transition-all duration-300" style={{ width: `${pct}%` }} />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
            {items.map((item, i) => {
              const pct = getPercentage(item.amount);
              if (pct === 0) return null;
              const label = getCategoryLabel(item.category) || `Despesa ${i + 1}`;
              return <span key={item.id ?? i} className="font-body text-xs text-muted-foreground">{label} <span className="font-medium text-foreground/70">{pct}%</span></span>;
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, i) => {
          const pct = getPercentage(item.amount);
          return (
            <div
              key={item.id ?? i}
              data-item-id={item.id}
              className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 shadow-soft hover:shadow-elevated hover:border-border transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">
                  Despesa {i + 1}
                </span>
                <div className="flex items-center gap-2">
                  {pct > 0 && <span className="text-xs font-semibold text-primary tabular-nums">{pct}%</span>}
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive/60 hover:text-destructive hover:bg-destructive/8 h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <SelectWithCustom
                    value={item.category}
                    onValueChange={(v) => update(i, "category", v)}
                    options={CATEGORY_OPTIONS}
                    inputPlaceholder="Ex: Hobby, Clube..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor</Label>
                  <CurrencyInput value={item.amount} onChange={(v) => update(i, "amount", v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Observação</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => update(i, "description", e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MobileAddSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Adicionar despesa"
        categoryLabel="Categoria"
        amountLabel="Valor mensal"
        noteLabel="Observação"
        categories={MOBILE_CHIPS}
        customPlaceholder="Outra categoria..."
        onConfirm={handleSheetConfirm}
      />
    </div>
  );
};
