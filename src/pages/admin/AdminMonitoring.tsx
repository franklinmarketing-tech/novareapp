import { useQuery } from "@tanstack/react-query";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { AcompanhamentoMetas } from "@/components/monitoring/AcompanhamentoMetas";
import { MonthlyClosings } from "@/components/monitoring/MonthlyClosings";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Activity } from "lucide-react";

const AdminMonitoring = () => {
  const { clientId } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("full_name")
        .eq("id", clientId)
        .maybeSingle();
      return data;
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
      <div className="flex items-center gap-3 pb-2 border-b border-border/60">
        <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Activity className="h-4.5 w-4.5 text-accent" />
        </div>
        <div>
          <h2 className="text-base font-semibold">
            Acompanhamento — {client?.full_name ?? "Cliente"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Registre o estado atual de cada meta. Cada save cria um snapshot com data e hora.
          </p>
        </div>
      </div>

      {/* Painel principal de metas */}
      <AcompanhamentoMetas clientId={clientId} />

      {/* Fechamento mensal com evolução */}
      <MonthlyClosings clientId={clientId} />

      <JourneyFooterNav
        current="acompanhamento"
        message="Acompanhamento atualizado. Gere o Relatório consolidado para entregar ao cliente."
      />
    </div>
  );
};

export default AdminMonitoring;
