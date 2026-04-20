import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Trash2, Download, ExternalLink } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";

interface ClientRow {
  id: string;
  user_id: string;
  slug: string;
  status: string;
  created_at: string;
  full_name: string;
  email: string;
}

const SuperAdminClients = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: cs } = await supabase
      .from("clients")
      .select("id, user_id, slug, status, created_at")
      .order("created_at", { ascending: false });

    const ids = (cs ?? []).map((c) => c.user_id);
    const { data: ps } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", ids);

    setClients(
      (cs ?? []).map((c) => {
        const p = ps?.find((x) => x.user_id === c.user_id);
        return { ...c, full_name: p?.full_name ?? "—", email: p?.email ?? "—" };
      })
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const remove = async (c: ClientRow) => {
    if (!confirm(`EXCLUIR ${c.full_name} permanentemente? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cliente excluído" });
    load();
  };

  const exportClient = async (c: ClientRow) => {
    const { data, error } = await supabase.functions.invoke("super-admin-export-client", {
      body: { client_id: c.id },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cliente-${c.slug}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export gerado" });
  };

  return (
    <>
      <SEO title="Super Admin · Clientes" description="Gestão completa de clientes" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-blue-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gestão</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes — Controle Total</h1>
        <p className="text-muted-foreground mt-1">Excluir, exportar ou abrir o painel do cliente.</p>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou email…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/cliente/${c.slug}/onboarding`)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />Abrir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => exportClient(c)}>
                        <Download className="h-3.5 w-3.5 mr-1" />Export
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(c)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default SuperAdminClients;
