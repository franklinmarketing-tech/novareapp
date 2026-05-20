// V9: Rodape navegacional que aparece no final de cada etapa da jornada
// para guiar o consultor para a proxima etapa. Aparece em Onboarding,
// Diagnostico, Parecer, Plano de Acao, Acompanhamento e Relatorio.

import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

type JourneyStep =
  | "onboarding"
  | "diagnostico"
  | "parecer"
  | "plano-acao"
  | "acompanhamento"
  | "relatorio";

const STEP_INFO: Record<
  JourneyStep,
  { num: number; label: string; description: string }
> = {
  onboarding:     { num: 1, label: "Onboarding",     description: "Coleta de dados brutos do cliente" },
  diagnostico:    { num: 2, label: "Diagnóstico",    description: "Análise financeira + IA inicial" },
  parecer:        { num: 3, label: "Metas",           description: "Defina metas para cada item financeiro" },
  "plano-acao":   { num: 4, label: "Plano de Ação",  description: "Ações priorizadas para atingir as metas" },
  acompanhamento: { num: 5, label: "Acompanhamento", description: "KPIs + comparativo + evolução IA" },
  relatorio:      { num: 6, label: "Relatório",      description: "PDF consolidado para o cliente" },
};

const ORDER: JourneyStep[] = [
  "onboarding",
  "diagnostico",
  "parecer",
  "plano-acao",
  "acompanhamento",
  "relatorio",
];

interface Props {
  /** Etapa atual */
  current: JourneyStep;
  /** Texto opcional do CTA primario (sobrescreve "Avancar para X") */
  primaryLabel?: string;
  /** Mensagem pequena acima do CTA (ex: "Diagnostico concluido. Hora do Parecer.") */
  message?: string;
  /** Esconde o botao "Voltar" se for a primeira etapa */
  hideBack?: boolean;
}

export const JourneyFooterNav = ({
  current,
  primaryLabel,
  message,
  hideBack = false,
}: Props) => {
  const navigate = useNavigate();
  const { clientSlug } = useParams<{ clientSlug: string }>();

  const idx = ORDER.indexOf(current);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;

  const goTo = (step: JourneyStep) => {
    if (!clientSlug) return;
    navigate(`/admin/cliente/${clientSlug}/${step}`);
  };

  // Se for a ultima etapa (relatorio), mostra um card de "jornada concluida"
  const isLast = !next;

  return (
    <Card
      className={cn(
        "overflow-hidden border-accent/25 bg-gradient-to-br from-accent/[0.05] via-card to-card",
        isLast && "border-success/30 from-success/[0.04]",
      )}
    >
      {/* Progress track — 6 segments */}
      <div className="flex h-[3px]">
        {ORDER.map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 transition-all duration-500",
              i < idx ? "bg-success/80" : i === idx ? "bg-accent" : "bg-muted/60",
            )}
          />
        ))}
      </div>
      <CardContent className="py-5 px-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                isLast ? "bg-success text-white" : "bg-accent text-accent-foreground",
              )}
            >
              {isLast ? <CheckCircle2 className="h-3 w-3" strokeWidth={3} /> : STEP_INFO[current].num}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/85">
              Etapa {STEP_INFO[current].num} de 6
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {message
              ? message
              : isLast
                ? "Jornada de análise concluída"
                : `${STEP_INFO[current].label} pronto — siga para o próximo passo.`}
          </p>
          {next && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Próximo: <span className="font-medium text-foreground">{STEP_INFO[next].label}</span> · {STEP_INFO[next].description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {prev && !hideBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goTo(prev)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {STEP_INFO[prev].label}
            </Button>
          )}
          {next ? (
            <Button
              onClick={() => goTo(next)}
              className="bg-novare-terracotta hover:bg-novare-terracotta/90 text-white gap-2 shadow-sm shadow-novare-terracotta/25"
            >
              {primaryLabel || `Avançar para ${STEP_INFO[next].label}`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
