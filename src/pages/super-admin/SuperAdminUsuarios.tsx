import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, MoreVertical, LogOut, KeyRound, Ban, ShieldCheck, Search, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { PasswordConfirmDialog } from "@/components/super-admin/PasswordConfirmDialog";

interface UserRow {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  banned: boolean;
  created_at: string;
}

type ActionKind = "force_logout" | "reset_password" | "ban" | "unban" | "delete_user";

const SuperAdminUsuarios = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "client" | "super_admin" | "banned">("all");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ kind: ActionKind; user: UserRow; banDays?: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: bans }] = await Promise.all([
      supabase.from("profiles").select("user_id, email, full_name, created_at"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("banned_users").select("user_id"),
    ]);
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      // priorize super_admin > admin > client
      const rank = (x: string) => (x === "super_admin" ? 3 : x === "admin" ? 2 : 1);
      if (!cur || rank(r.role) > rank(cur)) roleMap.set(r.user_id, r.role);
    });
    const banSet = new Set((bans ?? []).map((b) => b.user_id));
    setUsers(((profiles ?? []) as any[]).map((p) => ({
      user_id: p.user_id,
      email: p.email,
      full_name: p.full_name,
      role: roleMap.get(p.user_id) ?? "client",
      banned: banSet.has(p.user_id),
      created_at: p.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    if (filter === "banned" && !u.banned) return false;
    if (filter !== "all" && filter !== "banned" && u.role !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return u.email.toLowerCase().includes(s) || u.full_name.toLowerCase().includes(s);
    }
    return true;
  });

  const runAction = async ({ password, reason }: { password: string; reason: string }) => {
    if (!pending) return;
    const action = pending.kind === "unban" ? "unban" : pending.kind;
    const { data, error } = await supabase.functions.invoke("super-admin-user-action", {
      body: {
        action,
        target_user_id: pending.user.user_id,
        password,
        reason,
        ban_days: pending.banDays ?? 0,
      },
    });
    if (error || data?.error) {
      toast({ title: "Erro", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    if (data?.temp_password) {
      navigator.clipboard.writeText(data.temp_password).catch(() => {});
      toast({
        title: "Senha temporária gerada",
        description: `Copiada para a área de transferência: ${data.temp_password}`,
        duration: 15000,
      });
    } else {
      toast({ title: data?.message ?? "Ação executada" });
    }
    load();
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({ title: "Email copiado" });
  };

  const dialogProps = (() => {
    if (!pending) return null;
    const u = pending.user;
    switch (pending.kind) {
      case "force_logout":
        return { title: "Forçar logout", description: `Encerrar todas as sessões ativas de ${u.email}? O usuário será deslogado de todos os dispositivos.`, destructive: false, requireReason: false, confirmLabel: "Encerrar sessões" };
      case "reset_password":
        return { title: "Resetar senha", description: `Gerar uma senha temporária para ${u.email}. A senha aparecerá uma única vez.`, destructive: false, requireReason: false, confirmLabel: "Gerar senha temporária" };
      case "ban":
        return { title: pending.banDays ? `Banir por ${pending.banDays} dias` : "Banir permanentemente", description: `${u.email} não conseguirá mais fazer login. ${pending.banDays ? `Banimento expira em ${pending.banDays} dias.` : "Banimento permanente."}`, destructive: true, requireReason: true, confirmLabel: "Confirmar banimento" };
      case "unban":
        return { title: "Remover banimento", description: `${u.email} voltará a conseguir fazer login normalmente.`, destructive: false, requireReason: false, confirmLabel: "Desbanir" };
      case "delete_user":
        return { title: "Deletar usuário", description: `${u.email} e todos os seus dados serão removidos permanentemente. Esta ação NÃO pode ser desfeita.`, destructive: true, requireReason: true, requireConfirmText: "DELETAR", confirmLabel: "Deletar definitivamente" };
    }
  })();

  return (
    <>
      <SEO title="Super Admin · Usuários" description="Controle de admins e clientes" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-violet-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pessoas</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground mt-1">Forçar logout, resetar senha, banir e deletar usuários.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por email ou nome…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(["all", "super_admin", "admin", "client", "banned"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? "Todos" : f === "banned" ? "Banidos" : f === "super_admin" ? "Super" : f === "admin" ? "Admins" : "Clientes"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{u.full_name || "(sem nome)"}</p>
                      <Badge variant="outline" className={`text-[10px] ${u.role === "super_admin" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : u.role === "admin" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-muted"}`}>
                        {u.role === "super_admin" ? "super admin" : u.role}
                      </Badge>
                      {u.banned && <Badge className="bg-destructive/15 text-destructive text-[10px]">banido</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => copyEmail(u.email)}>
                        <Copy className="h-4 w-4 mr-2" />Copiar email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setPending({ kind: "force_logout", user: u })}>
                        <LogOut className="h-4 w-4 mr-2" />Forçar logout
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPending({ kind: "reset_password", user: u })}>
                        <KeyRound className="h-4 w-4 mr-2" />Resetar senha
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {u.banned ? (
                        <DropdownMenuItem onClick={() => setPending({ kind: "unban", user: u })}>
                          <ShieldCheck className="h-4 w-4 mr-2" />Remover banimento
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => setPending({ kind: "ban", user: u, banDays: 1 })}>
                            <Ban className="h-4 w-4 mr-2" />Banir 1 dia
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPending({ kind: "ban", user: u, banDays: 7 })}>
                            <Ban className="h-4 w-4 mr-2" />Banir 7 dias
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPending({ kind: "ban", user: u, banDays: 0 })} className="text-destructive">
                            <Ban className="h-4 w-4 mr-2" />Banir permanentemente
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setPending({ kind: "delete_user", user: u })} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />Deletar usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pending && dialogProps && (
        <PasswordConfirmDialog
          open={!!pending}
          onOpenChange={(v) => !v && setPending(null)}
          {...dialogProps}
          onConfirm={runAction}
        />
      )}
    </>
  );
};

export default SuperAdminUsuarios;
