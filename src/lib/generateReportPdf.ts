import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ──────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────
export interface ReportData {
  clientName: string;
  clientEmail?: string;
  profession?: string;
  risk: string;
  riskLabel: string;
  riskDescription: string;
  savingsRate: number;
  debtRatio: number;
  expenseRatio: number;
  totalIncome: number;
  totalExpenses: number;
  totalDebts: number;
  monthlyDebtPayments: number;
  totalAssets: number;
  netWorth: number;
  netCashFlow: number;
  incomes: Array<{ description: string; amount: number; frequency?: string; is_primary?: boolean }>;
  expensesByCategory: Array<{ category: string; amount: number; percentage: number }>;
  debts: Array<{ type: string; creditor?: string; total_amount?: number; monthly_payment?: number; interest_rate?: number; remaining_months?: number }>;
  assets: Array<{ type: string; description?: string; estimated_value?: number }>;
  insurance: Array<{ type: string; provider?: string; monthly_premium?: number; coverage_amount?: number }>;
  goals: Array<{ description: string; priority?: string; target_amount?: number; deadline?: string; pct: number; tasksDone: number; tasksTotal: number }>;
  actionItems: Array<{ title: string; status?: string; priority?: string; financial_impact?: number; deadline?: string }>;
  totalImpact: number;
  completedActions: number;
  totalActions: number;
  planPct: number;
}

// ──────────────────────────────────────────────────────────
// Paleta (RGB para jsPDF)
// ──────────────────────────────────────────────────────────
const C = {
  primary: [30, 58, 95] as [number, number, number],          // azul Novare
  primaryLight: [99, 140, 192] as [number, number, number],
  accent: [217, 119, 87] as [number, number, number],         // terracota
  text: [30, 30, 35] as [number, number, number],
  muted: [120, 120, 130] as [number, number, number],
  border: [228, 228, 232] as [number, number, number],
  bgSoft: [248, 248, 250] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const RISK_COLORS: Record<string, [number, number, number]> = {
  A: C.success,
  B: [37, 99, 235],
  C: C.warning,
  D: [234, 88, 12],
  E: C.danger,
};

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
const fmt = (v: number) =>
  `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${(v || 0).toFixed(1)}%`;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ──────────────────────────────────────────────────────────
// Geração
// ──────────────────────────────────────────────────────────
export async function generateReportPdf(data: ReportData): Promise<void> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = 0;
  let pageNumber = 1;
  let sectionNum = 0;

  // ─── Helpers internos ────────────────────────────────
  const addHeader = () => {
    pdf.setFillColor(...C.primary);
    pdf.rect(0, 0, PAGE_W, 10, "F");
    pdf.setTextColor(...C.white);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text("MÉTODO NOVARE  •  Relatório de Consultoria", MARGIN, 6.5);
    pdf.text(data.clientName, PAGE_W - MARGIN, 6.5, { align: "right" });
  };

  const addFooter = () => {
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    pdf.setTextColor(...C.muted);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      MARGIN,
      PAGE_H - 7
    );
    pdf.text(`Página ${pageNumber}`, PAGE_W - MARGIN, PAGE_H - 7, { align: "right" });
  };

  const newPage = () => {
    addFooter();
    pdf.addPage();
    pageNumber++;
    addHeader();
    y = 20;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - 18) newPage();
  };

  const sectionHeader = (title: string, subtitle?: string) => {
    sectionNum++;
    ensureSpace(20);
    // Bullet com número
    pdf.setFillColor(...C.primary);
    pdf.roundedRect(MARGIN, y, 8, 8, 1.5, 1.5, "F");
    pdf.setTextColor(...C.white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(String(sectionNum), MARGIN + 4, y + 5.7, { align: "center" });

    pdf.setTextColor(...C.text);
    pdf.setFontSize(13);
    pdf.text(title, MARGIN + 12, y + 4);
    if (subtitle) {
      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(subtitle, MARGIN + 12, y + 8.5);
    }
    y += subtitle ? 14 : 11;

    // Linha separadora
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  };

  const paragraph = (text: string, size = 9.5, color: [number, number, number] = C.text) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, CONTENT_W);
    ensureSpace(lines.length * (size * 0.42));
    pdf.text(lines, MARGIN, y);
    y += lines.length * (size * 0.42) + 2;
  };

  // ═════════════ CAPA ═════════════
  pdf.setFillColor(...C.primary);
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Detalhes decorativos
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.04 }));
  pdf.circle(PAGE_W - 20, 40, 60, "F");
  pdf.circle(20, PAGE_H - 60, 80, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  pdf.setTextColor(...C.white);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  // letter-spacing manual
  pdf.text("M É T O D O   N O V A R E", MARGIN, 50);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(34);
  pdf.text("Relatório de", MARGIN, 95);
  pdf.text("Consultoria", MARGIN, 108);
  pdf.text("Financeira", MARGIN, 121);

  // Linha
  pdf.setDrawColor(...C.accent);
  pdf.setLineWidth(1);
  pdf.line(MARGIN, 132, MARGIN + 50, 132);

  // Dados do cliente
  const dy = 150;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.5 }));
  pdf.text("CLIENTE", MARGIN, dy);
  pdf.setGState(pdf.GState({ opacity: 1 }));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(data.clientName, MARGIN, dy + 6);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setGState(pdf.GState({ opacity: 0.5 }));
  pdf.text("DATA DE EMISSÃO", MARGIN, dy + 18);
  pdf.setGState(pdf.GState({ opacity: 1 }));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(
    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    MARGIN,
    dy + 24
  );

  if (data.profession) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setGState(pdf.GState({ opacity: 0.5 }));
    pdf.text("PROFISSÃO", MARGIN, dy + 36);
    pdf.setGState(pdf.GState({ opacity: 1 }));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(data.profession, MARGIN, dy + 42);
  }

  // Rodapé da capa
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setGState(pdf.GState({ opacity: 0.4 }));
  pdf.text("Documento confidencial · Para uso exclusivo do cliente", MARGIN, PAGE_H - 18);
  pdf.setGState(pdf.GState({ opacity: 1 }));

  // ═════════════ Páginas internas ═════════════
  newPage();

  // ── 1. Metodologia
  sectionHeader("Método Novare", "Nossa abordagem em 5 etapas");
  paragraph(
    "O Método Novare é uma abordagem estruturada para organização, clareza e direção financeira, desenvolvida para oferecer resultados mensuráveis em cada etapa do processo."
  );
  y += 2;

  const steps = [
    { n: "1", title: "Mapear", desc: "Coleta estruturada" },
    { n: "2", title: "Diagnosticar", desc: "Análise completa" },
    { n: "3", title: "Planejar", desc: "Plano personalizado" },
    { n: "4", title: "Implementar", desc: "Execução assistida" },
    { n: "5", title: "Acompanhar", desc: "Monitoramento contínuo" },
  ];
  const stepW = (CONTENT_W - 4 * 2) / 5;
  ensureSpace(28);
  steps.forEach((s, i) => {
    const sx = MARGIN + i * (stepW + 2);
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(sx, y, stepW, 26, 2, 2, "F");
    pdf.setFillColor(...C.accent);
    pdf.roundedRect(sx + stepW / 2 - 4, y + 3, 8, 8, 1.5, 1.5, "F");
    pdf.setTextColor(...C.white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(s.n, sx + stepW / 2, y + 8.7, { align: "center" });
    pdf.setTextColor(...C.text);
    pdf.setFontSize(8.5);
    pdf.text(s.title, sx + stepW / 2, y + 16, { align: "center" });
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(s.desc, sx + stepW / 2, y + 21, { align: "center" });
  });
  y += 32;

  // ── 2. Classificação
  sectionHeader("Classificação de Risco", "Saúde financeira baseada na capacidade de poupança");
  const riskColor = RISK_COLORS[data.risk] || C.warning;
  ensureSpace(40);

  // Card classificação
  pdf.setFillColor(...C.bgSoft);
  pdf.roundedRect(MARGIN, y, CONTENT_W, 36, 2, 2, "F");

  // Letra grande
  pdf.setFillColor(...riskColor);
  pdf.roundedRect(MARGIN + 4, y + 4, 28, 28, 2, 2, "F");
  pdf.setTextColor(...C.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text(data.risk, MARGIN + 18, y + 22, { align: "center" });
  pdf.setFontSize(7);
  pdf.text(data.riskLabel.toUpperCase(), MARGIN + 18, y + 28, { align: "center" });

  // Métricas ao lado
  pdf.setTextColor(...C.text);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const desc = pdf.splitTextToSize(data.riskDescription, CONTENT_W - 50);
  pdf.text(desc, MARGIN + 38, y + 9);

  const metrics = [
    { l: "Poupança", v: fmtPct(data.savingsRate), c: riskColor },
    { l: "Comprometimento", v: fmtPct(data.debtRatio), c: data.debtRatio > 30 ? C.danger : C.text },
    { l: "Despesas/Renda", v: fmtPct(data.expenseRatio), c: data.expenseRatio > 80 ? C.warning : C.text },
  ];
  const mw = (CONTENT_W - 42) / 3;
  metrics.forEach((m, i) => {
    const mx = MARGIN + 38 + i * mw;
    pdf.setTextColor(...C.muted);
    pdf.setFontSize(6.5);
    pdf.text(m.l.toUpperCase(), mx, y + 25);
    pdf.setTextColor(...m.c);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(m.v, mx, y + 31);
  });
  y += 42;

  // ── 3. Balanço
  sectionHeader("Balanço Patrimonial", "Visão consolidada de ativos e passivos");
  ensureSpace(28);
  const cards = [
    { label: "Ativos Totais", value: fmt(data.totalAssets), color: [37, 99, 235] as [number, number, number] },
    { label: "Passivos Totais", value: fmt(data.totalDebts), color: C.danger },
    { label: "Patrimônio Líquido", value: fmt(data.netWorth), color: data.netWorth >= 0 ? C.success : C.danger },
  ];
  const cw = (CONTENT_W - 4 * 2) / 3;
  cards.forEach((c, i) => {
    const cx = MARGIN + i * (cw + 2);
    pdf.setFillColor(...C.white);
    pdf.setDrawColor(...C.border);
    pdf.roundedRect(cx, y, cw, 22, 2, 2, "FD");
    pdf.setFillColor(...c.color);
    pdf.rect(cx, y, 1.5, 22, "F");
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(c.label.toUpperCase(), cx + 5, y + 7);
    pdf.setTextColor(...c.color);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(c.value, cx + 5, y + 15);
  });
  y += 28;

  if (data.assets.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [["Tipo", "Descrição", "Valor"]],
      body: data.assets.map((a) => [
        (a.type || "").charAt(0).toUpperCase() + (a.type || "").slice(1),
        a.description || "—",
        fmt(a.estimated_value || 0),
      ]),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2.5, textColor: C.text },
      headStyles: { fillColor: C.bgSoft, textColor: C.muted, fontSize: 7.5, fontStyle: "bold" },
      columnStyles: { 2: { halign: "right", fontStyle: "bold" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // ── 4. Fluxo de caixa
  sectionHeader("Fluxo de Caixa Mensal", "Receitas, despesas e saldo líquido");

  // Receitas
  if (data.incomes.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [[{ content: "Receitas", colSpan: 2, styles: { halign: "left", textColor: C.success, fontSize: 9.5 } }]],
      body: [
        ...data.incomes.map((i) => [
          i.description + (i.is_primary ? "  ★" : ""),
          fmt(i.frequency === "anual" ? (i.amount || 0) / 12 : i.amount || 0),
        ]),
        [{ content: "Total Receitas", styles: { fontStyle: "bold" } }, { content: fmt(data.totalIncome), styles: { fontStyle: "bold", textColor: C.success } }],
      ],
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2.2 },
      headStyles: { fillColor: C.bgSoft },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 4;
  }

  // Despesas
  if (data.expensesByCategory.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [[{ content: "Despesas por categoria", colSpan: 3, styles: { halign: "left", textColor: C.danger, fontSize: 9.5 } }]],
      body: [
        ...data.expensesByCategory.map((e) => [e.category, `${e.percentage}%`, fmt(e.amount)]),
        ...(data.monthlyDebtPayments > 0
          ? [["Parcelas de dívidas", "—", fmt(data.monthlyDebtPayments)]]
          : []),
        [
          { content: "Total Saídas", styles: { fontStyle: "bold" } },
          "",
          { content: fmt(data.totalExpenses + data.monthlyDebtPayments), styles: { fontStyle: "bold", textColor: C.danger } },
        ],
      ],
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2.2 },
      headStyles: { fillColor: C.bgSoft },
      columnStyles: { 1: { halign: "right", textColor: C.muted, cellWidth: 20 }, 2: { halign: "right" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 4;
  }

  // Saldo líquido
  ensureSpace(20);
  const saldoColor = data.netCashFlow >= 0 ? C.success : C.danger;
  pdf.setFillColor(...C.bgSoft);
  pdf.roundedRect(MARGIN, y, CONTENT_W, 16, 2, 2, "F");
  pdf.setFillColor(...saldoColor);
  pdf.rect(MARGIN, y, 1.5, 16, "F");
  pdf.setTextColor(...C.text);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Saldo Líquido Mensal", MARGIN + 5, y + 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.muted);
  pdf.text("Receitas − Despesas − Parcelas", MARGIN + 5, y + 12);
  pdf.setTextColor(...saldoColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(
    `${data.netCashFlow >= 0 ? "+" : ""}${fmt(data.netCashFlow)}`,
    PAGE_W - MARGIN - 3,
    y + 11,
    { align: "right" }
  );
  y += 22;

  // ── 5. Dívidas
  if (data.debts.length > 0) {
    sectionHeader("Mapa de Dívidas", `${data.debts.length} dívida${data.debts.length !== 1 ? "s" : ""} ativa${data.debts.length !== 1 ? "s" : ""}`);
    autoTable(pdf, {
      startY: y,
      head: [["Tipo", "Credor", "Saldo", "Parcela", "Juros", "Prazo"]],
      body: [
        ...data.debts.map((d) => [
          (d.type || "").charAt(0).toUpperCase() + (d.type || "").slice(1),
          d.creditor || "—",
          fmt(d.total_amount || 0),
          fmt(d.monthly_payment || 0),
          d.interest_rate ? `${d.interest_rate}% a.m.` : "—",
          d.remaining_months ? `${d.remaining_months} m` : "—",
        ]),
        [
          { content: "Total", colSpan: 2, styles: { fontStyle: "bold" } },
          { content: fmt(data.totalDebts), styles: { fontStyle: "bold" } },
          { content: fmt(data.monthlyDebtPayments), styles: { fontStyle: "bold" } },
          "",
          "",
        ],
      ],
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8 },
      alternateRowStyles: { fillColor: C.bgSoft },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // ── 6. Seguros
  if (data.insurance.length > 0) {
    sectionHeader("Proteção e Seguros", "Cobertura de riscos e seguros ativos");
    autoTable(pdf, {
      startY: y,
      head: [["Tipo", "Seguradora", "Prêmio Mensal", "Cobertura"]],
      body: data.insurance.map((i) => [
        i.type,
        i.provider || "—",
        fmt(i.monthly_premium || 0),
        fmt(i.coverage_amount || 0),
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8 },
      alternateRowStyles: { fillColor: C.bgSoft },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // ── 7. Objetivos
  if (data.goals.length > 0) {
    sectionHeader(
      "Objetivos Financeiros",
      `${data.goals.length} objetivo${data.goals.length !== 1 ? "s" : ""} • Progresso: ${data.planPct}%`
    );

    // Barra geral
    ensureSpace(18);
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "F");
    pdf.setTextColor(...C.text);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Progresso Geral", MARGIN + 4, y + 5);
    pdf.setTextColor(...C.accent);
    pdf.text(`${data.planPct}%`, PAGE_W - MARGIN - 4, y + 5, { align: "right" });
    // Barra
    const barW = CONTENT_W - 8;
    pdf.setFillColor(220, 220, 225);
    pdf.roundedRect(MARGIN + 4, y + 8, barW, 2.5, 1, 1, "F");
    pdf.setFillColor(...C.accent);
    pdf.roundedRect(MARGIN + 4, y + 8, (barW * data.planPct) / 100, 2.5, 1, 1, "F");
    y += 18;

    data.goals.forEach((g) => {
      ensureSpace(20);
      pdf.setDrawColor(...C.border);
      pdf.setFillColor(...C.white);
      pdf.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, "FD");

      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      const gtitle = pdf.splitTextToSize(g.description, CONTENT_W - 50)[0];
      pdf.text(gtitle, MARGIN + 4, y + 5.5);

      // Prioridade
      const prio = (g.priority || "media").toLowerCase();
      const prioColor = prio === "alta" ? C.danger : prio === "baixa" ? [37, 99, 235] as [number, number, number] : C.warning;
      const prioLabel = prio === "alta" ? "Alta" : prio === "baixa" ? "Baixa" : "Média";
      pdf.setFillColor(...prioColor);
      pdf.setGState(pdf.GState({ opacity: 0.12 }));
      pdf.roundedRect(PAGE_W - MARGIN - 22, y + 2.5, 18, 4.5, 1, 1, "F");
      pdf.setGState(pdf.GState({ opacity: 1 }));
      pdf.setTextColor(...prioColor);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(prioLabel, PAGE_W - MARGIN - 13, y + 5.5, { align: "center" });

      // Subline
      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      const meta: string[] = [];
      if (g.target_amount) meta.push(`Meta: ${fmt(g.target_amount)}`);
      if (g.deadline) meta.push(`Prazo: ${new Date(g.deadline).toLocaleDateString("pt-BR")}`);
      meta.push(`${g.tasksDone}/${g.tasksTotal} ações`);
      pdf.text(meta.join("  •  "), MARGIN + 4, y + 10);

      // Progress bar
      pdf.setFillColor(220, 220, 225);
      pdf.roundedRect(MARGIN + 4, y + 13, CONTENT_W - 30, 1.8, 0.8, 0.8, "F");
      pdf.setFillColor(...C.accent);
      pdf.roundedRect(MARGIN + 4, y + 13, ((CONTENT_W - 30) * g.pct) / 100, 1.8, 0.8, 0.8, "F");
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(`${g.pct}%`, PAGE_W - MARGIN - 4, y + 14.5, { align: "right" });

      y += 22;
    });
  }

  // ── 8. Plano de ação
  if (data.actionItems.length > 0) {
    sectionHeader("Plano de Ação", `${data.completedActions}/${data.totalActions} ações concluídas`);

    autoTable(pdf, {
      startY: y,
      head: [["Ação", "Prioridade", "Status", "Impacto", "Prazo"]],
      body: data.actionItems.slice(0, 30).map((a) => [
        a.title,
        (a.priority || "—").charAt(0).toUpperCase() + (a.priority || "—").slice(1),
        a.status === "concluido" ? "Concluído" : a.status === "em_andamento" ? "Em andamento" : "Pendente",
        a.financial_impact ? fmt(a.financial_impact) : "—",
        a.deadline ? new Date(a.deadline).toLocaleDateString("pt-BR") : "—",
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.2, valign: "middle" },
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 7.5 },
      alternateRowStyles: { fillColor: C.bgSoft },
      columnStyles: {
        0: { cellWidth: "auto" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;

    // Impacto total
    ensureSpace(14);
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, "F");
    pdf.setTextColor(...C.text);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Impacto Financeiro Estimado", MARGIN + 4, y + 7.5);
    pdf.setTextColor(...C.success);
    pdf.setFontSize(13);
    pdf.text(fmt(data.totalImpact), PAGE_W - MARGIN - 4, y + 8, { align: "right" });
    y += 18;
  }

  // ── Fechamento
  ensureSpace(30);
  y += 4;
  pdf.setDrawColor(...C.accent);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y, MARGIN + 30, y);
  y += 6;
  pdf.setTextColor(...C.text);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Próximos passos", MARGIN, y);
  y += 6;
  paragraph(
    "Este relatório consolida o diagnóstico, plano e indicadores do seu acompanhamento financeiro. Recomendamos revisão a cada 90 dias para reavaliar metas, atualizar dados e ajustar o plano conforme novas oportunidades.",
    9,
    C.muted
  );

  // Footer última página
  addFooter();

  // Salvar
  const fileName = `Relatorio_${data.clientName.replace(/\s+/g, "_")}_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  pdf.save(fileName);
}
