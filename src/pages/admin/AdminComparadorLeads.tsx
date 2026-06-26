import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, Users, CheckCircle2, Search, ExternalLink, Loader2, Mail, Phone } from "lucide-react";

interface Lead {
  id: string;
  name: string | null;
  email: string;
  whatsapp: string | null;
  valor: number | null;
  prazo_meses: number | null;
  num_opcoes: number | null;
  melhor_tipo: string | null;
  melhor_liquido_aa: number | null;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  novo:       "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  contatado:  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  convertido: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
  descartado: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
const brl = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function AdminComparadorLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comparator_leads" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setLeads((data as unknown as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("comparator_leads" as any).update({ status }).eq("id", id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    toast.success("Status atualizado.");
  };

  const filtered = leads.filter((l) => {
    const ms = search === "" || l.email.toLowerCase().includes(search.toLowerCase()) || (l.whatsapp || "").includes(search);
    const mst = filterStatus === "todos" || l.status === filterStatus;
    return ms && mst;
  });

  const stats = {
    total: leads.length,
    novos: leads.filter((l) => l.status === "novo").length,
    convertidos: leads.filter((l) => l.status === "convertido").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comparador de Investimentos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Leads do comparador público</p>
        </div>
        <a href="/ferramentas/comparador-de-investimentos" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-novare-blue hover:underline">
          <ExternalLink className="h-3.5 w-3.5" /> Ver comparador público
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Leads totais", value: stats.total,      icon: Users,       color: "text-novare-blue" },
          { label: "Novos",        value: stats.novos,      icon: Scale,       color: "text-amber-500" },
          { label: "Convertidos",  value: stats.convertidos,icon: CheckCircle2,color: "text-green-500" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <div className={cn("h-9 w-9 rounded-xl bg-muted flex items-center justify-center", s.color)}>
                  <s.icon className="h-4.5 w-4.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar por e-mail ou WhatsApp..." className="pl-9"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
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

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" /> <span className="text-sm">Carregando leads...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">
          Nenhum lead ainda. Compartilhe o comparador público para captar e-mails!
        </CardContent></Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                  <th className="text-left font-semibold px-5 py-3">Contato</th>
                  <th className="text-right font-semibold px-3 py-3">Valor</th>
                  <th className="text-left font-semibold px-3 py-3">Melhor opção</th>
                  <th className="text-center font-semibold px-3 py-3">Data</th>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        <a href={`mailto:${l.email}`} className="text-xs text-foreground font-medium hover:text-novare-blue flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {l.email}
                        </a>
                        {l.whatsapp && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {l.whatsapp}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {brl(l.valor)}
                      <p className="text-[11px]">{l.prazo_meses}m · {l.num_opcoes} opções</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{l.melhor_tipo || "—"}</span>
                      {l.melhor_liquido_aa != null && <p className="text-emerald-600 font-bold">{l.melhor_liquido_aa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% líq. a.a.</p>}
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">{fmtDate(l.created_at)}</td>
                    <td className="px-5 py-3">
                      <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
