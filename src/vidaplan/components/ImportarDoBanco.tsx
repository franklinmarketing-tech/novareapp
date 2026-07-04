// Preenche "Minha Realidade" automaticamente com os dados reais do Open Finance.
// Puxa patrimônio, renda, gastos por categoria e dívidas → alimenta o plano de vida.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { fetchOFSnapshot, type OFSnapshot } from "../lib/ofSnapshot";
import { Landmark, Loader2, Sparkles, Check, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

const ImportarDoBanco = () => {
  const { setField, setCategorias } = useVidaPlan();
  const [loading, setLoading] = useState(false);
  const [snap, setSnap] = useState<OFSnapshot | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [semBanco, setSemBanco] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  const puxar = async () => {
    setLoading(true); setMsg(null); setAplicado(false); setSemBanco(false);
    try {
      const s = await fetchOFSnapshot();
      if (!s.conectado) { setSemBanco(true); setSnap(null); }
      else setSnap(s);
    } catch (e: any) { setMsg(e?.message || "Não consegui ler seu banco agora."); }
    finally { setLoading(false); }
  };

  const aplicar = () => {
    if (!snap) return;
    if (snap.investimentos > 0) setField("patrimonioAtual", Math.round(snap.investimentos));
    if (snap.saldoLiquido > 0) setField("reservaAtual", Math.round(snap.saldoLiquido));
    if (snap.rendaMensal > 0) setField("rendaMensal", Math.round(snap.rendaMensal));
    if (snap.categorias.length) setCategorias(snap.categorias);
    if (snap.dividas.length) setField("dividas", snap.dividas as any);
    setAplicado(true); setMsg("Pronto! Seu plano foi atualizado com os dados do banco. Role a página pra conferir. 🎉");
  };

  return (
    <div className="rounded-2xl bg-[#16314f] p-5 text-white">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center"><Sparkles className="h-5 w-5 text-[#E29578]" /></div>
          <div>
            <p className="font-display text-lg font-bold">Preencher com meu banco</p>
            <p className="text-sm text-white/60">Puxe patrimônio, renda e gastos reais pelo Open Finance — sem digitar.</p>
          </div>
        </div>
        <button onClick={puxar} disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#C8643F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b0562f] disabled:opacity-60 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />} {snap ? "Ler de novo" : "Ler meu banco"}
        </button>
      </div>

      {semBanco && (
        <div className="mt-4 rounded-xl bg-white/[0.06] p-3 text-sm text-white/80">
          Nenhum banco conectado ainda. <Link to="/vidaplan/app/carteira" className="font-semibold text-[#E29578] underline">Conectar banco</Link> e volte aqui.
        </div>
      )}

      {snap && (
        <div className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={TrendingUp} label="Patrimônio investido" value={brl0(snap.investimentos)} />
            <Stat icon={Wallet} label="Saldo líquido (reserva)" value={brl0(snap.saldoLiquido)} />
            <Stat icon={ArrowUpRight} label="Renda mensal (média)" value={brl0(snap.rendaMensal)} />
            <Stat icon={ArrowDownRight} label="Gasto mensal (média)" value={brl0(snap.gastoMensal)} />
          </div>

          {snap.categorias.length > 0 && (
            <p className="mt-3 text-xs text-white/55">
              {snap.categorias.length} categorias de gasto detectadas ({snap.transacoes} transações em 90 dias)
              {snap.dividas.length > 0 ? ` · ${snap.dividas.length} dívida(s)` : ""}.
            </p>
          )}
          {snap.transacoes === 0 && (
            <p className="mt-3 text-xs text-white/55">Sem extrato nos últimos 90 dias — só saldo e investimentos foram lidos.</p>
          )}

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button onClick={aplicar}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2F8F6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#27795a] transition-colors">
              <Check className="h-4 w-4" /> Aplicar ao meu plano
            </button>
            <span className="text-xs text-white/50">Substitui os valores que você digitou pelos do banco (você pode editar depois).</span>
          </div>
        </div>
      )}

      {msg && <p className={`mt-3 text-sm rounded-lg px-3 py-2 ${aplicado ? "bg-[#2F8F6B]/20 text-white" : "bg-white/[0.06] text-white/80"}`}>{msg}</p>}
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-xl bg-white/[0.06] p-3">
    <div className="flex items-center gap-1.5 text-white/50"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wider">{label}</span></div>
    <p className="font-display text-base font-bold mt-0.5 tabular-nums">{value}</p>
  </div>
);

export default ImportarDoBanco;
