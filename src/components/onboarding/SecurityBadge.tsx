import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  compact?: boolean;
}

/** Pequeno selo de confiança usado no header do onboarding. */
export const SecurityBadge = ({ compact = false }: Props) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/8 border border-success/15 text-success/90 text-[0.625rem] font-medium font-body tracking-wide cursor-default"
          aria-label="Dados protegidos por criptografia e LGPD"
        >
          <Lock className="h-2.5 w-2.5" />
          {!compact && <span>LGPD</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[0.75rem] max-w-[220px]">
        Dados criptografados em trânsito e armazenamento. Visíveis apenas para você e seu consultor.
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
