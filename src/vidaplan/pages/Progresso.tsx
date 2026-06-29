// Meu Progresso: aportes realizados vs meta de poupança.
import { useMemo } from "react";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import type { Aporte } from "@/lib/lifeplan";
import { VPCard, VPTitle, VPProgress, VPStat } from "../components/ui";
import { Plus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

const hoje = () => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() + 1, mesAno: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` }; };

const Progresso = () => {
  const { input, plan, setField } = useVidaPlan();
  const aportes = input.aportes ?? [];

  const { metaMensal, esperado, aportado, saldo } = useMemo(() => {
    const h = hoje();
    const primeiroTrab = plan.serie.find((p) => p.idade < input.idadeAposentadoria && p.sobra > 0);
    const metaMensal = primeiroTrab ? primeiroTrab.sobra / 12 : 0;
    const mesesDecorridos = Math.max(1, (h.ano - input.anoAtual) * 12 + h.mes);
    const esperado = metaMensal * mesesDecorridos;
    const aportado = aportes.reduce((s, a) => s + (Number(a.valor) || 0), 0);
    return { metaMensal, esperado, aportado, saldo: aportado - esperado };
  }, [aportes, plan.serie, input.idadeAposentadoria, input.anoAtual]);

  const set = (list: Aporte[]) => setField("aportes", list);
  const upd = (id: number, patch: Partial<Aporte>) => set(aportes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const emDia = saldo >= 0;
  const pct = esperado > 0 ? (aportado / esperado) * 100 : 100;

  return (
    <div className="space-y-6">
      <VPTitle hint="Acompanhe se seus aportes estão no ritmo do plano.">Meu Progresso</VPTitle>

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

      {/* Lançamentos */}
      <VPCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-base font-bold text-[#16314f]">Aportes realizados</p>
          <button
            onClick={() => set([{ id: Date.now(), mesAno: hoje().mesAno, valor: Math.round(metaMensal) }, ...aportes])}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#16314f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d3e63] transition-colors">
            <Plus className="h-3.5 w-3.5" /> Lançar aporte
          </button>
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

export default Progresso;
