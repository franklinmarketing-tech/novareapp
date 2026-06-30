// Super-admin · Vida Plan — visão leve da Novare sobre os consultores (white-label SaaS).
// Somente leitura: quem é consultor, status do plano e quantos clientes vinculados.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, Search, Users, BadgeCheck, Clock, XCircle } from "lucide-react";

const db = supabase as unknown as { from: (t: string) => any };

interface Consultor {
  consultor_id: string;
  codigo: string;
  nome: string | null;
  empresa: string | null;
  plano_status: string | null;
  trial_until: string | null;
  updated_at: string | null;
}

const SuperAdminVidaPlan = () => {
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: cons } = await db.from("vidaplan_consultores").select("*").order("updated_at", { ascending: false });
        const { data: vinc } = await db.from("vidaplan_vinculos").select("consultor_id");
        const cont: Record<string, number> = {};
        (vinc ?? []).forEach((v: any) => { cont[v.consultor_id] = (cont[v.consultor_id] || 0) + 1; });
        setConsultores((cons ?? []) as Consultor[]);
        setContagem(cont);
      } catch { /* tabelas ausentes */ }
      finally { setLoading(false); }
    })();
  }, []);

  const statusDe = (c: Consultor): { label: string; tone: "ativo" | "teste" | "expirado" } => {
    const trialValido = !!c.trial_until && new Date(c.trial_until).getTime() > Date.now();
    if (c.plano_status === "active") return { label: "Ativo", tone: "ativo" };
    if (c.plano_status === "trial" && trialValido) {
      const dias = Math.max(0, Math.ceil((new Date(c.trial_until!).getTime() - Date.now()) / 86400000));
      return { label: `Teste · ${dias}d`, tone: "teste" };
    }
    return { label: "Expirado", tone: "expirado" };
  };

  const resumo = useMemo(() => {
    let ativos = 0, teste = 0, expirados = 0, clientes = 0;
    for (const c of consultores) {
      const t = statusDe(c).tone;
      if (t === "ativo") ativos++; else if (t === "teste") teste++; else expirados++;
      clientes += contagem[c.consultor_id] || 0;
    }
    return { total: consultores.length, ativos, teste, expirados, clientes };
  }, [consultores, contagem]);

  const filtrados = consultores.filter((c) => {
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return [c.codigo, c.nome, c.empresa].filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow">
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Vida Plan · Consultores</h1>
          <p className="text-sm text-muted-foreground">Consultores white-label, plano e clientes vinculados.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={Briefcase} label="Consultores" value={resumo.total} />
        <Kpi icon={BadgeCheck} label="Ativos" value={resumo.ativos} tone="text-emerald-600" />
        <Kpi icon={Clock} label="Em teste" value={resumo.teste} tone="text-amber-600" />
        <Kpi icon={XCircle} label="Expirados" value={resumo.expirados} tone="text-rose-600" />
        <Kpi icon={Users} label="Clientes" value={resumo.clientes} />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, nome ou empresa" className="pl-9" />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum consultor ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consultor</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((c) => {
                    const s = statusDe(c);
                    return (
                      <TableRow key={c.consultor_id}>
                        <TableCell>
                          <p className="font-medium">{c.nome || c.empresa || "—"}</p>
                          {c.nome && c.empresa && <p className="text-xs text-muted-foreground">{c.empresa}</p>}
                        </TableCell>
                        <TableCell><span className="font-mono text-xs bg-muted rounded px-1.5 py-0.5">{c.codigo}</span></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            s.tone === "ativo" ? "border-emerald-500/40 text-emerald-600" :
                            s.tone === "teste" ? "border-amber-500/40 text-amber-600" :
                            "border-rose-500/40 text-rose-600"
                          }>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{contagem[c.consultor_id] || 0}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{c.updated_at ? new Date(c.updated_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Visão somente leitura para suporte. A Novare não gerencia os clientes do consultor — cada consultor é dono da própria carteira.</p>
    </div>
  );
};

const Kpi = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: string }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1"><Icon className="h-4 w-4" /><span className="text-xs">{label}</span></div>
      <p className={`text-2xl font-bold tabular-nums ${tone ?? ""}`}>{value}</p>
    </CardContent>
  </Card>
);

export default SuperAdminVidaPlan;
