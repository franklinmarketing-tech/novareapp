import {
  authenticateSuperAdmin,
  corsHeaders,
  getClientIp,
  json,
  logAction,
  requirePassword,
} from "../_shared/super-admin-auth.ts";
import { deleteUserAccount } from "../_shared/delete-user-account.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateSuperAdmin(req);
    if ("error" in auth) return auth.error;
    const { user, admin } = auth;

    const body = await req.json();
    const action = String(body.action ?? "");
    const targetUserId = String(body.target_user_id ?? "");
    const password = String(body.password ?? "");
    const reason = String(body.reason ?? "");

    if (!action || !targetUserId) return json({ error: "action e target_user_id obrigatórios" }, 400);

    const { data: cfg } = await admin
      .from("app_global_config")
      .select("require_password_for_destructive")
      .eq("id", 1)
      .maybeSingle();
    if (cfg?.require_password_for_destructive !== false) {
      if (!password) return json({ error: "Senha do super admin obrigatória" }, 400);
      const ok = await requirePassword(user.email!, password);
      if (!ok) return json({ error: "Senha incorreta" }, 403);
    }

    const { data: targetUser } = await admin.auth.admin.getUserById(targetUserId);
    const targetEmail = targetUser?.user?.email ?? null;

    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent");

    let result: Record<string, unknown> = {};

    switch (action) {
      case "force_logout": {
        const { error } = await admin.auth.admin.signOut(targetUserId, "global");
        if (error) return json({ error: error.message }, 500);
        result = { ok: true, message: "Sessões encerradas" };
        break;
      }

      case "ban": {
        const banDays = Number(body.ban_days ?? 0);
        const banUntil = banDays > 0 ? new Date(Date.now() + banDays * 86400000).toISOString() : null;
        await admin.auth.admin.updateUserById(targetUserId, {
          ban_duration: banDays > 0 ? `${banDays * 24}h` : "876000h",
        });
        await admin.from("banned_users").upsert({
          user_id: targetUserId,
          email: targetEmail ?? "unknown",
          reason: reason || "Banido pelo super admin",
          banned_by: user.id,
          banned_until: banUntil,
        }, { onConflict: "user_id" });
        await admin.auth.admin.signOut(targetUserId, "global");
        result = { ok: true, message: banDays > 0 ? `Banido por ${banDays} dias` : "Banido permanentemente" };
        break;
      }

      case "unban": {
        await admin.auth.admin.updateUserById(targetUserId, { ban_duration: "none" });
        await admin.from("banned_users").delete().eq("user_id", targetUserId);
        result = { ok: true, message: "Banimento removido" };
        break;
      }

      case "reset_password": {
        const newPassword = `Nv-${crypto.randomUUID().slice(0, 8)}-${Date.now().toString(36)}`;
        const { error } = await admin.auth.admin.updateUserById(targetUserId, {
          password: newPassword,
        });
        if (error) return json({ error: error.message }, 500);
        await admin.auth.admin.signOut(targetUserId, "global");
        result = { ok: true, temp_password: newPassword, message: "Senha temporária gerada" };
        break;
      }

      case "delete_user": {
        const deletion = await deleteUserAccount(admin, targetUserId);
        result = { ok: true, message: "Usuário deletado", ...deletion };
        break;
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }

    // Strip sensitive credentials before persisting to audit log
    const { temp_password: _omitTempPassword, ...safeMetadata } = result as Record<string, unknown>;

    await logAction(admin, {
      actor_user_id: user.id,
      actor_email: user.email,
      action,
      target_type: "user",
      target_id: targetUserId,
      target_email: targetEmail ?? undefined,
      reason,
      ip_address: ip,
      user_agent: ua,
      metadata: safeMetadata,
    });

    return json(result);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
