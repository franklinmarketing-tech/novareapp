import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoPreta from "@/assets/logo-preta.png";
import logoBranca from "@/assets/logo-branca.png";

export interface MonthlyClosingPdfData {
  clientName: string;
  monthLabel: string;
  closedAt: string;
  closedByLabel?: string;
  notes?: string | null;

  totals: {
    total_income: number;
    total_expenses: number;
    total_assets: number;
    total_debts: number;
    monthly_debt_payments: number;
    net_worth: number;
    savings_rate: number;
    emergency_reserve_months: number;
    plan_completion_pct: number;
  };

  income: Array<{ description?: string; amount?: number; frequency?: string }>;
  expenses: Array<{ category?: string; description?: string; amount?: number; is_fixed?: boolean; due_day?: number | null }>;
  debts: Array<{ type?: string; creditor?: string; total_amount?: number; monthly_payment?: number; interest_rate?: number }>;
  assets: Array<{ type?: string; description?: string; estimated_value?: number }>;
  insurance: Array<{ type?: string; provider?: string; coverage_amount?: number; monthly_premium?: number }>;
  goals: Array<{ description?: string; priority?: string; target_amount?: number | null; deadline?: string | null; pct?: number; tasksDone?: number; tasksTotal?: number }>;
  actionItems: Array<{ description?: string; status?: string; financial_impact?: number; deadline?: string | null }>;
}

// ── Helpers ─────────────────────────────────────
const fmtBRL = (v?: number | null) =>
  v == null ? "—" : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v?: number | null) => (v == null ? "—" : `${Number(v).toFixed(1)}%`);

const loadImg = (src: string): Promise<{ dataUrl: string; w: number; h: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("ctx"));
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = src;
  });

// Paleta Novare
const C = {
  primary: [30, 58, 95] as [number, number, number],
  primaryLight: [99, 140, 192] as [number, number, number],
  accent: [217, 119, 87] as [number, number, number],
  text: [30, 30, 35] as [number, number, number],
  muted: [120, 120, 130] as [number, number, number],
  border: [228, 228, 232] as [number, number, number],
  bgSoft: [248, 248, 250] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const CHART_PALETTE: [number, number, number][] = [
  [30, 58, 95], [217, 119, 87], [22, 163, 74], [37, 99, 235],
  [217, 119, 6], [147, 51, 234], [219, 39, 119], [13, 148, 136],
  [220, 38, 38], [120, 113, 108],
];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

export async function generateMonthlyClosingPdf(data: MonthlyClosingPdfData): Promise<void> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = 0;
  let pageNumber = 1;

  let logoWhite: { dataUrl: string; w: number; h: number } | null = null;
  let logoBlack: { dataUrl: string; w: number; h: number } | null = null;
  try {
    [logoWhite, logoBlack] = await Promise.all([loadImg(logoBranca), loadImg(logoPreta)]);
  } catch { /* segue sem logo */ }

  // ── Cabeçalho/rodapé ──
  const addHeader = () => {
    pdf.setFillColor(...C.primary);
    pdf.rect(0, 0, PAGE_W, 10, "F");
    if (logoWhite) {
      const ratio = logoWhite.w / logoWhite.h;
      const h = 5;
      try { pdf.addImage(logoWhite.dataUrl, "PNG", MARGIN, 2.5, h * ratio, h); } catch {}
    }
    pdf.setTextColor(...C.white);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Fechamento Mensal", PAGE_W / 2, 6.5, { align: "center" });
    pdf.text(data.clientName, PAGE_W - MARGIN, 6.5, { align: "right" });
  };

  const addFooter = () => {
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    pdf.setTextColor(...C.muted);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("Novare — Consultoria Financeira", MARGIN, PAGE_H - 7);
    pdf.text(`Página ${pageNumber}`, PAGE_W - MARGIN, PAGE_H - 7, { align: "right" });
  };

  const newPage = () => {
    addFooter();
    pdf.addPage();
    pageNumber++;
    addHeader();
    y = 18;
  };

  const ensureSpace = (need: number) => {
    if (y + need > PAGE_H - 18) newPage();
  };

  const sectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(16);
    pdf.setFillColor(...C.primary);
    pdf.roundedRect(MARGIN, y, 3, 7, 1, 1, "F");
    pdf.setTextColor(...C.text);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(title, MARGIN + 6, y + 5);
    if (subtitle) {
      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(subtitle, MARGIN + 6, y + 9);
      y += 12;
    } else {
      y += 9;
    }
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 4;
  };

  // ── Gráficos nativos ──
  const drawDonut = (
    cx: number, cy: number, rOuter: number, rInner: number,
    items: { label: string; value: number; color: [number, number, number] }[],
    title?: string,
  ) => {
    const total = items.reduce((s, i) => s + i.value, 0);
    if (total <= 0) return;
    let start = -Math.PI / 2;
    const STEP = Math.PI / 60;
    items.forEach((it) => {
      const slice = (it.value / total) * Math.PI * 2;
      const end = start + slice;
      pdf.setFillColor(...it.color);
      // Aproxima o setor com triângulos
      for (let a = start; a < end; a += STEP) {
        const a2 = Math.min(a + STEP, end);
        pdf.triangle(
          cx, cy,
          cx + Math.cos(a) * rOuter, cy + Math.sin(a) * rOuter,
          cx + Math.cos(a2) * rOuter, cy + Math.sin(a2) * rOuter,
          "F"
        );
      }
      start = end;
    });
    // furo do donut
    pdf.setFillColor(...C.white);
    pdf.circle(cx, cy, rInner, "F");

    if (title) {
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(title, cx, cy - 1, { align: "center" });
    }
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(`${items.length} itens`, cx, cy + 3, { align: "center" });
  };

  const drawLegend = (
    x: number, y0: number, w: number,
    items: { label: string; value: number; color: [number, number, number] }[],
  ) => {
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    let cy = y0;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    items.forEach((it) => {
      pdf.setFillColor(...it.color);
      pdf.rect(x, cy - 2.5, 3, 3, "F");
      pdf.setTextColor(...C.text);
      const pct = ((it.value / total) * 100).toFixed(1);
      const label = it.label.length > 22 ? it.label.slice(0, 22) + "…" : it.label;
      pdf.text(label, x + 5, cy);
      pdf.setTextColor(...C.muted);
      pdf.text(`${pct}%`, x + w, cy, { align: "right" });
      cy += 5;
    });
  };

  const drawBars = (
    x: number, y0: number, w: number, h: number,
    items: { label: string; value: number; color?: [number, number, number] }[],
    title?: string,
  ) => {
    if (title) {
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(title, x, y0 - 2);
    }
    const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
    const barW = (w - 4) / items.length - 6;
    const baseY = y0 + h - 8;
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.2);
    pdf.line(x, baseY, x + w, baseY);

    items.forEach((it, idx) => {
      const bx = x + 2 + idx * (barW + 6);
      const ratio = Math.abs(it.value) / max;
      const bh = ratio * (h - 12);
      const color = it.color || (it.value < 0 ? C.danger : C.primary);
      pdf.setFillColor(...color);
      pdf.rect(bx, baseY - bh, barW, bh, "F");
      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(it.label, bx + barW / 2, baseY + 4, { align: "center" });
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      const valTxt = Math.abs(it.value) >= 1000
        ? `${it.value < 0 ? "-" : ""}R$${(Math.abs(it.value) / 1000).toFixed(0)}k`
        : `R$${Math.round(it.value)}`;
      pdf.text(valTxt, bx + barW / 2, baseY - bh - 1.5, { align: "center" });
    });
  };

  const drawProgressBar = (x: number, y0: number, w: number, pct: number, color: [number, number, number]) => {
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(x, y0, w, 3, 1.5, 1.5, "F");
    const fillW = Math.max(0, Math.min(100, pct)) / 100 * w;
    if (fillW > 0) {
      pdf.setFillColor(...color);
      pdf.roundedRect(x, y0, fillW, 3, 1.5, 1.5, "F");
    }
  };

  // ═════════════ CAPA ═════════════
  // Fundo escuro topo
  pdf.setFillColor(...C.primary);
  pdf.rect(0, 0, PAGE_W, 90, "F");
  if (logoWhite) {
    const ratio = logoWhite.w / logoWhite.h;
    const h = 14;
    try {
      pdf.addImage(logoWhite.dataUrl, "PNG", PAGE_W / 2 - (h * ratio) / 2, 22, h * ratio, h);
    } catch {}
  }
  pdf.setTextColor(...C.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("Fechamento Mensal", PAGE_W / 2, 55, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(13);
  pdf.text(data.monthLabel, PAGE_W / 2, 65, { align: "center" });
  pdf.setFontSize(10);
  pdf.setTextColor(...C.primaryLight);
  pdf.text(data.clientName, PAGE_W / 2, 75, { align: "center" });

  // Faixa accent
  pdf.setFillColor(...C.accent);
  pdf.rect(0, 90, PAGE_W, 1.5, "F");

  // Painel de KPIs grandes
  y = 105;
  const kpis: { label: string; value: string; color: [number, number, number] }[] = [
    { label: "Patrimônio Líquido", value: fmtBRL(data.totals.net_worth), color: C.primary },
    { label: "Taxa de Poupança", value: fmtPct(data.totals.savings_rate), color: C.success },
    { label: "Reserva (meses)", value: data.totals.emergency_reserve_months.toFixed(1), color: C.primaryLight },
    { label: "Cumprimento do Plano", value: fmtPct(data.totals.plan_completion_pct), color: C.accent },
  ];
  const kpiW = (CONTENT_W - 9) / 2;
  const kpiH = 28;
  kpis.forEach((k, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * (kpiW + 9);
    const ky = y + row * (kpiH + 6);
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(x, ky, kpiW, kpiH, 2.5, 2.5, "F");
    pdf.setFillColor(...k.color);
    pdf.rect(x, ky, 2, kpiH, "F");
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(k.label.toUpperCase(), x + 6, ky + 8);
    pdf.setTextColor(...k.color);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text(k.value, x + 6, ky + 19);
  });
  y += kpiH * 2 + 12;

  // Detalhe data fechamento
  pdf.setTextColor(...C.muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text(`Fechado em ${data.closedAt}`, MARGIN, y);
  if (data.closedByLabel) pdf.text(`Por: ${data.closedByLabel}`, PAGE_W - MARGIN, y, { align: "right" });

  newPage();

  // ═════════════ Resumo executivo ═════════════
  sectionTitle("Resumo Executivo", "Indicadores consolidados do mês");
  autoTable(pdf, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold" },
    head: [["Indicador", "Valor"]],
    body: [
      ["Receita total mensal", fmtBRL(data.totals.total_income)],
      ["Despesas totais", fmtBRL(data.totals.total_expenses)],
      ["Pagamentos mensais de dívida", fmtBRL(data.totals.monthly_debt_payments)],
      ["Ativos totais", fmtBRL(data.totals.total_assets)],
      ["Dívidas totais", fmtBRL(data.totals.total_debts)],
      ["Patrimônio líquido", fmtBRL(data.totals.net_worth)],
      ["Taxa de poupança", fmtPct(data.totals.savings_rate)],
      ["Reserva de emergência", `${data.totals.emergency_reserve_months.toFixed(1)} meses`],
      ["Cumprimento do plano de ação", fmtPct(data.totals.plan_completion_pct)],
    ],
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  // ═════════════ Gráficos visão geral ═════════════
  sectionTitle("Visão Geral em Gráficos");

  // Barras: Renda vs Despesas vs Dívida vs Sobra
  ensureSpace(70);
  const sobra = data.totals.total_income - data.totals.total_expenses - data.totals.monthly_debt_payments;
  drawBars(
    MARGIN, y + 4, CONTENT_W, 55,
    [
      { label: "Renda", value: data.totals.total_income, color: C.success },
      { label: "Despesas", value: data.totals.total_expenses, color: C.warning },
      { label: "Dívidas/mês", value: data.totals.monthly_debt_payments, color: C.danger },
      { label: "Sobra", value: sobra, color: sobra >= 0 ? C.primary : C.danger },
    ],
    "Fluxo de caixa mensal",
  );
  y += 65;

  // Donut despesas por categoria + Donut alocação ativos lado a lado
  // Agrupa despesas por categoria
  const expByCat = new Map<string, number>();
  data.expenses.forEach((e) => {
    const k = e.category || "Outros";
    expByCat.set(k, (expByCat.get(k) || 0) + (Number(e.amount) || 0));
  });
  const expItems = Array.from(expByCat.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value], i) => ({ label, value, color: CHART_PALETTE[i % CHART_PALETTE.length] }));

  const assetByType = new Map<string, number>();
  data.assets.forEach((a) => {
    const k = a.type || "Outros";
    assetByType.set(k, (assetByType.get(k) || 0) + (Number(a.estimated_value) || 0));
  });
  const assetItems = Array.from(assetByType.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value], i) => ({ label, value, color: CHART_PALETTE[i % CHART_PALETTE.length] }));

  if (expItems.length > 0 || assetItems.length > 0) {
    ensureSpace(70);
    const halfW = CONTENT_W / 2 - 3;

    // Despesas (esquerda)
    if (expItems.length > 0) {
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Despesas por categoria", MARGIN, y);
      drawDonut(MARGIN + 22, y + 32, 18, 9, expItems, "Despesas");
      drawLegend(MARGIN + 46, y + 14, halfW - 48, expItems);
    }
    // Ativos (direita)
    if (assetItems.length > 0) {
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Alocação de ativos", MARGIN + halfW + 6, y);
      drawDonut(MARGIN + halfW + 6 + 22, y + 32, 18, 9, assetItems, "Ativos");
      drawLegend(MARGIN + halfW + 6 + 46, y + 14, halfW - 48, assetItems);
    }
    y += 65;
  }

  // ═════════════ Objetivos ═════════════
  if (data.goals.length > 0) {
    sectionTitle("Progresso dos Objetivos", `${data.goals.length} objetivo(s)`);
    const overallPct =
      data.goals.reduce((s, g) => s + (g.tasksTotal || 0), 0) > 0
        ? Math.round(
            (data.goals.reduce((s, g) => s + (g.tasksDone || 0), 0) /
              data.goals.reduce((s, g) => s + (g.tasksTotal || 0), 0)) * 100
          )
        : 0;

    // Card resumo
    ensureSpace(18);
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "F");
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("PROGRESSO GERAL", MARGIN + 4, y + 5);
    pdf.setTextColor(...C.primary);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(`${overallPct}%`, MARGIN + 4, y + 11.5);
    drawProgressBar(MARGIN + 30, y + 8, CONTENT_W - 38, overallPct, C.accent);
    y += 18;

    // Cada objetivo
    data.goals.forEach((g) => {
      ensureSpace(20);
      const pct = g.pct ?? 0;
      const priorityColor =
        g.priority === "alta" ? C.danger : g.priority === "baixa" ? C.primaryLight : C.warning;

      pdf.setDrawColor(...C.border);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, "S");

      // Faixa lateral pela prioridade
      pdf.setFillColor(...priorityColor);
      pdf.rect(MARGIN, y, 1.5, 18, "F");

      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      const desc = g.description || "Objetivo";
      const descTrim = desc.length > 70 ? desc.slice(0, 70) + "…" : desc;
      pdf.text(descTrim, MARGIN + 4, y + 5);

      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      const meta: string[] = [];
      if (g.priority) meta.push(`Prioridade: ${g.priority}`);
      if (g.target_amount) meta.push(`Meta: ${fmtBRL(g.target_amount)}`);
      if (g.deadline) meta.push(`Prazo: ${g.deadline}`);
      meta.push(`${g.tasksDone ?? 0}/${g.tasksTotal ?? 0} ações`);
      pdf.text(meta.join("  ·  "), MARGIN + 4, y + 9.5);

      // Barra
      drawProgressBar(MARGIN + 4, y + 13, CONTENT_W - 30, pct, C.accent);
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(`${pct}%`, PAGE_W - MARGIN - 4, y + 14.5, { align: "right" });

      y += 21;
    });
    y += 2;
  }

  // ═════════════ Tabelas detalhadas ═════════════
  const addTable = (title: string, head: string[], body: any[][]) => {
    if (!body.length) return;
    sectionTitle(title);
    autoTable(pdf, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold" },
      alternateRowStyles: { fillColor: C.bgSoft },
      head: [head],
      body,
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  };

  addTable(
    "Receitas",
    ["Descrição", "Frequência", "Valor"],
    data.income.map((i) => [i.description ?? "—", i.frequency ?? "mensal", fmtBRL(i.amount)]),
  );

  addTable(
    "Despesas",
    ["Categoria", "Descrição", "Tipo", "Vcto", "Valor"],
    data.expenses.map((e) => [
      e.category ?? "—",
      e.description ?? "—",
      e.is_fixed ? "Fixa" : "Variável",
      e.due_day ? `dia ${e.due_day}` : "—",
      fmtBRL(e.amount),
    ]),
  );

  addTable(
    "Dívidas",
    ["Tipo", "Credor", "Saldo", "Parcela", "Juros"],
    data.debts.map((d) => [
      d.type ?? "—",
      d.creditor ?? "—",
      fmtBRL(d.total_amount),
      fmtBRL(d.monthly_payment),
      d.interest_rate ? `${d.interest_rate}%` : "—",
    ]),
  );

  addTable(
    "Ativos",
    ["Tipo", "Descrição", "Valor estimado"],
    data.assets.map((a) => [a.type ?? "—", a.description ?? "—", fmtBRL(a.estimated_value)]),
  );

  addTable(
    "Seguros",
    ["Tipo", "Operadora", "Cobertura", "Prêmio mensal"],
    data.insurance.map((s) => [s.type ?? "—", s.provider ?? "—", fmtBRL(s.coverage_amount), fmtBRL(s.monthly_premium)]),
  );

  addTable(
    "Plano de Ação",
    ["Ação", "Status", "Impacto", "Prazo"],
    data.actionItems.map((a) => [
      a.description ?? "—",
      a.status ?? "—",
      a.financial_impact ? fmtBRL(a.financial_impact) : "—",
      a.deadline ?? "—",
    ]),
  );

  // Observações
  if (data.notes) {
    sectionTitle("Observações do Consultor");
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...C.text);
    const lines = pdf.splitTextToSize(data.notes, CONTENT_W);
    ensureSpace(lines.length * 4 + 4);
    pdf.text(lines, MARGIN, y);
    y += lines.length * 4 + 6;
  }

  addFooter();

  const safeName = data.clientName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeMonth = data.monthLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  pdf.save(`fechamento-${safeName}-${safeMonth}.pdf`);
}
