import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteUserAccount } from "../_shared/delete-user-account.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function requirePassword(email: string, password: string) {
  // Cliente temporário sem persistência de sessão — não interfere na sessão do super admin
  const tmp = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await tmp.auth.signInWithPassword({ email, password });
  if (error || !data?.user) return false;
  // signOut local apenas — não invalida outras sessões do usuário
  await tmp.auth.signOut({ scope: "local" });
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sem autorização" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user?.id || !userData.user.email) {
      return json({ error: "Não autenticado" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [adminRole, superRole] = await Promise.all([
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" }),
      admin.rpc("is_super_admin", { _user_id: userData.user.id }),
    ]);

    if (!adminRole.data && !superRole.data) {
      return json({ error: "Acesso negado" }, 403);
    }

    const body = await req.json();
    const clientId = String(body.client_id ?? "");
    const password = String(body.password ?? "");

    if (!clientId) return json({ error: "client_id obrigatório" }, 400);
    if (!password) return json({ error: "Senha obrigatória" }, 400);

    const passwordOk = await requirePassword(userData.user.email, password);
    if (!passwordOk) return json({ error: "Senha incorreta" }, 403);

    const { data: clientRow, error: clientError } = await admin
      .from("clients")
      .select("id, user_id")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError) return json({ error: clientError.message }, 500);
    if (!clientRow) return json({ error: "Cliente não encontrado" }, 404);

    const { data: targetRoles, error: targetRolesError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", clientRow.user_id);

    if (targetRolesError) return json({ error: targetRolesError.message }, 500);

    if ((targetRoles ?? []).some((entry) => entry.role === "admin" || entry.role === "super_admin")) {
      return json({ error: "Este usuário possui privilégios administrativos e não pode ser excluído por esta tela." }, 403);
    }

    const result = await deleteUserAccount(admin, clientRow.user_id);

    await admin.from("audit_log").insert({
      action: "delete_client_account",
      actor_user_id: userData.user.id,
      actor_email: userData.user.email,
      resource_type: "client",
      resource_id: clientId,
      metadata: { deleted_user_id: clientRow.user_id, ...result },
    });

    return json({ ok: true, message: "Cliente excluído permanentemente" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
