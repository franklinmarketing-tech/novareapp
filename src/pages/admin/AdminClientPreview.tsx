import { useEffect, useState } from "react";
import { useParams, useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { AuthContext, useAuth } from "@/contexts/AuthContext";
import { ClientLayout } from "@/components/layouts/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Modo "Ver como cliente" para o admin.
 *
 * O admin continua autenticado no Supabase (auth.uid() é dele e tem
 * policies admin_all_*), mas o useAuth() exposto aos componentes do
 * cliente retorna o user_id do cliente alvo + role "client".
 *
 * Assim o ClientLayout/ClientDashboard/MyData/ActionPlan funcionam
 * idênticos ao painel real do cliente — sem precisar fazer login.
 */
const AdminClientPreview = () => {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const navigate = useNavigate();
  const realAuth = useAuth();
  const [previewUser, setPreviewUser] = useState<User | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!clientSlug) return;
      setLoading(true);
      const { data: client } = await supabase
        .from("clients")
        .select("id, user_id")
        .eq("slug", clientSlug)
        .maybeSingle();
      if (!client?.user_id) {
        if (mounted) { setNotFound(true); setLoading(false); }
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", client.user_id)
        .maybeSingle();
      if (!mounted) return;
      // Cria um "User-like" object com o user_id do cliente alvo.
      // O resto dos campos vem do admin real (apenas user.id é diferente).
      const fakeUser = { ...(realAuth.user || {}), id: client.user_id } as User;
      setPreviewUser(fakeUser);
      setClientName(profile?.full_name || "Cliente");
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [clientSlug, realAuth.user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-novare-blue" />
        <p className="text-sm text-muted-foreground">Carregando preview do cliente...</p>
      </div>
    );
  }

  if (notFound || !previewUser) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <p className="font-semibold">Cliente não encontrado.</p>
            <Button onClick={() => navigate("/admin/clientes")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para clientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sobrescreve o contexto de auth para que os componentes do cliente
  // (que fazem .eq("user_id", user.id)) leiam dados do cliente alvo.
  const previewAuth = {
    ...realAuth,
    user: previewUser,
    role: "client" as const,
  };

  return (
    <AuthContext.Provider value={previewAuth}>
      {/* Banner de aviso no topo (não-bloqueante) */}
      <div className="fixed top-0 inset-x-0 z-50 bg-novare-terracotta text-white px-4 py-2 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm font-bold min-w-0">
          <Eye className="w-4 h-4 shrink-0" />
          <span className="truncate">
            Modo preview · você está vendo o painel de <strong>{clientName}</strong>
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => window.close()}
          className="h-7 text-xs shrink-0"
        >
          Fechar aba
        </Button>
      </div>

      {/* Espaçamento para o banner não cobrir o conteúdo */}
      <div className="pt-10">
        <ClientLayout>
          <Outlet />
        </ClientLayout>
      </div>
    </AuthContext.Provider>
  );
};

export default AdminClientPreview;
