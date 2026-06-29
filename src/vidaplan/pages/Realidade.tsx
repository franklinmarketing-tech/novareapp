// Minha Realidade: renda, custos e patrimônio de hoje.
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { VPCard, VPTitle, VPField } from "../components/ui";

const Realidade = () => {
  const { input, setField } = useVidaPlan();
  const sobra = input.rendaMensal - input.custoFixoMensal;

  return (
    <div className="space-y-6">
      <VPTitle hint="Sua fotografia financeira atual. É a base de toda a projeção.">Minha Realidade</VPTitle>

      <VPCard className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <VPField label="Renda mensal líquida" suffix="R$/mês" value={input.rendaMensal} step={100} onChange={(v) => setField("rendaMensal", v)} />
          <VPField label="Custo fixo mensal" suffix="R$/mês" value={input.custoFixoMensal} step={100} onChange={(v) => setField("custoFixoMensal", v)} />
          <VPField label="Patrimônio investido hoje" suffix="R$" value={input.patrimonioAtual} step={1000} onChange={(v) => setField("patrimonioAtual", v)} />
          <VPField label="Rentabilidade real esperada" suffix="% a.a. (acima do IPCA)" value={input.rentRealPct} step={0.5} onChange={(v) => setField("rentRealPct", v)} />
        </div>
      </VPCard>

      <VPCard className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Sobra mensal estimada</p>
        <p className={`font-display text-2xl font-bold tabular-nums ${sobra >= 0 ? "text-[#2F8F6B]" : "text-[#C8643F]"}`}>{brl0(sobra)}</p>
        <p className="text-xs text-[#1b2a3d]/50 mt-1">É o que sobra todo mês para investir nos seus sonhos e na independência.</p>
      </VPCard>
    </div>
  );
};

export default Realidade;
