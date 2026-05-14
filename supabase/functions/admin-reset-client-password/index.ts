// V9: Reset de senha de cliente pelo CONSULTOR (admin role).
// Espelha o padrao da admin-delete-client:
//  - exige autenticacao + role admin/super_admin
//  - exige reconfirmacao de senha do proprio consultor
//  - so atua sobre user com role 'client' (nunca outro admin)
//  - retorna uma senha temporaria que o consultor entrega ao cliente
//  - encerra sessoes ativas do cliente para forcar novo login

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const tmp = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await tmp.auth.signInWithPassword({ email, password });
  if (error || !data?.user) return false;
  await tmp.auth.signOut({ scope: "local" });
  return true;
}

// Gera senha facil de ditar verbalmente: 8 caracteres alfanumericos sem
// caracteres ambiguos (0/O/1/l/I) e com pelo menos 1 numero.
function generateTempPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const chars = letters + digits;
  let out = "";
  // 1 digito garantido em posicao aleatoria
  const digitIdx = Math.floor(Math.random() * 8);
  for (let i = 0; i < 8; i += 1) {
    if (i === digitIdx) {
      out += digits[Math.floor(Math.random() * digits.length)];
    } else {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sem autorizacao" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user?.id || !userData.user.email) {
      return json({ error: "Nao autenticado" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
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

    if (!clientId) return json({ error: "client_id obrigatorio" }, 400);
    if (!password) return json({ error: "Senha do consultor obrigatoria" }, 400);

    const passwordOk = await requirePassword(userData.user.email, password);
    if (!passwordOk) return json({ error: "Senha incorreta" }, 403);

    // Carrega o cliente alvo
    const { data: clientRow, error: clientError } = await admin
      .from("clients")
      .select("id, user_id")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError) return json({ error: clientError.message }, 500);
    if (!clientRow) return json({ error: "Cliente nao encontrado" }, 404);

    // Bloqueio de seguranca: so reseta senha de quem e somente 'client'.
    // Reset de senha de admin/super_admin tem que passar pela tela do super admin.
    const { data: targetRoles, error: targetRolesError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", clientRow.user_id);

    if (targetRolesError) return json({ error: targetRolesError.message }, 500);

    if ((targetRoles ?? []).some((entry) => entry.role === "admin" || entry.role === "super_admin")) {
      return json({
        error: "Este usuario possui privilegios administrativos e nao pode ter a senha resetada por esta tela.",
      }, 403);
    }

    // Gera nova senha e atualiza
    const tempPassword = generateTempPassword();
    const { error: updateError } = await admin.auth.admin.updateUserById(clientRow.user_id, {
      password: tempPassword,
      email_confirm: true,
    });
    if (updateError) return json({ error: updateError.message }, 500);

    // Encerra sessoes ativas do cliente (forca login com a senha nova)
    await admin.auth.admin.signOut(clientRow.user_id, "global");

    // Audit log (sem persistir a senha em claro)
    await admin.from("audit_log").insert({
      action: "reset_client_password",
      actor_user_id: userData.user.id,
      actor_email: userData.user.email,
      resource_type: "client",
      resource_id: clientId,
      metadata: { target_user_id: clientRow.user_id },
    });

    return json({
      ok: true,
      temp_password: tempPassword,
      message: "Senha redefinida. Entregue a senha temporaria ao cliente.",
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
