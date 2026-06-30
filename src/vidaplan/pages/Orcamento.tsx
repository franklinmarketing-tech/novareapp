// Orçamento do mês: orçado (custo planejado por categoria) × realizado (gasto real).
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { VPCard, VPTitle, VPProgress } from "../components/ui";
import { Wallet, CheckCircle2, AlertTriangle } from "lucide-react";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const z2 = (n: number) => String(n).padStart(2, "0");
const hojeMes = () => { const d = new Date(); return `${d.getFullYear()}-${z2(d.getMonth() + 1)}`; };
const rotuloMes = (mesAno: string) => { const [y, m] = mesAno.split("-"); return `${MESES[parseInt(m) - 1]} ${y}`; };

const Orcamento = () => {
  const { input, setField } = useVidaPlan();
  const cats = input.custoCategorias ?? [];
  const [mes, setMes] = useState(hojeMes());

  const meses = useMemo(() => {
    const s = new Set<string>(Object.keys(input.orcamento ?? {}));
    s.add(hojeMes());
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [input.orcamento]);

  const realizadoMes = input.orcamento?.[mes] ?? {};
  const setRealizado = (categoria: string, valor: number) =>
    setField("orcamento", { ...(input.orcamento ?? {}), [mes]: { ...realizadoMes, [categoria]: valor } });

  const totalOrcado = cats.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const totalReal = cats.reduce((s, c) => s + (Number(realizadoMes[c.nome]) || 0), 0);
  const saldo = totalOrcado - totalReal;
  const dentro = saldo >= 0;

  return (
    <div className="space-y-6">
      <VPTitle hint="Compare o que você planejou gastar com o que realmente gastou no mês.">🧾 Orçamento do mês</VPTitle>

      {cats.length === 0 ? (
        <VPCard className="p-8 text-center">
          <Wallet className="h-9 w-9 text-[#16314f]/20 mx-auto mb-3" />
          <p className="font-display text-lg font-bold text-[#16314f]">Defina suas categorias primeiro</p>
          <p className="text-sm text-[#1b2a3d]/55 mt-1 mb-4">O orçamento usa o seu custo por categoria de Minha Realidade.</p>
          <Link to="/vidaplan/app/realidade" className="inline-flex rounded-xl bg-[#16314f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d3e63]">Ir para Minha Realidade</Link>
        </VPCard>
      ) : (
        <>
          {/* Resumo + mês */}
          <VPCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {dentro ? <CheckCircle2 className="h-5 w-5 text-[#2F8F6B]" /> : <AlertTriangle className="h-5 w-5 text-[#C8643F]" />}
                <p className="font-display text-lg font-bold text-[#16314f]">{dentro ? "Dentro do orçamento" : "Acima do orçamento"}</p>
              </div>
              <select value={mes} onChange={(e) => setMes(e.target.value)}
                className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm font-semibold text-[#16314f] outline-none focus:border-[#C8643F] cursor-pointer">
                {meses.map((m) => <option key={m} value={m}>{rotuloMes(m)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Box label="Orçado" value={totalOrcado} cor="#16314f" />
              <Box label="Realizado" value={totalReal} cor="#C8643F" />
              <Box label={dentro ? "Sobra" : "Estouro"} value={Math.abs(saldo)} cor={dentro ? "#2F8F6B" : "#C8643F"} />
            </div>
            <div className="mt-3">
              <VPProgress pct={totalOrcado > 0 ? Math.min(100, (totalReal / totalOrcado) * 100) : 0} tone={dentro ? "green" : "terracota"} />
            </div>
          </VPCard>

          {/* Categorias */}
          <VPCard className="p-5">
            <p className="font-display text-base font-bold text-[#16314f] mb-3">Por categoria</p>
            <div className="space-y-3">
              {cats.map((c, i) => {
                const orcado = Number(c.valor) || 0;
                const real = Number(realizadoMes[c.nome]) || 0;
                const pct = orcado > 0 ? Math.min(100, (real / orcado) * 100) : (real > 0 ? 100 : 0);
                const estourou = real > orcado;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm text-[#16314f] truncate">{c.nome}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-[#1b2a3d]/45 tabular-nums">de {brl0(orcado)}</span>
                        <div className="flex items-center rounded-lg border border-black/10 px-2">
                          <span className="text-[10px] text-[#1b2a3d]/40">R$</span>
                          <input type="number" value={real || ""} placeholder="0" onFocus={(e) => e.target.select()}
                            onChange={(e) => setRealizado(c.nome, parseFloat(e.target.value) || 0)}
                            className="w-20 bg-transparent py-1 pl-1 text-sm text-right text-[#16314f] outline-none tabular-nums" />
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: estourou ? "#C8643F" : "#2F8F6B" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[#1b2a3d]/45 mt-4">Em breve: preenchimento automático pelo Open Finance (Conectar Banco).</p>
          </VPCard>
        </>
      )}
    </div>
  );
};

const Box = ({ label, value, cor }: { label: string; value: number; cor: string }) => (
  <div className="rounded-xl bg-black/[0.03] px-3 py-2">
    <p className="text-[10px] uppercase tracking-wider text-[#1b2a3d]/50">{label}</p>
    <p className="font-display text-base font-bold tabular-nums" style={{ color: cor }}>{brl0(value)}</p>
  </div>
);

export default Orcamento;
