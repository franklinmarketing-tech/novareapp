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
  Mail, Search, RefreshCcw, Send, FileText, CheckCircle2, Clock,
  User as UserIcon, ChevronRight, Download, Inbox, ArrowDownLeft, ArrowUpRight,
  MessageCircle, Phone,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface PdfLead {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  source: string;
  status: string;
  reply_count: number;
  message_count: number;
  inbound_count: number;
  last_message_at: string | null;
  last_replied_at: string | null;
  last_inbound_at: string | null;
  pdf_url: string | null;
  pdf_filename: string | null;
  simulation_snapshot: Record<string, unknown> | null;
  created_at: string;
}

interface Message {
  id: string;
  lead_id: string;
  direction: "outbound" | "inbound";
  sender_email: string | null;
  recipient_email: string | null;
  subject: string;
  body_text: string;
  email_status: string;
  has_attachment_pdf: boolean;
  created_at: string;
}

// Exibe telefone BR formatado: (11) 91234-5678
const formatPhoneBR = (raw: string | null): string => {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
};

// Link wa.me (assume DDI 55 quando não informado)
const waLink = (raw: string | null): string | null => {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.length < 10) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}`;
};

const statusBadge = (s: string) => {
  if (s === "responded")
    return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Respondido</Badge>;
  if (s === "archived") return <Badge variant="secondary">Arquivado</Badge>;
  return <Badge className="bg-accent/15 text-accent border-accent/30">Novo</Badge>;
};

export default function AdminLeadsPdf() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<PdfLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "responded">("all");
  const [pdfFilter, setPdfFilter] = useState<"all" | "with_pdf" | "without_pdf">("all");
  const [phoneFilter, setPhoneFilter] = useState<"all" | "with_phone">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selected, setSelected] = useState<PdfLead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pdf_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Erro ao carregar leads");
    setLeads((data ?? []) as PdfLead[]);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = useMemo(() => {
    let arr = leads;
    if (filter !== "all") arr = arr.filter((l) => l.status === filter);
    if (pdfFilter === "with_pdf") arr = arr.filter((l) => !!l.pdf_url);
    else if (pdfFilter === "without_pdf") arr = arr.filter((l) => !l.pdf_url);
    if (phoneFilter === "with_phone") arr = arr.filter((l) => !!l.phone);
    if (search.trim()) {
      const s = search.toLowerCase();
      const sDigits = s.replace(/\D/g, "");
      arr = arr.filter((l) =>
        l.email.toLowerCase().includes(s) ||
        (l.name ?? "").toLowerCase().includes(s) ||
        (!!sDigits && (l.phone ?? "").replace(/\D/g, "").includes(sDigits))
      );
    }
    return arr;
  }, [leads, filter, pdfFilter, phoneFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage],
  );

  useEffect(() => { setPage(1); }, [search, filter, pdfFilter, phoneFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    novos: leads.filter((l) => l.status === "new").length,
    respondidos: leads.filter((l) => l.status === "responded").length,
    comWhatsapp: leads.filter((l) => !!l.phone).length,
  }), [leads]);

  const openLead = async (lead: PdfLead) => {
    setSelected(lead);
    setOpen(true);
    setSubject(`Sobre sua simulação Novare`);
    setMessage(
      `Olá${lead.name ? ", " + lead.name : ""},\n\nVi que você gerou uma simulação na nossa calculadora. Posso te ajudar a transformar esses números em um plano real?\n\n`,
    );
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("pdf_lead_messages")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as Message[]);
    setLoadingMsgs(false);
  };

  const downloadPdf = async (lead: PdfLead) => {
    if (!lead.pdf_url) return;
    const { data, error } = await supabase.storage
      .from("calculator-pdfs")
      .createSignedUrl(lead.pdf_url, 60);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível abrir o PDF.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const sendReply = async () => {
    if (!selected) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Preencha assunto e mensagem"); return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("pdf-lead-reply", {
      body: {
        leadId: selected.id,
        subject: subject.trim(),
        message: message.trim(),
        consultantName: user?.user_metadata?.full_name ?? "",
      },
    });
    setSending(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || "Falha ao enviar"); return;
    }
    toast.success("Mensagem enviada!");
    setMessage("");
    await fetchLeads();
    // refresh messages
    const { data: msgs } = await supabase
      .from("pdf_lead_messages")
      .select("*")
      .eq("lead_id", selected.id)
      .order("created_at", { ascending: true });
    setMessages((msgs ?? []) as Message[]);
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leads — Calculadora PDF</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pessoas que geraram um relatório de simulação na calculadora pública.
          </p>
        </div>
        <Button variant="outline" onClick={fetchLeads} disabled={loading}>
          <RefreshCcw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Inbox className="w-5 h-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Clock className="w-5 h-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Novos</p><p className="text-2xl font-bold">{stats.novos}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Respondidos</p><p className="text-2xl font-bold">{stats.respondidos}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Com WhatsApp</p><p className="text-2xl font-bold">{stats.comWhatsapp}</p></div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por e-mail ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "new", "responded"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "Todos" : f === "new" ? "Novos" : "Respondidos"}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Status do PDF:</span>
          {(["all", "with_pdf", "without_pdf"] as const).map((f) => (
            <Button key={f} size="sm" variant={pdfFilter === f ? "default" : "outline"} onClick={() => setPdfFilter(f)}>
              {f === "all" ? "Todos" : f === "with_pdf" ? "PDF enviado" : "Sem PDF"}
            </Button>
          ))}
          <span className="text-xs text-muted-foreground mx-1">WhatsApp:</span>
          {(["all", "with_phone"] as const).map((f) => (
            <Button key={f} size="sm" variant={phoneFilter === f ? "default" : "outline"} onClick={() => setPhoneFilter(f)}>
              {f === "all" ? "Todos" : "Com WhatsApp"}
            </Button>
          ))}
        </div>
      </CardContent></Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{filtered.length} {filtered.length === 1 ? "lead" : "leads"}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Nenhum lead encontrado.</div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {paginated.map((lead) => {
                  const wa = waLink(lead.phone);
                  return (
                  <div
                    key={lead.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openLead(lead)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLead(lead); } }}
                    className="w-full text-left p-4 hover:bg-muted/40 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><UserIcon className="w-5 h-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{lead.name || lead.email}</p>
                        {statusBadge(lead.status)}
                        {lead.pdf_url
                          ? <Badge variant="outline" className="text-xs"><FileText className="w-3 h-3 mr-1" />PDF enviado</Badge>
                          : <Badge variant="outline" className="text-xs text-muted-foreground">Sem PDF</Badge>}
                        {lead.phone && <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-xs"><MessageCircle className="w-3 h-3 mr-1" />WhatsApp</Badge>}
                        {lead.inbound_count > 0 && <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs">{lead.inbound_count} resp. cliente</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{lead.email}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {fmtDate(lead.created_at)} · {lead.source}
                        {lead.phone && <> · {formatPhoneBR(lead.phone)}</>}
                      </p>
                    </div>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Abrir conversa no WhatsApp"
                        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages} · {filtered.length} resultados
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      Anterior
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Conversar com lead</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 text-sm flex items-start justify-between gap-3">
                <div>
                  <p><strong>Para:</strong> {selected.email}</p>
                  {selected.name && <p><strong>Nome:</strong> {selected.name}</p>}
                  {selected.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <strong>WhatsApp:</strong> {formatPhoneBR(selected.phone)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Gerou PDF em {fmtDate(selected.created_at)}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {waLink(selected.phone) && (
                    <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <a href={waLink(selected.phone)!} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                      </a>
                    </Button>
                  )}
                  {selected.pdf_url && (
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(selected)}>
                      <Download className="w-4 h-4 mr-2" /> PDF
                    </Button>
                  )}
                </div>
              </div>

              {selected.simulation_snapshot && (
                <div className="rounded-lg border border-border p-3 text-xs space-y-1">
                  <p className="font-semibold text-sm mb-2">📊 Simulação</p>
                  {Object.entries(selected.simulation_snapshot)
                    .filter(([k]) => k !== "gerado_em")
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-muted-foreground capitalize">{k}:</span>
                        <span className="font-mono">{String(v)}</span>
                      </div>
                    ))}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">Assunto</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Mensagem</label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={8000} className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Fechar</Button>
                <Button onClick={sendReply} disabled={sending}>
                  <Send className="w-4 h-4 mr-2" />{sending ? "Enviando..." : "Enviar mensagem"}
                </Button>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">Histórico da conversa</h3>
                {loadingMsgs ? <Skeleton className="h-24 w-full" /> : messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => (
                      <div key={m.id} className={`border rounded-lg p-3 ${m.direction === "inbound" ? "border-blue-500/40 bg-blue-500/5" : "border-border"}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium flex items-center gap-2">
                            {m.direction === "inbound" ? <ArrowDownLeft className="w-3 h-3 text-blue-600" /> : <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                            {m.subject}
                            {m.has_attachment_pdf && <Badge variant="outline" className="text-[10px]">+PDF</Badge>}
                          </p>
                          <span className="text-xs text-muted-foreground">{fmtDate(m.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {m.direction === "inbound" ? `De: ${m.sender_email}` : `Para: ${m.recipient_email}`} · {m.email_status === "sent" ? "✅ enviado" : m.email_status === "received" ? "📩 recebido" : "❌ falhou"}
                        </p>
                        <p className="text-sm whitespace-pre-wrap text-foreground/80">{m.body_text}</p>
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
