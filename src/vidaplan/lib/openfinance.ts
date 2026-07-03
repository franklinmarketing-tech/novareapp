// Acesso ao Open Finance via edge function (rapid-responder). Reutilizável pelas telas.
import { supabase } from "@/integrations/supabase/client";

const FN = "rapid-responder";

export async function call(endpoint: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke(FN, {
    body: { endpoint, body },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  });
  if (error) {
    // Extrai a mensagem real do corpo da função (senão fica só "non-2xx status code").
    let msg = "";
    let code = "";
    let connectUrl = "";
    const ctx = (error as any).context;
    try {
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        const cand = j?.result?.message ?? j?.error ?? j?.message ?? j;
        msg = typeof cand === "string" ? cand : JSON.stringify(cand).slice(0, 400);
        code = j?.code || j?.result?.code || j?.error?.code || "";
        connectUrl = j?.connect_url || j?.result?.connect_url || j?.error?.connect_url || "";
      }
    } catch { /* corpo não é JSON */ }
    if (!msg) { try { if (ctx && typeof ctx.text === "function") msg = await ctx.text(); } catch { /* ignore */ } }
    const st = ctx?.status ? ` (HTTP ${ctx.status})` : "";
    const err = new Error((msg || (error as any).message || "Falha no Open Finance") + st) as Error & { code?: string; connectUrl?: string };
    err.code = code; err.connectUrl = connectUrl;
    throw err;
  }
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data?.result ?? data;
}

const asArray = (x: any, ...keys: string[]): any[] => {
  if (Array.isArray(x)) return x;
  for (const k of keys) if (Array.isArray(x?.[k])) return x[k];
  return [];
};

export interface TxNorm { desc: string; amount: number; date?: string }

// Busca transações no período [fromISO, toISO] (YYYY-MM-DD) e normaliza os campos.
export async function fetchTransactions(fromISO: string, toISO: string): Promise<TxNorm[]> {
  const r = await call("transactions/list", { from: fromISO, to: toISO, startDate: fromISO, endDate: toISO });
  return asArray(r, "transactions", "results").map((t: any) => ({
    desc: String(t.description ?? t.merchant ?? t.name ?? t.descricao ?? ""),
    amount: Number(t.amount ?? t.value ?? t.valor ?? 0),
    date: t.date ?? t.transactionDate ?? t.bookingDate ?? t.data,
  }));
}
