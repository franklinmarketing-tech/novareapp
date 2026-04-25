// Admin envia mensagem manual para um lead PDF.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Novare <suporte@novareapp.com.br>";
const APP_URL = "https://novareapp.com.br";
const PRIMARY = "#1E3A5F";
const ACCENT = "#D26A2C";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function replyHtml(opts: { message: string; consultantName?: string }) {
  const body = escapeHtml(opts.message).replace(/\n/g, "<br/>");
  const sig = opts.consultantName
    ? `<p style="margin:24px 0 0;color:#444;">Atenciosamente,<br/><strong>${escapeHtml(opts.consultantName)}</strong><br/><span style="color:#777;font-size:13px;">Equipe Novare</span></p>`
    : `<p style="margin:24px 0 0;color:#444;">Atenciosamente,<br/><strong>Equipe Novare</strong></p>`;
  return `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr><td style="background:${PRIMARY};padding:24px 32px;color:#fff;">
    <h1 style="margin:0;font-size:18px;">Novare Consultoria</h1>
  </td></tr>
  <tr><td style="padding:32px;color:#333;font-size:15px;line-height:1.6;">${body}${sig}</td></tr>
  <tr><td style="padding:0 32px 28px;text-align:center;">
    <a href="${APP_URL}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Visitar Novare</a>
  </td></tr>
  <tr><td style="background:${PRIMARY};padding:14px 32px;text-align:center;color:rgba(255,255,255,0.7);font-size:12px;">Novare App · Consultoria Financeira</td></tr>
</table>
</td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const callerEmail = (claimsData.claims.email as string | undefined) ?? null;

    const { data: isAdmin } = await callerClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isSuper } = await callerClient.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    if (!isAdmin && !isSuper) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const leadId = typeof body.leadId === "string" ? body.leadId : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const consultantName = typeof body.consultantName === "string"
      ? body.consultantName.trim().slice(0, 80) : "";

    if (!leadId || !subject || subject.length > 200 || !message || message.length > 8000) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: lead } = await admin
      .from("pdf_leads")
      .select("id, email, name, message_count, reply_count")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email creds missing");

    const replyTo = callerEmail ?? "contato@novareapp.com.br";

    let emailStatus: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;
    let resendId: string | null = null;
    try {
      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [lead.email],
          reply_to: replyTo,
          subject,
          html: replyHtml({ message, consultantName }),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        emailStatus = "failed";
        errorMessage = json?.message || `HTTP ${res.status}`;
      } else {
        resendId = json?.id ?? null;
      }
    } catch (e) {
      emailStatus = "failed";
      errorMessage = e instanceof Error ? e.message : "Erro desconhecido";
    }

    await admin.from("pdf_lead_messages").insert({
      lead_id: leadId,
      direction: "outbound",
      sender_user_id: userId,
      sender_email: callerEmail,
      recipient_email: lead.email,
      subject,
      body_text: message,
      email_status: emailStatus,
      error_message: errorMessage,
      resend_message_id: resendId,
      has_attachment_pdf: false,
      metadata: { auto: false, consultant_name: consultantName },
    });

    if (emailStatus === "sent") {
      await admin
        .from("pdf_leads")
        .update({
          status: "responded",
          last_replied_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          reply_count: (lead.reply_count ?? 0) + 1,
          message_count: (lead.message_count ?? 0) + 1,
        })
        .eq("id", leadId);
    }

    if (emailStatus === "failed") {
      return new Response(JSON.stringify({ error: errorMessage || "Falha no envio" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pdf-lead-reply error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
