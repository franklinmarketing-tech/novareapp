import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Landmark, RefreshCw, Plus, Loader2, TrendingUp, Wallet, Building2, CreditCard, Search,
  AlertTriangle, ChevronDown, Repeat, Receipt, PieChart,
} from "lucide-react";

const brl = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const TIPO_LABEL: Record<string, string> = {
  FIXED_INCOME: "Renda Fixa", MUTUAL_FUND: "Fundos", EQUITY: "Ações", ETF: "ETFs",
  COE: "COE", SECURITY: "Títulos", OTHER: "Outros",
};

const OPENFINANCE_FN = "rapid-responder";

async function call(endpoint: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke(OPENFINANCE_FN, {
    body: { endpoint, body },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  });
  if (error) {
    let msg = error.message || "Falha na chamada";
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data?.result ?? data;
}

const asArray = (x: any, ...keys: string[]): any[] => {
  if (Array.isArray(x)) return x;
  for (const k of keys) if (Array.isArray(x?.[k])) return x[k];
  return [];
};

// valor atual de uma posição de investimento (Pluggy varia o campo)
const investBalance = (i: any) => Number(i.balance ?? i.netWorth ?? i.value ?? i.amount ?? 0) || 0;
// valor (negativo = saída) de uma transação
const txAmount = (t: any) => {
  const v = Number(t.amount ?? t.value ?? 0) || 0;
  const isDebit = (t.type || "").toUpperCase() === "DEBIT" || v < 0;
  return isDebit ? -Math.abs(v) : Math.abs(v);
};
const normMerchant = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\d+/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 28);

type Tab = "carteira" | "contas" | "gastos";

export default function AdminOpenFinance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("carteira");

  const [connections, setConnections] = useState<any[]>([]);
  const [addUrl, setAddUrl] = useState<string | null>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [bankQuery, setBankQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const bankAccounts = accounts.filter((a) => (a.type || "").toUpperCase() !== "CREDIT");
  const creditAccounts = accounts.filter((a) => (a.type || "").toUpperCase() === "CREDIT");

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const conn = await call("connections/list");
      const conns = asArray(conn, "connections");
      setConnections(conns);
      setAddUrl(conn?.add_connection_url ?? null);
      if (conns.length) {
        const [inv, acc] = await Promise.all([
          call("investments/list").catch(() => null),
          call("accounts/list").catch(() => null),
        ]);
        setInvestments(asArray(inv, "investments", "results"));
        setAccounts(asArray(acc, "accounts", "results"));
      } else {
        setInvestments([]); setAccounts([]);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAll(); }, []);

  // carrega faturas quando entra na aba Contas
  useEffect(() => {
    if (tab !== "contas" || !creditAccounts.length || bills.length || loadingBills) return;
    (async () => {
      setLoadingBills(true);
      try {
        const all: any[] = [];
        for (const a of creditAccounts.slice(0, 5)) {
          const r = await call("credit-card-bills/list", { account_id: a.id }).catch(() => null);
          asArray(r, "bills", "results").forEach((b) => all.push({ ...b, _account: a }));
        }
        setBills(all);
      } finally { setLoadingBills(false); }
    })();
  }, [tab, creditAccounts.length]); // eslint-disable-line

  // carrega transações (90 dias) quando entra na aba Gastos
  useEffect(() => {
    if (tab !== "gastos" || !bankAccounts.length || txs.length || loadingTx) return;
    (async () => {
      setLoadingTx(true);
      try {
        const to = new Date();
        const from = new Date(); from.setDate(from.getDate() - 90);
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        const all: any[] = [];
        for (const a of bankAccounts.slice(0, 5)) {
          const r = await call("transactions/list", { account_id: a.id, from: iso(from), to: iso(to), page_size: 500 }).catch(() => null);
          asArray(r, "transactions", "results").forEach((t) => all.push(t));
        }
        setTxs(all);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoadingTx(false); }
    })();
  }, [tab, bankAccounts.length]); // eslint-disable-line

  const searchBank = async () => {
    const kw = bankQuery.split(/[\s,]+/).filter(Boolean);
    if (!kw.length) { toast.error("Digite o nome de um banco (ex.: nubank, btg)."); return; }
    setSearching(true);
    try { setSearchResults(asArray(await call("connectors/search", { keywords: kw }), "banks")); }
    catch (e: any) { toast.error(e.message); }
    finally { setSearching(false); }
  };
  const forceSync = async () => {
    if (!connections.length) return;
    setSyncing(true);
    try {
      await call("connections/sync", { items: connections.map((c) => c.item_id || c.connector_id || c.connector_name).filter(Boolean) });
      toast.success("Sincronização solicitada. Atualize em alguns segundos.");
    } catch (e: any) { toast.error(e.message); } finally { setSyncing(false); }
  };

  // ── Derivados ──
  const totalInvest = investments.reduce((s, i) => s + investBalance(i), 0);
  const totalSaldo = bankAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const porTipo = investments.reduce((m: Record<string, number>, i) => {
    const t = (i.type || "OTHER").toUpperCase(); m[t] = (m[t] || 0) + investBalance(i); return m;
  }, {});
  const totalFatura = bills.reduce((s, b) => s + (Number(b.open_bill ?? b.total_pending_debt ?? b.amount ?? 0) || 0), 0);

  // análise de gastos
  const gastos = useMemo(() => {
    const saidas = txs.map((t) => ({ ...t, _v: txAmount(t) })).filter((t) => t._v < 0);
    const total = saidas.reduce((s, t) => s + Math.abs(t._v), 0);
    const maiores = [...saidas].sort((a, b) => a._v - b._v).slice(0, 8);
    const porCat = saidas.reduce((m: Record<string, number>, t) => {
      const c = t.category || t.categoryName || "Outros"; m[c] = (m[c] || 0) + Math.abs(t._v); return m;
    }, {});
    // assinaturas: mesmo "merchant" recorrente (≥2 vezes)
    const groups: Record<string, { desc: string; count: number; total: number; last?: string }> = {};
    for (const t of saidas) {
      const key = normMerchant(t.description || t.descriptionRaw || "");
      if (key.length < 3) continue;
      if (!groups[key]) groups[key] = { desc: t.description || key, count: 0, total: 0 };
      groups[key].count++; groups[key].total += Math.abs(t._v);
      if (!groups[key].last || (t.date && t.date > groups[key].last!)) groups[key].last = t.date;
    }
    const assinaturas = Object.values(groups).filter((g) => g.count >= 2).sort((a, b) => b.count - a.count).slice(0, 10);
    return { total, maiores, porCat, assinaturas, count: saidas.length };
  }, [txs]);

  const TabBtn = ({ id, icon: Icon, label }: { id: Tab; icon: any; label: string }) => (
    <button onClick={() => setTab(id)} className={cn(
      "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
      tab === id ? "border-novare-blue text-novare-blue" : "border-transparent text-muted-foreground hover:text-foreground",
    )}><Icon className="h-4 w-4" /> {label}</button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="h-6 w-6 text-novare-blue" /> Open Finance
            <span className="text-[10px] font-bold uppercase bg-novare-blue/10 text-novare-blue px-2 py-0.5 rounded-full">beta</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Consolidação de contas, cartões, investimentos e gastos via Banco MCP (Pluggy)</p>
        </div>
        <div className="flex gap-2">
          {connections.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={forceSync} disabled={syncing}>
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} /> Sincronizar
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={loadAll}>
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" /> <span className="text-sm">Conectando ao Open Finance...</span>
        </div>
      ) : error ? (
        <Card className="border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="p-5 flex gap-3 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div><p className="font-semibold">Não foi possível carregar.</p><p className="mt-1 text-xs leading-relaxed">{error}</p></div>
          </CardContent>
        </Card>
      ) : connections.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-6">
          <p className="font-semibold text-foreground">Conecte seu primeiro banco</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Busque a instituição e abra o link para autorizar pelo Open Finance.</p>
          <div className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="nubank, btg, itau..." value={bankQuery}
                onChange={(e) => setBankQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchBank()} />
            </div>
            <Button onClick={searchBank} disabled={searching} className="gap-1.5">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
            </Button>
          </div>
          {searchResults && (
            <div className="mt-4 space-y-2">
              {searchResults.length === 0 && <p className="text-sm text-muted-foreground">Nenhum banco encontrado.</p>}
              {searchResults.map((b) => (
                <a key={b.id} href={b.connect_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-2.5 hover:border-novare-blue/40 hover:bg-muted/30 transition-colors">
                  <span className="text-sm font-medium text-foreground">{b.name} <span className="text-[11px] text-muted-foreground">· {b.access === "open_finance" ? "Open Finance" : "API"}</span></span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-novare-blue"><Plus className="h-3.5 w-3.5" /> Conectar</span>
                </a>
              ))}
            </div>
          )}
        </CardContent></Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Investimentos", value: brl0(totalInvest), icon: TrendingUp, color: "text-emerald-600" },
              { label: "Saldo em contas", value: brl0(totalSaldo), icon: Wallet, color: "text-novare-blue" },
              { label: "Fatura de cartão", value: brl0(totalFatura), icon: CreditCard, color: "text-rose-600" },
              { label: "Bancos", value: String(connections.length), icon: Building2, color: "text-novare-terracotta" },
            ].map((s) => (
              <Card key={s.label} className="border-border/50"><CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{s.value}</p></div>
                  <div className={cn("h-8 w-8 rounded-lg bg-muted flex items-center justify-center", s.color)}><s.icon className="h-4 w-4" /></div>
                </div>
              </CardContent></Card>
            ))}
          </div>

          {/* Conexões */}
          <div className="flex items-center gap-2 flex-wrap">
            {connections.map((c) => (
              <span key={c.item_id || c.connector_id} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />{c.connector_name || c.connector_id}
                <span className={cn("h-1.5 w-1.5 rounded-full", c.status === "UPDATED" ? "bg-emerald-500" : "bg-amber-400")} title={c.status} />
              </span>
            ))}
            {addUrl && <a href={addUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-novare-blue hover:underline ml-1"><Plus className="h-3.5 w-3.5" /> Adicionar banco</a>}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border/60">
            <TabBtn id="carteira" icon={PieChart} label="Carteira" />
            <TabBtn id="contas" icon={CreditCard} label="Contas & Cartões" />
            <TabBtn id="gastos" icon={Receipt} label="Gastos & Assinaturas" />
          </div>

          {/* ── CARTEIRA ── */}
          {tab === "carteira" && (
            <div className="space-y-4">
              {Object.keys(porTipo).length > 0 ? (
                <Card className="border-border/50"><CardContent className="p-5">
                  <p className="text-sm font-bold text-foreground mb-3">Carteira consolidada</p>
                  <div className="space-y-2">
                    {Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([t, v]) => {
                      const pct = totalInvest > 0 ? (v / totalInvest) * 100 : 0;
                      return (
                        <div key={t}>
                          <div className="flex items-center justify-between text-sm mb-1"><span className="font-medium text-foreground">{TIPO_LABEL[t] || t}</span><span className="tabular-nums text-muted-foreground">{brl0(v)} · {pct.toFixed(0)}%</span></div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-novare-blue" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent></Card>
              ) : <p className="text-sm text-muted-foreground">Nenhum investimento encontrado nesta conexão.</p>}

              {investments.length > 0 && (
                <Card className="border-border/50 overflow-hidden">
                  <p className="text-sm font-bold text-foreground px-5 pt-5">Posições ({investments.length})</p>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead><tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                        <th className="text-left font-semibold px-5 py-2.5">Investimento</th><th className="text-left font-semibold px-3 py-2.5">Tipo</th><th className="text-right font-semibold px-5 py-2.5">Valor</th>
                      </tr></thead>
                      <tbody>
                        {investments.map((i, idx) => (
                          <tr key={i.id || idx} className="border-b border-border/30 last:border-0">
                            <td className="px-5 py-3 text-foreground">{i.name || i.description || "—"}</td>
                            <td className="px-3 py-3 text-muted-foreground text-xs">{TIPO_LABEL[(i.type || "").toUpperCase()] || i.type || "—"}</td>
                            <td className="px-5 py-3 text-right tabular-nums font-medium">{brl(investBalance(i))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── CONTAS & CARTÕES ── */}
          {tab === "contas" && (
            <div className="space-y-4">
              {bankAccounts.length > 0 && (
                <Card className="border-border/50"><CardContent className="p-5">
                  <p className="text-sm font-bold text-foreground mb-3">Contas</p>
                  <div className="space-y-2">
                    {bankAccounts.map((a, idx) => (
                      <div key={a.id || idx} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{a.bank || a.name || "Conta"} <span className="text-xs text-muted-foreground">· {a.subtype || a.type}</span></span>
                        <span className="tabular-nums font-medium">{brl(Number(a.balance) || 0)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}
              <Card className="border-border/50"><CardContent className="p-5">
                <p className="text-sm font-bold text-foreground mb-3">Cartões de crédito</p>
                {loadingBills ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando faturas...</div>
                ) : creditAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum cartão de crédito nesta conexão.</p>
                ) : (
                  <div className="space-y-3">
                    {creditAccounts.map((a, idx) => {
                      const b = bills.find((x) => x._account?.id === a.id);
                      return (
                        <div key={a.id || idx} className="flex items-center justify-between text-sm rounded-xl bg-muted/30 px-3 py-2.5">
                          <span className="text-foreground">{a.bank || a.name || "Cartão"}</span>
                          <span className="text-right">
                            <span className="tabular-nums font-bold text-rose-600">{brl(Number(b?.open_bill ?? b?.total_pending_debt ?? a.balance ?? 0) || 0)}</span>
                            {b?.due_date && <span className="block text-[11px] text-muted-foreground">vence {fmtDate(b.due_date)}</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent></Card>
            </div>
          )}

          {/* ── GASTOS & ASSINATURAS ── */}
          {tab === "gastos" && (
            <div className="space-y-4">
              {loadingTx ? (
                <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> <span className="text-sm">Lendo seus gastos dos últimos 90 dias...</span></div>
              ) : txs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma transação encontrada nos últimos 90 dias.</p>
              ) : (
                <>
                  {/* Assinaturas — destaque */}
                  {gastos.assinaturas.length > 0 && (
                    <Card className="border-novare-terracotta/30 bg-novare-terracotta/5">
                      <CardContent className="p-5">
                        <p className="text-sm font-bold text-foreground flex items-center gap-2"><Repeat className="h-4 w-4 text-novare-terracotta" /> Gastos recorrentes / assinaturas detectadas</p>
                        <p className="text-[11px] text-muted-foreground mb-3">Cobranças que se repetem — vale checar se ainda usa todas.</p>
                        <div className="space-y-1.5">
                          {gastos.assinaturas.map((g, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-foreground capitalize truncate">{g.desc.toLowerCase()} <span className="text-[11px] text-muted-foreground">· {g.count}x</span></span>
                              <span className="tabular-nums font-medium text-rose-600">{brl(g.total)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid lg:grid-cols-2 gap-4">
                    {/* Maiores gastos */}
                    <Card className="border-border/50"><CardContent className="p-5">
                      <p className="text-sm font-bold text-foreground mb-3">Maiores gastos (90 dias)</p>
                      <div className="space-y-1.5">
                        {gastos.maiores.map((t, idx) => (
                          <div key={t.id || idx} className="flex items-center justify-between text-sm gap-3">
                            <span className="text-foreground truncate flex-1">{t.description || "—"}</span>
                            <span className="text-[11px] text-muted-foreground shrink-0">{fmtDate(t.date)}</span>
                            <span className="tabular-nums font-medium text-rose-600 shrink-0">{brl(Math.abs(t._v))}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent></Card>

                    {/* Por categoria */}
                    <Card className="border-border/50"><CardContent className="p-5">
                      <p className="text-sm font-bold text-foreground mb-3">Por categoria · total {brl0(gastos.total)}</p>
                      <div className="space-y-2">
                        {Object.entries(gastos.porCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, v]) => {
                          const pct = gastos.total > 0 ? (v / gastos.total) * 100 : 0;
                          return (
                            <div key={c}>
                              <div className="flex items-center justify-between text-sm mb-1"><span className="text-foreground">{c}</span><span className="tabular-nums text-muted-foreground">{brl0(v)}</span></div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-novare-blue" style={{ width: `${pct}%` }} /></div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent></Card>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Debug */}
          <button onClick={() => setShowRaw((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showRaw && "rotate-180")} /> Dados brutos (debug)
          </button>
          {showRaw && (
            <pre className="text-[11px] bg-muted/40 rounded-xl p-4 overflow-auto max-h-96 border border-border/40">
              {JSON.stringify({ connections, accounts, investments, bills, txSample: txs.slice(0, 3) }, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
