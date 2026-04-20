import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const LOGO_URL = "https://novareapp.com.br/logo-novare-email.png";
const APP_URL = "https://novareapp.com.br";

const PRIMARY = "#2b4464";
const ACCENT = "#c9643a";
const TEXT_COLOR = "#333333";
const MUTED = "#777777";

function baseLayout(content: string): string {
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
  <tr><td style="padding:32px 32px 24px;">
    ${content}
  </td></tr>
  <tr><td style="padding:16px 32px 28px;text-align:center;border-top:1px solid #eee;">
    <a href="${APP_URL}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Ver no App</a>
  </td></tr>
  <tr><td style="background:${PRIMARY};padding:18px 32px;text-align:center;">
    <span style="color:rgba(255,255,255,0.7);font-size:12px;">Novare App · Planejamento Financeiro Inteligente</span>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function templateSnapshotUpdate(data: any): { subject: string; html: string } {
  const patrimonio = Number(data.patrimonio || 0);
  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  return {
    subject: "📊 Seu patrimônio foi atualizado",
    html: baseLayout(`
      <h1 style="color:${PRIMARY};font-size:22px;margin:0 0 16px;">Atualização Patrimonial</h1>
      <p style="color:${TEXT_COLOR};font-size:15px;line-height:1.6;margin:0 0 20px;">
        Olá${data.clientName ? `, <strong>${data.clientName}</strong>` : ""}! Seu consultor registrou uma atualização nos seus dados financeiros.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:#f8f9fb;padding:16px;border-radius:8px;text-align:center;width:50%;">
            <span style="font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">Patrimônio Líquido</span><br/>
            <strong style="font-size:22px;color:${PRIMARY};">${fmt(patrimonio)}</strong>
          </td>
          <td width="12"></td>
          <td style="background:#f8f9fb;padding:16px;border-radius:8px;text-align:center;width:50%;">
            <span style="font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">Taxa de Poupança</span><br/>
            <strong style="font-size:22px;color:${ACCENT};">${data.savingsRate || "0"}%</strong>
          </td>
        </tr>
      </table>
      <p style="color:${MUTED};font-size:13px;line-height:1.5;">Data do snapshot: ${data.date || "—"}</p>
    `),
  };
}

function templateTaskCompleted(data: any): { subject: string; html: string } {
  return {
    subject: "✅ Uma ação do seu plano foi concluída",
    html: baseLayout(`
      <h1 style="color:${PRIMARY};font-size:22px;margin:0 0 16px;">Ação Concluída!</h1>
      <p style="color:${TEXT_COLOR};font-size:15px;line-height:1.6;margin:0 0 20px;">
        Olá${data.clientName ? `, <strong>${data.clientName}</strong>` : ""}! Uma ação do seu plano financeiro foi marcada como concluída:
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 18px;border-radius:6px;margin-bottom:20px;">
        <strong style="color:${TEXT_COLOR};font-size:15px;">${data.taskDescription || "Tarefa"}</strong>
      </div>
      <p style="color:${MUTED};font-size:13px;">Progresso geral do plano: <strong style="color:${ACCENT};">${data.overallProgress || 0}%</strong></p>
    `),
  };
}

function templateGoalAchieved(data: any): { subject: string; html: string } {
  return {
    subject: "🎉 Parabéns! Uma meta foi alcançada",
    html: baseLayout(`
      <h1 style="color:${PRIMARY};font-size:22px;margin:0 0 16px;">Meta Alcançada! 🎯</h1>
      <p style="color:${TEXT_COLOR};font-size:15px;line-height:1.6;margin:0 0 20px;">
        Olá${data.clientName ? `, <strong>${data.clientName}</strong>` : ""}! Todas as ações da meta abaixo foram concluídas:
      </p>
      <div style="background:#fefce8;border-left:4px solid ${ACCENT};padding:14px 18px;border-radius:6px;margin-bottom:20px;">
        <strong style="color:${TEXT_COLOR};font-size:15px;">${data.goalDescription || "Meta"}</strong>
      </div>
      <p style="color:${TEXT_COLOR};font-size:14px;line-height:1.5;">Continue assim!</p>
    `),
  };
}

function templateDiagnosisUpdate(data: any): { subject: string; html: string } {
  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  return {
    subject: "📋 Seu diagnóstico financeiro foi atualizado",
    html: baseLayout(`
      <h1 style="color:${PRIMARY};font-size:22px;margin:0 0 16px;">Diagnóstico Atualizado</h1>
      <p style="color:${TEXT_COLOR};font-size:15px;line-height:1.6;margin:0 0 20px;">
        Olá${data.clientName ? `, <strong>${data.clientName}</strong>` : ""}! Seu diagnóstico financeiro foi revisado pelo seu consultor.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#f8f9fb;padding:12px 16px;border-radius:8px;border-bottom:1px solid #eee;">
            <span style="color:${MUTED};font-size:12px;">Renda Total</span><br/>
            <strong style="color:${PRIMARY};font-size:16px;">${fmt(data.totalIncome || 0)}</strong>
          </td>
          <td style="background:#f8f9fb;padding:12px 16px;border-radius:8px;border-bottom:1px solid #eee;">
            <span style="color:${MUTED};font-size:12px;">Despesas</span><br/>
            <strong style="color:${PRIMARY};font-size:16px;">${fmt(data.totalExpenses || 0)}</strong>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fb;padding:12px 16px;border-radius:0 0 8px 8px;">
            <span style="color:${MUTED};font-size:12px;">Classificação de Risco</span><br/>
            <strong style="color:${ACCENT};font-size:16px;">${data.riskClassification || "—"}</strong>
          </td>
          <td style="background:#f8f9fb;padding:12px 16px;border-radius:0 0 8px 8px;">
            <span style="color:${MUTED};font-size:12px;">Capacidade de Poupança</span><br/>
            <strong style="color:${ACCENT};font-size:16px;">${(data.savingsCapacity || 0).toFixed(1)}%</strong>
          </td>
        </tr>
      </table>
    `),
  };
}

function templateWelcome(data: any): { subject: string; html: string } {
  const name = (data.clientName || "").split(" ")[0];
  return {
    subject: "Bem-vindo(a) à Novare 👋",
    html: baseLayout(`
      <h1 style="color:${PRIMARY};font-size:24px;margin:0 0 16px;">Bem-vindo(a) à Novare${name ? `, ${name}` : ""}!</h1>
      <p style="color:${TEXT_COLOR};font-size:15px;line-height:1.6;margin:0 0 18px;">
        É um prazer ter você com a gente. A partir de agora, você terá uma plataforma exclusiva para acompanhar seu planejamento financeiro com a Novare.
      </p>
      <p style="color:${TEXT_COLOR};font-size:15px;line-height:1.6;margin:0 0 18px;">
        Para acessar pela primeira vez, basta clicar no botão abaixo e criar a sua senha em <strong>"Esqueci minha senha"</strong> usando o e-mail no qual recebeu esta mensagem.
      </p>
      <div style="background:#f8f9fb;border-left:4px solid ${ACCENT};padding:14px 18px;border-radius:6px;margin:0 0 22px;">
        <strong style="color:${PRIMARY};font-size:14px;">Próximos passos</strong>
        <ul style="margin:8px 0 0;padding-left:18px;color:${TEXT_COLOR};font-size:14px;line-height:1.6;">
          <li>Acesse o app pelo botão abaixo</li>
          <li>Defina sua senha pessoal</li>
          <li>Conclua seu onboarding com seu consultor</li>
        </ul>
      </div>
      <p style="color:${MUTED};font-size:13px;line-height:1.5;margin:0;">
        Qualquer dúvida, é só responder este e-mail. Estamos aqui para te ajudar.
      </p>
    `),
  };
}

const TEMPLATES: Record<string, (data: any) => { subject: string; html: string }> = {
  welcome: templateWelcome,
  "snapshot-update": templateSnapshotUpdate,
  "task-completed": templateTaskCompleted,
  "goal-achieved": templateGoalAchieved,
  "diagnosis-update": templateDiagnosisUpdate,
};

// Allowed template names to prevent injection
const ALLOWED_TEMPLATES = new Set(Object.keys(TEMPLATES));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── AUTH: Verify caller is authenticated ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    // ── AUTH: Admins can send any template; regular users can only send "welcome" to themselves ──
    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    // ── INPUT VALIDATION ──
    const { to, templateName, templateData } = await req.json();
    if (!to || typeof to !== "string" || to.length > 255) {
      return new Response(JSON.stringify({ error: "Destinatário inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!templateName || !ALLOWED_TEMPLATES.has(templateName)) {
      return new Response(JSON.stringify({ error: `Template desconhecido: ${templateName}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Não-admins só podem disparar "welcome" para o próprio e-mail
    if (!isAdmin) {
      const callerEmail = (claimsData.claims.email as string | undefined)?.toLowerCase();
      if (templateName !== "welcome" || !callerEmail || callerEmail !== to.trim().toLowerCase()) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const templateFn = TEMPLATES[templateName];
    const { subject, html } = templateFn(templateData || {});

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Novare <suporte@novareapp.com.br>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: "Falha ao enviar email" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-client-email error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
