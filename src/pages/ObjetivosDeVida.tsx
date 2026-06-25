import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";

// ── Dados estáticos ──────────────────────────────────────────────────────────

const STEPS = ["Você", "Finanças", "Objetivos", "Perfil", "Revisão"];

const LIFE_GOALS = [
  { type: "aposentadoria",           emoji: "🏦", label: "Aposentadoria" },
  { type: "reserva_emergencia",      emoji: "🛡️", label: "Reserva de Emergência" },
  { type: "independencia_financeira",emoji: "🗝️", label: "Independência Financeira" },
  { type: "comprar_imovel",          emoji: "🏠", label: "Comprar Imóvel" },
  { type: "educacao_filhos",         emoji: "🎓", label: "Educação dos Filhos" },
  { type: "viagem_lazer",            emoji: "✈️", label: "Viagem / Lazer" },
  { type: "empreender",              emoji: "🚀", label: "Empreender / Negócio" },
  { type: "renda_passiva",           emoji: "💰", label: "Renda Passiva Mensal" },
  { type: "veiculo",                 emoji: "🚗", label: "Veículo / Bem de Consumo" },
  { type: "saude",                   emoji: "❤️", label: "Saúde / Qualidade de Vida" },
];

const INVESTMENT_TYPES = [
  { id: "poupanca",        emoji: "🏦",  label: "Poupança" },
  { id: "cdb_lci_lca",    emoji: "📄",  label: "CDB / LCI / LCA" },
  { id: "tesouro_direto", emoji: "🇧🇷", label: "Tesouro Direto" },
  { id: "fundos",         emoji: "🧩",  label: "Fundos" },
  { id: "acoes",          emoji: "📊",  label: "Ações" },
  { id: "fiis",           emoji: "🏢",  label: "FIIs" },
  { id: "previdencia",    emoji: "🛡️",  label: "Previdência" },
  { id: "credito_privado",emoji: "📋",  label: "Crédito Privado" },
  { id: "estruturados",   emoji: "⚙️",  label: "Estruturados/COE" },
  { id: "cripto",         emoji: "₿",   label: "Criptoativos" },
  { id: "nao_invisto",    emoji: "❌",  label: "Não Invisto Ainda" },
];

const SOURCES = [
  { id: "indicacao",    emoji: "👋", label: "Indicação" },
  { id: "redes_sociais",emoji: "📱", label: "Redes Sociais" },
  { id: "google",       emoji: "🔍", label: "Google" },
  { id: "evento",       emoji: "🎯", label: "Evento" },
  { id: "parceiro",     emoji: "🤝", label: "Parceiro" },
];

const LOSS_OPTIONS = [
  { id: "vendo_tudo",          emoji: "😨", label: "Vendo tudo imediatamente" },
  { id: "aguardo_preocupado",  emoji: "😰", label: "Aguardo, mas fico preocupado" },
  { id: "mantenho_estrategia", emoji: "😌", label: "Mantenho a estratégia" },
  { id: "compro_mais",         emoji: "😎", label: "Aproveito e compro mais" },
];

const MOTIVATIONS = [
  { id: "organizar_financas",   emoji: "🗂️", label: "Organizar as finanças" },
  { id: "investir_melhor",      emoji: "📈", label: "Investir melhor" },
  { id: "planejar_aposentadoria",emoji:"🏖️", label: "Planejar aposentadoria" },
  { id: "protecao_patrimonial", emoji: "🛡️", label: "Proteção patrimonial" },
  { id: "renda_passiva",        emoji: "💰", label: "Gerar renda passiva" },
  { id: "sair_dividas",         emoji: "📉", label: "Sair das dívidas" },
];

const TOLERANCE_STEPS = [0, 5, 15, 30, 50];
const TOLERANCE_LABELS: Record<number, string> = { 0:"Nada", 5:"Até 5%", 15:"Até 15%", 30:"Até 30%", 50:"Mais de 30%" };

// ── Tipos ────────────────────────────────────────────────────────────────────

interface LifeGoal { type: string; active: boolean; targetValue: string; deadlineYears: string }

// ── Estilos compartilhados (paleta Novare · tema claro) ───────────────────────

const FIELD = "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-novare-blue/25 focus-visible:border-novare-blue";
const LABEL = "block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5";
const chip = (active: boolean) => cn(
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider cursor-pointer select-none transition-all",
  active ? "bg-novare-blue border-novare-blue text-white" : "border-slate-200 text-slate-600 hover:border-novare-blue/40 hover:text-slate-900",
);

// ── Componente ───────────────────────────────────────────────────────────────

export default function ObjetivosDeVida() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Passo 1
  const [voce, setVoce] = useState({
    name: "", birthDate: "", maritalStatus: "", dependents: "",
    profession: "", email: "", whatsapp: "", source: "",
  });

  // Passo 2
  const [financas, setFinancas] = useState({
    monthlyIncomeRange: "", investedAmountRange: "", monthlySavingsRange: "",
    hasDebts: "", investmentTypes: [] as string[], financialFeelings: "",
  });

  // Passo 3
  const [goals, setGoals] = useState<LifeGoal[]>(
    LIFE_GOALS.map((g) => ({ type: g.type, active: false, targetValue: "", deadlineYears: "" }))
  );
  const [otherDream, setOtherDream] = useState("");

  // Passo 4
  const [perfil, setPerfil] = useState({
    lossReaction: "", lossTolerancePct: 5, mainMotivation: [] as string[], pastAttempts: "",
  });

  // Passo 5
  const [finalNotes, setFinalNotes] = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleTag = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const toggleGoal = (i: number) =>
    setGoals((prev) => prev.map((g, idx) => idx === i ? { ...g, active: !g.active } : g));

  const updateGoal = (i: number, field: "targetValue" | "deadlineYears", val: string) =>
    setGoals((prev) => prev.map((g, idx) => idx === i ? { ...g, [field]: val } : g));

  const toleranceLabel = (v: number) => {
    const closest = TOLERANCE_STEPS.reduce((p, c) => Math.abs(c - v) < Math.abs(p - v) ? c : p);
    return TOLERANCE_LABELS[closest];
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: lead, error: e1 } = await supabase
        .from("life_leads" as any)
        .insert({
          name: voce.name,
          birth_date: voce.birthDate || null,
          marital_status: voce.maritalStatus || null,
          dependents: voce.dependents || null,
          profession: voce.profession || null,
          email: voce.email || null,
          whatsapp: voce.whatsapp || null,
          source: voce.source || null,
          monthly_income_range: financas.monthlyIncomeRange || null,
          invested_amount_range: financas.investedAmountRange || null,
          monthly_savings_range: financas.monthlySavingsRange || null,
          has_debts: financas.hasDebts || null,
          investment_types: financas.investmentTypes.length ? financas.investmentTypes : null,
          financial_feelings: financas.financialFeelings || null,
          loss_reaction: perfil.lossReaction || null,
          loss_tolerance_pct: perfil.lossTolerancePct,
          main_motivation: perfil.mainMotivation.length ? perfil.mainMotivation : null,
          past_attempts: perfil.pastAttempts || null,
          final_notes: finalNotes || null,
        })
        .select("id")
        .single();
      if (e1) throw e1;

      const activeGoals = goals
        .filter((g) => g.active)
        .map((g) => ({
          lead_id: (lead as any).id,
          goal_type: g.type,
          target_value: g.targetValue ? parseFloat(g.targetValue.replace(/\D/g, "")) || null : null,
          deadline_years: g.deadlineYears ? parseInt(g.deadlineYears) || null : null,
        }));

      if (activeGoals.length) {
        const { error: e2 } = await supabase.from("life_lead_goals" as any).insert(activeGoals);
        if (e2) throw e2;
      }

      setSubmitted(true);
    } catch {
      alert("Ocorreu um erro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center text-center px-4 gap-6">
        <img src={logoPreta} alt="Novare" className="h-11 w-auto" />
        <div className="text-6xl">✅</div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Recebemos seu formulário!</h2>
          <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
            Nossa equipe entrará em contato em breve para dar o próximo passo rumo aos seus objetivos de vida.
          </p>
        </div>
        <p className="text-slate-400 text-xs">Novare Consultoria de Investimentos</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 pb-28">
      {/* Logo */}
      <div className="flex justify-center pt-7 pb-2">
        <img src={logoPreta} alt="Novare" className="h-9 w-auto" />
      </div>

      {/* Step indicator */}
      <div className="max-w-xl mx-auto px-6 mb-8">
        <div className="flex items-start">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={label} className="flex-1 flex flex-col items-center relative">
                {i > 0 && (
                  <div className={cn(
                    "absolute top-[13px] right-1/2 w-full h-[2px]",
                    done || active ? "bg-novare-blue" : "bg-slate-200",
                  )} />
                )}
                <div className={cn(
                  "relative z-10 h-7 w-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all",
                  active ? "bg-novare-blue border-novare-blue text-white" :
                  done   ? "bg-novare-blue border-novare-blue text-white" :
                           "bg-white border-slate-300 text-slate-400",
                )}>
                  {done ? <Check className="h-3.5 w-3.5" /> : n}
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider mt-1.5",
                  active ? "text-novare-blue" : done ? "text-novare-blue/70" : "text-slate-400",
                )}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Passo 1: Você ── */}
      {step === 1 && (
        <div className="max-w-xl mx-auto px-4 space-y-5">
          <div>
            <h1 className="text-[1.6rem] font-display font-bold text-slate-900">Vamos nos conhecer 👋</h1>
            <p className="text-slate-500 text-sm mt-1">Estas informações são confidenciais e usadas exclusivamente para personalizar a sua consultoria.</p>
          </div>

          <div>
            <label className={LABEL}>Nome completo *</label>
            <Input className={FIELD} placeholder="Como prefere ser chamado?" value={voce.name}
              onChange={(e) => setVoce((p) => ({ ...p, name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Data de nascimento</label>
              <Input type="date" className={FIELD} value={voce.birthDate}
                onChange={(e) => setVoce((p) => ({ ...p, birthDate: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL}>Estado civil</label>
              <Select value={voce.maritalStatus} onValueChange={(v) => setVoce((p) => ({ ...p, maritalStatus: v }))}>
                <SelectTrigger className={FIELD}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {[["solteiro","Solteiro(a)"],["casado","Casado(a)"],["uniao_estavel","União Estável"],["divorciado","Divorciado(a)"],["viuvo","Viúvo(a)"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Filhos / Dependentes</label>
              <Select value={voce.dependents} onValueChange={(v) => setVoce((p) => ({ ...p, dependents: v }))}>
                <SelectTrigger className={FIELD}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["0","1","2","3","4+"].map((v) => (
                    <SelectItem key={v} value={v}>{v === "0" ? "Nenhum" : v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={LABEL}>Profissão / Área de atuação</label>
              <Input className={FIELD} placeholder="Ex: Médico, Empresário, CLT..." value={voce.profession}
                onChange={(e) => setVoce((p) => ({ ...p, profession: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>E-mail</label>
              <Input type="email" className={FIELD} placeholder="seu@email.com" value={voce.email}
                onChange={(e) => setVoce((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL}>WhatsApp</label>
              <Input className={FIELD} placeholder="(XX) 9XXXX-XXXX" value={voce.whatsapp}
                onChange={(e) => setVoce((p) => ({ ...p, whatsapp: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Como você chegou até a Novare?</label>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button key={s.id} type="button" onClick={() => setVoce((p) => ({ ...p, source: s.id }))}
                  className={chip(voce.source === s.id)}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Passo 2: Finanças ── */}
      {step === 2 && (
        <div className="max-w-xl mx-auto px-4 space-y-5">
          <div>
            <h1 className="text-[1.6rem] font-display font-bold text-slate-900">Sua situação financeira hoje</h1>
            <p className="text-slate-500 text-sm mt-1">Não existe resposta certa ou errada. Quanto mais honesto você for, melhor será nosso diagnóstico.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Renda mensal (aproximada)</label>
              <Select value={financas.monthlyIncomeRange} onValueChange={(v) => setFinancas((p) => ({ ...p, monthlyIncomeRange: v }))}>
                <SelectTrigger className={FIELD}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {[["ate_3k","Até R$ 3.000"],["3k_6k","R$ 3.000 – 6.000"],["6k_10k","R$ 6.000 – 10.000"],["10k_20k","R$ 10.000 – 20.000"],["20k_50k","R$ 20.000 – 50.000"],["acima_50k","Acima de R$ 50.000"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={LABEL}>Quanto já tem investido hoje?</label>
              <Select value={financas.investedAmountRange} onValueChange={(v) => setFinancas((p) => ({ ...p, investedAmountRange: v }))}>
                <SelectTrigger className={FIELD}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {[["nada","Nada ainda"],["ate_10k","Até R$ 10.000"],["10k_50k","R$ 10.000 – 50.000"],["50k_200k","R$ 50.000 – 200.000"],["200k_500k","R$ 200.000 – 500.000"],["acima_500k","Acima de R$ 500.000"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Consegue guardar por mês?</label>
              <Select value={financas.monthlySavingsRange} onValueChange={(v) => setFinancas((p) => ({ ...p, monthlySavingsRange: v }))}>
                <SelectTrigger className={FIELD}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {[["nada","Nada / dívidas"],["ate_500","Até R$ 500"],["500_2k","R$ 500 – 2.000"],["2k_5k","R$ 2.000 – 5.000"],["acima_5k","Acima de R$ 5.000"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={LABEL}>Possui dívidas relevantes?</label>
              <Select value={financas.hasDebts} onValueChange={(v) => setFinancas((p) => ({ ...p, hasDebts: v }))}>
                <SelectTrigger className={FIELD}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {[["nao","Não"],["financiamento","Financiamento imob./auto"],["cartao_cheque","Cartão / cheque especial"],["emprestimo","Empréstimo pessoal"],["varias","Várias dívidas"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className={LABEL}>Onde você investe atualmente?</label>
            <div className="flex flex-wrap gap-2">
              {INVESTMENT_TYPES.map((t) => (
                <button key={t.id} type="button"
                  onClick={() => setFinancas((p) => ({ ...p, investmentTypes: toggleTag(p.investmentTypes, t.id) }))}
                  className={chip(financas.investmentTypes.includes(t.id))}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Como você se sente em relação às suas finanças hoje?</label>
            <Textarea className={cn("resize-none min-h-[100px]", FIELD)}
              placeholder="Pode ser bem livre — o que está funcionando, o que te preocupa, o que você gostaria de mudar..."
              value={financas.financialFeelings}
              onChange={(e) => setFinancas((p) => ({ ...p, financialFeelings: e.target.value }))} />
          </div>
        </div>
      )}

      {/* ── Passo 3: Objetivos ── */}
      {step === 3 && (
        <div className="max-w-xl mx-auto px-4 space-y-5">
          <div>
            <h1 className="text-[1.6rem] font-display font-bold text-novare-terracotta">Seus objetivos de vida</h1>
            <p className="text-slate-500 text-sm mt-1">Ative os objetivos que fazem parte dos seus planos e informe o valor e o prazo para cada um. Isso transforma sonhos em metas concretas.</p>
          </div>

          <div className="space-y-2">
            {LIFE_GOALS.map((g, i) => {
              const goal = goals[i];
              return (
                <div key={g.type} className={cn(
                  "rounded-xl border transition-all duration-200",
                  goal.active ? "border-novare-blue/30 bg-novare-blue-light/60 shadow-sm" : "border-slate-200 bg-white",
                )}>
                  <div className="flex items-center gap-3 p-4 cursor-pointer select-none"
                    onClick={() => toggleGoal(i)}>
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                      goal.active ? "bg-novare-blue border-novare-blue" : "border-slate-300",
                    )}>
                      {goal.active && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-xl shrink-0">{g.emoji}</span>
                    <span className="font-semibold text-slate-900 text-sm flex-1">{g.label}</span>
                    <span className="text-slate-300 text-lg">—</span>
                  </div>
                  {goal.active && (
                    <div className="grid grid-cols-2 gap-3 px-4 pb-4 border-t border-slate-100 pt-3"
                      onClick={(e) => e.stopPropagation()}>
                      <div>
                        <label className={cn(LABEL, "text-slate-400")}>Valor alvo (R$)</label>
                        <Input className={cn(FIELD, "h-8 text-sm")} placeholder="Ex: 500.000"
                          value={goal.targetValue} onChange={(e) => updateGoal(i, "targetValue", e.target.value)} />
                      </div>
                      <div>
                        <label className={cn(LABEL, "text-slate-400")}>Prazo (anos)</label>
                        <Input type="number" min={1} className={cn(FIELD, "h-8 text-sm")} placeholder="Ex: 10"
                          value={goal.deadlineYears} onChange={(e) => updateGoal(i, "deadlineYears", e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <label className={LABEL}>Há algum outro sonho que você quer compartilhar?</label>
            <Textarea className={cn("resize-none min-h-[90px]", FIELD)}
              placeholder="Algo que não está na lista acima, mas que faz parte dos seus planos..."
              value={otherDream} onChange={(e) => setOtherDream(e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Passo 4: Perfil ── */}
      {step === 4 && (
        <div className="max-w-xl mx-auto px-4 space-y-6">
          <div>
            <h1 className="text-[1.6rem] font-display font-bold text-slate-900">Seu perfil de investidor</h1>
            <p className="text-slate-500 text-sm mt-1">Estas perguntas nos ajudam a entender como você reage a riscos e volatilidade — essencial para montarmos uma carteira ideal para você.</p>
          </div>

          <div>
            <label className={LABEL}>Se sua carteira cair 15% em um mês, o que você faz?</label>
            <div className="grid grid-cols-2 gap-2">
              {LOSS_OPTIONS.map((o) => (
                <button key={o.id} type="button"
                  onClick={() => setPerfil((p) => ({ ...p, lossReaction: o.id }))}
                  className={cn(
                    "flex items-center gap-2 px-3 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider text-left transition-all",
                    perfil.lossReaction === o.id
                      ? "bg-novare-blue border-novare-blue text-white"
                      : "border-slate-200 text-slate-600 hover:border-novare-blue/40",
                  )}>
                  <span className="text-base">{o.emoji}</span> {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Quanto você tolera perder em um ano para buscar retornos maiores?</label>
            <div className="mt-3">
              <input type="range" min={0} max={50} step={5}
                value={perfil.lossTolerancePct}
                onChange={(e) => setPerfil((p) => ({ ...p, lossTolerancePct: parseInt(e.target.value) }))}
                className="w-full accent-novare-blue cursor-pointer" />
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 select-none">
                {["Nada","Até 5%","Até 15%","Até 30%","Mais de 30%"].map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
              <p className="text-center text-novare-blue font-semibold text-sm mt-2">
                {toleranceLabel(perfil.lossTolerancePct)} de perda tolerada
              </p>
            </div>
          </div>

          <div>
            <label className={LABEL}>Qual é a principal razão para você buscar uma consultoria agora?</label>
            <div className="flex flex-wrap gap-2">
              {MOTIVATIONS.map((m) => (
                <button key={m.id} type="button"
                  onClick={() => setPerfil((p) => ({ ...p, mainMotivation: toggleTag(p.mainMotivation, m.id) }))}
                  className={chip(perfil.mainMotivation.includes(m.id))}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>O que você já tentou antes que não funcionou?</label>
            <Textarea className={cn("resize-none min-h-[90px]", FIELD)}
              placeholder="Outras corretoras, assessores, aplicativos... conte sua experiência"
              value={perfil.pastAttempts}
              onChange={(e) => setPerfil((p) => ({ ...p, pastAttempts: e.target.value }))} />
          </div>
        </div>
      )}

      {/* ── Passo 5: Revisão ── */}
      {step === 5 && (
        <div className="max-w-xl mx-auto px-4 space-y-5">
          <div>
            <h1 className="text-[1.6rem] font-display font-bold text-novare-terracotta">Revise antes de enviar</h1>
            <p className="text-slate-500 text-sm mt-1">Confira um resumo das suas respostas. Você pode voltar e editar qualquer campo antes de finalizar.</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 text-sm leading-relaxed">
            <div className="space-y-1">
              <p><span className="text-slate-500 font-medium">Nome:</span> <span className="text-slate-900">{voce.name || "—"}</span></p>
              <p><span className="text-slate-500 font-medium">Profissão:</span> <span className="text-slate-900">{voce.profession || "—"}</span></p>
              <p>
                <span className="text-slate-500 font-medium">E-mail:</span> <span className="text-slate-900">{voce.email || "—"}</span>
                &nbsp;|&nbsp;
                <span className="text-slate-500 font-medium">WhatsApp:</span> <span className="text-slate-900">{voce.whatsapp || "—"}</span>
              </p>
              {voce.source && <p><span className="text-slate-500 font-medium">Como chegou:</span> <span className="text-slate-900">{SOURCES.find((s) => s.id === voce.source)?.label}</span></p>}
            </div>
            <hr className="border-slate-100" />
            <div className="space-y-1">
              <p>
                <span className="text-slate-500 font-medium">Estado civil:</span> <span className="text-slate-900">{voce.maritalStatus || "—"}</span>
                &nbsp;|&nbsp;
                <span className="text-slate-500 font-medium">Patrimônio:</span> <span className="text-slate-900">{financas.investedAmountRange || "—"}</span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">Aporte mensal:</span> <span className="text-slate-900">{financas.monthlySavingsRange || "—"}</span>
                &nbsp;|&nbsp;
                <span className="text-slate-500 font-medium">Dívidas:</span> <span className="text-slate-900">{financas.hasDebts || "—"}</span>
              </p>
              {financas.investmentTypes.length > 0 && (
                <p><span className="text-slate-500 font-medium">Investe em:</span> <span className="text-slate-900">{financas.investmentTypes.join(", ")}</span></p>
              )}
            </div>
            <hr className="border-slate-100" />
            <div>
              <p className="text-slate-500 font-medium mb-1">🎯 Objetivos ativados:</p>
              {goals.filter((g) => g.active).length === 0 ? (
                <p className="text-slate-400 text-xs">— Nenhum objetivo ativado</p>
              ) : (
                goals.filter((g) => g.active).map((g) => {
                  const meta = LIFE_GOALS.find((l) => l.type === g.type)!;
                  return (
                    <p key={g.type} className="text-slate-900 text-xs">
                      {meta.emoji} {meta.label}
                      {g.targetValue && ` · R$ ${g.targetValue}`}
                      {g.deadlineYears && ` · ${g.deadlineYears} anos`}
                    </p>
                  );
                })
              )}
            </div>
            <hr className="border-slate-100" />
            <div className="space-y-1">
              <p><span className="text-slate-500 font-medium">Reação a quedas:</span> <span className="text-slate-900">{LOSS_OPTIONS.find((o) => o.id === perfil.lossReaction)?.label || "—"}</span></p>
              <p><span className="text-slate-500 font-medium">Tolerância a perdas:</span> <span className="text-novare-blue font-semibold">{toleranceLabel(perfil.lossTolerancePct)}</span></p>
              {perfil.mainMotivation.length > 0 && (
                <p><span className="text-slate-500 font-medium">Motivação:</span> <span className="text-slate-900">{perfil.mainMotivation.map((id) => MOTIVATIONS.find((m) => m.id === id)?.label).join(", ")}</span></p>
              )}
            </div>
          </div>

          <div>
            <label className={LABEL}>Alguma observação final?</label>
            <Textarea className={cn("resize-none min-h-[100px]", FIELD)}
              placeholder="Qualquer informação adicional que queira que a equipe Novare saiba antes da reunião..."
              value={finalNotes} onChange={(e) => setFinalNotes(e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Navegação (fixed bottom) ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => setStep((s) => s - 1)}>
              ← Voltar
            </Button>
          ) : <div />}

          {step < 5 ? (
            <Button
              className="bg-novare-blue hover:bg-novare-blue/90 text-white font-bold tracking-wider px-8"
              disabled={step === 1 && !voce.name.trim()}
              onClick={() => setStep((s) => s + 1)}>
              Continuar →
            </Button>
          ) : (
            <Button
              className="bg-novare-blue hover:bg-novare-blue/90 text-white font-bold tracking-wider px-8"
              onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar ✓"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
