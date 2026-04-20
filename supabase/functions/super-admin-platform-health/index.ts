import { authenticateSuperAdmin, corsHeaders, json } from "../_shared/super-admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateSuperAdmin(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const since24h = new Date(Date.now() - 86400000).toISOString();
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      usersTotal,
      usersNew24h,
      clientsTotal,
      adminsTotal,
      emailsSent24h,
      emailsFailed24h,
      alertsUnresolved,
      bansActive,
      auditLast24h,
      loginsFailed24h,
      configRow,
      flagsActive,
    ] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      admin.from("clients").select("id", { count: "exact", head: true }),
      admin.from("user_roles").select("id", { count: "exact", head: true }).in("role", ["admin", "super_admin"]),
      admin.from("email_send_log").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since24h),
      admin.from("email_send_log").select("id", { count: "exact", head: true }).in("status", ["dlq", "failed"]).gte("created_at", since24h),
      admin.from("security_alerts").select("id", { count: "exact", head: true }).eq("resolved", false),
      admin.from("banned_users").select("id", { count: "exact", head: true }),
      admin.from("audit_log").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      admin.from("security_alerts").select("id", { count: "exact", head: true }).eq("category", "failed_login").gte("created_at", since24h),
      admin.from("app_global_config").select("*").eq("id", 1).maybeSingle(),
      admin.from("feature_flags").select("id", { count: "exact", head: true }).eq("enabled", true),
    ]);

    const cfg = configRow.data ?? {};

    const healthScore = (() => {
      let score = 100;
      if ((alertsUnresolved.count ?? 0) > 5) score -= 20;
      if ((emailsFailed24h.count ?? 0) > 10) score -= 15;
      if ((loginsFailed24h.count ?? 0) > 20) score -= 15;
      if (cfg.maintenance_mode) score -= 10;
      if (cfg.readonly_mode) score -= 5;
      return Math.max(0, score);
    })();

    return json({
      health_score: healthScore,
      users: {
        total: usersTotal.count ?? 0,
        new_24h: usersNew24h.count ?? 0,
      },
      clients: clientsTotal.count ?? 0,
      admins: adminsTotal.count ?? 0,
      emails: {
        sent_24h: emailsSent24h.count ?? 0,
        failed_24h: emailsFailed24h.count ?? 0,
      },
      security: {
        alerts_unresolved: alertsUnresolved.count ?? 0,
        bans_active: bansActive.count ?? 0,
        failed_logins_24h: loginsFailed24h.count ?? 0,
      },
      activity: {
        audit_events_24h: auditLast24h.count ?? 0,
      },
      config: {
        maintenance_mode: cfg.maintenance_mode ?? false,
        readonly_mode: cfg.readonly_mode ?? false,
        ip_allowlist_enforced: cfg.ip_allowlist_enforced ?? false,
        feature_flags_active: flagsActive.count ?? 0,
      },
      checked_at: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
