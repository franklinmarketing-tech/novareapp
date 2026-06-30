// Painel: o número-âncora (Marco Horizonte), viabilidade e as 3 alavancas.
import { Link } from "react-router-dom";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { computeHealthScore } from "@/lib/lifeplan";
import { VIDAPLAN } from "../lib/brand";
import { VPCard, VPProgress, VPStat } from "../components/ui";
import OnboardingGuide from "../components/OnboardingGuide";
import OnboardingWizard from "../components/OnboardingWizard";
import AdvisorCard from "../components/AdvisorCard";
import { Sparkles, Sunrise, Wallet, ArrowRight, CheckCircle2, AlertTriangle, Clock, TrendingUp, PiggyBank, LineChart, ClipboardList, Activity, Target, Bot, Palette, Users, Scale, BookOpen, Receipt } from "lucide-react";

const Painel = () => {
  const { plan, input, setField } = useVidaPlan();
  const pct = Math.min(100, plan.pctAtingido);
  const saude = computeHealthScore(input, plan);
  const fraco = [...saude.pilares].sort((a, b) => a.score - b.score)[0];
  // Renda que o patrimônio projetado sustenta (consistente com o % atingido).
  const ratio = plan.alvoAposentadoria > 0 ? plan.patrimonioNaApos / plan.alvoAposentadoria : 1;
  const rendaProjetada = input.rendaINSS + Math.max(0, input.rendaAposDesejada - input.rendaINSS) * ratio;
  // Meta de renda que tornaria o projeto viável (= renda projetada, quando ainda não bate).
  const rendaReduzida = !plan.viavel && plan.alvoAposentadoria > 0 ? rendaProjetada : null;

  return (
    <div className="space-y-6">
      <OnboardingWizard />
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
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
          <span className="text-white/55">Rentabilidade do projeto</span>
          <span className="font-semibold text-[#7FE3C0] tabular-nums">IPCA + {input.rentRealPct.toFixed(2)}%</span>
        </div>
      </div>

      <OnboardingGuide />

      {/* Viabilidade — renda projetada e patrimônio, cada um vs sua meta */}
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
          {plan.viavel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#2F8F6B]/12 px-2.5 py-1 text-xs font-bold text-[#2F8F6B]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Conquistada
            </span>
          ) : (
            <span className="font-display text-2xl font-bold tabular-nums text-[#C8643F]">{Math.round(plan.pctAtingido)}%</span>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <MetaBar
            titulo="Renda projetada na independência" sufixo="/mês"
            valor={rendaProjetada} meta={input.rendaAposDesejada} pct={pct} viavel={plan.viavel}
          />
          <MetaBar
            titulo={`Patrimônio projetado aos ${input.idadeAposentadoria}`}
            valor={plan.patrimonioNaApos} meta={plan.alvoAposentadoria} pct={pct} viavel={plan.viavel}
          />
        </div>
      </VPCard>

      {/* Saúde Financeira */}
      <VPCard className="p-5">
        <div className="flex items-center gap-4">
          <ScoreRing score={saude.total} />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-[#1b2a3d]/50">Saúde financeira</p>
            <p className="font-display text-xl font-bold" style={{ color: corScore(saude.total) }}>{saude.nota}</p>
            <p className="text-xs text-[#1b2a3d]/55">{fraco.score < 70 ? fraco.dica : "Seus pilares estão equilibrados — siga assim."}</p>
          </div>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {saude.pilares.map((p) => (
            <div key={p.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#16314f]">{p.nome}</span>
                <span className="tabular-nums text-[#1b2a3d]/55">{p.score}</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${p.score}%`, backgroundColor: corScore(p.score) }} />
              </div>
            </div>
          ))}
        </div>
      </VPCard>

      {/* Alavancas aplicáveis (só quando não é viável) */}
      {!plan.viavel && (
        <div>
          <p className="font-display text-base font-bold text-[#16314f] mb-1">Como tornar viável</p>
          <p className="text-sm text-[#1b2a3d]/55 mb-3">Toque em uma opção para aplicá-la ao seu plano.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Lever
              icon={Clock} label="Adiar a independência" note="trabalhar um pouco mais"
              value={plan.esperarAnos != null ? `+${plan.esperarAnos} ano${plan.esperarAnos > 1 ? "s" : ""}` : "—"}
              onApply={plan.esperarAnos != null ? () => setField("idadeAposentadoria", input.idadeAposentadoria + plan.esperarAnos!) : undefined}
            />
            <Lever
              icon={TrendingUp} label="Buscar mais rentabilidade" note="ganho real ao ano"
              value={plan.rentNecessariaPct != null ? `IPCA + ${plan.rentNecessariaPct.toFixed(1)}%` : "—"}
              onApply={plan.rentNecessariaPct != null ? () => setField("rentRealPct", Number(plan.rentNecessariaPct!.toFixed(1))) : undefined}
            />
            <Lever
              icon={PiggyBank} label="Poupar a mais" note="aporte mensal extra"
              value={plan.pouparMaisMes != null ? `${brl0(plan.pouparMaisMes)}/mês` : "—"}
            />
            <Lever
              icon={Target} label="Reduzir a meta" note="renda na independência"
              value={rendaReduzida != null ? `${brl0(rendaReduzida)}/mês` : "—"}
              onApply={rendaReduzida != null ? () => setField("rendaAposDesejada", Math.round(rendaReduzida)) : undefined}
            />
          </div>
        </div>
      )}

      {/* Atalhos (hub) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Shortcut to="/vidaplan/app/sonhos" icon={Sparkles} title="Meus Sonhos" desc={`${input.goals.length} objetivo(s)`} />
        <Shortcut to="/vidaplan/app/independencia" icon={Sunrise} title="Independência" desc={`aos ${input.idadeAposentadoria} anos`} />
        <Shortcut to="/vidaplan/app/realidade" icon={Wallet} title="Minha Realidade" desc="renda, custos e dívidas" />
        <Shortcut to="/vidaplan/app/orcamento" icon={Receipt} title="Orçamento do mês" desc="orçado × realizado" />
        <Shortcut to="/vidaplan/app/projecao" icon={LineChart} title="Projeção" desc="linha da vida e fluxo" />
        <Shortcut to="/vidaplan/app/cenarios" icon={Scale} title="Comparar Cenários" desc="simule possibilidades" />
        <Shortcut to="/vidaplan/app/plano" icon={ClipboardList} title="Plano de Ação" desc="carteira e proteção" />
        <Shortcut to="/vidaplan/app/progresso" icon={Activity} title="Meu Progresso" desc="aportes vs meta" />
        <Shortcut to="/vidaplan/app/assistente" icon={Bot} title="IA Novare" desc="tire dúvidas com a IA" />
        <Shortcut to="/vidaplan/app/clientes" icon={Users} title="Painel do Consultor" desc="sua carteira de clientes" />
        <Shortcut to="/vidaplan/app/aprender" icon={BookOpen} title="Como funciona" desc="método e glossário" />
        <Shortcut to="/vidaplan/app/marca" icon={Palette} title="Minha Marca" desc="logo e identidade" />
      </div>

      <VPStat label="Renda desejada na independência" value={`${brl0(input.rendaAposDesejada)}/mês`} accent="navy" />

      <AdvisorCard />
    </div>
  );
};

const corScore = (s: number) => (s >= 80 ? "#2F8F6B" : s >= 60 ? "#3FA0A0" : s >= 40 ? "#E2A03F" : "#C8643F");

const ScoreRing = ({ score }: { score: number }) => {
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0">
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(16,49,79,0.08)" strokeWidth="6" />
      <circle cx="34" cy="34" r={r} fill="none" stroke={corScore(score)} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 34 34)" />
      <text x="34" y="35" textAnchor="middle" dominantBaseline="central" fontFamily="Playfair Display, serif" fontSize="20" fontWeight="700" fill="#16314f">{score}</text>
    </svg>
  );
};

const MetaBar = ({ titulo, valor, meta, pct, viavel, sufixo = "" }: { titulo: string; valor: number; meta: number; pct: number; viavel: boolean; sufixo?: string }) => (
  <div>
    <div className="flex items-end justify-between">
      <span className="text-sm text-[#1b2a3d]/60">{titulo}</span>
      <span className="text-sm text-[#1b2a3d]/60">Meta</span>
    </div>
    <div className="flex items-baseline justify-between mt-0.5 mb-1.5">
      <span className="font-display text-xl font-bold tabular-nums text-[#16314f]">{brl0(valor)}<span className="text-sm text-[#1b2a3d]/45 font-normal">{sufixo}</span></span>
      <span className="font-display text-base font-bold tabular-nums text-[#1b2a3d]/70">{brl0(meta)}<span className="text-sm text-[#1b2a3d]/45 font-normal">{sufixo}</span></span>
    </div>
    <VPProgress pct={pct} tone={viavel ? "green" : "terracota"} />
  </div>
);

const Lever = ({ icon: Icon, label, value, note, onApply }: { icon: typeof Clock; label: string; value: string; note: string; onApply?: () => void }) => (
  <VPCard className="p-4 flex flex-col">
    <Icon className="h-4 w-4 text-[#C8643F]" />
    <p className="text-[11px] font-semibold text-[#1b2a3d]/60 mt-2">{label}</p>
    <p className="font-display text-lg font-bold text-[#16314f] tabular-nums">{value}</p>
    <p className="text-[11px] text-[#1b2a3d]/45 mb-2">{note}</p>
    {onApply ? (
      <button onClick={onApply} className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-[#16314f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d3e63] transition-colors">
        Aplicar
      </button>
    ) : (
      <span className="mt-auto text-[10px] text-[#1b2a3d]/40">ajuste em Realidade</span>
    )}
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
