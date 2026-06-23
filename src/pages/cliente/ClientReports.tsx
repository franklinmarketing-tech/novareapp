import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClientProvider } from "@/contexts/ClientContext";
import AdminReport from "@/pages/admin/AdminReport";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";

/**
 * Aba "Relatórios" do cliente.
 *
 * Reaproveita a MESMA visão do relatório que o consultor vê (AdminReport),
 * porém em modo somente-leitura (clientView): sem download de PDF, sem
 * impressão e sem a navegação interna do consultor. As seções que dependem
 * de dados internos (ex.: parecer) só aparecem se o RLS do cliente permitir.
 *
 * Resolve o clientId pelo usuário logado — funciona igual no painel real do
 * cliente e no modo "Ver como cliente" do admin (que injeta o user_id alvo).
 */
const ClientReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSlug, setClientSlug] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, slug")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      setClientId(data?.id ?? null);
      setClientSlug(data?.slug ?? "");
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-novare-blue" />
        <p className="text-sm">Carregando seu relatório...</p>
      </div>
    );
  }

  if (!clientId) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-novare-blue/10 text-novare-blue flex items-center justify-center mx-auto">
            <FileText className="h-6 w-6" />
          </div>
          <p className="font-semibold text-foreground">Seu relatório aparecerá aqui</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Assim que sua consultoria tiver dados registrados, o relatório completo fica disponível nesta aba.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ClientProvider value={{ clientId, clientSlug }}>
      <AdminReport clientView />
    </ClientProvider>
  );
};

export default ClientReports;
