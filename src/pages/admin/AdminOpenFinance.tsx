import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Landmark, RefreshCw, Plus, Loader2, TrendingUp, Wallet, Building2, ExternalLink, Search, AlertTriangle, ChevronDown,
} from "lucide-react";

const brl = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

const TIPO_LABEL: Record<string, string> = {
  FIXED_INCOME: "Renda Fixa", MUTUAL_FUND: "Fundos", EQUITY: "Ações", ETF: "ETFs",
  COE: "COE", SECURITY: "Títulos", OTHER: "Outros",
};

// Slug da Edge Function publicada no Supabase (o painel nomeou como "rapid-responder").
// Se um dia recriar a função com o nome "openfinance", basta trocar aqui.
const OPENFINANCE_FN = "rapid-responder";

// Chama a Edge Function que faz o proxy seguro para o Banco MCP
async function call(endpoint: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke(OPENFINANCE_FN, {
    body: { endpoint, body },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  });
  if (error) {
    // tenta extrair a mensagem real retornada pela função (em vez do erro genérico)
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

export default function AdminOpenFinance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [addUrl, setAddUrl] = useState<string | null>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  // conectar banco
  const [bankQuery, setBankQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

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
      setError(e.message || "Erro ao carregar. Confirme se a Edge Function 'openfinance' está publicada e a secret BANCO_MCP_KEY configurada.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const searchBank = async () => {
    const kw = bankQuery.split(/[\s,]+/).filter(Boolean);
    if (!kw.length) { toast.error("Digite o nome de um banco (ex.: nubank, btg)."); return; }
    setSearching(true);
    try {
      const r = await call("connectors/search", { keywords: kw });
      setSearchResults(asArray(r, "banks"));
    } catch (e: any) { toast.error(e.message); }
    finally { setSearching(false); }
  };

  const forceSync = async () => {
    if (!connections.length) return;
    setSyncing(true);
    try {
      await call("connections/sync", { items: connections.map((c) => c.item_id || c.connector_id || c.connector_name).filter(Boolean) });
      toast.success("Sincronização solicitada. Atualize em alguns segundos.");
    } catch (e: any) { toast.error(e.message); }
    finally { setSyncing(false); }
  };

  const investBalance = (i: any) => Number(i.balance ?? i.value ?? i.amount ?? 0) || 0;
  const totalInvest = investments.reduce((s, i) => s + investBalance(i), 0);
  const bankAccounts = accounts.filter((a) => (a.type || "").toUpperCase() !== "CREDIT");
  const totalSaldo = bankAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

  const porTipo = investments.reduce((m: Record<string, number>, i) => {
    const t = (i.type || "OTHER").toUpperCase();
    m[t] = (m[t] || 0) + investBalance(i);
    return m;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="h-6 w-6 text-novare-blue" /> Open Finance
            <span className="text-[10px] font-bold uppercase bg-novare-blue/10 text-novare-blue px-2 py-0.5 rounded-full">beta</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Consolidação de contas e investimentos via Banco MCP (Pluggy)</p>
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
            <div>
              <p className="font-semibold">Não foi possível carregar.</p>
              <p className="mt-1 text-xs leading-relaxed">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Patrimônio em investimentos", value: brl(totalInvest), icon: TrendingUp, color: "text-emerald-600" },
              { label: "Saldo em contas", value: brl(totalSaldo), icon: Wallet, color: "text-novare-blue" },
              { label: "Bancos conectados", value: String(connections.length), icon: Building2, color: "text-novare-terracotta" },
            ].map((s) => (
              <Card key={s.label} className="border-border/50"><CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{s.value}</p>
                  </div>
                  <div className={cn("h-9 w-9 rounded-xl bg-muted flex items-center justify-center", s.color)}><s.icon className="h-4.5 w-4.5" /></div>
                </div>
              </CardContent></Card>
            ))}
          </div>

          {connections.length === 0 ? (
            /* Conectar primeiro banco */
            <Card className="border-border/50">
              <CardContent className="p-6">
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
                        <span className="text-sm font-medium text-foreground">{b.name} <span className="text-[11px] text-muted-foreground">· {b.access === "open_finance" ? "Open Finance" : "API"} · {b.type}</span></span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-novare-blue"><Plus className="h-3.5 w-3.5" /> Conectar</span>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Conexões */}
              <Card className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-foreground">Bancos conectados</p>
                    {addUrl && (
                      <a href={addUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-novare-blue hover:underline">
                        <Plus className="h-3.5 w-3.5" /> Adicionar banco
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {connections.map((c) => (
                      <span key={c.item_id || c.connector_id} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.connector_name || c.connector_id}
                        <span className={cn("h-1.5 w-1.5 rounded-full", c.status === "UPDATED" ? "bg-emerald-500" : "bg-amber-400")} title={c.status} />
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Investimentos por tipo */}
              {Object.keys(porTipo).length > 0 && (
                <Card className="border-border/50">
                  <CardContent className="p-5">
                    <p className="text-sm font-bold text-foreground mb-3">Carteira consolidada</p>
                    <div className="space-y-2">
                      {(Object.entries(porTipo) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([t, v]) => {
                        const pct = totalInvest > 0 ? (v / totalInvest) * 100 : 0;
                        return (
                          <div key={t}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium text-foreground">{TIPO_LABEL[t] || t}</span>
                              <span className="tabular-nums text-muted-foreground">{brl(v)} · {pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-novare-blue" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de investimentos */}
              {investments.length > 0 && (
                <Card className="border-border/50 overflow-hidden">
                  <p className="text-sm font-bold text-foreground px-5 pt-5">Posições ({investments.length})</p>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead><tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                        <th className="text-left font-semibold px-5 py-2.5">Investimento</th>
                        <th className="text-left font-semibold px-3 py-2.5">Tipo</th>
                        <th className="text-right font-semibold px-5 py-2.5">Valor</th>
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

              {/* Contas */}
              {bankAccounts.length > 0 && (
                <Card className="border-border/50">
                  <CardContent className="p-5">
                    <p className="text-sm font-bold text-foreground mb-3">Contas</p>
                    <div className="space-y-2">
                      {bankAccounts.map((a, idx) => (
                        <div key={a.id || idx} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{a.bank || a.name || "Conta"} <span className="text-xs text-muted-foreground">· {a.subtype || a.type}</span></span>
                          <span className="tabular-nums font-medium">{brl(Number(a.balance) || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Debug bruto */}
              <button onClick={() => setShowRaw((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showRaw && "rotate-180")} /> Dados brutos (debug)
              </button>
              {showRaw && (
                <pre className="text-[11px] bg-muted/40 rounded-xl p-4 overflow-auto max-h-80 border border-border/40">
                  {JSON.stringify({ connections, investments, accounts }, null, 2)}
                </pre>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
