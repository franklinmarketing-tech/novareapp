// Recebe e-mail do cliente + PDF (base64) + snapshot da simulação,
// salva o lead em pdf_leads, faz upload do PDF no bucket calculator-pdfs,
// envia o e-mail (anexo) via Resend e registra a primeira mensagem outbound.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Novare <suporte@novareapp.com.br>";
const REPLY_TO = "contato@novareapp.com.br";
const APP_URL = "https://novareapp.com.br";
const PRIMARY = "#1E3A5F";
const ACCENT = "#D26A2C";
const BRIGHT = "#4D9AE8";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function pdfEmailHtml(opts: { snap?: Record<string, unknown> }) {
  const s = opts.snap ?? {};
  const linha = (label: string, value: unknown) =>
    value === undefined || value === null || value === ""
      ? ""
      : `<tr><td style="padding:6px 0;color:#444;font-size:13px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(String(value))}</td></tr>`;

  return `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(30,58,95,0.10);">
  <tr><td style="background:${PRIMARY};padding:28px 32px;text-align:center;color:#fff;">
    <h1 style="margin:0;font-size:22px;letter-spacing:.3px;">Sua Simulação de Aposentadoria</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Relatório personalizado · Novare Consultoria</p>
  </td></tr>
  <tr><td style="padding:28px 32px;color:#333;font-size:15px;line-height:1.6;">
    <p style="margin:0 0 14px;">Olá!</p>
    <p style="margin:0 0 14px;">Segue em <strong>anexo</strong> o relatório completo da sua simulação de aposentadoria. Nele você encontra a evolução do patrimônio, o detalhamento do Imposto de Renda e as recomendações da Novare.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #e5e9ef;border-radius:10px;padding:14px 18px;margin:18px 0;">
      ${linha("Patrimônio projetado", s.patrimonio)}
      ${linha("Renda mensal estimada", s.rendaMensal)}
      ${linha("Período de acumulação", s.anosAcumulo ? `${s.anosAcumulo} anos` : "")}
    </table>
    <p style="margin:0 0 18px;">Quer entender como esses números mudam com uma estratégia personalizada? Fale com um consultor Novare.</p>
    <p style="text-align:center;margin:22px 0 6px;">
      <a href="${APP_URL}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:14px;font-weight:700;">Falar com a Novare</a>
    </p>
    <p style="text-align:center;margin:6px 0 0;font-size:12px;color:#888;">Ou responda este e-mail — nossa equipe vai te atender.</p>
  </td></tr>
  <tr><td style="background:${PRIMARY};padding:14px 32px;text-align:center;color:rgba(255,255,255,0.7);font-size:12px;">Novare App · Consultoria Financeira · <a href="${APP_URL}" style="color:${BRIGHT};text-decoration:none;">novareapp.com.br</a></td></tr>
</table>
</td></tr></table></body></html>`;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = body.name ? String(body.name).trim().slice(0, 120) : null;
    const pdfBase64 = String(body.pdfBase64 ?? "");
    const filename = (String(body.filename ?? "simulacao-novare.pdf") || "simulacao-novare.pdf").slice(0, 120);
    const snapshot = (body.snapshot && typeof body.snapshot === "object") ? body.snapshot : null;

    if (!isValidEmail(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!pdfBase64 || pdfBase64.length < 100) {
      return new Response(JSON.stringify({ error: "PDF inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Limite ~10 MB em base64
    if (pdfBase64.length > 14_000_000) {
      return new Response(JSON.stringify({ error: "PDF muito grande" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    // Decodificar base64 para upload no Storage
    const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));

    // 1) cria/atualiza lead
    const { data: existing } = await admin
      .from("pdf_leads")
      .select("id, message_count")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let leadId: string;
    if (existing?.id) {
      leadId = existing.id;
    } else {
      const { data: ins, error: insErr } = await admin
        .from("pdf_leads")
        .insert({
          email,
          name,
          source: "calculadora",
          status: "new",
          ip_address: ip,
          user_agent: ua,
          simulation_snapshot: snapshot,
        })
        .select("id")
        .single();
      if (insErr || !ins) throw new Error(insErr?.message ?? "Falha ao criar lead");
      leadId = ins.id;
    }

    // 2) upload do PDF
    const storagePath = `${leadId}/${Date.now()}-${filename}`;
    const { error: upErr } = await admin.storage
      .from("calculator-pdfs")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: false });
    if (upErr) throw new Error(`Upload PDF falhou: ${upErr.message}`);

    // 3) atualiza lead com pdf_url
    await admin
      .from("pdf_leads")
      .update({
        pdf_url: storagePath,
        pdf_filename: filename,
        simulation_snapshot: snapshot,
      })
      .eq("id", leadId);

    // 4) envia e-mail com anexo (Resend via gateway)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email creds missing");

    const subject = "Sua Simulação de Aposentadoria · Novare";
    const html = pdfEmailHtml({ snap: snapshot ?? undefined });

    let emailStatus: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;
    let resendId: string | null = null;
    const plainText =
      `Olá!\n\n` +
      `Segue em anexo o relatório completo da sua simulação de aposentadoria.\n` +
      `Nele você encontra a evolução do patrimônio, o detalhamento do Imposto de Renda e as recomendações da Novare.\n\n` +
      `Quer entender como esses números mudam com uma estratégia personalizada? Fale com um consultor Novare:\n` +
      `${APP_URL}\n\n` +
      `Ou simplesmente responda este e-mail — nossa equipe vai te atender.\n\n` +
      `Novare Consultoria de Investimentos\n` +
      `${APP_URL}`;
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
          to: [email],
          reply_to: REPLY_TO,
          subject,
          html,
          text: plainText,
          headers: {
            "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "category", value: "pdf_lead" },
            { name: "source", value: "calculadora" },
          ],
          attachments: [
            { filename, content: pdfBase64 }, // Resend aceita base64 em "content"
          ],
        }),
      });
      const json = await res.json().catch(() => ({}));
      console.log("[send-pdf-lead] Resend response", {
        status: res.status,
        ok: res.ok,
        body: json,
        from: FROM_ADDRESS,
        to: email,
      });
      if (!res.ok) {
        emailStatus = "failed";
        errorMessage = json?.message || json?.name || `HTTP ${res.status}`;
      } else {
        resendId = json?.id ?? null;
        if (!resendId) {
          console.warn("[send-pdf-lead] Resend retornou 200 sem id", json);
        }
      }
    } catch (e) {
      emailStatus = "failed";
      errorMessage = e instanceof Error ? e.message : "Erro desconhecido";
    }

    // 5) registra primeira mensagem outbound
    const bodyText =
      "Segue em anexo o relatório completo da sua simulação de aposentadoria. " +
      "Quer entender como esses números mudam com uma estratégia personalizada? " +
      "Responda este e-mail — nossa equipe vai te atender.";
    await admin.from("pdf_lead_messages").insert({
      lead_id: leadId,
      direction: "outbound",
      sender_user_id: null,
      sender_email: FROM_ADDRESS,
      recipient_email: email,
      subject,
      body_text: bodyText,
      body_html: html,
      email_status: emailStatus,
      error_message: errorMessage,
      resend_message_id: resendId,
      has_attachment_pdf: true,
      metadata: { auto: true, source: "calculadora" },
    });

    // 6) atualiza contadores no lead
    if (emailStatus === "sent") {
      await admin
        .from("pdf_leads")
        .update({
          message_count: (existing?.message_count ?? 0) + 1,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    }

    if (emailStatus === "failed") {
      return new Response(JSON.stringify({ error: errorMessage || "Falha no envio" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, leadId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-pdf-lead error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
