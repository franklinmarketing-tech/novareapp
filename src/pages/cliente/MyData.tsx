import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { type IncomeItem } from "@/components/onboarding/StepRenda";
import { type ExpenseItem } from "@/components/onboarding/StepDespesas";
import { type DebtItem } from "@/components/onboarding/StepDividas";
import { type AssetItem } from "@/components/onboarding/StepPatrimonio";
import { type InsuranceItem } from "@/components/onboarding/StepSeguros";
import { type GoalItem } from "@/components/onboarding/StepObjetivos";
import { type BehavioralData, computeProfile, PROFILE_INFO } from "@/components/onboarding/StepComportamental";
import { StepIdentificacao } from "@/components/onboarding/StepIdentificacao";
import { StepRenda } from "@/components/onboarding/StepRenda";
import { StepDespesas } from "@/components/onboarding/StepDespesas";
import { StepDividas } from "@/components/onboarding/StepDividas";
import { StepPatrimonio } from "@/components/onboarding/StepPatrimonio";
import { StepSeguros } from "@/components/onboarding/StepSeguros";
import { StepObjetivos } from "@/components/onboarding/StepObjetivos";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Pencil, Save, X, User,
  Wallet, Receipt, CreditCard, Building2, Shield, Target, Brain,
  type LucideIcon,
  CheckCircle2, AlertTriangle, Heart, Flame, Sparkles,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

/* ── Helpers ── */
const fmt = (v: string | number) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!n || isNaN(n)) return "—";
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};
const fmtShort = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (abs >= 1_000) return `${sign}R$ ${Math.round(abs / 1_000)}k`;
  return `${sign}R$ ${Math.round(abs)}`;
};
const formatDate = (d: string) => { if (!d) return "—"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } }),
};

/* ── Labels ── */
const maritalLabels: Record<string, string> = { solteiro: "Solteiro(a)", casado: "Casado(a)", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)", uniao_estavel: "União Estável" };
const regimeLabels: Record<string, string> = { comunhao_parcial: "Comunhão Parcial", comunhao_universal: "Comunhão Universal", separacao_total: "Separação Total", participacao_final: "Participação Final" };
const frequencyLabels: Record<string, string> = { mensal: "Mensal", anual: "Anual", eventual: "Eventual" };
const stabilityLabels: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const priorityLabels: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

/* ── Small components ── */
const Val = ({ label, value }: { label: string; value?: string | number | null }) => {
  const display = value?.toString()?.trim();
  return (
    <div className="py-2.5">
      <span className="text-[0.625rem] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">{label}</span>
      <p className={`text-[0.875rem] font-medium mt-0.5 leading-snug ${display ? "text-foreground" : "text-muted-foreground/40 italic font-normal text-[0.8125rem]"}`}>
        {display || "Não informado"}
      </p>
    </div>
  );
};

const getMonthRef = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

/* ── Pulse Bar ── */
const PulseBar = ({ value, max, color, label }: { value: number; max: number; color: string; label: string }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] font-medium text-muted-foreground">{label}</span>
        <span className="text-[0.6875rem] font-bold text-foreground tabular-nums">{fmtShort(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
};

/* ── Financial Story Generator ── */
const getFinancialNarrative = (renda: number, despesas: number, patrimonio: number, dividas: number, firstName: string) => {
  const savings = renda - despesas;
  const savingsRate = renda > 0 ? (savings / renda) * 100 : 0;

  if (renda === 0) return { emoji: "📝", title: `${firstName}, sua história financeira começa aqui`, subtitle: "Preencha seus dados para descobrir seu Pulso Financeiro.", tone: "neutral" as const };
  if (savingsRate >= 30) return { emoji: "🚀", title: `${firstName}, você está construindo riqueza`, subtitle: `Poupando ${savingsRate.toFixed(0)}% da renda — acima da maioria. Continue assim.`, tone: "positive" as const };
  if (savingsRate >= 10) return { emoji: "📈", title: `${firstName}, seu caminho está no rumo certo`, subtitle: `${savingsRate.toFixed(0)}% da renda está sendo poupada. O próximo passo é otimizar despesas.`, tone: "positive" as const };
  if (savingsRate >= 0) return { emoji: "⚡", title: `${firstName}, há espaço para crescer`, subtitle: `Margem de ${savingsRate.toFixed(0)}% — com ajustes, dá pra acelerar seus objetivos.`, tone: "warning" as const };
  return { emoji: "🔥", title: `${firstName}, vamos virar esse jogo`, subtitle: `Despesas excedem a renda em ${fmt(Math.abs(savings))}. Seu plano de ação é a chave.`, tone: "danger" as const };
};

/* ═════════════════════════════════════════════ */
const MyData = () => {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modifiedSections, setModifiedSections] = useState<Set<number>>(new Set());
  const [monthlyConfirmed, setMonthlyConfirmed] = useState<Date | null>(null);
  const [confirmingData, setConfirmingData] = useState(false);
  const [highlightActive, setHighlightActive] = useState(false);
  const [highlightedOnce, setHighlightedOnce] = useState(false);
  const [editingDialog, setEditingDialog] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [profileName, setProfileName] = useState("");

  const [identificacao, setIdentificacao] = useState({ full_name: "", cpf: "", date_of_birth: "", marital_status: "", property_regime: "", profession: "", company: "", years_in_profession: "", dependents_count: "", dependents_ages: "", city: "", state: "" });
  const [rendas, setRendas] = useState<IncomeItem[]>([]);
  const [despesas, setDespesas] = useState<ExpenseItem[]>([]);
  const [dividas, setDividas] = useState<DebtItem[]>([]);
  const [patrimonio, setPatrimonio] = useState<AssetItem[]>([]);
  const [seguros, setSeguros] = useState<InsuranceItem[]>([]);
  const [objetivos, setObjetivos] = useState<GoalItem[]>([]);
  const [comportamental, setComportamental] = useState<BehavioralData>({
    financial_organization_score: 5, savings_discipline_score: 5, money_anxiety_score: 5,
    financial_confidence_score: 5, impulse_spending_score: 5, risk_tolerance_score: 5,
    spending_triggers: "", family_money_history: "",
  });

  const markModified = (section: number) => setModifiedSections((prev) => new Set(prev).add(section));

  const handleAtualizar = useCallback(() => {
    setHighlightActive(true);
    setHighlightedOnce(true);
    setExpandedSection(0);
    setTimeout(() => setHighlightActive(false), 3000);
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: clientData } = await supabase.from("clients").select("*").eq("user_id", user.id).maybeSingle();
      if (!clientData) { setLoading(false); return; }
      setClientId(clientData.id);

      const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (profileData) setProfileName(profileData.full_name || "");

      const [incomeRes, expenseRes, debtRes, assetRes, insuranceRes, goalRes] = await Promise.all([
        supabase.from("income").select("*").eq("client_id", clientData.id),
        supabase.from("expenses").select("*").eq("client_id", clientData.id),
        supabase.from("debts").select("*").eq("client_id", clientData.id),
        supabase.from("assets").select("*").eq("client_id", clientData.id),
        supabase.from("insurance").select("*").eq("client_id", clientData.id),
        supabase.from("goals").select("*").eq("client_id", clientData.id),
      ]);

      const { data: conf } = await supabase.from("data_confirmations").select("confirmed_at").eq("client_id", clientData.id).eq("month_ref", getMonthRef()).maybeSingle();
      if (conf) setMonthlyConfirmed(new Date(conf.confirmed_at));

      const c = clientData;
      setIdentificacao({ full_name: profileData?.full_name ?? "", cpf: c.cpf ?? "", date_of_birth: c.date_of_birth ?? "", marital_status: c.marital_status ?? "", property_regime: c.property_regime ?? "", profession: c.profession ?? "", company: c.company ?? "", years_in_profession: c.years_in_profession?.toString() ?? "", dependents_count: c.dependents_count?.toString() ?? "", dependents_ages: c.dependents_ages ?? "", city: c.city ?? "", state: c.state ?? "" });
      if (c.behavioral_profile && typeof c.behavioral_profile === "object") setComportamental(c.behavioral_profile as any);
      if (incomeRes.data?.length) setRendas(incomeRes.data.map((r) => ({ id: r.id, description: r.description, amount: r.amount.toString(), frequency: r.frequency, is_primary: r.is_primary ?? false, stability: r.stability ?? "media" })));
      if (expenseRes.data?.length) setDespesas(expenseRes.data.map((e) => ({ id: e.id, category: e.category, amount: e.amount.toString(), description: e.description ?? "" })));
      if (debtRes.data?.length) setDividas(debtRes.data.map((d) => ({ id: d.id, type: d.type, creditor: d.creditor ?? "", total_amount: d.total_amount.toString(), monthly_payment: d.monthly_payment?.toString() ?? "", interest_rate: d.interest_rate?.toString() ?? "", remaining_months: d.remaining_months?.toString() ?? "" })));
      if (assetRes.data?.length) setPatrimonio(assetRes.data.map((a) => ({ id: a.id, type: a.type, description: a.description ?? "", estimated_value: a.estimated_value.toString() })));
      if (insuranceRes.data?.length) setSeguros(insuranceRes.data.map((ins) => ({ id: ins.id, type: ins.type, provider: ins.provider ?? "", monthly_premium: ins.monthly_premium?.toString() ?? "", coverage_amount: ins.coverage_amount?.toString() ?? "" })));
      if (goalRes.data?.length) setObjetivos(goalRes.data.map((g) => ({ id: g.id, description: g.description, target_amount: g.target_amount?.toString() ?? "", deadline: g.deadline ?? "", priority: g.priority ?? "media" })));
      setLoading(false);
    };
    load();
  }, [user]);

  const handleConfirmData = async () => {
    if (!clientId) return;
    setConfirmingData(true);
    const monthRef = getMonthRef();
    // Check if already exists
    const { data: existing } = await supabase
      .from("data_confirmations")
      .select("id")
      .eq("client_id", clientId)
      .eq("month_ref", monthRef)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("data_confirmations")
        .update({ confirmed_at: new Date().toISOString() })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase
        .from("data_confirmations")
        .insert({ client_id: clientId, month_ref: monthRef }));
    }

    if (!error) {
      setMonthlyConfirmed(new Date());
      toast({ title: "Dados confirmados! 🎉", description: "Seus dados deste mês foram confirmados com sucesso." });
    } else {
      toast({ title: "Erro ao confirmar", description: error.message, variant: "destructive" });
    }
    setConfirmingData(false);
  };

  const saveSection = async (section: number) => {
    if (!clientId || !user) return;
    try {
      switch (section) {
        case 0: {
          await supabase.from("clients").update({ cpf: identificacao.cpf || null, date_of_birth: identificacao.date_of_birth || null, marital_status: (identificacao.marital_status as any) || null, property_regime: (identificacao.property_regime as any) || null, profession: identificacao.profession || null, company: identificacao.company || null, years_in_profession: identificacao.years_in_profession ? parseInt(identificacao.years_in_profession) : null, dependents_count: identificacao.dependents_count ? parseInt(identificacao.dependents_count) : 0, dependents_ages: identificacao.dependents_ages || null, city: identificacao.city || null, state: identificacao.state || null }).eq("id", clientId);
          await supabase.from("profiles").update({ full_name: identificacao.full_name }).eq("user_id", user.id);
          break;
        }
        case 1: {
          await supabase.from("income").delete().eq("client_id", clientId);
          const valid = rendas.filter((r) => r.description && r.amount);
          if (valid.length > 0) await supabase.from("income").insert(valid.map((r) => ({ client_id: clientId, description: r.description, amount: parseFloat(r.amount) || 0, frequency: r.frequency as any, is_primary: r.is_primary, stability: r.stability as any })));
          break;
        }
        case 2: {
          await supabase.from("expenses").delete().eq("client_id", clientId);
          const valid = despesas.filter((e) => e.amount && parseFloat(e.amount) > 0);
          if (valid.length > 0) await supabase.from("expenses").insert(valid.map((e) => ({ client_id: clientId, category: e.category, amount: parseFloat(e.amount) || 0, description: e.description || null, is_fixed: true })));
          break;
        }
        case 3: {
          await supabase.from("debts").delete().eq("client_id", clientId);
          const valid = dividas.filter((d) => d.type && d.total_amount);
          if (valid.length > 0) await supabase.from("debts").insert(valid.map((d) => ({ client_id: clientId, type: d.type, creditor: d.creditor || null, total_amount: parseFloat(d.total_amount) || 0, monthly_payment: parseFloat(d.monthly_payment) || 0, interest_rate: parseFloat(d.interest_rate) || 0, remaining_months: parseInt(d.remaining_months) || 0 })));
          break;
        }
        case 4: {
          await supabase.from("assets").delete().eq("client_id", clientId);
          const valid = patrimonio.filter((a) => a.type && a.estimated_value);
          if (valid.length > 0) await supabase.from("assets").insert(valid.map((a) => ({ client_id: clientId, type: a.type, description: a.description || null, estimated_value: parseFloat(a.estimated_value) || 0 })));
          break;
        }
        case 5: {
          await supabase.from("insurance").delete().eq("client_id", clientId);
          const valid = seguros.filter((s) => s.type);
          if (valid.length > 0) await supabase.from("insurance").insert(valid.map((s) => ({ client_id: clientId, type: s.type, provider: s.provider || null, monthly_premium: parseFloat(s.monthly_premium) || 0, coverage_amount: parseFloat(s.coverage_amount) || 0 })));
          break;
        }
        case 6: {
          await supabase.from("goals").delete().eq("client_id", clientId);
          const valid = objetivos.filter((g) => g.description);
          if (valid.length > 0) await supabase.from("goals").insert(valid.map((g) => ({ client_id: clientId, description: g.description, target_amount: parseFloat(g.target_amount) || null, deadline: g.deadline || null, priority: g.priority || "media" })));
          break;
        }
        case 7: {
          await supabase.from("clients").update({ behavioral_profile: comportamental as any }).eq("id", clientId);
          break;
        }
      }
    } catch (err) { console.error("Save error:", err); }
  };

  const handleSaveDialog = async (section: number) => {
    setSubmitting(true);
    await saveSection(section);
    setSubmitting(false);
    setEditingDialog(null);
    setModifiedSections((prev) => { const n = new Set(prev); n.delete(section); return n; });
    toast({ title: "Salvo com sucesso! ✨", description: "Suas alterações foram registradas." });
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Heart className="h-6 w-6 text-accent animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Carregando sua história financeira...</p>
        </div>
      </PageTransition>
    );
  }

  const totalRenda = rendas.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalDespesas = despesas.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalPatrimonio = patrimonio.reduce((s, a) => s + (parseFloat(a.estimated_value) || 0), 0);
  const totalDividas = dividas.reduce((s, d) => s + (parseFloat(d.total_amount) || 0), 0);
  const netWorth = totalPatrimonio - totalDividas;
  const savings = totalRenda - totalDespesas;
  const maxBar = Math.max(totalRenda, totalDespesas, totalPatrimonio, totalDividas, 1);
  const firstName = profileName.split(" ")[0] || "Cliente";
  const narrative = getFinancialNarrative(totalRenda, totalDespesas, totalPatrimonio, totalDividas, firstName);
  const behavProfile = computeProfile(comportamental);
  const behavInfo = PROFILE_INFO[behavProfile];

  const sectionIcons: LucideIcon[] = [User, Wallet, Receipt, CreditCard, Building2, Shield, Target, Brain];
  const sectionColors = [
    "bg-primary/10 text-primary", "bg-success/10 text-success", "bg-destructive/10 text-destructive",
    "bg-warning/10 text-warning", "bg-primary/10 text-primary", "bg-accent/10 text-accent",
    "bg-success/10 text-success", "bg-accent/10 text-accent",
  ];
  const sectionSubtitles = [
    "Quem você é",
    `${rendas.length} fonte${rendas.length !== 1 ? "s" : ""} · ${fmtShort(totalRenda)}/mês`,
    `${despesas.filter(e => parseFloat(e.amount) > 0).length} categorias · ${fmtShort(totalDespesas)}/mês`,
    `${dividas.length} dívida${dividas.length !== 1 ? "s" : ""} · ${fmtShort(totalDividas)} total`,
    `${patrimonio.length} ativo${patrimonio.length !== 1 ? "s" : ""} · ${fmtShort(totalPatrimonio)}`,
    `${seguros.length} proteç${seguros.length !== 1 ? "ões" : "ão"}`,
    `${objetivos.length} objetivo${objetivos.length !== 1 ? "s" : ""}`,
    `Perfil: ${behavProfile}`,
  ];

  const sections = [
    { key: 0, title: "Identificação", edit: <StepIdentificacao data={identificacao} onChange={(d) => { setIdentificacao(d); markModified(0); }} /> },
    { key: 1, title: "Renda", edit: <StepRenda data={rendas} onChange={(d) => { setRendas(d); markModified(1); }} /> },
    { key: 2, title: "Despesas", edit: <StepDespesas data={despesas} onChange={(d) => { setDespesas(d); markModified(2); }} /> },
    { key: 3, title: "Dívidas", edit: <StepDividas data={dividas} onChange={(d) => { setDividas(d); markModified(3); }} /> },
    { key: 4, title: "Patrimônio", edit: <StepPatrimonio data={patrimonio} onChange={(d) => { setPatrimonio(d); markModified(4); }} /> },
    { key: 5, title: "Seguros", edit: <StepSeguros data={seguros} onChange={(d) => { setSeguros(d); markModified(5); }} /> },
    { key: 6, title: "Objetivos", edit: <StepObjetivos data={objetivos} onChange={(d) => { setObjetivos(d); markModified(6); }} /> },
    { key: 7, title: "Perfil Comportamental", edit: <div className="text-sm text-muted-foreground italic">O perfil comportamental pode ser editado no onboarding</div> },
  ];

  /* ── Readonly renderers ── */
  const renderIdentificacao = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
      <Val label="Nome completo" value={identificacao.full_name} />
      <Val label="CPF" value={identificacao.cpf} />
      <Val label="Data de nascimento" value={formatDate(identificacao.date_of_birth)} />
      <Val label="Estado civil" value={maritalLabels[identificacao.marital_status]} />
      {identificacao.property_regime && <Val label="Regime de bens" value={regimeLabels[identificacao.property_regime]} />}
      <Val label="Profissão" value={identificacao.profession} />
      <Val label="Empresa" value={identificacao.company} />
      <Val label="Anos na profissão" value={identificacao.years_in_profession} />
      <Val label="Dependentes" value={identificacao.dependents_count || "0"} />
      {identificacao.dependents_ages && <Val label="Idades" value={identificacao.dependents_ages} />}
      <Val label="Cidade" value={identificacao.city} />
      <Val label="Estado" value={identificacao.state} />
    </div>
  );

  const renderList = (items: any[], empty: string, renderItem: (item: any, i: number) => React.ReactNode) =>
    items.length === 0 ? <p className="text-sm text-muted-foreground/50 italic py-3">{empty}</p> : <div className="space-y-2">{items.map(renderItem)}</div>;

  const renderRendas = () => renderList(rendas, "Nenhuma renda cadastrada", (r, i) => (
    <div key={i} className={`flex items-center justify-between rounded-xl p-3.5 bg-muted/30 ${r.is_primary ? "border-l-2 border-success/50" : ""}`}>
      <div>
        <p className="text-sm font-medium text-foreground">{r.description || "Sem descrição"}{r.is_primary && <span className="ml-2 text-[0.625rem] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Principal</span>}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{frequencyLabels[r.frequency]} · {stabilityLabels[r.stability]}</p>
      </div>
      <span className="text-sm font-bold text-foreground tabular-nums">{fmt(r.amount)}</span>
    </div>
  ));

  const renderDespesas = () => renderList(despesas.filter(e => parseFloat(e.amount) > 0), "Nenhuma despesa cadastrada", (e, i) => (
    <div key={i} className="flex items-center justify-between rounded-xl p-3.5 bg-muted/30">
      <div>
        <p className="text-sm font-medium text-foreground capitalize">{e.category.replace(/_/g, " ")}</p>
        {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
      </div>
      <span className="text-sm font-bold text-foreground tabular-nums">{fmt(e.amount)}</span>
    </div>
  ));

  const renderDividas = () => renderList(dividas, "Nenhuma dívida — parabéns! 🎉", (d, i) => (
    <div key={i} className={`rounded-xl p-3.5 bg-muted/30 ${parseFloat(d.interest_rate) > 5 ? "border-l-2 border-destructive/50" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground capitalize">{d.type.replace(/_/g, " ")}{d.creditor && ` · ${d.creditor}`}</p>
          {parseFloat(d.interest_rate) > 5 && <Flame className="h-6 w-6 text-destructive" />}
        </div>
        <span className="text-sm font-bold text-foreground tabular-nums">{fmt(d.total_amount)}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Parcela: {fmt(d.monthly_payment)} · Juros: {d.interest_rate || "—"}% · {d.remaining_months || "—"} meses</p>
    </div>
  ));

  const renderPatrimonio = () => renderList(patrimonio, "Nenhum ativo cadastrado", (a, i) => (
    <div key={i} className="flex items-center justify-between rounded-xl p-3.5 bg-muted/30">
      <div>
        <p className="text-sm font-medium text-foreground capitalize">{a.type.replace(/_/g, " ")}</p>
        {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
      </div>
      <span className="text-sm font-bold text-foreground tabular-nums">{fmt(a.estimated_value)}</span>
    </div>
  ));

  const renderSeguros = () => renderList(seguros, "Nenhum seguro cadastrado", (s, i) => (
    <div key={i} className="rounded-xl p-3.5 bg-muted/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground capitalize">{s.type.replace(/_/g, " ")}{s.provider && ` · ${s.provider}`}</p>
        <span className="text-sm font-bold text-foreground tabular-nums">{fmt(s.monthly_premium)}/mês</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Cobertura: {fmt(s.coverage_amount)}</p>
    </div>
  ));

  const renderObjetivos = () => renderList(objetivos, "Nenhum objetivo cadastrado", (g, i) => (
    <div key={i} className={`rounded-xl p-3.5 bg-muted/30 ${g.priority === "alta" ? "border-l-2 border-accent/50" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{g.description}</p>
        <span className="text-[0.625rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">{priorityLabels[g.priority] || g.priority}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Meta: {fmt(g.target_amount)} · Prazo: {formatDate(g.deadline)}</p>
    </div>
  ));

  const renderComportamental = () => (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        <Val label="Organização financeira" value={`${comportamental.financial_organization_score}/10`} />
        <Val label="Disciplina de poupança" value={`${comportamental.savings_discipline_score}/10`} />
        <Val label="Ansiedade com dinheiro" value={`${comportamental.money_anxiety_score}/10`} />
        <Val label="Confiança financeira" value={`${comportamental.financial_confidence_score}/10`} />
        <Val label="Compras por impulso" value={`${comportamental.impulse_spending_score}/10`} />
        <Val label="Apetite por risco" value={`${comportamental.risk_tolerance_score}/10`} />
      </div>
      {(comportamental.spending_triggers || comportamental.family_money_history) && (
        <div className="mt-3 space-y-2 border-t border-border/20 pt-3">
          {comportamental.spending_triggers && <Val label="Gatilhos de consumo" value={comportamental.spending_triggers} />}
          {comportamental.family_money_history && <Val label="Histórico familiar" value={comportamental.family_money_history} />}
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-accent/[0.06] border border-accent/20 p-3.5">
        <span className="text-xl">{behavInfo.emoji}</span>
        <div>
          <p className="text-sm font-bold text-foreground">{behavProfile}</p>
          <p className="text-xs text-muted-foreground">{behavInfo.description}</p>
        </div>
      </div>
    </div>
  );

  const readonlyRenderers = [renderIdentificacao, renderRendas, renderDespesas, renderDividas, renderPatrimonio, renderSeguros, renderObjetivos, renderComportamental];
  const editingSection = editingDialog !== null ? sections.find(s => s.key === editingDialog) : null;
  const toneColor = { positive: "border-success/30 bg-success/[0.04]", warning: "border-warning/30 bg-warning/[0.04]", danger: "border-destructive/30 bg-destructive/[0.04]", neutral: "border-border/40 bg-muted/20" };

  return (
    <PageTransition className="space-y-6 max-w-5xl mx-auto">

      {/* ━━━ NARRATIVE HERO ━━━ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
        <div className={`rounded-3xl border ${toneColor[narrative.tone]} p-6 lg:p-8`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <span className="text-3xl">{narrative.emoji}</span>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight leading-tight">{narrative.title}</h1>
              <p className="text-sm text-muted-foreground max-w-md">{narrative.subtitle}</p>
            </div>
            {/* Financial Pulse — the "estranheza" */}
            <div className="w-full lg:w-72 space-y-2.5 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="h-6 w-6 text-accent" />
                <span className="text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-wider">Pulso Financeiro</span>
              </div>
              <PulseBar value={totalRenda} max={maxBar} color="bg-success" label="Renda" />
              <PulseBar value={totalDespesas} max={maxBar} color="bg-destructive" label="Despesas" />
              <PulseBar value={totalPatrimonio} max={maxBar} color="bg-primary" label="Patrimônio" />
              <PulseBar value={totalDividas} max={maxBar} color="bg-warning" label="Dívidas" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ━━━ NORTH STAR KPIs ━━━ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="col-span-2 rounded-2xl border-border/40 shadow-subtle overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider">Patrimônio Líquido</p>
              <p className={`text-2xl font-bold tabular-nums ${netWorth >= 0 ? "text-foreground" : "text-destructive"}`}>{fmtShort(netWorth)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 shadow-subtle">
          <CardContent className="p-5">
            <p className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider">Fluxo Mensal</p>
            <p className={`text-xl font-bold tabular-nums mt-1 ${savings >= 0 ? "text-success" : "text-destructive"}`}>{savings >= 0 ? "+" : ""}{fmtShort(savings)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 shadow-subtle">
          <CardContent className="p-5">
            <p className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider">Objetivos</p>
            <p className="text-xl font-bold text-foreground tabular-nums mt-1">{objetivos.length}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ━━━ MONTHLY CONFIRMATION ━━━ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
        {monthlyConfirmed ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success/[0.04] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Dados confirmados este mês</p>
                <p className="text-xs text-muted-foreground">em {format(monthlyConfirmed, "dd 'de' MMMM", { locale: ptBR })}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMonthlyConfirmed(null); handleAtualizar(); }}
              className="text-xs text-muted-foreground hover:text-foreground rounded-full"
            >
              Atualizar dados novamente
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/[0.04] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Seus dados estão atualizados?</p>
                <p className="text-xs text-muted-foreground">Confirme ou atualize para manter seu plano preciso.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleAtualizar} className="text-xs rounded-full">Atualizar</Button>
              <Button variant="premium" size="sm" onClick={handleConfirmData} disabled={confirmingData} className="text-xs rounded-full">
                {confirmingData ? "Confirmando..." : "Confirmar Dados"}
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ━━━ Overlay ━━━ */}
      <AnimatePresence>
        {highlightActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="fixed inset-0 bg-foreground/50 z-40 pointer-events-none" />
        )}
      </AnimatePresence>

      {/* ━━━ CHAPTER CARDS ━━━ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="space-y-3">
        {sections.map((s, idx) => {
          const isFirst = idx === 0;
          const isHighlighted = highlightActive && isFirst;
          const show3D = highlightedOnce || isHighlighted;
          const Icon = sectionIcons[s.key];
          const isExpanded = expandedSection === s.key;

          return (
            <div
              key={s.key}
              className={`rounded-2xl border bg-card overflow-hidden transition-all duration-500 ${
                isHighlighted
                  ? "relative z-50 ring-2 ring-accent shadow-2xl scale-[1.01]"
                  : monthlyConfirmed
                    ? "border-success/30 shadow-subtle"
                    : "border-border/40 shadow-subtle hover:shadow-md"
              }`}
            >
              <button
                onClick={() => setExpandedSection(isExpanded ? null : s.key)}
                className="w-full flex items-center gap-4 p-4 lg:p-5 text-left group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${
                  monthlyConfirmed ? "bg-success/10 text-success" : sectionColors[idx]
                } ${isExpanded ? "scale-110" : "group-hover:scale-105"}`}>
                  {monthlyConfirmed ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-[0.6875rem] text-muted-foreground truncate">{sectionSubtitles[idx]}</p>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {s.key !== 7 && (
                    <Button
                      variant={monthlyConfirmed ? "ghost" : show3D ? "premium" : "ghost"}
                      size="sm"
                      onClick={() => setEditingDialog(s.key)}
                      className={`h-8 px-3 text-xs gap-1.5 rounded-xl transition-all duration-500 ${monthlyConfirmed ? "opacity-40 hover:opacity-100" : ""}`}
                    >
                      <Pencil className="h-6 w-6" /> Editar
                    </Button>
                  )}
                </div>
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted-foreground/40">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 lg:px-5 pb-5 pt-1 border-t border-border/20">
                      {readonlyRenderers[s.key]()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>

      {/* ━━━ EDIT DIALOG ━━━ */}
      <Dialog open={editingDialog !== null} onOpenChange={(open) => { if (!open) setEditingDialog(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          {editingSection && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-lg">
                  <div className={`w-9 h-9 rounded-xl ${sectionColors[editingSection.key]} flex items-center justify-center shrink-0`}>
                    {(() => { const I = sectionIcons[editingSection.key]; return <I className="h-6 w-6" />; })()}
                  </div>
                  Editar {editingSection.title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">{editingSection.edit}</div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border/30">
                <Button variant="outline" onClick={() => setEditingDialog(null)} className="rounded-xl gap-1.5"><X className="h-6 w-6" /> Cancelar</Button>
                <Button variant="premium" onClick={() => handleSaveDialog(editingSection.key)} disabled={submitting} className="rounded-xl gap-1.5">
                  <Save className="h-6 w-6" /> {submitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default MyData;
