import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Sparkles, Search, Loader2, Mail, Phone, Download, RefreshCw } from "lucide-react";

// Lead normalizado — todas as origens viram esta forma.
interface Lead {
  id: string;
  tabela: string;
  origem: string;      // chave da origem
  nome: string | null;
  email: string;
  telefone: string | null;
  status: string;
  created_at: string;
  resumo: string;      // contexto específico da origem
}

type Row = Record<string, any>;

const brl = (v: any) =>
  v == null || v === "" ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Cada origem: tabela + rótulo + cor + resumo contextual.
const ORIGENS: { key: string; label: string; tabela: string; cor: string; resumo: (r: Row) => string }[] = [
  { key: "newsletter",   label: "Newsletter",        tabela: "newsletter_leads",   cor: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    resumo: (r) => r.source || "inscrição" },
  { key: "pdf",          label: "PDF",               tabela: "pdf_leads",          cor: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800",
    resumo: (r) => r.pdf_filename || r.source || "download do PDF" },
  { key: "aposentadoria",label: "Aposentadoria",     tabela: "retirement_leads",   cor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    resumo: (r) => `${r.idade_atual ?? "?"}→${r.idade_aposentadoria ?? "?"} anos · ${brl(r.patrimonio_projetado)}` },
  { key: "dividas",      label: "Dívidas",           tabela: "debt_leads",         cor: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
    resumo: (r) => `${r.num_dividas ?? 0} dívida(s) · ${brl(r.total_divida)}` },
  { key: "comparador",   label: "Comparador",        tabela: "comparator_leads",   cor: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
    resumo: (r) => `${r.num_opcoes ?? 0} opções · ${brl(r.valor)} · melhor: ${r.melhor_tipo ?? "—"}` },
  { key: "perfil",       label: "Perfil",            tabela: "profile_leads",      cor: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
    resumo: (r) => `${r.perfil ?? "—"}${r.score != null ? ` · score ${r.score}` : ""}` },
  { key: "saude",        label: "Saúde Financeira",  tabela: "health_score_leads", cor: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    resumo: (r) => `Score ${r.score ?? "—"}${r.grade ? ` (${r.grade})` : ""} · renda ${brl(r.renda)}` },
  { key: "projeto",      label: "Projeto de Vida",   tabela: "lifeplan_leads",     cor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    resumo: (r) => `${brl(r.capital_de_vida)} · ${r.viavel ? "viável" : "inviável"}${r.pct_atingido != null ? ` · ${Math.round(r.pct_atingido)}%` : ""}` },
  { key: "objetivos",    label: "Objetivos",         tabela: "life_leads",         cor: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
    resumo: (r) => [r.profession, r.monthly_income_range].filter(Boolean).join(" · ") || "questionário" },
  { key: "simulador",    label: "Simulador",         tabela: "simulator_leads",    cor: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    resumo: (r) => `${brl(r.valor_inicial)} + ${brl(r.aporte_mensal)}/mês · ${r.prazo_meses ?? "?"}m` },
];

const ORIGEM_MAP = Object.fromEntries(ORIGENS.map((o) => [o.key, o]));

const STATUS_COLORS: Record<string, string> = {
  novo:       "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  contatado:  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  convertido: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
  descartado: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export default function AdminTodosLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOrigem, setFilterOrigem] = useState("todas");
  const [filterStatus, setFilterStatus] = useState("todos");

  const load = async () => {
    setLoading(true);
    // Puxa as 10 origens em paralelo; se alguma tabela falhar (RLS/ausente), ignora.
    const results = await Promise.allSettled(
      ORIGENS.map((o) =>
        supabase.from(o.tabela as any).select("*").order("created_at", { ascending: false }).limit(1000),
      ),
    );
    const todos: Lead[] = [];
    results.forEach((res, i) => {
      if (res.status !== "fulfilled") return;
      const o = ORIGENS[i];
      const rows = ((res.value as any)?.data as Row[]) || [];
      rows.forEach((r) => {
        todos.push({
          id: String(r.id),
          tabela: o.tabela,
          origem: o.key,
          nome: r.name ?? null,
          email: r.email ?? "",
          telefone: r.whatsapp ?? r.phone ?? null,
          status: r.status ?? "novo",
          created_at: r.created_at,
          resumo: (() => { try { return o.resumo(r); } catch { return ""; } })(),
        });
      });
    });
    todos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLeads(todos);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (lead: Lead, status: string) => {
    const { error } = await supabase.from(lead.tabela as any).update({ status }).eq("id", lead.id);
    if (error) { toast.error("Não foi possível atualizar."); return; }
    setLeads((prev) => prev.map((l) => (l.id === lead.id && l.tabela === lead.tabela ? { ...l, status } : l)));
    toast.success("Status atualizado.");
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return leads.filter((l) => {
      const ms = !q ||
        (l.nome || "").toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.telefone || "").includes(q);
      const mo = filterOrigem === "todas" || l.origem === filterOrigem;
      const mst = filterStatus === "todos" || l.status === filterStatus;
      return ms && mo && mst;
    });
  }, [leads, search, filterOrigem, filterStatus]);

  const porOrigem = useMemo(() => {
    const m: Record<string, number> = {};
    leads.forEach((l) => { m[l.origem] = (m[l.origem] || 0) + 1; });
    return m;
  }, [leads]);

  const stats = useMemo(() => ({
    total: leads.length,
    novos: leads.filter((l) => l.status === "novo").length,
    convertidos: leads.filter((l) => l.status === "convertido").length,
  }), [leads]);

  const exportarCSV = () => {
    const head = ["Nome", "E-mail", "Telefone", "Origem", "Detalhe", "Status", "Data"];
    const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const linhas = filtered.map((l) =>
      [l.nome ?? "", l.email, l.telefone ?? "", ORIGEM_MAP[l.origem]?.label ?? l.origem, l.resumo, l.status, fmtDate(l.created_at)].map(esc).join(","),
    );
    const csv = "﻿" + [head.map(esc).join(","), ...linhas].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `leads-novare-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Todos os leads</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão consolidada de todas as origens de captação.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV} disabled={!filtered.length} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Leads totais", value: stats.total,       icon: Users,      color: "text-novare-blue" },
          { label: "Novos",        value: stats.novos,       icon: Sparkles,   color: "text-amber-500" },
          { label: "Convertidos",  value: stats.convertidos, icon: TrendingUp, color: "text-green-500" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <div className={cn("h-9 w-9 rounded-xl bg-muted flex items-center justify-center", s.color)}>
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chips por origem (clicáveis = filtro) */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterOrigem("todas")}
          className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            filterOrigem === "todas" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/40")}>
          Todas · {leads.length}
        </button>
        {ORIGENS.map((o) => (
          <button key={o.key} onClick={() => setFilterOrigem(o.key)}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filterOrigem === o.key ? o.cor : "border-border text-muted-foreground hover:border-foreground/40")}>
            {o.label} · {porOrigem[o.key] || 0}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar por nome, e-mail ou telefone..." className="pl-9"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterOrigem} onValueChange={setFilterOrigem}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as origens</SelectItem>
            {ORIGENS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="contatado">Contatado</SelectItem>
            <SelectItem value="convertido">Convertido</SelectItem>
            <SelectItem value="descartado">Descartado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" /> <span className="text-sm">Carregando leads de todas as origens...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">
          Nenhum lead encontrado com esses filtros.
        </CardContent></Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                  <th className="text-left font-semibold px-5 py-3">Contato</th>
                  <th className="text-left font-semibold px-3 py-3">Origem</th>
                  <th className="text-left font-semibold px-3 py-3">Detalhe</th>
                  <th className="text-center font-semibold px-3 py-3">Data</th>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const o = ORIGEM_MAP[l.origem];
                  return (
                    <tr key={`${l.tabela}-${l.id}`} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-foreground">{l.nome || "—"}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {l.email && (
                            <a href={`mailto:${l.email}`} className="text-xs text-muted-foreground hover:text-novare-blue flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {l.email}
                            </a>
                          )}
                          {l.telefone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {l.telefone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", o?.cor)}>
                          {o?.label ?? l.origem}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground max-w-[260px]">{l.resumo || "—"}</td>
                      <td className="px-3 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">{fmtDate(l.created_at)}</td>
                      <td className="px-5 py-3">
                        <Select value={l.status} onValueChange={(v) => updateStatus(l, v)}>
                          <SelectTrigger className={cn("h-7 w-auto text-xs gap-1.5 px-2.5 border", STATUS_COLORS[l.status])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="novo">Novo</SelectItem>
                            <SelectItem value="contatado">Contatado</SelectItem>
                            <SelectItem value="convertido">Convertido</SelectItem>
                            <SelectItem value="descartado">Descartado</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
