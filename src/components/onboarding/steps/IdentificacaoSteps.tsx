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
  <div className="w-full max-w-md space-y-4">{children}</div>
);

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
          className="h-14 text-lg text-center tracking-[-0.01em] border-border bg-background focus-visible:ring-primary/30"
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
          <Label className="font-body text-muted-foreground text-[0.8125rem]">CPF</Label>
          <Input value={data.cpf} onChange={(e) => update("cpf", e.target.value)} placeholder="000.000.000-00" className="h-13 text-[0.9375rem] tracking-[-0.01em] border-border bg-background focus-visible:ring-primary/30" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Data de nascimento</Label>
          <Input type="date" value={data.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} className="h-13 text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
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
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Estado civil</Label>
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
            triggerClassName="h-13 text-[0.9375rem]"
            inputPlaceholder="Ex: Separado judicialmente"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Regime de bens</Label>
          <SelectWithCustom
            value={data.property_regime}
            onValueChange={(v) => update("property_regime", v)}
            options={[
              { value: "comunhao_parcial", label: "Comunhão Parcial" },
              { value: "comunhao_universal", label: "Comunhão Universal" },
              { value: "separacao_total", label: "Separação Total" },
              { value: "participacao_final", label: "Participação Final" },
            ]}
            triggerClassName="h-13 text-[0.9375rem]"
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
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Profissão</Label>
          <Input value={data.profession} onChange={(e) => update("profession", e.target.value)} placeholder="Ex: Engenheiro, Médica..." className="h-13 text-[0.9375rem] tracking-[-0.01em] border-border bg-background focus-visible:ring-primary/30" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Empresa</Label>
          <Input value={data.company} onChange={(e) => update("company", e.target.value)} placeholder="Onde trabalha" className="h-13 text-[0.9375rem] tracking-[-0.01em] border-border bg-background focus-visible:ring-primary/30" />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Anos na profissão</Label>
          <Input type="number" value={data.years_in_profession} onChange={(e) => update("years_in_profession", e.target.value)} placeholder="0" className="h-13 text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
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
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Quantidade de dependentes</Label>
          <Input type="number" value={data.dependents_count} onChange={(e) => update("dependents_count", e.target.value)} placeholder="0" className="h-13 text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Idades dos dependentes</Label>
          <Input value={data.dependents_ages} onChange={(e) => update("dependents_ages", e.target.value)} placeholder="Ex: 5, 12, 18" className="h-13 text-[0.9375rem] tracking-[-0.01em] border-border bg-background focus-visible:ring-primary/30" />
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
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Cidade</Label>
          <Input value={data.city} onChange={(e) => update("city", e.target.value)} placeholder="Sua cidade" className="h-13 text-[0.9375rem] tracking-[-0.01em] border-border bg-background focus-visible:ring-primary/30" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Estado</Label>
          <Input value={data.state} onChange={(e) => update("state", e.target.value)} placeholder="UF" className="h-13 text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" maxLength={2} />
        </div>
      </FieldGroup>
    </Wrapper>
  );
};
