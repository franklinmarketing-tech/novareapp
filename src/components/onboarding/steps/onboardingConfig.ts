// Maps micro-step index to the save section (0-7) that should be triggered.
// null = don't save on this step, just advance.
// Only the LAST micro-step of each section triggers a save.
export const TOTAL_MICRO_STEPS = 24; // 0-22: welcome+ident+transitions+finance+behavioral · 23: summary review

// Section definitions with emoji for personality
export const SECTIONS = [
  { key: "welcome", emoji: "👋", label: "Boas-vindas", color: "text-accent" },
  { key: "identificacao", emoji: "🧑", label: "Quem é você", color: "text-primary" },
  { key: "transition_financas", emoji: "💰", label: "Finanças", color: "text-accent" },
  { key: "renda", emoji: "📈", label: "Renda", color: "text-success" },
  { key: "despesas", emoji: "🧾", label: "Despesas", color: "text-warning" },
  { key: "dividas", emoji: "💳", label: "Dívidas", color: "text-destructive" },
  { key: "patrimonio", emoji: "🏠", label: "Patrimônio", color: "text-primary" },
  { key: "seguros", emoji: "🛡️", label: "Seguros", color: "text-accent" },
  { key: "objetivos", emoji: "🎯", label: "Objetivos", color: "text-success" },
  { key: "transition_comportamental", emoji: "🧠", label: "Comportamento", color: "text-accent" },
  { key: "comportamental", emoji: "🧠", label: "Seu perfil", color: "text-primary" },
  { key: "summary", emoji: "✨", label: "Revisão", color: "text-success" },
] as const;

// Step → section index for the SECTIONS array above
export const STEP_TO_SECTION: number[] = [
  0,  // 0: Welcome
  1, 1, 1, 1, 1, 1,  // 1-6: Identificação
  2,  // 7: Transition financas
  3, 4, 5, 6, 7, 8,  // 8-13: Renda, Despesas, Dívidas, Patrimônio, Seguros, Objetivos
  9,  // 14: Transition comportamental
  10, 10, 10, 10, 10, 10, 10, 10, // 15-22: Comportamental (8 steps)
  11, // 23: Summary review
];

// Save triggers: which section to save when leaving a step
export const microStepToSaveSection: Record<number, number | null> = {
  0: null,   // Welcome
  1: null, 2: null, 3: null, 4: null, 5: null,
  6: 0,    // last of Identificação → save section 0
  7: null,  // Transition
  8: 1,    // Renda
  9: 2,    // Despesas
  10: 3,   // Dívidas
  11: 4,   // Patrimônio
  12: 5,   // Seguros
  13: 6,   // Objetivos
  14: null, // Transition
  15: null, 16: null, 17: null, 18: null, 19: null, 20: null, 21: null,
  22: 7,   // last of Comportamental → save section 7
  23: null, // Summary review (no save, just finalize)
};

export const STEP_SECTION_LABELS: string[] = [
  "Boas-vindas",
  "Identificação", "Identificação", "Identificação", "Identificação", "Identificação", "Identificação",
  "Finanças",
  "Renda", "Despesas", "Dívidas", "Patrimônio", "Seguros", "Objetivos",
  "Comportamento",
  "Comportamental", "Comportamental", "Comportamental", "Comportamental", "Comportamental", "Comportamental", "Comportamental", "Comportamental",
  "Revisão",
];

export const STEP_TITLES: string[] = [
  "Bem-vindo",
  "Nome completo", "CPF e nascimento", "Estado civil", "Profissão", "Dependentes", "Localização",
  "Suas finanças",
  "Fontes de renda", "Despesas mensais", "Dívidas", "Patrimônio", "Seguros", "Objetivos",
  "Seu comportamento",
  "Organização financeira", "Disciplina de poupança", "Ansiedade financeira", "Confiança financeira",
  "Compras por impulso", "Apetite por risco", "Gatilhos de consumo", "Histórico e perfil",
  "Revisão final",
];

// Contextual encouragement per step
export const STEP_ENCOURAGEMENT: Record<number, string> = {
  0: "",
  1: "Vamos começar pelo básico ✨",
  2: "Essas informações são protegidas e confidenciais 🔒",
  3: "Quase terminando a identificação!",
  4: "Entender sua carreira ajuda no planejamento 💼",
  5: "Dependentes influenciam sua proteção e seguros",
  6: "Último passo da identificação! 🎉",
  7: "",
  8: "Precisamos entender de onde vem seu dinheiro 💡",
  9: "Para onde vai? Sem julgamentos 😊",
  10: "Nem todo mundo tem — e tudo bem!",
  11: "Seus bens também contam na equação 🏡",
  12: "Proteção é a base de qualquer plano sólido",
  13: "Sonhos precisam de números para virar realidade 🚀",
  14: "",
  15: "Não existe resposta certa — seja honesto consigo",
  16: "Poupar é hábito, e hábitos podem mudar",
  17: "Dinheiro gera emoções — isso é normal",
  18: "Como você se sente sobre sua situação?",
  19: "Impulsos são humanos — reconhecê-los é poderoso",
  20: "Risco não é bom nem ruim — é contexto",
  21: "Autoconhecimento é o primeiro investimento 🧠",
  22: "Estamos construindo seu perfil financeiro...",
  23: "Tudo certo? Só falta finalizar!",
};

// Section-level narrative messages for transitions
export const SECTION_NARRATIVES = {
  welcome: {
    title: "Vamos construir sua\nconsultoria financeira",
    subtitle: "Em poucos minutos, vamos entender sua situação e montar um plano personalizado para você.",
    cta: "São apenas 20 perguntas rápidas. Cada resposta nos aproxima do plano ideal para você.",
  },
  transition_financas: {
    title: "Agora vamos falar\nsobre o seu dinheiro",
    subtitle: "Quanto entra, quanto sai, o que você tem e o que deve.",
    cta: "Não se preocupe com números exatos — estimativas já ajudam muito.",
    completedLabel: "✅ Identificação completa",
  },
  transition_comportamental: {
    title: "Quase lá!\nAgora é sobre você",
    subtitle: "Entender como você pensa sobre dinheiro é tão importante quanto os números.",
    cta: "Algumas escalas simples de 0 a 10. Sem resposta certa.",
    completedLabel: "✅ Dados financeiros completos",
  },
};
