import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { refreshFeatureFlags } from "@/hooks/useFeatureFlag";

interface FF {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_pct: number;
}

const SuperAdminFeatureFlags = () => {
  const { toast } = useToast();
  const [flags, setFlags] = useState<FF[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("feature_flags").select("*").order("name");
    setFlags((data ?? []) as FF[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<FF>) => {
    const { error } = await supabase.from("feature_flags").update(patch).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setFlags((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    refreshFeatureFlags();
    toast({ title: "Atualizado" });
  };

  return (
    <>
      <SEO title="Super Admin · Feature Flags" description="Controle de features sem deploy" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Flag className="h-5 w-5 text-pink-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuração</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-muted-foreground mt-1">Ligue/desligue features sem precisar fazer deploy.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-4">
          {flags.map((f) => (
            <Card key={f.id} className="border-border/40">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{f.name}</h3>
                      <Badge variant="outline" className="font-mono text-xs">{f.key}</Badge>
                      {f.enabled && <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">ativa</Badge>}
                    </div>
                    {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}

                    <div className="mt-4">
                      <Label className="text-xs">Rollout: {f.rollout_pct}%</Label>
                      <Slider
                        value={[f.rollout_pct]}
                        onValueChange={(v) => setFlags((fs) => fs.map((x) => x.id === f.id ? { ...x, rollout_pct: v[0] } : x))}
                        onValueCommit={(v) => update(f.id, { rollout_pct: v[0] })}
                        max={100} step={5} className="mt-2 max-w-xs"
                      />
                    </div>
                  </div>
                  <Switch checked={f.enabled} onCheckedChange={(v) => update(f.id, { enabled: v })} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default SuperAdminFeatureFlags;
