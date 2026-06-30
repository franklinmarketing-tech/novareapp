// Motor do "Projeto de Vida Novare" — Método Horizonte
// Projeção macro DEFLACIONADA (valores de hoje) do presente até a aposentadoria
// e além, consolidando todos os sonhos + aposentadoria no "Capital de Vida".

export type GoalType =
  | "viagens" | "festas" | "imovel" | "carro" | "educacao"
  | "saude" | "casamento" | "reforma" | "filhos" | "intercambio" | "negocio" | "doacao"
  | "outro";

export interface Goal {
  id: number;
  tipo: GoalType;
  nome?: string;
  valor: number;          // valor principal (anual se recorrente; evento se único)
  ano?: number;           // ano do evento (eventos únicos) ou 1º ano (carro)
  recorrente?: boolean;   // sobrepõe o padrão do tipo: true = todo ano, false = num ano só
  obs?: string;           // observação livre do cliente
  intervaloAnos?: number; // carro: troca a cada X anos
  financiar?: boolean;    // imovel
  entradaPct?: number;    // imovel
  prazoAnos?: number;     // imovel
  jurosAa?: number;       // imovel (% a.a. nominal)
}

export interface CustoCategoria { nome: string; valor: number }

// Dívida em aberto (financiamento, empréstimo, cartão parcelado…)
export interface Debt {
  id: number;
  nome?: string;
  saldo: number;     // saldo devedor hoje
  parcelas: number;  // nº de parcelas restantes (meses)
  jurosAa: number;   // % a.a. nominal
}

// Mudança de renda no futuro (aumento + / redução -) a partir de um ano
export interface RendaEvento {
  id: number;
  ano: number;
  delta: number;     // variação mensal (R$) aplicada a partir de `ano`
}

// Aporte realizado (acompanhamento de "Meu Progresso")
export interface Aporte {
  id: number;
  mesAno: string;    // "YYYY-MM"
  valor: number;     // + = aplicação (guardar) · − = resgate (retirar)
  data?: string;     // "YYYY-MM-DD" (dia do lançamento, quando informado)
}

// Seguro contratado (proteção)
export interface Seguro {
  id: number;
  nome?: string;
  valor: number;                       // prêmio
  periodicidade: "mensal" | "anual";   // mensal sai das sobras; anual sai do patrimônio
}

// Personalização do Plano de Ação
export interface PlanoConfig {
  rendaTributavelAnual?: number; // base p/ sugestão PGBL (declaração completa)
  anosProtecaoFamilia?: number;  // anos de custo a deixar p/ a família (seguro)
  itcmdPct?: number;             // % sucessão
  advogadoPct?: number;
  cartorioPct?: number;
}

// Personalização da marca (white-label do consultor): logo + identidade.
export interface Branding {
  logo?: string;       // dataURL (PNG) já comprimido
  logoRatio?: number;  // largura/altura do logo
  consultor?: string;  // nome do consultor
  empresa?: string;    // nome da empresa
  telefone?: string;   // WhatsApp (texto livre; dígitos são extraídos)
}

export interface LifePlanInput {
  anoAtual: number;
  idadeAtual: number;
  idadeAposentadoria: number;
  idadeFim: number;          // ex.: 85
  rendaMensal: number;
  custoFixoMensal: number;   // soma das categorias (custoCategorias), quando houver
  patrimonioAtual: number;
  rentRealPct: number;       // % a.a. real (acima da inflação)
  rendaAposDesejada: number; // mensal, em valores de hoje
  rendaINSS: number;         // mensal já garantido (INSS/previdência)
  goals: Goal[];
  custoCategorias?: CustoCategoria[]; // detalhamento do custo fixo mensal (opcional)
  dividas?: Debt[];          // dívidas em aberto (parcela mensal vira saída)
  rendaEventos?: RendaEvento[]; // aumentos/reduções de renda no tempo
  aportes?: Aporte[];        // acompanhamento de aportes realizados (não afeta a projeção)
  ativosImobilizados?: number; // patrimônio não-investido (imóveis próprios etc.) — informativo
  consorcio?: number;        // carta de crédito / patrimônio previsto via consórcio — informativo
  advisorCodigo?: string;    // código do consultor vinculado (parceria/indicação)
  custoEventos?: RendaEvento[]; // aumentos/reduções de custo fixo no tempo
  seguros?: Seguro[];        // seguros contratados
  planoConfig?: PlanoConfig; // personalização do plano de ação
  branding?: Branding;       // personalização da marca (consultor/empresa) no app e no PDF
  reservaMeses?: number;     // reserva de emergência: meta em meses de custo (padrão 6)
  reservaAtual?: number;     // reserva de emergência já acumulada (R$)
}

// Custo fixo mensal num ano (base + eventos de aumento/redução acumulados)
export const custoMensalNoAno = (inp: LifePlanInput, ano: number): number =>
  Math.max(0, inp.custoFixoMensal + (inp.custoEventos ?? []).reduce((s, e) => s + (ano >= e.ano ? e.delta : 0), 0));
// Saída anual com seguros (mensal × 12 + anual)
export const segurosAnualSaida = (inp: LifePlanInput): number =>
  (inp.seguros ?? []).reduce((s, seg) => s + (seg.periodicidade === "mensal" ? seg.valor * 12 : seg.valor), 0);

// Parcela mensal da dívida (sistema Price)
const parcelaMensalDivida = (d: Debt): number => {
  const i = (d.jurosAa || 0) / 100 / 12, n = d.parcelas;
  if (d.saldo <= 0 || n <= 0) return 0;
  return i === 0 ? d.saldo / n : (d.saldo * i) / (1 - Math.pow(1 + i, -n));
};
// Saída anual da dívida num ano (considera os meses restantes naquele ano)
export const dividaAnualNoAno = (d: Debt, ano: number, anoAtual: number): number => {
  const pmt = parcelaMensalDivida(d);
  if (pmt <= 0) return 0;
  const restantesNoInicio = d.parcelas - (ano - anoAtual) * 12;
  if (restantesNoInicio <= 0) return 0;
  return pmt * Math.min(12, restantesNoInicio);
};
// Renda mensal de trabalho num ano (base + aumentos/reduções acumulados)
const rendaMensalNoAno = (inp: LifePlanInput, ano: number): number =>
  inp.rendaMensal + (inp.rendaEventos ?? []).reduce((s, e) => s + (ano >= e.ano ? e.delta : 0), 0);

const pricePmtAnnual = (principal: number, jurosAa: number, prazoAnos: number) => {
  const i = jurosAa / 100 / 12, n = prazoAnos * 12;
  if (principal <= 0 || n <= 0) return 0;
  const pmt = i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
  return pmt * 12;
};

// Recorrência padrão de cada tipo quando o cliente não escolheu explicitamente.
const recorrentePorPadrao = (tipo: GoalType) => tipo === "viagens" || tipo === "festas" || tipo === "doacao";

export function outflowsNoAno(g: Goal, ano: number, anoAtual: number, idadeAtual: number, idadeApos: number): number {
  const idade = idadeAtual + (ano - anoAtual);
  // Imóvel: entrada (financiado) ou valor à vista, no ano marcado.
  if (g.tipo === "imovel") {
    if (g.ano !== ano) return 0;
    return g.financiar ? g.valor * (g.entradaPct ?? 20) / 100 : g.valor;
  }
  // Veículo: compra e troca periódica a cada intervaloAnos, a partir de g.ano.
  if (g.tipo === "carro") {
    if (g.ano == null || idade >= idadeApos || ano < g.ano) return 0;
    const intr = Math.max(1, g.intervaloAnos || 999);
    return (ano - g.ano) % intr === 0 ? g.valor : 0;
  }
  // Demais: recorrente (todo ano até a independência) ou evento único (no ano marcado).
  const recorrente = g.recorrente ?? recorrentePorPadrao(g.tipo);
  if (recorrente) return idade < idadeApos ? g.valor : 0;
  return g.ano === ano ? g.valor : 0;
}

export function parcelaAnualNoAno(g: Goal, ano: number): number {
  if (g.tipo !== "imovel" || !g.financiar || g.ano == null) return 0;
  const prazo = g.prazoAnos ?? 25;
  if (ano < g.ano || ano >= g.ano + prazo) return 0;
  const financiado = g.valor * (1 - (g.entradaPct ?? 20) / 100);
  return pricePmtAnnual(financiado, g.jurosAa ?? 10, prazo);
}

export interface YearPoint {
  idade: number; ano: number;
  renda: number; saidas: number; objetivos: number; sobra: number; patrimonio: number;
}
interface SimResult { serie: YearPoint[]; patrimonioNaApos: number }

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
    const dividaAno = (inp.dividas ?? []).reduce((s, d) => s + dividaAnualNoAno(d, ano, inp.anoAtual), 0);
    const segurosAno = segurosAnualSaida(inp);
    let renda = 0, saidas = 0, objetivos = 0, sobra = 0;
    if (idade < idadeApos) {
      renda = rendaMensalNoAno(inp, ano) * 12;
      saidas = custoMensalNoAno(inp, ano) * 12 + dividaAno + segurosAno;
      for (const g of inp.goals) { saidas += parcelaAnualNoAno(g, ano); objetivos += outflowsNoAno(g, ano, inp.anoAtual, inp.idadeAtual, idadeApos); }
      sobra = renda - saidas - objetivos + extra;
    } else {
      renda = inp.rendaINSS * 12;
      saidas = inp.rendaAposDesejada * 12 + dividaAno + segurosAno;
      sobra = renda - saidas;
    }
    patr = patr * (1 + i) + sobra;
    if (idade === idadeApos) patrimonioNaApos = patr;
    serie.push({ idade, ano, renda: Math.round(renda), saidas: Math.round(saidas), objetivos: Math.round(objetivos), sobra: Math.round(sobra), patrimonio: Math.round(patr) });
  }
  return { serie, patrimonioNaApos };
}

const annuityPV = (pmtAnnual: number, n: number, i: number) =>
  n <= 0 ? 0 : (i === 0 ? pmtAnnual * n : pmtAnnual * (1 - Math.pow(1 + i, -n)) / i);

// Projeção de um objetivo até a independência: quanto ele custa no total e em que período.
export function projecaoObjetivo(g: Goal, anoAtual: number, idadeAtual: number, idadeApos: number) {
  const anoApos = anoAtual + (idadeApos - idadeAtual);
  let total = 0, anos = 0;
  let anoInicio: number | null = null, anoFim: number | null = null;
  for (let ano = anoAtual; ano < anoApos; ano++) {
    const v = outflowsNoAno(g, ano, anoAtual, idadeAtual, idadeApos) + parcelaAnualNoAno(g, ano);
    if (v > 0.5) {
      total += v;
      anos++;
      if (anoInicio == null) anoInicio = ano;
      anoFim = ano;
    }
  }
  return { total: Math.round(total), anos, anoInicio, anoFim };
}

// Sugestão de imóvel a partir das finanças (regra clássica: parcela ≤ 30% da renda).
export function sugestaoImovel(rendaMensal: number, patrimonioDisponivel: number, jurosAa = 10, prazoAnos = 30) {
  const i = jurosAa / 100 / 12, n = prazoAnos * 12;
  const parcelaMax = 0.3 * Math.max(0, rendaMensal);
  const financiavel = i === 0 ? parcelaMax * n : parcelaMax * (1 - Math.pow(1 + i, -n)) / i;
  const entrada = Math.max(0, patrimonioDisponivel);
  return {
    aVista: Math.round(entrada),
    financiado: Math.round(entrada + financiavel),
    entrada: Math.round(entrada),
    financiamento: Math.round(financiavel),
    parcela: Math.round(parcelaMax),
  };
}

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

// ── Reserva de emergência ───────────────────────────────────────────────
const custoMensalBase = (inp: LifePlanInput) =>
  inp.custoFixoMensal || (inp.custoCategorias ?? []).reduce((s, c) => s + (Number(c.valor) || 0), 0);

export function reservaEmergencia(inp: LifePlanInput) {
  const custo = custoMensalBase(inp);
  const meses = inp.reservaMeses ?? 6;
  const meta = custo * meses;
  const atual = Math.max(0, inp.reservaAtual ?? 0);
  const pct = meta > 0 ? Math.min(100, (atual / meta) * 100) : 100;
  return { custo, meses, meta, atual, pct, completa: atual >= meta, faltam: Math.max(0, meta - atual) };
}

// ── Score de Saúde Financeira (0–100) ───────────────────────────────────
const clamp01 = (v: number) => Math.max(0, Math.min(100, v));
const pmtMensal = (saldo: number, jurosAa: number, parcelas: number) => {
  const i = jurosAa / 100 / 12;
  if (saldo <= 0 || parcelas <= 0) return 0;
  return i === 0 ? saldo / parcelas : (saldo * i) / (1 - Math.pow(1 + i, -parcelas));
};

export interface PilarSaude { key: string; nome: string; score: number; peso: number; dica: string }
export interface SaudeFinanceira { total: number; nota: string; pilares: PilarSaude[] }

export function computeHealthScore(inp: LifePlanInput, plan: LifePlan): SaudeFinanceira {
  const custo = custoMensalBase(inp);
  const renda = Math.max(1, inp.rendaMensal);
  const res = reservaEmergencia(inp);
  const parcelaDiv = (inp.dividas ?? []).reduce((s, d) => s + pmtMensal(d.saldo, d.jurosAa, d.parcelas), 0);
  const comprometimento = parcelaDiv / renda;
  const taxaPoupanca = (renda - custo - parcelaDiv) / renda;
  const temSeguro = (inp.seguros ?? []).length > 0;

  const pilares: PilarSaude[] = [
    { key: "reserva", nome: "Reserva de emergência", peso: 20, score: Math.round(res.pct),
      dica: res.completa ? "Reserva no nível ideal." : "Junte de 3 a 6 meses do seu custo." },
    { key: "dividas", nome: "Endividamento", peso: 20, score: Math.round(clamp01((1 - comprometimento / 0.30) * 100)),
      dica: comprometimento > 0.30 ? "Dívidas tomam mais de 30% da renda." : comprometimento > 0 ? "Endividamento sob controle." : "Sem dívidas — excelente." },
    { key: "poupanca", nome: "Capacidade de poupança", peso: 25, score: Math.round(clamp01((taxaPoupanca / 0.20) * 100)),
      dica: taxaPoupanca <= 0 ? "Hoje você gasta tudo que ganha." : `Você poupa ~${Math.round(taxaPoupanca * 100)}% da renda.` },
    { key: "protecao", nome: "Proteção", peso: 15, score: temSeguro ? 80 : 25,
      dica: temSeguro ? "Você tem proteção contratada." : "Considere um seguro de vida." },
    { key: "independencia", nome: "Rumo à independência", peso: 20, score: Math.round(Math.min(100, plan.pctAtingido)),
      dica: plan.viavel ? "Plano no rumo certo." : "Ajuste o plano para fechar a meta." },
  ];
  const somaPesos = pilares.reduce((s, p) => s + p.peso, 0);
  const total = Math.round(pilares.reduce((s, p) => s + p.score * p.peso, 0) / somaPesos);
  const nota = total >= 80 ? "Excelente" : total >= 60 ? "Boa" : total >= 40 ? "Atenção" : "Crítica";
  return { total, nota, pilares };
}
