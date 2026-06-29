// Gastos invisíveis: detecta assinaturas, juros/IOF/multa e taxas nas transações (Open Finance).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VPCard } from "./ui";
import { brl0 } from "../state/VidaPlanContext";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { EyeOff, Loader2 } from "lucide-react";

const OPENFINANCE_FN = "rapid-responder";
async function call(endpoint: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke(OPENFINANCE_FN, {
    body: { endpoint, body },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.result ?? data;
}
const asArray = (x: any, ...keys: string[]): any[] => {
  if (Array.isArray(x)) return x;
  for (const k of keys) if (Array.isArray(x?.[k])) return x[k];
  return [];
};

const RX_JUROS = /juros|iof|multa|encargo|mora|rotativo/i;
const RX_TAXA = /tarifa|taxa|anuidade|manuten|cesta|pacote de servi/i;
const RX_ASSIN = /netflix|spotify|prime|disney|hbo|\bmax\b|youtube|globoplay|deezer|apple\.com|google|microsoft|adobe|canva|assinatura|mensalidade|streaming/i;
const norm = (s: string) => (s || "").toLowerCase().replace(/[0-9*#.\-/]/g, " ").replace(/\s+/g, " ").trim();
const desc = (t: any) => String(t.description ?? t.merchant ?? t.name ?? t.descricao ?? "");
const amount = (t: any) => Number(t.amount ?? t.value ?? t.valor ?? 0);

const GastosInvisiveis = () => {
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<any[]>([]);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 90);
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        const r = await call("transactions/list", { from: iso(from), to: iso(to), startDate: iso(from), endDate: iso(to) });
        setTxs(asArray(r, "transactions", "results"));
      } catch { setErro(true); }
      finally { setLoading(false); }
    })();
  }, []);

  const { cats, total } = useMemo(() => {
    const gastos = txs.filter((t) => amount(t) < 0);
    const freq: Record<string, number> = {};
    gastos.forEach((t) => { const k = norm(desc(t)); if (k) freq[k] = (freq[k] || 0) + 1; });
    let assin = 0, juros = 0, taxa = 0;
    for (const t of gastos) {
      const d = desc(t); const v = Math.abs(amount(t));
      if (RX_JUROS.test(d)) juros += v;
      else if (RX_TAXA.test(d)) taxa += v;
      else if (RX_ASSIN.test(d) || freq[norm(d)] >= 2) assin += v;
    }
    const cats = [
      { nome: "Assinaturas", valor: assin, cor: "#E2A03F" },
      { nome: "Juros, IOF e multa", valor: juros, cor: "#16314f" },
      { nome: "Taxas bancárias", valor: taxa, cor: "#C8643F" },
    ].filter((c) => c.valor > 0);
    return { cats, total: assin + juros + taxa };
  }, [txs]);

  if (loading) {
    return <VPCard className="p-5 flex items-center gap-2 text-[#1b2a3d]/50 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Analisando gastos invisíveis…</VPCard>;
  }
  if (erro || total === 0) {
    return (
      <VPCard className="p-5">
        <div className="flex items-center gap-2 mb-1"><EyeOff className="h-5 w-5 text-[#16314f]" /><p className="font-display text-lg font-bold text-[#16314f]">Gastos invisíveis</p></div>
        <p className="text-sm text-[#1b2a3d]/55">Conecte um banco acima para revelarmos assinaturas esquecidas, juros e taxas dos últimos 90 dias.</p>
      </VPCard>
    );
  }

  return (
    <VPCard className="p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2"><EyeOff className="h-5 w-5 text-[#C8643F]" /><p className="font-display text-lg font-bold text-[#16314f]">Gastos invisíveis</p></div>
        <div className="text-right"><p className="text-[10px] uppercase tracking-wider text-[#1b2a3d]/50">Total / 90 dias</p><p className="font-display text-lg font-bold text-[#C8643F] tabular-nums">{brl0(total)}</p></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 items-center mt-3">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie data={cats} dataKey="valor" nameKey="nome" innerRadius={40} outerRadius={68} paddingAngle={1}>
              {cats.map((c, i) => <Cell key={i} fill={c.cor} />)}
            </Pie></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {cats.map((c) => (
            <div key={c.nome} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#16314f]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.cor }} />{c.nome}</span>
              <span className="tabular-nums font-semibold text-[#16314f]">{brl0(c.valor)}</span>
            </div>
          ))}
        </div>
      </div>
    </VPCard>
  );
};

export default GastosInvisiveis;
