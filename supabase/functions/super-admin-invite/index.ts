import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sem autorização" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);

    // checa super_admin
    const { data: isSuper } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuper) return json({ error: "Acesso negado" }, 403);

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = body.role === "super_admin" ? "super_admin" : "admin";
    if (!email || !email.includes("@")) return json({ error: "Email inválido" }, 400);

    const token = crypto.randomUUID().replace(/-/g, "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await admin.from("admin_invitations").insert({
      email, role, token, invited_by: user.id,
    });
    if (error) return json({ error: error.message }, 500);

    const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "";
    const inviteUrl = `${appUrl}/login?invite=${token}`;

    return json({ ok: true, token, invite_url: inviteUrl });
  } catch (e: any) {
    return json({ error: e.message ?? "Erro" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
