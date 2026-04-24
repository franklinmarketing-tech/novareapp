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
  irDevido: string;
  atingeMeta: boolean;
  anosAcumulo: number;
  aliquotaIR: number;
  taxaMensalEfetiva: number;
  patrimonioNum: number;
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

// Cores Novare (RGB equivalentes ao tema)
const NAVY: [number, number, number] = [13, 27, 42];
const NAVY_LIGHT: [number, number, number] = [27, 50, 75];
const ACCENT: [number, number, number] = [201, 162, 98]; // dourado
const TEXT_DARK: [number, number, number] = [30, 30, 30];
const TEXT_MUTED: [number, number, number] = [110, 110, 120];
const BG_LIGHT: [number, number, number] = [248, 248, 250];

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

export async function generateRendimentoPDF(result: SimResultLite, input: SimInputLite) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ===== HEADER =====
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 110, "F");

  // Acento dourado no topo
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageW, 4, "F");

  // Logo
  try {
    const logoData = await loadImageAsDataURL(logoBranca);
    doc.addImage(logoData, "PNG", 40, 28, 110, 55);
  } catch {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("NOVARE", 40, 60);
  }

  // Título do relatório
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Projeção de Rendimento", pageW - 40, 50, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(201, 162, 98);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    pageW - 40,
    70,
    { align: "right" }
  );

  // ===== RESUMO EM CARDS =====
  let y = 140;
  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Seu cenário", 40, y);

  y += 6;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(2);
  doc.line(40, y, 100, y);

  y += 22;

  // Card de resumo
  doc.setFillColor(...BG_LIGHT);
  doc.roundedRect(40, y, pageW - 80, 110, 8, 8, "F");

  const colW = (pageW - 80) / 3;
  const cards = [
    { label: "Patrimônio projetado", value: result.patrimonio, sub: `Líquido: ${result.patrimonioLiquido}` },
    { label: "Renda mensal líquida", value: result.rendaMensalLiquida, sub: `Anual: ${result.rendaAnualLiquida}` },
    { label: "Total investido", value: result.totalInvestido, sub: `Ganho líq.: ${result.ganhoLiquido}` },
  ];

  cards.forEach((c, i) => {
    const x = 40 + colW * i + 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(c.label.toUpperCase(), x, y + 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(c.value, x, y + 45);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(c.sub, x, y + 62);

    if (i < 2) {
      doc.setDrawColor(220, 220, 225);
      doc.setLineWidth(0.5);
      doc.line(40 + colW * (i + 1), y + 18, 40 + colW * (i + 1), y + 92);
    }
  });

  y += 130;

  // ===== PARÂMETROS DA SIMULAÇÃO =====
  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Parâmetros utilizados", 40, y);
  y += 6;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(2);
  doc.line(40, y, 100, y);
  y += 14;

  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 6, textColor: TEXT_DARK },
    columnStyles: {
      0: { fontStyle: "bold", textColor: NAVY, cellWidth: 180 },
      1: { textColor: TEXT_DARK },
    },
    body: [
      ["Idade atual", `${input.idadeAtual} anos`],
      ["Idade de aposentadoria", `${input.idadeAposent} anos`],
      ["Período de acumulação", `${result.anosAcumulo} anos`],
      ["Patrimônio inicial", fmtBRL(input.patrimonioAtual)],
      ["Aporte mensal", fmtBRL(input.aporte)],
      ["Renda desejada", fmtBRL(input.rendaDesejada) + "/mês"],
      ["Rentabilidade considerada", `${input.rentabilidadeAnual.toFixed(2)}% ao ano`],
      ["Taxa mensal efetiva", `${result.taxaMensalEfetiva.toFixed(3)}% a.m.`],
      ["Alíquota de IR final", `${result.aliquotaIR}%`],
      ["IR estimado no resgate", result.irDevido],
      ["Meta atingida?", result.atingeMeta ? "Sim — meta alcançada" : "Não — ajuste recomendado"],
    ],
  });

  // ===== TABELA RENDIMENTO ANO A ANO =====
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 24;

  if (y > pageH - 100) {
    doc.addPage();
    y = 60;
  }

  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Evolução ano a ano", 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Inclui renda mensal líquida estimada caso o resgate ocorresse no ano", 40, y + 14);
  y += 24;

  const taxaMensal = result.taxaMensalEfetiva / 100;

  const rows = result.timeline.map((p) => {
    // renda mensal líquida estimada se resgatasse no ano i
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
    margin: { left: 40, right: 40 },
    head: [["Ano", "Idade", "Investido", "Bruto", "Líquido", "Ganho líq.", "Renda mensal líq."]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { fontSize: 8.5, textColor: TEXT_DARK },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    columnStyles: {
      0: { halign: "center", cellWidth: 40 },
      1: { halign: "center", cellWidth: 55 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold", textColor: NAVY },
    },
    didDrawPage: (data) => {
      // ===== FOOTER em todas as páginas =====
      const ph = doc.internal.pageSize.getHeight();
      const pw = doc.internal.pageSize.getWidth();

      // Faixa de footer
      doc.setFillColor(...NAVY);
      doc.rect(0, ph - 60, pw, 60, "F");
      doc.setFillColor(...ACCENT);
      doc.rect(0, ph - 60, pw, 2, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Novare Consultoria de Investimentos", 40, ph - 38);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(220, 220, 230);
      doc.text("WhatsApp / Telefone:  (19) 98340-2827", 40, ph - 24);
      doc.text("Site:  www.novareapp.com.br", 40, ph - 12);

      doc.setTextColor(201, 162, 98);
      doc.setFontSize(8);
      doc.text(
        `Página ${data.pageNumber}`,
        pw - 40,
        ph - 24,
        { align: "right" }
      );
      doc.setTextColor(180, 180, 190);
      doc.setFontSize(7);
      doc.text(
        "Projeção estimativa — não constitui garantia de rentabilidade.",
        pw - 40,
        ph - 12,
        { align: "right" }
      );
    },
  });

  // ===== CTA FINAL =====
  // @ts-ignore
  let yEnd = (doc as any).lastAutoTable.finalY + 24;
  if (yEnd > pageH - 180) {
    doc.addPage();
    yEnd = 60;
  }

  doc.setFillColor(...NAVY_LIGHT);
  doc.roundedRect(40, yEnd, pageW - 80, 80, 10, 10, "F");
  doc.setFillColor(...ACCENT);
  doc.roundedRect(40, yEnd, 4, 80, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Quer transformar essa projeção em realidade?", 60, yEnd + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 230);
  doc.text(
    "Fale com um especialista Novare e receba uma carteira personalizada — sem custo.",
    60,
    yEnd + 46
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(201, 162, 98);
  doc.text("WhatsApp: (19) 98340-2827   |   www.novareapp.com.br", 60, yEnd + 66);

  // Abrir em nova aba + oferecer download como fallback
  const fileName = `Novare-Rendimento-${input.idadeAposent}anos.pdf`;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  const newWindow = window.open(url, "_blank");

  // Se popup bloqueado, força download
  if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // libera memória depois
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
