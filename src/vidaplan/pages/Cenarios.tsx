// Comparador de Cenários: simule mudanças (idade, rentabilidade, renda, patrimônio)
// e compare lado a lado com o seu plano atual. Aplique o melhor com um clique.
import { useMemo, useState } from "react";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { computeLifePlan, type LifePlanInput, type LifePlan } from "@/lib/lifeplan";
import { VPCard, VPTitle, VPProgress } from "../components/ui";
import { Check, Sparkles } from "lucide-react";

type Override = Partial<Pick<LifePlanInput, "idadeAposentadoria" | "rentRealPct" | "rendaAposDesejada" | "patrimonioAtual">>;

const rendaProjetada = (inp: LifePlanInput, plan: LifePlan) => {
  const ratio = plan.alvoAposentadoria > 0 ? plan.patrimonioNaApos / plan.alvoAposentadoria : 1;
  return inp.rendaINSS + Math.max(0, inp.rendaAposDesejada - inp.rendaINSS) * ratio;
};

const Cenarios = () => {
  const { input, plan, setField } = useVidaPlan();
  const [ovA, setOvA] = useState<Override>({ idadeAposentadoria: Math.max(input.idadeAtual + 1, input.idadeAposentadoria - 5) });
  const [ovB, setOvB] = useState<Override>({ rentRealPct: input.rentRealPct + 2 });

  const inpA = { ...input, ...ovA };
  const inpB = { ...input, ...ovB };
  const planA = useMemo(() => computeLifePlan(inpA), [inpA]);
  const planB = useMemo(() => computeLifePlan(inpB), [inpB]);

  const aplicar = (ov: Override) => {
    (Object.keys(ov) as (keyof Override)[]).forEach((k) => { if (ov[k] != null) setField(k, ov[k] as never); });
  };

  return (
    <div className="space-y-6">
      <VPTitle hint="Compare possibilidades lado a lado e aplique a que mais faz sentido pra você.">⚖️ Comparador de Cenários</VPTitle>

      <div className="grid lg:grid-cols-3 gap-3">
        <Coluna titulo="Plano atual" cor="#16314f" inp={input} plan={plan} idadeApos={input.idadeAposentadoria} />
        <Coluna titulo="Cenário A" cor="#C8643F" inp={inpA} plan={planA} idadeApos={inpA.idadeAposentadoria} editable
          ov={ovA} onChange={setOvA} onApply={() => aplicar(ovA)} base={input} />
        <Coluna titulo="Cenário B" cor="#2F8F6B" inp={inpB} plan={planB} idadeApos={inpB.idadeAposentadoria} editable
          ov={ovB} onChange={setOvB} onApply={() => aplicar(ovB)} base={input} />
      </div>

      <p className="text-center text-xs text-[#1b2a3d]/45">
        Edite os controles de cada cenário. <strong className="text-[#1b2a3d]/60">Aplicar ao meu plano</strong> grava as mudanças no seu projeto.
      </p>
    </div>
  );
};

const Coluna = ({ titulo, cor, inp, plan, idadeApos, editable, ov, onChange, onApply, base }: {
  titulo: string; cor: string; inp: LifePlanInput; plan: LifePlan; idadeApos: number;
  editable?: boolean; ov?: Override; onChange?: (o: Override) => void; onApply?: () => void; base?: LifePlanInput;
}) => {
  const pct = Math.min(100, Math.round(plan.pctAtingido));
  const set = (patch: Override) => onChange?.({ ...ov, ...patch });
  const renda = rendaProjetada(inp, plan);

  return (
    <VPCard className="p-4 flex flex-col" style={{ borderTop: `3px solid ${cor}` }}>
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-bold" style={{ color: cor }}>{titulo}</p>
        {plan.viavel
          ? <span className="text-[11px] font-bold rounded-full bg-[#2F8F6B]/12 text-[#2F8F6B] px-2 py-0.5">viável</span>
          : <span className="text-[11px] font-bold rounded-full bg-[#C8643F]/12 text-[#C8643F] px-2 py-0.5">{pct}%</span>}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-[#1b2a3d]/50 mt-2">Número da vida</p>
      <p className="font-display text-2xl font-bold text-[#16314f] tabular-nums">{brl0(plan.capitalDeVida)}</p>

      {/* Controles */}
      <div className="mt-3 space-y-2">
        <Lever label="Idade da independência" value={inp.idadeAposentadoria} editable={editable}
          onChange={(v) => set({ idadeAposentadoria: v })} min={inp.idadeAtual + 1} max={inp.idadeFim - 1} />
        <Lever label="Rentabilidade (IPCA +)" value={inp.rentRealPct} suffix="%" editable={editable} step={0.5}
          onChange={(v) => set({ rentRealPct: v })} min={0} max={12} />
        <Lever label="Renda desejada/mês" value={inp.rendaAposDesejada} money editable={editable} step={500}
          onChange={(v) => set({ rendaAposDesejada: v })} min={0} />
        <Lever label="Patrimônio hoje" value={inp.patrimonioAtual} money editable={editable} step={5000}
          onChange={(v) => set({ patrimonioAtual: v })} min={0} />
      </div>

      {/* Métricas */}
      <div className="mt-3 pt-3 border-t border-black/[0.06] space-y-1.5 text-sm">
        <Row k={`Patrimônio aos ${idadeApos}`} v={brl0(plan.patrimonioNaApos)} />
        <Row k="Meta de independência" v={brl0(plan.alvoAposentadoria)} />
        <Row k="Renda projetada" v={`${brl0(renda)}/mês`} />
      </div>
      <div className="mt-2">
        <VPProgress pct={pct} tone={plan.viavel ? "green" : "terracota"} />
      </div>

      {editable && (
        <button onClick={onApply} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-colors" style={{ backgroundColor: cor }}>
          <Check className="h-4 w-4" /> Aplicar ao meu plano
        </button>
      )}
      {!editable && base && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-[#1b2a3d]/45"><Sparkles className="h-3.5 w-3.5 text-[#C8643F]" /> sua situação de hoje</p>
      )}
    </VPCard>
  );
};

const Lever = ({ label, value, onChange, editable, suffix, money, step = 1, min, max }: {
  label: string; value: number; onChange: (v: number) => void; editable?: boolean;
  suffix?: string; money?: boolean; step?: number; min?: number; max?: number;
}) => {
  const fmt = money ? brl0(value) : `${value}${suffix ?? ""}`;
  if (!editable) return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#1b2a3d]/55">{label}</span>
      <span className="font-semibold text-[#16314f] tabular-nums">{fmt}</span>
    </div>
  );
  const clamp = (v: number) => Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-[#1b2a3d]/55">{label}</span>
        <span className="font-semibold text-[#16314f] tabular-nums">{fmt}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(clamp(value - step))} className="h-7 w-7 rounded-lg border border-black/10 text-[#16314f] font-bold hover:bg-black/[0.03]">–</button>
        <input type="number" value={value} step={step} onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(clamp(parseFloat(e.target.value) || 0))}
          className="flex-1 min-w-0 rounded-lg border border-black/10 px-2 py-1 text-sm text-center text-[#16314f] outline-none focus:border-[#C8643F] tabular-nums" />
        <button onClick={() => onChange(clamp(value + step))} className="h-7 w-7 rounded-lg border border-black/10 text-[#16314f] font-bold hover:bg-black/[0.03]">+</button>
      </div>
    </div>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-[#1b2a3d]/55">{k}</span>
    <span className="font-semibold text-[#16314f] tabular-nums">{v}</span>
  </div>
);

export default Cenarios;
