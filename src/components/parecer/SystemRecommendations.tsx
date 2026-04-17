import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Lightbulb, Zap, CheckCircle2, Loader2, AlertTriangle,
  TrendingDown, CreditCard, PiggyBank, ShieldAlert, Target,
  Pencil, X, Rocket, Scale, ShieldCheck, Save, RefreshCw, Sparkles,
} from "lucide-react";

export type RiskProfile = "radical" | "balanceado" | "ponderado";

export interface RecommendationSubtask {
  description: string;
  objective?: string;
}

export interface SystemRecommendation {
  id: string;
  area: "renda" | "despesas" | "dividas" | "investimentos" | "protecao" | "impostos";
  description: string;
  objective: string;
  financial_impact: number;
  severity: "alta" | "media" | "baixa";
  icon: any;
  subtasks: RecommendationSubtask[];
  goal_description?: string;
}

const areaLabels: Record<string, string> = {
  renda: "Renda", despesas: "Despesas", dividas: "Dívidas",
  investimentos: "Investimentos", protecao: "Proteção", impostos: "Impostos",
};

const areaColors: Record<string, string> = {
  renda: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  despesas: "bg-red-500/10 text-red-700 border-red-200",
  dividas: "bg-orange-500/10 text-orange-700 border-orange-200",
  investimentos: "bg-blue-500/10 text-blue-700 border-blue-200",
  protecao: "bg-purple-500/10 text-purple-700 border-purple-200",
  impostos: "bg-amber-500/10 text-amber-700 border-amber-200",
};

const severityColors: Record<string, string> = {
  alta: "bg-red-500/10 text-red-700 border-red-200",
  media: "bg-amber-500/10 text-amber-700 border-amber-200",
  baixa: "bg-blue-500/10 text-blue-700 border-blue-200",
};

const areaIcons: Record<string, any> = {
  renda: TrendingDown,
  despesas: TrendingDown,
  dividas: CreditCard,
  investimentos: PiggyBank,
  protecao: ShieldAlert,
  impostos: Target,
};

const riskProfileInfo: Record<RiskProfile, { label: string; icon: any; color: string }> = {
  radical: { label: "Radical", icon: Rocket, color: "bg-red-500/10 text-red-700 border-red-200" },
  balanceado: { label: "Balanceado", icon: Scale, color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  ponderado: { label: "Ponderado", icon: ShieldCheck, color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ── Panel UI ── */

interface Props {
  clientId: string;
  riskProfile?: RiskProfile;
}

export const SystemRecommendationsPanel = ({ clientId, riskProfile }: Props) => {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<SystemRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [editingRec, setEditingRec] = useState<SystemRecommendation | null>(null);
  const [editData, setEditData] = useState<{ description: string; objective: string; financial_impact: number }>({ description: "", objective: "", financial_impact: 0 });
  const [editedOverrides, setEditedOverrides] = useState<Record<string, { description: string; objective: string; financial_impact: number }>>({});

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ clientId, riskProfile: riskProfile || "balanceado" }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao gerar recomendações");
      }

      const data = await response.json();
      const recs: SystemRecommendation[] = (data.recommendations || []).map(
        (r: any, i: number) => ({
          id: `ai-${i}`,
          area: r.area,
          description: r.description,
          objective: r.objective,
          financial_impact: r.financial_impact || 0,
          severity: r.severity || "media",
          icon: areaIcons[r.area] || Target,
          subtasks: (r.subtasks || []).map((s: any) => ({
            description: s.description,
            objective: s.objective || "",
          })),
          goal_description: r.goal_description || "",
        })
      );
      setRecommendations(recs);
      setAppliedIds(new Set());
      setEditedOverrides({});
    } catch (err: any) {
      console.error("Error fetching AI recommendations:", err);
      toast({ title: "Erro ao gerar recomendações", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (clientId) fetchRecommendations();
  }, [clientId, riskProfile]);

  const openEdit = (rec: SystemRecommendation) => {
    const override = editedOverrides[rec.id];
    setEditingRec(rec);
    setEditData({
      description: override?.description ?? rec.description,
      objective: override?.objective ?? rec.objective,
      financial_impact: override?.financial_impact ?? rec.financial_impact,
    });
  };

  const saveEdit = () => {
    if (!editingRec) return;
    setEditedOverrides(prev => ({ ...prev, [editingRec.id]: { ...editData } }));
    setEditingRec(null);
    toast({ title: "Recomendação editada", description: "As alterações serão usadas ao aplicar a ação." });
  };

  const getEffective = (rec: SystemRecommendation) => {
    const o = editedOverrides[rec.id];
    return {
      description: o?.description ?? rec.description,
      objective: o?.objective ?? rec.objective,
      financial_impact: o?.financial_impact ?? rec.financial_impact,
    };
  };

  const applyAction = async (rec: SystemRecommendation) => {
    setApplyingId(rec.id);
    const eff = getEffective(rec);

    try {
      // Find matching goal by description
      let goalId: string | null = null;
      if (rec.goal_description) {
        const { data: goalsData } = await supabase
          .from("goals")
          .select("id, description")
          .eq("client_id", clientId);
        if (goalsData) {
          const match = goalsData.find(g =>
            g.description.toLowerCase().includes(rec.goal_description!.toLowerCase()) ||
            rec.goal_description!.toLowerCase().includes(g.description.toLowerCase())
          );
          if (match) goalId = match.id;
        }
      }

      let { data: plan } = await supabase
        .from("action_plans")
        .select("id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (!plan) {
        const { data: newPlan } = await supabase
          .from("action_plans")
          .insert({ client_id: clientId })
          .select("id")
          .single();
        plan = newPlan;
      }
      if (!plan) throw new Error("Falha ao criar plano");

      const { data: parentItem } = await supabase.from("action_items").insert({
        action_plan_id: plan.id,
        area: rec.area as any,
        description: eff.description,
        objective: eff.objective,
        financial_impact: eff.financial_impact,
        goal_id: goalId,
      }).select("id").single();

      if (parentItem && rec.subtasks.length > 0) {
        const subtaskRows = rec.subtasks.map((st) => ({
          action_plan_id: plan!.id,
          area: rec.area as any,
          description: st.description,
          objective: st.objective || null,
          parent_id: parentItem.id,
          goal_id: goalId,
        }));
        await supabase.from("action_items").insert(subtaskRows);
      }

      setAppliedIds(prev => new Set(prev).add(rec.id));
      toast({ title: "Ação aplicada ao plano!", description: rec.subtasks.length > 0 ? `${rec.subtasks.length} subtarefas incluídas.` : undefined });
    } catch {
      toast({ title: "Erro ao aplicar ação", variant: "destructive" });
    }
    setApplyingId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="text-xs text-muted-foreground">Analisando dados com IA...</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40 text-accent" />
        <p className="text-sm text-muted-foreground mb-3">Sem dados suficientes para gerar recomendações</p>
        <Button size="sm" variant="ghost" onClick={fetchRecommendations} className="gap-1.5 text-xs">
          <RefreshCw className="h-6 w-6" /> Tentar novamente
        </Button>
      </div>
    );
  }

  const profileMeta = riskProfile ? riskProfileInfo[riskProfile] : null;

  return (
    <>
      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-2 pr-2">
          {/* Header with refresh */}
          <div className="flex items-center justify-between mb-1">
            {profileMeta && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 ${profileMeta.color}`}>
                <profileMeta.icon className="h-6 w-6" />
                <span className="text-xs font-medium">Perfil de Risco: {profileMeta.label}</span>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchRecommendations}
              className="h-8 w-8 p-0 shrink-0 ml-2"
              title="Regenerar recomendações"
            >
              <RefreshCw className="h-6 w-6" />
            </Button>
          </div>

          {recommendations.map((rec) => {
            const applied = appliedIds.has(rec.id);
            const applying = applyingId === rec.id;
            const eff = getEffective(rec);
            const wasEdited = !!editedOverrides[rec.id];

            return (
              <div
                key={rec.id}
                className={`p-3 rounded-xl border transition-all ${
                  applied
                    ? "bg-success/5 border-success/30"
                    : "bg-card border-border/40"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <rec.icon className={`h-6 w-6 mt-0.5 shrink-0 ${
                    applied ? "text-success" : "text-muted-foreground"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`text-[0.6875rem] px-1.5 py-0.5 rounded-full border ${areaColors[rec.area]}`}>
                        {areaLabels[rec.area]}
                      </span>
                      <span className={`text-[0.6875rem] px-1.5 py-0.5 rounded-full border ${severityColors[rec.severity]}`}>
                        {rec.severity === "alta" ? "Urgente" : rec.severity === "media" ? "Importante" : "Sugestão"}
                      </span>
                      {wasEdited && !applied && (
                        <Badge variant="outline" className="text-[0.6875rem] border-accent/30 text-accent">
                          Editada
                        </Badge>
                      )}
                      {applied && (
                        <Badge className="bg-success/10 text-success border-success/30 text-[0.6875rem]">
                          <CheckCircle2 className="h-6 w-6 mr-1" /> Aplicada
                        </Badge>
                      )}
                      {rec.goal_description && (
                        <Badge variant="outline" className="text-[0.6875rem] border-primary/30 text-primary">
                          🎯 {rec.goal_description}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-foreground leading-relaxed">{eff.description}</p>
                    {eff.objective && (
                      <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                        → {eff.objective}
                      </p>
                    )}
                    {eff.financial_impact > 0 && (
                      <p className="text-[0.6875rem] font-medium text-accent mt-0.5">
                        Impacto: {fmt(eff.financial_impact)}
                      </p>
                    )}

                    {/* Subtasks preview */}
                    {rec.subtasks.length > 0 && (
                      <div className="mt-2 pl-1 border-l-2 border-border/40 space-y-1">
                        {rec.subtasks.map((st, si) => (
                          <p key={si} className="text-[0.625rem] text-muted-foreground/70 leading-relaxed pl-2">
                            <span className="text-muted-foreground/40 mr-1">{si + 1}.</span>
                            {st.description}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!applied && (
                  <div className="mt-2 flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => openEdit(rec)}
                    >
                      <Pencil className="h-6 w-6" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => applyAction(rec)}
                      disabled={applying}
                    >
                      {applying ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Zap className="h-6 w-6" />
                      )}
                      Aplicar Ação
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={!!editingRec} onOpenChange={(open) => !open && setEditingRec(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">Editar recomendação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Textarea
                value={editData.description}
                onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                className="text-sm min-h-[80px] resize-none"
                placeholder="Descrição da recomendação"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Objetivo</Label>
              <Input
                value={editData.objective}
                onChange={e => setEditData(d => ({ ...d, objective: e.target.value }))}
                className="text-sm"
                placeholder="Objetivo da ação"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Impacto financeiro (R$)</Label>
              <Input
                type="number"
                value={editData.financial_impact || ""}
                onChange={e => setEditData(d => ({ ...d, financial_impact: parseFloat(e.target.value) || 0 }))}
                className="text-sm"
                placeholder="0,00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditingRec(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={saveEdit} className="gap-1.5">
              <Save className="h-6 w-6" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
