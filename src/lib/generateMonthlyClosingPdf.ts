import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface MonthlyClosingPdfData {
  clientName: string;
  monthLabel: string; // ex: "Outubro 2025"
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

const fmtBRL = (v?: number | null) =>
  v == null ? "—" : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v?: number | null) => (v == null ? "—" : `${Number(v).toFixed(1)}%`);

export async function generateMonthlyClosingPdf(data: MonthlyClosingPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Cabeçalho
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Fechamento Mensal", margin, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.monthLabel, margin, 55);
  doc.setFontSize(9);
  doc.text(`Cliente: ${data.clientName}`, pageW - margin, 35, { align: "right" });
  doc.text(`Fechado em: ${data.closedAt}`, pageW - margin, 50, { align: "right" });
  if (data.closedByLabel) {
    doc.text(`Por: ${data.closedByLabel}`, pageW - margin, 65, { align: "right" });
  }

  y = 100;
  doc.setTextColor(15, 23, 42);

  // Resumo executivo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumo Executivo", margin, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    head: [["Indicador", "Valor"]],
    body: [
      ["Receita total", fmtBRL(data.totals.total_income)],
      ["Despesas totais", fmtBRL(data.totals.total_expenses)],
      ["Pagamentos mensais de dívida", fmtBRL(data.totals.monthly_debt_payments)],
      ["Ativos totais", fmtBRL(data.totals.total_assets)],
      ["Dívidas totais", fmtBRL(data.totals.total_debts)],
      ["Patrimônio líquido", fmtBRL(data.totals.net_worth)],
      ["Taxa de poupança", fmtPct(data.totals.savings_rate)],
      ["Reserva de emergência", `${data.totals.emergency_reserve_months.toFixed(1)} meses`],
      ["Cumprimento do plano", fmtPct(data.totals.plan_completion_pct)],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 18;

  const section = (title: string) => {
    if (y > 740) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 8;
  };

  // Receitas
  if (data.income.length) {
    section("Receitas");
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin }, theme: "striped",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Descrição", "Frequência", "Valor"]],
      body: data.income.map((i) => [i.description ?? "—", i.frequency ?? "mensal", fmtBRL(i.amount)]),
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Despesas
  if (data.expenses.length) {
    section("Despesas");
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin }, theme: "striped",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Categoria", "Descrição", "Tipo", "Vcto", "Valor"]],
      body: data.expenses.map((e) => [
        e.category ?? "—",
        e.description ?? "—",
        e.is_fixed ? "Fixa" : "Variável",
        e.due_day ? `dia ${e.due_day}` : "—",
        fmtBRL(e.amount),
      ]),
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Dívidas
  if (data.debts.length) {
    section("Dívidas");
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin }, theme: "striped",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Tipo", "Credor", "Saldo", "Parcela", "Juros"]],
      body: data.debts.map((d) => [
        d.type ?? "—",
        d.creditor ?? "—",
        fmtBRL(d.total_amount),
        fmtBRL(d.monthly_payment),
        d.interest_rate ? `${d.interest_rate}%` : "—",
      ]),
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Ativos
  if (data.assets.length) {
    section("Ativos");
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin }, theme: "striped",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Tipo", "Descrição", "Valor estimado"]],
      body: data.assets.map((a) => [a.type ?? "—", a.description ?? "—", fmtBRL(a.estimated_value)]),
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Seguros
  if (data.insurance.length) {
    section("Seguros");
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin }, theme: "striped",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Tipo", "Operadora", "Cobertura", "Prêmio mensal"]],
      body: data.insurance.map((s) => [s.type ?? "—", s.provider ?? "—", fmtBRL(s.coverage_amount), fmtBRL(s.monthly_premium)]),
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Objetivos
  if (data.goals.length) {
    section("Objetivos");
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin }, theme: "striped",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Objetivo", "Prioridade", "Meta", "Prazo", "Progresso"]],
      body: data.goals.map((g) => [
        g.description ?? "—",
        g.priority ?? "—",
        g.target_amount ? fmtBRL(g.target_amount) : "—",
        g.deadline ?? "—",
        `${g.pct ?? 0}% (${g.tasksDone ?? 0}/${g.tasksTotal ?? 0})`,
      ]),
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Plano de ação
  if (data.actionItems.length) {
    section("Plano de Ação");
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin }, theme: "striped",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Ação", "Status", "Impacto", "Prazo"]],
      body: data.actionItems.map((a) => [
        a.description ?? "—",
        a.status ?? "—",
        a.financial_impact ? fmtBRL(a.financial_impact) : "—",
        a.deadline ?? "—",
      ]),
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Notas
  if (data.notes) {
    if (y > 720) { doc.addPage(); y = margin; }
    section("Observações");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(data.notes, pageW - margin * 2);
    doc.text(lines, margin, y);
  }

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${pages}`, pageW - margin, 825, { align: "right" });
    doc.text("Novare — Fechamento Mensal", margin, 825);
  }

  const safeName = data.clientName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeMonth = data.monthLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`fechamento-${safeName}-${safeMonth}.pdf`);
}
