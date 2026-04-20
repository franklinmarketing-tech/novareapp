import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radio, Megaphone, Power, Trash2, Plus, AlertCircle, AlertTriangle, Eye, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { PasswordConfirmDialog } from "@/components/super-admin/PasswordConfirmDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SuperAdminOperacoes = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [newBroadcast, setNewBroadcast] = useState({
    message: "",
    severity: "info" as "info" | "warning" | "critical" | "success",
    target: "all" as "all" | "admin" | "client",
    expires_hours: "24",
  });
  const [clearScope, setClearScope] = useState<string | null>(null);

  const load = async () => {
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from("app_global_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("broadcast_messages").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setConfig(c); setBroadcasts(b ?? []);
  };
  useEffect(() => { load(); }, []);

  const updateConfig = async (patch: any) => {
    setConfig({ ...config, ...patch });
    const { error } = await supabase.from("app_global_config").update(patch).eq("id", 1);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Salvo" });
  };

  const createBroadcast = async () => {
    if (!newBroadcast.message.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const target_roles = newBroadcast.target === "all"
      ? ["admin", "client", "super_admin"]
      : newBroadcast.target === "admin" ? ["admin", "super_admin"] : ["client"];
    const expires_at = Number(newBroadcast.expires_hours) > 0
      ? new Date(Date.now() + Number(newBroadcast.expires_hours) * 3600000).toISOString() : null;
    const { error } = await supabase.from("broadcast_messages").insert({
      message: newBroadcast.message,
      severity: newBroadcast.severity,
      target_roles,
      expires_at,
      created_by: user!.id,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewBroadcast({ message: "", severity: "info", target: "all", expires_hours: "24" });
    toast({ title: "Aviso publicado" });
    load();
  };

  const toggleBroadcast = async (id: string, active: boolean) => {
    await supabase.from("broadcast_messages").update({ active }).eq("id", id);
    load();
  };
  const deleteBroadcast = async (id: string) => {
    await supabase.from("broadcast_messages").delete().eq("id", id);
    load();
  };

  const runClear = async ({ password, reason, confirm_text }: any) => {
    const { data, error } = await supabase.functions.invoke("super-admin-clear-data", {
      body: { scope: clearScope, password, reason, confirm_text },
    });
    if (error || data?.error) {
      toast({ title: "Erro", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Limpeza concluída", description: `${data.deleted ?? 0} registros removidos.` });
    setClearScope(null);
  };

  if (!config) return <p className="text-muted-foreground">Carregando…</p>;

  const SCOPE_LABELS: Record<string, { title: string; desc: string }> = {
    test_clients: { title: "Apagar clientes de teste", desc: "Remove TODOS os usuários cliente cujo email contém 'teste' ou 'test'." },
    old_audit_logs: { title: "Apagar logs de auditoria com mais de 90 dias", desc: "Reduz tamanho do histórico de auditoria." },
    old_email_logs: { title: "Apagar logs de email com mais de 90 dias", desc: "Limpa o histórico de envio de emails." },
    resolved_alerts: { title: "Apagar alertas já resolvidos", desc: "Remove permanentemente alertas marcados como resolvidos." },
  };

  return (
    <>
      <SEO title="Super Admin · Operações" description="Kill-switch, broadcast e modos especiais" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Power className="h-5 w-5 text-rose-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controle do app</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Operações</h1>
        <p className="text-muted-foreground mt-1">Kill-switch global, avisos no topo, modo somente-leitura e limpeza de dados.</p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Kill-switches */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Power className="h-4 w-4 text-rose-500" />Modos especiais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <Label className="font-medium">Modo manutenção</Label>
                  <p className="text-xs text-muted-foreground">Bloqueia login de não-admins e mostra aviso no topo.</p>
                </div>
              </div>
              <Switch checked={!!config.maintenance_mode} onCheckedChange={(v) => updateConfig({ maintenance_mode: v })} />
            </div>
            <div className="space-y-1.5 pl-8">
              <Label className="text-xs">Mensagem de manutenção</Label>
              <Input value={config.maintenance_message ?? ""} placeholder="Voltamos em 1h"
                onChange={(e) => setConfig({ ...config, maintenance_message: e.target.value })}
                onBlur={() => updateConfig({ maintenance_message: config.maintenance_message })} />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <Label className="font-medium">Modo somente-leitura</Label>
                  <p className="text-xs text-muted-foreground">Clientes não conseguem editar nada. Admins continuam normais.</p>
                </div>
              </div>
              <Switch checked={!!config.readonly_mode} onCheckedChange={(v) => updateConfig({ readonly_mode: v })} />
            </div>
            <div className="space-y-1.5 pl-8">
              <Label className="text-xs">Mensagem de somente-leitura</Label>
              <Input value={config.readonly_message ?? ""} placeholder="Estamos atualizando o sistema"
                onChange={(e) => setConfig({ ...config, readonly_message: e.target.value })}
                onBlur={() => updateConfig({ readonly_message: config.readonly_message })} />
            </div>
          </CardContent>
        </Card>

        {/* Broadcast */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-sky-500" />Avisos no topo do app</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5 md:col-span-3">
                <Label className="text-xs">Mensagem</Label>
                <Textarea rows={2} value={newBroadcast.message}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                  placeholder="Ex: Nova feature disponível! Visite a aba Investimentos." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Severidade</Label>
                <Select value={newBroadcast.severity} onValueChange={(v: any) => setNewBroadcast({ ...newBroadcast, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Público</Label>
                <Select value={newBroadcast.target} onValueChange={(v: any) => setNewBroadcast({ ...newBroadcast, target: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="admin">Só admins</SelectItem>
                    <SelectItem value="client">Só clientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expira em (horas)</Label>
                <Input type="number" value={newBroadcast.expires_hours}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, expires_hours: e.target.value })} />
              </div>
            </div>
            <Button onClick={createBroadcast} disabled={!newBroadcast.message.trim()}>
              <Plus className="h-4 w-4 mr-1" />Publicar aviso
            </Button>

            {broadcasts.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avisos recentes</p>
                {broadcasts.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/40">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{b.severity}</Badge>
                        {!b.active && <Badge className="bg-muted text-[10px]">desativado</Badge>}
                        {b.expires_at && new Date(b.expires_at) < new Date() && <Badge className="bg-muted text-[10px]">expirado</Badge>}
                      </div>
                      <p className="text-sm mt-1 truncate">{b.message}</p>
                      {b.expires_at && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Expira em {format(new Date(b.expires_at), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <Switch checked={b.active} onCheckedChange={(v) => toggleBroadcast(b.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => deleteBroadcast(b.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Limpar dados */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-rose-500" />Limpeza de dados</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(SCOPE_LABELS).map(([scope, info]) => (
              <div key={scope} className="flex items-center justify-between p-3 rounded-lg border border-border/40">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{info.title}</p>
                  <p className="text-xs text-muted-foreground">{info.desc}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setClearScope(scope)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Limpar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {clearScope && (
        <PasswordConfirmDialog
          open={!!clearScope}
          onOpenChange={(v) => !v && setClearScope(null)}
          title={SCOPE_LABELS[clearScope].title}
          description={`${SCOPE_LABELS[clearScope].desc} Esta ação NÃO pode ser desfeita.`}
          destructive
          requireReason
          requireConfirmText="DELETAR DEFINITIVO"
          confirmLabel="Confirmar limpeza"
          onConfirm={runClear}
        />
      )}
    </>
  );
};

export default SuperAdminOperacoes;
