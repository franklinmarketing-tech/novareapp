import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Mail,
  Search,
  RefreshCcw,
  Send,
  Inbox,
  CheckCircle2,
  Clock,
  User as UserIcon,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface Lead {
  id: string;
  email: string;
  name: string | null;
  source: string;
  status: string;
  reply_count: number;
  last_replied_at: string | null;
  ip_address: string | null;
  notes: string | null;
  created_at: string;
}

interface Reply {
  id: string;
  lead_id: string;
  replied_by_email: string | null;
  subject: string;
  message: string;
  email_status: string;
  created_at: string;
}

const statusBadge = (s: string) => {
  if (s === "responded")
    return <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Respondido</Badge>;
  if (s === "archived")
    return <Badge variant="secondary">Arquivado</Badge>;
  return <Badge variant="default" className="bg-accent/15 text-accent border-accent/30">Novo</Badge>;
};

export default function AdminLeadsNewsletter() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "responded">("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [open, setOpen] = useState(false);

  // form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("newsletter_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Erro ao carregar leads");
    setLeads((data ?? []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filtered = useMemo(() => {
    let arr = leads;
    if (filter !== "all") arr = arr.filter((l) => l.status === filter);
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter(
        (l) =>
          l.email.toLowerCase().includes(s) ||
          (l.name ?? "").toLowerCase().includes(s)
      );
    }
    return arr;
  }, [leads, filter, search]);

  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === "new").length;
    const responded = leads.filter((l) => l.status === "responded").length;
    return { total, newCount, responded };
  }, [leads]);

  const openLead = async (lead: Lead) => {
    setSelected(lead);
    setOpen(true);
    setSubject(`Re: Sua inscrição na Novare`);
    setMessage(
      `Olá${lead.name ? ", " + lead.name : ""},\n\nObrigado por se inscrever na Novare. Estamos à disposição para conversar sobre seus objetivos financeiros.\n\n`
    );
    setLoadingReplies(true);
    const { data } = await supabase
      .from("newsletter_lead_replies")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setReplies((data ?? []) as Reply[]);
    setLoadingReplies(false);
  };

  const sendReply = async () => {
    if (!selected) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Preencha assunto e mensagem");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("newsletter-reply", {
      body: {
        leadId: selected.id,
        subject: subject.trim(),
        message: message.trim(),
        consultantName: user?.user_metadata?.full_name ?? "",
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Falha ao enviar resposta");
      return;
    }
    toast.success("Resposta enviada!");
    setOpen(false);
    setMessage("");
    setSubject("");
    await fetchLeads();
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leads da Newsletter</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inscrições recebidas pela calculadora e pelas páginas públicas.
          </p>
        </div>
        <Button variant="outline" onClick={fetchLeads} disabled={loading}>
          <RefreshCcw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{stats.newCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Respondidos</p>
              <p className="text-2xl font-bold">{stats.responded}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por e-mail ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "new", "responded"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Todos" : f === "new" ? "Novos" : "Respondidos"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum lead encontrado.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => openLead(lead)}
                  className="w-full text-left p-4 hover:bg-muted/40 transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{lead.name || lead.email}</p>
                      {statusBadge(lead.status)}
                      {lead.reply_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {lead.reply_count} resp.
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{lead.email}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {fmtDate(lead.created_at)} · {lead.source}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" /> Responder lead
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 text-sm">
                <p>
                  <strong>Para:</strong> {selected.email}
                </p>
                {selected.name && (
                  <p>
                    <strong>Nome:</strong> {selected.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Inscrito em {fmtDate(selected.created_at)}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Assunto</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Mensagem</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  maxLength={8000}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length}/8000 — você pode usar quebras de linha normalmente.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                  Cancelar
                </Button>
                <Button onClick={sendReply} disabled={sending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Enviando..." : "Enviar resposta"}
                </Button>
              </div>

              {/* Histórico */}
              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-2">Histórico de respostas</h3>
                {loadingReplies ? (
                  <Skeleton className="h-24 w-full" />
                ) : replies.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma resposta enviada ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {replies.map((r) => (
                      <div key={r.id} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium">{r.subject}</p>
                          <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Por: {r.replied_by_email ?? "—"} · {r.email_status === "sent" ? "✅ enviado" : "❌ falhou"}
                        </p>
                        <p className="text-sm whitespace-pre-wrap text-foreground/80">{r.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
