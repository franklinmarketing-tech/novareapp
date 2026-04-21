import { useEffect, useRef, useState } from "react";
import logoPreta from "@/assets/logo-preta.png";
import iconBehavioral from "@/assets/icon-behavioral.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { OnboardingNavigation } from "@/components/onboarding/OnboardingNavigation";
import { StepRenda, type IncomeItem } from "@/components/onboarding/StepRenda";
import { StepDespesas, type ExpenseItem } from "@/components/onboarding/StepDespesas";
import { StepDividas, type DebtItem } from "@/components/onboarding/StepDividas";
import { StepPatrimonio, type AssetItem } from "@/components/onboarding/StepPatrimonio";
import { StepSeguros, type InsuranceItem } from "@/components/onboarding/StepSeguros";
import { StepObjetivos, type GoalItem } from "@/components/onboarding/StepObjetivos";
import { type BehavioralData } from "@/components/onboarding/StepComportamental";
import { StepNome, StepCpfNascimento, StepEstadoCivil, StepProfissao, StepDependentes, StepLocalizacao } from "@/components/onboarding/steps/IdentificacaoSteps";
import { StepOrganizacao, StepPoupanca, StepAnsiedade, StepConfianca, StepImpulso, StepRisco, StepGatilhos, StepPerfilResultado } from "@/components/onboarding/steps/ComportamentalSteps";
import { StepWelcome, StepTransition } from "@/components/onboarding/steps/TransitionSteps";
import { TOTAL_MICRO_STEPS, microStepToSaveSection } from "@/components/onboarding/steps/onboardingConfig";
import PageTransition from "@/components/PageTransition";
import confetti from "canvas-confetti";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SummaryReview } from "@/components/onboarding/SummaryReview";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { useOnboardingTimer } from "@/hooks/useOnboardingTimer";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SaveStatus } from "@/components/onboarding/SaveIndicator";

// Map step ranges to save section for auto-save on any step change
const getSaveSectionForStep = (step: number): number | null => {
  if (step >= 1 && step <= 6) return 0;   // Identificação
  if (step === 8) return 1;               // Renda
  if (step === 9) return 2;               // Despesas
  if (step === 10) return 3;              // Dívidas
  if (step === 11) return 4;              // Patrimônio
  if (step === 12) return 5;              // Seguros
  if (step === 13) return 6;              // Objetivos
  if (step >= 15 && step <= 22) return 7;  // Comportamental
  return null;
};

const ClientOnboardingPage = () => {
  const { user, refreshClientStatus } = useAuth();

  // Preload behavioral icon so it's instant when user reaches that step
  useEffect(() => {
    const img = new Image();
    img.src = iconBehavioral;
  }, []);
  const navigate = useNavigate();
  const [clientId, setClientId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const { remainingMin } = useOnboardingTimer(step, TOTAL_MICRO_STEPS);
  const swipeRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: clientData } = await supabase
        .from("clients").select("*").eq("user_id", user.id).single();
      if (!clientData) { setLoading(false); return; }
      setClientId(clientData.id);

      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("user_id", user.id).single();

      const [incomeRes, expenseRes, debtRes, assetRes, insuranceRes, goalRes] = await Promise.all([
        supabase.from("income").select("*").eq("client_id", clientData.id),
        supabase.from("expenses").select("*").eq("client_id", clientData.id),
        supabase.from("debts").select("*").eq("client_id", clientData.id),
        supabase.from("assets").select("*").eq("client_id", clientData.id),
        supabase.from("insurance").select("*").eq("client_id", clientData.id),
        supabase.from("goals").select("*").eq("client_id", clientData.id),
      ]);

      const c = clientData;
      setIdentificacao({
        full_name: profileData?.full_name ?? "", cpf: c.cpf ?? "", date_of_birth: c.date_of_birth ?? "",
        marital_status: c.marital_status ?? "", property_regime: c.property_regime ?? "",
        profession: c.profession ?? "", company: c.company ?? "",
        years_in_profession: c.years_in_profession?.toString() ?? "",
        dependents_count: c.dependents_count?.toString() ?? "",
        dependents_ages: c.dependents_ages ?? "", city: c.city ?? "", state: c.state ?? "",
      });
      if (c.behavioral_profile && typeof c.behavioral_profile === "object") {
        setComportamental(c.behavioral_profile as any);
      }
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

  // Incremental sync: only deletes removed rows and upserts the rest, which
  // preserves IDs, avoids race conditions, and surfaces errors via boolean.
  const syncCollection = async (
    table: "income" | "expenses" | "debts" | "assets" | "insurance" | "goals",
    existingItems: Array<{ id?: string }>,
    payloadFn: () => Array<Record<string, any>>,
  ) => {
    const { data: current, error: fetchErr } = await supabase
      .from(table).select("id").eq("client_id", clientId!);
    if (fetchErr) throw fetchErr;

    const currentIds = new Set((current ?? []).map((r: any) => r.id as string));
    const keptIds = new Set(existingItems.map((i) => i.id).filter((id): id is string => !!id));
    const toDelete = [...currentIds].filter((id) => !keptIds.has(id));

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from(table).delete().in("id", toDelete);
      if (delErr) throw delErr;
    }

    const payload = payloadFn();
    if (payload.length > 0) {
      const { error: upErr } = await supabase.from(table).upsert(payload as any, { onConflict: "id" });
      if (upErr) throw upErr;
    }
  };

  const saveSection = async (section: number): Promise<boolean> => {
    if (!clientId) return false;
    setSaveStatus("saving");
    try {
      switch (section) {
        case 0: {
          const { error: cErr } = await supabase.from("clients").update({
            cpf: identificacao.cpf || null, date_of_birth: identificacao.date_of_birth || null,
            marital_status: (identificacao.marital_status as any) || null,
            property_regime: (identificacao.property_regime as any) || null,
            profession: identificacao.profession || null, company: identificacao.company || null,
            years_in_profession: identificacao.years_in_profession ? parseInt(identificacao.years_in_profession) : null,
            dependents_count: identificacao.dependents_count ? parseInt(identificacao.dependents_count) : 0,
            dependents_ages: identificacao.dependents_ages || null,
            city: identificacao.city || null, state: identificacao.state || null,
          }).eq("id", clientId);
          if (cErr) throw cErr;
          const { error: pErr } = await supabase.from("profiles")
            .update({ full_name: identificacao.full_name }).eq("user_id", user!.id);
          if (pErr) throw pErr;
          break;
        }
        case 1: {
          await syncCollection("income", rendas, () =>
            rendas.filter((r) => r.description && r.amount).map((r) => ({
              ...(r.id ? { id: r.id } : {}),
              client_id: clientId, description: r.description,
              amount: parseFloat(r.amount) || 0, frequency: r.frequency as any,
              is_primary: r.is_primary, stability: r.stability as any,
            }))
          );
          break;
        }
        case 2: {
          await syncCollection("expenses", despesas, () =>
            despesas.filter((e) => e.amount && parseFloat(e.amount) > 0).map((e) => ({
              ...(e.id ? { id: e.id } : {}),
              client_id: clientId, category: e.category,
              amount: parseFloat(e.amount) || 0,
              description: e.description || null, is_fixed: true,
            }))
          );
          break;
        }
        case 3: {
          await syncCollection("debts", dividas, () =>
            dividas.filter((d) => d.type && d.total_amount).map((d) => ({
              ...(d.id ? { id: d.id } : {}),
              client_id: clientId, type: d.type, creditor: d.creditor || null,
              total_amount: parseFloat(d.total_amount) || 0,
              monthly_payment: parseFloat(d.monthly_payment) || 0,
              interest_rate: parseFloat(d.interest_rate) || 0,
              remaining_months: parseInt(d.remaining_months) || 0,
            }))
          );
          break;
        }
        case 4: {
          await syncCollection("assets", patrimonio, () =>
            patrimonio.filter((a) => a.type && a.estimated_value).map((a) => ({
              ...(a.id ? { id: a.id } : {}),
              client_id: clientId, type: a.type,
              description: a.description || null,
              estimated_value: parseFloat(a.estimated_value) || 0,
            }))
          );
          break;
        }
        case 5: {
          await syncCollection("insurance", seguros, () =>
            seguros.filter((s) => s.type).map((s) => ({
              ...(s.id ? { id: s.id } : {}),
              client_id: clientId, type: s.type, provider: s.provider || null,
              monthly_premium: parseFloat(s.monthly_premium) || 0,
              coverage_amount: parseFloat(s.coverage_amount) || 0,
            }))
          );
          break;
        }
        case 6: {
          await syncCollection("goals", objetivos, () =>
            objetivos.filter((g) => g.description).map((g) => ({
              ...(g.id ? { id: g.id } : {}),
              client_id: clientId, description: g.description,
              target_amount: parseFloat(g.target_amount) || null,
              deadline: g.deadline || null, priority: g.priority || "media",
            }))
          );
          break;
        }
        case 7: {
          const { error } = await supabase.from("clients")
            .update({ behavioral_profile: comportamental as any }).eq("id", clientId);
          if (error) throw error;
          break;
        }
      }
      const now = new Date();
      setLastSavedAt(now);
      setSaveStatus("saved");
      // Drift back to "idle" after a moment so the timestamp stays subtle
      window.setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2200);
      return true;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error(`Save error (section ${section}):`, err);
      setSaveStatus("error");
      toast({
        title: "Erro ao salvar",
        description: err?.message ?? "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };



  const retryLastSave = async () => {
    const sec = getSaveSectionForStep(step);
    if (sec !== null) await saveSection(sec);
  };

  const handleNext = async () => {
    // Salva seção atual; bloqueia avanço se falhar (BUG #4-6)
    const currentSaveSection = getSaveSectionForStep(step);
    if (currentSaveSection !== null) {
      setSubmitting(true);
      const ok = await saveSection(currentSaveSection);
      setSubmitting(false);
      if (!ok) return; // não avança em caso de erro

      // success flash on the CTA
      setShowSuccessFlash(true);
      window.setTimeout(() => setShowSuccessFlash(false), 420);
    }

    // Confetti em conclusões de seção
    if (step === 6 || step === 13) {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 }, colors: ["#c05621", "#1e3a5f", "#2f9e6a"] });
    }

    if (step === TOTAL_MICRO_STEPS - 1) {
      setSubmitting(true);
      const { error: statusErr } = await supabase.from("clients")
        .update({ status: "em_diagnostico" as any }).eq("id", clientId);
      setSubmitting(false);
      if (statusErr) {
        toast({
          title: "Erro ao finalizar",
          description: statusErr.message,
          variant: "destructive",
        });
        return;
      }

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#c05621", "#1e3a5f", "#2f9e6a", "#f59e0b"] });
      toast({ title: "🎉 Onboarding finalizado!", description: "Seus dados foram salvos. Seu consultor já pode começar a trabalhar no seu plano." });

      await refreshClientStatus();
      navigate("/cliente");
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    // Auto-save current step before going back
    const currentSaveSection = getSaveSectionForStep(step);
    if (currentSaveSection !== null) {
      saveSection(currentSaveSection); // fire and forget
    }
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleJumpToStep = (target: number) => {
    if (target === step) return;
    const currentSaveSection = getSaveSectionForStep(step);
    if (currentSaveSection !== null) saveSection(currentSaveSection);
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };

  // Keyboard nav: Enter advances, Shift+Enter goes back, Esc exits
  useKeyboardNav({
    onNext: () => { if (!submitting) handleNext(); },
    onBack: handleBack,
    onClose: () => navigate("/cliente"),
    enabled: !loading,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))}
        </div>
        <p className="text-[0.8125rem] text-muted-foreground/85 font-body tracking-[-0.01em]">Preparando seu onboarding...</p>
      </div>
    );
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -24 : 24, opacity: 0 }),
  };

  const totalRenda = rendas.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalDespesas = despesas.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalDividas = dividas.reduce((s, d) => s + (parseFloat(d.total_amount) || 0), 0);
  const totalPatrimonio = patrimonio.reduce((s, a) => s + (parseFloat(a.estimated_value) || 0), 0);
  const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  // Stats keyed by SECTION index (see SECTIONS in onboardingConfig)
  const drawerStats: Record<number, { hint?: string }> = {
    1: { hint: identificacao.full_name || "Sem nome" },
    3: { hint: rendas.length ? `${rendas.length} fonte(s) · ${fmtBRL(totalRenda)}` : "Nenhuma renda" },
    4: { hint: despesas.length ? `${despesas.length} despesa(s) · ${fmtBRL(totalDespesas)}` : "Nenhuma despesa" },
    5: { hint: dividas.length ? `${dividas.length} dívida(s) · ${fmtBRL(totalDividas)}` : "Sem dívidas" },
    6: { hint: patrimonio.length ? `${patrimonio.length} ativo(s) · ${fmtBRL(totalPatrimonio)}` : "Nenhum ativo" },
    7: { hint: seguros.length ? `${seguros.length} seguro(s)` : "Nenhum seguro" },
    8: { hint: objetivos.length ? `${objetivos.length} objetivo(s)` : "Nenhum objetivo" },
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <StepWelcome userName={identificacao.full_name} estimatedMin={remainingMin} />;
      case 1: return <StepNome data={identificacao} onChange={setIdentificacao} />;
      case 2: return <StepCpfNascimento data={identificacao} onChange={setIdentificacao} />;
      case 3: return <StepEstadoCivil data={identificacao} onChange={setIdentificacao} />;
      case 4: return <StepProfissao data={identificacao} onChange={setIdentificacao} />;
      case 5: return <StepDependentes data={identificacao} onChange={setIdentificacao} />;
      case 6: return <StepLocalizacao data={identificacao} onChange={setIdentificacao} />;
      case 7: return <StepTransition type="transition_financas" />;
      case 8: return <StepRenda data={rendas} onChange={setRendas} />;
      case 9: return <StepDespesas data={despesas} onChange={setDespesas} />;
      case 10: return <StepDividas data={dividas} onChange={setDividas} />;
      case 11: return <StepPatrimonio data={patrimonio} onChange={setPatrimonio} />;
      case 12: return <StepSeguros data={seguros} onChange={setSeguros} />;
      case 13: return <StepObjetivos data={objetivos} onChange={setObjetivos} />;
      case 14: return <StepTransition type="transition_comportamental" />;
      case 15: return <StepOrganizacao data={comportamental} onChange={setComportamental} />;
      case 16: return <StepPoupanca data={comportamental} onChange={setComportamental} />;
      case 17: return <StepAnsiedade data={comportamental} onChange={setComportamental} />;
      case 18: return <StepConfianca data={comportamental} onChange={setComportamental} />;
      case 19: return <StepImpulso data={comportamental} onChange={setComportamental} />;
      case 20: return <StepRisco data={comportamental} onChange={setComportamental} />;
      case 21: return <StepGatilhos data={comportamental} onChange={setComportamental} />;
      case 22: return <StepPerfilResultado data={comportamental} onChange={setComportamental} />;
      case 23: return (
        <SummaryReview
          identificacao={identificacao}
          rendas={rendas}
          despesas={despesas}
          dividas={dividas}
          patrimonio={patrimonio}
          seguros={seguros}
          objetivos={objetivos}
          comportamental={comportamental}
        />
      );
      default: return null;
    }
  };

  const isListStep = step >= 8 && step <= 13;
  const isCenteredStep = step === 0 || step === 7 || step === 14 || (step >= 15 && step <= 22) || step === 23;

  return (
    <PageTransition className="h-screen bg-background flex flex-col overflow-hidden">
      <SEO title="Onboarding" description="Complete seu cadastro inicial para começar sua jornada com a consultoria Novare." index={false} />
      <div className="relative flex justify-center pt-5 pb-2">
        <img src={logoPreta} alt="Novare" className="h-10" />
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/login");
          }}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground gap-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Sair</span>
        </Button>
      </div>
      <OnboardingProgress
        currentStep={step}
        totalSteps={TOTAL_MICRO_STEPS}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onRetrySave={retryLastSave}
        onJumpToStep={handleJumpToStep}
        drawerStats={drawerStats}
        remainingMin={remainingMin}
      />
      <div className={`flex-1 overflow-y-auto px-4 sm:px-5 md:px-6 ${isListStep ? "pt-3" : "pt-0"} pb-28 md:pb-24`}>
        <div className={`max-w-2xl mx-auto ${isCenteredStep ? "flex items-center justify-center min-h-full" : ""}`}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="w-full"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <OnboardingNavigation
        currentStep={step}
        totalSteps={TOTAL_MICRO_STEPS}
        onBack={handleBack}
        onNext={handleNext}
        isSubmitting={submitting}
        showSuccessFlash={showSuccessFlash}
      />
    </PageTransition>
  );
};

export default ClientOnboardingPage;
