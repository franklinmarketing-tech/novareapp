import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Mail, Shield, AlertCircle, RefreshCcw, Server, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Health {
  health_score: number;
  users: { total: number; new_24h: number };
  clients: number;
  admins: number;
  emails: { sent_24h: number; failed_24h: number };
  security: { alerts_unresolved: number; bans_active: number; failed_logins_24h: number };
  activity: { audit_events_24h: number };
  config: { maintenance_mode: boolean; readonly_mode: boolean; ip_allowlist_enforced: boolean; feature_flags_active: number };
  checked_at: string;
}

const SuperAdminSaude = () => {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: res } = await supabase.functions.invoke("super-admin-platform-health");
    setData(res);
    setLoading(false);
  };
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, []);

  const healthColor = data && data.health_score >= 80 ? "text-emerald-500" : data && data.health_score >= 50 ? "text-amber-500" : "text-destructive";

  return (
    <>
      <SEO title="Super Admin · Saúde da Plataforma" description="Métricas de saúde em tempo real" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempo real</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Saúde da Plataforma</h1>
          <p className="text-muted-foreground mt-1">Métricas, segurança e estado do sistema.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Atualizar
        </Button>
      </div>

      {!data ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-6 max-w-6xl">
          {/* Score */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Saúde geral</p>
                  <p className={`text-5xl font-bold mt-1 ${healthColor}`}>{data.health_score}<span className="text-2xl text-muted-foreground">/100</span></p>
                </div>
                <Server className={`h-12 w-12 ${healthColor}`} />
              </div>
              <Progress value={data.health_score} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">Atualizado: {new Date(data.checked_at).toLocaleTimeString("pt-BR")}</p>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total usuários" value={data.users.total} sub={`+${data.users.new_24h} em 24h`} color="text-violet-500" />
            <StatCard icon={Users} label="Clientes" value={data.clients} color="text-sky-500" />
            <StatCard icon={Shield} label="Admins" value={data.admins} color="text-amber-500" />
            <StatCard icon={Activity} label="Eventos auditoria 24h" value={data.activity.audit_events_24h} color="text-emerald-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-sky-500" />Emails (24h)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-bold text-emerald-500">{data.emails.sent_24h}</p>
                    <p className="text-xs text-muted-foreground">enviados</p>
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${data.emails.failed_24h > 0 ? "text-destructive" : "text-muted-foreground"}`}>{data.emails.failed_24h}</p>
                    <p className="text-xs text-muted-foreground">falhas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4 text-rose-500" />Segurança</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className={`text-2xl font-bold ${data.security.alerts_unresolved > 0 ? "text-destructive" : "text-muted-foreground"}`}>{data.security.alerts_unresolved}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">alertas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{data.security.bans_active}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">banidos</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${data.security.failed_logins_24h > 10 ? "text-destructive" : "text-muted-foreground"}`}>{data.security.failed_logins_24h}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">login falho</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Config status */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Flag className="h-4 w-4 text-pink-500" />Estado do sistema</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <ConfigBadge label="Manutenção" on={data.config.maintenance_mode} dangerWhenOn />
              <ConfigBadge label="Somente-leitura" on={data.config.readonly_mode} dangerWhenOn />
              <ConfigBadge label="IP allowlist" on={data.config.ip_allowlist_enforced} />
              <Badge variant="outline" className="bg-pink-500/10 text-pink-700 dark:text-pink-300">
                {data.config.feature_flags_active} feature flags ativas
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const ConfigBadge = ({ label, on, dangerWhenOn }: { label: string; on: boolean; dangerWhenOn?: boolean }) => (
  <Badge variant="outline" className={
    on
      ? dangerWhenOn ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : "bg-muted text-muted-foreground"
  }>
    {label}: {on ? "ativo" : "inativo"}
  </Badge>
);

export default SuperAdminSaude;
