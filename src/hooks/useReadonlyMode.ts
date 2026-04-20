import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para detectar se o app está em modo somente-leitura.
 * Usado para desabilitar botões de salvar/criar/deletar em telas de cliente.
 * Super admins ignoram o modo (podem editar mesmo com readonly_mode ativo).
 */
export const useReadonlyMode = (bypassForSuperAdmin = true) => {
  const [readonly, setReadonly] = useState(false);
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: cfg }, { data: { user } }] = await Promise.all([
        supabase.from("app_global_config").select("readonly_mode").eq("id", 1).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      setReadonly(!!cfg?.readonly_mode);
      if (user && bypassForSuperAdmin) {
        const { data } = await supabase.rpc("is_super_admin", { _user_id: user.id });
        setIsSuper(!!data);
      }
    };
    load();
  }, [bypassForSuperAdmin]);

  return readonly && !isSuper;
};
