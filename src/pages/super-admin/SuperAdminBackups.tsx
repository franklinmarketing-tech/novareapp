import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";

const TABLES = [
  "clients", "profiles", "user_roles", "income", "expenses", "debts",
  "assets", "insurance", "goals", "action_plans", "action_items",
  "diagnosis", "monitoring_snapshots", "feature_flags",
];

const SuperAdminBackups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [backups, setBackups] = useState<any[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);

  const load = () => supabase
    .from("system_backups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20)
    .then(({ data }) => setBackups(data ?? []));

  useEffect(() => { load(); }, []);

  const exportTable = async (table: string) => {
    if (!user) return;
    setExporting(table);
    const { data, error } = await supabase.from(table as any).select("*");
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setExporting(null); return; }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    await supabase.from("system_backups").insert({
      requested_by: user.id, scope: table, format: "json",
      status: "completed", file_size_bytes: blob.size, completed_at: new Date().toISOString(),
    });

    setExporting(null);
    load();
    toast({ title: "Export concluído", description: `${data?.length ?? 0} registros baixados` });
  };

  return (
    <>
      <SEO title="Super Admin · Backups" description="Exportações e backups" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Database className="h-5 w-5 text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Backup</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Exportação de Dados</h1>
        <p className="text-muted-foreground mt-1">Baixe o conteúdo de qualquer tabela em JSON.</p>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Exportar tabela</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {TABLES.map((t) => (
              <Button key={t} variant="outline" size="sm" disabled={!!exporting} onClick={() => exportTable(t)}>
                <Download className="h-3.5 w-3.5 mr-2" />
                {exporting === t ? "…" : t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem exportações recentes.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {backups.map((b) => (
                <li key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{b.scope}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString("pt-BR")} · {b.format.toUpperCase()}</p>
                  </div>
                  <Badge variant={b.status === "completed" ? "secondary" : "outline"}>{b.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default SuperAdminBackups;
