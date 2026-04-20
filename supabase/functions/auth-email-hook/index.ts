// Supabase Auth Email Hook → envia via Resend com template branded da Novare
// Webhook configurado em: Supabase Dashboard → Auth → Hooks → Send Email Hook
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

// Prioriza chave manual (RESEND_API_KEY) sobre connector (RESEND_API_KEY_1)
// porque o connector aponta para outra conta Resend.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_API_KEY_1");
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
const RESEND_API = "https://api.resend.com";
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "https://novareapp.com.br";
// URL pública do logo (com fallback pra .lovable.app que responde 200 direto, sem redirects que o Gmail bloqueia)
const LOGO_URL = "https://novareapp.lovable.app/logo-novare-email.png";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://hjikeevfzfswqydduars.supabase.co";
const FROM = "Novare Planejamento <planejamento@novareapp.com.br>";

const subjects: Record<string, string> = {
  signup: "Confirme seu email · Novare",
  recovery: "Redefinir senha · Novare",
  invite: "Você foi convidado · Novare",
  magiclink: "Seu link de acesso · Novare",
  email_change: "Confirmação de alteração de email · Novare",
  reauthentication: "Código de verificação · Novare",
};

const headings: Record<string, string> = {
  signup: "Bem-vindo à Novare",
  recovery: "Recuperação de senha",
  invite: "Você recebeu um convite",
  magiclink: "Acesse sua conta",
  email_change: "Confirme seu novo email",
  reauthentication: "Confirme sua identidade",
};

const intros: Record<string, string> = {
  signup: "Estamos felizes em ter você. Confirme seu email para começar seu planejamento financeiro:",
  recovery: "Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:",
  invite: "Você foi convidado a acessar a plataforma Novare. Clique no botão abaixo para ativar sua conta:",
  magiclink: "Use o link abaixo para acessar sua conta com segurança:",
  email_change: "Confirme a alteração do seu email clicando no botão abaixo:",
  reauthentication: "Use o código abaixo para confirmar sua identidade:",
};

const ctas: Record<string, string> = {
  signup: "Confirmar email",
  recovery: "Redefinir senha",
  invite: "Ativar conta",
  magiclink: "Acessar plataforma",
  email_change: "Confirmar novo email",
  reauthentication: "Verificar",
};

function buildEmailHtml(params: {
  actionType: string;
  actionUrl: string;
  token?: string;
  recipient: string;
}) {
  const { actionType, actionUrl, token, recipient } = params;
  const heading = headings[actionType] ?? "Notificação Novare";
  const intro = intros[actionType] ?? "Você recebeu uma notificação:";
  const cta = ctas[actionType] ?? "Acessar";
  const showToken = actionType === "reauthentication" && token;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
          <!-- Header with brand -->
          <tr>
            <td style="background:linear-gradient(145deg,hsl(220,40%,13%),hsl(220,45%,8%));padding:32px 40px;text-align:left;">
              <img src="${LOGO_URL}" alt="Novare" width="120" style="display:block;height:auto;max-width:120px;margin-bottom:8px;border:0;outline:none;text-decoration:none;" />
              <div style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:0.18em;margin-top:4px;">Planejamento Financeiro</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#111827;letter-spacing:-0.02em;">${heading}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">Olá,</p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#4b5563;">${intro}</p>

              ${showToken ? `
              <div style="text-align:center;margin:0 0 32px;">
                <div style="display:inline-block;background-color:#f3f4f6;padding:20px 32px;border-radius:12px;font-family:'SF Mono',Monaco,Consolas,monospace;font-size:32px;font-weight:600;letter-spacing:0.3em;color:#111827;">${token}</div>
              </div>
              ` : `
              <div style="text-align:center;margin:0 0 32px;">
                <a href="${actionUrl}" style="display:inline-block;background-color:hsl(160,55%,40%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:500;box-shadow:0 4px 14px hsl(160,55%,40%,0.3);">${cta}</a>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Ou copie e cole este link no navegador:</p>
              <p style="margin:0 0 32px;font-size:12px;color:hsl(160,55%,35%);word-break:break-all;">${actionUrl}</p>
              `}

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                Se você não solicitou este email, pode ignorá-lo com segurança.<br />
                Este email foi enviado para <strong style="color:#6b7280;">${recipient}</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} Novare · Planejamento Financeiro</p>
              <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;"><a href="${PUBLIC_APP_URL}" style="color:#9ca3af;text-decoration:none;">${PUBLIC_APP_URL.replace(/^https?:\/\//, "")}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurado");
    if (!HOOK_SECRET) throw new Error("SEND_EMAIL_HOOK_SECRET não configurado");

    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    // Verifica assinatura do webhook (formato standardwebhooks: v1,whsec_...)
    // Aceita formatos: "v1,whsec_BASE64", "whsec_BASE64" ou só "BASE64"
    const rawSecret = HOOK_SECRET.replace(/^v1,/, "").replace(/^whsec_/, "");
    const wh = new Webhook(rawSecret);
    const data = wh.verify(payload, headers) as {
      user: { email: string };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    const { user, email_data } = data;
    const actionType = email_data.email_action_type; // signup | recovery | magiclink | invite | email_change | reauthentication

    // BUG FIX #1: A URL precisa apontar pro endpoint /auth/v1/verify do SUPABASE,
    // não pro domínio do SPA. O Supabase valida o token_hash e só DEPOIS
    // redireciona pro redirect_to (que pode ser o domínio do app).
    // Para recovery, garante que o redirect_to aponte pro /reset-password.
    let baseRedirect = email_data.redirect_to || `${PUBLIC_APP_URL}/`;
    if (actionType === "recovery" && !baseRedirect.includes("/reset-password")) {
      baseRedirect = `${PUBLIC_APP_URL}/reset-password`;
    }
    const actionUrl = `${SUPABASE_URL}/auth/v1/verify?token=${email_data.token_hash}&type=${actionType}&redirect_to=${encodeURIComponent(baseRedirect)}`;

    const html = buildEmailHtml({
      actionType,
      actionUrl,
      token: email_data.token,
      recipient: user.email,
    });

    const subject = subjects[actionType] ?? "Notificação · Novare";

    const resendResponse = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [user.email],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("Resend error:", resendResponse.status, errBody);
      throw new Error(`Resend falhou [${resendResponse.status}]: ${errBody}`);
    }

    const result = await resendResponse.json();
    console.log("Email enviado:", { actionType, to: user.email, id: result.id });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("auth-email-hook error:", error);
    return new Response(
      JSON.stringify({
        error: { http_code: 500, message: error?.message ?? "Erro desconhecido" },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
