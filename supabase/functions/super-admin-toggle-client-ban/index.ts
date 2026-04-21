import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub;

    const { data: isSA } = await callerClient.rpc("is_super_admin", { _user_id: callerId });
    if (!isSA) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id, action, reason } = (await req.json()) ?? {};

    if (!client_id || typeof client_id !== "string") {
      return new Response(JSON.stringify({ error: "client_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action !== "deactivate" && action !== "activate") {
      return new Response(JSON.stringify({ error: "action deve ser 'deactivate' ou 'activate'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "deactivate" && (!reason || typeof reason !== "string" || reason.trim().length < 3 || reason.length > 500)) {
      return new Response(JSON.stringify({ error: "Motivo obrigatório (3-500 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: client, error: cErr } = await adminClient
      .from("clients")
      .select("id, user_id")
      .eq("id", client_id)
      .single();
    if (cErr || !client) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("email")
      .eq("user_id", client.user_id)
      .single();
    const email = profile?.email ?? "unknown";

    if (action === "deactivate") {
      const { error: bErr } = await adminClient.from("banned_users").insert({
        user_id: client.user_id,
        email,
        reason: reason.trim(),
        banned_by: callerId,
      });
      if (bErr) {
        return new Response(JSON.stringify({ error: bErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Force-revoke all sessions
      try {
        await adminClient.auth.admin.signOut(client.user_id);
      } catch (_) { /* noop */ }
    } else {
      const { error: dErr } = await adminClient
        .from("banned_users")
        .delete()
        .eq("user_id", client.user_id);
      if (dErr) {
        return new Response(JSON.stringify({ error: dErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await adminClient.from("super_admin_actions").insert({
      actor_user_id: callerId,
      actor_email: claimsData.claims.email ?? null,
      action: action === "deactivate" ? "deactivate_client" : "activate_client",
      target_type: "client",
      target_id: client_id,
      target_email: email,
      reason: reason ?? null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("super-admin-toggle-client-ban error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
