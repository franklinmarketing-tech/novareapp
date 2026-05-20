import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, Download, HardDrive, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";

const CLIENT_TABLES = [
  "clients", "profiles", "user_roles", "income", "expenses", "debts",
  "assets", "insurance", "goals", "action_plans", "action_items",
  "diagnosis", "monitoring_snapshots",
];

const SYSTEM_TABLES = ["feature_flags"];
const ALL_TABLES = [...CLIENT_TABLES, ...SYSTEM_TABLES];

const SuperAdminBackups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [backups, setBackups] = useState<any[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [fullBackupProgress, setFullBackupProgress] = useState(0);
  const [fullBackupRunning, setFullBackupRunning] = useState(false);

  const load = () => supabase
    .from("system_backups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20)
    .then(({ data }) => setBackups(data ?? []));

  useEffect(() => { load(); }, []);

  const triggerDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return blob.size;
  };

  const exportFullBackup = async () => {
    if (!user) return;
    setFullBackupRunning(true);
    setFullBackupProgress(0);

    const snapshot: Record<string, any[]> = {};
    let totalRecords = 0;
    let failed: string[] = [];

    for (let i = 0; i < CLIENT_TABLES.length; i++) {
      const table = CLIENT_TABLES[i];
      const { data, error } = await supabase.from(table as any).select("*");
      if (error) {
        failed.push(table);
      } else {
        snapshot[table] = data ?? [];
        totalRecords += data?.length ?? 0;
      }
      setFullBackupProgress(Math.round(((i + 1) / CLIENT_TABLES.length) * 100));
    }

    const payload = {
      generated_at: new Date().toISOString(),
      generated_by: user.email ?? user.id,
      version: "1.0",
      tables_included: CLIENT_TABLES.filter((t) => !failed.includes(t)),
      tables_failed: failed,
      total_records: totalRecords,
      data: snapshot,
    };

    const filename = `backup-clientes-${new Date().toISOString().slice(0, 10)}.json`;
    const size = triggerDownload(JSON.stringify(payload, null, 2), filename);

    await supabase.from("system_backups").insert({
      requested_by: user.id,
      scope: "full_backup_clientes",
      format: "json",
      status: failed.length === 0 ? "completed" : "partial",
      file_size_bytes: size,
      completed_at: new Date().toISOString(),
    });

    setFullBackupRunning(false);
    setFullBackupProgress(0);
    load();

    if (failed.length > 0) {
      toast({ title: "Backup parcial", description: `${totalRecords} registros. Falha em: ${failed.join(", ")}`, variant: "destructive" });
    } else {
      toast({ title: "Backup completo!", description: `${totalRecords} registros em ${CLIENT_TABLES.length} tabelas baixados com sucesso.` });
    }
  };

  const exportTable = async (table: string) => {
    if (!user) return;
    setExporting(table);
    const { data, error } = await supabase.from(table as any).select("*");
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setExporting(null); return; }

    const size = triggerDownload(JSON.stringify(data, null, 2), `${table}-${new Date().toISOString().slice(0, 10)}.json`);

    await supabase.from("system_backups").insert({
      requested_by: user.id, scope: table, format: "json",
      status: "completed", file_size_bytes: size, completed_at: new Date().toISOString(),
    });

    setExporting(null);
    load();
    toast({ title: "Export concluído", description: `${data?.length ?? 0} registros baixados` });
  };

  const isAnyExporting = fullBackupRunning || !!exporting;

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

      {/* Backup Completo de Clientes */}
      <Card className="mb-6 border-emerald-500/40 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400">Backup Completo de Clientes</CardTitle>
          </div>
          <CardDescription>
            Exporta todas as {CLIENT_TABLES.length} tabelas de dados de clientes em um único arquivo JSON.
            Use para guardar um snapshot completo do banco em caso de perda de dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {CLIENT_TABLES.map((t) => (
              <Badge key={t} variant="outline" className="text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                {t}
              </Badge>
            ))}
          </div>

          {fullBackupRunning && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Exportando tabelas…</span>
                <span>{fullBackupProgress}%</span>
              </div>
              <Progress value={fullBackupProgress} className="h-2" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={exportFullBackup}
              disabled={isAnyExporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Download className="h-4 w-4" />
              {fullBackupRunning ? `Gerando… ${fullBackupProgress}%` : "Baixar Backup Completo"}
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>O arquivo fica salvo apenas no seu computador</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exportar tabela individual */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Exportar tabela individual</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {ALL_TABLES.map((t) => (
              <Button key={t} variant="outline" size="sm" disabled={isAnyExporting} onClick={() => exportTable(t)}>
                <Download className="h-3.5 w-3.5 mr-2" />
                {exporting === t ? "…" : t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de exports</CardTitle></CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem exportações recentes.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {backups.map((b) => (
                <li key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{b.scope === "full_backup_clientes" ? "Backup completo de clientes" : b.scope}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString("pt-BR")} · {b.format.toUpperCase()}
                      {b.file_size_bytes ? ` · ${(b.file_size_bytes / 1024).toFixed(1)} KB` : ""}
                    </p>
                  </div>
                  <Badge variant={b.status === "completed" ? "secondary" : b.status === "partial" ? "outline" : "destructive"}>
                    {b.status === "completed" ? "concluído" : b.status === "partial" ? "parcial" : b.status}
                  </Badge>
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
