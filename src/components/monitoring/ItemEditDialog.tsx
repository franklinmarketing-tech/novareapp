import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export type ItemKind = "income" | "expenses" | "debts" | "assets" | "insurance";

interface ExistingItem {
  id: string;
  // income
  description?: string | null;
  amount?: number | null;
  frequency?: string | null;
  // expenses
  category?: string | null;
  is_fixed?: boolean | null;
  // debts
  type?: string | null;
  creditor?: string | null;
  total_amount?: number | null;
  monthly_payment?: number | null;
  // assets
  estimated_value?: number | null;
  // insurance
  provider?: string | null;
  monthly_premium?: number | null;
  coverage_amount?: number | null;
}

interface Props {
  kind: ItemKind;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ExistingItem | null; // se passado, modo edição
}

const TITLES: Record<ItemKind, { add: string; edit: string }> = {
  income:    { add: "Nova Renda",      edit: "Editar Renda" },
  expenses:  { add: "Nova Despesa",    edit: "Editar Despesa" },
  debts:     { add: "Nova Dívida",     edit: "Editar Dívida" },
  assets:    { add: "Novo Patrimônio", edit: "Editar Patrimônio" },
  insurance: { add: "Novo Seguro",     edit: "Editar Seguro" },
};

export function ItemEditDialog({ kind, clientId, open, onOpenChange, item }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const editMode = !!item;

  // campos comuns
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  // específicos
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("mensal");
  const [type, setType] = useState("");
  const [creditor, setCreditor] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [provider, setProvider] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");

  const reset = () => {
    setDescription(""); setAmount(""); setCategory(""); setFrequency("mensal");
    setType(""); setCreditor(""); setMonthlyPayment(""); setProvider(""); setCoverageAmount("");
  };

  // Hidrata o formulário a partir do item ao abrir em modo edição
  useEffect(() => {
    if (!open) return;
    if (item) {
      setDescription(item.description ?? "");
      setCategory(item.category ?? "");
      setFrequency(item.frequency ?? "mensal");
      setType(item.type ?? "");
      setCreditor(item.creditor ?? "");
      setProvider(item.provider ?? "");
      if (kind === "income" || kind === "expenses") {
        setAmount(item.amount != null ? String(item.amount) : "");
      } else if (kind === "debts") {
        setAmount(item.total_amount != null ? String(item.total_amount) : "");
        setMonthlyPayment(item.monthly_payment != null ? String(item.monthly_payment) : "");
      } else if (kind === "assets") {
        setAmount(item.estimated_value != null ? String(item.estimated_value) : "");
      } else if (kind === "insurance") {
        setAmount(item.monthly_premium != null ? String(item.monthly_premium) : "");
        setCoverageAmount(item.coverage_amount != null ? String(item.coverage_amount) : "");
      }
    } else {
      reset();
    }
  }, [open, item, kind]);

  const save = async () => {
    setSaving(true);
    try {
      const amt = parseFloat(amount) || 0;
      const mp  = parseFloat(monthlyPayment) || 0;
      const cov = parseFloat(coverageAmount) || 0;
      let error: any = null;

      if (kind === "income") {
        if (!description.trim()) { toast.error("Descrição obrigatória"); setSaving(false); return; }
        const payload = { description: description.trim(), amount: amt, frequency: frequency as any };
        if (editMode) {
          ({ error } = await supabase.from("income").update(payload).eq("id", item!.id));
        } else {
          ({ error } = await supabase.from("income").insert([{ client_id: clientId, ...payload }]));
        }
      } else if (kind === "expenses") {
        if (!category.trim() && !description.trim()) { toast.error("Categoria ou descrição obrigatória"); setSaving(false); return; }
        const payload = {
          category: category.trim() || "outros",
          description: description.trim() || null,
          amount: amt,
          is_fixed: true,
        };
        if (editMode) {
          ({ error } = await supabase.from("expenses").update(payload).eq("id", item!.id));
        } else {
          ({ error } = await supabase.from("expenses").insert([{ client_id: clientId, ...payload }]));
        }
      } else if (kind === "debts") {
        if (!type.trim()) { toast.error("Tipo da dívida obrigatório"); setSaving(false); return; }
        const payload = {
          type: type.trim(),
          creditor: creditor.trim() || null,
          total_amount: amt,
          monthly_payment: mp || null,
        };
        if (editMode) {
          ({ error } = await supabase.from("debts").update(payload).eq("id", item!.id));
        } else {
          ({ error } = await supabase.from("debts").insert([{ client_id: clientId, ...payload }]));
        }
      } else if (kind === "assets") {
        if (!type.trim()) { toast.error("Tipo do patrimônio obrigatório"); setSaving(false); return; }
        const payload = {
          type: type.trim(),
          description: description.trim() || null,
          estimated_value: amt,
        };
        if (editMode) {
          ({ error } = await supabase.from("assets").update(payload).eq("id", item!.id));
        } else {
          ({ error } = await supabase.from("assets").insert([{ client_id: clientId, ...payload }]));
        }
      } else if (kind === "insurance") {
        if (!type.trim()) { toast.error("Tipo do seguro obrigatório"); setSaving(false); return; }
        const payload = {
          type: type.trim(),
          provider: provider.trim() || null,
          monthly_premium: amt || null,
          coverage_amount: cov || null,
        };
        if (editMode) {
          ({ error } = await supabase.from("insurance").update(payload).eq("id", item!.id));
        } else {
          ({ error } = await supabase.from("insurance").insert([{ client_id: clientId, ...payload }]));
        }
      }

      if (error) throw error;

      toast.success(editMode ? "Item atualizado" : "Item adicionado");
      qc.invalidateQueries({ queryKey: ["onboarding_full", clientId] });
      qc.invalidateQueries({ queryKey: ["parecer_metas", clientId] });
      qc.invalidateQueries({ queryKey: ["client_financials", clientId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const amountLabel =
    kind === "debts"     ? "Valor total da dívida (R$)" :
    kind === "assets"    ? "Valor estimado (R$)" :
    kind === "insurance" ? "Prêmio mensal (R$)" :
    "Valor (R$)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editMode ? TITLES[kind].edit : TITLES[kind].add}</DialogTitle>
          <DialogDescription>
            {editMode ? "Altere os campos e salve." : "Preencha os campos para adicionar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Tipo (debts, assets, insurance) */}
          {(kind === "debts" || kind === "assets" || kind === "insurance") && (
            <div className="space-y-1">
              <Label className="text-xs">
                {kind === "debts" ? "Tipo (ex: Cartão, Financiamento)" :
                 kind === "assets" ? "Tipo (ex: Imóvel, Veículo, Investimento)" :
                 "Tipo (ex: Vida, Auto, Saúde)"}
              </Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="..." />
            </div>
          )}

          {/* Categoria (expenses) */}
          {kind === "expenses" && (
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="moradia, transporte, lazer..." />
            </div>
          )}

          {/* Descrição / Credor / Provedor */}
          {kind === "debts" && (
            <div className="space-y-1">
              <Label className="text-xs">Credor (opcional)</Label>
              <Input value={creditor} onChange={(e) => setCreditor(e.target.value)} placeholder="Banco, instituição..." />
            </div>
          )}
          {kind === "insurance" && (
            <div className="space-y-1">
              <Label className="text-xs">Seguradora (opcional)</Label>
              <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="..." />
            </div>
          )}
          {(kind === "income" || kind === "expenses" || kind === "assets") && (
            <div className="space-y-1">
              <Label className="text-xs">
                {kind === "expenses" ? "Descrição (opcional)" : "Descrição"}
              </Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          )}

          {/* Valor */}
          <div className="space-y-1">
            <Label className="text-xs">{amountLabel}</Label>
            <CurrencyInput value={amount} onChange={setAmount} placeholder="0,00" />
          </div>

          {/* Campos extras */}
          {kind === "debts" && (
            <div className="space-y-1">
              <Label className="text-xs">Parcela mensal (R$, opcional)</Label>
              <CurrencyInput value={monthlyPayment} onChange={setMonthlyPayment} placeholder="0,00" />
            </div>
          )}
          {kind === "insurance" && (
            <div className="space-y-1">
              <Label className="text-xs">Cobertura (R$, opcional)</Label>
              <CurrencyInput value={coverageAmount} onChange={setCoverageAmount} placeholder="0,00" />
            </div>
          )}
          {kind === "income" && (
            <div className="space-y-1">
              <Label className="text-xs">Frequência</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="unica">Única</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
