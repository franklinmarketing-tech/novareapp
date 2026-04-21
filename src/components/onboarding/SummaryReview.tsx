import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Wallet, CreditCard, Home, Shield, Target, Brain } from "lucide-react";
import type { IncomeItem } from "./StepRenda";
import type { ExpenseItem } from "./StepDespesas";
import type { DebtItem } from "./StepDividas";
import type { AssetItem } from "./StepPatrimonio";
import type { InsuranceItem } from "./StepSeguros";
import type { GoalItem } from "./StepObjetivos";
import type { BehavioralData } from "./StepComportamental";

interface Props {
  identificacao: { full_name: string };
  rendas: IncomeItem[];
  despesas: ExpenseItem[];
  dividas: DebtItem[];
  patrimonio: AssetItem[];
  seguros: InsuranceItem[];
  objetivos: GoalItem[];
  comportamental: BehavioralData;
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const sum = (arr: { amount?: string; estimated_value?: string; total_amount?: string }[], key: string) =>
  arr.reduce((acc, it: any) => acc + (parseFloat(it[key]) || 0), 0);

export const SummaryReview = ({
  identificacao,
  rendas,
  despesas,
  dividas,
  patrimonio,
  seguros,
  objetivos,
  comportamental,
}: Props) => {
  const totalRenda = sum(rendas, "amount");
  const totalDespesas = sum(despesas, "amount");
  const totalDividas = sum(dividas, "total_amount");
  const totalPatrimonio = sum(patrimonio, "estimated_value");
  const firstName = identificacao.full_name?.split(" ")[0] ?? "";

  const cards = [
    { icon: TrendingUp, label: "Renda mensal", value: fmt(totalRenda), tone: "text-success", bg: "bg-success/10" },
    { icon: Wallet, label: "Despesas", value: fmt(totalDespesas), tone: "text-warning", bg: "bg-warning/10" },
    { icon: CreditCard, label: "Dívidas", value: fmt(totalDividas), tone: "text-destructive", bg: "bg-destructive/10" },
    { icon: Home, label: "Patrimônio", value: fmt(totalPatrimonio), tone: "text-primary", bg: "bg-primary/10" },
    { icon: Shield, label: "Seguros", value: `${seguros.length}`, tone: "text-accent", bg: "bg-accent/10" },
    { icon: Target, label: "Objetivos", value: `${objetivos.length}`, tone: "text-success", bg: "bg-success/10" },
  ];

  const behavioralAvg = Math.round(
    ((comportamental.financial_organization_score +
      comportamental.savings_discipline_score +
      comportamental.financial_confidence_score +
      (10 - comportamental.money_anxiety_score) +
      (10 - comportamental.impulse_spending_score)) /
      5) *
      10,
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-success/10 ring-1 ring-success/20"
        >
          <CheckCircle2 className="h-7 w-7 text-success" strokeWidth={2} />
        </motion.div>
        <h2 className="font-display font-bold text-foreground tracking-[-0.03em] text-[clamp(1.375rem,1.1rem+1vw,1.875rem)] leading-[1.15]">
          {firstName ? `Tudo pronto, ${firstName}!` : "Tudo pronto!"}
        </h2>
        <p className="font-body text-muted-foreground/85 text-[0.9375rem] max-w-md mx-auto leading-relaxed">
          Aqui está o que você compartilhou conosco. Revise antes de finalizar.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            className="p-4 rounded-2xl border border-border/50 bg-card shadow-soft"
          >
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${c.bg}`}>
              <c.icon className={`h-4 w-4 ${c.tone}`} />
            </div>
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground/80 font-semibold mt-3">
              {c.label}
            </p>
            <p className="text-[1.0625rem] font-display font-semibold text-foreground tabular-nums tracking-[-0.02em] mt-0.5 truncate">
              {c.value}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04]"
      >
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground/80 font-semibold">
              Perfil comportamental
            </p>
            <p className="text-[0.875rem] font-medium text-foreground font-body">
              Equilíbrio financeiro · {behavioralAvg}/100
            </p>
          </div>
        </div>
      </motion.div>

      <p className="text-center text-[0.8125rem] text-muted-foreground/85 font-body">
        Ao finalizar, seu consultor poderá começar a montar seu plano. ✨
      </p>
    </div>
  );
};
