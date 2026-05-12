// V9: tipos compartilhados para os chips de referencia do Parecer
//
// Quando o consultor clica no "+" do painel "Alinhamento Consultivo",
// um chip eh inserido no editor e um snapshot do dado eh capturado.
// O snapshot fica preservado mesmo que o dado original mude depois.

export type SnapshotSource =
  | "client"
  | "income"
  | "expense"
  | "debt"
  | "asset"
  | "insurance"
  | "goal";

export interface SnapshotChip {
  /** ID unico do chip dentro do parecer */
  chipId: string;
  /** Tipo da fonte */
  source: SnapshotSource;
  /** "item" = unico registro; "group" = todos os registros da categoria */
  kind: "item" | "group";
  /** Texto legivel (ex: "Aluguel", "Despesas totais") */
  label: string;
  /** Valor monetario se aplicavel (R$) */
  value?: number;
  /** Campos extras para a IA (frequency, type, creditor, etc) */
  meta?: Record<string, unknown>;
  /** ISO timestamp da captura */
  capturedAt: string;
}

/** Configuracao visual por fonte */
export interface SourceConfig {
  key: SnapshotSource;
  label: string;
  /** Plural usado em titulos ("Despesas", "Dividas") */
  pluralLabel: string;
  emoji: string;
}

export const SOURCE_CONFIG: Record<SnapshotSource, SourceConfig> = {
  client:    { key: "client",    label: "Cliente",    pluralLabel: "Cliente",    emoji: "👤" },
  income:    { key: "income",    label: "Renda",      pluralLabel: "Rendas",     emoji: "💵" },
  expense:   { key: "expense",   label: "Despesa",    pluralLabel: "Despesas",   emoji: "💸" },
  debt:      { key: "debt",      label: "Dívida",     pluralLabel: "Dívidas",    emoji: "💳" },
  asset:     { key: "asset",     label: "Patrimônio", pluralLabel: "Patrimônio", emoji: "🏦" },
  insurance: { key: "insurance", label: "Proteção",   pluralLabel: "Proteção",   emoji: "🛡️" },
  goal:      { key: "goal",      label: "Objetivo",   pluralLabel: "Objetivos",  emoji: "🎯" },
};

/** Formato BRL */
export const fmtBRL = (v?: number | null) =>
  v == null
    ? ""
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
