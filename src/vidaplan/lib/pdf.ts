// Relatório PDF do Projeto de Vida (Novare Vida Plan) — com logo e gráficos.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LifePlanInput, LifePlan } from "@/lib/lifeplan";
import { computeActionPlan } from "./actionplan";
import { destinoDaRenda, composicaoPatrimonio } from "./insights";
import logoBranca from "@/assets/logo-branca.png";

const NAVY: [number, number, number] = [22, 49, 79];
const TERRA: [number, number, number] = [200, 100, 63];
const GREEN: [number, number, number] = [47, 143, 107];
const fmt = (v: number) => "R$ " + Math.round(Number(v) || 0).toLocaleString("pt-BR");
const TIPO: Record<string, string> = { viagens: "Viagens", festas: "Festas", imovel: "Imóvel", carro: "Veículo", educacao: "Educação", saude: "Saúde", casamento: "Casamento", reforma: "Reforma", filhos: "Filhos", intercambio: "Intercâmbio", negocio: "Negócio", doacao: "Doação", outro: "Outro" };

// Carrega uma imagem (bundled, same-origin) como dataURL para o jsPDF.
async function toDataURL(url: string): Promise<{ data: string; ratio: number } | null> {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return { data: canvas.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight };
  } catch { return null; }
}

export async function exportVidaPlanPDF(input: LifePlanInput, plan: LifePlan, nome?: string) {
  const ap = computeActionPlan(input, plan);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = pdf.internal.pageSize.getWidth();
  const logo = await toDataURL(logoBranca);

  const header = (titulo: string) => {
    pdf.setFillColor(...NAVY); pdf.rect(0, 0, W, 30, "F");
    if (logo) { const h = 8; pdf.addImage(logo.data, "PNG", 14, 9, h * logo.ratio, h); }
    pdf.setTextColor(255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
    pdf.text(titulo, W - 14, 14, { align: "right" });
    pdf.setTextColor(226, 149, 120); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
    pdf.text("Novare Vida Plan · Método Horizonte", W - 14, 21, { align: "right" });
  };

  // ── Página 1 ──
  header("Projeto de Vida");
  let y = 42;
  pdf.setTextColor(120); pdf.setFontSize(9); pdf.text("MARCO HORIZONTE", 14, y);
  pdf.setTextColor(...NAVY); pdf.setFont("helvetica", "bold"); pdf.setFontSize(26);
  pdf.text(fmt(plan.capitalDeVida), 14, y + 11);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(120);
  pdf.text(`Independência ${fmt(plan.alvoAposentadoria)}   ·   Sonhos ${fmt(plan.totalObjetivos)}`, 14, y + 18);
  if (nome) pdf.text(nome, W - 14, y, { align: "right" });

  y += 26;
  pdf.setFillColor(...(plan.viavel ? GREEN : TERRA)); pdf.rect(14, y, W - 28, 14, "F");
  pdf.setTextColor(255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
  pdf.text(plan.viavel ? "Independência no rumo certo" : "Independência exige ajustes", 18, y + 9);
  pdf.text(`${Math.round(plan.pctAtingido)}%`, W - 18, y + 9, { align: "right" });

  autoTable(pdf, {
    startY: y + 22,
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

  if (input.goals.length) {
    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 6,
      head: [["Sonho", "Tipo", "Valor"]],
      body: input.goals.map((g) => [g.nome || TIPO[g.tipo] || "—", TIPO[g.tipo] || g.tipo, fmt(g.valor)]),
      theme: "striped", headStyles: { fillColor: TERRA, fontSize: 10 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
    });
  }

  // ── Página 2: gráficos ──
  pdf.addPage();
  header("Para onde vai sua renda");
  y = 42;

  // Destino da renda (barras horizontais)
  const dest = destinoDaRenda(input, plan);
  pdf.setTextColor(...NAVY); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
  pdf.text("Destino da renda até a independência", 14, y);
  y += 8;
  const maxV = Math.max(1, ...dest.fatias.map((f) => f.valor));
  const barX = 14, barMaxW = W - 28 - 50;
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  for (const f of dest.fatias) {
    const w = (f.valor / maxV) * barMaxW;
    pdf.setFillColor(...(hexToRgb(f.cor))); pdf.rect(barX, y, w, 6, "F");
    pdf.setTextColor(60); pdf.text(f.nome, barX, y - 1);
    const pct = dest.total > 0 ? (f.valor / dest.total) * 100 : 0;
    pdf.setTextColor(...NAVY); pdf.text(`${fmt(f.valor)} (${pct.toFixed(0)}%)`, W - 14, y + 5, { align: "right" });
    y += 13;
  }

  // Composição do patrimônio
  y += 6;
  const comp = composicaoPatrimonio(input, plan);
  pdf.setTextColor(...NAVY); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
  pdf.text("Como seu patrimônio se forma", 14, y);
  y += 8;
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  for (const f of comp.fatias) {
    const w = comp.total > 0 ? (f.valor / comp.total) * barMaxW : 0;
    pdf.setFillColor(...(hexToRgb(f.cor))); pdf.rect(barX, y, w, 6, "F");
    pdf.setTextColor(60); pdf.text(f.nome, barX, y - 1);
    const pct = comp.total > 0 ? (f.valor / comp.total) * 100 : 0;
    pdf.setTextColor(...NAVY); pdf.text(`${fmt(f.valor)} (${pct.toFixed(0)}%)`, W - 14, y + 5, { align: "right" });
    y += 13;
  }

  // Plano de ação
  autoTable(pdf, {
    startY: y + 4,
    head: [["Plano de ação", ""]],
    body: [
      ["Aporte mensal recomendado", `${fmt(ap.aporteRecomendadoMes)}/mês`],
      ["Reserva de emergência", fmt(ap.reservaEmergencia)],
      ["Carteira sugerida", `${ap.horizonte} · IPCA + ${ap.rentEsperadaPct.toFixed(1)}%`],
      ["Previdência (VGBL/PGBL)", `${fmt(ap.vgblMes)} / ${fmt(ap.pgblMes)} por mês`],
      ["Proteção da família (seguro)", fmt(ap.protecaoFamilia)],
    ],
    theme: "grid", headStyles: { fillColor: NAVY, fontSize: 10 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
  });
  autoTable(pdf, {
    startY: (pdf as any).lastAutoTable.finalY + 6,
    head: [["Carteira sugerida", "Alocação"]],
    body: ap.carteira.map((a) => [a.classe, `${a.pct}%`]),
    theme: "striped", headStyles: { fillColor: TERRA, fontSize: 10 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
  });

  // Rodapé em todas as páginas
  const ph = pdf.internal.pageSize.getHeight();
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7.5); pdf.setTextColor(150);
    pdf.text("Simulação educacional — recomendação personalizada feita pela Novare Consultoria de Investimentos.", 14, ph - 8);
    pdf.text(`Novare Vida Plan · ${p}/${pages}`, W - 14, ph - 8, { align: "right" });
  }

  pdf.save("novare-vida-plan.pdf");
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
