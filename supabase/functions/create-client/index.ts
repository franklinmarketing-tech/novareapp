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
    const { name, email, password } = await req.json();
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
    if (!password || typeof password !== "string" || password.length < 8 || password.length > 72) {
      return new Response(JSON.stringify({ error: "Senha inválida (mínimo 8 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Cria usuário JÁ confirmado com a senha definida pelo admin.
    // O cliente pode trocar essa senha depois pelo "Esqueci minha senha" ou nas Configurações.
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name.trim() },
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
          .select("id, slug")
          .eq("user_id", userId)
          .single();

        if (existingClient) {
          return new Response(
            JSON.stringify({ clientId: existingClient.id, slug: existingClient.slug, userId, alreadyExisted: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: newClient } = await adminClient
          .from("clients")
          .insert({ user_id: userId })
          .select("id, slug")
          .single();

        return new Response(
          JSON.stringify({ clientId: newClient?.id, slug: newClient?.slug, userId, alreadyExisted: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = newUser.user!.id;

    // Aguarda trigger criar profile/client
    await new Promise((r) => setTimeout(r, 1000));

    const { data: clientRecord } = await adminClient
      .from("clients")
      .select("id, slug")
      .eq("user_id", userId)
      .single();

    // Dispara e-mail de boas-vindas com a senha temporária
    try {
      await adminClient.functions.invoke("send-client-email", {
        body: {
          to: email.trim(),
          templateName: "welcome-with-password",
          templateData: {
            clientName: name.trim(),
            email: email.trim(),
            password,
          },
        },
        headers: { Authorization: authHeader },
      });
    } catch (emailErr) {
      console.error("Falha ao enviar e-mail de boas-vindas:", emailErr);
    }

    return new Response(
      JSON.stringify({ clientId: clientRecord?.id, slug: clientRecord?.slug, userId }),
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
