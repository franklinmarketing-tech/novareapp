import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── AUTH: Verify caller is authenticated ──
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

    // ── AUTH: Verify caller is admin ──
    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INPUT VALIDATION ──
    const { name, email } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length < 2 || name.length > 200) {
      return new Response(JSON.stringify({ error: "Nome inválido (2-200 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const siteUrl = req.headers.get("origin") || "https://novareappcombr.lovable.app";
    const { data: newUser, error: createError } = await adminClient.auth.admin.inviteUserByEmail(email.trim(), {
      data: { full_name: name.trim() },
      redirectTo: siteUrl,
    });

    let userId: string;

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email === email.trim());
        if (!existingUser) {
          return new Response(JSON.stringify({ error: "Usuário existe mas não foi encontrado" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = existingUser.id;

        const { data: existingClient } = await adminClient
          .from("clients")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existingClient) {
          return new Response(
            JSON.stringify({ clientId: existingClient.id, userId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: newClient } = await adminClient
          .from("clients")
          .insert({ user_id: userId })
          .select("id")
          .single();

        return new Response(
          JSON.stringify({ clientId: newClient?.id, userId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = newUser.user!.id;

    const { data: clientRecord } = await adminClient
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .single();

    return new Response(
      JSON.stringify({ clientId: clientRecord?.id, userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-client error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
