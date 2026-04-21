import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const LOGO_URL = "https://novareapp.com.br/logo-novare-email.png";
const PRIMARY = "#2b4464";
const ACCENT = "#c9643a";

function inviteEmailHtml(inviteUrl: string, role: string, inviterName: string) {
  const roleLabel = role === "super_admin" ? "Super Administrador" : "Administrador (Consultor)";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr><td style="background:${PRIMARY};padding:28px 32px;text-align:center;">
    <img src="${LOGO_URL}" alt="Novare" width="140" style="display:inline-block;" />
  </td></tr>
  <tr><td style="padding:36px 32px 12px;">
    <h1 style="color:${PRIMARY};font-size:24px;margin:0 0 16px;">Você foi convidado!</h1>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
      ${inviterName} convidou você para fazer parte da plataforma Novare como
      <strong>${roleLabel}</strong>.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 28px;">
      Clique no botão abaixo para criar sua conta e acessar o sistema. Este link
      é único e expira em 7 dias.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${inviteUrl}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Aceitar convite</a>
    </div>
    <p style="color:#777;font-size:12px;line-height:1.5;margin:24px 0 0;word-break:break-all;">
      Se o botão não funcionar, copie e cole este link no navegador:<br/>
      <a href="${inviteUrl}" style="color:${PRIMARY};">${inviteUrl}</a>
    </p>
  </td></tr>
  <tr><td style="background:${PRIMARY};padding:18px 32px;text-align:center;">
    <span style="color:rgba(255,255,255,0.7);font-size:12px;">Novare App · Consultoria Financeira</span>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

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

    const appUrl = (Deno.env.get("PUBLIC_APP_URL") ?? "https://novareapp.com.br").replace(/\/+$/, "");
    const inviteUrl = `${appUrl}/aceitar-convite/${token}`;

    // Buscar nome do convidador
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .maybeSingle();
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || "Um administrador";

    // Enviar email via Resend Gateway
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
      if (LOVABLE_API_KEY && RESEND_API_KEY) {
        const r = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: "Novare <suporte@novareapp.com.br>",
            to: [email],
            subject: "🎉 Você foi convidado para a plataforma Novare",
            html: inviteEmailHtml(inviteUrl, role, inviterName),
          }),
        });
        if (r.ok) {
          emailSent = true;
        } else {
          const errBody = await r.text();
          emailError = `Resend ${r.status}: ${errBody.slice(0, 200)}`;
          console.error("Resend error:", emailError);
        }
      } else {
        emailError = "API keys não configuradas";
      }
    } catch (e: any) {
      emailError = e.message;
      console.error("Email send error:", e);
    }

    return json({ ok: true, token, invite_url: inviteUrl, email_sent: emailSent, email_error: emailError });
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
