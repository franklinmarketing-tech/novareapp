import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
}

/**
 * Toggle de destaque na tela "Lançamento do mês" do consultor.
 * Liga/desliga a permissão do cliente para editar valor_atual + estado_atual no painel dele.
 */
export function ClientPermissionToggle({ clientId }: Props) {
  const qc = useQueryClient();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const { data: client } = useQuery({
    queryKey: ["client_permission", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("client_can_log_acompanhamento")
        .eq("id", clientId)
        .maybeSingle() as any;
      return data as { client_can_log_acompanhamento: boolean } | null;
    },
    enabled: !!clientId,
  });

  const allowed = optimistic ?? client?.client_can_log_acompanhamento ?? false;

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from("clients")
        .update({ client_can_log_acompanhamento: next } as any)
        .eq("id", clientId);
      if (error) throw error;
      return next;
    },
    onMutate: (next) => setOptimistic(next),
    onSuccess: (next) => {
      toast.success(
        next ? "Cliente liberado para lançar" : "Cliente em modo visualização",
        {
          description: next
            ? "Agora o cliente pode atualizar valor e estado de cada meta no painel dele."
            : "O cliente volta a ver apenas — sem permissão de editar valores.",
        },
      );
      qc.invalidateQueries({ queryKey: ["client_permission", clientId] });
    },
    onError: (err: any) => {
      setOptimistic(null);
      toast.error("Erro ao atualizar permissão: " + (err?.message || "tente novamente"));
    },
    onSettled: () => setOptimistic(null),
  });

  const Icon = allowed ? Unlock : Lock;
  const saving = mutation.isPending;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 p-4 sm:p-5 transition-all duration-500",
        allowed
          ? "border-emerald-400/60 bg-gradient-to-br from-emerald-50 via-emerald-100/40 to-emerald-50 dark:from-emerald-950/40 dark:via-emerald-900/30 dark:to-emerald-950/40"
          : "border-amber-400/60 bg-gradient-to-br from-amber-50 via-amber-100/40 to-amber-50 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-amber-950/40",
      )}
    >
      {/* Glow animado */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-1 opacity-50 blur-2xl transition-opacity duration-700",
          allowed ? "bg-emerald-400/30" : "bg-amber-400/30",
        )}
      />

      <div className="relative flex items-center gap-4 flex-wrap">
        {/* Ícone com pulse */}
        <div
          className={cn(
            "relative h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ring-2 ring-background/70",
            allowed ? "bg-emerald-500 text-white" : "bg-amber-500 text-white",
          )}
        >
          {saving ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Icon className="w-6 h-6" />
          )}
          {!saving && (
            <span
              className={cn(
                "absolute inset-0 rounded-2xl animate-ping opacity-40",
                allowed ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
          )}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.18em]",
              allowed ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400",
            )}
          >
            Permissão do cliente
          </p>
          <p className="text-base sm:text-lg font-bold leading-tight text-foreground">
            {allowed ? "Cliente liberado para lançar" : "Cliente em modo visualização"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allowed
              ? "Cliente pode editar valor atual e estado de cada meta no painel dele."
              : "Cliente só visualiza — apenas o consultor lança valores."}
          </p>
        </div>

        {/* Botão toggle */}
        <button
          type="button"
          onClick={() => mutation.mutate(!allowed)}
          disabled={saving}
          className={cn(
            "relative shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
            "shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
            "ring-2 ring-background/40 disabled:opacity-60 disabled:cursor-not-allowed",
            allowed
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 text-white",
          )}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : allowed ? (
            <>
              <Lock className="w-4 h-4" />
              Bloquear edição
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4" />
              Liberar lançamento
            </>
          )}
        </button>
      </div>
    </div>
  );
}
