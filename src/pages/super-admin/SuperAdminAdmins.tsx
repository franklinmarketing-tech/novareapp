import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Plus, Shield, ShieldOff, ArrowUp, ArrowDown, Mail, Copy, X, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";

interface AdminUser {
  user_id: string;
  full_name: string;
  email: string;
  role: "admin" | "super_admin";
}

interface PendingInvite {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  token: string;
  created_at: string;
  expires_at: string;
}

const SuperAdminAdmins = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "super_admin">("admin");

  const fetchAdmins = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "super_admin"]);

    if (!roles?.length) { setAdmins([]); setLoading(false); return; }

    const userIds = Array.from(new Set(roles.map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    // priorizar super_admin se a pessoa tiver os 2
    const map = new Map<string, AdminUser>();
    for (const r of roles) {
      const p = profiles?.find((x) => x.user_id === r.user_id);
      const existing = map.get(r.user_id);
      const role = r.role as "admin" | "super_admin";
      if (!existing || (role === "super_admin" && existing.role === "admin")) {
        map.set(r.user_id, {
          user_id: r.user_id,
          full_name: p?.full_name ?? "—",
          email: p?.email ?? "—",
          role,
        });
      }
    }
    setAdmins(Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name)));

    // Buscar convites pendentes (não expirados)
    const { data: pendingData } = await supabase
      .from("admin_invitations")
      .select("id, email, role, token, created_at, expires_at, status")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setInvites(((pendingData ?? []) as any[]).filter((i) => new Date(i.expires_at) > new Date()) as PendingInvite[]);

    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/aceitar-convite/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado", description: url });
  };

  const revokeInvite = async (id: string, email: string) => {
    if (!confirm(`Revogar o convite enviado para ${email}?`)) return;
    const { error } = await supabase.from("admin_invitations").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Convite revogado" });
    fetchAdmins();
  };

  const resendInvite = async (invite: PendingInvite) => {
    await supabase.from("admin_invitations").delete().eq("id", invite.id);
    const { data, error } = await supabase.functions.invoke("super-admin-invite", {
      body: { email: invite.email, role: invite.role },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({
      title: "Convite reenviado",
      description: (data as any)?.email_sent ? `Novo email enviado para ${invite.email}` : "Convite criado, mas o email não foi enviado.",
    });
    fetchAdmins();
  };

  const promote = async (a: AdminUser) => {
    if (!confirm(`Promover ${a.full_name} a super_admin?`)) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: a.user_id, role: "super_admin" });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Promovido", description: `${a.full_name} agora é super admin.` });
    fetchAdmins();
  };

  const demote = async (a: AdminUser) => {
    if (a.user_id === user?.id) {
      toast({ title: "Ação bloqueada", description: "Você não pode rebaixar a si mesmo.", variant: "destructive" });
      return;
    }
    if (!confirm(`Rebaixar ${a.full_name} para admin?`)) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", a.user_id)
      .eq("role", "super_admin");
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Rebaixado" });
    fetchAdmins();
  };

  const revoke = async (a: AdminUser) => {
    if (a.user_id === user?.id) {
      toast({ title: "Ação bloqueada", description: "Você não pode remover a si mesmo.", variant: "destructive" });
      return;
    }
    if (!confirm(`Remover ${a.full_name} dos admins (vira cliente)?`)) return;
    await supabase.from("user_roles").delete().eq("user_id", a.user_id).in("role", ["admin", "super_admin"]);
    await supabase.from("user_roles").insert({ user_id: a.user_id, role: "client" });
    toast({ title: "Permissão removida" });
    fetchAdmins();
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("super-admin-invite", {
      body: { email: inviteEmail, role: inviteRole },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    const sent = (data as any)?.email_sent;
    toast({
      title: sent ? "Convite enviado por email" : "Convite criado",
      description: sent
        ? `Email enviado para ${inviteEmail} com o link de aceite.`
        : `Email não enviado: ${(data as any)?.email_error ?? "desconhecido"}. Use o botão de copiar link.`,
      variant: sent ? "default" : "destructive",
    });
    setInviteEmail("");
    setOpen(false);
    fetchAdmins();
  };

  return (
    <>
      <SEO title="Super Admin · Admins" description="Gerencie administradores e super-admins" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCog className="h-5 w-5 text-violet-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gestão</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Administradores</h1>
          <p className="text-muted-foreground mt-1">Promova, rebaixe ou convide novos administradores.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Convidar admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Convidar novo administrador</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={sendInvite} className="w-full" disabled={sending || !inviteEmail}>
                {sending ? "Enviando…" : (<><Mail className="h-4 w-4 mr-2" />Enviar convite por email</>)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.user_id}>
                    <TableCell className="font-medium">{a.full_name} {a.user_id === user?.id && <Badge variant="outline" className="ml-2">você</Badge>}</TableCell>
                    <TableCell className="text-muted-foreground">{a.email}</TableCell>
                    <TableCell>
                      {a.role === "super_admin" ? (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"><Shield className="h-3 w-3 mr-1" />Super</Badge>
                      ) : (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {a.role === "admin" ? (
                        <Button size="sm" variant="ghost" onClick={() => promote(a)}><ArrowUp className="h-3.5 w-3.5 mr-1" />Promover</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => demote(a)} disabled={a.user_id === user?.id}><ArrowDown className="h-3.5 w-3.5 mr-1" />Rebaixar</Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(a)} disabled={a.user_id === user?.id}>
                        <ShieldOff className="h-3.5 w-3.5 mr-1" />Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Convites pendentes */}
      {invites.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Convites pendentes
              <Badge variant="secondary" className="ml-1">{invites.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((inv) => {
                  const daysLeft = Math.max(
                    0,
                    Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000)
                  );
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        {inv.role === "super_admin" ? (
                          <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Super</Badge>
                        ) : (
                          <Badge variant="secondary">Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {daysLeft} {daysLeft === 1 ? "dia" : "dias"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => copyInviteLink(inv.token)}>
                          <Copy className="h-3.5 w-3.5 mr-1" />Copiar link
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => resendInvite(inv)}>
                          <Mail className="h-3.5 w-3.5 mr-1" />Reenviar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revokeInvite(inv.id, inv.email)}>
                          <X className="h-3.5 w-3.5 mr-1" />Revogar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default SuperAdminAdmins;
