// Motor do Plano de Ação Novare — derivado do plano de vida.
// Tudo é simulação educacional (não é recomendação personalizada de investimento).

import type { LifePlanInput, LifePlan } from "@/lib/lifeplan";

export interface AssetSlice { classe: string; pct: number; rentReal: number }
export type Horizonte = "Longo" | "Médio" | "Curto" | "Renda";

export interface ActionPlan {
  horizonte: Horizonte;
  anosAteIndependencia: number;
  reservaEmergencia: number;
  aporteRecomendadoMes: number;
  carteira: AssetSlice[];
  rentEsperadaPct: number;     // rentabilidade real esperada da carteira sugerida (IPCA + X%)
  protecaoFamilia: number;     // capital de seguro de vida sugerido
  previdenciaMes: number;      // aporte mensal sugerido em previdência
  custoSucessaoEstimado: number;
}

// Carteiras-modelo por horizonte. % de alocação + retorno real anual estimado por classe.
const CARTEIRAS: Record<Horizonte, AssetSlice[]> = {
  Longo: [
    { classe: "Renda Fixa pós (Tesouro Selic/CDB)", pct: 35, rentReal: 3 },
    { classe: "Inflação (Tesouro IPCA+)", pct: 18, rentReal: 4 },
    { classe: "Multimercado", pct: 12, rentReal: 5 },
    { classe: "Ações Brasil", pct: 18, rentReal: 7 },
    { classe: "Internacional", pct: 17, rentReal: 6 },
  ],
  Médio: [
    { classe: "Renda Fixa pós (Tesouro Selic/CDB)", pct: 48, rentReal: 3 },
    { classe: "Inflação (Tesouro IPCA+)", pct: 20, rentReal: 4 },
    { classe: "Multimercado", pct: 10, rentReal: 5 },
    { classe: "Ações Brasil", pct: 12, rentReal: 7 },
    { classe: "Internacional", pct: 10, rentReal: 6 },
  ],
  Curto: [
    { classe: "Renda Fixa pós (Tesouro Selic/CDB)", pct: 64, rentReal: 3 },
    { classe: "Inflação (Tesouro IPCA+)", pct: 20, rentReal: 4 },
    { classe: "Multimercado", pct: 7, rentReal: 5 },
    { classe: "Ações Brasil", pct: 5, rentReal: 7 },
    { classe: "Internacional", pct: 4, rentReal: 6 },
  ],
  Renda: [
    { classe: "Renda Fixa pós (Tesouro Selic/CDB)", pct: 72, rentReal: 3 },
    { classe: "Inflação (Tesouro IPCA+)", pct: 22, rentReal: 4 },
    { classe: "Multimercado", pct: 3, rentReal: 5 },
    { classe: "Ações Brasil", pct: 2, rentReal: 7 },
    { classe: "Internacional", pct: 1, rentReal: 6 },
  ],
};

const horizonteDe = (anos: number): Horizonte =>
  anos <= 0 ? "Renda" : anos < 7 ? "Curto" : anos <= 15 ? "Médio" : "Longo";

// Saldo de financiamentos em aberto (objetivos de imóvel financiados) — entra na proteção.
const dividasFinanciadas = (inp: LifePlanInput) =>
  inp.goals
    .filter((g) => g.tipo === "imovel" && g.financiar)
    .reduce((s, g) => s + g.valor * (1 - (g.entradaPct ?? 20) / 100), 0);

export function computeActionPlan(inp: LifePlanInput, plan: LifePlan): ActionPlan {
  const anos = Math.max(0, inp.idadeAposentadoria - inp.idadeAtual);
  const horizonte = horizonteDe(anos);
  const carteira = CARTEIRAS[horizonte];
  const rentEsperadaPct = carteira.reduce((s, a) => s + (a.pct / 100) * a.rentReal, 0);

  const reservaEmergencia = inp.custoFixoMensal * 6;
  const sobra = Math.max(0, inp.rendaMensal - inp.custoFixoMensal);
  const aporteRecomendadoMes = plan.viavel ? sobra : sobra + (plan.pouparMaisMes ?? 0);

  // Proteção: cobrir 5 anos do custo da família + quitar financiamentos pendentes.
  const protecaoFamilia = inp.custoFixoMensal * 12 * 5 + dividasFinanciadas(inp);

  // Previdência sugerida: até ~30% do aporte, limitado a 12% da renda (faixa PGBL/declaração completa).
  const previdenciaMes = Math.min(aporteRecomendadoMes * 0.3, inp.rendaMensal * 0.12);

  // Sucessão: estimativa de custos (ITCMD + inventário/cartório) ~10% sobre o patrimônio.
  const custoSucessaoEstimado = Math.max(0, plan.patrimonioNaApos) * 0.10;

  return {
    horizonte,
    anosAteIndependencia: anos,
    reservaEmergencia,
    aporteRecomendadoMes,
    carteira,
    rentEsperadaPct,
    protecaoFamilia,
    previdenciaMes,
    custoSucessaoEstimado,
  };
}
