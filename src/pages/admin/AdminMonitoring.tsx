import { useQuery } from "@tanstack/react-query";
import { useClientId, useSelectedMonth } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { AcompanhamentoMetas } from "@/components/monitoring/AcompanhamentoMetas";
import { MonthlyClosings } from "@/components/monitoring/MonthlyClosings";
import { ClientPermissionToggle } from "@/components/monitoring/ClientPermissionToggle";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Activity, CalendarDays } from "lucide-react";

const AdminMonitoring = () => {
  const { clientId } = useClientId();
  const { selectedMonth } = useSelectedMonth();

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data: c } = await supabase
        .from("clients")
        .select("user_id")
        .eq("id", clientId)
        .maybeSingle();
      if (!c?.user_id) return null;
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", c.user_id)
        .maybeSingle();
      return p;
    },
    enabled: !!clientId,
  });

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Selecione um cliente para acompanhar.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border/60 flex-wrap">
        <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Activity className="h-4.5 w-4.5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold">
            Lançamento do mês — {client?.full_name ?? "Cliente"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Veja a evolução mensal do cliente e registre o estado atual de cada meta e objetivo.
          </p>
        </div>
        {selectedMonth && (() => {
          const [y, m] = selectedMonth.split("-").map(Number);
          const names = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
          return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-novare-blue-light/40 dark:bg-novare-blue/15 border border-novare-blue/25 shrink-0">
              <CalendarDays className="h-3.5 w-3.5 text-novare-blue dark:text-novare-blue-bright" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-novare-blue/70 dark:text-novare-blue-bright/80">Mês ativo:</span>
              <span className="text-xs font-bold text-novare-blue dark:text-novare-blue-bright">{names[m - 1]} {y}</span>
            </div>
          );
        })()}
      </div>

      {/* Toggle de permissão do cliente (com efeito destacado) */}
      <ClientPermissionToggle clientId={clientId} />

      {/* Histórico de fechamentos mensais e evolução */}
      <MonthlyClosings clientId={clientId} clientName={client?.full_name ?? undefined} />

      {/* Acompanhamento de metas e objetivos */}
      <AcompanhamentoMetas clientId={clientId} selectedMonth={selectedMonth} />

      <JourneyFooterNav
        current="acompanhamento"
        message="Lançamento do mês atualizado. Avance para Acompanhamento e veja a evolução do cliente."
      />
    </div>
  );
};

export default AdminMonitoring;
