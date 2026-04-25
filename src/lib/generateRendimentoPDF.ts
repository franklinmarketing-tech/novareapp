import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoBranca from "@/assets/logo-branca.png";

interface YearPoint {
  year: number;
  age: number;
  invested: number;
  gross: number;
  net: number;
  gain: number;
}

interface SimResultLite {
  patrimonio: string;
  patrimonioLiquido: string;
  rendaMensal: string;
  rendaMensalLiquida: string;
  rendaAnualLiquida: string;
  totalInvestido: string;
  ganhoLiquido: string;
  ganhoBruto: string;
  irDevido: string;
  atingeMeta: boolean;
  anosAcumulo: number;
  aliquotaIR: number;
  taxaMensalEfetiva: number;
  patrimonioNum: number;
  patrimonioLiquidoNum: number;
  totalInvestidoNum: number;
  rendaMensalLiquidaNum: number;
  rendaDesejadaNum: number;
  timeline: YearPoint[];
}

interface SimInputLite {
  idadeAtual: number;
  idadeAposent: number;
  patrimonioAtual: number;
  aporte: number;
  rendaDesejada: number;
  rentabilidadeAnual: number;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtBRLDec = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

const fmtCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")} Mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return fmtBRL(v);
};

// ===== Paleta Novare (oficial) =====
// novare-blue: hsl(215 50% 23%)  → #1E3A5F  (azul-marinho profundo)
// novare-blue-bright: hsl(210 75% 62%) → #4D9AE8 (azul vibrante)
// terracotta: hsl(16 65% 50%) → #D26A2C (laranja Novare)
const NOVARE_BLUE: [number, number, number] = [30, 58, 95];
const NOVARE_BLUE_DARK: [number, number, number] = [18, 36, 60];
const NOVARE_BLUE_BRIGHT: [number, number, number] = [77, 154, 232];
const NOVARE_BLUE_LIGHT: [number, number, number] = [240, 246, 254];
const TERRACOTTA: [number, number, number] = [210, 106, 44];
const SUCCESS_GREEN: [number, number, number] = [22, 163, 74];
const WARNING_AMBER: [number, number, number] = [217, 119, 6];
const TEXT_DARK: [number, number, number] = [25, 32, 45];
const TEXT_MUTED: [number, number, number] = [110, 118, 130];
const BG_SOFT: [number, number, number] = [248, 250, 253];
const BORDER_LIGHT: [number, number, number] = [225, 230, 238];

async function loadImageAsDataURL(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================================
// GERADORES DE GRÁFICOS (canvas → dataURL)
// ============================================================

/**
 * Gráfico de área: evolução do patrimônio bruto vs líquido ao longo do tempo
 */
function generateAreaChart(timeline: YearPoint[], width = 1200, height = 480): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Fundo branco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const padL = 90, padR = 40, padT = 50, padB = 70;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  if (timeline.length < 2) return canvas.toDataURL("image/png");

  const maxY = Math.max(...timeline.map(p => p.gross)) * 1.05;
  const minY = 0;

  const xAt = (i: number) => padL + (i / (timeline.length - 1)) * chartW;
  const yAt = (v: number) => padT + chartH - ((v - minY) / (maxY - minY)) * chartH;

  // Grid horizontal + labels Y
  ctx.strokeStyle = "#E5EAF2";
  ctx.lineWidth = 1;
  ctx.font = "16px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#6E7682";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const v = minY + (maxY - minY) * (i / ySteps);
    const y = yAt(v);
    ctx.beginPath();
    ctx.setLineDash([3, 5]);
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();
    ctx.fillText(fmtCompact(v), padL - 12, y);
  }
  ctx.setLineDash([]);

  // Eixo X — labels (idades)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const xLabels = Math.min(8, timeline.length);
  for (let i = 0; i < xLabels; i++) {
    const idx = Math.round((i / (xLabels - 1)) * (timeline.length - 1));
    const p = timeline[idx];
    ctx.fillText(`${p.age} anos`, xAt(idx), padT + chartH + 14);
  }

  // ===== ÁREA: PATRIMÔNIO BRUTO =====
  const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0, "rgba(77, 154, 232, 0.45)");
  grad.addColorStop(1, "rgba(77, 154, 232, 0.02)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(xAt(0), yAt(0));
  timeline.forEach((p, i) => ctx.lineTo(xAt(i), yAt(p.gross)));
  ctx.lineTo(xAt(timeline.length - 1), yAt(0));
  ctx.closePath();
  ctx.fill();

  // Linha bruto
  ctx.strokeStyle = "#4D9AE8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  timeline.forEach((p, i) => {
    if (i === 0) ctx.moveTo(xAt(i), yAt(p.gross));
    else ctx.lineTo(xAt(i), yAt(p.gross));
  });
  ctx.stroke();

  // Linha líquido (após IR) — tracejada
  ctx.strokeStyle = "#1E3A5F";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  timeline.forEach((p, i) => {
    if (i === 0) ctx.moveTo(xAt(i), yAt(p.net));
    else ctx.lineTo(xAt(i), yAt(p.net));
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Linha investido (referência)
  ctx.strokeStyle = "#D26A2C";
  ctx.lineWidth = 2;
  ctx.beginPath();
  timeline.forEach((p, i) => {
    if (i === 0) ctx.moveTo(xAt(i), yAt(p.invested));
    else ctx.lineTo(xAt(i), yAt(p.invested));
  });
  ctx.stroke();

  // ===== LEGENDA =====
  const legendY = 22;
  const legendItems = [
    { color: "#4D9AE8", label: "Patrimônio bruto" },
    { color: "#1E3A5F", label: "Patrimônio líquido (após IR)", dashed: true },
    { color: "#D26A2C", label: "Total investido" },
  ];
  let lx = padL;
  ctx.font = "bold 14px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  legendItems.forEach((item) => {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 3;
    if (item.dashed) ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(lx, legendY);
    ctx.lineTo(lx + 26, legendY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#19202D";
    ctx.fillText(item.label, lx + 32, legendY);
    lx += ctx.measureText(item.label).width + 70;
  });

  return canvas.toDataURL("image/png");
}

/**
 * Gráfico de barras horizontais: composição final do patrimônio
 */
function generateCompositionChart(
  invested: number,
  gain: number,
  ir: number,
  width = 1200,
  height = 320
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const padL = 220, padR = 260, padT = 40, padB = 30;
  const chartW = width - padL - padR;

  const total = invested + gain;
  const items = [
    { label: "Total investido", value: invested, color: "#D26A2C" },
    { label: "Ganho bruto (juros)", value: gain, color: "#4D9AE8" },
    { label: "IR retido no resgate", value: ir, color: "#D97706" },
  ];

  const maxVal = Math.max(invested, gain, ir);
  const barH = 50;
  const gap = 20;

  ctx.font = "bold 18px Helvetica, Arial, sans-serif";
  ctx.textBaseline = "middle";

  items.forEach((it, i) => {
    const y = padT + i * (barH + gap);
    // Label
    ctx.fillStyle = "#19202D";
    ctx.textAlign = "right";
    ctx.fillText(it.label, padL - 16, y + barH / 2);

    // Trilho
    ctx.fillStyle = "#F0F4FA";
    ctx.fillRect(padL, y, chartW, barH);

    // Barra
    const w = (it.value / maxVal) * chartW;
    const grad = ctx.createLinearGradient(padL, y, padL + w, y);
    grad.addColorStop(0, it.color);
    grad.addColorStop(1, it.color + "CC");
    ctx.fillStyle = grad;
    ctx.fillRect(padL, y, w, barH);

    // Valor à direita
    ctx.fillStyle = it.color;
    ctx.textAlign = "left";
    ctx.font = "bold 20px Helvetica, Arial, sans-serif";
    ctx.fillText(fmtBRL(it.value), padL + w + 12, y + barH / 2);

    // % do total bruto
    if (total > 0 && i < 2) {
      const pct = ((it.value / total) * 100).toFixed(1).replace(".", ",");
      ctx.font = "14px Helvetica, Arial, sans-serif";
      ctx.fillStyle = "#6E7682";
      ctx.fillText(`${pct}%`, padL + w + 130, y + barH / 2);
    }

    ctx.font = "bold 18px Helvetica, Arial, sans-serif";
  });

  return canvas.toDataURL("image/png");
}

// ============================================================
// HELPERS DE LAYOUT
// ============================================================

function drawSectionTitle(doc: jsPDF, title: string, subtitle: string, y: number) {
  doc.setTextColor(...NOVARE_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 40, y);

  doc.setDrawColor(...NOVARE_BLUE_BRIGHT);
  doc.setLineWidth(2.5);
  doc.line(40, y + 5, 80, y + 5);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(subtitle, 40, y + 22);
    return y + 38;
  }
  return y + 18;
}

function drawHeader(doc: jsPDF, logoData: string | null, pageW: number) {
  // Fundo navy com gradiente simulado (3 faixas)
  doc.setFillColor(...NOVARE_BLUE_DARK);
  doc.rect(0, 0, pageW, 130, "F");
  doc.setFillColor(...NOVARE_BLUE);
  doc.rect(0, 70, pageW, 60, "F");

  // Acento azul-bright no topo (3pt)
  doc.setFillColor(...NOVARE_BLUE_BRIGHT);
  doc.rect(0, 0, pageW, 3, "F");

  // Logo
  if (logoData) {
    try { doc.addImage(logoData, "PNG", 40, 32, 110, 55); } catch {}
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("NOVARE", 40, 65);
  }

  // Título do relatório (direita)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Projeção de Aposentadoria", pageW - 40, 55, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(180, 210, 245);
  doc.text("Relatório personalizado · Consultoria de Investimentos", pageW - 40, 73, { align: "right" });

  doc.setFontSize(8.5);
  doc.setTextColor(200, 220, 245);
  doc.text(
    `Emitido em ${new Date().toLocaleDateString("pt-BR")} · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    pageW - 40,
    91,
    { align: "right" }
  );
}

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  doc.setFillColor(...NOVARE_BLUE_DARK);
  doc.rect(0, ph - 56, pw, 56, "F");
  doc.setFillColor(...NOVARE_BLUE_BRIGHT);
  doc.rect(0, ph - 56, pw, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Novare Consultoria de Investimentos", 40, ph - 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 220, 245);
  doc.text("WhatsApp:  (19) 98340-2827   ·   Site:  www.novareapp.com.br", 40, ph - 22);
  doc.setTextColor(150, 175, 200);
  doc.setFontSize(7);
  doc.text("Projeção estimativa — não constitui garantia de rentabilidade.", 40, ph - 10);

  doc.setTextColor(...NOVARE_BLUE_BRIGHT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Página ${pageNumber} de ${totalPages}`, pw - 40, ph - 22, { align: "right" });
}

// ============================================================
// GERADOR PRINCIPAL
// ============================================================

export async function generateRendimentoPDF(result: SimResultLite, input: SimInputLite) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  let logoData: string | null = null;
  try { logoData = await loadImageAsDataURL(logoBranca); } catch {}

  // ============= PÁGINA 1: HEADER + RESUMO + GRÁFICO =============
  drawHeader(doc, logoData, pageW);

  // ===== Saudação personalizada =====
  let y = 158;
  doc.setTextColor(...NOVARE_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Olá! Aqui está o seu plano para os ${input.idadeAposent} anos.`, 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    `Projeção construída a partir dos seus ${result.anosAcumulo} anos de acumulação, com aporte mensal de ${fmtBRL(input.aporte)}.`,
    40, y + 16
  );
  y += 42;

  // ===== Cards de destaque (2 grandes) =====
  const cardW = (pageW - 80 - 16) / 2;

  // Card 1 — Patrimônio líquido
  doc.setFillColor(...NOVARE_BLUE_DARK);
  doc.roundedRect(40, y, cardW, 95, 10, 10, "F");
  doc.setFillColor(...NOVARE_BLUE_BRIGHT);
  doc.roundedRect(40, y, 4, 95, 2, 2, "F");

  doc.setTextColor(180, 210, 245);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("PATRIMÔNIO LÍQUIDO APÓS IR", 60, y + 22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(result.patrimonioLiquido, 60, y + 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(180, 210, 245);
  doc.text(`Aos ${input.idadeAposent} anos · bruto: ${result.patrimonio}`, 60, y + 72);

  // Card 2 — Renda mensal
  const x2 = 40 + cardW + 16;
  doc.setFillColor(...NOVARE_BLUE_LIGHT);
  doc.roundedRect(x2, y, cardW, 95, 10, 10, "F");
  doc.setDrawColor(...NOVARE_BLUE_BRIGHT);
  doc.setLineWidth(0.6);
  doc.roundedRect(x2, y, cardW, 95, 10, 10, "S");
  doc.setFillColor(...NOVARE_BLUE_BRIGHT);
  doc.roundedRect(x2, y, 4, 95, 2, 2, "F");

  doc.setTextColor(...TEXT_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("RENDA MENSAL ESTIMADA", x2 + 20, y + 22);
  doc.setTextColor(...NOVARE_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(result.rendaMensalLiquida, x2 + 20, y + 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Em valores de hoje · anual: ${result.rendaAnualLiquida}`, x2 + 20, y + 72);

  y += 115;

  // ===== Badge meta atingida / não atingida =====
  const metaColor = result.atingeMeta ? SUCCESS_GREEN : WARNING_AMBER;
  const metaTxt = result.atingeMeta
    ? `META ATINGIDA · sua renda projetada cobre ${fmtBRL(input.rendaDesejada)}/mês desejados.`
    : `ATENÇÃO · renda projetada abaixo de ${fmtBRL(input.rendaDesejada)}/mês desejados — recomendamos ajustes.`;
  doc.setFillColor(metaColor[0], metaColor[1], metaColor[2]);
  doc.roundedRect(40, y, pageW - 80, 22, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(metaTxt, pageW / 2, y + 14, { align: "center" });
  y += 36;

  // ===== Gráfico de evolução (área) =====
  y = drawSectionTitle(doc, "Evolução do patrimônio", "Patrimônio bruto, líquido após IR e total investido ao longo do período.", y);

  try {
    const chartData = generateAreaChart(result.timeline);
    const imgW = pageW - 80;
    const imgH = imgW * (480 / 1200);
    if (y + imgH > pageH - 80) {
      drawFooter(doc, 1, 3);
      doc.addPage();
      drawHeader(doc, logoData, pageW);
      y = 158;
    }
    doc.addImage(chartData, "PNG", 40, y, imgW, imgH);
    y += imgH + 16;
  } catch {
    // se canvas falhar, segue
  }

  // Footer página 1
  drawFooter(doc, 1, 3);

  // ============= PÁGINA 2: COMO O CÁLCULO FOI FEITO =============
  doc.addPage();
  drawHeader(doc, logoData, pageW);
  y = 158;

  y = drawSectionTitle(
    doc,
    "Como o cálculo foi feito",
    "Passo a passo da projeção e do imposto de renda incidente sobre os rendimentos.",
    y
  );

  // ===== Parâmetros utilizados =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NOVARE_BLUE_DARK);
  doc.text("1. Parâmetros utilizados", 40, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 5, textColor: TEXT_DARK },
    columnStyles: {
      0: { fontStyle: "bold", textColor: NOVARE_BLUE, cellWidth: 200 },
      1: { textColor: TEXT_DARK },
    },
    body: [
      ["Idade atual", `${input.idadeAtual} anos`],
      ["Idade alvo de aposentadoria", `${input.idadeAposent} anos`],
      ["Período de acumulação", `${result.anosAcumulo} anos`],
      ["Patrimônio inicial", fmtBRL(input.patrimonioAtual)],
      ["Aporte mensal", fmtBRL(input.aporte) + "  ·  Total: " + fmtBRL(input.aporte * 12 * result.anosAcumulo)],
      ["Renda mensal desejada", fmtBRL(input.rendaDesejada)],
      ["Rentabilidade considerada", `${input.rentabilidadeAnual.toFixed(2)}% ao ano  (${result.taxaMensalEfetiva.toFixed(3)}% a.m.)`],
    ],
  });

  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 18;

  // ===== Cálculo do IR (passo a passo) =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NOVARE_BLUE_DARK);
  doc.text("2. Imposto de Renda no resgate", 40, y);
  y += 14;

  const baseCalc = Math.max(0, result.patrimonioNum - result.totalInvestidoNum);
  const valorIR = baseCalc * (result.aliquotaIR / 100);

  const steps = [
    {
      n: "1",
      titulo: "Base de cálculo (ganho bruto)",
      formula: "Patrimônio bruto − Total investido",
      conta: `${fmtCompact(result.patrimonioNum)}  −  ${fmtCompact(result.totalInvestidoNum)}`,
      valor: fmtBRL(baseCalc),
      cor: NOVARE_BLUE,
    },
    {
      n: "2",
      titulo: "Alíquota aplicada (tabela regressiva)",
      formula: result.anosAcumulo > 2 ? "Acima de 720 dias = menor alíquota" : "Resgate em prazo curto",
      conta: `${result.anosAcumulo} anos de aplicação`,
      valor: `${result.aliquotaIR}%`,
      cor: WARNING_AMBER,
    },
    {
      n: "3",
      titulo: "Imposto devido (descontado no resgate)",
      formula: "Base × Alíquota",
      conta: `${fmtCompact(baseCalc)}  ×  ${result.aliquotaIR}%`,
      valor: fmtBRL(valorIR),
      cor: TERRACOTTA,
    },
    {
      n: "4",
      titulo: "Patrimônio líquido (o que você recebe)",
      formula: "Patrimônio bruto − IR devido",
      conta: `${fmtCompact(result.patrimonioNum)}  −  ${fmtCompact(valorIR)}`,
      valor: result.patrimonioLiquido,
      cor: SUCCESS_GREEN,
    },
  ];

  steps.forEach((s, i) => {
    const sy = y + i * 60;
    doc.setFillColor(...BG_SOFT);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.roundedRect(40, sy, pageW - 80, 52, 6, 6, "FD");

    // Badge número
    doc.setFillColor(s.cor[0], s.cor[1], s.cor[2]);
    doc.circle(62, sy + 26, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(s.n, 62, sy + 30, { align: "center" });

    // Título + fórmula
    doc.setTextColor(...NOVARE_BLUE_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(s.titulo, 84, sy + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${s.formula}  ·  ${s.conta}`, 84, sy + 32);

    // Valor à direita
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(s.cor[0], s.cor[1], s.cor[2]);
    doc.text(s.valor, pageW - 56, sy + 30, { align: "right" });
  });

  y += steps.length * 60 + 14;

  // ===== Tabela regressiva do IR =====
  if (y > pageH - 140) {
    drawFooter(doc, 2, 3);
    doc.addPage();
    drawHeader(doc, logoData, pageW);
    y = 158;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NOVARE_BLUE_DARK);
  doc.text("4. Tabela regressiva do IR (Renda Fixa)", 40, y);
  y += 14;

  const tabelaRegr = [
    { faixa: "Até 180 dias", aliq: 22.5 },
    { faixa: "181 a 360 dias", aliq: 20 },
    { faixa: "361 a 720 dias", aliq: 17.5 },
    { faixa: "Acima de 720 dias", aliq: 15 },
  ];
  const tcellW = (pageW - 80) / 4;
  tabelaRegr.forEach((t, i) => {
    const tx = 40 + i * tcellW;
    const isCurrent = t.aliq === result.aliquotaIR;
    if (isCurrent) {
      doc.setFillColor(...NOVARE_BLUE_BRIGHT);
      doc.roundedRect(tx + 4, y, tcellW - 8, 56, 6, 6, "F");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(...BG_SOFT);
      doc.setDrawColor(...BORDER_LIGHT);
      doc.roundedRect(tx + 4, y, tcellW - 8, 56, 6, 6, "FD");
      doc.setTextColor(...TEXT_MUTED);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(t.faixa.toUpperCase(), tx + tcellW / 2, y + 18, { align: "center" });
    doc.setFontSize(18);
    doc.text(`${t.aliq.toString().replace(".", ",")}%`, tx + tcellW / 2, y + 40, { align: "center" });
    if (isCurrent) {
      doc.setFontSize(7);
      doc.text("✓ SUA ALÍQUOTA", tx + tcellW / 2, y + 50, { align: "center" });
    }
  });
  y += 70;

  // ===== Composição final (gráfico de barras) =====
  if (y > pageH - 200) {
    drawFooter(doc, 2, 3);
    doc.addPage();
    drawHeader(doc, logoData, pageW);
    y = 158;
  }

  y = drawSectionTitle(doc, "Composição do patrimônio final", "Quanto você investiu, quanto rendeu e quanto vai para o imposto.", y);

  try {
    const compChart = generateCompositionChart(result.totalInvestidoNum, baseCalc, valorIR);
    const imgW = pageW - 80;
    const imgH = imgW * (320 / 1200);
    doc.addImage(compChart, "PNG", 40, y, imgW, imgH);
    y += imgH + 12;
  } catch {}

  drawFooter(doc, 2, 3);

  // ============= PÁGINA 3: TABELA ANO A ANO + CTA NOVARE =============
  doc.addPage();
  drawHeader(doc, logoData, pageW);
  y = 158;

  y = drawSectionTitle(
    doc,
    "Evolução ano a ano",
    "Acompanhamento detalhado do crescimento do patrimônio durante todo o período.",
    y
  );

  const taxaMensal = result.taxaMensalEfetiva / 100;
  const rows = result.timeline.map((p) => {
    const rendaMensalAno = p.net * taxaMensal;
    return [
      String(p.year),
      `${p.age} anos`,
      fmtBRL(p.invested),
      fmtBRL(p.gross),
      fmtBRL(p.net),
      fmtBRL(p.gain),
      fmtBRLDec(rendaMensalAno),
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40, bottom: 70 },
    head: [["Ano", "Idade", "Investido", "Bruto", "Líquido", "Ganho líq.", "Renda mensal líq."]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: NOVARE_BLUE_DARK,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { fontSize: 8.5, textColor: TEXT_DARK },
    alternateRowStyles: { fillColor: BG_SOFT },
    columnStyles: {
      0: { halign: "center", cellWidth: 40 },
      1: { halign: "center", cellWidth: 55 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold", textColor: NOVARE_BLUE_DARK },
    },
    didDrawPage: () => {
      // será sobrescrito depois com numeração correta
    },
  });

  // @ts-ignore
  let yEnd = (doc as any).lastAutoTable.finalY + 24;

  // ===== CTA Novare reforçado =====
  if (yEnd > pageH - 230) {
    doc.addPage();
    drawHeader(doc, logoData, pageW);
    yEnd = 158;
  }

  // Container CTA azul navy com gradiente simulado
  doc.setFillColor(...NOVARE_BLUE_DARK);
  doc.roundedRect(40, yEnd, pageW - 80, 180, 12, 12, "F");
  doc.setFillColor(...NOVARE_BLUE);
  doc.roundedRect(40, yEnd + 90, pageW - 80, 90, 0, 0, "F");
  // Re-arredondar cantos inferiores
  doc.setFillColor(...NOVARE_BLUE);
  doc.roundedRect(40, yEnd + 168, pageW - 80, 12, 12, 12, "F");

  // Acento lateral
  doc.setFillColor(...NOVARE_BLUE_BRIGHT);
  doc.roundedRect(40, yEnd, 5, 180, 3, 3, "F");

  // Logo dentro do CTA
  if (logoData) {
    try { doc.addImage(logoData, "PNG", 60, yEnd + 22, 80, 40); } catch {}
  }

  // Headline
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Pronto para transformar essa projeção em realidade?", 60, yEnd + 90);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 220, 245);
  doc.text(
    "A Novare é uma consultoria de investimentos independente. Nosso time monta uma carteira",
    60,
    yEnd + 110
  );
  doc.text(
    "personalizada para você atingir seus objetivos — sem custo na primeira conversa.",
    60,
    yEnd + 124
  );

  // Bloco de contato em destaque
  doc.setFillColor(...NOVARE_BLUE_BRIGHT);
  doc.roundedRect(60, yEnd + 138, pageW - 120, 32, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("WhatsApp:  (19) 98340-2827", 75, yEnd + 158);
  doc.text("www.novareapp.com.br", pageW - 75, yEnd + 158, { align: "right" });

  // Após gerar tudo, sobrescrever rodapés com numeração correta
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  // ===== Download =====
  const fileName = `Novare-Aposentadoria-${input.idadeAposent}anos.pdf`;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
