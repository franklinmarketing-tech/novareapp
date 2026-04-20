import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Plus, Trash2, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  category: string;
  title: string;
  description: string | null;
  user_email: string | null;
  ip_address: string | null;
  resolved: boolean;
  created_at: string;
}

interface IpEntry {
  id: string;
  ip_address: string;
  label: string | null;
  user_id: string | null;
  created_at: string;
}

const SEV_BADGE = {
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  critical: "bg-destructive/15 text-destructive",
} as const;

const SEV_ICON = { info: Info, warning: AlertTriangle, critical: AlertCircle } as const;

const SuperAdminSeguranca = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ips, setIps] = useState<IpEntry[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [newIp, setNewIp] = useState("");
  const [newIpLabel, setNewIpLabel] = useState("");

  const load = async () => {
    const [{ data: a }, { data: i }, { data: c }] = await Promise.all([
      supabase.from("security_alerts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("ip_allowlist").select("*").order("created_at", { ascending: false }),
      supabase.from("app_global_config").select("*").eq("id", 1).maybeSingle(),
    ]);
    setAlerts((a ?? []) as Alert[]);
    setIps((i ?? []) as IpEntry[]);
    setConfig(c);
  };

  useEffect(() => { load(); }, []);

  const updateConfig = async (patch: any) => {
    setConfig({ ...config, ...patch });
    const { error } = await supabase.from("app_global_config").update(patch).eq("id", 1);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Configuração salva" });
  };

  const addIp = async () => {
    const ip = newIp.trim();
    if (!ip) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("ip_allowlist").insert({
      ip_address: ip,
      label: newIpLabel.trim() || null,
      created_by: user!.id,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewIp(""); setNewIpLabel("");
    toast({ title: "IP adicionado" });
    load();
  };

  const removeIp = async (id: string) => {
    await supabase.from("ip_allowlist").delete().eq("id", id);
    load();
  };

  const resolveAlert = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("security_alerts").update({
      resolved: true, resolved_at: new Date().toISOString(), resolved_by: user!.id,
    }).eq("id", id);
    load();
  };

  const unresolvedCount = alerts.filter((a) => !a.resolved).length;

  return (
    <>
      <SEO title="Super Admin · Segurança" description="Alertas, IP allowlist e proteção" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proteção</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Segurança</h1>
        <p className="text-muted-foreground mt-1">
          Alertas, IP allowlist e configurações de proteção da plataforma.
          {unresolvedCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-destructive font-medium">
              <AlertCircle className="h-3.5 w-3.5" />{unresolvedCount} alerta{unresolvedCount > 1 ? "s" : ""} não resolvido{unresolvedCount > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-6 max-w-5xl">
        {/* Config rápida */}
        {config && (
          <Card>
            <CardHeader><CardTitle className="text-base">Políticas globais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Exigir confirmação por senha em ações destrutivas</Label>
                  <p className="text-xs text-muted-foreground">Banir, deletar usuários, limpar dados.</p>
                </div>
                <Switch checked={config.require_password_for_destructive ?? true}
                  onCheckedChange={(v) => updateConfig({ require_password_for_destructive: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Restringir login admin por IP allowlist</Label>
                  <p className="text-xs text-muted-foreground">Quando ativo, apenas IPs cadastrados abaixo podem fazer login como admin.</p>
                </div>
                <Switch checked={config.ip_allowlist_enforced ?? false}
                  onCheckedChange={(v) => updateConfig({ ip_allowlist_enforced: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Limite de tentativas de login falhas</Label>
                  <Input type="number" value={config.failed_login_threshold ?? 5}
                    onChange={(e) => setConfig({ ...config, failed_login_threshold: Number(e.target.value) })}
                    onBlur={() => updateConfig({ failed_login_threshold: config.failed_login_threshold })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Janela de detecção (minutos)</Label>
                  <Input type="number" value={config.failed_login_window_minutes ?? 15}
                    onChange={(e) => setConfig({ ...config, failed_login_window_minutes: Number(e.target.value) })}
                    onBlur={() => updateConfig({ failed_login_window_minutes: config.failed_login_window_minutes })} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* IP allowlist */}
        <Card>
          <CardHeader><CardTitle className="text-base">IPs permitidos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="Ex: 201.74.208.14" value={newIp} onChange={(e) => setNewIp(e.target.value)} />
              <Input placeholder="Rótulo (escritório, casa…)" value={newIpLabel} onChange={(e) => setNewIpLabel(e.target.value)} />
              <Button onClick={addIp}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
            </div>
            {ips.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum IP cadastrado. Lista vazia = todos os IPs permitidos.</p>
            ) : (
              <div className="space-y-1">
                {ips.map((ip) => (
                  <div key={ip.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card/50">
                    <div>
                      <p className="font-mono text-sm">{ip.ip_address}</p>
                      {ip.label && <p className="text-xs text-muted-foreground">{ip.label}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeIp(ip.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Alertas recentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum alerta. Tudo tranquilo.</p>
            ) : (
              alerts.map((a) => {
                const Icon = SEV_ICON[a.severity];
                return (
                  <div key={a.id} className={`p-3 rounded-lg border ${a.resolved ? "border-border/40 opacity-60" : "border-border/60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${a.severity === "critical" ? "text-destructive" : a.severity === "warning" ? "text-amber-500" : "text-sky-500"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{a.title}</p>
                            <Badge variant="outline" className={`text-[10px] ${SEV_BADGE[a.severity]}`}>{a.severity}</Badge>
                            <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                          </div>
                          {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            {a.user_email && <span>{a.user_email}</span>}
                            {a.ip_address && <span className="font-mono">{a.ip_address}</span>}
                            <span>{formatDistanceToNow(new Date(a.created_at), { locale: ptBR, addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      {!a.resolved && (
                        <Button size="sm" variant="ghost" onClick={() => resolveAlert(a.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Resolver
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SuperAdminSeguranca;
