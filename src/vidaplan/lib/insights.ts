// Insights derivados do plano: para onde vai a renda e como o patrimônio se forma.
import {
  type LifePlanInput, type LifePlan,
  custoMensalNoAno, dividaAnualNoAno, segurosAnualSaida, outflowsNoAno, parcelaAnualNoAno,
} from "@/lib/lifeplan";

export interface Fatia { nome: string; valor: number; cor: string }

const COR = { custo: "#16314f", dividas: "#C8643F", seguros: "#E2A03F", sonhos: "#5B8DB8", poupanca: "#2F8F6B" };

// "Destino da renda" até a independência (somatório dos anos de trabalho).
export function destinoDaRenda(inp: LifePlanInput, plan: LifePlan): { fatias: Fatia[]; total: number } {
  const anoApos = inp.anoAtual + (inp.idadeAposentadoria - inp.idadeAtual);
  let custo = 0, dividas = 0, seguros = 0, sonhos = 0;
  for (let ano = inp.anoAtual; ano < anoApos; ano++) {
    custo += custoMensalNoAno(inp, ano) * 12;
    dividas += (inp.dividas ?? []).reduce((s, d) => s + dividaAnualNoAno(d, ano, inp.anoAtual), 0);
    seguros += segurosAnualSaida(inp);
    for (const g of inp.goals) {
      sonhos += outflowsNoAno(g, ano, inp.anoAtual, inp.idadeAtual, inp.idadeAposentadoria);
      sonhos += parcelaAnualNoAno(g, ano);
    }
  }
  const poupanca = plan.serie
    .filter((p) => p.idade < inp.idadeAposentadoria)
    .reduce((s, p) => s + Math.max(0, p.sobra), 0);

  const fatias: Fatia[] = [
    { nome: "Custo de vida", valor: custo, cor: COR.custo },
    { nome: "Sonhos", valor: sonhos, cor: COR.sonhos },
    { nome: "Independência (poupança)", valor: poupanca, cor: COR.poupanca },
    { nome: "Dívidas", valor: dividas, cor: COR.dividas },
    { nome: "Seguros", valor: seguros, cor: COR.seguros },
  ].filter((f) => f.valor > 0).sort((a, b) => b.valor - a.valor);

  const total = fatias.reduce((s, f) => s + f.valor, 0);
  return { fatias, total };
}

// Composição do patrimônio na independência: quanto você aportou × quanto rendeu de juros.
export function composicaoPatrimonio(inp: LifePlanInput, plan: LifePlan): { fatias: Fatia[]; total: number } {
  const poupanca = plan.serie
    .filter((p) => p.idade < inp.idadeAposentadoria)
    .reduce((s, p) => s + Math.max(0, p.sobra), 0);
  const aportado = inp.patrimonioAtual + poupanca;
  const total = Math.max(0, plan.patrimonioNaApos);
  const juros = Math.max(0, total - aportado);
  const fatias: Fatia[] = [
    { nome: "Você aportou", valor: Math.min(aportado, total), cor: "#16314f" },
    { nome: "Rendeu (juros)", valor: juros, cor: "#2F8F6B" },
  ].filter((f) => f.valor > 0);
  return { fatias, total };
}
