import { useEffect, useMemo, useState } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Target, Plus, Pencil, Trash2, Calendar, Loader2,
  Clock, Wallet, Home, Plane, GraduationCap, HeartPulse,
  Shield, PiggyBank, Sparkles, CheckCircle2, TrendingUp, Save, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Goal {
  id: string;
  description: string;
  target_amount: number | null;
  deadline: string | null;
  priority: string | null;
  category?: string | null;
  amount_applied?: number | null;
}

interface GoalFormData {
  description: string;
  target_amount: string;
  deadline: string;
  priority: string;
  category: string;
}

const emptyForm = (): GoalFormData => ({
  description: "", target_amount: "", deadline: "", priority: "media", category: "geral",
});

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

const priorityMeta: Record<string, { label: string; dot: string; badge: string; weight: number }> = {
  alta:  { label: "Alta",  dot: "bg-destructive", badge: "border-destructive/30 text-destructive bg-destructive/10", weight: 0 },
  media: { label: "Média", dot: "bg-warning",      badge: "border-warning/30 text-warning bg-warning/10",           weight: 1 },
  baixa: { label: "Baixa", dot: "bg-primary",      badge: "border-primary/30 text-primary bg-primary/10",           weight: 2 },
};

const categoryMeta: Record<string, { label: string; icon: typeof Target }> = {
  geral:         { label: "Geral",         icon: Target },
  aposentadoria: { label: "Aposentadoria", icon: PiggyBank },
  reserva:       { label: "Reserva",       icon: Shield },
  imovel:        { label: "Imóvel",        icon: Home },
  viagem:        { label: "Viagem",        icon: Plane },
  educacao:      { label: "Educação",      icon: GraduationCap },
  saude:         { label: "Saúde",         icon: HeartPulse },
  patrimonio:    { label: "Patrimônio",    icon: Wallet },
  sonho:         { label: "Sonho",         icon: Sparkles },
};

const categoryOptions = Object.entries(categoryMeta).map(([value, m]) => ({ value, label: m.label }));

const daysUntil = (deadline: string | null) => {
  if (!deadline) return null;
  const d = new Date(deadline + "T12:00:00").getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
};

function progressBarColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60)  return "bg-blue-500";
  if (pct >= 30)  return "bg-amber-500";
  return "bg-rose-500";
}

function progressTextColor(pct: number) {
  if (pct >= 100) return "text-emerald-600";
  if (pct >= 60)  return "text-blue-600";
  if (pct >= 30)  return "text-amber-600";
  return "text-rose-600";
}

// Card individual de objetivo
function GoalCard({ goal, onEdit, onDelete, onApplyInvestment }: {
  goal: Goal;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  onApplyInvestment: (id: string, amount: number) => Promise<void>;
}) {
  const [inputVal, setInputVal] = useState(
    goal.amount_applied != null && goal.amount_applied > 0 ? String(goal.amount_applied) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const applied   = parseFloat(inputVal) || goal.amount_applied || 0;
  const target    = goal.target_amount || 0;
  const pct       = target > 0 ? Math.min(Math.round((applied / target) * 100), 100) : 0;
  const isDone    = pct >= 100;
  const days      = daysUntil(goal.deadline);
  const isOverdue = days !== null && days < 0 && !isDone;
  const prio      = priorityMeta[goal.priority || "media"] || priorityMeta.media;
  const cat       = categoryMeta[goal.category || "geral"] || categoryMeta.geral;
  const CatIcon   = cat.icon;

  const handleSave = async () => {
    const num = parseFloat(inputVal);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    await onApplyInvestment(goal.id, num);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card p-4 gap-3 transition-shadow hover:shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18)]",
        isDone     ? "border-emerald-400/50" :
        isOverdue  ? "border-destructive/40" :
                    "border-border/60 hover:border-border",
      )}
    >
      {/* Topo: categoria + prioridade + ações */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            <CatIcon className="h-4 w-4 text-foreground/70" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{cat.label}</p>
            <Badge variant="outline" className={cn("mt-0.5 h-5 px-1.5 text-[10px] font-medium", prio.badge)}>
              <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", prio.dot)} /> {prio.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onDelete(goal.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Nome + valor alvo */}
      <div>
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 break-words">
          {goal.description}
        </h3>
        {target > 0 ? (
          <p className="text-xl font-bold text-foreground tracking-tight mt-0.5">{fmtBRL(target)}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic mt-0.5">Sem valor alvo definido</p>
        )}
      </div>

      {/* Investimento aplicado */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-muted-foreground font-medium">Investimento aplicado</p>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="R$ 0"
            className="h-8 text-sm tabular-nums flex-1"
          />
          <Button
            size="sm"
            variant={saved ? "secondary" : "default"}
            onClick={handleSave}
            disabled={saving || inputVal === ""}
            className="h-8 w-9 p-0 shrink-0"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
             saved   ? <Check className="h-3.5 w-3.5" /> :
                       <Save className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground tabular-nums">
            {applied > 0 ? fmtBRL(applied) : "—"}
            {target > 0 && applied > 0 && <span className="mx-1 opacity-40">/</span>}
            {target > 0 && applied > 0 && <span className="text-muted-foreground/70">{fmtBRL(target)}</span>}
          </span>
          <span className={cn("font-bold tabular-nums text-sm", progressTextColor(pct))}>
            {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressBarColor(pct))}
            style={{ width: `${pct}%` }}
          />
        </div>
        {isDone && (
          <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Meta atingida!
          </p>
        )}
      </div>

      {/* Rodapé: prazo */}
      <div className="pt-1 border-t border-border/40 flex items-center justify-between gap-2 text-[11px]">
        {goal.deadline ? (
          <span className={cn("flex items-center gap-1", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
            <Calendar className="h-3 w-3" />
            {new Date(goal.deadline + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            {days !== null && (
              <span className="ml-1">
                ({isOverdue ? `${Math.abs(days)}d atraso` : days === 0 ? "hoje" : `${days}d`})
              </span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> Sem prazo
          </span>
        )}
        {!isDone && pct > 0 && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-blue-300/40 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400">
            <TrendingUp className="h-3 w-3 mr-1" /> Em andamento
          </Badge>
        )}
      </div>
    </motion.article>
  );
}

// Componente principal
const AdminObjetivos = () => {
  const { clientId } = useClientId();
  const [loading, setLoading]       = useState(true);
  const [goals, setGoals]           = useState<Goal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<GoalFormData>(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadGoals = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase.from("goals").select("*").eq("client_id", clientId).order("created_at");
    setGoals((data as Goal[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadGoals(); }, [clientId]);

  // Métricas
  const metrics = useMemo(() => {
    const total      = goals.length;
    const totalAlvo  = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
    const totalAplic = goals.reduce((s, g) => s + (g.amount_applied || 0), 0);
    const concluidos = goals.filter((g) => {
      const t = g.target_amount || 0;
      return t > 0 && (g.amount_applied || 0) >= t;
    }).length;
    return { total, totalAlvo, totalAplic, concluidos };
  }, [goals]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit   = (g: Goal) => {
    setEditingId(g.id);
    setForm({
      description:   g.description,
      target_amount: g.target_amount?.toString() || "",
      deadline:      g.deadline || "",
      priority:      g.priority || "media",
      category:      g.category || "geral",
    });
    setDialogOpen(true);
  };

  const saveGoal = async () => {
    if (!clientId || !form.description.trim()) return;
    setSaving(true);
    const payload: any = {
      client_id:     clientId,
      description:   form.description.trim(),
      target_amount: parseFloat(form.target_amount) || null,
      deadline:      form.deadline || null,
      priority:      form.priority,
      category:      form.category,
    };
    if (editingId) {
      await supabase.from("goals").update(payload).eq("id", editingId);
    } else {
      await supabase.from("goals").insert(payload);
    }
    setDialogOpen(false);
    toast({ title: editingId ? "Objetivo atualizado" : "Objetivo criado" });
    await loadGoals();
    setSaving(false);
  };

  const applyInvestment = async (id: string, amount: number) => {
    await supabase.from("goals" as any).update({ amount_applied: amount }).eq("id", id);
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, amount_applied: amount } : g));
    toast({ title: "Investimento registrado" });
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    toast({ title: "Objetivo removido" });
    setConfirmDelete(null);
    await loadGoals();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Objetivos do Cliente</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina metas financeiras e registre o investimento aplicado em cada uma.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Novo Objetivo
        </Button>
      </div>

      {/* Métricas */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={Target}       label="Total"           value={metrics.total.toString()}     tone="primary" />
          <MetricCard icon={Wallet}       label="Valor alvo total" value={fmtBRL(metrics.totalAlvo)}   tone="accent" />
          <MetricCard icon={TrendingUp}   label="Total aplicado"  value={fmtBRL(metrics.totalAplic)}   tone="blue" />
          <MetricCard icon={CheckCircle2} label="Concluídos"      value={metrics.concluidos.toString()} tone="success" />
        </div>
      )}

      {/* Cards de objetivos */}
      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card py-14 flex flex-col items-center gap-3 text-center px-6">
          <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Target className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Nenhum objetivo cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie o primeiro objetivo financeiro do cliente.</p>
          </div>
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 mt-1">
            <Plus className="h-4 w-4" /> Criar Objetivo
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={openEdit}
                onDelete={(id) => setConfirmDelete(id)}
                onApplyInvestment={applyInvestment}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingId ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle>
            <DialogDescription className="text-xs">
              Defina a descrição, categoria, valor alvo e prazo do objetivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Descrição *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Aposentadoria aos 60 anos com R$ 8.000/mês"
                rows={2}
                className="resize-none text-sm"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">🔴 Alta</SelectItem>
                    <SelectItem value="media">🟡 Média</SelectItem>
                    <SelectItem value="baixa">🔵 Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Valor alvo</Label>
                <CurrencyInput
                  value={form.target_amount}
                  onChange={(v) => setForm((p) => ({ ...p, target_amount: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Prazo</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>

            {/* Aporte estimado */}
            {form.target_amount && form.deadline && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground border border-border/50">
                <strong className="text-foreground">Aporte mensal estimado: </strong>
                {(() => {
                  const months = Math.max(1, Math.ceil(
                    (new Date(form.deadline + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30),
                  ));
                  const monthly = (parseFloat(form.target_amount) || 0) / months;
                  return `${fmtBRL(monthly)} / mês durante ${months} ${months === 1 ? "mês" : "meses"}`;
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={saveGoal}
              disabled={saving || !form.description.trim()}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar Objetivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Remover objetivo?</DialogTitle>
            <DialogDescription className="text-xs">Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && deleteGoal(confirmDelete)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MetricCard = ({
  icon: Icon, label, value, tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  tone: "primary" | "accent" | "success" | "destructive" | "blue";
}) => {
  const toneCls: Record<string, string> = {
    primary:     "bg-primary/10 text-primary",
    accent:      "bg-accent/10 text-accent",
    success:     "bg-emerald-500/10 text-emerald-600",
    destructive: "bg-destructive/10 text-destructive",
    blue:        "bg-blue-500/10 text-blue-600",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", toneCls[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-bold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
};

export default AdminObjetivos;
