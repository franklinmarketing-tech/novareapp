// Plano de Ação: caminho prático pra concretizar o projeto de vida.
import { useMemo } from "react";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "../state/useSubscription";
import { computeActionPlan } from "../lib/actionplan";
import { exportVidaPlanPDF } from "../lib/pdf";
import { VPCard, VPTitle, VPField } from "../components/ui";
import { PiggyBank, ShieldCheck, LineChart, Landmark, Scale, Info, FileDown, SlidersHorizontal } from "lucide-react";

const HORIZONTE_LABEL: Record<string, string> = {
  Longo: "Horizonte longo", Médio: "Horizonte médio", Curto: "Horizonte curto", Renda: "Fase de renda",
};
const CORES = ["#16314f", "#2F8F6B", "#C8643F", "#E2A03F", "#5B8DB8"];

const Plano = () => {
  const { input, plan, setField } = useVidaPlan();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const ap = useMemo(() => computeActionPlan(input, plan), [input, plan]);
  const cfg = input.planoConfig ?? {};
  const setCfg = (patch: Partial<typeof cfg>) => setField("planoConfig", { ...cfg, ...patch });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <VPTitle hint="O caminho prático pra concretizar seu projeto de vida. Simulação educacional — sua Novare personaliza com você.">
          🎯 Plano de Ação
        </VPTitle>
        {isPremium ? (
          <button onClick={() => { exportVidaPlanPDF(input, plan, user?.email ?? undefined).catch(() => {}); }}
            className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#16314f] to-[#C8643F] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#16314f]/25 hover:brightness-110 active:scale-[0.98] transition-all">
            <FileDown className="h-4 w-4" /> 📄 Exportar relatório
          </button>
        ) : (
          <Link to="/vidaplan/app/assinar"
            className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E2A03F] to-[#C8643F] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#E2A03F]/25 hover:brightness-110 active:scale-[0.98] transition-all">
            <FileDown className="h-4 w-4" /> 📄 Exportar relatório
            <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-bold tracking-wide">GOLD</span>
          </Link>
        )}
      </div>

      {/* Aporte + Reserva */}
      <div className="grid sm:grid-cols-2 gap-3">
        <VPCard className="p-5">
          <PiggyBank className="h-5 w-5 text-[#2F8F6B]" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/50 mt-2">Aporte mensal recomendado</p>
          <p className="font-display text-2xl font-bold text-[#16314f] tabular-nums">{brl0(ap.aporteRecomendadoMes)}</p>
          <p className="text-xs text-[#1b2a3d]/50 mt-1">
            {plan.viavel ? "Mantendo este aporte, seu projeto se sustenta." : "Inclui o reforço necessário pra fechar a meta."}
          </p>
        </VPCard>
        <VPCard className="p-5">
          <ShieldCheck className="h-5 w-5 text-[#C8643F]" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/50 mt-2">Reserva de emergência</p>
          <p className="font-display text-2xl font-bold text-[#16314f] tabular-nums">{brl0(ap.reservaEmergencia)}</p>
          <p className="text-xs text-[#1b2a3d]/50 mt-1">6 meses do seu custo fixo, em liquidez imediata.</p>
        </VPCard>
      </div>

      {/* Carteira sugerida */}
      <VPCard className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-[#16314f]" />
            <p className="font-display text-lg font-bold text-[#16314f]">Carteira sugerida</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#16314f]/[0.06] text-[#16314f] px-2 py-1 rounded-full">
            {HORIZONTE_LABEL[ap.horizonte]} · {ap.anosAteIndependencia} ano(s)
          </span>
        </div>
        <p className="text-sm text-[#1b2a3d]/60 mb-4">
          Rentabilidade real esperada: <span className="font-semibold text-[#2F8F6B]">IPCA + {ap.rentEsperadaPct.toFixed(1)}% a.a.</span>
        </p>
        <div className="space-y-3">
          {ap.carteira.map((a, i) => (
            <div key={a.classe}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-[#16314f] flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CORES[i % CORES.length] }} />
                  {a.classe}
                </span>
                <span className="tabular-nums text-[#1b2a3d]/60">{a.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${a.pct}%`, backgroundColor: CORES[i % CORES.length] }} />
              </div>
            </div>
          ))}
        </div>
      </VPCard>

      {/* Proteção da família */}
      <VPCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-[#C8643F]" />
          <p className="font-display text-lg font-bold text-[#16314f]">Proteção da família</p>
        </div>
        <p className="text-sm text-[#1b2a3d]/60 mb-3">Capital de seguro de vida sugerido pra manter o padrão da família e quitar dívidas em aberto.</p>
        <p className="font-display text-2xl font-bold text-[#16314f] tabular-nums">{brl0(ap.protecaoFamilia)}</p>
      </VPCard>

      {/* Previdência + Sucessão */}
      <div className="grid sm:grid-cols-2 gap-3">
        <VPCard className="p-5">
          <Landmark className="h-5 w-5 text-[#16314f]" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/50 mt-2">Previdência (aporte sugerido)</p>
          <p className="font-display text-2xl font-bold text-[#16314f] tabular-nums">{brl0(ap.previdenciaMes)}/mês</p>
          <p className="text-xs text-[#1b2a3d]/50 mt-1">
            VGBL {brl0(ap.vgblMes)}/mês{ap.pgblMes > 0 ? ` · PGBL ${brl0(ap.pgblMes)}/mês` : " · informe a renda tributável p/ sugerir PGBL"}
          </p>
        </VPCard>
        <VPCard className="p-5">
          <Scale className="h-5 w-5 text-[#C8643F]" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/50 mt-2">Custo de sucessão estimado</p>
          <p className="font-display text-2xl font-bold text-[#16314f] tabular-nums">{brl0(ap.custoSucessaoEstimado)}</p>
          <p className="text-xs text-[#1b2a3d]/50 mt-1">~{ap.sucessaoPct}% do patrimônio (ITCMD + advogado + cartório). Planejar reduz esse custo.</p>
        </VPCard>
      </div>

      {/* Personalizar plano de ação */}
      <VPCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal className="h-5 w-5 text-[#16314f]" />
          <p className="font-display text-base font-bold text-[#16314f]">Personalizar plano</p>
        </div>
        <p className="text-sm text-[#1b2a3d]/60 mb-3">Ajuste os parâmetros para o plano refletir melhor a sua situação.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <VPField label="Renda anual tributável" suffix="R$/ano (define PGBL)" value={cfg.rendaTributavelAnual ?? 0} step={1000} onChange={(v) => setCfg({ rendaTributavelAnual: v })} />
          <VPField label="Anos de custo p/ a família" suffix="anos (proteção)" value={cfg.anosProtecaoFamilia ?? 5} onChange={(v) => setCfg({ anosProtecaoFamilia: v })} />
          <VPField label="ITCMD" suffix="% sucessão" value={cfg.itcmdPct ?? 6} step={0.5} onChange={(v) => setCfg({ itcmdPct: v })} />
          <VPField label="Advogado" suffix="%" value={cfg.advogadoPct ?? 4} step={0.5} onChange={(v) => setCfg({ advogadoPct: v })} />
          <VPField label="Cartório" suffix="%" value={cfg.cartorioPct ?? 2} step={0.5} onChange={(v) => setCfg({ cartorioPct: v })} />
        </div>
      </VPCard>

      <p className="text-[11px] text-[#1b2a3d]/50 flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Carteiras-modelo e valores são simulações educacionais baseadas no seu horizonte. A recomendação personalizada é feita pela Novare, considerando seu perfil e momento.
      </p>
    </div>
  );
};

export default Plano;
