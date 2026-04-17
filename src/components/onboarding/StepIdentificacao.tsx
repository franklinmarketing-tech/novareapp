import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectWithCustom } from "@/components/ui/select-with-custom";

interface IdentificacaoData {
  full_name: string;
  cpf: string;
  date_of_birth: string;
  marital_status: string;
  property_regime: string;
  profession: string;
  company: string;
  years_in_profession: string;
  dependents_count: string;
  dependents_ages: string;
  city: string;
  state: string;
}

interface Props {
  data: IdentificacaoData;
  onChange: (data: IdentificacaoData) => void;
}

export const StepIdentificacao = ({ data, onChange }: Props) => {
  const update = (field: keyof IdentificacaoData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h2 className="font-display text-[1.75rem] md:text-[2rem] font-semibold text-foreground tracking-[-0.03em] leading-[1.15]">Identificação</h2>
        <p className="font-body text-muted-foreground text-[0.9375rem] leading-relaxed tracking-[-0.01em]">Dados pessoais do cliente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Nome completo</Label>
          <Input value={data.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Nome completo do cliente" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">CPF</Label>
          <Input value={data.cpf} onChange={(e) => update("cpf", e.target.value)} placeholder="000.000.000-00" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Data de nascimento</Label>
          <Input type="date" value={data.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>

        <div className="space-y-2">
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
            inputPlaceholder="Ex: Separado judicialmente"
          />
        </div>

        <div className="space-y-2">
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
            inputPlaceholder="Ex: Regime misto"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Profissão / Cargo</Label>
          <Input value={data.profession} onChange={(e) => update("profession", e.target.value)} placeholder="Ex: Engenheiro Civil" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Empresa</Label>
          <Input value={data.company} onChange={(e) => update("company", e.target.value)} placeholder="Onde trabalha" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Tempo de profissão (anos)</Label>
          <Input type="number" value={data.years_in_profession} onChange={(e) => update("years_in_profession", e.target.value)} placeholder="0" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Nº de dependentes</Label>
          <Input type="number" value={data.dependents_count} onChange={(e) => update("dependents_count", e.target.value)} placeholder="0" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Idades dos dependentes</Label>
          <Input value={data.dependents_ages} onChange={(e) => update("dependents_ages", e.target.value)} placeholder="Ex: 5, 12, 18" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Cidade</Label>
          <Input value={data.city} onChange={(e) => update("city", e.target.value)} placeholder="Cidade" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-muted-foreground text-[0.8125rem]">Estado</Label>
          <Input value={data.state} onChange={(e) => update("state", e.target.value)} placeholder="UF" className="text-[0.9375rem] border-border bg-background focus-visible:ring-primary/30" />
        </div>
      </div>
    </div>
  );
};
