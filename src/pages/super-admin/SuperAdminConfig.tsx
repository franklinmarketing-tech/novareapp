import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings2, Save, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

const SuperAdminConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("app_global_config").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => setConfig(data));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("app_global_config")
      .update({
        max_clients_per_admin: config.max_clients_per_admin,
        max_storage_mb_per_client: config.max_storage_mb_per_client,
        maintenance_mode: config.maintenance_mode,
        maintenance_message: config.maintenance_message,
        allowed_email_domains: config.allowed_email_domains,
        integrations: config.integrations,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Configuração salva" });
  };

  if (!config) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <>
      <SEO title="Super Admin · Configuração Global" description="Configurações da plataforma" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="h-5 w-5 text-violet-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sistema</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Configuração Global</h1>
        <p className="text-muted-foreground mt-1">Limites, integrações e modo manutenção.</p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Modo Manutenção</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ativar modo manutenção (bloqueia logins não-admin)</Label>
              <Switch checked={config.maintenance_mode} onCheckedChange={(v) => setConfig({ ...config, maintenance_mode: v })} />
            </div>
            <div className="space-y-2">
              <Label>Mensagem exibida</Label>
              <Textarea
                value={config.maintenance_message ?? ""}
                onChange={(e) => setConfig({ ...config, maintenance_message: e.target.value })}
                placeholder="Estamos em manutenção. Voltamos em breve."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Limites</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Máx. clientes por admin</Label>
              <Input type="number" value={config.max_clients_per_admin}
                onChange={(e) => setConfig({ ...config, max_clients_per_admin: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Máx. storage por cliente (MB)</Label>
              <Input type="number" value={config.max_storage_mb_per_client}
                onChange={(e) => setConfig({ ...config, max_storage_mb_per_client: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Integrações ativas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(config.integrations ?? {}).map((k) => (
              <div key={k} className="flex items-center justify-between">
                <Label className="capitalize">{k.replace(/_/g, " ")}</Label>
                <Switch
                  checked={config.integrations[k]}
                  onCheckedChange={(v) => setConfig({ ...config, integrations: { ...config.integrations, [k]: v } })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Domínios permitidos para signup</CardTitle></CardHeader>
          <CardContent>
            <Input
              value={(config.allowed_email_domains ?? []).join(", ")}
              onChange={(e) => setConfig({
                ...config,
                allowed_email_domains: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })}
              placeholder="exemplo.com, empresa.com.br (vazio = todos)"
            />
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />{saving ? "Salvando…" : "Salvar configuração"}
        </Button>
      </div>
    </>
  );
};

export default SuperAdminConfig;
