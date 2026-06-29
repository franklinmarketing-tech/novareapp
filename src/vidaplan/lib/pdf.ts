// Relatório PDF do Projeto de Vida (Novare Vida Plan).
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LifePlanInput, LifePlan } from "@/lib/lifeplan";
import { computeActionPlan } from "./actionplan";

const NAVY: [number, number, number] = [22, 49, 79];
const TERRA: [number, number, number] = [200, 100, 63];
const GREEN: [number, number, number] = [47, 143, 107];
const fmt = (v: number) => "R$ " + Math.round(Number(v) || 0).toLocaleString("pt-BR");

const TIPO: Record<string, string> = { viagens: "Viagens", festas: "Festas", imovel: "Imóvel", carro: "Veículo", educacao: "Educação", outro: "Outro" };

export function exportVidaPlanPDF(input: LifePlanInput, plan: LifePlan, nome?: string) {
  const ap = computeActionPlan(input, plan);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = pdf.internal.pageSize.getWidth();
  let y = 0;

  // Cabeçalho
  pdf.setFillColor(...NAVY); pdf.rect(0, 0, W, 32, "F");
  pdf.setTextColor(255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18);
  pdf.text("Novare Vida Plan", 14, 15);
  pdf.setTextColor(...TERRA); pdf.setFontSize(11);
  pdf.text("Projeto de Vida — Método Horizonte", 14, 23);
  pdf.setTextColor(255); pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  if (nome) pdf.text(nome, W - 14, 15, { align: "right" });

  // Marco Horizonte
  y = 44;
  pdf.setTextColor(120); pdf.setFontSize(9); pdf.text("MARCO HORIZONTE", 14, y);
  pdf.setTextColor(...NAVY); pdf.setFont("helvetica", "bold"); pdf.setFontSize(26);
  pdf.text(fmt(plan.capitalDeVida), 14, y + 11);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(120);
  pdf.text(`Independência ${fmt(plan.alvoAposentadoria)}  ·  Sonhos ${fmt(plan.totalObjetivos)}`, 14, y + 18);

  // Viabilidade
  y += 26;
  const viavel = plan.viavel;
  pdf.setFillColor(...(viavel ? GREEN : TERRA)); pdf.rect(14, y, W - 28, 14, "F");
  pdf.setTextColor(255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
  pdf.text(viavel ? "Independência no rumo certo" : "Independência exige ajustes", 18, y + 9);
  pdf.text(`${Math.round(plan.pctAtingido)}%`, W - 18, y + 9, { align: "right" });

  // Independência (resumo)
  y += 22;
  autoTable(pdf, {
    startY: y,
    head: [["Independência", ""]],
    body: [
      ["Idade", `${input.idadeAposentadoria} anos`],
      ["Renda mensal desejada", `${fmt(input.rendaAposDesejada)}/mês`],
      ["Patrimônio necessário", fmt(plan.alvoAposentadoria)],
      ["Patrimônio projetado", `${fmt(plan.patrimonioNaApos)} (${Math.round(plan.pctAtingido)}%)`],
      ["Renda passiva projetada", `${fmt(plan.rendaPassivaProjetada)}/mês`],
    ],
    theme: "grid", headStyles: { fillColor: NAVY, fontSize: 10 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
  });

  // Realidade
  const sobra = input.rendaMensal - input.custoFixoMensal;
  autoTable(pdf, {
    startY: (pdf as any).lastAutoTable.finalY + 6,
    head: [["Minha realidade hoje", ""]],
    body: [
      ["Renda mensal", `${fmt(input.rendaMensal)}/mês`],
      ["Custo fixo mensal", `${fmt(input.custoFixoMensal)}/mês`],
      ["Sobra mensal", `${fmt(sobra)}/mês`],
      ["Patrimônio investido", fmt(input.patrimonioAtual)],
      ["Rentabilidade do projeto", `IPCA + ${input.rentRealPct}% a.a.`],
      ["Dívidas (saldo)", fmt((input.dividas ?? []).reduce((s, d) => s + d.saldo, 0))],
    ],
    theme: "grid", headStyles: { fillColor: NAVY, fontSize: 10 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
  });

  // Sonhos
  if (input.goals.length) {
    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 6,
      head: [["Sonho", "Tipo", "Valor"]],
      body: input.goals.map((g) => [g.nome || TIPO[g.tipo] || "—", TIPO[g.tipo] || g.tipo, fmt(g.valor)]),
      theme: "striped", headStyles: { fillColor: TERRA, fontSize: 10 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
    });
  }

  // Plano de ação
  autoTable(pdf, {
    startY: (pdf as any).lastAutoTable.finalY + 6,
    head: [["Plano de ação", ""]],
    body: [
      ["Aporte mensal recomendado", `${fmt(ap.aporteRecomendadoMes)}/mês`],
      ["Reserva de emergência", fmt(ap.reservaEmergencia)],
      ["Carteira sugerida", `${ap.horizonte} · IPCA + ${ap.rentEsperadaPct.toFixed(1)}%`],
      ["Proteção da família (seguro)", fmt(ap.protecaoFamilia)],
      ["Previdência sugerida", `${fmt(ap.previdenciaMes)}/mês`],
    ],
    theme: "grid", headStyles: { fillColor: NAVY, fontSize: 10 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
  });

  // Carteira sugerida (alocação)
  autoTable(pdf, {
    startY: (pdf as any).lastAutoTable.finalY + 6,
    head: [["Classe", "Alocação"]],
    body: ap.carteira.map((a) => [a.classe, `${a.pct}%`]),
    theme: "striped", headStyles: { fillColor: TERRA, fontSize: 10 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
  });

  // Rodapé
  const ph = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(7.5); pdf.setTextColor(150);
  pdf.text("Simulação educacional — a recomendação personalizada é feita pela Novare Consultoria de Investimentos.", 14, ph - 8);
  pdf.text("Novare Vida Plan", W - 14, ph - 8, { align: "right" });

  pdf.save("novare-vida-plan.pdf");
}
