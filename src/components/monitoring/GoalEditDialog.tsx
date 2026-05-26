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

interface ExistingGoal {
  id: string;
  description?: string | null;
  target_amount?: number | null;
  deadline?: string | null;
  priority?: string | null;
}

interface Props {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: ExistingGoal | null;
}

export function GoalEditDialog({ clientId, open, onOpenChange, goal }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const editMode = !!goal;

  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("media");

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setDescription(goal.description ?? "");
      setTarget(goal.target_amount != null ? String(goal.target_amount) : "");
      setDeadline(goal.deadline ?? "");
      setPriority(goal.priority ?? "media");
    } else {
      setDescription(""); setTarget(""); setDeadline(""); setPriority("media");
    }
  }, [open, goal]);

  const save = async () => {
    if (!description.trim()) { toast.error("Descrição obrigatória"); return; }
    setSaving(true);
    try {
      const tgt = parseFloat(target) || null;
      const payload = {
        description: description.trim(),
        target_amount: tgt,
        deadline: deadline || null,
        priority,
      };
      let error: any = null;
      if (editMode) {
        ({ error } = await supabase.from("goals").update(payload).eq("id", goal!.id));
      } else {
        ({ error } = await supabase.from("goals").insert([{ client_id: clientId, ...payload }]));
      }
      if (error) throw error;
      toast.success(editMode ? "Objetivo atualizado" : "Objetivo adicionado");
      qc.invalidateQueries({ queryKey: ["goals", clientId] });
      qc.invalidateQueries({ queryKey: ["active_goals", clientId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editMode ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle>
          <DialogDescription>
            {editMode ? "Altere os campos e salve." : "Crie um novo objetivo financeiro."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Comprar imóvel, juntar reserva de emergência..." />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Valor alvo (R$, opcional)</Label>
            <CurrencyInput value={target} onChange={setTarget} placeholder="0,00" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Prazo (opcional)</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
