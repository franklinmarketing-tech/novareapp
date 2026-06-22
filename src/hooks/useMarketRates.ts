import { useQuery } from "@tanstack/react-query";

/**
 * Taxas de mercado em tempo real via API pública do Banco Central (SGS).
 * - Selic meta a.a. ....... série 432
 * - IPCA acumulado 12 meses  série 13522
 *
 * A API tem CORS liberado (access-control-allow-origin: *), então a busca
 * acontece direto no navegador. Se ela falhar, usamos um fallback de
 * referência para a página nunca ficar em branco.
 */

const SGS = (code: number) =>
  `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`;

// Valores de referência (atualizar de tempos em tempos) — só usados se a API cair.
const FALLBACK = { selic: 14.25, ipca12: 4.72 };

export interface MarketRates {
  selic: number; // Meta Selic % a.a.
  ipca12: number; // IPCA acumulado 12 meses %
  jurosReal: number; // juro real % a.a.
  rendimentoMes: number; // equivalente mensal da Selic %
  live: boolean; // true = veio da API; false = fallback
}

function compute(selic: number, ipca12: number, live: boolean): MarketRates {
  // Juro real (Fisher): (1 + nominal) / (1 + inflação) - 1
  const jurosReal = ((1 + selic / 100) / (1 + ipca12 / 100) - 1) * 100;
  // Taxa mensal equivalente à Selic anual (juros compostos)
  const rendimentoMes = (Math.pow(1 + selic / 100, 1 / 12) - 1) * 100;
  return { selic, ipca12, jurosReal, rendimentoMes, live };
}

async function fetchSerie(code: number): Promise<number | null> {
  const res = await fetch(SGS(code));
  if (!res.ok) throw new Error(`SGS ${code}: HTTP ${res.status}`);
  const json = await res.json();
  const raw = Array.isArray(json) ? json[json.length - 1]?.valor : undefined;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function useMarketRates() {
  return useQuery<MarketRates>({
    queryKey: ["market-rates-bcb"],
    queryFn: async () => {
      const [selic, ipca12] = await Promise.all([fetchSerie(432), fetchSerie(13522)]);
      if (selic == null || ipca12 == null) throw new Error("SGS sem dados");
      return compute(selic, ipca12, true);
    },
    staleTime: 1000 * 60 * 60 * 12, // 12h — Selic/IPCA mudam raramente
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    refetchOnWindowFocus: false,
    // Mostra o fallback na hora (data sempre definido) e busca os valores
    // reais já no mount — initialDataUpdatedAt: 0 marca o fallback como obsoleto.
    initialData: compute(FALLBACK.selic, FALLBACK.ipca12, false),
    initialDataUpdatedAt: 0,
  });
}
