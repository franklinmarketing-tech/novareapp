import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BCBRecord {
  data: string;
  valor: string;
}

async function fetchBCBSeries(seriesId: number, lastN: number): Promise<BCBRecord[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados/ultimos/${lastN}?formato=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchDolarOlindaAPI(): Promise<BCBRecord[]> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 45);
  const fmt = (d: Date) => `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@di,dataFinalCotacao=@df)?@di='${fmt(start)}'&@df='${fmt(today)}'&$format=json&$top=30&$orderby=dataHoraCotacao%20asc`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.value || !Array.isArray(json.value)) return [];
    return json.value.map((item: { cotacaoVenda: number; dataHoraCotacao: string }) => {
      const d = new Date(item.dataHoraCotacao);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return { data: `${dd}/${mm}/${yyyy}`, valor: String(item.cotacaoVenda) };
    });
  } catch (e) {
    console.error("OLINDA API error:", e);
    return [];
  }
}

function parseValue(record: BCBRecord): number {
  return parseFloat(record.valor.replace(",", "."));
}

function calcVariation(records: BCBRecord[]): { current: number; previous: number; variation: number } {
  if (records.length < 2) {
    const current = records.length ? parseValue(records[records.length - 1]) : 0;
    return { current, previous: current, variation: 0 };
  }
  const current = parseValue(records[records.length - 1]);
  const previous = parseValue(records[records.length - 2]);
  const variation = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  return { current, previous, variation };
}

function formatHistory(records: BCBRecord[]): { date: string; value: number }[] {
  return records.map(r => ({ date: r.data, value: parseValue(r) }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── AUTH: Verify caller is authenticated ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all series in parallel
    const [selicRecs, cdiRecs, ipcaRecs, poupancaRecs, bcbDolarRecs] = await Promise.all([
      fetchBCBSeries(4189, 12),
      fetchBCBSeries(4391, 12),
      fetchBCBSeries(433, 12),
      fetchBCBSeries(25, 12),
      fetchBCBSeries(10813, 30),
    ]);

    let dolarRecs = bcbDolarRecs;
    if (dolarRecs.length === 0) {
      dolarRecs = await fetchDolarOlindaAPI();
    }

    const selic = calcVariation(selicRecs);
    const cdi = calcVariation(cdiRecs);
    const ipca = calcVariation(ipcaRecs);
    const poupanca = calcVariation(poupancaRecs);
    const dolar = calcVariation(dolarRecs);

    const selicRate = selic.current;
    const cdiRate = cdi.current;

    const products = [
      { name: "Tesouro Selic", type: "Renda Fixa", estimatedReturn: `${selicRate.toFixed(2)}% a.a.`, returnValue: selicRate, risk: "Muito Baixo", liquidity: "D+1", minInvestment: "R$ 30", profiles: ["conservador", "moderado", "arrojado"] },
      { name: "CDB 100% CDI", type: "Renda Fixa", estimatedReturn: `${cdiRate.toFixed(2)}% a.a.`, returnValue: cdiRate, risk: "Baixo", liquidity: "D+1 a D+720", minInvestment: "R$ 1.000", profiles: ["conservador", "moderado"] },
      { name: "CDB 120% CDI", type: "Renda Fixa", estimatedReturn: `${(cdiRate * 1.2).toFixed(2)}% a.a.`, returnValue: cdiRate * 1.2, risk: "Baixo", liquidity: "D+720", minInvestment: "R$ 5.000", profiles: ["moderado", "arrojado"] },
      { name: "Tesouro IPCA+ 2029", type: "Renda Fixa", estimatedReturn: `IPCA + 6.5% a.a.`, returnValue: ipca.current + 6.5, risk: "Médio", liquidity: "D+1 (com marcação)", minInvestment: "R$ 30", profiles: ["moderado", "arrojado"] },
      { name: "LCI/LCA 95% CDI", type: "Renda Fixa", estimatedReturn: `${(cdiRate * 0.95).toFixed(2)}% a.a. (isento IR)`, returnValue: cdiRate * 0.95, risk: "Baixo", liquidity: "D+90 a D+360", minInvestment: "R$ 5.000", profiles: ["conservador", "moderado"] },
      { name: "Fundo DI", type: "Renda Fixa", estimatedReturn: `~${(cdiRate * 0.97).toFixed(2)}% a.a.`, returnValue: cdiRate * 0.97, risk: "Baixo", liquidity: "D+0 a D+1", minInvestment: "R$ 100", profiles: ["conservador"] },
      { name: "Fundo Multimercado", type: "Multimercado", estimatedReturn: `CDI + 2-5% a.a.`, returnValue: cdiRate + 3, risk: "Médio", liquidity: "D+15 a D+30", minInvestment: "R$ 1.000", profiles: ["moderado", "arrojado"] },
      { name: "Ações / ETF IBOV", type: "Renda Variável", estimatedReturn: `Variável`, returnValue: 0, risk: "Alto", liquidity: "D+2", minInvestment: "R$ 100", profiles: ["arrojado"] },
      { name: "Poupança", type: "Renda Fixa", estimatedReturn: `${poupanca.current.toFixed(2)}% a.m.`, returnValue: poupanca.current * 12, risk: "Muito Baixo", liquidity: "Imediata", minInvestment: "R$ 1", profiles: ["conservador"] },
    ];

    const data = {
      indicators: {
        selic: { ...selic, name: "Selic", unit: "% a.a.", history: formatHistory(selicRecs) },
        cdi: { ...cdi, name: "CDI", unit: "% a.a.", history: formatHistory(cdiRecs) },
        ipca: { ...ipca, name: "IPCA", unit: "% a.m.", history: formatHistory(ipcaRecs) },
        poupanca: { ...poupanca, name: "Poupança", unit: "% a.m.", history: formatHistory(poupancaRecs) },
        dolar: { ...dolar, name: "Dólar", unit: "R$", history: formatHistory(dolarRecs) },
      },
      products,
      updatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("fetch-market-data error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
