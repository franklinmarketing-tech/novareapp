import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusOnAdd } from "@/hooks/useFocusOnAdd";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAddSheet } from "./MobileAddSheet";

const PATRIMONIO_CHIPS = [
  { value: "Imóvel", label: "Imóvel", emoji: "🏠" },
  { value: "Veículo", label: "Veículo", emoji: "🚗" },
  { value: "Investimento", label: "Investimento", emoji: "📈" },
  { value: "Conta corrente", label: "Conta", emoji: "🏦" },
  { value: "Reserva de emergência", label: "Reserva", emoji: "🛟" },
  { value: "Outros", label: "Outros", emoji: "✨" },
];

export interface AssetItem {
  id?: string;
  type: string;
  description: string;
  estimated_value: string;
}

const emptyAsset = (): AssetItem => ({ id: crypto.randomUUID(), type: "", description: "", estimated_value: "" });

interface Props {
  data: AssetItem[];
  onChange: (data: AssetItem[]) => void;
}

export const StepPatrimonio = ({ data, onChange }: Props) => {
  const items = data.length > 0 ? data : [emptyAsset()];
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  useFocusOnAdd(focusId, () => setFocusId(null));

  const update = (index: number, field: keyof AssetItem, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const add = () => {
    if (isMobile) {
      setSheetOpen(true);
      return;
    }
    const novo = emptyAsset();
    onChange([novo, ...items]);
    setFocusId(novo.id!);
  };

  const handleSheetConfirm = ({ category, amount, note }: { category: string; amount: string; note: string }) => {
    const type = category.startsWith("custom:") ? category.slice(7) : category;
    const novo: AssetItem = { ...emptyAsset(), type, estimated_value: amount, description: note };
    onChange([novo, ...items.filter((a) => a.type || a.estimated_value)]);
  };
  const remove = (i: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="font-display font-semibold text-foreground tracking-[-0.025em] text-[clamp(1.5rem,1.25rem+1vw,2rem)] leading-[1.2]">Patrimônio</h2>
        <p className="font-body text-muted-foreground/85 text-[0.9375rem] leading-[1.55] tracking-[-0.01em]">Bens e ativos que você possui</p>
      </div>

      <button type="button" onClick={add} className="w-full h-14 rounded-2xl border-2 border-dashed border-border/70 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/[0.03] transition-all duration-200 text-[0.9375rem] font-medium font-body flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Adicionar ativo
      </button>

      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, i) => (
            <motion.div
              key={item.id ?? i}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              data-item-id={item.id}
              className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 shadow-soft hover:shadow-elevated hover:-translate-y-px hover:border-border transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-[0.6875rem] font-semibold text-muted-foreground/85 uppercase tracking-[0.12em]">Ativo {i + 1}</span>
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive/60 hover:text-destructive hover:bg-destructive/8 h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <SelectWithCustom
                    value={item.type}
                    onValueChange={(v) => update(i, "type", v)}
                    options={[
                      { value: "Imóvel", label: "Imóvel" },
                      { value: "Veículo", label: "Veículo" },
                      { value: "Investimento", label: "Investimento" },
                      { value: "Outros", label: "Outros" },
                    ]}
                    inputPlaceholder="Ex: Criptomoedas, Joias..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Input value={item.description} onChange={(e) => update(i, "description", e.target.value)} placeholder="Ex: Apartamento 3 quartos" />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor estimado</Label>
                  <CurrencyInput value={item.estimated_value} onChange={(v) => update(i, "estimated_value", v)} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
