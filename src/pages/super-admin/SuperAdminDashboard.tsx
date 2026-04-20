import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCog, Activity, Database, Mail, AlertTriangle, Shield, Flag } from "lucide-react";
import { SEO } from "@/components/SEO";

interface Kpi { label: string; value: string | number; sub?: string; icon: any; tone?: string }

const SuperAdminDashboard = () => {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [
        clients,
        admins,
        superAdmins,
        emails24h,
        flags,
        config,
        recentAudit,
      ] = await Promise.all([
        supabase.from("clients").select("status", { count: "exact" }),
        supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "admin"),
        supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "super_admin"),
        supabase
          .from("email_send_log")
          .select("status", { count: "exact" })
          .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
        supabase.from("feature_flags").select("enabled", { count: "exact" }).eq("enabled", true),
        supabase.from("app_global_config").select("maintenance_mode").eq("id", 1).maybeSingle(),
        supabase.from("audit_log").select("id", { count: "exact" }).gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      ]);

      const total = clients.count ?? 0;
      const active = (clients.data ?? []).filter((c: any) => c.status === "em_acompanhamento").length;
      const onboarding = (clients.data ?? []).filter((c: any) => c.status === "onboarding_pendente").length;
      const failedEmails = (emails24h.data ?? []).filter((e: any) => e.status !== "sent").length;

      setKpis([
        { label: "Clientes Totais", value: total, sub: `${active} ativos · ${onboarding} em onboarding`, icon: Users, tone: "text-blue-500" },
        { label: "Admins", value: admins.count ?? 0, sub: `${superAdmins.count ?? 0} super admins`, icon: UserCog, tone: "text-violet-500" },
        { label: "Emails 24h", value: emails24h.count ?? 0, sub: failedEmails > 0 ? `⚠ ${failedEmails} falhas` : "Tudo ok", icon: Mail, tone: failedEmails > 0 ? "text-amber-500" : "text-emerald-500" },
        { label: "Eventos 24h", value: recentAudit.count ?? 0, sub: "Auditoria", icon: Activity, tone: "text-cyan-500" },
        { label: "Feature Flags ativas", value: flags.count ?? 0, sub: "Veja em Feature Flags", icon: Flag, tone: "text-pink-500" },
        { label: "Modo manutenção", value: config.data?.maintenance_mode ? "ON" : "OFF", sub: "Config global", icon: Shield, tone: config.data?.maintenance_mode ? "text-rose-500" : "text-muted-foreground" },
      ]);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <SEO title="Super Admin · Visão Geral" description="Painel de controle total da plataforma" />
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-amber-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Super Admin</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">Controle total da plataforma — KPIs, saúde do sistema e atividade recente.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6 h-32 animate-pulse bg-muted/30" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <Card key={k.label} className="border-border/40">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</p>
                      <p className="text-3xl font-bold mt-2">{k.value}</p>
                      {k.sub && <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>}
                    </div>
                    <div className={`p-2.5 rounded-lg bg-muted/50 ${k.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
};

export default SuperAdminDashboard;
