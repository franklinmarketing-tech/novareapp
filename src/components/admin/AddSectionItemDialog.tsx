import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export type SectionKind = "income" | "expenses" | "goals" | "action_items";

interface Props {
  kind: SectionKind;
  clientId: string;
  monthRef: string; // YYYY-MM-01
  monthLabel: string;
  actionPlanId?: string | null;
  /** queryKeys que devem ser invalidadas após o insert */
  invalidateKeys?: (string | undefined)[][];
}

const TITLES: Record<SectionKind, string> = {
  income: "Adicionar Renda",
  expenses: "Adicionar Despesa",
  goals: "Adicionar Objetivo",
  action_items: "Adicionar Ação",
};

export function AddSectionItemDialog({ kind, clientId, monthRef, monthLabel, actionPlanId, invalidateKeys }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // campos
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<"mensal" | "anual" | "eventual">("mensal");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"alta" | "media" | "baixa">("media");
  const [area, setArea] = useState<"renda" | "despesas" | "dividas" | "investimentos" | "protecao" | "impostos">("despesas");

  const reset = () => {
    setDescription(""); setAmount(""); setCategory("");
    setFrequency("mensal"); setDeadline(""); setPriority("media"); setArea("despesas");
  };

  const save = async () => {
    if (!description.trim() && kind !== "expenses") {
      toast.error("Descrição obrigatória");
      return;
    }
    setSaving(true);
    try {
      const amt = Number(amount.replace(",", ".")) || 0;
      let error: any = null;
      if (kind === "income") {
        ({ error } = await supabase.from("income").insert({
          client_id: clientId, description, amount: amt, frequency, month_ref: monthRef,
        }));
      } else if (kind === "expenses") {
        ({ error } = await supabase.from("expenses").insert({
          client_id: clientId, category: category || "outros", description: description || null,
          amount: amt, is_fixed: true, month_ref: monthRef,
        }));
      } else if (kind === "goals") {
        ({ error } = await supabase.from("goals").insert({
          client_id: clientId, description, target_amount: amt || null,
          deadline: deadline || null, priority, month_ref: monthRef,
        }));
      } else if (kind === "action_items") {
        if (!actionPlanId) {
          toast.error("Plano de ação não encontrado");
          setSaving(false);
          return;
        }
        ({ error } = await supabase.from("action_items").insert({
          action_plan_id: actionPlanId, area, description,
          financial_impact: amt || 0, deadline: deadline || null,
          status: "pendente", month_ref: monthRef,
        }));
      }
      if (error) throw error;
      toast.success("Adicionado para " + monthLabel);
      (invalidateKeys || []).forEach((k) => qc.invalidateQueries({ queryKey: k }));
      reset();
      setOpen(false);
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setOpen(true)}>
        <Plus className="w-3 h-3" /> Adicionar nesta seção
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLES[kind]}</DialogTitle>
          <DialogDescription className="capitalize">Será criado em <strong>{monthLabel}</strong>.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {kind === "expenses" && (
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="moradia, transporte, lazer..." />
            </div>
          )}
          {kind === "action_items" && (
            <div className="space-y-1">
              <Label className="text-xs">Área</Label>
              <Select value={area} onValueChange={(v: any) => setArea(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="renda">Renda</SelectItem>
                  <SelectItem value="despesas">Despesas</SelectItem>
                  <SelectItem value="dividas">Dívidas</SelectItem>
                  <SelectItem value="investimentos">Investimentos</SelectItem>
                  <SelectItem value="protecao">Proteção</SelectItem>
                  <SelectItem value="impostos">Impostos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">{kind === "expenses" ? "Descrição (opcional)" : "Descrição"}</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {kind === "goals" ? "Valor alvo (R$)" : kind === "action_items" ? "Impacto financeiro (R$)" : "Valor (R$)"}
            </Label>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          {kind === "income" && (
            <div className="space-y-1">
              <Label className="text-xs">Frequência</Label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="unica">Única</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {(kind === "goals" || kind === "action_items") && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Prazo</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              {kind === "goals" && (
                <div className="space-y-1">
                  <Label className="text-xs">Prioridade</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
