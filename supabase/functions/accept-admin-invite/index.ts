import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? url.searchParams.get("action") ?? "validate";
    const token = String(body.token ?? url.searchParams.get("token") ?? "").trim();

    if (!token) return json({ error: "Token ausente" }, 400);

    const { data: invite, error: inviteErr } = await admin
      .from("admin_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (inviteErr || !invite) return json({ error: "Convite não encontrado" }, 404);
    if (invite.status === "accepted") return json({ error: "Convite já utilizado" }, 410);
    if (new Date(invite.expires_at) < new Date()) return json({ error: "Convite expirado" }, 410);

    if (action === "validate") {
      return json({
        ok: true,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
      });
    }

    if (action === "accept") {
      const fullName = String(body.full_name ?? "").trim();
      const password = String(body.password ?? "");
      if (!fullName || fullName.length < 2) return json({ error: "Nome inválido" }, 400);
      if (!password || password.length < 8) return json({ error: "Senha mínima de 8 caracteres" }, 400);

      // Verifica se já existe usuário com esse email
      let userId: string | null = null;
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("email", invite.email)
        .maybeSingle();

      if (existingProfile?.user_id) {
        userId = existingProfile.user_id;
      } else {
        // Cria usuário no Auth (já confirmado)
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: invite.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (createErr || !created.user) {
          return json({ error: createErr?.message ?? "Erro ao criar usuário" }, 500);
        }
        userId = created.user.id;
      }

      if (!userId) return json({ error: "user_id ausente" }, 500);

      // Remove papel 'client' se existir e atribui o papel correto.
      // Super admin é exclusivo: nunca coexiste com 'admin' nem com 'client'.
      await admin.from("user_roles").delete()
        .eq("user_id", userId)
        .in("role", ["client", "admin", "super_admin"]);

      const { error: roleErr } = await admin.from("user_roles").insert({
        user_id: userId,
        role: invite.role,
      });
      if (roleErr) return json({ error: roleErr.message }, 500);

      // Limpa o registro de cliente, caso o handle_new_user tenha criado
      await admin.from("clients").delete().eq("user_id", userId);

      // Marca convite como aceito
      await admin.from("admin_invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      return json({ ok: true, email: invite.email, role: invite.role });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e: any) {
    console.error("accept-admin-invite error:", e);
    return json({ error: e.message ?? "Erro" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
