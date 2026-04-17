import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

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

  const saveSection = async (section: number) => {
    if (!clientId) return;
    try {
      switch (section) {
        case 0: {
          await supabase.from("clients").update({
            cpf: identificacao.cpf || null, date_of_birth: identificacao.date_of_birth || null,
            marital_status: (identificacao.marital_status as any) || null,
            property_regime: (identificacao.property_regime as any) || null,
            profession: identificacao.profession || null, company: identificacao.company || null,
            years_in_profession: identificacao.years_in_profession ? parseInt(identificacao.years_in_profession) : null,
            dependents_count: identificacao.dependents_count ? parseInt(identificacao.dependents_count) : 0,
            dependents_ages: identificacao.dependents_ages || null,
            city: identificacao.city || null, state: identificacao.state || null,
          }).eq("id", clientId);
          await supabase.from("profiles").update({ full_name: identificacao.full_name }).eq("user_id", user!.id);
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

  const handleNext = async () => {
    // Save current step's section data
    const currentSaveSection = getSaveSectionForStep(step);
    if (currentSaveSection !== null) {
      setSubmitting(true);
      await saveSection(currentSaveSection);
      setSubmitting(false);
    }

    // Fire confetti on section completions
    if (step === 6 || step === 13) {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 }, colors: ["#c05621", "#1e3a5f", "#2f9e6a"] });
    }

    if (step === TOTAL_MICRO_STEPS - 1) {
      // Final save: mark onboarding as complete
      setSubmitting(true);
      await supabase.from("clients").update({ status: "em_diagnostico" as any }).eq("id", clientId);
      setSubmitting(false);
      
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#c05621", "#1e3a5f", "#2f9e6a", "#f59e0b"] });
      toast({ title: "🎉 Onboarding finalizado!", description: "Seus dados foram salvos. Seu consultor já pode começar a trabalhar no seu plano." });
      
      // Refresh client status in auth context so routing updates
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-5xl"
        >
          💰
        </motion.div>
        <p className="text-sm text-muted-foreground font-body">Preparando seu onboarding...</p>
      </div>
    );
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0, scale: 0.98 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0, scale: 0.98 }),
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <StepWelcome userName={identificacao.full_name} />;
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
      default: return null;
    }
  };

  const isListStep = step >= 8 && step <= 13;
  const isCenteredStep = step === 0 || step === 7 || step === 14 || (step >= 15 && step <= 22);

  return (
    <PageTransition className="h-screen bg-background flex flex-col overflow-hidden">
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
      <OnboardingProgress currentStep={step} totalSteps={TOTAL_MICRO_STEPS} />
      <div className={`flex-1 overflow-y-auto px-4 ${isListStep ? "pt-3" : "pt-0"} pb-24`}>
        <div className={`max-w-2xl mx-auto ${isCenteredStep ? "flex items-center justify-center min-h-full" : ""}`}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
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
      />
    </PageTransition>
  );
};

export default ClientOnboardingPage;
