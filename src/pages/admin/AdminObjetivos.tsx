import { useEffect, useMemo, useState } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "@/hooks/use-toast";
import {
  Target, Plus, Pencil, Trash2, Calendar, Loader2, Copy, CheckCircle2,
  Filter, ArrowUpDown, TrendingUp, Clock, AlertTriangle, Wallet, Home,
  Plane, GraduationCap, HeartPulse, Shield, PiggyBank, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Goal {
  id: string;
  description: string;
  target_amount: number | null;
  deadline: string | null;
  priority: string | null;
  category?: string | null;
}

interface ActionItem {
  id: string;
  goal_id: string | null;
  status: string;
  financial_impact: number | null;
}

interface GoalFormData {
  description: string;
  target_amount: string;
  deadline: string;
  priority: string;
  category: string;
}

const emptyForm = (): GoalFormData => ({
  description: "", target_amount: "", deadline: "", priority: "media", category: "geral"
});

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const priorityMeta: Record<string, { label: string; dot: string; badge: string; weight: number }> = {
  alta:  { label: "Alta",  dot: "bg-destructive", badge: "border-destructive/30 text-destructive bg-destructive/10", weight: 0 },
  media: { label: "Média", dot: "bg-warning",     badge: "border-warning/30 text-warning bg-warning/10", weight: 1 },
  baixa: { label: "Baixa", dot: "bg-primary",     badge: "border-primary/30 text-primary bg-primary/10", weight: 2 },
};

const categoryMeta: Record<string, { label: string; icon: typeof Target }> = {
  geral:        { label: "Geral",          icon: Target },
  aposentadoria:{ label: "Aposentadoria",  icon: PiggyBank },
  reserva:      { label: "Reserva",        icon: Shield },
  imovel:       { label: "Imóvel",         icon: Home },
  viagem:       { label: "Viagem",         icon: Plane },
  educacao:     { label: "Educação",       icon: GraduationCap },
  saude:        { label: "Saúde",          icon: HeartPulse },
  patrimonio:   { label: "Patrimônio",     icon: Wallet },
  sonho:        { label: "Sonho",          icon: Sparkles },
};

const categoryOptions = Object.entries(categoryMeta).map(([value, m]) => ({ value, label: m.label }));

type FilterStatus = "todos" | "ativos" | "concluidos" | "atrasados";
type SortBy = "prioridade" | "prazo" | "valor" | "recente";

const daysUntil = (deadline: string | null) => {
  if (!deadline) return null;
  const d = new Date(deadline + "T12:00:00").getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
};

const AdminObjetivos = () => {
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("todos");
  const [sortBy, setSortBy] = useState<SortBy>("prioridade");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadData = async () => {
    if (!clientId) return;
    setLoading(true);
    const [goalsRes, plansRes] = await Promise.all([
      supabase.from("goals").select("*").eq("client_id", clientId),
      supabase.from("action_plans").select("id").eq("client_id", clientId).maybeSingle(),
    ]);
    setGoals((goalsRes.data as Goal[]) || []);
    if (plansRes.data?.id) {
      const { data: ai } = await supabase
        .from("action_items")
        .select("id, goal_id, status, financial_impact")
        .eq("action_plan_id", plansRes.data.id);
      setActionItems((ai as ActionItem[]) || []);
    } else {
      setActionItems([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [clientId]);

  // Compute progress per goal from linked action_items
  const progressByGoal = useMemo(() => {
    const map = new Map<string, { total: number; done: number; pct: number; status: "concluido" | "andamento" | "pendente" }>();
    for (const g of goals) {
      const items = actionItems.filter((i) => i.goal_id === g.id);
      const total = items.length;
      const done = items.filter((i) => i.status === "concluido").length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const status: "concluido" | "andamento" | "pendente" =
        total > 0 && done === total ? "concluido" : done > 0 ? "andamento" : "pendente";
      map.set(g.id, { total, done, pct, status });
    }
    return map;
  }, [goals, actionItems]);

  // Metrics
  const metrics = useMemo(() => {
    const total = goals.length;
    let totalTarget = 0;
    let concluidos = 0;
    let atrasados = 0;
    let andamento = 0;
    for (const g of goals) {
      totalTarget += g.target_amount || 0;
      const p = progressByGoal.get(g.id);
      if (p?.status === "concluido") concluidos++;
      else if (p?.status === "andamento") andamento++;
      const d = daysUntil(g.deadline);
      if (d !== null && d < 0 && p?.status !== "concluido") atrasados++;
    }
    return { total, totalTarget, concluidos, andamento, atrasados };
  }, [goals, progressByGoal]);

  // Filter + sort
  const visibleGoals = useMemo(() => {
    let arr = [...goals];
    if (filter !== "todos") {
      arr = arr.filter((g) => {
        const p = progressByGoal.get(g.id);
        const d = daysUntil(g.deadline);
        if (filter === "concluidos") return p?.status === "concluido";
        if (filter === "ativos") return p?.status !== "concluido";
        if (filter === "atrasados") return d !== null && d < 0 && p?.status !== "concluido";
        return true;
      });
    }
    arr.sort((a, b) => {
      if (sortBy === "prioridade") {
        return (priorityMeta[a.priority || "media"]?.weight ?? 1) - (priorityMeta[b.priority || "media"]?.weight ?? 1);
      }
      if (sortBy === "prazo") {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      }
      if (sortBy === "valor") {
        return (b.target_amount || 0) - (a.target_amount || 0);
      }
      return 0;
    });
    return arr;
  }, [goals, filter, sortBy, progressByGoal]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (g: Goal) => {
    setEditingId(g.id);
    setForm({
      description: g.description,
      target_amount: g.target_amount?.toString() || "",
      deadline: g.deadline || "",
      priority: g.priority || "media",
      category: g.category || "geral",
    });
    setDialogOpen(true);
  };

  const saveGoal = async () => {
    if (!clientId || !form.description.trim()) return;
    setSaving(true);
    const payload: any = {
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

  const duplicateGoal = async (g: Goal) => {
    if (!clientId) return;
    await supabase.from("goals").insert({
      client_id: clientId,
      description: `${g.description} (cópia)`,
      target_amount: g.target_amount,
      deadline: g.deadline,
      priority: g.priority,
    });
    toast({ title: "Objetivo duplicado" });
    await loadData();
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    await supabase.from("action_items").update({ goal_id: null }).eq("goal_id", id);
    toast({ title: "Objetivo removido" });
    setConfirmDelete(null);
    await loadData();
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
            Cadastre, priorize e acompanhe a evolução dos objetivos financeiros.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Novo Objetivo
        </Button>
      </div>

      {/* Metrics */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={Target}        label="Total"        value={metrics.total.toString()}       tone="primary" />
          <MetricCard icon={Wallet}        label="Valor alvo"   value={fmt(metrics.totalTarget)}        tone="accent" />
          <MetricCard icon={CheckCircle2}  label="Concluídos"   value={metrics.concluidos.toString()}   tone="success" />
          <MetricCard icon={AlertTriangle} label="Atrasados"    value={metrics.atrasados.toString()}    tone="destructive" />
        </div>
      )}

      {/* Filters */}
      {goals.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os objetivos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="concluidos">Concluídos</SelectItem>
                <SelectItem value="atrasados">Atrasados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prioridade">Por prioridade</SelectItem>
                <SelectItem value="prazo">Por prazo</SelectItem>
                <SelectItem value="valor">Por valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Target}
              title="Nenhum objetivo cadastrado"
              description="Comece criando o primeiro objetivo financeiro do cliente."
              action={<Button onClick={openCreate} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"><Plus className="h-4 w-4" /> Criar Objetivo</Button>}
            />
          </CardContent>
        </Card>
      ) : visibleGoals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum objetivo corresponde a este filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visibleGoals.map((goal, i) => {
              const prio = priorityMeta[goal.priority || "media"] || priorityMeta.media;
              const prog = progressByGoal.get(goal.id);
              const days = daysUntil(goal.deadline);
              const isOverdue = days !== null && days < 0 && prog?.status !== "concluido";
              const isDone = prog?.status === "concluido";
              const cat = categoryMeta[goal.category || "geral"] || categoryMeta.geral;
              const CatIcon = cat.icon;
              return (
                <motion.article
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className={`group relative flex flex-col rounded-2xl border bg-card p-4 transition-all hover:shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18)] ${
                    isDone ? "border-success/40" : isOverdue ? "border-destructive/40" : "border-border/60 hover:border-border"
                  }`}
                >
                  {/* Top row: category + priority */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                        <CatIcon className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{cat.label}</p>
                        <Badge variant="outline" className={`mt-0.5 h-5 px-1.5 text-[10px] font-medium ${prio.badge}`}>
                          <span className={`mr-1 h-1.5 w-1.5 rounded-full ${prio.dot}`} /> {prio.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Hover actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateGoal(goal)} title="Duplicar">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(goal)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setConfirmDelete(goal.id)} title="Remover">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-2 break-words">
                    {goal.description}
                  </h3>

                  {/* Target amount */}
                  {goal.target_amount ? (
                    <p className="text-lg font-bold text-foreground tracking-tight">{fmt(goal.target_amount)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sem valor alvo definido</p>
                  )}

                  {/* Progress */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {prog && prog.total > 0
                          ? `${prog.done}/${prog.total} ações`
                          : "Sem ações vinculadas"}
                      </span>
                      <span className={`font-semibold ${isDone ? "text-success" : "text-foreground"}`}>
                        {prog?.pct ?? 0}%
                      </span>
                    </div>
                    <Progress
                      value={prog?.pct ?? 0}
                      className={`h-1.5 ${isDone ? "[&>div]:bg-success" : ""}`}
                    />
                  </div>

                  {/* Footer: deadline + status */}
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-[11px]">
                    {goal.deadline ? (
                      <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
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
                    {isDone && (
                      <Badge className="h-5 px-1.5 text-[10px] bg-success/15 text-success border-success/30 hover:bg-success/15">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Concluído
                      </Badge>
                    )}
                    {!isDone && prog && prog.pct > 0 && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-warning/30 text-warning bg-warning/10">
                        <TrendingUp className="h-3 w-3 mr-1" /> Em andamento
                      </Badge>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingId ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle>
            <DialogDescription className="text-xs">
              Defina descrição, categoria, valor e prazo. O progresso vem das ações vinculadas no Plano.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Descrição *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Aposentadoria aos 60 anos com R$ 8.000/mês"
                rows={2}
                className="resize-none text-sm"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Categoria</Label>
                <SelectWithCustom
                  value={form.category}
                  onValueChange={(v) => setForm(p => ({ ...p, category: v }))}
                  options={categoryOptions}
                  inputPlaceholder="Outra..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Prioridade</Label>
                <SelectWithCustom
                  value={form.priority}
                  onValueChange={(v) => setForm(p => ({ ...p, priority: v }))}
                  options={[
                    { value: "alta", label: "🔴 Alta" },
                    { value: "media", label: "🟡 Média" },
                    { value: "baixa", label: "🔵 Baixa" },
                  ]}
                  inputPlaceholder="Ex: Urgente"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Valor alvo</Label>
                <CurrencyInput
                  value={form.target_amount}
                  onChange={(v) => setForm(p => ({ ...p, target_amount: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Prazo</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm(p => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>
            {form.target_amount && form.deadline && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground border border-border/50">
                <strong className="text-foreground">Aporte mensal estimado:</strong>{" "}
                {(() => {
                  const months = Math.max(1, Math.ceil((new Date(form.deadline + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
                  const monthly = (parseFloat(form.target_amount) || 0) / months;
                  return `${fmt(monthly)} / mês durante ${months} ${months === 1 ? "mês" : "meses"}`;
                })()}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveGoal} disabled={saving || !form.description.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar Objetivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Remover objetivo?</DialogTitle>
            <DialogDescription className="text-xs">
              As ações vinculadas serão desconectadas mas não removidas.
            </DialogDescription>
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
  tone: "primary" | "accent" | "success" | "destructive";
}) => {
  const toneCls = {
    primary:     "bg-primary/10 text-primary",
    accent:      "bg-accent/10 text-accent",
    success:     "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${toneCls}`}>
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
