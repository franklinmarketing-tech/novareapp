import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useFocusOnAdd } from "@/hooks/useFocusOnAdd";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAddSheet } from "./MobileAddSheet";
import { mergeCustomOptions } from "@/lib/customOptions";

const RENDA_CHIPS = [
  { value: "Salário CLT (líquido)", label: "Salário CLT", emoji: "💼" },
  { value: "Pró-labore", label: "Pró-labore", emoji: "🧾" },
  { value: "Autônomo", label: "Autônomo", emoji: "🛠️" },
  { value: "Aluguel recebido", label: "Aluguel", emoji: "🏠" },
  { value: "Comissão", label: "Comissão", emoji: "💸" },
  { value: "Bônus / PLR", label: "Bônus", emoji: "🎁" },
  { value: "Freelance", label: "Freelance", emoji: "💻" },
  { value: "Aposentadoria", label: "Aposentadoria", emoji: "👴" },
  { value: "Renda de investimentos", label: "Investimentos", emoji: "📈" },
  { value: "Dividendos", label: "Dividendos", emoji: "💰" },
];

export interface IncomeItem {
  id?: string;
  description: string;
  amount: string;
  frequency: string;
  is_primary: boolean;
  stability: string;
}

const emptyIncome = (): IncomeItem => ({
  id: crypto.randomUUID(), description: "", amount: "", frequency: "mensal", is_primary: false, stability: "media",
});

interface Props {
  data: IncomeItem[];
  onChange: (data: IncomeItem[]) => void;
}

export const StepRenda = ({ data, onChange }: Props) => {
  const items = data.length > 0 ? data : [emptyIncome()];
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  useFocusOnAdd(focusId, () => setFocusId(null));
  const primaryDescriptionOptions = mergeCustomOptions([
    { value: "Salário CLT (líquido)", label: "Salário CLT (líquido)" },
    { value: "Pró-labore", label: "Pró-labore" },
    { value: "Autônomo", label: "Autônomo" },
    { value: "Servidor público", label: "Servidor público" },
    { value: "Aposentadoria", label: "Aposentadoria" },
    { value: "Pensão", label: "Pensão" },
  ], items.filter((item) => item.is_primary).map((item) => item.description));
  const additionalDescriptionOptions = mergeCustomOptions([
    { value: "Aluguel recebido", label: "Aluguel recebido" },
    { value: "Comissão", label: "Comissão" },
    { value: "Bônus / PLR", label: "Bônus / PLR" },
    { value: "Freelance", label: "Freelance" },
    { value: "Renda de investimentos", label: "Renda de investimentos" },
    { value: "Dividendos", label: "Dividendos" },
    { value: "Pensão alimentícia", label: "Pensão alimentícia" },
    { value: "Renda extra eventual", label: "Renda extra eventual" },
  ], items.filter((item) => !item.is_primary).map((item) => item.description));
  const frequencyOptions = mergeCustomOptions([
    { value: "mensal", label: "Mensal" },
    { value: "anual", label: "Anual" },
    { value: "eventual", label: "Eventual" },
  ], items.map((item) => item.frequency));
  const stabilityOptions = mergeCustomOptions([
    { value: "alta", label: "Alta" },
    { value: "media", label: "Média" },
    { value: "baixa", label: "Baixa" },
  ], items.map((item) => item.stability));

  const update = (index: number, field: keyof IncomeItem, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  // Insere a nova renda logo após a Principal (índice 0), no topo da lista de adicionais
  const add = () => {
    if (isMobile) {
      setSheetOpen(true);
      return;
    }
    const novo = emptyIncome();
    if (items.length === 0) {
      onChange([novo]);
    } else {
      const [first, ...rest] = items;
      onChange([first, novo, ...rest]);
    }
    setFocusId(novo.id!);
  };

  const handleSheetConfirm = ({ category, amount }: { category: string; amount: string }) => {
    const desc = category.startsWith("custom:") ? category.slice(7) : category;
    const novo: IncomeItem = { ...emptyIncome(), description: desc, amount };
    if (items.length === 0) {
      onChange([novo]);
    } else {
      const [first, ...rest] = items;
      onChange([first, novo, ...rest]);
    }
  };
  const remove = (i: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, idx) => idx !== i));
  };

  const primaryIndex = items.findIndex((r) => r.is_primary);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display font-semibold text-foreground tracking-[-0.025em] text-[clamp(1.375rem,1.15rem+0.9vw,1.75rem)] leading-[1.2]">Fontes de renda</h2>
        <p className="font-body text-muted-foreground/85 text-[0.875rem] leading-[1.5] tracking-[-0.01em]">
          Informe a renda mensal principal (líquida) e rendas adicionais
        </p>
      </div>

      {/* Add button at top — always visible */}
      <button
        type="button"
        onClick={add}
        className="w-full h-14 rounded-2xl border-2 border-dashed border-border/70 text-muted-foreground hover:border-accent/50 hover:text-accent hover:bg-accent/[0.03] transition-all duration-200 text-[0.9375rem] font-medium font-body flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> Adicionar fonte
      </button>

      <div className="space-y-3">
        {items.map((item, i) => {
          const isPrimary = item.is_primary || (primaryIndex === -1 && i === 0);
          return (
            <div
              key={item.id ?? i}
              data-item-id={item.id}
              className={`p-5 rounded-2xl border space-y-4 transition-all duration-200 shadow-soft ${isPrimary ? "border-primary/40 bg-primary/[0.04]" : "border-border/60 bg-card hover:border-border hover:shadow-elevated"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">
                  {isPrimary ? "Renda Principal (líquida)" : `Renda Adicional ${i}`}
                </span>
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
                    options={isPrimary ? primaryDescriptionOptions : additionalDescriptionOptions}
                    inputPlaceholder={isPrimary ? "Ex: Sócio de empresa..." : "Ex: Royalties, Mesada..."}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor</Label>
                  <CurrencyInput value={item.amount} onChange={(v) => update(i, "amount", v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Frequência</Label>
                  <SelectWithCustom
                    value={item.frequency}
                    onValueChange={(v) => update(i, "frequency", v)}
                    options={frequencyOptions}
                    inputPlaceholder="Ex: Trimestral, Semestral..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Estabilidade</Label>
                  <SelectWithCustom
                    value={item.stability}
                    onValueChange={(v) => update(i, "stability", v)}
                    options={stabilityOptions}
                    inputPlaceholder="Ex: Variável por comissão"
                  />
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <Checkbox
                    checked={item.is_primary}
                    onCheckedChange={(v) => {
                      const next = items.map((it, idx) => ({ ...it, is_primary: idx === i ? !!v : false }));
                      onChange(next);
                    }}
                  />
                  <Label className="cursor-pointer">Renda principal</Label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MobileAddSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Adicionar fonte de renda"
        categoryLabel="Tipo de renda"
        amountLabel="Valor mensal"
        noteLabel="Observação"
        categories={RENDA_CHIPS}
        customPlaceholder="Outra fonte..."
        onConfirm={handleSheetConfirm}
      />
    </div>
  );
};
