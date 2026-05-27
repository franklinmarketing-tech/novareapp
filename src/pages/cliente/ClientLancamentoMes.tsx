import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AcompanhamentoMetas } from "@/components/monitoring/AcompanhamentoMetas";
import PageTransition from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import { CalendarDays, Eye, Lock } from "lucide-react";

const ClientLancamentoMes = () => {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("clients")
        .select("id, client_can_log_acompanhamento")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setClientId(data.id);
        setCanEdit(!!data.client_can_log_acompanhamento);
      }
      setLoading(false);
    };
    load();
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
