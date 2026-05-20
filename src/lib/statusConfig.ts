export type ClientStatus =
  | "onboarding_pendente"
  | "em_diagnostico"
  | "em_acompanhamento";

export interface StatusConfig {
  label: string;
  variant: "outline" | "warning" | "accent" | "success";
  dot: string;
  border: string;
  /** tailwind bg + text classes for inline pill (non-badge) */
  pill: string;
}

export const STATUS_MAP: Record<ClientStatus, StatusConfig> = {
  onboarding_pendente: {
    label: "Pendente Onboarding",
    variant: "warning",
    dot: "bg-warning",
    border: "before:bg-warning/70",
    pill: "bg-warning/15 text-warning",
  },
  em_diagnostico: {
    label: "Em Diagnóstico",
    variant: "accent",
    dot: "bg-accent",
    border: "before:bg-accent/70",
    pill: "bg-accent/15 text-accent",
  },
  em_acompanhamento: {
    label: "Acompanhamento",
    variant: "success",
    dot: "bg-success",
    border: "before:bg-success/70",
    pill: "bg-success/15 text-success",
  },
};

export const getStatusConfig = (status?: string | null): StatusConfig =>
  STATUS_MAP[(status as ClientStatus) ?? "onboarding_pendente"] ??
  STATUS_MAP.onboarding_pendente;
