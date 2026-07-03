// Super-admin · Vida Plan — painel completo: usuários, GOLD, plano consultor e exclusão.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Search, Users, Crown, Trash2, RefreshCw, Loader2, BadgeCheck } from "lucide-react";

interface Row {
  id: string; email: string; nome: string; criado: string; ultimoLogin: string | null; confirmado: boolean; temPlano: boolean;
  sub: { status: string; plano: string } | null;
  consultor: { codigo: string; plano_status: string | null; trial_until: string | null; sistema?: string; empresa?: string } | null;
  nClientes: number;
}

const call = async (action: string, payload: Record<string, unknown> = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("vidaplan-admin", {
    body: { action, payload },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

const SuperAdminVidaPlan = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [delAlvo, setDelAlvo] = useState<Row | null>(null);

  const carregar = async () => {
    setLoading(true); setErro(null);
    try { const d = await call("list"); setRows(d.users as Row[]); }
    catch (e: any) { setErro(e?.message || "Falha ao carregar. Deploie a função vidaplan-admin."); }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, []);

  const acao = async (action: string, payload: Record<string, unknown>, id: string, msg: string) => {
    setBusyId(id);
    try { await call(action, payload); toast({ title: msg }); await carregar(); }
    catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  const goldAtivo = (r: Row) => r.sub?.status === "active" || r.sub?.status === "trial";
  const consultorAtivo = (r: Row) => r.consultor && (r.consultor.plano_status === "active" || (r.consultor.plano_status === "trial" && !!r.consultor.trial_until && new Date(r.consultor.trial_until).getTime() > Date.now()));

  const resumo = useMemo(() => ({
    total: rows.length,
    gold: rows.filter(goldAtivo).length,
    consultores: rows.filter((r) => r.consultor).length,
    clientes: rows.reduce((s, r) => s + r.nClientes, 0),
  }), [rows]);

  const filtrados = rows.filter((r) => {
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return [r.email, r.nome, r.consultor?.codigo].filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow"><Briefcase className="h-5 w-5 text-white" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Vida Plan · Controle</h1>
            <p className="text-sm text-muted-foreground">Usuários, assinaturas, consultores e exclusão.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Usuários" value={resumo.total} />
        <Kpi icon={Crown} label="GOLD ativos" value={resumo.gold} tone="text-amber-600" />
        <Kpi icon={Briefcase} label="Consultores" value={resumo.consultores} tone="text-emerald-600" />
        <Kpi icon={BadgeCheck} label="Clientes vinculados" value={resumo.clientes} />
      </div>

      {erro && <Card><CardContent className="p-4 text-sm text-rose-600">{erro}</CardContent></Card>}

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por e-mail, nome ou código" className="pl-9" />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum usuário.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>GOLD</TableHead>
                    <TableHead>Consultor</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((r) => {
                    const busy = busyId === r.id;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium leading-tight">{r.nome || "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {goldAtivo(r) ? <Badge variant="outline" className="border-amber-500/40 text-amber-600">{r.sub?.status === "trial" ? "Teste" : "Ativo"}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy}
                              onClick={() => acao("setSub", { userId: r.id, status: goldAtivo(r) ? "inactive" : "active" }, r.id, goldAtivo(r) ? "GOLD removido" : "GOLD ativado")}>
                              {goldAtivo(r) ? "tirar" : "dar GOLD"}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.consultor ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={consultorAtivo(r) ? "border-emerald-500/40 text-emerald-600" : "border-rose-500/40 text-rose-600"}>
                                {r.consultor.plano_status === "active" ? "Ativo" : r.consultor.plano_status === "trial" ? "Teste" : "Expirado"} · {r.consultor.codigo}
                              </Badge>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy}
                                onClick={() => acao("setConsultorPlano", { userId: r.id, plano_status: consultorAtivo(r) ? "inactive" : "active" }, r.id, consultorAtivo(r) ? "Plano expirado" : "Plano ativado")}>
                                {consultorAtivo(r) ? "expirar" : "ativar"}
                              </Button>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.nClientes || 0}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.ultimoLogin ? new Date(r.ultimoLogin).toLocaleDateString("pt-BR") : "nunca"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" disabled={busy}
                            onClick={() => setDelAlvo(r)}>
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Excluir um usuário apaga a conta e todos os dados dele (plano, vínculos, marca). Ação irreversível.</p>

      <AlertDialog open={!!delAlvo} onOpenChange={(o) => !o && setDelAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {delAlvo?.nome || delAlvo?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga a conta e todos os dados do Vida Plan dessa pessoa (plano, vínculos, marca). <strong>Não dá pra desfazer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700"
              onClick={() => { const alvo = delAlvo; setDelAlvo(null); if (alvo) acao("deleteUser", { userId: alvo.id }, alvo.id, "Usuário excluído"); }}>
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Kpi = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: string }) => (
  <Card><CardContent className="p-4">
    <div className="flex items-center gap-2 text-muted-foreground mb-1"><Icon className="h-4 w-4" /><span className="text-xs">{label}</span></div>
    <p className={`text-2xl font-bold tabular-nums ${tone ?? ""}`}>{value}</p>
  </CardContent></Card>
);

export default SuperAdminVidaPlan;
