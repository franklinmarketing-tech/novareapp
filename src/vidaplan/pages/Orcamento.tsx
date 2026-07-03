// Orçamento do mês: orçado (custo planejado por categoria) × realizado (gasto real).
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { fetchTransactions } from "../lib/openfinance";
import { classificar, canonDaCategoria, norm } from "../lib/categorizar";
import { VPCard, VPTitle, VPProgress, VPMoney } from "../components/ui";
import { Wallet, CheckCircle2, AlertTriangle, RefreshCw, Loader2, Sparkles } from "lucide-react";

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

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const puxar = async () => {
    setLoading(true); setMsg(null);
    try {
      const [y, mm] = mes.split("-").map(Number);
      const ultimo = new Date(y, mm, 0).getDate();
      const h = new Date();
      const ehAtual = y === h.getFullYear() && mm === h.getMonth() + 1;
      const from = `${mes}-01`;
      const to = `${mes}-${z2(ehAtual ? h.getDate() : ultimo)}`;
      const txs = await fetchTransactions(from, to);
      const gastos = txs.filter((t) => t.amount < 0 && (!t.date || String(t.date).slice(0, 7) === mes));
      if (gastos.length === 0) { setMsg("Nenhuma transação encontrada neste mês. Conecte um banco em Conectar Banco."); return; }

      const somaCanon: Record<string, number> = {};
      for (const t of gastos) { const c = classificar(t.desc); somaCanon[c] = (somaCanon[c] || 0) + Math.abs(t.amount); }

      const novo: Record<string, number> = { ...realizadoMes };
      const usados = new Set<string>();
      let classificado = 0;
      for (const c of cats) {
        const canon = canonDaCategoria(c.nome);
        if (canon && somaCanon[canon] != null) { novo[c.nome] = Math.round(somaCanon[canon]); usados.add(canon); classificado += somaCanon[canon]; }
      }
      const sobra = Object.entries(somaCanon).filter(([k]) => !usados.has(k)).reduce((s, [, v]) => s + v, 0);
      const catOutros = cats.find((c) => /outro/i.test(norm(c.nome)));
      if (catOutros && sobra > 0) { novo[catOutros.nome] = Math.round((Number(novo[catOutros.nome]) || 0) + sobra); classificado += sobra; }

      setField("orcamento", { ...(input.orcamento ?? {}), [mes]: novo });
      setMsg(`${gastos.length} transações lidas · ${brl0(Math.round(classificado))} classificados. Ajuste o que precisar.`);
    } catch {
      setMsg("Não foi possível puxar agora. Conecte um banco em Conectar Banco e tente de novo.");
    } finally { setLoading(false); }
  };

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
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-display text-base font-bold text-[#16314f]">Por categoria</p>
              <button onClick={puxar} disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2F8F6B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#27795a] disabled:opacity-60 transition-colors">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Puxar do Open Finance
              </button>
            </div>
            <p className="text-xs text-[#1b2a3d]/50 mb-3 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-[#C8643F]" /> Lemos seus gastos do mês e classificamos por categoria automaticamente.</p>
            {msg && <p className="text-xs text-[#16314f] bg-[#2F8F6B]/[0.08] rounded-lg px-3 py-2 mb-3">{msg}</p>}
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
                          <VPMoney value={real} onChange={(v) => setRealizado(c.nome, v)}
                            className="w-24 bg-transparent py-1 pl-1 text-sm text-right text-[#16314f] outline-none tabular-nums" />
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
            <p className="text-xs text-[#1b2a3d]/45 mt-4">A classificação é automática e pode errar — confira e ajuste os valores à vontade.</p>
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
