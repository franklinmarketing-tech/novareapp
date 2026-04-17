import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { type BehavioralData, computeProfile, PROFILE_INFO } from "@/components/onboarding/StepComportamental";

interface StepProps {
  data: BehavioralData;
  onChange: (data: BehavioralData) => void;
}

/* ── Shared layout pieces ── */

const Wrapper = ({ children, stepNumber }: { children: React.ReactNode; stepNumber?: string }) => (
  <div className="flex flex-col items-center justify-center space-y-6 w-full">
    {stepNumber && (
      <span className="font-body text-[0.75rem] font-semibold text-primary tracking-[0.2em] uppercase">Passo {stepNumber}</span>
    )}
    {children}
  </div>
);

const Question = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display text-[1.75rem] md:text-[2.25rem] font-medium text-foreground text-center leading-[1.15] tracking-[-0.03em] max-w-lg">{children}</h2>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="font-body text-muted-foreground text-center text-[0.9375rem] tracking-[-0.01em] max-w-sm leading-relaxed">{children}</p>
);

const FieldGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-md space-y-3">{children}</div>
);

/* ── Reusable Slider Step ── */

interface SliderStepProps {
  stepNumber: string;
  question: string;
  hint?: string;
  value: number;
  onChange: (val: number) => void;
  leftLabel: string;
  rightLabel: string;
}

const SliderStep = ({ stepNumber, question, hint, value, onChange, leftLabel, rightLabel }: SliderStepProps) => (
  <Wrapper stepNumber={stepNumber}>
    <Question>{question}</Question>
    {hint && <Hint>{hint}</Hint>}
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <motion.span
        key={value}
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="text-[4rem] font-bold text-primary tabular-nums leading-none"
      >
        {value}
      </motion.span>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={0}
        max={10}
        step={1}
        className="w-full [&_[data-orientation=horizontal]>.bg-primary]:bg-primary [&_span[role=slider]]:border-primary [&_span[role=slider]]:bg-background [&_span[role=slider]]:h-6 [&_span[role=slider]]:w-6 [&_span[role=slider]]:shadow-md"
      />
      <div className="flex justify-between w-full font-body text-[0.8125rem] text-muted-foreground/80 tracking-[-0.01em]">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  </Wrapper>
);

/* ── Individual Steps (12–19) ── */

// Step 12 – Organização financeira
export const StepOrganizacao = ({ data, onChange }: StepProps) => (
  <SliderStep
    stepNumber="16"
    question="Quão organizado você é com suas finanças?"
    hint="Controle de gastos, planejamento, orçamento..."
    value={data.financial_organization_score}
    onChange={(v) => onChange({ ...data, financial_organization_score: v })}
    leftLabel="0 — Desorganizado"
    rightLabel="10 — Super organizado"
  />
);

// Step 13 – Disciplina de poupança
export const StepPoupanca = ({ data, onChange }: StepProps) => (
  <SliderStep
    stepNumber="17"
    question="Quão disciplinado você é para poupar?"
    hint="Regularidade e consistência ao guardar dinheiro"
    value={data.savings_discipline_score}
    onChange={(v) => onChange({ ...data, savings_discipline_score: v })}
    leftLabel="0 — Nunca poupo"
    rightLabel="10 — Poupo sempre"
  />
);

// Step 14 – Ansiedade com dinheiro
export const StepAnsiedade = ({ data, onChange }: StepProps) => (
  <SliderStep
    stepNumber="15"
    question="Quanto o dinheiro te causa ansiedade?"
    hint="Preocupação, estresse ou desconforto com finanças"
    value={data.money_anxiety_score}
    onChange={(v) => onChange({ ...data, money_anxiety_score: v })}
    leftLabel="0 — Totalmente tranquilo"
    rightLabel="10 — Muito ansioso"
  />
);

// Step 15 – Confiança financeira
export const StepConfianca = ({ data, onChange }: StepProps) => (
  <SliderStep
    stepNumber="16"
    question="Quão confiante você se sente sobre suas finanças?"
    hint="Sensação de controle e segurança financeira"
    value={data.financial_confidence_score}
    onChange={(v) => onChange({ ...data, financial_confidence_score: v })}
    leftLabel="0 — Nenhuma confiança"
    rightLabel="10 — Totalmente confiante"
  />
);

// Step 16 – Impulso de consumo
export const StepImpulso = ({ data, onChange }: StepProps) => (
  <SliderStep
    stepNumber="17"
    question="Com que frequência você gasta por impulso?"
    hint="Compras não planejadas, por emoção ou oportunidade"
    value={data.impulse_spending_score}
    onChange={(v) => onChange({ ...data, impulse_spending_score: v })}
    leftLabel="0 — Nunca"
    rightLabel="10 — Sempre"
  />
);

// Step 17 – Apetite por risco
export const StepRisco = ({ data, onChange }: StepProps) => (
  <SliderStep
    stepNumber="18"
    question="Qual seu apetite por risco em investimentos?"
    hint="Disposição a aceitar volatilidade por retornos maiores"
    value={data.risk_tolerance_score}
    onChange={(v) => onChange({ ...data, risk_tolerance_score: v })}
    leftLabel="0 — Conservador"
    rightLabel="10 — Arrojado"
  />
);

// Step 18 – Gatilhos de consumo (textarea)
export const StepGatilhos = ({ data, onChange }: StepProps) => (
  <Wrapper stepNumber="22">
    <Question>Quais são seus gatilhos de consumo?</Question>
    <Hint>O que te leva a gastar de forma impulsiva?</Hint>
    <FieldGroup>
      <Textarea
        value={data.spending_triggers}
        onChange={(e) => onChange({ ...data, spending_triggers: e.target.value })}
        placeholder="Descreva situações que te levam a gastar..."
        className="min-h-[160px] text-[0.9375rem] font-body tracking-[-0.01em] rounded-2xl border-border bg-background focus-visible:ring-primary/30 resize-none"
        autoFocus
      />
    </FieldGroup>
  </Wrapper>
);

// Step 19 – Histórico familiar + Resultado do perfil
export const StepPerfilResultado = ({ data, onChange }: StepProps) => {
  const profile = computeProfile(data);
  const info = PROFILE_INFO[profile];

  const radarData = [
    { subject: "Organização", value: data.financial_organization_score },
    { subject: "Poupança", value: data.savings_discipline_score },
    { subject: "Confiança", value: data.financial_confidence_score },
    { subject: "Risco", value: data.risk_tolerance_score },
    { subject: "Impulso", value: 10 - data.impulse_spending_score },
    { subject: "Tranquilidade", value: 10 - data.money_anxiety_score },
  ];

  return (
    <Wrapper stepNumber="23">
      <Question>Como era a relação da sua família com dinheiro?</Question>
      <Hint>Experiências e hábitos que influenciaram sua visão</Hint>
      <FieldGroup>
        <Textarea
          value={data.family_money_history}
          onChange={(e) => onChange({ ...data, family_money_history: e.target.value, computed_profile: profile })}
          placeholder="Conte sobre a relação da sua família com dinheiro..."
          className="min-h-[120px] text-[0.9375rem] font-body tracking-[-0.01em] rounded-2xl border-border bg-background focus-visible:ring-primary/30 resize-none"
          autoFocus
        />
      </FieldGroup>

      <Card className="w-full max-w-sm border-primary/20 bg-primary/[0.04] mt-4">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <span className="text-4xl">{info.emoji}</span>
          <div className="text-center">
            <p className="font-body text-[0.75rem] text-muted-foreground uppercase tracking-[0.15em] mb-1">Seu perfil</p>
            <h3 className="text-xl font-bold text-primary tracking-tight">{profile}</h3>
          </div>
          <p className="font-body text-[0.875rem] text-muted-foreground text-center leading-relaxed">{info.description}</p>
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name="Perfil" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
};
