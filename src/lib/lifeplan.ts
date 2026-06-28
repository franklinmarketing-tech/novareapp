// Motor do "Projeto de Vida Novare" — Método Horizonte
// Projeção macro DEFLACIONADA (valores de hoje) do presente até a aposentadoria
// e além, consolidando todos os sonhos + aposentadoria no "Capital de Vida".

export type GoalType = "viagens" | "festas" | "imovel" | "carro" | "educacao" | "outro";

export interface Goal {
  id: number;
  tipo: GoalType;
  nome?: string;
  valor: number;          // valor principal (anual p/ viagens/festas; evento p/ os demais)
  ano?: number;           // ano do evento (imovel/educacao/outro) ou 1º ano (carro)
  intervaloAnos?: number; // carro: troca a cada X anos
  financiar?: boolean;    // imovel
  entradaPct?: number;    // imovel
  prazoAnos?: number;     // imovel
  jurosAa?: number;       // imovel (% a.a. nominal)
}

export interface LifePlanInput {
  anoAtual: number;
  idadeAtual: number;
  idadeAposentadoria: number;
  idadeFim: number;          // ex.: 85
  rendaMensal: number;
  custoFixoMensal: number;
  patrimonioAtual: number;
  rentRealPct: number;       // % a.a. real (acima da inflação)
  rendaAposDesejada: number; // mensal, em valores de hoje
  rendaINSS: number;         // mensal já garantido (INSS/previdência)
  goals: Goal[];
}

const pricePmtAnnual = (principal: number, jurosAa: number, prazoAnos: number) => {
  const i = jurosAa / 100 / 12, n = prazoAnos * 12;
  if (principal <= 0 || n <= 0) return 0;
  const pmt = i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
  return pmt * 12;
};

function outflowsNoAno(g: Goal, ano: number, anoAtual: number, idadeAtual: number, idadeApos: number): number {
  const idade = idadeAtual + (ano - anoAtual);
  switch (g.tipo) {
    case "viagens":
    case "festas":
      return idade < idadeApos ? g.valor : 0;
    case "carro": {
      if (g.ano == null || idade >= idadeApos || ano < g.ano) return 0;
      const intr = Math.max(1, g.intervaloAnos || 999);
      return (ano - g.ano) % intr === 0 ? g.valor : 0;
    }
    case "imovel":
      if (g.ano !== ano) return 0;
      return g.financiar ? g.valor * (g.entradaPct ?? 20) / 100 : g.valor;
    case "educacao":
    case "outro":
      return g.ano === ano ? g.valor : 0;
    default:
      return 0;
  }
}

function parcelaAnualNoAno(g: Goal, ano: number): number {
  if (g.tipo !== "imovel" || !g.financiar || g.ano == null) return 0;
  const prazo = g.prazoAnos ?? 25;
  if (ano < g.ano || ano >= g.ano + prazo) return 0;
  const financiado = g.valor * (1 - (g.entradaPct ?? 20) / 100);
  return pricePmtAnnual(financiado, g.jurosAa ?? 10, prazo);
}

interface SimResult { serie: { idade: number; ano: number; patrimonio: number }[]; patrimonioNaApos: number }

function simulate(inp: LifePlanInput, opts: { extraMensal?: number; rate?: number; idadeApos?: number } = {}): SimResult {
  const i = opts.rate ?? inp.rentRealPct / 100;
  const idadeApos = opts.idadeApos ?? inp.idadeAposentadoria;
  const extra = (opts.extraMensal ?? 0) * 12;
  let patr = inp.patrimonioAtual;
  const serie: SimResult["serie"] = [];
  let patrimonioNaApos = patr;
  const ultimoAno = inp.anoAtual + (inp.idadeFim - inp.idadeAtual);
  for (let ano = inp.anoAtual; ano <= ultimoAno; ano++) {
    const idade = inp.idadeAtual + (ano - inp.anoAtual);
    if (idade < idadeApos) {
      const renda = inp.rendaMensal * 12;
      let custo = inp.custoFixoMensal * 12;
      let obj = 0;
      for (const g of inp.goals) { custo += parcelaAnualNoAno(g, ano); obj += outflowsNoAno(g, ano, inp.anoAtual, inp.idadeAtual, idadeApos); }
      patr = patr * (1 + i) + (renda - custo - obj + extra);
    } else {
      const saque = Math.max(0, inp.rendaAposDesejada - inp.rendaINSS) * 12;
      patr = patr * (1 + i) - saque;
    }
    if (idade === idadeApos) patrimonioNaApos = patr;
    serie.push({ idade, ano, patrimonio: Math.round(patr) });
  }
  return { serie, patrimonioNaApos };
}

const annuityPV = (pmtAnnual: number, n: number, i: number) =>
  n <= 0 ? 0 : (i === 0 ? pmtAnnual * n : pmtAnnual * (1 - Math.pow(1 + i, -n)) / i);

export interface LifePlan {
  capitalDeVida: number;
  totalObjetivos: number;
  alvoAposentadoria: number;
  patrimonioNaApos: number;
  pctAtingido: number;
  viavel: boolean;
  serie: SimResult["serie"];
  esperarAnos: number | null;
  rentNecessariaPct: number | null;
  pouparMaisMes: number | null;
  rendaPassivaProjetada: number;
  pmtAposAnual: number;
}

export function computeLifePlan(inp: LifePlanInput): LifePlan {
  const i = inp.rentRealPct / 100;
  const base = simulate(inp);

  let totalObjetivos = 0;
  const anoApos = inp.anoAtual + (inp.idadeAposentadoria - inp.idadeAtual);
  for (let ano = inp.anoAtual; ano < anoApos; ano++) {
    for (const g of inp.goals) {
      totalObjetivos += outflowsNoAno(g, ano, inp.anoAtual, inp.idadeAtual, inp.idadeAposentadoria);
      totalObjetivos += parcelaAnualNoAno(g, ano);
    }
  }

  const nApos = inp.idadeFim - inp.idadeAposentadoria;
  const pmtAposAnual = Math.max(0, inp.rendaAposDesejada - inp.rendaINSS) * 12;
  const alvoAposentadoria = annuityPV(pmtAposAnual, nApos, i);
  const capitalDeVida = totalObjetivos + alvoAposentadoria;
  const patrimonioNaApos = base.patrimonioNaApos;
  const pctAtingido = alvoAposentadoria > 0 ? (patrimonioNaApos / alvoAposentadoria) * 100 : 100;
  const viavel = patrimonioNaApos >= alvoAposentadoria;
  const rendaPassivaProjetada = Math.max(0, patrimonioNaApos) * 0.04 / 12;

  // Alavanca 1: esperar mais anos
  let esperarAnos: number | null = null;
  if (!viavel) {
    for (let k = 1; k <= 20 && inp.idadeAposentadoria + k < inp.idadeFim; k++) {
      const s = simulate(inp, { idadeApos: inp.idadeAposentadoria + k });
      if (s.patrimonioNaApos >= annuityPV(pmtAposAnual, inp.idadeFim - (inp.idadeAposentadoria + k), i)) { esperarAnos = k; break; }
    }
  }
  // Alavanca 2: rentabilidade real necessária (busca binária)
  let rentNecessariaPct: number | null = null;
  {
    let lo = Math.max(0, i), hi = 0.20, found = false;
    for (let it = 0; it < 44; it++) {
      const mid = (lo + hi) / 2;
      const s = simulate(inp, { rate: mid });
      if (s.patrimonioNaApos >= annuityPV(pmtAposAnual, nApos, mid)) { hi = mid; found = true; } else { lo = mid; }
    }
    if (found) rentNecessariaPct = hi * 100;
  }
  // Alavanca 3: poupar mais por mês (busca binária)
  let pouparMaisMes: number | null = null;
  if (!viavel) {
    let lo = 0, hi = 200000, found = false;
    for (let it = 0; it < 44; it++) {
      const mid = (lo + hi) / 2;
      if (simulate(inp, { extraMensal: mid }).patrimonioNaApos >= alvoAposentadoria) { hi = mid; found = true; } else { lo = mid; }
    }
    if (found) pouparMaisMes = hi;
  }

  return {
    capitalDeVida, totalObjetivos, alvoAposentadoria, patrimonioNaApos,
    pctAtingido: Math.min(999, pctAtingido), viavel, serie: base.serie,
    esperarAnos, rentNecessariaPct, pouparMaisMes, rendaPassivaProjetada, pmtAposAnual,
  };
}
