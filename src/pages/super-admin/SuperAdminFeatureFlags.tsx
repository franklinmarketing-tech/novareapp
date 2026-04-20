import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Flag, Search, Info, Power, PowerOff, Users, ShieldCheck, User } from "lucide-react";
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
  target_roles: string[] | null;
}

const roleMeta: Record<string, { label: string; icon: any; cls: string }> = {
  super_admin: { label: "Super Admin", icon: ShieldCheck, cls: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  admin: { label: "Admin", icon: Users, cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  client: { label: "Cliente", icon: User, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

const SuperAdminFeatureFlags = () => {
  const { toast } = useToast();
  const [flags, setFlags] = useState<FF[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feature_flags")
      .select("id, key, name, description, enabled, rollout_pct, target_roles")
      .order("name");
    setFlags((data ?? []) as FF[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id: string, patch: Partial<FF>) => {
    const { error } = await supabase.from("feature_flags").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setFlags((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    refreshFeatureFlags();
    toast({ title: "Atualizado" });
  };

  const toggleAll = async (enabled: boolean) => {
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled })
      .in("id", filtered.map((f) => f.id));
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setFlags((fs) =>
      fs.map((f) => (filtered.find((x) => x.id === f.id) ? { ...f, enabled } : f))
    );
    refreshFeatureFlags();
    toast({ title: enabled ? "Todas ligadas" : "Todas desligadas" });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flags;
    return flags.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q),
    );
  }, [flags, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, FF[]> = {};
    filtered.forEach((f) => {
      const prefix = f.key.split("_")[0];
      const label =
        prefix === "ai" ? "Inteligência Artificial"
        : prefix === "client" ? "Recursos do Cliente"
        : prefix === "admin" ? "Recursos do Admin"
        : prefix === "email" ? "Comunicação"
        : prefix === "advanced" || prefix === "beta" ? "Beta / Experimental"
        : "Outros";
      (groups[label] ||= []).push(f);
    });
    return groups;
  }, [filtered]);

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <>
      <SEO title="Super Admin · Feature Flags" description="Controle de features sem deploy" />

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Flag className="h-5 w-5 text-pink-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configuração
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-muted-foreground mt-1">
          {enabledCount} de {flags.length} features ativas no momento.
        </p>
      </div>

      {/* Card explicativo */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-semibold text-foreground">O que são Feature Flags?</p>
              <p className="text-muted-foreground">
                São <strong>interruptores</strong> que ligam ou desligam funcionalidades do app{" "}
                <strong>sem precisar publicar nova versão</strong>. Use para:
              </p>
              <ul className="text-muted-foreground list-disc list-inside space-y-1 ml-1">
                <li>
                  <strong>Conter custos</strong> — desligar IA temporariamente se a OpenAI estiver cara
                </li>
                <li>
                  <strong>Emergência</strong> — pausar emails, downloads ou recursos que estão dando erro
                </li>
                <li>
                  <strong>Liberação gradual</strong> — testar nova feature com 10% dos usuários antes de soltar pra todos
                </li>
                <li>
                  <strong>Controle por público</strong> — ligar algo só para admins, não para clientes
                </li>
              </ul>
              <p className="text-xs text-muted-foreground pt-1">
                <strong>Como usar:</strong> ligue/desligue o switch e a mudança vale na hora. O{" "}
                <strong>rollout %</strong> serve para liberar para uma porcentagem aleatória dos usuários
                (0% = ninguém, 100% = todos).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Busca + ações em massa */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, chave ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toggleAll(true)} disabled={!filtered.length}>
            <Power className="h-4 w-4 mr-1.5" />
            Ligar todas
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleAll(false)} disabled={!filtered.length}>
            <PowerOff className="h-4 w-4 mr-1.5" />
            Desligar todas
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma feature encontrada para "{search}".
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(grouped)} className="space-y-3">
          {Object.entries(grouped).map(([category, items]) => (
            <AccordionItem
              key={category}
              value={category}
              className="border border-border/40 rounded-lg bg-card px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{category}</span>
                  <Badge variant="outline" className="text-xs">
                    {items.length}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    {items.filter((i) => i.enabled).length} ativas
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 pb-2">
                  {items.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg border border-border/40 p-4 bg-background/50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h3 className="font-semibold">{f.name}</h3>
                            {f.enabled ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                ativa
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                desligada
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px] mb-2">
                            {f.key}
                          </Badge>
                          {f.description && (
                            <p className="text-sm text-muted-foreground">{f.description}</p>
                          )}

                          {f.target_roles && f.target_roles.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-3">
                              <span className="text-xs text-muted-foreground">Afeta:</span>
                              {f.target_roles.map((r) => {
                                const meta = roleMeta[r];
                                if (!meta) return null;
                                const Icon = meta.icon;
                                return (
                                  <Badge key={r} className={`${meta.cls} gap-1`}>
                                    <Icon className="h-3 w-3" />
                                    {meta.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}

                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs">Rollout gradual</Label>
                              <span className="text-xs font-mono text-muted-foreground">
                                {f.rollout_pct}%
                              </span>
                            </div>
                            <Slider
                              value={[f.rollout_pct]}
                              onValueChange={(v) =>
                                setFlags((fs) =>
                                  fs.map((x) => (x.id === f.id ? { ...x, rollout_pct: v[0] } : x)),
                                )
                              }
                              onValueCommit={(v) => update(f.id, { rollout_pct: v[0] })}
                              max={100}
                              step={5}
                              disabled={!f.enabled}
                              className="max-w-md"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1.5">
                              {f.rollout_pct === 0
                                ? "Ninguém vê (mesmo ativa)"
                                : f.rollout_pct === 100
                                ? "Todos os usuários veem"
                                : `Aproximadamente ${f.rollout_pct}% dos usuários veem`}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={f.enabled}
                          onCheckedChange={(v) => update(f.id, { enabled: v })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </>
  );
};

export default SuperAdminFeatureFlags;
