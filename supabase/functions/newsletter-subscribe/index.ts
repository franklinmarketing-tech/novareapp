import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const NOVARE_INBOX = "contato@novareapp.com.br";
const FROM_ADDRESS = "Novare <suporte@novareapp.com.br>";
const APP_URL = "https://novareapp.com.br";
const PRIMARY = "#2b4464";
const ACCENT = "#c9643a";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function leadEmailHtml(opts: { email: string; name?: string; ip?: string; ua?: string; source: string }) {
  const { email, name, ip, ua, source } = opts;
  return `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr><td style="background:${PRIMARY};padding:24px 32px;color:#fff;">
    <h1 style="margin:0;font-size:18px;">📥 Novo lead da Newsletter</h1>
  </td></tr>
  <tr><td style="padding:28px 32px;color:#333;font-size:14px;line-height:1.6;">
    <p style="margin:0 0 14px;">Um visitante se inscreveu para receber conteúdos da Novare:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border-radius:8px;padding:16px;margin:0 0 18px;">
      <tr><td style="padding:6px 0;"><strong>E-mail:</strong> <a href="mailto:${escapeHtml(email)}" style="color:${ACCENT};">${escapeHtml(email)}</a></td></tr>
      ${name ? `<tr><td style="padding:6px 0;"><strong>Nome:</strong> ${escapeHtml(name)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;"><strong>Origem:</strong> ${escapeHtml(source)}</td></tr>
      ${ip ? `<tr><td style="padding:6px 0;color:#777;font-size:12px;"><strong>IP:</strong> ${escapeHtml(ip)}</td></tr>` : ""}
      ${ua ? `<tr><td style="padding:6px 0;color:#777;font-size:12px;"><strong>User-Agent:</strong> ${escapeHtml(ua)}</td></tr>` : ""}
    </table>
    <p style="margin:0 0 8px;">Para responder, basta usar <strong>Responder</strong> no seu cliente de e-mail — a resposta vai direto para o lead.</p>
    <p style="margin:18px 0 0;">Você também pode gerenciar este lead no painel:</p>
    <p style="margin:10px 0 0;">
      <a href="${APP_URL}/admin/leads-newsletter" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;">Abrir painel admin</a>
    </p>
  </td></tr>
  <tr><td style="background:${PRIMARY};padding:14px 32px;text-align:center;color:rgba(255,255,255,0.7);font-size:12px;">Novare App · Notificação interna</td></tr>
</table>
</td></tr></table></body></html>`;
}

function confirmationEmailHtml(opts: { name?: string }) {
  const { name } = opts;
  const greeting = name ? `Olá, <strong>${escapeHtml(name)}</strong>!` : "Olá!";
  return `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr><td style="background:${PRIMARY};padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:22px;">Bem-vindo à Novare</h1>
  </td></tr>
  <tr><td style="padding:32px;color:#333;font-size:15px;line-height:1.6;">
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 16px;">Obrigado por se inscrever! A partir de agora você vai receber, na sua caixa de entrada, conteúdos da Novare sobre:</p>
    <ul style="margin:0 0 18px 18px;padding:0;color:#444;">
      <li>Análises do mercado financeiro</li>
      <li>Simulações e estudos de rentabilidade</li>
      <li>Dicas práticas de investimentos e planejamento</li>
    </ul>
    <p style="margin:0 0 18px;">Sem spam — só conteúdo que ajuda seu dinheiro a render mais.</p>
    <p style="margin:0 0 8px;color:#777;font-size:13px;">Se quiser falar diretamente com um consultor, basta responder este e-mail.</p>
  </td></tr>
  <tr><td style="padding:0 32px 28px;text-align:center;">
    <a href="${APP_URL}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Visitar Novare</a>
  </td></tr>
  <tr><td style="background:${PRIMARY};padding:16px 32px;text-align:center;color:rgba(255,255,255,0.7);font-size:12px;">Novare App · Consultoria Financeira</td></tr>
</table>
</td></tr></table></body></html>`;
}

async function sendEmail(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
  headers?: Record<string, string>;
}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Resend error:", JSON.stringify(json));
    throw new Error(json?.message || "Resend send failed");
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const nameRaw = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const source = typeof body.source === "string" ? body.source.trim().slice(0, 60) : "yield-guide";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRaw || emailRaw.length > 255 || !emailRegex.test(emailRaw)) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const ua = req.headers.get("user-agent")?.slice(0, 250) || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Upsert lead (idempotente por e-mail)
    const { data: existing } = await admin
      .from("newsletter_leads")
      .select("id, created_at")
      .ilike("email", emailRaw)
      .maybeSingle();

    let isNew = false;
    if (!existing) {
      const { error: insErr } = await admin.from("newsletter_leads").insert({
        email: emailRaw,
        name: nameRaw || null,
        source: source || "yield-guide",
        ip_address: ip || null,
        user_agent: ua || null,
        status: "new",
      });
      if (insErr) {
        console.error("Lead insert error:", insErr);
        // Tratar conflito como já existente
        if (!String(insErr.message || "").toLowerCase().includes("duplicate")) {
          return new Response(JSON.stringify({ error: "Não foi possível registrar a inscrição" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        isNew = true;
      }
    }

    // Enviar e-mail interno (com Reply-To direto para o lead)
    try {
      await sendEmail({
        from: FROM_ADDRESS,
        to: [NOVARE_INBOX],
        reply_to: emailRaw,
        subject: `📥 Novo lead newsletter: ${emailRaw}`,
        html: leadEmailHtml({ email: emailRaw, name: nameRaw, ip, ua, source }),
      });
    } catch (e) {
      console.error("Falha ao notificar Novare:", e);
    }

    // Enviar confirmação ao cliente
    try {
      await sendEmail({
        from: FROM_ADDRESS,
        to: [emailRaw],
        subject: "✅ Inscrição confirmada — Novare",
        html: confirmationEmailHtml({ name: nameRaw }),
      });
    } catch (e) {
      console.error("Falha ao enviar confirmação:", e);
    }

    return new Response(JSON.stringify({ success: true, isNew }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("newsletter-subscribe error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
