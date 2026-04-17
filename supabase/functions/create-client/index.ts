import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateTempPassword(): string {
  // 12 chars: letras maiúsculas, minúsculas, números e símbolo
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = rand(upper) + rand(lower) + rand(digits) + rand(symbols);
  for (let i = 0; i < 8; i++) pwd += rand(all);
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  password: string;
  loginUrl: string;
}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.error("Missing email keys, skipping welcome email");
    return;
  }

  const PRIMARY = "#2b4464";
  const ACCENT = "#c9643a";
  const LOGO_URL = "https://bhncbqsdnehitavmcwhp.supabase.co/storage/v1/object/public/parecer-images/logo-branca.png";

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);">
  <tr><td style="background:${PRIMARY};padding:28px 32px;text-align:center;">
    <img src="${LOGO_URL}" alt="Novare" width="140" />
  </td></tr>
  <tr><td style="padding:32px;">
    <h1 style="color:${PRIMARY};font-size:22px;margin:0 0 16px;">Bem-vindo(a) à Novare, ${opts.name}!</h1>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Sua conta foi criada com sucesso. Use as credenciais abaixo para acessar a plataforma:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
        <span style="color:#777;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Email</span><br/>
        <strong style="color:${PRIMARY};font-size:15px;font-family:monospace;">${opts.to}</strong>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <span style="color:#777;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Senha temporária</span><br/>
        <strong style="color:${ACCENT};font-size:18px;font-family:monospace;letter-spacing:1px;">${opts.password}</strong>
      </td></tr>
    </table>
    <p style="color:#333;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Recomendamos que você altere a senha no primeiro acesso, em <strong>Configurações</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${opts.loginUrl}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Acessar a plataforma</a>
    </div>
  </td></tr>
  <tr><td style="background:${PRIMARY};padding:18px 32px;text-align:center;">
    <span style="color:rgba(255,255,255,.7);font-size:12px;">Novare App · Planejamento Financeiro Inteligente</span>
  </td></tr>
</table>
</td></tr></table></body></html>`;

  try {
    const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Novare <suporte@novareapp.com.br>",
        to: [opts.to],
        subject: "🎉 Bem-vindo à Novare — suas credenciais de acesso",
        html,
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error("Welcome email failed:", r.status, txt);
    }
  } catch (e) {
    console.error("Welcome email error:", e);
  }
}

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
    const loginUrl = `${siteUrl}/login`;

    const tempPassword = generateTempPassword();

    // Cria usuário JÁ confirmado (sem precisar confirmar email) com senha temporária
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
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
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existingClient) {
          return new Response(
            JSON.stringify({ clientId: existingClient.id, userId, alreadyExisted: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: newClient } = await adminClient
          .from("clients")
          .insert({ user_id: userId })
          .select("id")
          .single();

        return new Response(
          JSON.stringify({ clientId: newClient?.id, userId, alreadyExisted: true }),
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
      .select("id")
      .eq("user_id", userId)
      .single();

    // Envia email com credenciais (best-effort, não bloqueia resposta em caso de erro)
    await sendWelcomeEmail({
      to: email.trim(),
      name: name.trim(),
      password: tempPassword,
      loginUrl,
    });

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
