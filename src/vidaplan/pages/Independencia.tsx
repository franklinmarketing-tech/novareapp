// Independência: quando e como você quer se tornar independente financeiramente.
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { VPCard, VPTitle, VPField, VPProgress } from "../components/ui";

const Independencia = () => {
  const { input, setField, plan } = useVidaPlan();

  return (
    <div className="space-y-6">
      <VPTitle hint="O ponto em que sua renda passiva sustenta seu padrão de vida — sem depender do trabalho.">Independência</VPTitle>

      <VPCard className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <VPField label="Idade atual" value={input.idadeAtual} onChange={(v) => setField("idadeAtual", v)} />
          <VPField label="Idade da independência" value={input.idadeAposentadoria} onChange={(v) => setField("idadeAposentadoria", v)} />
          <VPField label="Expectativa de vida" value={input.idadeFim} onChange={(v) => setField("idadeFim", v)} />
          <VPField label="Renda mensal desejada" suffix="R$/mês (hoje)" value={input.rendaAposDesejada} step={100} onChange={(v) => setField("rendaAposDesejada", v)} />
          <VPField label="Renda já garantida (INSS/previdência)" suffix="R$/mês" value={input.rendaINSS} step={100} onChange={(v) => setField("rendaINSS", v)} />
        </div>
      </VPCard>

      <VPCard className="p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[#1b2a3d]/60">Patrimônio necessário (Independência)</span>
          <span className="font-display font-bold text-[#16314f] tabular-nums">{brl0(plan.alvoAposentadoria)}</span>
        </div>
        <VPProgress pct={Math.min(100, plan.pctAtingido)} tone={plan.viavel ? "green" : "terracota"} />
        <p className="text-xs text-[#1b2a3d]/50 mt-2">
          Projeção: {brl0(plan.patrimonioNaApos)} aos {input.idadeAposentadoria} anos · {Math.round(plan.pctAtingido)}% da meta.
        </p>
      </VPCard>
    </div>
  );
};

export default Independencia;
