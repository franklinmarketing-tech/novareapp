// Acesso ao Open Finance via edge function (rapid-responder). Reutilizável pelas telas.
import { supabase } from "@/integrations/supabase/client";

const FN = "rapid-responder";

export async function call(endpoint: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke(FN, {
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
