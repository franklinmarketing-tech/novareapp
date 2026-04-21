import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  status: SaveStatus;
  lastSavedAt?: Date | null;
  onRetry?: () => void;
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const SaveIndicator = ({ status, lastSavedAt, onRetry }: Props) => {
  return (
    <div className="flex items-center gap-1.5 text-[0.6875rem] font-body tabular-nums min-h-[18px]">
      <AnimatePresence mode="wait">
        {status === "saving" && (
          <motion.div
            key="saving"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            className="flex items-center gap-1.5 text-muted-foreground/80"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Salvando…</span>
          </motion.div>
        )}
        {status === "saved" && lastSavedAt && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            className="flex items-center gap-1.5 text-success/85"
          >
            <Check className="h-3 w-3" />
            <span>Salvo às {formatTime(lastSavedAt)}</span>
          </motion.div>
        )}
        {status === "error" && (
          <motion.button
            key="error"
            type="button"
            onClick={onRetry}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            className="flex items-center gap-1.5 text-destructive hover:underline"
          >
            <AlertCircle className="h-3 w-3" />
            <span>Falha ao salvar — tentar novamente</span>
          </motion.button>
        )}
        {status === "idle" && lastSavedAt && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-muted-foreground/60"
          >
            Salvo às {formatTime(lastSavedAt)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
