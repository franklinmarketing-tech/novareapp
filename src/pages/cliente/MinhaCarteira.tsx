import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Landmark, RefreshCw, Plus, Loader2, TrendingUp, Wallet, Building2, Search, ShieldCheck, CheckCircle2,
} from "lucide-react";

const brl = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const TIPO_LABEL: Record<string, string> = { FIXED_INCOME: "Renda Fixa", MUTUAL_FUND: "Fundos", EQUITY: "Ações", ETF: "ETFs", COE: "COE", SECURITY: "Títulos", OTHER: "Outros" };

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
const investBalance = (i: any) => Number(i.balance ?? i.netWorth ?? i.value ?? i.amount ?? 0) || 0;

const MinhaCarteira = () => {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [bankQuery, setBankQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const conn = await call("connections/list").catch(() => null);
      const conns = asArray(conn, "connections");
      setConnections(conns);
      if (conns.length) {
        const [inv, acc] = await Promise.all([
          call("investments/list").catch(() => null),
          call("accounts/list").catch(() => null),
        ]);
        setInvestments(asArray(inv, "investments", "results"));
        setAccounts(asArray(acc, "accounts", "results"));
      } else { setInvestments([]); setAccounts([]); }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const searchBank = async () => {
    const kw = bankQuery.split(/[\s,]+/).filter(Boolean);
    if (!kw.length) { toast.error("Digite o nome do seu banco (ex.: nubank, itau)."); return; }
    setSearching(true);
    try { setSearchResults(asArray(await call("connectors/search", { keywords: kw }), "banks")); }
    catch (e: any) { toast.error(e.message); }
    finally { setSearching(false); }
  };
  const claim = async () => {
    setClaiming(true);
    try {
      const r = await call("claim");
      if (r?.claimed) { toast.success("Banco conectado com sucesso!"); await load(); }
      else toast.message(r?.message || "Nenhuma conexão nova encontrada.");
    } catch (e: any) { toast.error(e.message); }
    finally { setClaiming(false); }
  };

  const totalInvest = investments.reduce((s, i) => s + investBalance(i), 0);
  const bankAccounts = accounts.filter((a) => (a.type || "").toUpperCase() !== "CREDIT");
  const totalSaldo = bankAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const porTipo = useMemo(() => investments.reduce((m: Record<string, number>, i) => {
    const t = (i.type || "OTHER").toUpperCase(); m[t] = (m[t] || 0) + investBalance(i); return m;
  }, {}), [investments]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Landmark className="h-6 w-6 text-novare-blue" /> Minha Carteira
          <span className="text-[10px] font-bold uppercase bg-novare-blue/10 text-novare-blue px-2 py-0.5 rounded-full">beta</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Conecte seus bancos pelo Open Finance e veja tudo consolidado.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" /> <span className="text-sm">Carregando...</span>
        </div>
      ) : connections.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-6">
          <p className="font-semibold text-foreground">Conecte seu primeiro banco</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Busque seu banco, abra o link e autorize pelo Open Finance. É seguro e você controla o acesso.</p>
          <div className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="nubank, itau, bradesco..." value={bankQuery}
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
                  <span className="text-sm font-medium text-foreground">{b.name}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-novare-blue"><Plus className="h-3.5 w-3.5" /> Conectar</span>
                </a>
              ))}
              <div className="pt-2 border-t border-border/40 mt-3">
                <p className="text-xs text-muted-foreground mb-2">Já autorizou no banco? Confirme aqui para puxar seus dados:</p>
                <Button onClick={claim} disabled={claiming} variant="outline" className="gap-1.5">
                  {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Concluí a conexão
                </Button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/70 mt-5 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Acesso somente leitura, via Open Finance regulado pelo Banco Central. Você pode revogar quando quiser.
          </p>
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Investimentos", value: brl0(totalInvest), icon: TrendingUp, color: "text-emerald-600" },
              { label: "Saldo em contas", value: brl0(totalSaldo), icon: Wallet, color: "text-novare-blue" },
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

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {connections.map((c) => (
                <span key={c.item_id} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />{c.connector_name || "Banco"}
                  <span className={cn("h-1.5 w-1.5 rounded-full", c.status === "UPDATED" ? "bg-emerald-500" : "bg-amber-400")} />
                </span>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={load}><RefreshCw className="h-3.5 w-3.5" /> Atualizar</Button>
          </div>

          {Object.keys(porTipo).length > 0 && (
            <Card className="border-border/50"><CardContent className="p-5">
              <p className="text-sm font-bold text-foreground mb-3">Sua carteira consolidada</p>
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
          )}

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

          <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Dados via Open Finance regulado pelo Banco Central · acesso somente leitura.
          </p>
        </>
      )}
    </div>
  );
};

export default MinhaCarteira;
