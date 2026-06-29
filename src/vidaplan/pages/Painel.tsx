// Painel: o número-âncora (Marco Horizonte), viabilidade e as 3 alavancas.
import { Link } from "react-router-dom";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { VIDAPLAN } from "../lib/brand";
import { VPCard, VPProgress, VPStat } from "../components/ui";
import { Sparkles, Sunrise, Wallet, ArrowRight, CheckCircle2, AlertTriangle, Clock, TrendingUp, PiggyBank } from "lucide-react";

const Painel = () => {
  const { plan, input } = useVidaPlan();
  const pct = Math.min(100, plan.pctAtingido);

  return (
    <div className="space-y-6">
      {/* Marco Horizonte */}
      <div className="rounded-2xl bg-[#16314f] p-6 shadow-[0_8px_24px_rgba(16,49,79,0.25)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">{VIDAPLAN.anchorLabel}</p>
        <p className="font-display text-4xl sm:text-5xl font-bold text-white tabular-nums mt-1">{brl0(plan.capitalDeVida)}</p>
        <p className="text-sm text-white/60 mt-2 max-w-md">{VIDAPLAN.anchorHint}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50">Independência</p>
            <p className="font-display text-lg font-bold text-white tabular-nums">{brl0(plan.alvoAposentadoria)}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50">Sonhos</p>
            <p className="font-display text-lg font-bold text-white tabular-nums">{brl0(plan.totalObjetivos)}</p>
          </div>
        </div>
      </div>

      {/* Viabilidade */}
      <VPCard className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {plan.viavel
              ? <CheckCircle2 className="h-5 w-5 text-[#2F8F6B]" />
              : <AlertTriangle className="h-5 w-5 text-[#C8643F]" />}
            <p className="font-display text-lg font-bold text-[#16314f]">
              {plan.viavel ? "Independência no rumo certo" : "Independência exige ajustes"}
            </p>
          </div>
          <span className={`font-display text-2xl font-bold tabular-nums ${plan.viavel ? "text-[#2F8F6B]" : "text-[#C8643F]"}`}>
            {Math.round(plan.pctAtingido)}%
          </span>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-[#1b2a3d]/60">Patrimônio projetado aos {input.idadeAposentadoria}</span>
            <span className="tabular-nums font-semibold text-[#16314f]">{brl0(plan.patrimonioNaApos)}</span>
          </div>
          <VPProgress pct={pct} tone={plan.viavel ? "green" : "terracota"} />
          <div className="flex justify-between text-xs text-[#1b2a3d]/50">
            <span>Meta: {brl0(plan.alvoAposentadoria)}</span>
            <span>Renda passiva ~ {brl0(plan.rendaPassivaProjetada)}/mês</span>
          </div>
        </div>
      </VPCard>

      {/* 3 alavancas (só quando não é viável) */}
      {!plan.viavel && (
        <div>
          <p className="font-display text-base font-bold text-[#16314f] mb-3">Como tornar viável</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Lever icon={Clock} label="Adiar a independência" value={plan.esperarAnos != null ? `+${plan.esperarAnos} ano${plan.esperarAnos > 1 ? "s" : ""}` : "—"} note="trabalhar um pouco mais" />
            <Lever icon={TrendingUp} label="Rentabilidade necessária" value={plan.rentNecessariaPct != null ? `IPCA + ${plan.rentNecessariaPct.toFixed(1)}%` : "—"} note="ganho real ao ano" />
            <Lever icon={PiggyBank} label="Poupar a mais" value={plan.pouparMaisMes != null ? `${brl0(plan.pouparMaisMes)}/mês` : "—"} note="aporte mensal extra" />
          </div>
        </div>
      )}

      {/* Atalhos */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Shortcut to="/vidaplan/app/sonhos" icon={Sparkles} title="Meus Sonhos" desc={`${input.goals.length} objetivo(s)`} />
        <Shortcut to="/vidaplan/app/independencia" icon={Sunrise} title="Independência" desc={`aos ${input.idadeAposentadoria} anos`} />
        <Shortcut to="/vidaplan/app/realidade" icon={Wallet} title="Minha Realidade" desc="renda e custos hoje" />
      </div>

      <VPStat label="Renda desejada na independência" value={`${brl0(input.rendaAposDesejada)}/mês`} accent="navy" />
    </div>
  );
};

const Lever = ({ icon: Icon, label, value, note }: { icon: typeof Clock; label: string; value: string; note: string }) => (
  <VPCard className="p-4">
    <Icon className="h-4 w-4 text-[#C8643F]" />
    <p className="text-[11px] font-semibold text-[#1b2a3d]/60 mt-2">{label}</p>
    <p className="font-display text-lg font-bold text-[#16314f] tabular-nums">{value}</p>
    <p className="text-[11px] text-[#1b2a3d]/45">{note}</p>
  </VPCard>
);

const Shortcut = ({ to, icon: Icon, title, desc }: { to: string; icon: typeof Sparkles; title: string; desc: string }) => (
  <Link to={to}>
    <VPCard className="p-4 hover:border-[#C8643F]/40 transition-colors">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-[#16314f]" />
        <ArrowRight className="h-4 w-4 text-[#1b2a3d]/30" />
      </div>
      <p className="font-semibold text-[#16314f] mt-2">{title}</p>
      <p className="text-xs text-[#1b2a3d]/50">{desc}</p>
    </VPCard>
  </Link>
);

export default Painel;
