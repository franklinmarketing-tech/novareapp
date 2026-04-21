import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectWithCustom } from "@/components/ui/select-with-custom";

interface IdentificacaoData {
  full_name: string; cpf: string; date_of_birth: string; marital_status: string; property_regime: string;
  profession: string; company: string; years_in_profession: string; dependents_count: string; dependents_ages: string;
  city: string; state: string;
}

interface StepProps {
  data: IdentificacaoData;
  onChange: (data: IdentificacaoData) => void;
}

const Wrapper = ({ children, stepNumber }: { children: React.ReactNode; stepNumber?: string }) => (
  <div className="flex flex-col items-center w-full gap-4 md:gap-5">
    {stepNumber && (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/8 font-body text-[0.6875rem] font-semibold text-primary tracking-[0.18em] uppercase">
        Passo {stepNumber}
      </span>
    )}
    {children}
  </div>
);

const Question = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display font-medium text-foreground text-center tracking-[-0.025em] max-w-xl text-[clamp(1.375rem,1.1rem+1.1vw,1.875rem)] leading-[1.2]">
    {children}
  </h2>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="font-body text-muted-foreground/85 text-center text-[0.875rem] tracking-[-0.01em] max-w-md leading-[1.5] -mt-1">
    {children}
  </p>
);

const FieldGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-md space-y-3 mt-1">{children}</div>
);

const inputClass = "h-11 text-[0.9375rem] tracking-[-0.01em]";

// Step 0: Nome completo
export const StepNome = ({ data, onChange }: StepProps) => {
  const update = (v: string) => onChange({ ...data, full_name: v });
  return (
    <Wrapper stepNumber="01">
      <Question>Qual é o seu nome completo?</Question>
      <Hint>Seu nome será usado para personalizar a experiência</Hint>
      <FieldGroup>
        <Input
          value={data.full_name}
          onChange={(e) => update(e.target.value)}
          placeholder="Digite seu nome completo"
          className="h-12 text-base text-center tracking-[-0.01em]"
          autoFocus
        />
      </FieldGroup>
    </Wrapper>
  );
};

// Step 1: CPF + Data de nascimento
export const StepCpfNascimento = ({ data, onChange }: StepProps) => {
  const update = (field: keyof IdentificacaoData, v: string) => onChange({ ...data, [field]: v });
  return (
    <Wrapper stepNumber="02">
      <Question>CPF e data de nascimento</Question>
      <Hint>Precisamos dessas informações para identificação</Hint>
      <FieldGroup>
        <div className="space-y-1.5">
          <Label>CPF</Label>
          <Input value={data.cpf} onChange={(e) => update("cpf", e.target.value)} placeholder="000.000.000-00" className={inputClass} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Data de nascimento</Label>
          <Input type="date" value={data.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} className={inputClass} />
        </div>
      </FieldGroup>
    </Wrapper>
  );
};

// Step 2: Estado civil + Regime de bens
export const StepEstadoCivil = ({ data, onChange }: StepProps) => {
  const update = (field: keyof IdentificacaoData, v: string) => onChange({ ...data, [field]: v });
  return (
    <Wrapper stepNumber="03">
      <Question>Estado civil e regime de bens</Question>
      <Hint>Essas informações impactam no planejamento patrimonial</Hint>
      <FieldGroup>
        <div className="space-y-1.5">
          <Label>Estado civil</Label>
          <SelectWithCustom
            value={data.marital_status}
            onValueChange={(v) => update("marital_status", v)}
            options={[
              { value: "solteiro", label: "Solteiro(a)" },
              { value: "casado", label: "Casado(a)" },
              { value: "divorciado", label: "Divorciado(a)" },
              { value: "viuvo", label: "Viúvo(a)" },
              { value: "uniao_estavel", label: "União Estável" },
            ]}
            triggerClassName="h-12 text-[0.9375rem]"
            inputPlaceholder="Ex: Separado judicialmente"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Regime de bens</Label>
          <SelectWithCustom
            value={data.property_regime}
            onValueChange={(v) => update("property_regime", v)}
            options={[
              { value: "comunhao_parcial", label: "Comunhão Parcial" },
              { value: "comunhao_universal", label: "Comunhão Universal" },
              { value: "separacao_total", label: "Separação Total" },
              { value: "participacao_final", label: "Participação Final" },
            ]}
            triggerClassName="h-12 text-[0.9375rem]"
            inputPlaceholder="Ex: Regime misto"
          />
        </div>
      </FieldGroup>
    </Wrapper>
  );
};

// Step 3: Profissão
export const StepProfissao = ({ data, onChange }: StepProps) => {
  const update = (field: keyof IdentificacaoData, v: string) => onChange({ ...data, [field]: v });
  return (
    <Wrapper stepNumber="04">
      <Question>Sobre sua profissão</Question>
      <Hint>Entender sua carreira nos ajuda a planejar melhor</Hint>
      <FieldGroup>
        <div className="space-y-1.5">
          <Label>Profissão</Label>
          <Input value={data.profession} onChange={(e) => update("profession", e.target.value)} placeholder="Ex: Engenheiro, Médica..." className={inputClass} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <Input value={data.company} onChange={(e) => update("company", e.target.value)} placeholder="Onde trabalha" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label>Anos na profissão</Label>
          <Input type="number" value={data.years_in_profession} onChange={(e) => update("years_in_profession", e.target.value)} placeholder="0" className={inputClass} />
        </div>
      </FieldGroup>
    </Wrapper>
  );
};

// Step 4: Dependentes
export const StepDependentes = ({ data, onChange }: StepProps) => {
  const update = (field: keyof IdentificacaoData, v: string) => onChange({ ...data, [field]: v });
  return (
    <Wrapper stepNumber="05">
      <Question>Possui dependentes?</Question>
      <Hint>Filhos, cônjuge ou outros que dependem financeiramente de você</Hint>
      <FieldGroup>
        <div className="space-y-1.5">
          <Label>Quantidade de dependentes</Label>
          <Input type="number" value={data.dependents_count} onChange={(e) => update("dependents_count", e.target.value)} placeholder="0" className={inputClass} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Idades dos dependentes</Label>
          <Input value={data.dependents_ages} onChange={(e) => update("dependents_ages", e.target.value)} placeholder="Ex: 5, 12, 18" className={inputClass} />
        </div>
      </FieldGroup>
    </Wrapper>
  );
};

// Step 5: Cidade e estado
export const StepLocalizacao = ({ data, onChange }: StepProps) => {
  const update = (field: keyof IdentificacaoData, v: string) => onChange({ ...data, [field]: v });
  return (
    <Wrapper stepNumber="06">
      <Question>Onde você mora?</Question>
      <Hint>Sua localização pode influenciar no planejamento tributário</Hint>
      <FieldGroup>
        <div className="space-y-1.5">
          <Label>Cidade</Label>
          <Input value={data.city} onChange={(e) => update("city", e.target.value)} placeholder="Sua cidade" className={inputClass} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Input value={data.state} onChange={(e) => update("state", e.target.value)} placeholder="UF" className={inputClass} maxLength={2} />
        </div>
      </FieldGroup>
    </Wrapper>
  );
};
