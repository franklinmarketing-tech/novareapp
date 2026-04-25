// Webhook do Resend Inbound (configure no painel do Resend).
// Recebe respostas dos clientes e adiciona como mensagem inbound na thread do lead.
// Endpoint público (sem JWT). Resend envia eventos em formato:
// https://resend.com/docs/dashboard/webhooks/event-types#emailreceived
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, resend-signature",
};

function extractEmail(addr?: string | null): string | null {
  if (!addr) return null;
  const m = addr.match(/<([^>]+)>/);
  return (m ? m[1] : addr).trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json().catch(() => ({} as Record<string, unknown>));
    // Suportar tanto { type, data: {...} } como objeto direto
    // deno-lint-ignore no-explicit-any
    const data: any = (payload as any).data ?? payload;

    const fromEmail =
      extractEmail(data.from) ||
      extractEmail(data.sender) ||
      extractEmail(data?.envelope?.from) ||
      null;
    const subject = String(data.subject ?? "(sem assunto)").slice(0, 300);
    const text = String(data.text ?? data.body_text ?? "").slice(0, 50_000);
    const html = data.html ?? data.body_html ?? null;
    const messageId = data.message_id ?? data.id ?? null;

    if (!fromEmail) {
      return new Response(JSON.stringify({ error: "from missing", payload: data }), {
        status: 200, // 200 para não fazer Resend reenviar infinitamente
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Acha o lead mais recente com esse e-mail
    const { data: lead } = await admin
      .from("pdf_leads")
      .select("id, inbound_count, message_count")
      .eq("email", fromEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lead) {
      // Sem lead correspondente: ignora silenciosamente (200 para Resend)
      return new Response(JSON.stringify({ ignored: true, reason: "no_lead", from: fromEmail }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("pdf_lead_messages").insert({
      lead_id: lead.id,
      direction: "inbound",
      sender_email: fromEmail,
      recipient_email: "suporte@novareapp.com.br",
      subject,
      body_text: text,
      body_html: typeof html === "string" ? html.slice(0, 200_000) : null,
      email_status: "received",
      resend_message_id: typeof messageId === "string" ? messageId : null,
      metadata: { raw: data },
    });

    await admin
      .from("pdf_leads")
      .update({
        status: "new", // marca como precisando de atenção
        inbound_count: (lead.inbound_count ?? 0) + 1,
        message_count: (lead.message_count ?? 0) + 1,
        last_inbound_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pdf-lead-inbound error:", err);
    // 200 mesmo em erro para evitar reentregas infinitas; logamos.
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "err" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
