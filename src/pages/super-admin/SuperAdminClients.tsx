import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Search, Trash2, Download, ExternalLink, Plus, Pencil, Ban, CheckCircle2,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";

type ClientStatus = "onboarding_pendente" | "em_diagnostico" | "em_acompanhamento";

interface ClientRow {
  id: string;
  user_id: string;
  slug: string;
  status: ClientStatus;
  created_at: string;
  full_name: string;
  email: string;
  banned: boolean;
}

const statusLabel: Record<ClientStatus, string> = {
  onboarding_pendente: "Onboarding Pendente",
  em_diagnostico: "Em Diagnóstico",
  em_acompanhamento: "Em Acompanhamento",
};

const SuperAdminClients = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPass, setCPass] = useState("");

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClientRow | null>(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eStatus, setEStatus] = useState<ClientStatus>("onboarding_pendente");

  // Deactivate / Activate
  const [banOpen, setBanOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<ClientRow | null>(null);
  const [banReason, setBanReason] = useState("");

  // Delete
  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<ClientRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: cs } = await supabase
      .from("clients")
      .select("id, user_id, slug, status, created_at")
      .order("created_at", { ascending: false });

    const ids = (cs ?? []).map((c) => c.user_id);

    const [{ data: ps }, { data: bans }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids),
      supabase.from("banned_users").select("user_id, banned_until").in("user_id", ids),
    ]);

    setClients(
      (cs ?? []).map((c) => {
        const p = ps?.find((x) => x.user_id === c.user_id);
        const ban = bans?.find((x) => x.user_id === c.user_id);
        const isBanned = !!ban && (!ban.banned_until || new Date(ban.banned_until) > new Date());
        return {
          ...c,
          full_name: p?.full_name ?? "—",
          email: p?.email ?? "—",
          banned: isBanned,
        };
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

  // ---------- CREATE ----------
  const handleCreate = async () => {
    if (cName.trim().length < 2) { toast({ title: "Nome muito curto", variant: "destructive" }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cEmail)) { toast({ title: "Email inválido", variant: "destructive" }); return; }
    if (cPass.length < 8) { toast({ title: "Senha precisa de 8+ caracteres", variant: "destructive" }); return; }

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-client", {
      body: { name: cName.trim(), email: cEmail.trim(), password: cPass },
    });
    setBusy(false);

    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Cliente criado", description: (data as any)?.alreadyExisted ? "Usuário já existia, vinculado." : "Tudo certo!" });
    setCreateOpen(false);
    setCName(""); setCEmail(""); setCPass("");
    load();
  };

  // ---------- EDIT ----------
  const openEdit = (c: ClientRow) => {
    setEditTarget(c);
    setEName(c.full_name === "—" ? "" : c.full_name);
    setEEmail(c.email === "—" ? "" : c.email);
    setEStatus(c.status);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (eName.trim().length < 2) { toast({ title: "Nome muito curto", variant: "destructive" }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eEmail)) { toast({ title: "Email inválido", variant: "destructive" }); return; }

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("super-admin-update-client", {
      body: { client_id: editTarget.id, full_name: eName.trim(), email: eEmail.trim(), status: eStatus },
    });
    setBusy(false);

    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Cliente atualizado" });
    setEditOpen(false);
    load();
  };

  // ---------- DEACTIVATE / ACTIVATE ----------
  const openBan = (c: ClientRow) => {
    setBanTarget(c);
    setBanReason("");
    setBanOpen(true);
  };

  const handleToggleBan = async () => {
    if (!banTarget) return;
    const action = banTarget.banned ? "activate" : "deactivate";
    if (action === "deactivate" && banReason.trim().length < 3) {
      toast({ title: "Informe o motivo (3+ caracteres)", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("super-admin-toggle-client-ban", {
      body: { client_id: banTarget.id, action, reason: banReason.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: action === "deactivate" ? "Cliente desativado" : "Cliente reativado" });
    setBanOpen(false);
    load();
  };

  // ---------- DELETE ----------
  const handleDelete = async () => {
    if (!delTarget) return;
    setBusy(true);
    const { error } = await supabase.from("clients").delete().eq("id", delTarget.id);
    setBusy(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cliente excluído" });
    setDelOpen(false);
    load();
  };

  // ---------- EXPORT ----------
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
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gestão</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes — Controle Total</h1>
          <p className="text-muted-foreground mt-1">Criar, editar, desativar, exportar ou excluir clientes.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Novo Cliente
        </Button>
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
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell><Badge variant="outline">{statusLabel[c.status]}</Badge></TableCell>
                    <TableCell>
                      {c.banned
                        ? <Badge variant="destructive">Desativada</Badge>
                        : <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Ativa</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/cliente/${c.slug}/onboarding`)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />Abrir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openBan(c)}>
                        {c.banned
                          ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Reativar</>
                          : <><Ban className="h-3.5 w-3.5 mr-1" />Desativar</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => exportClient(c)}>
                        <Download className="h-3.5 w-3.5 mr-1" />Export
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => { setDelTarget(c); setDelOpen(true); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>Cria a conta com senha temporária e dispara e-mail de boas-vindas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} maxLength={255} />
            </div>
            <div>
              <Label>Senha temporária (mín. 8)</Label>
              <Input type="text" value={cPass} onChange={(e) => setCPass(e.target.value)} maxLength={72} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={busy}>{busy ? "Criando…" : "Criar cliente"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Atualiza nome, e-mail e status do cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input value={eName} onChange={(e) => setEName(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} maxLength={255} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={eStatus} onValueChange={(v) => setEStatus(v as ClientStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding_pendente">Onboarding Pendente</SelectItem>
                  <SelectItem value="em_diagnostico">Em Diagnóstico</SelectItem>
                  <SelectItem value="em_acompanhamento">Em Acompanhamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BAN / UNBAN DIALOG */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {banTarget?.banned ? "Reativar cliente" : "Desativar cliente"}
            </DialogTitle>
            <DialogDescription>
              {banTarget?.banned
                ? "O cliente poderá voltar a fazer login normalmente."
                : "O cliente será impedido de fazer login. Os dados continuam preservados."}
            </DialogDescription>
          </DialogHeader>
          {!banTarget?.banned && (
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                maxLength={500}
                placeholder="Ex.: pedido do próprio cliente, inatividade, fim de contrato…"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanOpen(false)} disabled={busy}>Cancelar</Button>
            <Button
              onClick={handleToggleBan}
              disabled={busy}
              variant={banTarget?.banned ? "default" : "destructive"}
            >
              {busy ? "Processando…" : (banTarget?.banned ? "Reativar" : "Desativar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o registro do cliente <strong>{delTarget?.full_name}</strong> e
              todos os dados financeiros associados. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SuperAdminClients;
