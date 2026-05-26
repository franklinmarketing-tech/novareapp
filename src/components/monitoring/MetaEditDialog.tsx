import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ExistingMeta {
  id: string; // meta_id real (não pode ser synthetic)
  meta_text?: string | null;
  meta_valor?: number | null;
  prazo?: string | null;
}

/**
 * Vínculo do item de onboarding ao qual a meta pertence.
 * Necessário ao CRIAR uma meta (insert em parecer_metas) — define source_table/id/label.
 */
interface SourceBinding {
  source_table: string;
  source_id: string;
  source_label: string;
  current_value?: number | null;
}

interface Props {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: ExistingMeta | null;     // se passado, modo edição
  source?: SourceBinding | null;  // obrigatório quando meta == null (modo incluir)
}

export function MetaEditDialog({ clientId, open, onOpenChange, meta, source }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const editMode = !!meta;

  const [metaText, setMetaText] = useState("");
  const [metaValor, setMetaValor] = useState("");
  const [prazo, setPrazo] = useState("");

  useEffect(() => {
    if (!open) return;
    if (meta) {
      setMetaText(meta.meta_text ?? "");
      setMetaValor(meta.meta_valor != null ? String(meta.meta_valor) : "");
      setPrazo(meta.prazo ?? "");
    } else {
      setMetaText(""); setMetaValor(""); setPrazo("");
    }
  }, [open, meta]);

  const save = async () => {
    if (!metaText.trim() && !metaValor.trim()) {
      toast.error("Preencha pelo menos a descrição ou o valor alvo");
      return;
    }
    setSaving(true);
    try {
      const valor = parseFloat(metaValor) || null;
      let error: any = null;

      if (editMode) {
        ({ error } = await supabase
          .from("parecer_metas")
          .update({
            meta_text: metaText.trim() || null,
            meta_valor: valor,
            prazo: prazo || null,
          })
          .eq("id", meta!.id));
      } else {
        if (!source) {
          toast.error("Item de origem não informado");
          setSaving(false);
          return;
        }
        ({ error } = await supabase.from("parecer_metas").insert([{
          client_id: clientId,
          source_table: source.source_table,
          source_id: source.source_id,
          source_label: source.source_label,
          current_value: source.current_value ?? null,
          meta_text: metaText.trim() || null,
          meta_valor: valor,
          prazo: prazo || null,
        }]));
      }

      if (error) throw error;
      toast.success(editMode ? "Meta atualizada" : "Meta criada");
      qc.invalidateQueries({ queryKey: ["parecer_metas", clientId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const title = editMode ? "Editar Meta" : "Definir Meta";
  const subjectLabel = meta ? null : source?.source_label;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {subjectLabel ? <>Item: <strong>{subjectLabel}</strong></> : "Altere os campos e salve."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Descrição da meta</Label>
            <Textarea
              rows={3}
              value={metaText}
              onChange={(e) => setMetaText(e.target.value)}
              placeholder="Ex: Reduzir essa despesa em 30% até o fim do ano..."
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Valor alvo (R$, opcional)</Label>
            <CurrencyInput value={metaValor} onChange={setMetaValor} placeholder="0,00" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Prazo (opcional)</Label>
            <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
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
