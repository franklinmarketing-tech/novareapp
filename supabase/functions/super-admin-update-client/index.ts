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

    const body = await req.json();
    const { client_id, full_name, email, status } = body ?? {};

    if (!client_id || typeof client_id !== "string") {
      return new Response(JSON.stringify({ error: "client_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (full_name !== undefined && (typeof full_name !== "string" || full_name.trim().length < 2 || full_name.length > 200)) {
      return new Response(JSON.stringify({ error: "Nome inválido (2-200 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof email !== "string" || !emailRegex.test(email) || email.length > 255) {
        return new Response(JSON.stringify({ error: "Email inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const allowedStatuses = ["onboarding_pendente", "em_diagnostico", "em_acompanhamento"];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: "Status inválido" }), {
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

    // Update auth user (email)
    if (email !== undefined) {
      const { error: authErr } = await adminClient.auth.admin.updateUserById(client.user_id, {
        email: email.trim(),
        email_confirm: true,
      });
      if (authErr) {
        return new Response(JSON.stringify({ error: `Auth: ${authErr.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update profile
    const profilePatch: Record<string, unknown> = {};
    if (full_name !== undefined) profilePatch.full_name = full_name.trim();
    if (email !== undefined) profilePatch.email = email.trim();
    if (Object.keys(profilePatch).length) {
      const { error: pErr } = await adminClient
        .from("profiles")
        .update(profilePatch)
        .eq("user_id", client.user_id);
      if (pErr) {
        return new Response(JSON.stringify({ error: `Profile: ${pErr.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update client status
    if (status !== undefined) {
      const { error: sErr } = await adminClient
        .from("clients")
        .update({ status })
        .eq("id", client_id);
      if (sErr) {
        return new Response(JSON.stringify({ error: `Client: ${sErr.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Audit
    await adminClient.from("super_admin_actions").insert({
      actor_user_id: callerId,
      actor_email: claimsData.claims.email ?? null,
      action: "update_client",
      target_type: "client",
      target_id: client_id,
      target_email: email ?? null,
      metadata: { full_name, email, status },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("super-admin-update-client error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
