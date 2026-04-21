import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

export interface CategoryOption {
  value: string;
  label: string;
  emoji?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  categoryLabel?: string;
  amountLabel?: string;
  noteLabel?: string;
  categories: CategoryOption[];
  /** allow free-text custom value typed by the user */
  allowCustom?: boolean;
  customPlaceholder?: string;
  onConfirm: (value: { category: string; amount: string; note: string }) => void;
}

/**
 * Bottom sheet usado em mobile para adicionar um item (despesa/renda/dívida/ativo)
 * sem empilhar mais um card inline. Categorias viram chips grandes touch-friendly.
 */
export const MobileAddSheet = ({
  open,
  onOpenChange,
  title,
  categoryLabel = "Categoria",
  amountLabel = "Valor",
  noteLabel = "Observação",
  categories,
  allowCustom = true,
  customPlaceholder = "Outra categoria...",
  onConfirm,
}: Props) => {
  const [category, setCategory] = useState("");
  const [custom, setCustom] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory("");
      setCustom("");
      setAmount("");
      setNote("");
      setShowCustom(false);
    }
  }, [open]);

  const finalCategory = showCustom ? (custom ? `custom:${custom}` : "") : category;
  const canConfirm = !!finalCategory;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({ category: finalCategory, amount, note });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-5 pt-5 pb-7 max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="text-left mb-3">
          <SheetTitle className="font-display tracking-[-0.02em]">{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[0.8125rem] text-muted-foreground/85">{categoryLabel}</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = !showCustom && category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      setShowCustom(false);
                      setCategory(c.value);
                    }}
                    className={`min-h-[44px] px-3.5 py-2 rounded-full border text-[0.875rem] font-body transition-all flex items-center gap-1.5 ${
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-soft"
                        : "border-border/60 bg-card text-foreground/80 hover:border-border"
                    }`}
                  >
                    {c.emoji && <span className="text-base leading-none">{c.emoji}</span>}
                    <span>{c.label}</span>
                  </button>
                );
              })}
              {allowCustom && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(true);
                    setCategory("");
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-full border text-[0.875rem] font-body transition-all ${
                    showCustom
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-dashed border-border/70 text-muted-foreground hover:border-accent/60 hover:text-accent"
                  }`}
                >
                  + Outra
                </button>
              )}
            </div>
            {showCustom && (
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={customPlaceholder}
                className="h-12 mt-2"
                autoFocus
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[0.8125rem] text-muted-foreground/85">{amountLabel}</Label>
            <CurrencyInput value={amount} onChange={setAmount} />
          </div>

          <div className="space-y-2">
            <Label className="text-[0.8125rem] text-muted-foreground/85">{noteLabel}</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional"
              className="h-12"
            />
          </div>

          <Button
            type="button"
            variant="premium"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="w-full h-13 min-h-[52px] gap-2 rounded-full text-[0.9375rem] font-medium"
          >
            <Check className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
