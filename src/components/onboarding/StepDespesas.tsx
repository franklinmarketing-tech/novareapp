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
import { mergeCustomOptions } from "@/lib/customOptions";

const cleanValue = (value?: string) => value?.replace(/^custom:/, "").trim() || "";
const formatMoney = (value?: string) => {
  const amount = parseFloat(value || "");
  return amount > 0 ? `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sem valor";
};

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
  is_fixed: boolean;
  due_day: string; // dia do mês 1-31, vazio quando variável/sem vencimento
}

const emptyExpense = (): ExpenseItem => ({
  id: crypto.randomUUID(),
  category: "",
  amount: "",
  description: "",
  is_fixed: true,
  due_day: "",
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
  const categoryOptions = mergeCustomOptions(CATEGORY_OPTIONS, items.map((item) => item.category));

  const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const update = <K extends keyof ExpenseItem>(index: number, field: K, value: ExpenseItem[K]) => {
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
    const cleanCategory = category.startsWith("custom:") ? category.slice(7).trim() : category;
    const novo: ExpenseItem = { ...emptyExpense(), category: cleanCategory, amount, description: note };
    onChange([novo, ...items.filter((i) => i.amount || i.category)]);
  };

  const remove = (i: number) => {
    const item = items[i];
    const hasData = Object.values(item).some((value) => cleanValue(String(value)).length > 0);
    if (hasData && !window.confirm("Excluir esta despesa?")) return;
    onChange(items.length <= 1 ? [] : items.filter((_, idx) => idx !== i));
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
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display font-semibold text-foreground tracking-[-0.025em] text-[clamp(1.375rem,1.15rem+0.9vw,1.75rem)] leading-[1.2]">Despesas fixas mensais</h2>
        <p className="font-body text-muted-foreground/85 text-[0.875rem] leading-[1.5] tracking-[-0.01em]">
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">Despesa {i + 1}</span>
                  <p className="mt-1 truncate text-[0.9375rem] font-semibold text-foreground">{getCategoryLabel(item.category) || "Nova despesa"}</p>
                  <p className="text-xs font-medium text-muted-foreground">{formatMoney(item.amount)}{pct > 0 ? ` · ${pct}% do total` : ""}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => remove(i)} className="shrink-0 gap-1 text-destructive hover:text-destructive hover:bg-destructive/8">
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <SelectWithCustom
                    value={item.category}
                    onValueChange={(v) => update(i, "category", v)}
                    options={categoryOptions}
                    inputPlaceholder="Ex: Hobby, Clube..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor</Label>
                  <CurrencyInput value={item.amount} onChange={(v) => update(i, "amount", v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => update(i, "is_fixed", true)}
                      className={`h-10 rounded-lg border text-[0.875rem] font-medium transition-all ${
                        item.is_fixed
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-card text-muted-foreground hover:border-border"
                      }`}
                    >
                      Fixa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        update(i, "is_fixed", false);
                        update(i, "due_day", "");
                      }}
                      className={`h-10 rounded-lg border text-[0.875rem] font-medium transition-all ${
                        !item.is_fixed
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-card text-muted-foreground hover:border-border"
                      }`}
                    >
                      Variável
                    </button>
                  </div>
                </div>
                {item.is_fixed && (
                  <div className="space-y-1.5">
                    <Label>Vencimento (dia do mês)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      inputMode="numeric"
                      value={item.due_day}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        if (!raw) return update(i, "due_day", "");
                        const n = Math.min(31, Math.max(1, parseInt(raw, 10)));
                        update(i, "due_day", String(n));
                      }}
                      placeholder="Ex: 10"
                    />
                  </div>
                )}
                <div className="space-y-1.5 md:col-span-2">
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
