export interface BehavioralData {
  // Scale fields (0-10)
  financial_organization_score: number;
  savings_discipline_score: number;
  money_anxiety_score: number;
  financial_confidence_score: number;
  impulse_spending_score: number;
  risk_tolerance_score: number;
  // Text fields
  spending_triggers: string;
  family_money_history: string;
  // Computed
  computed_profile?: string;
}

export const emptyBehavioral = (): BehavioralData => ({
  financial_organization_score: 5,
  savings_discipline_score: 5,
  money_anxiety_score: 5,
  financial_confidence_score: 5,
  impulse_spending_score: 5,
  risk_tolerance_score: 5,
  spending_triggers: "",
  family_money_history: "",
});

export type BehavioralProfile = "Construtor" | "Guardião" | "Explorador" | "Despreocupado";

export const PROFILE_INFO: Record<BehavioralProfile, { emoji: string; description: string }> = {
  Construtor: {
    emoji: "🏗️",
    description: "Disciplinado e organizado, você constrói sua saúde financeira com consistência. Foco em planejamento e controle.",
  },
  Guardião: {
    emoji: "🛡️",
    description: "Cauteloso e atento, você prioriza segurança e estabilidade. Prefere proteger o que já conquistou.",
  },
  Explorador: {
    emoji: "🚀",
    description: "Confiante e arrojado, você busca oportunidades e aceita riscos calculados para crescer mais rápido.",
  },
  Despreocupado: {
    emoji: "🌊",
    description: "Vive o presente e lida com dinheiro de forma intuitiva. Há oportunidades para desenvolver mais organização.",
  },
};

export function computeProfile(data: BehavioralData): BehavioralProfile {
  const { financial_organization_score: org, savings_discipline_score: sav, impulse_spending_score: imp, money_anxiety_score: anx, financial_confidence_score: conf, risk_tolerance_score: risk } = data;

  // Construtor: alta disciplina + alta organização + baixo impulso
  const construtorScore = org + sav + (10 - imp);
  // Guardião: alta ansiedade + baixo risco + alta poupança
  const guardiaoScore = anx + (10 - risk) + sav;
  // Explorador: alto risco + alta confiança + baixa ansiedade
  const exploradorScore = risk + conf + (10 - anx);
  // Despreocupado: baixa organização + baixa disciplina + alto impulso
  const despreocupadoScore = (10 - org) + (10 - sav) + imp;

  const scores: [BehavioralProfile, number][] = [
    ["Construtor", construtorScore],
    ["Guardião", guardiaoScore],
    ["Explorador", exploradorScore],
    ["Despreocupado", despreocupadoScore],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][0];
}
