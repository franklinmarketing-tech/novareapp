import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemRecommendationsPanel, type RiskProfile } from "@/components/parecer/SystemRecommendations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { sendClientEmail } from "@/lib/sendClientEmail";
import { ArrowLeft, Plus, Pencil, Trash2, ClipboardList, CheckCircle2, ChevronDown, ChevronRight, ArchiveRestore, History, Target, Flame, TrendingUp, Shield, PiggyBank, Banknote, GraduationCap, Home, Heart, Plane, Car, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

// 3D Goal Icons
import goalDividasIcon from "@/assets/icons/goal-dividas.png";
import goalReservaIcon from "@/assets/icons/goal-reserva.png";
import goalInvestimentosIcon from "@/assets/icons/goal-investimentos.png";
import goalAposentadoriaIcon from "@/assets/icons/goal-aposentadoria.png";
import goalImovelIcon from "@/assets/icons/goal-imovel.png";
import goalFamiliaIcon from "@/assets/icons/goal-familia.png";
import goalViagemIcon from "@/assets/icons/goal-viagem.png";
import goalVeiculoIcon from "@/assets/icons/goal-veiculo.png";
import goalEducacaoIcon from "@/assets/icons/goal-educacao.png";
import goalProtecaoIcon from "@/assets/icons/goal-protecao.png";
import goalDefaultIcon from "@/assets/icons/goal-default.png";
import goalCheckDoneIcon from "@/assets/icons/goal-check-done.png";

// ── Types ──────────────────────────────────────────────

interface ActionItem {
  id: string;
  action_plan_id: string;
  area: string;
  description: string;
  objective: string | null;
  responsible: string | null;
  deadline: string | null;
  financial_impact: number | null;
  status: string;
  parent_id: string | null;
  goal_id: string | null;
}

interface GoalInfo {
  id: string;
  description: string;
  target_amount: number | null;
  priority: string | null;
}

interface ActionFormData {
  area: string;
  description: string;
  objective: string;
  responsible: string;
  deadline: string;
  financial_impact: string;
  status: string;
  parent_id: string | null;
  goal_id: string | null;
}

// ── Constants ──────────────────────────────────────────

const emptyActionForm = (parentId?: string | null): ActionFormData => ({
  area: "despesas", description: "", objective: "", responsible: "Novare", deadline: "", financial_impact: "", status: "pendente", parent_id: parentId || null, goal_id: null,
});

const AREAS = [
  { value: "renda", label: "Renda" }, { value: "despesas", label: "Despesas" },
  { value: "dividas", label: "Dívidas" }, { value: "investimentos", label: "Investimentos" },
  { value: "protecao", label: "Proteção" }, { value: "impostos", label: "Impostos" },
];

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" }, { value: "em_andamento", label: "Em Andamento" }, { value: "concluido", label: "Concluído" },
];

const areaColors: Record<string, string> = {
  renda: "bg-success/10 text-success", despesas: "bg-accent/10 text-accent",
  dividas: "bg-destructive/10 text-destructive", investimentos: "bg-primary/10 text-primary",
  protecao: "bg-warning/10 text-warning", impostos: "bg-muted-foreground/10 text-muted-foreground",
};

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ── Main Component ─────────────────────────────────────

const AdminActionPlan = () => {
  const { clientId } = useClientId();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<RiskProfile>("balanceado");
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<string | null>(null);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [goals, setGoals] = useState<GoalInfo[]>([]);
  const [clientName, setClientName] = useState("");

  // Action dialog (for parent tasks only)
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionEditingId, setActionEditingId] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState<ActionFormData>(emptyActionForm());

  const [saving, setSaving] = useState(false);

  // Collapsed parent tasks
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Inline subtask creation
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [newChildText, setNewChildText] = useState("");
  const childInputRef = useRef<HTMLInputElement>(null);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const loadData = async (silent = false) => {
    if (!clientId) return;
    if (!silent) setLoading(true);

    const { data: client } = await supabase.from("clients").select("user_id").eq("id", clientId).single();
    if (client) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", client.user_id).single();
      if (profile) setClientName(profile.full_name);
    }

    let { data: plan } = await supabase.from("action_plans").select("id").eq("client_id", clientId).maybeSingle();
    if (!plan) {
      const { data: newPlan } = await supabase.from("action_plans").insert({ client_id: clientId }).select("id").single();
      plan = newPlan;
    }
    if (plan) {
      setPlanId(plan.id);
      const [actionItemsRes, goalsRes] = await Promise.all([
        supabase.from("action_items").select("*").eq("action_plan_id", plan.id).order("created_at", { ascending: false }),
        supabase.from("goals").select("id, description, target_amount, priority").eq("client_id", clientId).order("priority"),
      ]);
      setItems((actionItemsRes.data as ActionItem[]) || []);
      setGoals((goalsRes.data as GoalInfo[]) || []);
    }

    if (!silent) setLoading(false);
  };

  useEffect(() => { loadData(); }, [clientId]);

  // ── Action CRUD ──

  const openCreateParent = () => {
    setActionEditingId(null);
    setActionForm(emptyActionForm(null));
    setActionDialogOpen(true);
  };

  const openEditAction = (item: ActionItem) => {
    setActionEditingId(item.id);
    setActionForm({
      area: item.area, description: item.description, objective: item.objective || "",
      responsible: item.responsible || "Novare", deadline: item.deadline || "",
      financial_impact: item.financial_impact?.toString() || "", status: item.status,
      parent_id: item.parent_id, goal_id: item.goal_id,
    });
    setActionDialogOpen(true);
  };

  const saveAction = async () => {
    if (!planId || !actionForm.description) return;
    setSaving(true);
    const payload: any = {
      action_plan_id: planId, area: actionForm.area, description: actionForm.description,
      objective: actionForm.objective || null, responsible: actionForm.responsible || "Novare",
      deadline: actionForm.deadline || null, financial_impact: parseFloat(actionForm.financial_impact) || 0,
      status: actionForm.status, parent_id: actionForm.parent_id || null, goal_id: actionForm.goal_id || null,
    };
    if (actionEditingId) {
      await supabase.from("action_items").update(payload).eq("id", actionEditingId);
    } else {
      await supabase.from("action_items").insert(payload);
    }
    setActionDialogOpen(false);
    toast({ title: actionEditingId ? "Ação atualizada" : "Ação criada" });
    await loadData(true);
    setSaving(false);
  };

  // Inline subtask save
  const saveInlineChild = async (parentId: string, parentArea: string) => {
    if (!planId || !newChildText.trim()) return;
    setSaving(true);
    await supabase.from("action_items").insert([{
      action_plan_id: planId, area: parentArea as any, description: newChildText.trim(),
      status: "pendente" as any, parent_id: parentId,
    }]);
    setNewChildText("");
    setAddingChildFor(null);
    toast({ title: "Subtarefa criada" });
    await loadData(true);
    setSaving(false);
  };

  const startAddingChild = (parentId: string) => {
    setAddingChildFor(parentId);
    setNewChildText("");
    // Ensure parent is expanded
    setCollapsed((prev) => { const next = new Set(prev); next.delete(parentId); return next; });
    setTimeout(() => childInputRef.current?.focus(), 50);
  };

  const toggleItemStatus = async (item: ActionItem) => {
    const newStatus = item.status === "concluido" ? "pendente" : "concluido";
    await supabase.from("action_items").update({ status: newStatus as any }).eq("id", item.id);
    let updatedItems = items.map((i) => i.id === item.id ? { ...i, status: newStatus } : i);

    if (newStatus === "concluido" && clientId) {
      const parent = items.find((i) => i.id === item.parent_id);
      const siblings = updatedItems.filter((i) => i.parent_id === item.parent_id);
      const allDone = siblings.length > 0 && siblings.every((i) => i.status === "concluido");

      const allChildren = updatedItems.filter((i) => i.parent_id);
      const completedCount = allChildren.filter((i) => i.status === "concluido").length;
      const progress = allChildren.length > 0 ? Math.round((completedCount / allChildren.length) * 100) : 0;

      if (allDone && parent) {
        // Auto-archive: mark parent as concluido when all children are done
        await supabase.from("action_items").update({ status: "concluido" as any }).eq("id", parent.id);
        updatedItems = updatedItems.map((i) => i.id === parent.id ? { ...i, status: "concluido" } : i);
        toast({ title: "🎉 Objetivo concluído!", description: `"${parent.description}" foi arquivado automaticamente.` });
        sendClientEmail(clientId, "goal-achieved", { goalDescription: parent.description });
      } else {
        sendClientEmail(clientId, "task-completed", { taskDescription: item.description, overallProgress: progress });
      }
    }

    setItems(updatedItems);
  };

  const deleteAction = async (id: string) => {
    await supabase.from("action_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Ação removida" });
  };

  // ── Finalize / Restore ──

  const finalizeTask = async (parentId: string) => {
    await supabase.from("action_items").update({ status: "concluido" as any }).eq("id", parentId);
    // Also mark all children as concluido
    const children = items.filter((i) => i.parent_id === parentId);
    if (children.length > 0) {
      await supabase.from("action_items").update({ status: "concluido" as any }).in("id", children.map((c) => c.id));
    }
    setItems((prev) => prev.map((i) => i.id === parentId || i.parent_id === parentId ? { ...i, status: "concluido" } : i));
    toast({ title: "Tarefa finalizada e movida para o histórico" });
  };

  const restoreTask = async (parentId: string) => {
    await supabase.from("action_items").update({ status: "pendente" as any }).eq("id", parentId);
    setItems((prev) => prev.map((i) => i.id === parentId ? { ...i, status: "pendente" } : i));
    toast({ title: "Tarefa restaurada" });
  };

  // ── Computed ──

  const allParentTasks = items.filter((i) => !i.parent_id);
  const parentTasks = allParentTasks.filter((i) => i.status !== "concluido");
  const archivedTasks = allParentTasks.filter((i) => i.status === "concluido");
  const childrenOf = (parentId: string) => items.filter((i) => i.parent_id === parentId);
  // Progress is based on parent tasks (action plans), NOT subtasks
  const activeParentCount = parentTasks.length;
  const completedParentCount = archivedTasks.length;
  const totalParentCount = allParentTasks.length;
  const overallPct = totalParentCount > 0 ? Math.round((completedParentCount / totalParentCount) * 100) : 0;

  // Group by goal — show ALL goals, even without tasks
  const goalGroups = goals.map(g => {
    const tasks = parentTasks.filter(t => t.goal_id === g.id);
    const archivedGoalTasks = archivedTasks.filter(t => t.goal_id === g.id);
    const totalGoalTasks = tasks.length + archivedGoalTasks.length;
    const doneGoalTasks = archivedGoalTasks.length;
    const goalPct = totalGoalTasks > 0 ? Math.round((doneGoalTasks / totalGoalTasks) * 100) : 0;
    return { goal: g, tasks, totalChildren: totalGoalTasks, doneChildren: doneGoalTasks, pct: goalPct };
  });
  const ungroupedTasks = parentTasks.filter(t => !t.goal_id || !goals.some(g => g.id === t.goal_id));

  // Bar chart data for goal progress
  const barData = useMemo(() => {
    return goalGroups.map(g => ({
      name: g.goal.description.length > 18 ? g.goal.description.slice(0, 18) + "…" : g.goal.description,
      concluidas: g.doneChildren,
      pendentes: g.totalChildren - g.doneChildren,
    }));
  }, [goalGroups]);

  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const toggleGoal = (goalId: string) => setOpenGoalId(prev => prev === goalId ? null : goalId);

  // Smart goal type detection based on description keywords
  const goalTypeConfig = [
    { keywords: ["dívida", "divida", "quitar", "pagar dívida", "sair das dívidas"], accent: "#f87171", bg: "linear-gradient(145deg, #2a1215 0%, #7f1d1d 50%, #2a1215 100%)", icon3d: goalDividasIcon, label: "Dívidas" },
    { keywords: ["emergência", "emergencia", "reserva"], accent: "#fbbf24", bg: "linear-gradient(145deg, #2d2a1a 0%, #422006 50%, #2d2a1a 100%)", icon3d: goalReservaIcon, label: "Reserva" },
    { keywords: ["invest", "aplicar", "renda passiva", "começar a investir"], accent: "#34d399", bg: "linear-gradient(145deg, #0f2d2a 0%, #064e3b 50%, #0f2d2a 100%)", icon3d: goalInvestimentosIcon, label: "Investimentos" },
    { keywords: ["aposentadoria", "previdência", "previdencia", "futuro"], accent: "#a78bfa", bg: "linear-gradient(145deg, #1e1a33 0%, #312e81 50%, #1e1a33 100%)", icon3d: goalAposentadoriaIcon, label: "Aposentadoria" },
    { keywords: ["casa", "imóvel", "imovel", "apartamento", "moradia"], accent: "#38bdf8", bg: "linear-gradient(145deg, #0c2a3d 0%, #0c4a6e 50%, #0c2a3d 100%)", icon3d: goalImovelIcon, label: "Imóvel" },
    { keywords: ["filho", "filhos", "educação", "educacao", "faculdade", "escola", "vida melhor"], accent: "#f472b6", bg: "linear-gradient(145deg, #2d1a28 0%, #831843 50%, #2d1a28 100%)", icon3d: goalFamiliaIcon, label: "Família" },
    { keywords: ["viagem", "viajar", "férias"], accent: "#22d3ee", bg: "linear-gradient(145deg, #0c2a33 0%, #155e75 50%, #0c2a33 100%)", icon3d: goalViagemIcon, label: "Viagem" },
    { keywords: ["carro", "veículo", "veiculo", "moto"], accent: "#94a3b8", bg: "linear-gradient(145deg, #111827 0%, #1e293b 50%, #111827 100%)", icon3d: goalVeiculoIcon, label: "Veículo" },
    { keywords: ["curso", "estudo", "formação", "formacao", "certificação"], accent: "#818cf8", bg: "linear-gradient(145deg, #1a1a33 0%, #312e81 50%, #1a1a33 100%)", icon3d: goalEducacaoIcon, label: "Educação" },
    { keywords: ["protecao", "proteção", "seguro", "segurança"], accent: "#2dd4bf", bg: "linear-gradient(145deg, #0d2926 0%, #134e4a 50%, #0d2926 100%)", icon3d: goalProtecaoIcon, label: "Proteção" },
  ];

  const getGoalStyle = (description: string) => {
    const lower = description.toLowerCase();
    for (const cfg of goalTypeConfig) {
      if (cfg.keywords.some(k => lower.includes(k))) {
        return { accent: cfg.accent, bg: cfg.bg, icon3d: cfg.icon3d, badge: cfg.label };
      }
    }
    return { accent: "#60a5fa", bg: "linear-gradient(145deg, #111c2e 0%, #1e3a5f 50%, #111c2e 100%)", icon3d: goalDefaultIcon, badge: "Objetivo" };
  };

  const [showHistory, setShowHistory] = useState(false);

  const renderTaskCard = (parent: ActionItem, idx: number = 0) => {
    const children = childrenOf(parent.id);
    const doneCount = children.filter((c) => c.status === "concluido").length;
    const pct = children.length > 0 ? Math.round((doneCount / children.length) * 100) : 0;
    const isCollapsed = collapsed.has(parent.id);
    const isAddingChild = addingChildFor === parent.id;
    const areaLabel = AREAS.find((a) => a.value === parent.area)?.label || parent.area;

    return (
      <motion.div
        key={parent.id}
        initial={{ opacity: 0, x: -30, rotateY: -8 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ perspective: "800px" }}
      >
        <div
          className="relative rounded-2xl overflow-hidden bg-card transition-all duration-300 hover:-translate-y-0.5"
          style={{
            transformStyle: "preserve-3d",
            border: "1px solid rgba(255,255,255,0.06)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            borderBottom: "1px solid rgba(0,0,0,0.15)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 8px 30px -8px rgba(0,0,0,0.2), 0 2px 8px -2px rgba(0,0,0,0.1)",
          }}
        >
          {/* Colored accent strip */}
          <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-2xl ${areaColors[parent.area]?.split(" ")[0] || "bg-muted"}`} />

          <div className="p-4 pl-6 flex items-start gap-3">
            <button onClick={() => toggleCollapse(parent.id)} className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
              <motion.div animate={{ rotate: isCollapsed ? 0 : 90 }} transition={{ duration: 0.2 }}>
                <ChevronRight className="h-6 w-6" />
              </motion.div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-foreground text-sm">{parent.description}</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${areaColors[parent.area] || "bg-muted text-muted-foreground"}`}>
                  {areaLabel}
                </span>
              </div>
              {parent.objective && <p className="text-xs text-muted-foreground mb-2">{parent.objective}</p>}
              {children.length > 0 && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 max-w-[200px] h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-success to-success/70"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{doneCount}/{children.length}</span>
                  <span className="text-xs font-bold text-foreground">{pct}%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {children.length > 0 && doneCount === children.length && (
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0.5" onClick={() => finalizeTask(parent.id)} title="Finalizar e mover para histórico">
                  <img src={goalCheckDoneIcon} alt="Concluir" className="w-6 h-6 object-contain drop-shadow-sm" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startAddingChild(parent.id)} title="Adicionar subtarefa">
                <Plus className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAction(parent)}>
                <Pencil className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAction(parent.id)}>
                <Trash2 className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {!isCollapsed && (children.length > 0 || isAddingChild) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/40 bg-muted/10 px-4 pl-6 py-2 space-y-1">
                  {children.map((child, ci) => {
                    const isDone = child.status === "concluido";
                    return (
                      <motion.div
                        key={child.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: ci * 0.05 }}
                        className={`flex items-center gap-3 py-1.5 px-2 rounded-lg transition-all duration-200 ${isDone ? "opacity-60" : "hover:bg-muted/40"}`}
                      >
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={() => toggleItemStatus(child)}
                          className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{child.description}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditAction(child)}>
                            <Pencil className="h-6 w-6" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteAction(child.id)}>
                            <Trash2 className="h-6 w-6" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}

                  {isAddingChild && (
                    <div className="flex items-center gap-2 py-1.5 px-2">
                      <div className="w-4 h-4 rounded border-2 border-border shrink-0" />
                      <Input
                        ref={childInputRef}
                        value={newChildText}
                        onChange={(e) => setNewChildText(e.target.value)}
                        placeholder="Descreva a subtarefa..."
                        className="h-8 text-sm flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newChildText.trim()) saveInlineChild(parent.id, parent.area);
                          if (e.key === "Escape") { setAddingChildFor(null); setNewChildText(""); }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8 bg-success hover:bg-success/90 text-success-foreground text-xs px-3"
                        disabled={saving || !newChildText.trim()}
                        onClick={() => saveInlineChild(parent.id, parent.area)}
                      >
                        {saving ? "..." : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs px-2"
                        onClick={() => { setAddingChildFor(null); setNewChildText(""); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return <LoadingState variant="page" rows={4} />;
  }

  return (
    <div>
      {/* ── PROGRESSO GERAL — 3D Hero Card ────────── */}
      {totalParentCount > 0 && (
        <div className="mb-6 relative" style={{ perspective: "800px" }}>
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, #0d1b2a 0%, #1b3a5c 35%, #1a2d4a 65%, #0d1b2a 100%)",
              border: "1px solid rgba(96,165,250,0.12)",
              boxShadow: "0 1px 0 rgba(96,165,250,0.08) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 12px 40px -10px rgba(0,0,0,0.5), 0 4px 12px -4px rgba(0,0,0,0.3)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Inner highlight border for 3D depth */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              border: "1px solid transparent",
              borderTop: "1px solid rgba(96,165,250,0.15)",
              borderLeft: "1px solid rgba(96,165,250,0.08)",
              borderBottom: "1px solid rgba(0,0,0,0.3)",
              borderRight: "1px solid rgba(0,0,0,0.15)",
            }} />

            {/* Decorative glow */}
            <motion.div
              className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)" }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="absolute bottom-0 left-0 w-48 h-20 pointer-events-none"
              style={{ background: "linear-gradient(45deg, rgba(200,120,80,0.06) 0%, transparent 100%)" }}
            />

            <div className="relative z-10 p-6">
              {/* Top label */}
              <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: "rgba(96,165,250,0.6)" }}>Progresso Geral</span>

              {/* Big percentage */}
              <div className="flex items-end justify-between mt-2 mb-4">
                <div className="flex items-baseline gap-2">
                  <motion.span
                    className="text-5xl font-black text-white tracking-tight"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    {overallPct}%
                  </motion.span>
                  {overallPct > 0 && (
                    <TrendingUp className="h-6 w-6 mb-1" style={{ color: "rgba(96,165,250,0.7)" }} />
                  )}
                </div>
                <span className="text-[11px] font-medium text-white/30 px-3 py-1.5 rounded-lg" style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2) inset",
                }}>
                  {completedParentCount} de {totalParentCount} concluídos
                </span>
              </div>

              {/* 3D Progress bar */}
              <div className="relative h-3 rounded-full overflow-hidden" style={{
                background: "rgba(255,255,255,0.05)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4) inset, 0 1px 0 rgba(255,255,255,0.04)",
              }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                >
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #60a5fa 0%, #2563eb 50%, #1d4ed8 100%)" }} />
                  <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/25 to-transparent rounded-t-full" />
                  <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/20 to-transparent" />
                  {/* Shine sweep */}
                  <motion.div
                    className="absolute inset-y-0 w-16"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }}
                    animate={{ x: ["-64px", "400px"] }}
                    transition={{ duration: 3, delay: 1.5, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }}
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RECOMENDAÇÕES IA — 3 VERTENTES ──────────── */}
      {clientId && (
        <Card className="border-border/40 shadow-soft rounded-2xl mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Lightbulb className="h-5 w-5 text-accent" />
              </div>
              Recomendações IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Seletor de vertente */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {([
                { key: "balanceado" as RiskProfile, label: "Equilibrado", desc: "Ajustes sustentáveis de longo prazo", color: "bg-blue-500/10 border-blue-400/40 text-blue-700 dark:text-blue-300" },
                { key: "ponderado" as RiskProfile, label: "Conservador", desc: "Segurança, quitação de dívidas e reserva", color: "bg-emerald-500/10 border-emerald-400/40 text-emerald-700 dark:text-emerald-300" },
                { key: "radical" as RiskProfile, label: "Agressivo", desc: "Aceleração máxima de metas", color: "bg-orange-500/10 border-orange-400/40 text-orange-700 dark:text-orange-300" },
              ] as const).map((plan) => (
                <button
                  key={plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  className={`flex-1 min-w-[140px] text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 ${
                    selectedPlan === plan.key
                      ? `${plan.color} border-current shadow-sm`
                      : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide">{plan.label}</p>
                  <p className="text-[11px] mt-0.5 opacity-80">{plan.desc}</p>
                </button>
              ))}
            </div>
            <SystemRecommendationsPanel clientId={clientId} riskProfile={selectedPlan} />
          </CardContent>
        </Card>
      )}

      {/* ── TAREFAS PAI + FILHOS ────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Tarefas</h2>
        <Button onClick={openCreateParent} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-6 w-6" /> Nova Tarefa
        </Button>
      </div>

      {goals.length === 0 && parentTasks.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={ClipboardList}
              title="Nenhum objetivo cadastrado"
              description="Cadastre objetivos na aba Objetivos primeiro para começar a planejar ações."
              tone="accent"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* ── Goal Accordion Cards — 2 per row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goalGroups.map(({ goal, tasks, totalChildren, doneChildren, pct }, idx) => {
              const isOpen = openGoalId === goal.id;
              const config = getGoalStyle(goal.description);

              // Check if we need to render expanded panel after this item
              const isEndOfRow = idx % 2 === 1 || idx === goalGroups.length - 1;
              const openInThisRow = (() => {
                if (!isEndOfRow || !openGoalId) return null;
                const rowStart = idx % 2 === 1 ? idx - 1 : idx;
                const rowEnd = idx;
                const found = goalGroups.slice(rowStart, rowEnd + 1).find(g => g.goal.id === openGoalId);
                return found || null;
              })();

              return (
                <React.Fragment key={goal.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    {/* Goal Card — Clean dark card style */}
                    <div
                      onClick={() => toggleGoal(goal.id)}
                      className={`
                        group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-400 border border-white/[0.06]
                        ${isOpen
                          ? 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] scale-[1.01] ring-1 ring-white/10'
                          : 'shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3)] hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.45)] hover:-translate-y-0.5'
                        }
                      `}
                      style={{ background: config.bg }}
                    >
                      {/* Floating 3D icon — subtle background decoration */}
                      <motion.div
                        className="absolute -top-3 -right-3 w-28 h-28 pointer-events-none"
                        animate={{ y: [0, -3, 0], rotate: [0, 2, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <img src={config.icon3d} alt="" className="w-full h-full object-contain opacity-[0.12] group-hover:opacity-[0.2] transition-opacity duration-700" loading="lazy" />
                      </motion.div>

                      <div className="relative z-10 p-5">
                        {/* Top row: label + badge */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: `${config.accent}99` }}>
                            {config.badge}
                          </span>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.08] backdrop-blur-sm shrink-0">
                            <ChevronDown className="h-6 w-6 text-white/50" />
                          </motion.div>
                        </div>

                        {/* Main content: icon + title + value */}
                        <div className="flex items-center gap-3 mb-4">
                          <motion.div
                            className="w-11 h-11 shrink-0 drop-shadow-lg"
                            whileHover={{ scale: 1.1, rotate: -4 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <img src={config.icon3d} alt="" className="w-full h-full object-contain" loading="lazy" />
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-white text-[15px] leading-snug truncate">{goal.description}</h3>
                          </div>
                        </div>

                        {/* Big progress value + trend */}
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-3xl font-black text-white tracking-tight">{pct}%</span>
                            <span className="ml-1.5 text-xs font-medium" style={{ color: config.accent }}>
                              {doneChildren}/{totalChildren}
                              {pct > 0 && <TrendingUp className="inline-block h-6 w-6 ml-1 -mt-0.5" />}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-white/30 bg-white/[0.06] px-2.5 py-1 rounded-md">
                            {tasks.length} {tasks.length === 1 ? "ação" : "ações"}
                          </span>
                        </div>

                        {/* Bottom progress bar */}
                        <div className="mt-3">
                          <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.08]">
                            <motion.div className="h-full rounded-full" style={{ backgroundColor: config.accent }}
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: idx * 0.08, ease: "easeOut" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {isEndOfRow && openInThisRow && (() => {
                    const expandConfig = getGoalStyle(openInThisRow.goal.description);
                    return (
                    <motion.div
                      key={`expand-${openInThisRow.goal.id}`}
                      className="md:col-span-2"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      layout
                    >
                      <div className="relative">
                        {/* Connector line */}
                        <div className="flex justify-center mb-2">
                          <motion.div
                            className="w-0.5 h-4 rounded-full"
                            style={{ background: `linear-gradient(to bottom, ${expandConfig.accent}60, transparent)` }}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          />
                        </div>
                        <motion.div
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                          className="rounded-2xl border border-white/[0.06] overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]"
                          style={{ background: expandConfig.bg }}
                        >
                          {/* Floating icon decoration */}
                          <motion.div
                            className="absolute top-2 right-4 w-16 h-16 pointer-events-none"
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <img src={expandConfig.icon3d} alt="" className="w-full h-full object-contain opacity-[0.1]" loading="lazy" />
                          </motion.div>

                          <div className="relative z-10 p-5">
                            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.08]">
                              <img src={expandConfig.icon3d} alt="" className="w-8 h-8 object-contain drop-shadow-lg" loading="lazy" />
                              <span className="text-sm font-bold text-white">{openInThisRow.goal.description}</span>
                              <span className="ml-auto text-[10px] font-medium px-2.5 py-1 rounded-md bg-white/[0.08] text-white/40">
                                {openInThisRow.tasks.length} {openInThisRow.tasks.length === 1 ? "ação" : "ações"}
                              </span>
                            </div>
                            {openInThisRow.tasks.length > 0 ? (
                              <div className="space-y-3">
                                {openInThisRow.tasks.map((parent, ti) => renderTaskCard(parent, ti))}
                              </div>
                            ) : (
                              <div className="py-8 text-center">
                                <ClipboardList className="h-8 w-8 text-white/20 mx-auto mb-2" />
                                <p className="text-white/50 text-sm">Nenhuma ação cadastrada para este objetivo.</p>
                                <p className="text-white/30 text-xs mt-1">Clique em "Nova Tarefa" e vincule a este objetivo.</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </div>

          {/* Ungrouped tasks */}
          {ungroupedTasks.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">Sem objetivo vinculado</h3>
              </div>
              <div className="space-y-3">
                {ungroupedTasks.map((parent) => renderTaskCard(parent))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTÓRICO ────────────────────────────────── */}
      {archivedTasks.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowHistory((p) => !p)}
            className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-6 w-6" />
            Histórico ({archivedTasks.length})
            {showHistory ? <ChevronDown className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
          </button>

          {showHistory && (
            <div className="space-y-3">
              {archivedTasks.map((parent) => {
                const children = childrenOf(parent.id);
                const isCollapsed = collapsed.has(parent.id);

                return (
                  <Card key={parent.id} className="overflow-hidden opacity-70 hover:opacity-100 transition-opacity">
                    <CardContent className="p-0">
                      <div className="p-4 flex items-start gap-3">
                        <button onClick={() => toggleCollapse(parent.id)} className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
                          {isCollapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                            <span className="font-semibold text-muted-foreground text-sm line-through">{parent.description}</span>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${areaColors[parent.area] || "bg-muted text-muted-foreground"}`}>
                              {AREAS.find((a) => a.value === parent.area)?.label || parent.area}
                            </span>
                            <Badge variant="outline" className="text-xs border-success/30 text-success">Finalizada</Badge>
                          </div>
                          {children.length > 0 && (
                            <p className="text-xs text-muted-foreground">{children.length} subtarefa{children.length > 1 ? "s" : ""} concluída{children.length > 1 ? "s" : ""}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => restoreTask(parent.id)} title="Restaurar tarefa">
                            <ArchiveRestore className="h-6 w-6" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAction(parent.id)}>
                            <Trash2 className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>

                      {!isCollapsed && children.length > 0 && (
                        <div className="border-t border-border/50 bg-muted/20 px-4 py-2 space-y-1">
                          {children.map((child) => (
                            <div key={child.id} className="flex items-center gap-3 py-1.5 px-2 opacity-60">
                              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                              <p className="text-sm line-through text-muted-foreground">{child.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── GRÁFICO DE PROGRESSO 3D ───────────────────── */}
      {goalGroups.length > 0 && goalGroups.some(g => g.totalChildren > 0) && (
        <div className="mt-8">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, #111c2e 0%, #1e3a5f 40%, #111c2e 100%)",
              border: "1px solid rgba(96,165,250,0.12)",
              borderTop: "1px solid rgba(96,165,250,0.18)",
              borderBottom: "1px solid rgba(0,0,0,0.3)",
              boxShadow: "0 1px 0 rgba(96,165,250,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 12px 40px -10px rgba(0,0,0,0.5), 0 4px 12px -4px rgba(0,0,0,0.3)",
            }}
          >
            {/* Decorative glow */}
            <motion.div
              className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)" }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-medium tracking-widest uppercase text-blue-400/60">Progresso por Objetivo</span>
                <span className="text-[10px] font-medium text-white/20 bg-white/[0.06] px-2.5 py-1 rounded-md">
                  {goalGroups.length} objetivo{goalGroups.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-4">
                {goalGroups.filter(g => g.totalChildren > 0).map((g, i) => {
                  const config = getGoalStyle(g.goal.description);
                  const pct = g.pct;
                  const maxTotal = Math.max(...goalGroups.map(gg => gg.totalChildren), 1);
                  const barWidthPct = (g.totalChildren / maxTotal) * 100;

                  return (
                    <motion.div
                      key={g.goal.id}
                      initial={{ opacity: 0, x: -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <motion.div
                          className="w-9 h-9 shrink-0"
                          whileHover={{ scale: 1.15, rotate: -5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <img src={config.icon3d} alt="" className="w-full h-full object-contain drop-shadow-lg" loading="lazy" />
                        </motion.div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-white truncate max-w-[200px]">{g.goal.description}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-white/30">{g.doneChildren}/{g.totalChildren}</span>
                              <span className="text-sm font-black text-white">{pct}%</span>
                            </div>
                          </div>

                          {/* 3D Bar */}
                          <div className="relative h-7 rounded-lg overflow-hidden" style={{ width: `${barWidthPct}%`, minWidth: "60px" }}>
                            {/* Background bar with depth */}
                            <div className="absolute inset-0 rounded-lg bg-white/[0.06] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]" />

                            {/* Filled portion with 3D effect */}
                            <motion.div
                              className="absolute inset-y-0 left-0 rounded-lg overflow-hidden"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1.2, delay: i * 0.15 + 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                            >
                              <div
                                className="absolute inset-0"
                                style={{ background: `linear-gradient(180deg, ${config.accent}dd 0%, ${config.accent}88 100%)` }}
                              />
                              {/* Top shine */}
                              <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/20 to-transparent rounded-t-lg" />
                              {/* Bottom shadow */}
                              <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/20 to-transparent" />
                              {/* Animated shine sweep */}
                              <motion.div
                                className="absolute inset-y-0 w-12"
                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
                                animate={{ x: ["-48px", "300px"] }}
                                transition={{ duration: 2.5, delay: i * 0.2 + 1, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
                              />
                            </motion.div>

                            {/* 3D side edge */}
                            <motion.div
                              className="absolute top-0 right-0 w-[3px] h-full rounded-r-lg"
                              style={{ background: `linear-gradient(180deg, ${config.accent}44 0%, ${config.accent}22 100%)` }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.15 + 1 }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Dialog (parent tasks & edit) ───────── */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionEditingId ? (actionForm.parent_id ? "Editar Subtarefa" : "Editar Tarefa") : "Nova Tarefa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!actionForm.parent_id && goals.length > 0 && (
              <div className="space-y-2">
                <Label>Objetivo vinculado</Label>
                <Select value={actionForm.goal_id || "__none__"} onValueChange={(v) => setActionForm((p) => ({ ...p, goal_id: v === "__none__" ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione um objetivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem objetivo</SelectItem>
                    {goals.map((g) => <SelectItem key={g.id} value={g.id}>{g.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!actionForm.parent_id && (
              <div className="space-y-2">
                <Label>Área</Label>
                <Select value={actionForm.area} onValueChange={(v) => setActionForm((p) => ({ ...p, area: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    <SelectItem value="__custom_area__" className="text-primary font-medium border-t mt-1 pt-1">✏️ Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Título da tarefa</Label>
              <Textarea value={actionForm.description} onChange={(e) => setActionForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <SelectWithCustom
                  value={actionForm.responsible}
                  onValueChange={(v) => setActionForm((p) => ({ ...p, responsible: v }))}
                  options={[
                    { value: "Novare", label: "Novare" },
                    { value: "Cliente", label: "Cliente" },
                    { value: "Ambos", label: "Ambos" },
                  ]}
                  inputPlaceholder="Ex: Contador, Advogado..."
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={actionForm.deadline} onChange={(e) => setActionForm((p) => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Impacto financeiro (R$) <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input type="number" value={actionForm.financial_impact} onChange={(e) => setActionForm((p) => ({ ...p, financial_impact: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveAction} disabled={saving || !actionForm.description} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {saving ? "Salvando..." : actionEditingId ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminActionPlan;
