import { useState } from "react";
import { generateReportPdf, type ReportData } from "@/lib/generateReportPdf";

// Página de DEV (somente localhost) para inspecionar o PDF do relatório
// sem precisar de login/dados reais. Remover depois.
const today = new Date();
const dStr = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const SAMPLE: ReportData = {
  clientName: "Mariana Albuquerque",
  clientEmail: "mariana@exemplo.com",
  cpf: undefined, // sem CPF na amostra p/ não criptografar o PDF de inspeção
  profession: "Médica",
  risk: "C",
  riskLabel: "Atenção",
  riskDescription:
    "A capacidade de poupança está abaixo do ideal. Há margem para otimizar despesas e acelerar a construção de reserva.",
  savingsRate: 30.9,
  debtRatio: 22.6,
  expenseRatio: 69.1,
  totalIncome: 12010,
  totalExpenses: 5587,
  totalDebts: 213685,
  monthlyDebtPayments: 2714,
  totalAssets: 307000,
  netWorth: 93315,
  netCashFlow: 3707,
  incomes: [
    { description: "Salário CLT Bruno", amount: 12010, frequency: "mensal", is_primary: true },
  ],
  expensesByCategory: [
    { category: "Moradia", amount: 5200, percentage: 30 },
    { category: "Alimentação", amount: 3100, percentage: 18 },
    { category: "Transporte", amount: 1800, percentage: 10 },
    { category: "Educação", amount: 2400, percentage: 14 },
    { category: "Lazer", amount: 1500, percentage: 9 },
    { category: "Saúde", amount: 1280, percentage: 7 },
    { category: "Outros", amount: 2000, percentage: 12 },
  ],
  debts: [
    { type: "Consultoria financeira", creditor: "NOVARE CONSULTORIA DE INVESTIMENTOS", total_amount: 4185, monthly_payment: 279, remaining_months: 15 },
    { type: "Financiamento imobiliário", creditor: "Caixa Econômica", total_amount: 201000, monthly_payment: 1750, remaining_months: 276 },
    { type: "Empréstimo pessoal", creditor: "Nubank", total_amount: 8500, monthly_payment: 685, remaining_months: 21 },
  ],
  assets: [
    { type: "Imóvel", description: "Casa", estimated_value: 230000 },
    { type: "Investimento", description: "Reserva de Emergência", estimated_value: 44000 },
    { type: "Outros", description: "Trailer", estimated_value: 18000 },
    { type: "Veículo", description: "Carro", estimated_value: 15000 },
  ],
  insurance: [
    { type: "Vida", provider: "Empresa - FortBras", monthly_premium: 0, coverage_amount: 0 },
    { type: "Auto", provider: "Porto Seguro", monthly_premium: 197, coverage_amount: 200000 },
  ],
  goals: [
    { description: "Reserva de emergência (6 meses)", priority: "alta", target_amount: 104000, deadline: dStr(300), pct: 65, tasksDone: 4, tasksTotal: 6 },
    { description: "Quitar cartão de crédito", priority: "alta", target_amount: 25000, deadline: dStr(40), pct: 40, tasksDone: 2, tasksTotal: 5 },
    { description: "Educação dos filhos", priority: "média", target_amount: 18000, deadline: dStr(3800), pct: 0, tasksDone: 0, tasksTotal: 0 },
    { description: "Abrir negócio próprio", priority: "média", target_amount: 10000, deadline: dStr(-15), pct: 0, tasksDone: 0, tasksTotal: 0 },
    { description: "Investir / multiplicar patrimônio", priority: "média", target_amount: 400, deadline: dStr(360), pct: 0, tasksDone: 0, tasksTotal: 0 },
    { description: "Viagem", priority: "baixa", target_amount: 7000, deadline: dStr(700), pct: 20, tasksDone: 1, tasksTotal: 5 },
    { description: "Aposentadoria", priority: "média", target_amount: 2000000, deadline: dStr(7300), pct: 12, tasksDone: 1, tasksTotal: 8 },
  ],
  actionItems: [
    { title: "Renegociar taxa do cartão", status: "completed", priority: "alta", financial_impact: 1200, deadline: dStr(-20) },
    { title: "Automatizar aporte mensal na reserva", status: "completed", priority: "alta", financial_impact: 2000, deadline: dStr(-10) },
    { title: "Revisar plano de saúde", status: "in_progress", priority: "média", financial_impact: 300, deadline: dStr(30) },
    { title: "Criar previdência privada", status: "pending", priority: "média", financial_impact: 800, deadline: dStr(60) },
  ],
  totalImpact: 4300,
  completedActions: 2,
  totalActions: 4,
  planPct: 50,
  snapshots: [
    { snapshot_date: dStr(-180), total_assets: 460000, total_debts: 168000, savings_rate: 6 },
    { snapshot_date: dStr(-120), total_assets: 480000, total_debts: 162000, savings_rate: 8.5 },
    { snapshot_date: dStr(-60), total_assets: 500000, total_debts: 154000, savings_rate: 10 },
    { snapshot_date: dStr(-15), total_assets: 520000, total_debts: 145000, savings_rate: 12.5 },
  ],
  parecerMetas: [
    {
      sourceLabel: "Reserva de emergência", sourceTable: "assets", metaValor: 104000, prazo: dStr(300),
      latestValor: 67600, latestEstado: "em dia", progressPct: 65, totalLancamentos: 4,
      history: [
        { date: dStr(-180), valor: 30000, pct: 29, estado: "atrasada" },
        { date: dStr(-120), valor: 45000, pct: 43, estado: "em dia" },
        { date: dStr(-60), valor: 58000, pct: 56, estado: "em dia" },
        { date: dStr(-15), valor: 67600, pct: 65, estado: "em dia" },
      ],
    },
    {
      sourceLabel: "Quitar cartão", sourceTable: "debts", metaValor: 25000, prazo: dStr(180),
      latestValor: 10000, latestEstado: "em dia", progressPct: 40, totalLancamentos: 3,
      history: [
        { date: dStr(-120), valor: 2000, pct: 8, estado: "atrasada" },
        { date: dStr(-60), valor: 6000, pct: 24, estado: "em dia" },
        { date: dStr(-15), valor: 10000, pct: 40, estado: "em dia" },
      ],
    },
    {
      sourceLabel: "Aposentadoria", sourceTable: "assets", metaValor: 2000000, prazo: dStr(7300),
      latestValor: 240000, latestEstado: "em dia", progressPct: 12, totalLancamentos: 2,
      history: [
        { date: dStr(-120), valor: 180000, pct: 9, estado: "em dia" },
        { date: dStr(-15), valor: 240000, pct: 12, estado: "em dia" },
      ],
    },
    {
      sourceLabel: "Empréstimo pessoal — Nubank", sourceTable: "debts", metaValor: 8500, prazo: dStr(160),
      latestValor: 3000, latestEstado: "em dia", progressPct: 35, totalLancamentos: 1,
      history: [{ date: dStr(-15), valor: 3000, pct: 35, estado: "em dia" }],
    },
    {
      sourceLabel: "CONSULTORIA FINANCEIRA — NOVARE CONSULTORIA", sourceTable: "debts", metaValor: 4185, prazo: dStr(120),
      latestValor: 1000, latestEstado: "em dia", progressPct: 24, totalLancamentos: 1,
      history: [{ date: dStr(-15), valor: 1000, pct: 24, estado: "em dia" }],
    },
    {
      sourceLabel: "alimentacao — Supermercado do mês", sourceTable: "expenses", metaValor: 100, prazo: dStr(20),
      latestValor: undefined, latestEstado: undefined, progressPct: undefined, totalLancamentos: 0, history: [],
    },
    {
      sourceLabel: "outros — Filhos/Fraldas e Leite", sourceTable: "income", metaValor: 90, prazo: dStr(20),
      latestValor: undefined, latestEstado: undefined, progressPct: undefined, totalLancamentos: 0, history: [],
    },
    {
      sourceLabel: "Reduzir despesas fixas", sourceTable: "expenses", metaValor: 0, prazo: dStr(-5),
      latestValor: undefined, latestEstado: undefined, progressPct: undefined, totalLancamentos: 0,
      history: [],
    },
  ],
  monthlyClosings: [
    {
      date: dStr(-60), totalAssets: 500000, totalDebts: 154000, savingsRate: 10,
      metas: [
        { label: "Reserva de emergência", valor: 58000, estado: "em dia", pct: 56 },
        { label: "Quitar cartão", valor: 6000, estado: "em dia", pct: 24 },
      ],
    },
    {
      date: dStr(-15), totalAssets: 520000, totalDebts: 145000, savingsRate: 12.5,
      metas: [
        { label: "Reserva de emergência", valor: 67600, estado: "em dia", pct: 65 },
        { label: "Quitar cartão", valor: 10000, estado: "em dia", pct: 40 },
      ],
    },
  ],
  activePlan: {
    objective: "Construir reserva de emergência e eliminar dívidas de alto custo em 12 meses.",
    appliedVariant: "B",
    appliedAt: dStr(-30),
    variants: [
      {
        letter: "A", title: "Conservador", approach: "Foco em segurança e liquidez", horizon_months: 18, monthly_impact: 2500,
        actions: [
          { area: "Reserva", description: "Aporte de R$ 2.000/mês em CDB liquidez diária", objective: "Reserva de 6 meses", financial_impact: 2000, deadline_offset_days: 30 },
          { area: "Dívidas", description: "Pagamento mínimo do cartão", objective: "Manter fluxo", financial_impact: 500, deadline_offset_days: 30 },
        ],
      },
      {
        letter: "B", title: "Equilibrado", approach: "Equilíbrio entre quitar dívida e poupar", horizon_months: 12, monthly_impact: 3200,
        actions: [
          { area: "Dívidas", description: "Renegociar e amortizar cartão", objective: "Quitar em 12 meses", financial_impact: 1200, deadline_offset_days: 45 },
          { area: "Reserva", description: "Aporte de R$ 1.500/mês", objective: "Reserva de 4 meses", financial_impact: 1500, deadline_offset_days: 30 },
          { area: "Renda", description: "Otimizar plantões de maior valor", objective: "Aumentar renda líquida", financial_impact: 500, deadline_offset_days: 60 },
        ],
      },
      {
        letter: "C", title: "Acelerado", approach: "Máxima velocidade na quitação", horizon_months: 9, monthly_impact: 4000,
        actions: [
          { area: "Dívidas", description: "Amortização agressiva do cartão", objective: "Quitar em 6 meses", financial_impact: 2500, deadline_offset_days: 30 },
        ],
      },
    ],
  },
  goalsAnalysisComment:
    "As metas evoluíram de forma consistente nos últimos meses. A reserva de emergência atingiu 65% do alvo, acima do ritmo esperado.\n\nRecomenda-se manter o aporte automático e revisar a estratégia de quitação do cartão para acelerar a redução de juros.",
  consultants: [
    { name: "Jefferson Freitas", role: "Sócio-fundador", certs: "CEA · CNEP-I · CFDe" },
    { name: "Leonardo Freitas de Oliveira", role: "Sócio-fundador", certs: "CEA" },
  ],
  periodLabel: "junho de 2026",
  parecer: {
    title: "Diagnóstico e recomendações",
    content:
      "<p>O quadro financeiro atual é <strong>equilibrado, porém com margem clara de melhoria</strong>. A renda é consistente e o patrimônio relevante, mas a taxa de poupança ainda está abaixo do potencial.</p>" +
      "<p>Recomendações prioritárias para os próximos meses:</p>" +
      "<ul>" +
      "<li>Renegociar a dívida de maior custo (cartão) e direcionar a economia de juros para a reserva de emergência.</li>" +
      "<li>Automatizar um aporte mensal fixo, tratando a poupança como uma despesa obrigatória.</li>" +
      "<li>Revisar despesas variáveis (lazer e outros), com meta de reduzir 10% no trimestre.</li>" +
      "<li>Estruturar a previdência de longo prazo assim que a reserva atingir 4 meses de despesas.</li>" +
      "</ul>" +
      "<p>Seguindo o plano, a expectativa é elevar a taxa de poupança para a faixa saudável (acima de 20%) em até 6 meses.</p>",
  },
};

export default function ReportPreview() {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>DEV · Preview do Relatório PDF</h1>
      <p>Página temporária só para inspecionar o PDF gerado.</p>
      <button
        id="gen-pdf"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await generateReportPdf(SAMPLE);
          } finally {
            setBusy(false);
          }
        }}
        style={{ padding: "12px 24px", fontSize: 16, cursor: "pointer" }}
      >
        {busy ? "Gerando…" : "Gerar PDF de amostra"}
      </button>
    </div>
  );
}
