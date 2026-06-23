import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientId, useSelectedMonth } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { type IncomeItem } from "@/components/onboarding/StepRenda";
import { type ExpenseItem } from "@/components/onboarding/StepDespesas";
import { type DebtItem } from "@/components/onboarding/StepDividas";
import { type AssetItem } from "@/components/onboarding/StepPatrimonio";
import { type InsuranceItem } from "@/components/onboarding/StepSeguros";
import { type GoalItem } from "@/components/onboarding/StepObjetivos";
import { type BehavioralData } from "@/components/onboarding/StepComportamental";
import { StepRenda } from "@/components/onboarding/StepRenda";
import { StepDespesas } from "@/components/onboarding/StepDespesas";
import { StepDividas } from "@/components/onboarding/StepDividas";
import { StepPatrimonio } from "@/components/onboarding/StepPatrimonio";
import { StepSeguros } from "@/components/onboarding/StepSeguros";
import { StepObjetivos } from "@/components/onboarding/StepObjetivos";
import { StepIdentificacao } from "@/components/onboarding/StepIdentificacao";
import { computeProfile, PROFILE_INFO } from "@/components/onboarding/StepComportamental";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClientFinancialSidebar, type ClientFinancials } from "@/components/parecer/ClientFinancialSidebar";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import type { BehavioralProfile } from "@/components/onboarding/StepComportamental";
import {
  Pencil, Save, X,
  User, Wallet, Receipt, CreditCard, Building2, Shield, Target, Brain,
  TrendingUp, TrendingDown, Landmark, type LucideIcon,
  PiggyBank, CalendarDays, Lock, Unlock, Flag, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const MONTH_NAMES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const monthRefLabel = (ref: string) => {
  const [y, m] = ref.split("-").map(Number);
  return `${MONTH_NAMES_FULL[m - 1]} ${y}`;
};
const currentMonthRef = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const formatCurrency = (v: string | number) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!n || isNaN(n)) return "—";
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

const formatCurrencyTotal = (v: number) =>
  `R$ ${(Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const itemCountLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

const sectionSummary = ({
  count,
  total,
  suffix = "",
  singular,
  plural,
  emptyPrimary,
  emptySecondary,
}: {
  count: number;
  total: number;
  suffix?: string;
  singular: string;
  plural: string;
  emptyPrimary: string;
  emptySecondary: string;
}) => ({
  primarySummary: count === 0 ? emptyPrimary : `${formatCurrencyTotal(total)}${suffix}`,
  secondarySummary: count === 0 ? emptySecondary : itemCountLabel(count, singular, plural),
  isEmpty: count === 0,
});

const formatDate = (d: string) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const Val = ({ label, value }: { label: string; value?: string | number | null }) => {
  const display = value?.toString()?.trim();
  return (
    <div className="py-3 border-b border-border/20 last:border-0">
      <span className="font-body text-[0.6875rem] font-semibold text-accent/60 uppercase tracking-[0.12em]">{label}</span>
      <p className={`text-[0.9375rem] font-medium mt-1 leading-snug ${display ? "text-foreground" : "text-muted-foreground/50 italic font-normal"}`}>
        {display || "Não informado"}
      </p>
    </div>
  );
};

const maritalLabels: Record<string, string> = {
  solteiro: "Solteiro(a)", casado: "Casado(a)", divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)", uniao_estavel: "União Estável",
};
const regimeLabels: Record<string, string> = {
  comunhao_parcial: "Comunhão Parcial", comunhao_universal: "Comunhão Universal",
  separacao_total: "Separação Total", participacao_final: "Participação Final",
};
const frequencyLabels: Record<string, string> = { mensal: "Mensal", anual: "Anual", eventual: "Eventual" };
const stabilityLabels: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const priorityLabels: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

const expenseLabels: Record<string, string> = {
  moradia: "Moradia", educacao: "Educação", saude: "Saúde", transporte: "Transporte",
  alimentacao: "Alimentação", lazer: "Lazer", vestuario: "Vestuário", pensao: "Pensão alimentícia",
  doacoes: "Doações / Dízimo", assinaturas: "Assinaturas digitais", academia: "Academia",
  pet: "Pet", empregada: "Empregada / Diarista", cuidador: "Cuidador / Babá", terapia: "Terapia",
  cursos: "Cursos extras", outros: "Outros",
};

const cleanCustomValue = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.startsWith("custom:") ? trimmed.slice(7).trim() : trimmed;
};

const humanizeValue = (value?: string | null, labels: Record<string, string> = {}) => {
  const cleaned = cleanCustomValue(value);
  if (!cleaned) return "";
  return labels[cleaned] ?? cleaned.replace(/_/g, " ");
};

const ReadonlyItem = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`bg-muted/40 rounded-xl p-4 min-w-0 ${className}`}>
    {children}
  </div>
);

const EditButton = ({
  onClick,
}: {
  onClick: () => void;
}) => (
  <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
    <Button variant="ghost" size="sm" onClick={onClick} className="h-7 px-2 text-xs gap-1 text-accent hover:text-accent">
      <Pencil className="h-6 w-6" /> Editar
    </Button>
  </div>
);

const sectionIconConfig: Record<number, { bg: string; text: string }> = {
  0: { bg: "bg-primary/10", text: "text-primary" },
  1: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  2: { bg: "bg-red-500/10", text: "text-red-500" },
  3: { bg: "bg-orange-500/10", text: "text-orange-500" },
  4: { bg: "bg-blue-500/10", text: "text-blue-600" },
  5: { bg: "bg-purple-500/10", text: "text-purple-600" },
  6: { bg: "bg-accent/10", text: "text-accent" },
  7: { bg: "bg-amber-500/10", text: "text-amber-600" },
};

const SectionIcon = ({ icon: Icon, index = 0 }: { icon: LucideIcon; index?: number }) => {
  const config = sectionIconConfig[index] || { bg: "bg-accent/10", text: "text-accent" };
  return (
    <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
      <Icon className={`h-6 w-6 ${config.text}`} />
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) => (
  <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-semibold text-muted-foreground/70 uppercase tracking-[0.1em]">{label}</p>
        <p className="text-lg font-semibold text-foreground tabular-nums truncate">{value}</p>
      </div>
    </div>
  </div>
);

const ClientOnboarding = () => {
  const { clientId } = useClientId();
  const navigate = useNavigate();
  const [editingDialog, setEditingDialog] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modifiedSections, setModifiedSections] = useState<Set<number>>(new Set());

  const [identificacao, setIdentificacao] = useState({
    full_name: "", cpf: "", date_of_birth: "", marital_status: "", property_regime: "",
    profession: "", company: "", years_in_profession: "", dependents_count: "", dependents_ages: "",
    city: "", state: "",
  });
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

  // ── Filtro de mês (compartilhado entre abas) ──
  const { selectedMonth, setSelectedMonth } = useSelectedMonth();
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [closedMonths, setClosedMonths] = useState<Set<string>>(new Set());
  // Map month_ref → { id, status } para permitir reabrir direto desta aba
  const [closingsByMonth, setClosingsByMonth] = useState<Map<string, { id: string; status: string }>>(new Map());
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const baselineMonth = availableMonths.length > 0 ? availableMonths[0] : null;
  const isLocked = selectedMonth ? closedMonths.has(selectedMonth) : false;

  const handleReopen = async () => {
    if (!selectedMonth) return;
    const closing = closingsByMonth.get(selectedMonth);
    if (!closing) return;
    setReopening(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("monthly_closings")
      .update({ status: "reaberto", reopened_at: new Date().toISOString(), reopened_by: authUser?.id })
      .eq("id", closing.id);
    setReopening(false);
    setConfirmReopen(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mês reaberto", description: `${monthRefLabel(selectedMonth)} liberado para edição.` });
    // Atualiza estado local sem recarregar tudo
    setClosingsByMonth((prev) => { const m = new Map(prev); m.set(selectedMonth, { ...closing, status: "reaberto" }); return m; });
    setClosedMonths((prev) => { const s = new Set(prev); s.delete(selectedMonth); return s; });
  };

  // Carrega a lista de meses disponíveis (todas as tabelas com month_ref) + meses fechados
  useEffect(() => {
    if (!clientId) return;
    const loadMonths = async () => {
      const [inc, exp, debt, asst, ins, gls, closings] = await Promise.all([
        supabase.from("income").select("month_ref").eq("client_id", clientId).not("month_ref", "is", null),
        supabase.from("expenses").select("month_ref").eq("client_id", clientId).not("month_ref", "is", null),
        supabase.from("debts").select("month_ref").eq("client_id", clientId).not("month_ref", "is", null),
        supabase.from("assets").select("month_ref").eq("client_id", clientId).not("month_ref", "is", null),
        supabase.from("insurance").select("month_ref").eq("client_id", clientId).not("month_ref", "is", null),
        supabase.from("goals").select("month_ref").eq("client_id", clientId).not("month_ref", "is", null),
        supabase.from("monthly_closings").select("id, month_ref, status").eq("client_id", clientId),
      ]);
      const set = new Set<string>();
      [...(inc.data || []), ...(exp.data || []), ...(debt.data || []), ...(asst.data || []), ...(ins.data || []), ...(gls.data || [])]
        .forEach((r: any) => { if (r.month_ref) set.add(String(r.month_ref).slice(0, 10)); });
      // Sempre incluir o mês atual no seletor (mesmo sem dados)
      set.add(currentMonthRef());
      // Inclui meses fechados (mesmo se não houver registros editáveis)
      const closedSet = new Set<string>();
      const byMonthMap = new Map<string, { id: string; status: string }>();
      (closings.data || []).forEach((c: any) => {
        if (c.month_ref) {
          const ref = String(c.month_ref).slice(0, 10);
          set.add(ref);
          byMonthMap.set(ref, { id: c.id, status: c.status });
          // Só trava se realmente fechado — meses "reabertos" ficam editáveis
          if (c.status !== "reaberto") closedSet.add(ref);
        }
      });
      const sorted = Array.from(set).sort();
      setAvailableMonths(sorted);
      setClosedMonths(closedSet);
      setClosingsByMonth(byMonthMap);
      // Default: mais recente não fechado, fallback mais recente
      if (!selectedMonth) {
        const firstUnclosed = [...sorted].reverse().find((m) => !closedSet.has(m));
        setSelectedMonth(firstUnclosed || sorted[sorted.length - 1] || currentMonthRef());
      }
    };
    loadMonths();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEditDialog = (section: number) => setEditingDialog(section);
  const closeEditDialog = () => {
    if (editingDialog !== null && modifiedSections.has(editingDialog) && !window.confirm("Existem alterações não salvas. Deseja sair sem salvar?")) return;
    setEditingDialog(null);
  };

  const markModified = (section: number) => {
    setModifiedSections((prev) => new Set(prev).add(section));
  };

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      setLoading(true);
      // Filtra estritamente por month_ref do mês selecionado.
      // Registros legados (NULL) são atribuídos ao primeiro mês ao fechar — não devem
      // vazar entre meses, senão duplicariam após o clone.
      const monthFilter = (q: any) => selectedMonth
        ? q.eq("month_ref", selectedMonth)
        : q;
      const [clientRes, profileRes, incomeRes, expenseRes, debtRes, assetRes, insuranceRes, goalRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        supabase.from("profiles").select("*").eq("user_id", (await supabase.from("clients").select("user_id").eq("id", clientId).single()).data?.user_id ?? "").single(),
        monthFilter(supabase.from("income").select("*").eq("client_id", clientId)),
        monthFilter(supabase.from("expenses").select("*").eq("client_id", clientId)),
        monthFilter(supabase.from("debts").select("*").eq("client_id", clientId)),
        monthFilter(supabase.from("assets").select("*").eq("client_id", clientId)),
        monthFilter(supabase.from("insurance").select("*").eq("client_id", clientId)),
        monthFilter(supabase.from("goals").select("*").eq("client_id", clientId)),
      ]);

      if (clientRes.data) {
        const c = clientRes.data;
        setIdentificacao({
          full_name: profileRes.data?.full_name ?? "", cpf: c.cpf ?? "", date_of_birth: c.date_of_birth ?? "",
          marital_status: c.marital_status ?? "", property_regime: c.property_regime ?? "",
          profession: c.profession ?? "", company: c.company ?? "",
          years_in_profession: c.years_in_profession?.toString() ?? "",
          dependents_count: c.dependents_count?.toString() ?? "",
          dependents_ages: c.dependents_ages ?? "", city: c.city ?? "", state: c.state ?? "",
        });
        if (c.behavioral_profile && typeof c.behavioral_profile === "object") {
          setComportamental(c.behavioral_profile as any);
        }
      }
      if (incomeRes.data?.length) setRendas(incomeRes.data.map((r) => ({ id: r.id, description: r.description, amount: r.amount.toString(), frequency: r.frequency, is_primary: r.is_primary ?? false, stability: r.stability ?? "media" })));
      if (expenseRes.data?.length) setDespesas(expenseRes.data.map((e: any) => ({ id: e.id, category: e.category, amount: e.amount.toString(), description: e.description ?? "", is_fixed: e.is_fixed ?? true, due_day: e.due_day != null ? String(e.due_day) : "" })));
      if (debtRes.data?.length) setDividas(debtRes.data.map((d) => ({ id: d.id, type: d.type, creditor: d.creditor ?? "", total_amount: d.total_amount.toString(), monthly_payment: d.monthly_payment?.toString() ?? "", interest_rate: d.interest_rate?.toString() ?? "", remaining_months: d.remaining_months?.toString() ?? "" })));
      if (assetRes.data?.length) setPatrimonio(assetRes.data.map((a) => ({ id: a.id, type: a.type, description: a.description ?? "", estimated_value: a.estimated_value.toString() })));
      if (insuranceRes.data?.length) setSeguros(insuranceRes.data.map((ins) => ({ id: ins.id, type: ins.type, provider: ins.provider ?? "", monthly_premium: ins.monthly_premium?.toString() ?? "", coverage_amount: ins.coverage_amount?.toString() ?? "" })));
      if (goalRes.data?.length) setObjetivos(goalRes.data.map((g) => ({ id: g.id, description: g.description, target_amount: g.target_amount?.toString() ?? "", deadline: g.deadline ?? "", priority: g.priority ?? "media" })));
      else setObjetivos([]);
      if (!incomeRes.data?.length)    setRendas([]);
      if (!expenseRes.data?.length)   setDespesas([]);
      if (!debtRes.data?.length)      setDividas([]);
      if (!assetRes.data?.length)     setPatrimonio([]);
      if (!insuranceRes.data?.length) setSeguros([]);
      setLoading(false);
    };
    load();
  }, [clientId, selectedMonth]);

  const saveSection = async (section: number) => {
    if (!clientId) return;
    try {
      const payloadBySection: Record<number, unknown> = {
        0: identificacao,
        1: rendas,
        2: despesas,
        3: dividas,
        4: patrimonio,
        5: seguros,
        6: objetivos,
        7: comportamental,
      };

      const { data, error } = await supabase.functions.invoke("save-onboarding-section", {
        body: {
          clientId,
          section,
          payload: payloadBySection[section],
          // Quando há mês selecionado, o save afeta apenas registros daquele mês.
          // Seções 0 (identificação) e 7 (comportamental) ignoram monthRef (são globais).
          monthRef: section >= 1 && section <= 6 ? selectedMonth : null,
        },
      });

      if (error) throw error;
      const committed = data?.committed;

      switch (section) {
        case 1:
          setRendas((committed ?? []).map((r: any) => ({ id: r.id, description: r.description, amount: r.amount.toString(), frequency: r.frequency, is_primary: r.is_primary ?? false, stability: r.stability ?? "media" })));
          break;
        case 2:
          setDespesas((committed ?? []).map((e: any) => ({ id: e.id, category: e.category, amount: e.amount.toString(), description: e.description ?? "", is_fixed: e.is_fixed ?? true, due_day: e.due_day != null ? String(e.due_day) : "" })));
          break;
        case 3:
          setDividas((committed ?? []).map((d: any) => ({ id: d.id, type: d.type, creditor: d.creditor ?? "", total_amount: d.total_amount.toString(), monthly_payment: d.monthly_payment?.toString() ?? "", interest_rate: d.interest_rate?.toString() ?? "", remaining_months: d.remaining_months?.toString() ?? "" })));
          break;
        case 4:
          setPatrimonio((committed ?? []).map((a: any) => ({ id: a.id, type: a.type, description: a.description ?? "", estimated_value: a.estimated_value.toString() })));
          break;
        case 5:
          setSeguros((committed ?? []).map((ins: any) => ({ id: ins.id, type: ins.type, provider: ins.provider ?? "", monthly_premium: ins.monthly_premium?.toString() ?? "", coverage_amount: ins.coverage_amount?.toString() ?? "" })));
          break;
        case 6:
          setObjetivos((committed ?? []).map((g: any) => ({ id: g.id, description: g.description, target_amount: g.target_amount?.toString() ?? "", deadline: g.deadline ?? "", priority: g.priority ?? "media" })));
          break;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Save error:", err);
      throw err;
    }
  };

  const handleSaveAll = async () => {
    if (modifiedSections.size === 0) {
      toast({ title: "Nenhuma alteração", description: "Nenhuma seção foi modificada." });
      return;
    }
    setSubmitting(true);
    for (const section of Array.from(modifiedSections).sort()) {
      await saveSection(section);
    }
    setSubmitting(false);
    setEditingDialog(null);
    setModifiedSections(new Set());
    toast({ title: "Dados salvos!", description: "Todas as alterações foram salvas com sucesso." });
  };

  const totalRenda = rendas.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalDespesas = despesas.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalPatrimonio = patrimonio.reduce((s, a) => s + (parseFloat(a.estimated_value) || 0), 0);
  const totalDividas = dividas.reduce((s, d) => s + (parseFloat(d.total_amount) || 0), 0);
  const totalSegurosMensal = seguros.reduce((s, seguro) => s + (parseFloat(seguro.monthly_premium) || 0), 0);
  const totalObjetivos = objetivos.reduce((s, objetivo) => s + (parseFloat(objetivo.target_amount) || 0), 0);
  const perfilComportamental = computeProfile(comportamental);

  const financials: ClientFinancials | null = useMemo(() => {
    if (totalRenda === 0 && totalDespesas === 0 && totalPatrimonio === 0 && totalDividas === 0) return null;
    const savingsCapacity = totalRenda - totalDespesas;
    const expenseRatio = totalRenda > 0 ? (totalDespesas / totalRenda) * 100 : 0;
    const topExpenses = despesas
      .filter(e => parseFloat(e.amount) > 0)
      .map(e => ({ category: e.category, amount: parseFloat(e.amount) || 0 }))
      .sort((a, b) => b.amount - a.amount);
    return {
      totalIncome: totalRenda, totalExpenses: totalDespesas, totalAssets: totalPatrimonio, totalDebts: totalDividas,
      savingsCapacity, expenseRatio, riskClassification: null, topExpenses,
      debts: dividas.map(d => ({ type: d.type, creditor: d.creditor || null, total_amount: parseFloat(d.total_amount) || 0, monthly_payment: parseFloat(d.monthly_payment) || null, interest_rate: parseFloat(d.interest_rate) || null })),
      goals: objetivos.map(g => ({ description: g.description, target_amount: parseFloat(g.target_amount) || null, priority: g.priority || null, deadline: g.deadline || null })),
      insurance: seguros.map(s => ({ type: s.type, monthly_premium: parseFloat(s.monthly_premium) || null })),
    };
  }, [totalRenda, totalDespesas, totalPatrimonio, totalDividas, rendas, despesas, dividas, objetivos, seguros]);



  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
      </div>
    );
  }

  const renderIdentificacaoReadonly = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
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

  const renderRendasReadonly = () => (
    rendas.length === 0 ? <p className="font-body text-sm text-muted-foreground/60 italic">Nenhuma renda cadastrada</p> : (
      <div className="space-y-2.5">
        {rendas.map((r, i) => (
          <ReadonlyItem key={i} className={r.is_primary ? "border-l-2 border-accent/40" : ""}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 break-words">
                <p className="text-[0.9375rem] font-medium text-foreground break-words">{humanizeValue(r.description) || "Sem descrição"}{r.is_primary && <span className="ml-2 inline-flex text-[0.6875rem] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wide">Principal</span>}</p>
                <p className="font-body text-[0.8125rem] text-muted-foreground mt-0.5 break-words">{humanizeValue(r.frequency, frequencyLabels)} · Estabilidade: {humanizeValue(r.stability, stabilityLabels)}</p>
              </div>
              <span className="text-[0.9375rem] font-semibold text-foreground tabular-nums shrink-0">{formatCurrency(r.amount)}</span>
            </div>
          </ReadonlyItem>
        ))}
      </div>
    )
  );

  const renderDespesasReadonly = () => (
    despesas.length === 0 ? <p className="font-body text-sm text-muted-foreground/60 italic">Nenhuma despesa cadastrada</p> : (
      <div className="space-y-2.5">
        {despesas.filter(e => parseFloat(e.amount) > 0).map((e, i) => (
          <ReadonlyItem key={i}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 break-words">
                <p className="text-[0.9375rem] font-medium text-foreground break-words">{humanizeValue(e.category, expenseLabels) || "Sem categoria"}</p>
                {e.description && <p className="font-body text-[0.8125rem] text-muted-foreground mt-0.5 break-words">{cleanCustomValue(e.description)}</p>}
              </div>
              <span className="text-[0.9375rem] font-semibold text-foreground tabular-nums shrink-0">{formatCurrency(e.amount)}</span>
            </div>
          </ReadonlyItem>
        ))}
      </div>
    )
  );

  const renderDividasReadonly = () => (
    dividas.length === 0 ? <p className="font-body text-sm text-muted-foreground/60 italic">Nenhuma dívida cadastrada</p> : (
      <div className="space-y-2.5">
        {dividas.map((d, i) => {
          const highInterest = parseFloat(d.interest_rate) > 5;
          return (
            <ReadonlyItem key={i} className={highInterest ? "border-l-2 border-destructive/40" : ""}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-[0.9375rem] font-medium text-foreground break-words min-w-0">{humanizeValue(d.type) || "Sem tipo"}{d.creditor && ` · ${humanizeValue(d.creditor)}`}</p>
                <span className="text-[0.9375rem] font-semibold text-foreground tabular-nums shrink-0">{formatCurrency(d.total_amount)}</span>
              </div>
              <p className="font-body text-[0.8125rem] text-muted-foreground mt-1 break-words">
                Parcela: {formatCurrency(d.monthly_payment)} · Juros: {d.interest_rate || "—"}% · {d.remaining_months || "—"} meses restantes
              </p>
            </ReadonlyItem>
          );
        })}
      </div>
    )
  );

  const renderPatrimonioReadonly = () => (
    patrimonio.length === 0 ? <p className="font-body text-sm text-muted-foreground/60 italic">Nenhum ativo cadastrado</p> : (
      <div className="space-y-2.5">
        {patrimonio.map((a, i) => (
          <ReadonlyItem key={i}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 break-words">
                <p className="text-[0.9375rem] font-medium text-foreground break-words">{humanizeValue(a.type) || "Sem tipo"}</p>
                {a.description && <p className="font-body text-[0.8125rem] text-muted-foreground mt-0.5 break-words">{cleanCustomValue(a.description)}</p>}
              </div>
              <span className="text-[0.9375rem] font-semibold text-foreground tabular-nums shrink-0">{formatCurrency(a.estimated_value)}</span>
            </div>
          </ReadonlyItem>
        ))}
      </div>
    )
  );

  const renderSegurosReadonly = () => (
    seguros.length === 0 ? <p className="font-body text-sm text-muted-foreground/60 italic">Nenhum seguro cadastrado</p> : (
      <div className="space-y-2.5">
        {seguros.map((s, i) => (
          <ReadonlyItem key={i}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-[0.9375rem] font-medium text-foreground break-words min-w-0">{humanizeValue(s.type) || "Sem tipo"}{s.provider && ` · ${humanizeValue(s.provider)}`}</p>
              <span className="text-[0.9375rem] font-semibold text-foreground tabular-nums shrink-0">{formatCurrency(s.monthly_premium)}/mês</span>
            </div>
            <p className="font-body text-[0.8125rem] text-muted-foreground mt-1 break-words">Cobertura: {formatCurrency(s.coverage_amount)}</p>
          </ReadonlyItem>
        ))}
      </div>
    )
  );

  const renderObjetivosReadonly = () => (
    objetivos.length === 0 ? <p className="font-body text-sm text-muted-foreground/60 italic">Nenhum objetivo cadastrado</p> : (
      <div className="space-y-2.5">
        {objetivos.map((g, i) => (
          <ReadonlyItem key={i} className={g.priority === "alta" ? "border-l-2 border-accent/40" : ""}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-[0.9375rem] font-medium text-foreground break-words min-w-0">{humanizeValue(g.description) || "Sem descrição"}</p>
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent/10 text-accent shrink-0 w-fit">{humanizeValue(g.priority, priorityLabels)}</span>
            </div>
            <p className="font-body text-[0.8125rem] text-muted-foreground mt-1 break-words">
              Meta: {formatCurrency(g.target_amount)} · Prazo: {formatDate(g.deadline)}
            </p>
          </ReadonlyItem>
        ))}
      </div>
    )
  );

  const renderComportamentalReadonly = () => {
    const profile = computeProfile(comportamental);
    const info = PROFILE_INFO[profile];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
        <Val label="Organização financeira" value={`${comportamental.financial_organization_score}/10`} />
        <Val label="Disciplina de poupança" value={`${comportamental.savings_discipline_score}/10`} />
        <Val label="Ansiedade com dinheiro" value={`${comportamental.money_anxiety_score}/10`} />
        <Val label="Confiança financeira" value={`${comportamental.financial_confidence_score}/10`} />
        <Val label="Compras por impulso" value={`${comportamental.impulse_spending_score}/10`} />
        <Val label="Apetite por risco" value={`${comportamental.risk_tolerance_score}/10`} />
        <div className="sm:col-span-2"><Val label="Gatilhos de consumo" value={comportamental.spending_triggers} /></div>
        <div className="sm:col-span-2"><Val label="Histórico familiar" value={comportamental.family_money_history} /></div>
        <div className="sm:col-span-2"><Val label="Perfil comportamental" value={`${info.emoji} ${profile} — ${info.description}`} /></div>
      </div>
    );
  };

  const sectionIcons: LucideIcon[] = [User, Wallet, Receipt, CreditCard, Building2, Shield, Target, Brain];

  const sections = [
    { key: 0, title: "Identificação", primarySummary: identificacao.full_name || "Não informado", secondarySummary: identificacao.full_name ? "Dados cadastrais" : "Completar identificação", isEmpty: !identificacao.full_name, readonly: renderIdentificacaoReadonly, edit: <StepIdentificacao data={identificacao} onChange={(d) => { setIdentificacao(d); markModified(0); }} /> },
    { key: 1, title: "Renda", ...sectionSummary({ count: rendas.length, total: totalRenda, suffix: "/mês", singular: "fonte", plural: "fontes", emptyPrimary: "Nenhuma renda cadastrada", emptySecondary: "Adicionar renda" }), readonly: renderRendasReadonly, edit: <StepRenda data={rendas} onChange={(d) => { setRendas(d); markModified(1); }} /> },
    { key: 2, title: "Despesas", ...sectionSummary({ count: despesas.length, total: totalDespesas, suffix: "/mês", singular: "despesa", plural: "despesas", emptyPrimary: "Nenhuma despesa cadastrada", emptySecondary: "Adicionar despesa" }), readonly: renderDespesasReadonly, edit: <StepDespesas data={despesas} onChange={(d) => { setDespesas(d); markModified(2); }} /> },
    { key: 3, title: "Dívidas", ...sectionSummary({ count: dividas.length, total: totalDividas, singular: "dívida", plural: "dívidas", emptyPrimary: "Nenhuma dívida cadastrada", emptySecondary: "Adicionar dívida" }), readonly: renderDividasReadonly, edit: <StepDividas data={dividas} onChange={(d) => { setDividas(d); markModified(3); }} /> },
    { key: 4, title: "Patrimônio", ...sectionSummary({ count: patrimonio.length, total: totalPatrimonio, singular: "ativo", plural: "ativos", emptyPrimary: "Nenhum ativo cadastrado", emptySecondary: "Adicionar ativo" }), readonly: renderPatrimonioReadonly, edit: <StepPatrimonio data={patrimonio} onChange={(d) => { setPatrimonio(d); markModified(4); }} /> },
    { key: 5, title: "Seguros", ...sectionSummary({ count: seguros.length, total: totalSegurosMensal, suffix: "/mês", singular: "seguro", plural: "seguros", emptyPrimary: "Nenhum seguro cadastrado", emptySecondary: "Adicionar seguro" }), readonly: renderSegurosReadonly, edit: <StepSeguros data={seguros} onChange={(d) => { setSeguros(d); markModified(5); }} /> },
    { key: 6, title: "Objetivos", ...sectionSummary({ count: objetivos.length, total: totalObjetivos, singular: "objetivo", plural: "objetivos", emptyPrimary: "Nenhum objetivo cadastrado", emptySecondary: "Adicionar objetivo" }), readonly: renderObjetivosReadonly, edit: <StepObjetivos data={objetivos} onChange={(d) => { setObjetivos(d); markModified(6); }} /> },
    { key: 7, title: "Perfil Comportamental", primarySummary: perfilComportamental, secondarySummary: "Perfil calculado", isEmpty: false, readonly: renderComportamentalReadonly, edit: <div className="text-sm text-muted-foreground italic">Edição disponível no onboarding do cliente</div> },
  ];

  return (
    <div className="space-y-6">
      {/* Edit Dialog */}
      <Dialog open={editingDialog !== null} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl h-[calc(100dvh-1rem)] sm:h-[min(92vh,860px)] max-h-[calc(100dvh-1rem)] overflow-hidden p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 shrink-0 border-b border-border/40">
            <DialogTitle className="flex items-start gap-3 font-display">
              {editingDialog !== null && (
                <>
                  <SectionIcon icon={sectionIcons[editingDialog]} index={editingDialog} />
                  <span className="min-w-0">
                    <span className="block">Editar {sections[editingDialog].title}</span>
                    <span className="mt-1 block text-xs font-semibold text-muted-foreground tabular-nums">
                      {sections[editingDialog].primarySummary}{sections[editingDialog].secondarySummary ? ` · ${sections[editingDialog].secondarySummary}` : ""}{modifiedSections.has(editingDialog) ? " · Não salvo" : ""}
                    </span>
                  </span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {editingDialog !== null && sections[editingDialog].edit}
          </div>
          <DialogFooter className="shrink-0 px-4 py-4 sm:px-6 border-t border-border/40 bg-background/95">
            <Button variant="outline" onClick={closeEditDialog}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (editingDialog !== null && modifiedSections.has(editingDialog)) {
                  try {
                    setSubmitting(true);
                    await saveSection(editingDialog);
                    setModifiedSections((prev) => { const next = new Set(prev); next.delete(editingDialog!); return next; });
                    toast({ title: "Salvo com sucesso", description: "Alterações salvas com segurança." });
                  } catch {
                    toast({ title: "Erro ao salvar", description: "Revise os dados e tente novamente.", variant: "destructive" });
                    setSubmitting(false);
                    return;
                  } finally {
                    setSubmitting(false);
                  }
                }
                closeEditDialog();
              }}
              disabled={submitting}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Save className="h-6 w-6" />
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ── Filtro de mês ── */}
      {availableMonths.length > 0 && (
        <div className={`rounded-2xl border-2 ${isLocked ? "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20" : "border-novare-blue/30 bg-novare-blue-light/30 dark:bg-novare-blue/10"} p-4`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`h-11 w-11 rounded-xl ${isLocked ? "bg-amber-500" : "bg-novare-blue"} text-white flex items-center justify-center shrink-0 shadow-sm`}>
              {isLocked ? <Lock className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isLocked ? "text-amber-700 dark:text-amber-400" : "text-novare-blue/80 dark:text-novare-blue-bright/80"}`}>
                Mês ativo do onboarding
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <Select value={selectedMonth ?? ""} onValueChange={(v) => setSelectedMonth(v)}>
                  <SelectTrigger className="w-[220px] h-10 font-bold text-base">
                    <SelectValue placeholder="Selecione um mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((m) => {
                      const isClosed = closedMonths.has(m);
                      const isBaseline = m === baselineMonth;
                      return (
                        <SelectItem key={m} value={m}>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold">{monthRefLabel(m)}</span>
                            {isBaseline && <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold bg-novare-terracotta/10 text-novare-terracotta border-novare-terracotta/30">D-0</Badge>}
                            {isClosed && <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">FECHADO</Badge>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedMonth === baselineMonth && baselineMonth && (
                  <Badge variant="outline" className="bg-novare-terracotta/10 text-novare-terracotta border-novare-terracotta/40 font-bold">
                    <Flag className="w-3 h-3 mr-1" />
                    D-zero · Mês de baseline
                  </Badge>
                )}
                {isLocked && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 font-bold">
                    <Lock className="w-3 h-3 mr-1" />
                    Mês fechado · somente leitura
                  </Badge>
                )}
              </div>
            </div>

            {/* Navegação rápida */}
            <div className="flex items-center gap-1 shrink-0">
              {(() => {
                const idx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1;
                const hasPrev = idx > 0;
                const hasNext = idx >= 0 && idx < availableMonths.length - 1;
                return (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!hasPrev}
                      onClick={() => hasPrev && setSelectedMonth(availableMonths[idx - 1])}
                      className="h-9 w-9 p-0"
                      title="Mês anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!hasNext}
                      onClick={() => hasNext && setSelectedMonth(availableMonths[idx + 1])}
                      className="h-9 w-9 p-0"
                      title="Próximo mês"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>

          {isLocked && (
            <div className="flex items-center gap-3 mt-3 pl-[60px] flex-wrap">
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-snug">
                Este mês está fechado. Reabra para liberar a edição dos dados.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-950/40 h-7 text-xs"
                onClick={() => setConfirmReopen(true)}
              >
                <Unlock className="h-3.5 w-3.5" />
                Reabrir mês
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Confirmar reabrir */}
      <AlertDialog open={confirmReopen} onOpenChange={(o) => !o && setConfirmReopen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir fechamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O fechamento de <strong>{selectedMonth ? monthRefLabel(selectedMonth) : ""}</strong> ficará marcado como reaberto. Os números registrados continuam preservados e o cliente poderá corrigir os dados novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reopening}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen} disabled={reopening}>
              {reopening ? "Reabrindo..." : "Reabrir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main content */}
      <div>
        <Card className="border-border/40 shadow-soft rounded-2xl overflow-hidden">
            <Accordion type="multiple" defaultValue={[]}>
              {sections.map((s, i) => {
                const Icon = sectionIcons[s.key];
                const config = sectionIconConfig[s.key] || { bg: "bg-accent/10", text: "text-accent" };
                return (
                  <AccordionItem
                    key={s.key}
                    value={s.key.toString()}
                    className={i < sections.length - 1 ? "border-b border-border/30" : "border-0"}
                  >
                    <AccordionTrigger className="hover:no-underline py-3.5 px-5 gap-3">
                      <div className="flex items-center justify-between w-full pr-2 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-6 w-6 ${config.text}`} />
                          </div>
                          <div className="min-w-0 text-left">
                            <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-foreground truncate">
                              {modifiedSections.has(s.key) && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
                              <span className="truncate">{s.title}</span>
                              {modifiedSections.has(s.key) && (
                                <span className="shrink-0 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-accent">
                                  Alterado
                                </span>
                              )}
                            </span>
                            <span className={`mt-0.5 block truncate tabular-nums ${s.isEmpty ? "text-[0.75rem] font-semibold text-muted-foreground" : "text-[0.9375rem] font-semibold text-foreground"}`}>
                              {s.primarySummary}
                            </span>
                            <span className="block truncate text-[0.71875rem] font-medium text-muted-foreground/75">
                              {s.secondarySummary}
                            </span>
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">
                              <Lock className="h-3 w-3" />
                              Fechado
                            </span>
                          ) : (
                            <EditButton onClick={() => openEditDialog(s.key)} />
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5">
                      <div className="pt-1 pl-11">{s.readonly()}</div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </Card>

          {/* V9: CTA para proxima etapa */}
          <div className="mt-6">
            <JourneyFooterNav
              current="onboarding"
              message="Dados do cliente coletados. Avance para o Diagnóstico — a IA analisará automaticamente."
              hideBack
            />
          </div>
      </div>
    </div>
  );
};

export default ClientOnboarding;
