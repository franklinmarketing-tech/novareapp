import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText, Search } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
  changes: any;
}

const PAGE_SIZE = 50;

const SuperAdminAudit = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("audit_log")
      .select("id, actor_email, action, resource_type, resource_id, created_at, changes")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data } = await q;
    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const filtered = rows.filter(
    (r) =>
      !search ||
      (r.actor_email ?? "").includes(search) ||
      r.resource_type.includes(search) ||
      r.action.includes(search)
  );

  const tone = (a: string) =>
    a === "create" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
    a === "update" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" :
    "bg-rose-500/15 text-rose-700 dark:text-rose-300";

  return (
    <>
      <SEO title="Super Admin · Auditoria" description="Logs de ações do sistema" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ScrollText className="h-5 w-5 text-cyan-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auditoria</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Logs do Sistema</h1>
        <p className="text-muted-foreground mt-1">Quem fez o quê, quando, e o que mudou.</p>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar por email, recurso ou ação…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Ator</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm">{r.actor_email ?? "—"}</TableCell>
                    <TableCell><Badge className={tone(r.action)}>{r.action}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.resource_type}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">{r.resource_id}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum evento</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Página {page + 1}</p>
        <div className="space-x-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={rows.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      </div>
    </>
  );
};

export default SuperAdminAudit;
