import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCog, Activity, Mail, Shield, Flag, AlertTriangle, ScrollText, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { useCountUp } from "@/hooks/useCountUp";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

interface Kpi {
  label: string;
  value: number;
  display?: string;
  sub?: string;
  icon: any;
  tone?: string;
  trend?: number[];
  trendColor?: string;
  glow?: string;
}

interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  resource_type: string;
  created_at: string;
}

const DAYS = 7;

function buildDailyBuckets<T extends { created_at: string }>(rows: T[]): number[] {
  const buckets = Array(DAYS).fill(0);
  const now = Date.now();
  rows.forEach((r) => {
    const diffDays = Math.floor((now - new Date(r.created_at).getTime()) / (24 * 3600 * 1000));
    const idx = DAYS - 1 - diffDays;
    if (idx >= 0 && idx < DAYS) buckets[idx]++;
  });
  return buckets;
}

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const chartData = data.map((v, i) => ({ d: i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          cursor={{ stroke: color, strokeOpacity: 0.3 }}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 11,
            padding: "4px 8px",
          }}
          formatter={(v: number) => [`${v}`, "Total"]}
          labelFormatter={(i: number) => {
            const d = new Date(Date.now() - (DAYS - 1 - i) * 24 * 3600 * 1000);
            return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
          }}
        />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${color})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const n = useCountUp(value, 800);
  return <>{n.toLocaleString("pt-BR")}</>;
};

const actionTone = (a: string) =>
  a === "create"
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
    : a === "update"
    ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20"
    : a === "delete"
    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20"
    : "bg-muted text-muted-foreground";

const SuperAdminDashboard = () => {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [recent, setRecent] = useState<AuditRow[]>([]);
  const [alerts, setAlerts] = useState<{ failedEmails: number; maintenance: boolean; readonly: boolean }>({
    failedEmails: 0,
    maintenance: false,
    readonly: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

      const [
        clientsAll,
        clients7d,
        admins,
        superAdmins,
        emails24h,
        emails7d,
        flags,
        config,
        audit24h,
        recentAudit,
      ] = await Promise.all([
        supabase.from("clients").select("status", { count: "exact" }),
        supabase.from("clients").select("created_at").gte("created_at", since7d),
        supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "admin"),
        supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "super_admin"),
        supabase
          .from("email_send_log")
          .select("status", { count: "exact" })
          .gte("created_at", since24h),
        supabase.from("email_send_log").select("created_at, status").gte("created_at", since7d),
        supabase.from("feature_flags").select("enabled", { count: "exact" }).eq("enabled", true),
        supabase
          .from("app_global_config")
          .select("maintenance_mode, readonly_mode")
          .eq("id", 1)
          .maybeSingle(),
        supabase.from("audit_log").select("created_at").gte("created_at", since7d),
        supabase
          .from("audit_log")
          .select("id, actor_email, action, resource_type, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const total = clientsAll.count ?? 0;
      const active = (clientsAll.data ?? []).filter((c: any) => c.status === "em_acompanhamento").length;
      const onboarding = (clientsAll.data ?? []).filter((c: any) => c.status === "onboarding_pendente").length;
      const failedEmails = (emails7d.data ?? []).filter((e: any) => e.status !== "sent").length;

      const clientsTrend = buildDailyBuckets(clients7d.data ?? []);
      const emailsTrend = buildDailyBuckets(emails7d.data ?? []);
      const eventsTrend = buildDailyBuckets(audit24h.data ?? []);

      setAlerts({
        failedEmails,
        maintenance: !!config.data?.maintenance_mode,
        readonly: !!config.data?.readonly_mode,
      });

      setKpis([
        {
          label: "Clientes Totais",
          value: total,
          sub: `${active} ativos · ${onboarding} em onboarding`,
          icon: Users,
          tone: "text-blue-500",
          trend: clientsTrend,
          trendColor: "hsl(217 91% 60%)",
          glow: "card-glow-primary",
        },
        {
          label: "Admins",
          value: admins.count ?? 0,
          sub: `${superAdmins.count ?? 0} super admins`,
          icon: UserCog,
          tone: "text-violet-500",
        },
        {
          label: "Emails 7d",
          value: emails7d.data?.length ?? 0,
          sub: failedEmails > 0 ? `⚠ ${failedEmails} falhas` : "Tudo ok",
          icon: Mail,
          tone: failedEmails > 0 ? "text-amber-500" : "text-emerald-500",
          trend: emailsTrend,
          trendColor: failedEmails > 0 ? "hsl(38 92% 50%)" : "hsl(160 84% 39%)",
          glow: failedEmails > 0 ? "card-glow-warning" : "card-glow-accent",
        },
        {
          label: "Eventos 7d",
          value: audit24h.data?.length ?? 0,
          sub: "Auditoria",
          icon: Activity,
          tone: "text-cyan-500",
          trend: eventsTrend,
          trendColor: "hsl(190 90% 50%)",
        },
        {
          label: "Feature Flags ativas",
          value: flags.count ?? 0,
          sub: "Veja em Feature Flags",
          icon: Flag,
          tone: "text-pink-500",
        },
        {
          label: "Modo manutenção",
          value: config.data?.maintenance_mode ? 1 : 0,
          display: config.data?.maintenance_mode ? "ON" : "OFF",
          sub: "Config global",
          icon: Shield,
          tone: config.data?.maintenance_mode ? "text-rose-500" : "text-muted-foreground",
        },
      ]);
      setRecent((recentAudit.data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  const hasCritical = alerts.failedEmails > 0 || alerts.maintenance || alerts.readonly;

  return (
    <>
      <SEO title="Super Admin · Visão Geral" description="Painel de controle total da plataforma" />
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-amber-500" />
          <span className="text-label-xs text-muted-foreground">Super Admin</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">Controle total da plataforma — KPIs, saúde do sistema e atividade recente.</p>
      </div>

      {!loading && hasCritical && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Atenção necessária</p>
            <ul className="mt-1 text-sm text-muted-foreground space-y-0.5">
              {alerts.failedEmails > 0 && (
                <li>• {alerts.failedEmails} falha{alerts.failedEmails > 1 ? "s" : ""} de email nos últimos 7 dias</li>
              )}
              {alerts.maintenance && <li>• Modo manutenção está <strong className="text-rose-500">ATIVO</strong></li>}
              {alerts.readonly && <li>• Modo somente-leitura está <strong className="text-amber-500">ATIVO</strong></li>}
            </ul>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <Card key={k.label} className={`card-interactive border-border/40 overflow-hidden ${k.glow ?? ""}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-label-xs text-muted-foreground">{k.label}</p>
                      <p className="text-display-lg mt-2">
                        {k.display ?? <AnimatedNumber value={k.value} />}
                      </p>
                      {k.sub && <p className="text-meta-sm text-muted-foreground mt-1">{k.sub}</p>}
                    </div>
                    <div className={`p-2.5 rounded-lg bg-muted/50 ${k.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  {k.trend && k.trendColor && (
                    <div className="mt-4 -mx-2">
                      <Sparkline data={k.trend} color={k.trendColor} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-6 border-border/40">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-cyan-500" />
            Atividade recente
          </CardTitle>
          <Link
            to="/super-admin/auditoria"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            Ver tudo <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded skeleton-shimmer" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum evento ainda.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {recent.map((r) => (
                <li key={r.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <Badge variant="outline" className={`${actionTone(r.action)} text-[0.65rem] uppercase tracking-wider px-1.5 py-0`}>
                    {r.action}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{r.resource_type}</span>
                  <span className="truncate flex-1 text-muted-foreground">{r.actor_email ?? "—"}</span>
                  <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default SuperAdminDashboard;
