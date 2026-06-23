import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Target, Users, TrendingUp, Clock, Search, ChevronDown, ChevronUp,
  Plus, ExternalLink, History, LayoutDashboard, Loader2,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  profession: string | null;
  source: string | null;
  monthly_income_range: string | null;
  invested_amount_range: string | null;
  loss_reaction: string | null;
  main_motivation: string[] | null;
  status: string;
  created_at: string;
  goals?: Goal[];
  updates?: Update[];
}

interface Goal {
  id: string;
  lead_id: string;
  goal_type: string;
  target_value: number | null;
  deadline_years: number | null;
  current_value: number;
  priority: string;
  notes: string | null;
}

interface Update {
  id: string;
  lead_id: string;
  goal_id: string | null;
  note: string;
  progress_pct: number | null;
  current_value: number | null;
  created_at: string;
}

// ── Dados estáticos ──────────────────────────────────────────────────────────

const GOAL_META: Record<string, { emoji: string; label: string }> = {
  aposentadoria:            { emoji: "🏦", label: "Aposentadoria" },
  reserva_emergencia:       { emoji: "🛡️", label: "Reserva de Emergência" },
  independencia_financeira: { emoji: "🗝️", label: "Independência Financeira" },
  comprar_imovel:           { emoji: "🏠", label: "Comprar Imóvel" },
  educacao_filhos:          { emoji: "🎓", label: "Educação dos Filhos" },
  viagem_lazer:             { emoji: "✈️", label: "Viagem / Lazer" },
  empreender:               { emoji: "🚀", label: "Empreender / Negócio" },
  renda_passiva:            { emoji: "💰", label: "Renda Passiva Mensal" },
  veiculo:                  { emoji: "🚗", label: "Veículo / Bem de Consumo" },
  saude:                    { emoji: "❤️", label: "Saúde / Qualidade de Vida" },
};

const SOURCE_LABELS: Record<string, string> = {
  indicacao: "Indicação", redes_sociais: "Redes Sociais",
  google: "Google", evento: "Evento", parceiro: "Parceiro",
};

const INCOME_LABELS: Record<string, string> = {
  ate_3k: "Até R$ 3k", "3k_6k": "R$ 3–6k", "6k_10k": "R$ 6–10k",
  "10k_20k": "R$ 10–20k", "20k_50k": "R$ 20–50k", acima_50k: "Acima de R$ 50k",
};

const STATUS_COLORS: Record<string, string> = {
  novo:       "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  contatado:  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  convertido: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
  descartado: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  alta:  "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  baixa: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
const fmtCurrency = (v: number | null) =>
  v == null ? "—" : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
const pct = (current: number, target: number | null) =>
  target && target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

// ── Componente principal ─────────────────────────────────────────────────────

type Tab = "dashboard" | "leads" | "historico";

export default function AdminObjetivosVida() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal de atualização de progresso
  const [updateModal, setUpdateModal] = useState<{ lead: Lead; goal?: Goal } | null>(null);
  const [updateNote, setUpdateNote] = useState("");
  const [updateCurrentValue, setUpdateCurrentValue] = useState("");
  const [updatePriority, setUpdatePriority] = useState("media");
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Carrega leads com objetivos e atualizações
  const load = async () => {
    setLoading(true);
    const { data: leadsData } = await supabase
      .from("life_leads" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!leadsData) { setLoading(false); return; }

    const ids = (leadsData as unknown as Lead[]).map((l) => l.id);

    const [{ data: goalsData }, { data: updatesData }] = await Promise.all([
      supabase.from("life_lead_goals" as any).select("*").in("lead_id", ids),
      supabase.from("life_lead_updates" as any).select("*").in("lead_id", ids).order("created_at", { ascending: false }),
    ]);

    const goalsByLead: Record<string, Goal[]> = {};
    (goalsData as unknown as Goal[] || []).forEach((g) => {
      if (!goalsByLead[g.lead_id]) goalsByLead[g.lead_id] = [];
      goalsByLead[g.lead_id].push(g);
    });

    const updatesByLead: Record<string, Update[]> = {};
    (updatesData as unknown as Update[] || []).forEach((u) => {
      if (!updatesByLead[u.lead_id]) updatesByLead[u.lead_id] = [];
      updatesByLead[u.lead_id].push(u);
    });

    setLeads((leadsData as unknown as Lead[]).map((l) => ({
      ...l,
      goals: goalsByLead[l.id] || [],
      updates: updatesByLead[l.id] || [],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Atualizar status do lead
  const updateStatus = async (leadId: string, newStatus: string) => {
    await supabase.from("life_leads" as any).update({ status: newStatus }).eq("id", leadId);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
    toast.success("Status atualizado.");
  };

  // Registrar atualização de progresso
  const saveUpdate = async () => {
    if (!updateModal || !updateNote.trim()) return;
    setSavingUpdate(true);
    const payload: any = {
      lead_id: updateModal.lead.id,
      goal_id: updateModal.goal?.id ?? null,
      note: updateNote.trim(),
      current_value: updateCurrentValue ? parseFloat(updateCurrentValue.replace(/\D/g, "")) : null,
      created_by: user?.id ?? null,
    };
    if (updateModal.goal && updateCurrentValue) {
      const cur = parseFloat(updateCurrentValue.replace(/\D/g, "")) || 0;
      payload.progress_pct = pct(cur, updateModal.goal.target_value);

      // Atualiza current_value no objetivo
      await supabase.from("life_lead_goals" as any)
        .update({ current_value: cur, priority: updatePriority })
        .eq("id", updateModal.goal.id);
    }
    await supabase.from("life_lead_updates" as any).insert(payload);
    setSavingUpdate(false);
    setUpdateModal(null);
    setUpdateNote("");
    setUpdateCurrentValue("");
    toast.success("Progresso registrado.");
    await load();
  };

  // ── Dados derivados ──────────────────────────────────────────────────────

  const filteredLeads = leads.filter((l) => {
    const matchSearch = search === "" ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.whatsapp || "").includes(search);
    const matchStatus = filterStatus === "todos" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: leads.length,
    novos: leads.filter((l) => l.status === "novo").length,
    convertidos: leads.filter((l) => l.status === "convertido").length,
    totalGoals: leads.reduce((acc, l) => acc + (l.goals?.length ?? 0), 0),
  };

  // Linha do tempo global (todos os updates, mais recente primeiro)
  const allUpdates = leads
    .flatMap((l) => (l.updates || []).map((u) => ({ ...u, leadName: l.name, goals: l.goals || [] })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objetivos de Vida</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie leads do formulário público e acompanhe metas</p>
        </div>
        <a
          href="/objetivos-de-vida"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-novare-blue hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver formulário público
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/60">
        {([
          { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { id: "leads",     icon: Users,           label: "Leads" },
          { id: "historico", icon: History,          label: "Histórico" },
        ] as { id: Tab; icon: typeof Users; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-novare-blue text-novare-blue"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.id === "leads" && leads.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-novare-blue/15 text-novare-blue text-[10px] font-bold">
                {leads.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Carregando dados...</span>
        </div>
      ) : (
        <>
          {/* ── TAB: DASHBOARD ── */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              {/* Cards de stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Leads totais",  value: stats.total,      icon: Users,       color: "text-novare-blue" },
                  { label: "Novos leads",   value: stats.novos,      icon: Clock,       color: "text-amber-500" },
                  { label: "Convertidos",   value: stats.convertidos,icon: TrendingUp,  color: "text-green-500" },
                  { label: "Metas ativas",  value: stats.totalGoals, icon: Target,      color: "text-novare-terracotta" },
                ].map((s) => (
                  <Card key={s.label} className="border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                          <p className="text-3xl font-bold text-foreground mt-1">{s.value}</p>
                        </div>
                        <div className={cn("h-9 w-9 rounded-xl bg-muted flex items-center justify-center", s.color)}>
                          <s.icon className="h-4.5 w-4.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Visão rápida de leads recentes */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Leads Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {leads.slice(0, 6).map((l, i) => (
                    <div key={l.id} className={cn(
                      "flex items-center gap-4 px-6 py-3.5",
                      i < leads.slice(0, 6).length - 1 && "border-b border-border/40",
                    )}>
                      <div className="h-9 w-9 rounded-full bg-novare-blue/10 text-novare-blue flex items-center justify-center shrink-0 font-bold text-sm">
                        {l.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{l.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {l.profession || "—"} · {l.email || l.whatsapp || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{fmtDate(l.created_at)}</span>
                        <Badge variant="outline" className={cn("text-[10px] h-5", STATUS_COLORS[l.status])}>
                          {l.status}
                        </Badge>
                        {(l.goals?.length ?? 0) > 0 && (
                          <Badge variant="outline" className="text-[10px] h-5 bg-novare-blue/10 text-novare-blue border-novare-blue/20">
                            {l.goals!.length} meta{l.goals!.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {leads.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-10">
                      Nenhum lead cadastrado ainda. Compartilhe o formulário público!
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── TAB: LEADS ── */}
          {tab === "leads" && (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input placeholder="Buscar por nome, e-mail ou WhatsApp..."
                    className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="contatado">Contatado</SelectItem>
                    <SelectItem value="convertido">Convertido</SelectItem>
                    <SelectItem value="descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de leads */}
              <div className="space-y-3">
                {filteredLeads.length === 0 && (
                  <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">
                    Nenhum lead encontrado.
                  </CardContent></Card>
                )}
                {filteredLeads.map((lead) => {
                  const isOpen = expandedId === lead.id;
                  return (
                    <Card key={lead.id} className="border-border/50 overflow-hidden">
                      {/* Cabeçalho do lead */}
                      <div
                        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedId(isOpen ? null : lead.id)}
                      >
                        <div className="h-10 w-10 rounded-full bg-novare-blue/10 text-novare-blue flex items-center justify-center shrink-0 font-bold">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{lead.name}</p>
                            <Badge variant="outline" className={cn("text-[10px] h-5", STATUS_COLORS[lead.status])}>
                              {lead.status}
                            </Badge>
                            {(lead.goals?.length ?? 0) > 0 && (
                              <Badge variant="outline" className="text-[10px] h-5 bg-novare-blue/10 text-novare-blue border-novare-blue/20">
                                {lead.goals!.length} objetivo{lead.goals!.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lead.profession || "—"} · {lead.email || "—"} · {lead.whatsapp || "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground hidden sm:block">{fmtDate(lead.created_at)}</span>
                          {lead.source && (
                            <span className="text-xs text-muted-foreground hidden md:block">{SOURCE_LABELS[lead.source] || lead.source}</span>
                          )}
                          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Detalhe expandido */}
                      {isOpen && (
                        <div className="border-t border-border/50 bg-muted/20">
                          {/* Info financeira */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/40">
                            {[
                              { label: "Renda mensal", value: INCOME_LABELS[lead.monthly_income_range || ""] || lead.monthly_income_range || "—" },
                              { label: "Patrimônio",   value: lead.invested_amount_range || "—" },
                              { label: "Tolerância",   value: lead.loss_reaction ? lead.loss_reaction.replace(/_/g, " ") : "—" },
                              { label: "Canal",        value: SOURCE_LABELS[lead.source || ""] || lead.source || "—" },
                            ].map((item) => (
                              <div key={item.label} className="bg-background px-4 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                                <p className="text-sm font-medium text-foreground mt-0.5 capitalize">{item.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Objetivos do lead */}
                          {(lead.goals?.length ?? 0) > 0 && (
                            <div className="px-5 py-4">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Objetivos de vida</p>
                              <div className="space-y-3">
                                {lead.goals!.map((goal) => {
                                  const meta = GOAL_META[goal.goal_type] || { emoji: "🎯", label: goal.goal_type };
                                  const p = pct(goal.current_value, goal.target_value);
                                  return (
                                    <div key={goal.id} className="flex items-center gap-3 bg-background rounded-xl border border-border/50 px-4 py-3">
                                      <span className="text-xl shrink-0">{meta.emoji}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                          <span className="font-semibold text-sm text-foreground">{meta.label}</span>
                                          <Badge variant="outline" className={cn("text-[9px] h-4", PRIORITY_COLORS[goal.priority])}>
                                            {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                          <span>Meta: {fmtCurrency(goal.target_value)}</span>
                                          {goal.deadline_years && <span>Prazo: {goal.deadline_years} anos</span>}
                                          <span>Atual: {fmtCurrency(goal.current_value)}</span>
                                        </div>
                                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-novare-blue transition-all"
                                            style={{ width: `${p}%` }}
                                          />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-0.5 block">{p}%</span>
                                      </div>
                                      <Button size="sm" variant="outline" className="gap-1.5 shrink-0 text-xs"
                                        onClick={() => {
                                          setUpdateModal({ lead, goal });
                                          setUpdatePriority(goal.priority);
                                          setUpdateCurrentValue(String(goal.current_value || ""));
                                        }}>
                                        <Plus className="h-3.5 w-3.5" />
                                        Atualizar
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Últimas atualizações */}
                          {(lead.updates?.length ?? 0) > 0 && (
                            <div className="px-5 pb-4">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Últimas atualizações</p>
                              <div className="space-y-1.5">
                                {lead.updates!.slice(0, 4).map((u) => {
                                  const goalMeta = u.goal_id
                                    ? GOAL_META[lead.goals?.find((g) => g.id === u.goal_id)?.goal_type || ""] : null;
                                  return (
                                    <div key={u.id} className="flex items-start gap-2.5 text-sm">
                                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 tabular-nums">{fmtDate(u.created_at)}</span>
                                      <div className="h-1.5 w-1.5 rounded-full bg-novare-blue shrink-0 mt-1.5" />
                                      <p className="text-muted-foreground text-xs leading-relaxed">
                                        {goalMeta && <span className="text-foreground font-medium">[{goalMeta.label}] </span>}
                                        {u.note}
                                        {u.progress_pct != null && <span className="text-novare-blue"> ({u.progress_pct}%)</span>}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Ações */}
                          <div className="flex items-center gap-2 px-5 pb-4 flex-wrap">
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                              onClick={() => setUpdateModal({ lead })}>
                              <Plus className="h-3.5 w-3.5" />
                              Registrar observação
                            </Button>
                            <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v)}>
                              <SelectTrigger className="h-8 w-auto text-xs gap-1.5 px-3">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="novo">Novo</SelectItem>
                                <SelectItem value="contatado">Contatado</SelectItem>
                                <SelectItem value="convertido">Convertido</SelectItem>
                                <SelectItem value="descartado">Descartado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB: HISTÓRICO ── */}
          {tab === "historico" && (
            <div className="space-y-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Linha do Tempo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allUpdates.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Nenhuma atualização registrada ainda.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {allUpdates.map((u) => {
                        const goalMeta = u.goal_id
                          ? GOAL_META[u.goals.find((g: Goal) => g.id === u.goal_id)?.goal_type || ""] : null;
                        return (
                          <div key={u.id} className="flex items-start gap-3 text-sm">
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums w-20 mt-0.5">{fmtDate(u.created_at)}</span>
                            <div className="h-2 w-2 rounded-full bg-novare-blue shrink-0 mt-1.5" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-foreground">{u.leadName}</span>
                              {goalMeta && <span className="text-muted-foreground"> · [{goalMeta.emoji} {goalMeta.label}]</span>}
                              <span className="text-muted-foreground"> · {u.note}</span>
                              {u.progress_pct != null && (
                                <span className="ml-1 text-novare-blue font-medium">({u.progress_pct}%)</span>
                              )}
                              {u.current_value != null && (
                                <span className="ml-1 text-muted-foreground text-xs">· Valor: {fmtCurrency(u.current_value)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ── Modal: Registrar progresso / observação ── */}
      <Dialog open={!!updateModal} onOpenChange={(o) => !o && setUpdateModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {updateModal?.goal
                ? `Atualizar — ${GOAL_META[updateModal.goal.goal_type]?.label || updateModal.goal.goal_type}`
                : `Observação — ${updateModal?.lead.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {updateModal?.goal && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Valor atual (R$)</label>
                  <Input placeholder="Ex: 110.000" value={updateCurrentValue}
                    onChange={(e) => setUpdateCurrentValue(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prioridade</label>
                  <Select value={updatePriority} onValueChange={setUpdatePriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Observação *</label>
              <Textarea className="resize-none min-h-[90px]" placeholder="Descreva o que foi registrado..."
                value={updateNote} onChange={(e) => setUpdateNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateModal(null)}>Cancelar</Button>
            <Button onClick={saveUpdate} disabled={savingUpdate || !updateNote.trim()}>
              {savingUpdate ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
