import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AcompanhamentoMetas } from "@/components/monitoring/AcompanhamentoMetas";
import PageTransition from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import { CalendarDays, Eye, Lock } from "lucide-react";
import { toast } from "sonner";

const ClientLancamentoMes = () => {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const prevCanEditRef = useRef<boolean | null>(null);

  // Avisa o cliente quando o modo muda (de bloqueado para liberado ou vice-versa)
  useEffect(() => {
    if (loading) return;
    if (prevCanEditRef.current === null) {
      prevCanEditRef.current = canEdit;
      return;
    }
    if (prevCanEditRef.current !== canEdit) {
      if (canEdit) {
        toast.success("Seu consultor liberou a edição!", {
          description: "Agora você pode atualizar valor e estado de cada meta.",
          duration: 5000,
        });
      } else {
        toast("Modo visualização ativado", {
          description: "Seu consultor bloqueou a edição. Você continua vendo o histórico.",
          duration: 5000,
        });
      }
      prevCanEditRef.current = canEdit;
    }
  }, [canEdit, loading]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let mounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const checkPermission = async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, client_can_log_acompanhamento")
        .eq("user_id", user.id)
        .maybeSingle() as any;
      if (!mounted || !data) return;
      setClientId(data.id);
      setCanEdit(!!data.client_can_log_acompanhamento);
    };

    // Refetch ao voltar para a aba (cliente percebe liberação imediatamente)
    const onVisibilityChange = () => {
      if (!document.hidden && mounted) checkPermission();
    };

    const init = async () => {
      await checkPermission();
      setLoading(false);

      // Polling a cada 15s — assim que o consultor liberar/bloquear, o
      // cliente passa para o modo correto sem precisar recarregar.
      pollInterval = setInterval(() => {
        if (!document.hidden && mounted) checkPermission();
      }, 15000);

      document.addEventListener("visibilitychange", onVisibilityChange);
    };

    init();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Não foi possível carregar seus dados.</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <SEO title="Lançamento do mês — Novare" description="Atualize valores e estado de cada meta no seu lançamento mensal." />

      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-novare-blue/20 bg-gradient-to-r from-novare-blue/10 via-novare-blue-light/30 to-transparent px-4 py-4 flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-xl bg-novare-blue text-white flex items-center justify-center shrink-0 shadow-sm">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-novare-blue/70 dark:text-novare-blue-bright/80">
              Seu lançamento do mês
            </p>
            <h1 className="text-lg font-bold text-novare-blue dark:text-novare-blue-bright leading-tight">
              {canEdit ? "Atualize seus valores" : "Acompanhe sua evolução"}
            </h1>
          </div>

          {/* Badge de modo */}
          <span
            className={
              canEdit
                ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-900/40 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold dark:bg-amber-900/40 dark:text-amber-400 ring-1 ring-amber-500/30"
            }
          >
            {canEdit ? <><Eye className="w-3.5 h-3.5" /> Edição liberada</> : <><Lock className="w-3.5 h-3.5" /> Visualização</>}
          </span>
        </div>

        {/* Aviso quando bloqueado */}
        {!canEdit && (
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-500/30 p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold mb-1">Você está em modo visualização.</p>
            <p className="text-xs">
              Seu consultor ainda não liberou a edição. Você pode ver as metas e o progresso registrado, mas não consegue atualizar valores.
            </p>
          </div>
        )}

        {/* Componente compartilhado em modo client */}
        <fieldset disabled={!canEdit} className="space-y-6 disabled:opacity-95">
          <AcompanhamentoMetas clientId={clientId} mode="client" />
        </fieldset>
      </div>
    </PageTransition>
  );
};

export default ClientLancamentoMes;
