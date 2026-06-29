// Meu Progresso: aportes realizados vs meta de poupança.
import { useMemo } from "react";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import type { Aporte } from "@/lib/lifeplan";
import { VPCard, VPTitle, VPProgress, VPStat } from "../components/ui";
import { Plus, Minus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const hoje = () => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() + 1, mesAno: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` }; };

const Progresso = () => {
  const { input, plan, setField } = useVidaPlan();
  const aportes = input.aportes ?? [];

  const m = useMemo(() => {
    const h = hoje();
    const primeiroTrab = plan.serie.find((p) => p.idade < input.idadeAposentadoria && p.sobra > 0);
    const metaMensal = primeiroTrab ? primeiroTrab.sobra / 12 : 0;
    const mesesDecorridos = Math.max(1, (h.ano - input.anoAtual) * 12 + h.mes);
    const esperado = metaMensal * mesesDecorridos;
    const aportado = aportes.reduce((s, a) => s + (Number(a.valor) || 0), 0);

    // Metas em 3 níveis (projeto · ano · mês)
    const anoApos = input.anoAtual + (input.idadeAposentadoria - input.idadeAtual);
    const metaProjeto = plan.serie.filter((p) => p.idade < input.idadeAposentadoria && p.sobra > 0).reduce((s, p) => s + p.sobra, 0);
    const anoCorr = plan.serie.find((p) => p.ano === h.ano);
    const metaAno = anoCorr && anoCorr.idade < input.idadeAposentadoria ? Math.max(0, anoCorr.sobra) : metaMensal * 12;
    const metaMes = metaAno / 12;
    const realizadoAno = aportes.filter((a) => a.mesAno?.startsWith(`${h.ano}-`)).reduce((s, a) => s + (Number(a.valor) || 0), 0);
    const realizadoMes = aportes.filter((a) => a.mesAno === h.mesAno).reduce((s, a) => s + (Number(a.valor) || 0), 0);

    return {
      metaMensal, esperado, aportado, saldo: aportado - esperado,
      anoApos, anoAtualReal: h.ano, mesNome: MESES[h.mes - 1],
      metaProjeto, metaAno, metaMes, realizadoProjeto: aportado, realizadoAno, realizadoMes,
    };
  }, [aportes, plan.serie, input.idadeAposentadoria, input.idadeAtual, input.anoAtual]);
  const { metaMensal, esperado, aportado, saldo } = m;

  const set = (list: Aporte[]) => setField("aportes", list);
  const upd = (id: number, patch: Partial<Aporte>) => set(aportes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const emDia = saldo >= 0;
  const pct = esperado > 0 ? (aportado / esperado) * 100 : 100;

  return (
    <div className="space-y-6">
      <VPTitle hint="Acompanhe se seus aportes estão no ritmo do plano.">📊 Meu Progresso</VPTitle>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <VPStat label="Meta mensal" value={`${brl0(metaMensal)}`} accent="navy" />
        <VPStat label="Total aportado" value={brl0(aportado)} accent="green" />
        <VPStat label="Esperado até hoje" value={brl0(esperado)} accent="terracota" />
      </div>

      <VPCard className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {emDia ? <CheckCircle2 className="h-5 w-5 text-[#2F8F6B]" /> : <AlertTriangle className="h-5 w-5 text-[#C8643F]" />}
            <p className="font-display text-lg font-bold text-[#16314f]">{emDia ? "Você está em dia" : "Você está atrás da meta"}</p>
          </div>
          <span className={`font-display text-lg font-bold tabular-nums ${emDia ? "text-[#2F8F6B]" : "text-[#C8643F]"}`}>
            {emDia ? "+" : ""}{brl0(saldo)}
          </span>
        </div>
        <VPProgress pct={pct} tone={emDia ? "green" : "terracota"} />
        <p className="text-xs text-[#1b2a3d]/50 mt-2">
          {emDia ? "Aportou no ritmo (ou acima) do que o plano pede até aqui." : `Para ficar em dia, aporte ${brl0(-saldo)} a mais.`}
        </p>
      </VPCard>

      {/* Metas de poupança em 3 níveis */}
      <VPCard className="p-5 space-y-4">
        <div>
          <p className="font-display text-base font-bold text-[#16314f]">Metas de poupança</p>
          <p className="text-sm text-[#1b2a3d]/55">Quanto poupar para conquistar o seu Marco Horizonte.</p>
        </div>
        <TierRow titulo="Até a independência" periodo={`${input.anoAtual}–${m.anoApos}`} realizado={m.realizadoProjeto} meta={m.metaProjeto} />
        <TierRow titulo="Neste ano" periodo={String(m.anoAtualReal)} realizado={m.realizadoAno} meta={m.metaAno} />
        <TierRow titulo="Neste mês" periodo={m.mesNome} realizado={m.realizadoMes} meta={m.metaMes} />
      </VPCard>

      {/* Lançamentos */}
      <VPCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-base font-bold text-[#16314f]">Aportes e resgates</p>
          <div className="flex gap-2">
            <button
              onClick={() => set([{ id: Date.now(), mesAno: hoje().mesAno, valor: Math.round(metaMensal) }, ...aportes])}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16314f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d3e63] transition-colors">
              <Plus className="h-3.5 w-3.5" /> Aporte
            </button>
            <button
              onClick={() => set([{ id: Date.now(), mesAno: hoje().mesAno, valor: -Math.round(metaMensal) }, ...aportes])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C8643F]/40 px-3 py-1.5 text-xs font-semibold text-[#C8643F] hover:bg-[#C8643F]/[0.06] transition-colors">
              <Minus className="h-3.5 w-3.5" /> Resgate
            </button>
          </div>
        </div>
        {aportes.length === 0 ? (
          <p className="text-sm text-[#1b2a3d]/50">Nenhum aporte lançado ainda. Registre o quanto você já investiu.</p>
        ) : (
          <div className="space-y-2">
            {aportes.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <input type="month" value={a.mesAno} onChange={(e) => upd(a.id, { mesAno: e.target.value })}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F]" />
                <div className="flex items-center rounded-lg border border-black/10 px-2 flex-1">
                  <span className="text-[11px] text-[#1b2a3d]/40">R$</span>
                  <input type="number" value={a.valor} onChange={(e) => upd(a.id, { valor: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent py-1.5 pl-1 text-sm text-right text-[#16314f] outline-none tabular-nums" />
                </div>
                <button onClick={() => set(aportes.filter((x) => x.id !== a.id))} className="text-[#1b2a3d]/30 hover:text-[#C8643F] shrink-0"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </VPCard>
    </div>
  );
};

const TierRow = ({ titulo, periodo, realizado, meta }: { titulo: string; periodo: string; realizado: number; meta: number }) => {
  const pct = meta > 0 ? Math.min(100, (realizado / meta) * 100) : (realizado > 0 ? 100 : 0);
  const ok = pct >= 100;
  return (
    <div>
      <div className="flex items-end justify-between mb-1.5">
        <div>
          <span className="inline-block rounded-full bg-[#16314f]/[0.06] px-2 py-0.5 text-[10px] font-semibold text-[#16314f]/70 mb-1">{periodo}</span>
          <p className="text-sm font-semibold text-[#16314f]">{titulo}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-base font-bold tabular-nums text-[#16314f] leading-tight">{brl0(realizado)}</p>
          <p className="text-[11px] text-[#1b2a3d]/45">{Math.round(pct)}% · meta {brl0(meta)}</p>
        </div>
      </div>
      <VPProgress pct={pct} tone={ok ? "green" : "navy"} />
    </div>
  );
};

export default Progresso;
