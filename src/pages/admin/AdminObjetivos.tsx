import { useEffect, useState } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { toast } from "@/hooks/use-toast";
import { Target, Plus, Pencil, Trash2, Calendar, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Goal {
  id: string;
  description: string;
  target_amount: number | null;
  deadline: string | null;
  priority: string | null;
}

interface GoalFormData {
  description: string;
  target_amount: string;
  deadline: string;
  priority: string;
}

const emptyForm = (): GoalFormData => ({ description: "", target_amount: "", deadline: "", priority: "media" });

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const priorityLabels: Record<string, { label: string; dot: string }> = {
  alta: { label: "Alta", dot: "bg-destructive" },
  media: { label: "Média", dot: "bg-warning" },
  baixa: { label: "Baixa", dot: "bg-primary" },
};

const AdminObjetivos = () => {
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalFormData>(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase.from("goals").select("*").eq("client_id", clientId).order("priority");
    setGoals((data as Goal[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [clientId]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (g: Goal) => {
    setEditingId(g.id);
    setForm({
      description: g.description,
      target_amount: g.target_amount?.toString() || "",
      deadline: g.deadline || "",
      priority: g.priority || "media",
    });
    setDialogOpen(true);
  };

  const saveGoal = async () => {
    if (!clientId || !form.description.trim()) return;
    setSaving(true);
    const payload = {
      client_id: clientId,
      description: form.description.trim(),
      target_amount: parseFloat(form.target_amount) || null,
      deadline: form.deadline || null,
      priority: form.priority,
    };
    if (editingId) {
      await supabase.from("goals").update(payload).eq("id", editingId);
    } else {
      await supabase.from("goals").insert(payload);
    }
    setDialogOpen(false);
    toast({ title: editingId ? "Objetivo atualizado" : "Objetivo criado" });
    await loadData();
    setSaving(false);
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    await supabase.from("action_items").update({ goal_id: null }).eq("goal_id", id);
    toast({ title: "Objetivo removido" });
    await loadData();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Objetivos do Cliente</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre os objetivos financeiros. O progresso é acompanhado no Plano de Ação.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-6 w-6" /> Novo Objetivo
        </Button>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum objetivo cadastrado ainda.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Os objetivos do onboarding aparecerão aqui automaticamente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {goals.map((goal, i) => {
            const prio = priorityLabels[goal.priority || "media"] || priorityLabels.media;
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <div className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card px-5 py-4 transition-all hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)] hover:border-border">
                  {/* Priority dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${prio.dot}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{goal.description}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{prio.label}</span>
                      {goal.target_amount && <span>{fmt(goal.target_amount)}</span>}
                      {goal.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-6 w-6" />
                          {new Date(goal.deadline + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(goal)}>
                      <Pencil className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteGoal(goal.id)}>
                      <Trash2 className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Aposentadoria, Reserva de emergência..."
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor alvo (R$)</Label>
                <Input
                  type="number"
                  value={form.target_amount}
                  onChange={(e) => setForm(p => ({ ...p, target_amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm(p => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <SelectWithCustom
                value={form.priority}
                onValueChange={(v) => setForm(p => ({ ...p, priority: v }))}
                options={[
                  { value: "alta", label: "Alta" },
                  { value: "media", label: "Média" },
                  { value: "baixa", label: "Baixa" },
                ]}
                inputPlaceholder="Ex: Urgente, Crítica..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveGoal} disabled={saving || !form.description.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminObjetivos;
