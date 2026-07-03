// Open Finance nativo do Vida Plan: conectar banco, consolidar investimentos e saldos.
// Usa a mesma edge function (rapid-responder) do app, com a identidade do Vida Plan.
import { useEffect, useMemo, useState } from "react";
import { call } from "../lib/openfinance";
import { brl0 } from "../state/VidaPlanContext";
import { VPCard } from "./ui";
import { Landmark, RefreshCw, Loader2, TrendingUp, Wallet, Building2, Search, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";

const TIPO_LABEL: Record<string, string> = { FIXED_INCOME: "Renda Fixa", MUTUAL_FUND: "Fundos", EQUITY: "Ações", ETF: "ETFs", COE: "COE", SECURITY: "Títulos", OTHER: "Outros" };
const CORES = ["#16314f", "#C8643F", "#2F8F6B", "#E2A03F", "#5B8DB8", "#8E6BC8", "#3FA0A0"];
const asArray = (x: any, ...keys: string[]): any[] => {
  if (Array.isArray(x)) return x;
  for (const k of keys) if (Array.isArray(x?.[k])) return x[k];
  return [];
};
const num = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "object") return num(v.current ?? v.available ?? v.amount ?? v.value ?? v.balance ?? 0);
  return Number(v) || 0;
};
const investBalance = (i: any) => num(i.balance ?? i.netWorth ?? i.value ?? i.amount ?? i.grossValue ?? i.marketValue ?? 0);
const accBalance = (a: any) => num(a.balance ?? a.currentBalance ?? a.available ?? a.availableBalance ?? a.amount ?? 0);

const CarteiraOpenFinance = () => {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [bankQuery, setBankQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Quando o Banco MCP responde "not_connected", ele devolve a URL pra reconectar.
  const [reconectarUrl, setReconectarUrl] = useState<string | null>(null);

  const captureNotConnected = (e: any): boolean => {
    if (e?.code === "not_connected" && e?.connectUrl) { setReconectarUrl(e.connectUrl); return true; }
    return false;
  };

  const load = async () => {
    setLoading(true); setErro(null); setReconectarUrl(null);
    try {
      const conns = asArray(await call("connections/list").catch((e) => { captureNotConnected(e); return null; }), "connections");
      setConnections(conns);
      if (conns.length) {
        const [inv, acc] = await Promise.all([
          call("investments/list").catch(() => null),
          call("accounts/list").catch(() => null),
        ]);
        setInvestments(asArray(inv, "investments", "results"));
        setAccounts(asArray(acc, "accounts", "results"));
      } else { setInvestments([]); setAccounts([]); }
    } catch (e: any) { setErro(e?.message || "Não foi possível conectar ao Open Finance agora."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const searchBank = async () => {
    const kw = bankQuery.split(/[\s,]+/).filter(Boolean);
    if (!kw.length) { setMsg("Digite o nome do seu banco (ex.: nubank, itau)."); return; }
    setSearching(true); setMsg(null);
    try { setSearchResults(asArray(await call("connectors/search", { keywords: kw }), "banks")); }
    catch (e: any) { if (!captureNotConnected(e)) setMsg(e?.message || "Falha na busca."); }
    finally { setSearching(false); }
  };
  const claim = async (silent = false) => {
    if (!silent) { setClaiming(true); setMsg(null); }
    try {
      const r = await call("claim");
      if (r?.claimed) { setConectando(false); setMsg("Banco conectado! 🎉"); await load(); }
      else if (!silent) setMsg(r?.message || "Ainda não detectei o banco. Termine a autorização no app do banco e tente de novo.");
    } catch (e: any) { if (!silent && !captureNotConnected(e)) setMsg(e?.message || "Falha ao concluir."); }
    finally { if (!silent) setClaiming(false); }
  };

  // Depois de "Autorizar", detecta a conexão sozinho quando o usuário volta pra aba.
  useEffect(() => {
    if (!conectando) return;
    const tryClaim = () => { if (document.visibilityState === "visible") claim(true); };
    window.addEventListener("focus", tryClaim);
    document.addEventListener("visibilitychange", tryClaim);
    return () => { window.removeEventListener("focus", tryClaim); document.removeEventListener("visibilitychange", tryClaim); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conectando]);

  const totalInvest = investments.reduce((s, i) => s + investBalance(i), 0);
  const bankAccounts = accounts.filter((a) => (a.type || "").toUpperCase() !== "CREDIT");
  const totalSaldo = bankAccounts.reduce((s, a) => s + accBalance(a), 0);
  const porTipo = useMemo(() => investments.reduce((m: Record<string, number>, i) => {
    const t = (i.type || "OTHER").toUpperCase(); m[t] = (m[t] || 0) + investBalance(i); return m;
  }, {}), [investments]);

  if (loading) {
    return <VPCard className="p-8 flex items-center justify-center gap-3 text-[#1b2a3d]/50 text-sm"><Loader2 className="h-5 w-5 animate-spin" /> Carregando sua carteira…</VPCard>;
  }

  // Sem conexão → fluxo de conectar
  if (connections.length === 0) {
    return (
      <VPCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Landmark className="h-5 w-5 text-[#16314f]" />
          <p className="font-display text-lg font-bold text-[#16314f]">Conecte seu primeiro banco</p>
        </div>
        <p className="text-sm text-[#1b2a3d]/60 mb-4">Busque seu banco, autorize pelo Open Finance e volte para puxar seus dados. Leva 1 minuto.</p>

        {/* Banco MCP desconectado no painel → precisa reconectar a integração antes de tudo */}
        {reconectarUrl && (
          <div className="rounded-xl bg-[#E2A03F]/[0.10] border border-[#E2A03F]/40 p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-[#B4741A]" />
              <p className="text-sm font-bold text-[#16314f]">Conexão do Open Finance inativa</p>
            </div>
            <p className="text-xs text-[#1b2a3d]/70 mb-3">A integração bancária precisa ser (re)ativada. Clique abaixo, conclua a conexão na página que abrir e volte aqui para puxar seus dados.</p>
            <a href={reconectarUrl} target="_blank" rel="noopener noreferrer" onClick={() => setConectando(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#16314f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d3e63] transition-colors">
              <ExternalLink className="h-4 w-4" /> Conectar / reativar Open Finance
            </a>
          </div>
        )}

        {/* Atalho: já conectou no Banco MCP → puxar dados (sempre visível) */}
        <div className="rounded-xl bg-[#2F8F6B]/[0.06] border border-[#2F8F6B]/20 p-3 mb-4">
          <p className="text-sm font-semibold text-[#16314f] mb-1">Já conectou seu banco?</p>
          <p className="text-xs text-[#1b2a3d]/60 mb-2">Se você já autorizou no app do banco, clique para puxar seus dados. (Pode levar alguns segundos pra sincronizar — se não vier, espere ~30s e clique de novo.)</p>
          <button onClick={() => claim()} disabled={claiming}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2F8F6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#27795a] disabled:opacity-60 transition-colors">
            {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Já conectei — puxar meus dados
          </button>
        </div>

        {erro && <p className="text-xs text-[#C8643F] bg-[#C8643F]/[0.07] rounded-lg px-3 py-2 mb-3 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {erro}</p>}
        <p className="text-xs font-semibold text-[#1b2a3d]/50 mb-2">Ou conecte um novo banco:</p>

        {/* Passo 1 — buscar */}
        <div className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1b2a3d]/40" />
            <input className="w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 py-2.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F]"
              placeholder="nubank, itaú, bradesco…" value={bankQuery}
              onChange={(e) => setBankQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchBank()} />
          </div>
          <button onClick={searchBank} disabled={searching}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#16314f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d3e63] disabled:opacity-60 transition-colors">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
          </button>
        </div>

        {/* Passo 2 — escolher banco + confirmar */}
        {searchResults && (() => {
          const banks = searchResults.filter((b, i, a) => a.findIndex((x) => (x.connect_url || x.id) === (b.connect_url || b.id)) === i);
          return (
            <div className="mt-4 space-y-2">
              {banks.length === 0 && <p className="text-sm text-[#1b2a3d]/50">Nenhum banco encontrado. Tente outro nome.</p>}
              {banks.map((b) => (
                <a key={b.connect_url || b.id} href={b.connect_url} target="_blank" rel="noopener noreferrer" onClick={() => setConectando(true)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.08] px-4 py-2.5 hover:border-[#C8643F]/40 hover:bg-black/[0.02] transition-colors">
                  <span className="text-sm font-medium text-[#16314f]">{b.name}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8643F]"><ExternalLink className="h-3.5 w-3.5" /> Autorizar</span>
                </a>
              ))}
              {banks.length > 0 && (
                <div className="pt-3 border-t border-black/[0.06] mt-3">
                  {conectando ? (
                    <p className="text-xs text-[#1b2a3d]/60 mb-2">
                      <strong className="text-[#16314f]">Autorize no app do banco</strong> (abriu numa nova aba): escolha o banco → aceite os termos → <strong>Conectar banco</strong> → faça o login no seu banco. Quando voltar aqui, <strong className="text-[#2F8F6B]">detectamos sozinho</strong>. Se demorar, clique abaixo.
                    </p>
                  ) : (
                    <p className="text-xs text-[#1b2a3d]/55 mb-2">Já autorizou no app do banco? Clique para puxar seus dados:</p>
                  )}
                  <button onClick={() => claim()} disabled={claiming}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2F8F6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#27795a] disabled:opacity-60 transition-colors">
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Concluí a conexão
                  </button>
                </div>
              )}
            </div>
          );
        })()}
        {msg && <p className="text-xs text-[#16314f] bg-[#16314f]/[0.05] rounded-lg px-3 py-2 mt-3">{msg}</p>}
      </VPCard>
    );
  }

  // Conectado → visão consolidada
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Kpi label="Investimentos" value={brl0(totalInvest)} icon={TrendingUp} cor="#2F8F6B" />
        <Kpi label="Saldo em contas" value={brl0(totalSaldo)} icon={Wallet} cor="#16314f" />
        <Kpi label="Bancos" value={String(connections.length)} icon={Building2} cor="#C8643F" />
      </div>

      <VPCard className="p-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {connections.map((c) => (
            <span key={c.item_id} className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] px-3 py-1.5 text-sm text-[#16314f]">
              <Building2 className="h-3.5 w-3.5 text-[#1b2a3d]/50" />{c.connector_name || "Banco"}
              <span className={`h-1.5 w-1.5 rounded-full ${c.status === "UPDATED" ? "bg-[#2F8F6B]" : "bg-[#E2A03F]"}`} />
            </span>
          ))}
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#16314f] hover:bg-black/[0.03]"><RefreshCw className="h-3.5 w-3.5" /> Atualizar</button>
      </VPCard>

      {Object.keys(porTipo).length > 0 && (
        <VPCard className="p-5">
          <p className="font-display text-base font-bold text-[#16314f] mb-3">Sua carteira consolidada</p>
          <div className="space-y-2.5">
            {(Object.entries(porTipo) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([t, v], i) => {
              const pct = totalInvest > 0 ? (v / totalInvest) * 100 : 0;
              return (
                <div key={t}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-[#16314f]">{TIPO_LABEL[t] || t}</span>
                    <span className="tabular-nums text-[#1b2a3d]/55">{brl0(v)} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CORES[i % CORES.length] }} /></div>
                </div>
              );
            })}
          </div>
        </VPCard>
      )}
    </div>
  );
};

const Kpi = ({ label, value, icon: Icon, cor }: { label: string; value: string; icon: any; cor: string }) => (
  <VPCard className="p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">{label}</p>
        <p className="font-display text-lg font-bold text-[#16314f] mt-1 tabular-nums">{value}</p>
      </div>
      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cor}14`, color: cor }}><Icon className="h-4 w-4" /></div>
    </div>
  </VPCard>
);

export default CarteiraOpenFinance;
