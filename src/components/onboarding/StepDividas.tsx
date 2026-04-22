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

const DIVIDA_CHIPS = [
  { value: "Cartão de crédito", label: "Cartão", emoji: "💳" },
  { value: "Empréstimo pessoal", label: "Empréstimo", emoji: "💵" },
  { value: "Financiamento imobiliário", label: "Imóvel", emoji: "🏠" },
  { value: "Financiamento de veículo", label: "Veículo", emoji: "🚗" },
  { value: "Empréstimo consignado", label: "Consignado", emoji: "🏦" },
  { value: "Cheque especial", label: "Cheque especial", emoji: "📉" },
  { value: "Crédito estudantil", label: "Estudantil", emoji: "🎓" },
  { value: "Parcelamento", label: "Parcelamento", emoji: "🧾" },
];

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  useFocusOnAdd(focusId, () => setFocusId(null));
  const typeOptions = mergeCustomOptions([
    { value: "Financiamento imobiliário", label: "Financiamento imobiliário" },
    { value: "Financiamento de veículo", label: "Financiamento de veículo" },
    { value: "Empréstimo pessoal", label: "Empréstimo pessoal" },
    { value: "Empréstimo consignado", label: "Empréstimo consignado" },
    { value: "Cartão de crédito", label: "Cartão de crédito" },
    { value: "Cheque especial", label: "Cheque especial" },
    { value: "Crédito estudantil", label: "Crédito estudantil" },
    { value: "Parcelamento", label: "Parcelamento" },
  ], items.map((item) => item.type));
  const creditorOptions = mergeCustomOptions([
    { value: "Banco do Brasil", label: "Banco do Brasil" },
    { value: "Caixa Econômica", label: "Caixa Econômica" },
    { value: "Itaú", label: "Itaú" },
    { value: "Bradesco", label: "Bradesco" },
    { value: "Santander", label: "Santander" },
    { value: "Nubank", label: "Nubank" },
    { value: "Inter", label: "Inter" },
    { value: "BTG Pactual", label: "BTG Pactual" },
  ], items.map((item) => item.creditor));

  const update = (index: number, field: keyof DebtItem, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const add = () => {
    if (isMobile) {
      setSheetOpen(true);
      return;
    }
    const novo = emptyDebt();
    onChange([novo, ...items]);
    setFocusId(novo.id!);
  };

  const handleSheetConfirm = ({ category, amount }: { category: string; amount: string }) => {
    const type = category.startsWith("custom:") ? category.slice(7) : category;
    const novo: DebtItem = { ...emptyDebt(), type, total_amount: amount };
    onChange([novo, ...items.filter((d) => d.type || d.total_amount)]);
  };
  const remove = (i: number) => {
    const item = items[i];
    const hasData = Object.values(item).some((value) => cleanValue(String(value)).length > 0);
    if (hasData && !window.confirm("Excluir esta dívida?")) return;
    onChange(items.length <= 1 ? [] : items.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display font-semibold text-foreground tracking-[-0.025em] text-[clamp(1.375rem,1.15rem+0.9vw,1.75rem)] leading-[1.2]">Dívidas</h2>
        <p className="font-body text-muted-foreground/85 text-[0.875rem] leading-[1.5] tracking-[-0.01em]">Empréstimos, financiamentos e parcelamentos</p>
      </div>

      <button type="button" onClick={add} className="w-full h-14 rounded-2xl border-2 border-dashed border-border/70 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/[0.03] transition-all duration-200 text-[0.9375rem] font-medium font-body flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Adicionar dívida
      </button>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id ?? i} data-item-id={item.id} className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 shadow-soft hover:shadow-elevated hover:border-border transition-all duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">Dívida {i + 1}</span>
                <p className="mt-1 truncate text-[0.9375rem] font-semibold text-foreground">{cleanValue(item.type) || "Nova dívida"}{cleanValue(item.creditor) ? ` · ${cleanValue(item.creditor)}` : ""}</p>
                <p className="text-xs font-medium text-muted-foreground">{formatMoney(item.total_amount)} · Parcela {formatMoney(item.monthly_payment)}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => remove(i)} className="shrink-0 gap-1 text-destructive hover:text-destructive hover:bg-destructive/8">
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <SelectWithCustom
                  value={item.type}
                  onValueChange={(v) => update(i, "type", v)}
                  options={typeOptions}
                  inputPlaceholder="Ex: Crédito rural, Antecipação..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Credor</Label>
                <SelectWithCustom
                  value={item.creditor}
                  onValueChange={(v) => update(i, "creditor", v)}
                  options={creditorOptions}
                  inputPlaceholder="Ex: Sicoob, Banco XP..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor total</Label>
                <CurrencyInput value={item.total_amount} onChange={(v) => update(i, "total_amount", v)} />
              </div>
              <div className="space-y-1.5">
                <Label>Parcela mensal</Label>
                <CurrencyInput value={item.monthly_payment} onChange={(v) => update(i, "monthly_payment", v)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prazo restante (meses)</Label>
                <Input type="number" value={item.remaining_months} onChange={(e) => update(i, "remaining_months", e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <MobileAddSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Adicionar dívida"
        categoryLabel="Tipo de dívida"
        amountLabel="Valor total"
        noteLabel="Credor (opcional)"
        categories={DIVIDA_CHIPS}
        customPlaceholder="Outro tipo..."
        onConfirm={handleSheetConfirm}
      />
    </div>
  );
};
