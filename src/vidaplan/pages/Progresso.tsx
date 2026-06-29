// Meu Progresso: aportes realizados vs meta de poupança + histórico de transações.
import { useMemo, useState } from "react";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import type { Aporte } from "@/lib/lifeplan";
import { VPCard, VPTitle, VPProgress, VPStat } from "../components/ui";
import { Trash2, CheckCircle2, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const z2 = (n: number) => String(n).padStart(2, "0");
const hoje = () => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate(), mesAno: `${d.getFullYear()}-${z2(d.getMonth() + 1)}`, dataISO: `${d.getFullYear()}-${z2(d.getMonth() + 1)}-${z2(d.getDate())}` }; };
const num = (v: string) => parseFloat(v) || 0;
const selAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
const fmtData = (a: Aporte) => {
  if (a.data) { const [y, mm, dd] = a.data.split("-"); return `${dd} ${MESES_ABREV[parseInt(mm) - 1]} ${y}`; }
  const [y, mm] = a.mesAno.split("-"); return `${MESES_ABREV[parseInt(mm) - 1]} ${y}`;
};

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
  const emDia = saldo >= 0;
  const pct = esperado > 0 ? (aportado / esperado) * 100 : 100;

  // Aplicações / resgates + histórico
  const [vGuardar, setVGuardar] = useState("");
  const [vResgatar, setVResgatar] = useState("");
  const [ano, setAno] = useState(hoje().ano);

  const lancar = (valor: number) => {
    if (!valor) return;
    const h = hoje();
    set([{ id: Date.now(), mesAno: h.mesAno, valor, data: h.dataISO }, ...aportes]);
    setAno(h.ano);
  };
  const guardar = () => { lancar(Math.abs(num(vGuardar))); setVGuardar(""); };
  const resgatar = () => { lancar(-Math.abs(num(vResgatar))); setVResgatar(""); };

  const anosDisponiveis = useMemo(() => {
    const s = new Set<number>(aportes.map((a) => parseInt(a.mesAno?.slice(0, 4)) || hoje().ano));
    s.add(hoje().ano);
    return [...s].sort((a, b) => b - a);
  }, [aportes]);

  const mesesDoAno = useMemo(() => {
    const doAno = aportes.filter((a) => a.mesAno?.startsWith(`${ano}-`));
    const byMes = new Map<number, Aporte[]>();
    for (const a of doAno) {
      const mes = parseInt(a.mesAno.slice(5, 7)) || 1;
      byMes.set(mes, [...(byMes.get(mes) ?? []), a]);
    }
    return [...byMes.entries()]
      .map(([mes, items]) => ({
        mes,
        items: items.slice().sort((x, y) => (y.data ?? y.mesAno).localeCompare(x.data ?? x.mesAno)),
        saldo: items.reduce((s, a) => s + (Number(a.valor) || 0), 0),
      }))
      .sort((a, b) => b.mes - a.mes);
  }, [aportes, ano]);

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

      {/* Aplicações e resgates */}
      <VPCard className="p-5">
        <p className="font-display text-base font-bold text-[#16314f]">Aplicações e resgates</p>
        <p className="text-sm text-[#1b2a3d]/55 mb-4">Registre quanto guardou ou resgatou — entra direto no seu progresso.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#2F8F6B]/25 bg-[#2F8F6B]/[0.05] p-4">
            <p className="text-sm font-semibold text-[#16314f] mb-2">Quanto deseja guardar?</p>
            <div className="flex items-center rounded-lg border border-black/10 bg-white px-3 mb-2">
              <span className="text-[11px] text-[#1b2a3d]/40">R$</span>
              <input type="number" inputMode="decimal" value={vGuardar} onFocus={selAll} placeholder="0"
                onChange={(e) => setVGuardar(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guardar()}
                className="w-full bg-transparent py-2 px-1 text-sm text-[#16314f] outline-none tabular-nums" />
              <span className="text-[11px] text-[#1b2a3d]/40">/mês</span>
            </div>
            <button onClick={guardar} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2F8F6B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#27795a] transition-colors">
              <ArrowDownToLine className="h-4 w-4" /> Guardar
            </button>
          </div>
          <div className="rounded-xl border border-[#C8643F]/25 bg-[#C8643F]/[0.05] p-4">
            <p className="text-sm font-semibold text-[#16314f] mb-2">Quanto deseja resgatar?</p>
            <div className="flex items-center rounded-lg border border-black/10 bg-white px-3 mb-2">
              <span className="text-[11px] text-[#1b2a3d]/40">R$</span>
              <input type="number" inputMode="decimal" value={vResgatar} onFocus={selAll} placeholder="0"
                onChange={(e) => setVResgatar(e.target.value)} onKeyDown={(e) => e.key === "Enter" && resgatar()}
                className="w-full bg-transparent py-2 px-1 text-sm text-[#16314f] outline-none tabular-nums" />
            </div>
            <button onClick={resgatar} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C8643F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#b25636] transition-colors">
              <ArrowUpFromLine className="h-4 w-4" /> Resgatar
            </button>
          </div>
        </div>
      </VPCard>

      {/* Histórico de transações */}
      <VPCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-base font-bold text-[#16314f]">Histórico de transações</p>
          <select value={ano} onChange={(e) => setAno(parseInt(e.target.value))}
            className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm font-semibold text-[#16314f] outline-none focus:border-[#C8643F] cursor-pointer">
            {anosDisponiveis.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="rounded-xl bg-[#16314f]/[0.04] px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-[#1b2a3d]/60">Saldo economizado</span>
          <span className="font-display text-xl font-bold text-[#2F8F6B] tabular-nums">{brl0(aportado)}</span>
        </div>
        {mesesDoAno.length === 0 ? (
          <p className="text-sm text-[#1b2a3d]/50">Nenhum lançamento em {ano}. Use os botões acima para guardar ou resgatar.</p>
        ) : (
          <div className="space-y-4">
            {mesesDoAno.map(({ mes, items, saldo }) => (
              <div key={mes}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/45 mb-1.5">{MESES[mes - 1]}</p>
                <div className="space-y-1.5">
                  {items.map((a) => {
                    const aplic = a.valor >= 0;
                    return (
                      <div key={a.id} className="flex items-center gap-2.5 group">
                        <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${aplic ? "bg-[#2F8F6B]/12 text-[#2F8F6B]" : "bg-[#C8643F]/12 text-[#C8643F]"}`}>
                          {aplic ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#16314f] leading-tight">{aplic ? "Aplicação" : "Resgate"}</p>
                          <p className="text-[11px] text-[#1b2a3d]/45">{fmtData(a)}</p>
                        </div>
                        <span className={`tabular-nums font-semibold text-sm ${aplic ? "text-[#2F8F6B]" : "text-[#C8643F]"}`}>{aplic ? "+" : ""}{brl0(a.valor)}</span>
                        <button onClick={() => set(aportes.filter((x) => x.id !== a.id))} className="text-[#1b2a3d]/20 hover:text-[#C8643F] shrink-0 transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between border-t border-black/[0.06] mt-2 pt-1.5 text-sm">
                  <span className="text-[#1b2a3d]/55">Saldo do mês</span>
                  <span className="font-semibold text-[#16314f] tabular-nums">{brl0(saldo)}</span>
                </div>
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
