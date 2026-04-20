import {
  authenticateSuperAdmin,
  corsHeaders,
  getClientIp,
  json,
  logAction,
  requirePassword,
} from "../_shared/super-admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateSuperAdmin(req);
    if ("error" in auth) return auth.error;
    const { user, admin } = auth;

    const body = await req.json();
    const scope = String(body.scope ?? "");
    const password = String(body.password ?? "");
    const confirmText = String(body.confirm_text ?? "");
    const reason = String(body.reason ?? "");

    if (confirmText !== "DELETAR DEFINITIVO") {
      return json({ error: "Confirmação inválida. Digite exatamente 'DELETAR DEFINITIVO'." }, 400);
    }
    if (!password) return json({ error: "Senha do super admin obrigatória" }, 400);
    const ok = await requirePassword(user.email!, password);
    if (!ok) return json({ error: "Senha incorreta" }, 403);

    let result: Record<string, unknown> = {};

    switch (scope) {
      case "test_clients": {
        // Delete clients whose email contains 'teste' or 'test'
        const { data: testProfiles } = await admin
          .from("profiles")
          .select("user_id, email")
          .or("email.ilike.%teste%,email.ilike.%test%");
        const userIds = (testProfiles ?? []).map((p) => p.user_id);
        let deleted = 0;
        for (const uid of userIds) {
          // Only delete clients (not admins)
          const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
          if (roles?.some((r) => r.role === "client")) {
            await admin.auth.admin.deleteUser(uid);
            deleted++;
          }
        }
        result = { deleted };
        break;
      }

      case "old_audit_logs": {
        const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
        const { count } = await admin.from("audit_log").delete({ count: "exact" }).lt("created_at", cutoff);
        result = { deleted: count ?? 0 };
        break;
      }

      case "old_email_logs": {
        const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
        const { count } = await admin.from("email_send_log").delete({ count: "exact" }).lt("created_at", cutoff);
        result = { deleted: count ?? 0 };
        break;
      }

      case "resolved_alerts": {
        const { count } = await admin.from("security_alerts").delete({ count: "exact" }).eq("resolved", true);
        result = { deleted: count ?? 0 };
        break;
      }

      default:
        return json({ error: `Escopo desconhecido: ${scope}` }, 400);
    }

    await logAction(admin, {
      actor_user_id: user.id,
      actor_email: user.email,
      action: `clear_data:${scope}`,
      target_type: "data",
      reason,
      ip_address: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
      metadata: result,
    });

    return json({ ok: true, ...result });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
