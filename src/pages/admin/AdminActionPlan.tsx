// V9: Plano de Acao reformulado
// Fluxo: gerar com IA (popup) -> 3 planos (A/B/C) -> aplicar -> plano em andamento
import { useEffect, useMemo, useState } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Target,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Plus,
  Wand2,
  Calendar,
  TrendingUp,
  ClipboardList,
  RefreshCw,
  Lightbulb,
  PenLine,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { motion, AnimatePresence } from "framer-motion";

// ── Tipos ───────────────────────────────────────────────

interface ActionItem {
  id: string;
  action_plan_id: string;
  area: string;
  description: string;
  objective: string | null;
  deadline: string | null;
  financial_impact: number | null;
  status: string;
  parent_id: string | null;
}

interface PlanRow {
  id: string;
  client_id: string;
  objective: string | null;
  applied_variant: string | null;
  applied_at: string | null;
  source_parecer_id: string | null;
  custom_instructions: string | null;
  ai_generated_plans: AIPlan[] | null;
  goal_id: string | null;
}

interface ParecerOption {
  id: string;
  title: string;
  updated_at: string;
}

interface GoalOption {
  id: string;
  description: string;
  target_amount: number | null;
  priority: string | null;
  deadline: string | null;
}

interface AIAction {
  area: string;
  description: string;
  objective: string;
  financial_impact: number;
  deadline_offset_days: number;
}

interface AIPlan {
  letter: "A" | "B" | "C";
  title: string;
  approach: string;
  horizon_months: number;
  monthly_impact: number;
  actions: AIAction[];
}

// ── Constantes ──────────────────────────────────────────

const AREA_LABEL: Record<string, string> = {
  renda: "Renda",
  despesas: "Despesas",
  dividas: "Dívidas",
  investimentos: "Investimentos",
  protecao: "Proteção",
  impostos: "Impostos",
};

const AREA_TONE: Record<string, string> = {
  renda: "bg-success/10 text-success border-success/25",
  despesas: "bg-red-500/10 text-red-600 border-red-500/25",
  dividas: "bg-orange-500/10 text-orange-600 border-orange-500/25",
  investimentos: "bg-blue-500/10 text-blue-600 border-blue-500/25",
  protecao: "bg-purple-500/10 text-purple-600 border-purple-500/25",
  impostos: "bg-amber-500/10 text-amber-600 border-amber-500/25",
};

const VARIANT_INFO: Record<string, { label: string; tone: string; ring: string }> = {
  A: {
    label: "Cauteloso",
    tone: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    ring: "ring-blue-500/30",
  },
  B: {
    label: "Equilibrado",
    tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    ring: "ring-emerald-500/30",
  },
  C: {
    label: "Acelerado",
    tone: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    ring: "ring-orange-500/30",
  },
};

const fmtBRL = (v?: number | null) =>
  typeof v === "number"
    ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : "R$ 0";

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

// ── Componente principal ────────────────────────────────

const AdminActionPlan = () => {
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [pareceres, setPareceres] = useState<ParecerOption[]>([]);
  const [goalsList, setGoalsList] = useState<GoalOption[]>([]);

  // Popup de geracao
  const [genOpen, setGenOpen] = useState(false);
  const [genPhase, setGenPhase] = useState<"form" | "generating" | "result">("form");
  const [genParecerId, setGenParecerId] = useState<string>("__none__");
  const [genGoalId, setGenGoalId] = useState<string>("");
  const [genRefinement, setGenRefinement] = useState("");
  const [genInstructions, setGenInstructions] = useState("");
  const [generatedPlans, setGeneratedPlans] = useState<AIPlan[]>([]);
  const [applyingVariant, setApplyingVariant] = useState<string | null>(null);

  // V9: refinamento de plano individual (modal pequeno)
  const [refineTarget, setRefineTarget] = useState<AIPlan | null>(null);
  const [refineInstructions, setRefineInstructions] = useState("");
  const [refiningVariant, setRefiningVariant] = useState<string | null>(null);

  // Adicao manual
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    area: "despesas",
    description: "",
    objective: "",
    financial_impact: "",
    deadline: "",
  });

  // ── Carga ─────────────────────────────────────────
  const loadAll = async (silent = false) => {
    if (!clientId) return;
    if (!silent) setLoading(true);

    // Garante action_plans para o cliente
    let { data: planRow } = await supabase
      .from("action_plans")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();
    if (!planRow) {
      const { data: created } = await supabase
        .from("action_plans")
        .insert({ client_id: clientId })
        .select("*")
        .single();
      planRow = created;
    }
    if (planRow) setPlan(planRow as unknown as PlanRow);

    if (planRow) {
      const [actionsRes, paRes, goalsRes] = await Promise.all([
        supabase
          .from("action_items")
          .select("*")
          .eq("action_plan_id", planRow.id)
          .is("parent_id", null)
          .order("created_at", { ascending: true }),
        supabase
          .from("consultant_notes")
          .select("id, title, updated_at")
          .eq("client_id", clientId)
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase
          .from("goals")
          .select("id, description, target_amount, priority, deadline")
          .eq("client_id", clientId)
          .order("priority"),
      ]);
      setItems((actionsRes.data as ActionItem[]) || []);
      setPareceres((paRes.data as ParecerOption[]) || []);
      setGoalsList((goalsRes.data as GoalOption[]) || []);
    }

    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Pre-popula genGoalId quando ja existe um goal_id no plano em cache
  // (precisa ficar antes de qualquer early return para nao violar regras de hooks)
  useEffect(() => {
    if (plan?.ai_generated_plans && Array.isArray(plan.ai_generated_plans) && plan.ai_generated_plans.length > 0 && plan?.goal_id && !genGoalId) {
      setGenGoalId(plan.goal_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.goal_id, plan?.ai_generated_plans]);

  // ── Computado ─────────────────────────────────────
  const completed = items.filter((i) => i.status === "concluido").length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalImpact = items.reduce((s, i) => s + (i.financial_impact || 0), 0);
  const hasActivePlan = Boolean(plan?.applied_variant && plan?.objective);

  // ── Acoes do popup de geracao ─────────────────────
  const openGenerate = () => {
    setGenGoalId("");
    setGenRefinement("");
    setGenInstructions("");
    setGenParecerId("__none__");
    setGeneratedPlans([]);
    setGenPhase("form");
    setGenOpen(true);
  };

  const runGenerate = async () => {
    if (!clientId || !genGoalId || !plan?.id) return;
    setGenPhase("generating");
    try {
      const { data, error } = await supabase.functions.invoke("generate-recommendations", {
        body: {
          clientId,
          goalId: genGoalId,
          refinement: genRefinement.trim() || null,
          parecerId: genParecerId === "__none__" ? null : genParecerId,
          customInstructions: genInstructions.trim() || null,
        },
      });
      if (error) throw error;
      const plans = (data?.plans || []) as AIPlan[];
      if (!plans.length) throw new Error("IA não retornou planos");

      // V9: persiste imediatamente no banco — os 3 cards aparecem inline na tela
      // (sem precisar de phase=result no popup)
      const sourceParecer = genParecerId === "__none__" ? null : genParecerId;
      const custom = genInstructions.trim() || null;
      const { error: upErr } = await supabase
        .from("action_plans")
        .update({
          goal_id: genGoalId,
          source_parecer_id: sourceParecer,
          custom_instructions: custom,
          ai_generated_plans: plans as any,
        })
        .eq("id", plan.id);

      if (upErr) {
        console.error("[AdminActionPlan] Falha ao persistir planos:", upErr);
        toast({
          title: "Planos gerados, mas não foi possível salvar no banco",
          description: upErr.message,
          variant: "destructive",
        });
      }

      // CORRECAO: atualiza o estado local IMEDIATAMENTE para que os 3 cards
      // apareçam mesmo se loadAll() ainda nao tiver retornado (ou se o write
      // for bloqueado por RLS). loadAll re-sincroniza em seguida.
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              goal_id: genGoalId,
              source_parecer_id: sourceParecer,
              custom_instructions: custom,
              ai_generated_plans: plans,
            }
          : prev,
      );
      setGeneratedPlans(plans);
      setGenOpen(false);
      setGenPhase("form");
      toast({
        title: "3 planos gerados",
        description: "Escolha o plano que melhor se encaixa ou refine com a IA.",
      });
      // Re-sincroniza com o banco em background APENAS se o write deu certo
      // (caso contrario o reload sobrescreveria o estado otimista com null)
      if (!upErr) {
        loadAll(true).catch((e) => console.error("[AdminActionPlan] loadAll pós-gen falhou:", e));
      }
    } catch (e: any) {
      console.error("[AdminActionPlan] runGenerate erro:", e);
      toast({
        title: "Erro ao gerar planos",
        description: e?.message || "Tente novamente",
        variant: "destructive",
      });
      setGenPhase("form");
    }
  };

  // V9: refina uma variante especifica com a IA
  const runRefine = async () => {
    if (!refineTarget || !plan?.id || !refineInstructions.trim() || !clientId) return;
    const targetLetter = refineTarget.letter;
    setRefiningVariant(targetLetter);
    try {
      // Reusa generate-recommendations passando refinement com a instrucao
      // de ajuste alem do refinamento original. A IA gera novos 3 planos —
      // pegamos APENAS a variante alvo (mesma letra) e atualizamos no cache.
      const refinementMsg = [
        `Refine APENAS o plano ${targetLetter} (atual: "${refineTarget.title}") com este ajuste:`,
        refineInstructions.trim(),
      ].join("\n");

      const { data, error } = await supabase.functions.invoke("generate-recommendations", {
        body: {
          clientId,
          goalId: plan.goal_id || genGoalId,
          refinement: refinementMsg,
          parecerId: plan.source_parecer_id || null,
          customInstructions: plan.custom_instructions || null,
        },
      });
      if (error) throw error;
      const newPlans = (data?.plans || []) as AIPlan[];
      const refinedVariant = newPlans.find((p) => p.letter === targetLetter);
      if (!refinedVariant) throw new Error("IA não retornou o plano refinado");

      // Atualiza so a variante alvo no cache do banco
      const cached = Array.isArray(plan.ai_generated_plans)
        ? (plan.ai_generated_plans as AIPlan[])
        : [];
      const updated = cached.map((p) => (p.letter === targetLetter ? refinedVariant : p));

      await supabase
        .from("action_plans")
        .update({ ai_generated_plans: updated as any })
        .eq("id", plan.id);

      setRefineTarget(null);
      setRefineInstructions("");
      toast({ title: `Plano ${targetLetter} refinado` });
      await loadAll(true);
    } catch (e: any) {
      toast({
        title: "Erro ao refinar plano",
        description: e?.message || "Tente novamente",
        variant: "destructive",
      });
    }
    setRefiningVariant(null);
  };

  const applyPlan = async (variant: AIPlan) => {
    if (!plan?.id || !clientId || !genGoalId) return;
    setApplyingVariant(variant.letter);
    try {
      const selectedGoal = goalsList.find((g) => g.id === genGoalId);

      // Limpa acoes pendentes do plano anterior (mantem concluidas como historico)
      await supabase
        .from("action_items")
        .delete()
        .eq("action_plan_id", plan.id)
        .neq("status", "concluido");

      // Cria novas acoes — todas vinculadas ao goal escolhido
      const now = Date.now();
      const newRows = variant.actions.map((a) => ({
        action_plan_id: plan.id,
        area: a.area as any,
        description: a.description,
        objective: a.objective,
        financial_impact: a.financial_impact,
        deadline: a.deadline_offset_days
          ? new Date(now + a.deadline_offset_days * 86400000).toISOString().slice(0, 10)
          : null,
        status: "pendente" as const,
        responsible: "Novare",
        goal_id: genGoalId,
      }));
      if (newRows.length > 0) {
        await supabase.from("action_items").insert(newRows);
      }

      // Atualiza plano (objective = descricao do goal, com refinamento opcional)
      const objectiveText = genRefinement.trim()
        ? `${selectedGoal?.description ?? ""} — ${genRefinement.trim()}`
        : selectedGoal?.description ?? null;

      await supabase
        .from("action_plans")
        .update({
          objective: objectiveText,
          goal_id: genGoalId,
          applied_variant: variant.letter,
          applied_at: new Date().toISOString(),
          source_parecer_id: genParecerId === "__none__" ? null : genParecerId,
          custom_instructions: genInstructions.trim() || null,
          ai_generated_plans: generatedPlans as any,
        })
        .eq("id", plan.id);

      toast({ title: `Plano ${variant.letter} aplicado`, description: variant.title });
      setGenOpen(false);
      await loadAll(true);
    } catch (e: any) {
      toast({
        title: "Erro ao aplicar plano",
        description: e?.message || "Tente novamente",
        variant: "destructive",
      });
    }
    setApplyingVariant(null);
  };

  // ── CRUD manual ───────────────────────────────────
  const toggleItem = async (item: ActionItem) => {
    const next = item.status === "concluido" ? "pendente" : "concluido";
    await supabase.from("action_items").update({ status: next as any }).eq("id", item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
  };

  const removeItem = async (id: string) => {
    await supabase.from("action_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Ação removida" });
  };

  const updateItem = async (
    id: string,
    patch: { description?: string; objective?: string | null; financial_impact?: number | null; deadline?: string | null; area?: string },
  ) => {
    const { error } = await supabase.from("action_items").update(patch as any).eq("id", id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" as any });
      return false;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } as ActionItem : i)));
    toast({ title: "Ação atualizada" });
    return true;
  };

  const saveManual = async () => {
    if (!plan?.id || !manualForm.description.trim()) return;
    await supabase.from("action_items").insert([
      {
        action_plan_id: plan.id,
        area: manualForm.area as any,
        description: manualForm.description.trim(),
        objective: manualForm.objective.trim() || null,
        financial_impact: parseFloat(manualForm.financial_impact) || null,
        deadline: manualForm.deadline || null,
        status: "pendente" as const,
        responsible: "Novare",
      },
    ]);
    setManualForm({ area: "despesas", description: "", objective: "", financial_impact: "", deadline: "" });
    setManualOpen(false);
    toast({ title: "Ação adicionada" });
    await loadAll(true);
  };

  const discardActivePlan = async () => {
    if (!plan?.id) return;
    if (!confirm("Descartar o plano em andamento? As ações pendentes serão removidas (concluídas viram histórico).")) return;
    await supabase
      .from("action_items")
      .delete()
      .eq("action_plan_id", plan.id)
      .neq("status", "concluido");
    await supabase
      .from("action_plans")
      .update({
        objective: null,
        goal_id: null,
        applied_variant: null,
        applied_at: null,
        custom_instructions: null,
      })
      .eq("id", plan.id);
    toast({ title: "Plano descartado" });
    await loadAll(true);
  };

  // ── Render ────────────────────────────────────────
  if (loading) return <LoadingState variant="page" rows={4} />;

  // V9: planos gerados (do cache do banco) — mostra inline quando ja gerou
  // mas ainda nao aplicou nenhum
  const cachedPlans: AIPlan[] = Array.isArray(plan?.ai_generated_plans)
    ? (plan!.ai_generated_plans as AIPlan[])
    : [];
  const hasCachedPlans = cachedPlans.length > 0;
  const showInlinePlans = !hasActivePlan && hasCachedPlans;
  const targetGoal = plan?.goal_id ? goalsList.find((g) => g.id === plan.goal_id) : null;

  return (
    <div className="space-y-6">
      {/* HERO — Plano em andamento OU 3 cards inline OU CTA de geracao */}
      {hasActivePlan && plan ? (
        <ActivePlanHero
          plan={plan}
          totalImpact={totalImpact}
          completed={completed}
          total={total}
          pct={pct}
          onGenerateAgain={openGenerate}
          onDiscard={discardActivePlan}
          onSwitchVariant={hasCachedPlans ? async () => {
            if (!plan?.id) return;
            if (!confirm("Trocar variante? As ações pendentes do plano atual serão removidas (concluídas viram histórico).")) return;
            await supabase.from("action_items").delete().eq("action_plan_id", plan.id).neq("status", "concluido");
            await supabase.from("action_plans").update({ applied_variant: null, applied_at: null }).eq("id", plan.id);
            toast({ title: "Plano liberado — escolha uma das 3 variantes" });
            await loadAll(true);
          } : undefined}
        />
      ) : showInlinePlans ? (
        <InlinePlansSelector
          plans={cachedPlans}
          targetGoal={targetGoal}
          applyingVariant={applyingVariant}
          refiningVariant={refiningVariant}
          onApply={applyPlan}
          onRefine={(p) => {
            setRefineTarget(p);
            setRefineInstructions("");
          }}
          onRegenerate={openGenerate}
        />
      ) : (
        <EmptyHero onGenerate={openGenerate} pareceresCount={pareceres.length} />
      )}

      {/* LISTA DE ACOES (se houver plano ativo OU itens manuais) */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-accent/10">
                  <ClipboardList className="h-4 w-4 text-accent" />
                </div>
                Ações do plano
                <Badge variant="outline" className="text-[10px]">
                  {completed}/{total}
                </Badge>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setManualOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Adicionar manualmente
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((item, idx) => (
                <ActionRow
                  key={item.id}
                  item={item}
                  index={idx}
                  onToggle={() => toggleItem(item)}
                  onDelete={() => removeItem(item.id)}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                />
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* POPUP DE GERACAO */}
      <GenerateDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        phase={genPhase}
        setPhase={setGenPhase}
        goalId={genGoalId}
        setGoalId={setGenGoalId}
        goalsList={goalsList}
        refinement={genRefinement}
        setRefinement={setGenRefinement}
        instructions={genInstructions}
        setInstructions={setGenInstructions}
        parecerId={genParecerId}
        setParecerId={setGenParecerId}
        pareceres={pareceres}
        plans={generatedPlans}
        applyingVariant={applyingVariant}
        onGenerate={runGenerate}
        onApply={applyPlan}
      />

      {/* POPUP ADICAO MANUAL */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Adicionar ação manual</DialogTitle>
            <DialogDescription className="text-xs">
              Cria uma ação extra dentro do plano em andamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Área</Label>
              <Select
                value={manualForm.area}
                onValueChange={(v) => setManualForm((p) => ({ ...p, area: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AREA_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={manualForm.description}
                onChange={(e) => setManualForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="resize-none text-sm"
                placeholder="O que precisa ser feito?"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Objetivo (opcional)</Label>
              <Input
                value={manualForm.objective}
                onChange={(e) => setManualForm((p) => ({ ...p, objective: e.target.value }))}
                placeholder="Resultado esperado"
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Impacto (R$/mês)</Label>
                <Input
                  type="number"
                  value={manualForm.financial_impact}
                  onChange={(e) => setManualForm((p) => ({ ...p, financial_impact: e.target.value }))}
                  placeholder="0"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo</Label>
                <Input
                  type="date"
                  value={manualForm.deadline}
                  onChange={(e) => setManualForm((p) => ({ ...p, deadline: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={saveManual}
              disabled={!manualForm.description.trim()}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POPUP REFINAR COM IA — apenas variante selecionada */}
      <Dialog
        open={refineTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRefineTarget(null);
            setRefineInstructions("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Refinar Plano {refineTarget?.letter}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {refineTarget?.title
                ? `Ajustar "${refineTarget.title}" sem alterar os outros planos.`
                : "Ajustar este plano sem alterar os outros."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">O que ajustar?</Label>
            <Textarea
              value={refineInstructions}
              onChange={(e) => setRefineInstructions(e.target.value)}
              rows={5}
              className="resize-none text-sm"
              placeholder="Ex.: incluir uma ação de quitar o cartão Itaú primeiro, reduzir prazo para 6 meses, focar mais em renegociação..."
              disabled={refiningVariant !== null}
            />
            <p className="text-[10px] text-muted-foreground">
              A IA usará o plano atual como base e aplicará apenas essas instruções.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRefineTarget(null);
                setRefineInstructions("");
              }}
              disabled={refiningVariant !== null}
            >
              Cancelar
            </Button>
            <Button
              onClick={runRefine}
              disabled={!refineInstructions.trim() || refiningVariant !== null}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {refiningVariant !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refinando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Refinar com IA
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* V9: CTA para proxima etapa */}
      {hasActivePlan && (
        <JourneyFooterNav
          current="plano-acao"
          message="Plano aplicado. Acompanhe a evolução do cliente — a IA analisa pareceres e ações automaticamente."
        />
      )}
    </div>
  );
};

// ── Subcomponentes ─────────────────────────────────────

const EmptyHero = ({
  onGenerate,
  pareceresCount,
}: {
  onGenerate: () => void;
  pareceresCount: number;
}) => (
  <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent/[0.04] via-card to-card">
    <span
      aria-hidden
      className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl"
    />
    <span
      aria-hidden
      className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent/5 blur-3xl"
    />
    <CardContent className="relative py-12 px-6 sm:px-10 flex flex-col items-center text-center max-w-2xl mx-auto">
      <div className="h-14 w-14 rounded-2xl bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center mb-5">
        <Target className="h-7 w-7 text-accent" strokeWidth={1.75} />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-2">
        Nenhum plano em andamento
      </h2>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-md">
        Use a IA para gerar <span className="font-semibold text-foreground">3 planos completos</span> (A · B · C) baseados nos dados do cliente
        {pareceresCount > 0 && (
          <> e, se quiser, em um <span className="font-semibold text-foreground">parecer técnico</span> de referência</>
        )}
        . Você escolhe qual aplicar.
      </p>
      <Button
        onClick={onGenerate}
        size="lg"
        className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-6"
      >
        <Sparkles className="h-5 w-5" />
        Gerar planos com IA
      </Button>
    </CardContent>
  </Card>
);

const ActivePlanHero = ({
  plan,
  totalImpact,
  completed,
  total,
  pct,
  onGenerateAgain,
  onDiscard,
  onSwitchVariant,
}: {
  plan: PlanRow;
  totalImpact: number;
  completed: number;
  total: number;
  pct: number;
  onGenerateAgain: () => void;
  onDiscard: () => void;
  onSwitchVariant?: () => void;
}) => {
  const variant = plan.applied_variant || "A";
  const info = VARIANT_INFO[variant] || VARIANT_INFO.A;
  // tenta encontrar o plano completo no cache para mostrar o approach
  const aiPlan = Array.isArray(plan.ai_generated_plans)
    ? (plan.ai_generated_plans as AIPlan[]).find((p) => p.letter === variant)
    : null;

  return (
    <Card className="relative overflow-hidden border-border/50">
      <span
        aria-hidden
        className={cn(
          "absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl pointer-events-none",
          variant === "A" && "bg-blue-500/10",
          variant === "B" && "bg-emerald-500/10",
          variant === "C" && "bg-orange-500/10",
        )}
      />
      <CardContent className="relative py-6 px-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-[11px] font-bold px-2.5 py-1 border", info.tone)}>
              Plano {variant} · {info.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Calendar className="h-3 w-3" />
              Aplicado em {fmtDate(plan.applied_at)}
            </Badge>
            {aiPlan && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Calendar className="h-3 w-3" />
                Horizonte: {aiPlan.horizon_months} {aiPlan.horizon_months === 1 ? "mês" : "meses"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onSwitchVariant && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchVariant}
                className="gap-1.5 h-8"
                title="Volta para a tela de escolha das 3 variantes geradas"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Trocar variante
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onDiscard} className="text-muted-foreground hover:text-destructive gap-1.5 h-8">
              <Trash2 className="h-3.5 w-3.5" />
              Descartar
            </Button>
            <Button onClick={onGenerateAgain} size="sm" className="gap-1.5 h-8 bg-accent hover:bg-accent/90 text-accent-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              Gerar novos planos
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-accent/10 ring-1 ring-accent/25 flex items-center justify-center shrink-0">
            <Target className="h-5 w-5 text-accent" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/85 mb-1 flex items-center gap-1.5">
              Objetivo entrelaçado
              {plan.goal_id && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full bg-accent/10 text-accent border border-accent/25 text-[9px] normal-case tracking-normal font-medium">
                  <Target className="h-2.5 w-2.5" />
                  Vinculado
                </span>
              )}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug">
              {plan.objective}
            </h2>
            {aiPlan?.approach && (
              <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed mt-2">
                {aiPlan.approach}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile
            label="Progresso"
            value={`${pct}%`}
            sub={`${completed}/${total} ações`}
            progress={pct}
          />
          <StatTile
            label="Impacto mensal estimado"
            value={fmtBRL(aiPlan?.monthly_impact ?? totalImpact)}
            sub="Conforme a IA"
          />
          <StatTile
            label="Estratégia"
            value={aiPlan?.title || info.label}
            sub={`Plano ${variant}`}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// V9: tela principal de selecao quando ha planos gerados mas nenhum aplicado
const InlinePlansSelector = ({
  plans,
  targetGoal,
  applyingVariant,
  refiningVariant,
  onApply,
  onRefine,
  onRegenerate,
}: {
  plans: AIPlan[];
  targetGoal: GoalOption | null | undefined;
  applyingVariant: string | null;
  refiningVariant: string | null;
  onApply: (p: AIPlan) => void;
  onRefine: (p: AIPlan) => void;
  onRegenerate: () => void;
}) => (
  <div className="space-y-4">
    {/* Header */}
    <div className="rounded-xl border border-accent/25 bg-accent/[0.04] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            Escolha um dos 3 planos
          </p>
          {targetGoal && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Objetivo alvo: <span className="font-medium text-foreground">{targetGoal.description}</span>
            </p>
          )}
        </div>
      </div>
      <Button onClick={onRegenerate} variant="outline" size="sm" className="gap-1.5 h-8 shrink-0">
        <RefreshCw className="h-3.5 w-3.5" />
        Gerar novos
      </Button>
    </div>

    {/* 3 cards lado a lado */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {plans.map((plan) => (
        <PlanOptionCard
          key={plan.letter}
          plan={plan}
          applying={applyingVariant === plan.letter}
          anyApplying={Boolean(applyingVariant)}
          refining={refiningVariant === plan.letter}
          onApply={() => onApply(plan)}
          onRefine={() => onRefine(plan)}
        />
      ))}
    </div>
  </div>
);

const StatTile = ({
  label,
  value,
  sub,
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  progress?: number;
}) => (
  <div className="rounded-xl border border-border/50 bg-card/60 p-3.5">
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/85 mb-1.5">
      {label}
    </p>
    <p className="text-base font-bold text-foreground tracking-tight leading-tight">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    {typeof progress === "number" && <Progress value={progress} className="h-1.5 mt-2.5" />}
  </div>
);

const ActionRow = ({
  item,
  index,
  onToggle,
  onDelete,
  onUpdate,
}: {
  item: ActionItem;
  index: number;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (patch: { description?: string; objective?: string | null; financial_impact?: number | null; deadline?: string | null; area?: string }) => Promise<boolean>;
}) => {
  const isDone = item.status === "concluido";
  const areaLabel = AREA_LABEL[item.area] || item.area;
  const tone = AREA_TONE[item.area] || "bg-muted text-muted-foreground border-border";

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    area: item.area,
    description: item.description,
    objective: item.objective || "",
    financial_impact: item.financial_impact != null ? String(item.financial_impact) : "",
    deadline: item.deadline || "",
  });

  const startEdit = () => {
    setForm({
      area: item.area,
      description: item.description,
      objective: item.objective || "",
      financial_impact: item.financial_impact != null ? String(item.financial_impact) : "",
      deadline: item.deadline || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!form.description.trim()) {
      toast({ title: "Descrição obrigatória", variant: "destructive" as any });
      return;
    }
    setSaving(true);
    const ok = await onUpdate({
      area: form.area,
      description: form.description.trim(),
      objective: form.objective.trim() || null,
      financial_impact: form.financial_impact.trim() === "" ? null : parseFloat(form.financial_impact) || null,
      deadline: form.deadline || null,
    });
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
      className={cn(
        "group rounded-xl border p-3.5 transition-colors",
        editing ? "border-primary/50 bg-primary/[0.03]" :
        isDone ? "border-success/30 bg-success/[0.04]" : "border-border/60 bg-card hover:border-accent/40 hover:bg-muted/20",
      )}
    >
      {editing ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Área</Label>
              <Select value={form.area} onValueChange={(v) => setForm((p) => ({ ...p, area: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AREA_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="resize-none text-sm"
                placeholder="O que precisa ser feito?"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Objetivo</Label>
            <Input
              value={form.objective}
              onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))}
              className="h-8 text-sm"
              placeholder="Resultado esperado (opcional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Impacto (R$/mês)</Label>
              <Input
                type="number"
                value={form.financial_impact}
                onChange={(e) => setForm((p) => ({ ...p, financial_impact: e.target.value }))}
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Prazo</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={saveEdit}
              disabled={saving || !form.description.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isDone}
            onCheckedChange={onToggle}
            className="mt-0.5 data-[state=checked]:bg-success data-[state=checked]:border-success"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", tone)}>
                {areaLabel}
              </Badge>
              {item.financial_impact != null && item.financial_impact !== 0 && (
                <span className="text-[10.5px] font-semibold text-success tabular-nums">
                  {fmtBRL(item.financial_impact)}/mês
                </span>
              )}
              {item.deadline && (
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmtDate(item.deadline)}
                </span>
              )}
            </div>
            <p className={cn("text-sm font-semibold tracking-tight leading-snug", isDone && "line-through text-muted-foreground")}>
              {item.description}
            </p>
            {item.objective && (
              <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
                → {item.objective}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={startEdit}
              className="h-7 w-7 text-muted-foreground/60 hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              title="Editar ação"
            >
              <PenLine className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-7 w-7 text-muted-foreground/60 hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              title="Remover ação"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ── Dialog de geracao (multi-fase) ─────────────────────

const GenerateDialog = ({
  open,
  onOpenChange,
  phase,
  setPhase,
  goalId,
  setGoalId,
  goalsList,
  refinement,
  setRefinement,
  instructions,
  setInstructions,
  parecerId,
  setParecerId,
  pareceres,
  plans,
  applyingVariant,
  onGenerate,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phase: "form" | "generating" | "result";
  setPhase: (p: "form" | "generating" | "result") => void;
  goalId: string;
  setGoalId: (v: string) => void;
  goalsList: GoalOption[];
  refinement: string;
  setRefinement: (v: string) => void;
  instructions: string;
  setInstructions: (v: string) => void;
  parecerId: string;
  setParecerId: (v: string) => void;
  pareceres: ParecerOption[];
  plans: AIPlan[];
  applyingVariant: string | null;
  onGenerate: () => void;
  onApply: (p: AIPlan) => void;
}) => {
  const selectedGoal = goalsList.find((g) => g.id === goalId) || null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 overflow-hidden gap-0",
          phase === "result" ? "sm:max-w-5xl" : "sm:max-w-lg",
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-accent/[0.04] via-transparent to-transparent">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              </div>
              {phase === "result" ? "Escolha um dos 3 planos" : "Gerar planos com IA"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {phase === "form" && "Defina o objetivo. A IA cruzará com os dados do onboarding e, se você escolher, um parecer técnico."}
              {phase === "generating" && "A IA está montando 3 planos completos baseados nos dados do cliente..."}
              {phase === "result" && "Cada plano é uma estratégia distinta. Clique em Aplicar no que melhor se encaixar."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="max-h-[calc(85vh-160px)] overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-5 space-y-4"
              >
                {/* Objetivo (obrigatório, vem da tabela goals) */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-accent" />
                    Objetivo do cliente
                    <span className="text-destructive">*</span>
                  </Label>
                  {goalsList.length === 0 ? (
                    <div className="rounded-lg border border-warning/40 bg-warning/[0.06] px-3 py-2.5">
                      <p className="text-[12px] text-foreground font-medium">
                        Nenhum objetivo cadastrado.
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Cadastre objetivos do cliente no <span className="font-semibold">Diagnóstico</span> antes de gerar um plano.
                      </p>
                    </div>
                  ) : (
                    <Select value={goalId} onValueChange={setGoalId}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Selecione o objetivo alvo deste plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {goalsList.map((g) => (
                          <SelectItem key={g.id} value={g.id} className="text-sm">
                            <span className="font-medium">{g.description}</span>
                            {g.target_amount != null && g.target_amount > 0 && (
                              <span className="text-muted-foreground ml-1.5">
                                · {fmtBRL(g.target_amount)}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedGoal && (
                    <div className="rounded-md bg-accent/[0.05] border border-accent/15 px-2.5 py-1.5 mt-1 flex items-center gap-2 flex-wrap">
                      {selectedGoal.target_amount != null && selectedGoal.target_amount > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Target className="h-3 w-3" />
                          Meta {fmtBRL(selectedGoal.target_amount)}
                        </Badge>
                      )}
                      {selectedGoal.deadline && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Calendar className="h-3 w-3" />
                          {fmtDate(selectedGoal.deadline)}
                        </Badge>
                      )}
                      {selectedGoal.priority && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          Prio: {selectedGoal.priority}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Refinamento (opcional, texto curto) */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    Refinamento
                    <span className="font-normal text-muted-foreground/70">(opcional)</span>
                  </Label>
                  <Input
                    value={refinement}
                    onChange={(e) => setRefinement(e.target.value)}
                    placeholder="Ex: priorizar quitação do cartão Nubank primeiro"
                    className="h-10 text-sm"
                    maxLength={500}
                  />
                  <p className="text-[10.5px] text-muted-foreground/85">
                    Detalhe específico que ajuda a IA a refinar a estratégia (não substitui o objetivo).
                  </p>
                </div>

                {/* Parecer de referência (opcional) */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <PenLine className="h-3.5 w-3.5 text-accent" />
                    Parecer de referência
                    <span className="font-normal text-muted-foreground/70">(opcional)</span>
                  </Label>
                  <Select value={parecerId} onValueChange={setParecerId}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Nenhum parecer selecionado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-sm">
                        Sem parecer (somente dados do onboarding)
                      </SelectItem>
                      {pareceres.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-sm">
                          {p.title || "Parecer sem título"} ·{" "}
                          <span className="text-muted-foreground">{fmtDate(p.updated_at)}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Instruções (opcional) */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-accent" />
                    Instruções para a IA
                    <span className="font-normal text-muted-foreground/70">(opcional)</span>
                  </Label>
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Ex: Foque em ações de impacto imediato. Evitar mexer no orçamento de educação dos filhos."
                    rows={3}
                    className="resize-none text-sm"
                    maxLength={2000}
                  />
                </div>
              </motion.div>
            )}

            {phase === "generating" && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-16 flex flex-col items-center justify-center text-center"
              >
                <div className="relative mb-5">
                  <div className="h-16 w-16 rounded-2xl bg-accent/10 ring-1 ring-accent/30 flex items-center justify-center">
                    <Wand2 className="h-7 w-7 text-accent" />
                  </div>
                  <motion.span
                    className="absolute inset-0 rounded-2xl border-2 border-accent/40"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Gerando 3 planos personalizados...
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Cruzando dados do onboarding{parecerId !== "__none__" ? ", parecer técnico" : ""} e seu objetivo. Isso leva poucos segundos.
                </p>
              </motion.div>
            )}

            {phase === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-5"
              >
                <div className="rounded-lg border border-accent/20 bg-accent/[0.04] px-3 py-2 mb-4 flex items-center gap-2 flex-wrap">
                  <Target className="h-4 w-4 text-accent shrink-0" />
                  <p className="text-[12.5px] text-foreground">
                    <span className="text-muted-foreground">Objetivo alvo:</span>{" "}
                    <span className="font-semibold">{selectedGoal?.description || "—"}</span>
                  </p>
                  {refinement && (
                    <span className="text-[11.5px] text-muted-foreground">
                      · {refinement}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {plans.map((plan) => (
                    <PlanOptionCard
                      key={plan.letter}
                      plan={plan}
                      applying={applyingVariant === plan.letter}
                      anyApplying={Boolean(applyingVariant)}
                      onApply={() => onApply(plan)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {phase === "form" && (
          <div className="px-6 py-3.5 border-t border-border/50 bg-muted/20 flex justify-between gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={onGenerate}
              disabled={!goalId || goalsList.length === 0}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Gerar 3 planos
            </Button>
          </div>
        )}
        {phase === "result" && (
          <div className="px-6 py-3.5 border-t border-border/50 bg-muted/20 flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setPhase("form")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao formulário
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PlanOptionCard = ({
  plan,
  applying,
  anyApplying,
  onApply,
  onRefine,
  refining,
}: {
  plan: AIPlan;
  applying: boolean;
  anyApplying: boolean;
  onApply: () => void;
  onRefine?: () => void;
  refining?: boolean;
}) => {
  const info = VARIANT_INFO[plan.letter] || VARIANT_INFO.A;
  const [expanded, setExpanded] = useState(false);
  const visibleActions = expanded ? plan.actions : plan.actions.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-2xl border-2 bg-card overflow-hidden flex flex-col",
        plan.letter === "A" && "border-blue-500/25",
        plan.letter === "B" && "border-emerald-500/25",
        plan.letter === "C" && "border-orange-500/25",
      )}
    >
      <div
        className={cn(
          "px-4 py-3 border-b border-border/50",
          plan.letter === "A" && "bg-blue-500/[0.06]",
          plan.letter === "B" && "bg-emerald-500/[0.06]",
          plan.letter === "C" && "bg-orange-500/[0.06]",
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <Badge className={cn("text-[10.5px] font-bold px-2 py-0.5 border", info.tone)}>
            Plano {plan.letter}
          </Badge>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
            {info.label}
          </span>
        </div>
        <h3 className="text-sm font-bold text-foreground tracking-tight leading-snug">
          {plan.title}
        </h3>
      </div>

      <div className="p-4 flex-1 space-y-3">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          {plan.approach}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/85">Horizonte</p>
            <p className="text-sm font-bold text-foreground">
              {plan.horizon_months} {plan.horizon_months === 1 ? "mês" : "meses"}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/85">Impacto/mês</p>
            <p className="text-sm font-bold text-foreground tabular-nums">
              {fmtBRL(plan.monthly_impact)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-2 flex items-center gap-1">
            <ClipboardList className="h-3 w-3" />
            {plan.actions.length} {plan.actions.length === 1 ? "ação" : "ações"}
          </p>
          <ul className="space-y-1.5">
            {visibleActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[11.5px]">
                <span
                  className={cn(
                    "shrink-0 mt-1 h-1.5 w-1.5 rounded-full",
                    plan.letter === "A" && "bg-blue-500",
                    plan.letter === "B" && "bg-emerald-500",
                    plan.letter === "C" && "bg-orange-500",
                  )}
                />
                <span className="text-foreground leading-snug">
                  <Badge variant="outline" className={cn("text-[9px] mr-1 px-1 py-0 border", AREA_TONE[a.area])}>
                    {AREA_LABEL[a.area] || a.area}
                  </Badge>
                  {a.description}
                </span>
              </li>
            ))}
          </ul>
          {plan.actions.length > 4 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-[10.5px] font-semibold text-accent hover:text-accent/80 inline-flex items-center gap-0.5"
            >
              {expanded ? "Ver menos" : `Ver mais (${plan.actions.length - 4})`}
              <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border/50 bg-muted/20 space-y-2">
        {onRefine && (
          <Button
            onClick={onRefine}
            disabled={Boolean(anyApplying) || refining}
            variant="outline"
            className="w-full gap-1.5 h-8 text-[12px]"
          >
            {refining ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Refinando...
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                Refinar com IA
              </>
            )}
          </Button>
        )}
        <Button
          onClick={onApply}
          disabled={anyApplying}
          className={cn(
            "w-full gap-1.5 h-9",
            plan.letter === "A" && "bg-blue-600 hover:bg-blue-700 text-white",
            plan.letter === "B" && "bg-emerald-600 hover:bg-emerald-700 text-white",
            plan.letter === "C" && "bg-orange-600 hover:bg-orange-700 text-white",
          )}
        >
          {applying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Aplicando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Aplicar Plano {plan.letter}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default AdminActionPlan;
