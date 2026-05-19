import { useClientId } from "@/contexts/ClientContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ParecerMetas } from "@/components/parecer/ParecerMetas";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Target } from "lucide-react";

const AdminParecer = () => {
  const { clientId } = useClientId();

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
        Selecione um cliente para definir as metas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border/60">
        <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Target className="h-4.5 w-4.5 text-accent" />
        </div>
        <div>
          <h2 className="text-base font-semibold">
            Metas — {client?.full_name ?? "Cliente"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Defina a meta para cada item financeiro. Use a IA para gerar sugestões.
          </p>
        </div>
      </div>

      <ParecerMetas clientId={clientId} />

      <JourneyFooterNav
        current="parecer"
        message="Metas definidas. Avance para o Plano de Ação para estruturar os próximos passos."
      />
    </div>
  );
};

export default AdminParecer;
