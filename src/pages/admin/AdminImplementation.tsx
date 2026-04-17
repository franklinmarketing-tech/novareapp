import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Wrench, CheckCircle2, Clock, Loader2, TrendingUp, DollarSign } from "lucide-react";

interface Session {
  id: string;
  client_id: string;
  category: string;
  title: string;
  notes: string | null;
  status: string;
  session_date: string | null;
}

interface FormData {
  category: string;
  title: string;
  notes: string;
  status: string;
  session_date: string;
}

const emptyForm = (): FormData => ({
  category: "ajuste_orcamento",
  title: "",
  notes: "",
  status: "pendente",
  session_date: "",
});

const CATEGORIES = [
  { value: "ajuste_orcamento", label: "Ajustes de Orçamento", icon: "📊" },
  { value: "renegociacao_dividas", label: "Renegociação de Dívidas", icon: "🔄" },
  { value: "organizacao_reservas", label: "Organização de Reservas", icon: "🏦" },
  { value: "estruturacao_investimentos", label: "Estruturação de Investimentos", icon: "📈" },
  { value: "ajustes_tributarios", label: "Ajustes Tributários (PJ)", icon: "📋" },
  { value: "educacao_financeira", label: "Educação Financeira", icon: "🎓" },
];

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluido", label: "Concluído" },
];

const statusVariant: Record<string, "warning" | "accent" | "success"> = {
  pendente: "warning",
  em_andamento: "accent",
  concluido: "success",
};

const statusIcons: Record<string, typeof Clock> = {
  pendente: Clock,
  em_andamento: Loader2,
  concluido: CheckCircle2,
};

const AdminImplementation = () => {
  const { clientId } = useClientId();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clientName, setClientName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [investmentRecs, setInvestmentRecs] = useState<Array<{ product_name: string; invested_amount: number; status: string }>>([]);

  const loadData = async (silent = false) => {
    if (!clientId) return;
    if (!silent) setLoading(true);

    const { data: client } = await supabase
      .from("clients")
      .select("user_id")
      .eq("id", clientId)
      .single();
    if (client) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", client.user_id)
        .single();
      if (profile) setClientName(profile.full_name);
    }

    const { data } = await supabase
      .from("implementation_sessions")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });

    setSessions((data as Session[]) || []);

    const { data: recs } = await supabase
      .from("investment_recommendations")
      .select("product_name, invested_amount, status")
      .eq("client_id", clientId)
      .order("priority", { ascending: true });
    setInvestmentRecs((recs as any[]) || []);

    if (!silent) setLoading(false);
  };

  useEffect(() => { loadData(); }, [clientId]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (s: Session) => {
    setEditingId(s.id);
    setForm({
      category: s.category,
      title: s.title,
      notes: s.notes || "",
      status: s.status,
      session_date: s.session_date || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!clientId || !form.title) return;
    setSaving(true);
    const payload = {
      client_id: clientId,
      category: form.category,
      title: form.title,
      notes: form.notes || null,
      status: form.status,
      session_date: form.session_date || null,
    };

    if (editingId) {
      await supabase.from("implementation_sessions").update(payload).eq("id", editingId);
    } else {
      await supabase.from("implementation_sessions").insert(payload);
    }

    setDialogOpen(false);
    toast({ title: editingId ? "Sessão atualizada" : "Sessão criada" });
    await loadData(true);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("implementation_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Sessão removida" });
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    sessions: sessions.filter((s) => s.category === cat.value),
  }));

  const completedCount = sessions.filter((s) => s.status === "concluido").length;
  const progressPct = sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="animate-pulse text-muted-foreground">Carregando implementação...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clientes")} className="h-8 w-8">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1">
          <h1 className="page-title">Implementação Assistida</h1>
          <p className="page-description">{clientName || "Cliente"}</p>
        </div>
        <Button onClick={openCreate} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-6 w-6" /> Nova Sessão
        </Button>
      </div>

      {/* Investment summary */}
      {investmentRecs.length > 0 && (() => {
        const totalDir = investmentRecs.reduce((s, r) => s + (r.invested_amount || 0), 0);
        const appliedAmt = investmentRecs.filter(r => r.status === "aplicado").reduce((s, r) => s + (r.invested_amount || 0), 0);
        const appliedPct = totalDir > 0 ? Math.round((appliedAmt / totalDir) * 100) : 0;
        const fmtV = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
        return (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-6 w-6 text-accent" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Direcionamento de Investimentos</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-foreground">{fmtV(totalDir)}</span>
                <span className="text-xs text-muted-foreground">{appliedPct}% aplicado</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-3">
                <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${appliedPct}%` }} />
              </div>
              <div className="space-y-1">
                {investmentRecs.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate mr-2">{r.product_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{fmtV(r.invested_amount || 0)}</span>
                      <Badge variant={r.status === "aplicado" ? "success" : "warning" as any} className="text-2xs">
                        {r.status === "aplicado" ? "Aplicado" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Progress */}
      {sessions.length > 0 && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Progresso Geral</span>
              <span className="text-sm font-semibold text-foreground">{completedCount}/{sessions.length} concluídas · {progressPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-8 w-8 text-accent/40" />
            </div>
            <p className="text-foreground font-semibold mb-1">Implementação ainda não iniciada</p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
              Crie sessões para cada etapa — ajuste de orçamento, renegociação de dívidas, investimentos. 
              Cada sessão concluída aproxima seu cliente dos objetivos.
            </p>
            <Button onClick={openCreate} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl">
              <Plus className="h-6 w-6" /> Criar primeira sessão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.filter((g) => g.sessions.length > 0).map((group) => (
            <div key={group.value}>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span>{group.icon}</span>
                <span>{group.label}</span>
                <span className="text-xs text-muted-foreground font-normal">({group.sessions.length})</span>
              </h3>
              <div className="space-y-2">
                {group.sessions.map((s) => {
                  const StatusIcon = statusIcons[s.status] || Clock;
                  return (
                    <Card key={s.id} className="hover:shadow-soft transition-shadow duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-foreground text-sm">{s.title}</p>
                            </div>
                            {s.notes && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{s.notes}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                              <Badge variant={statusVariant[s.status] as any}>
                                {STATUS_OPTIONS.find((o) => o.value === s.status)?.label}
                              </Badge>
                              {s.session_date && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(s.session_date).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                              <Pencil className="h-6 w-6" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}>
                              <Trash2 className="h-6 w-6" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Sessão" : "Nova Sessão de Implementação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <SelectWithCustom
                value={form.category}
                onValueChange={(v) => updateField("category", v)}
                options={CATEGORIES.map((c) => ({ value: c.value, label: `${c.icon} ${c.label}` }))}
                inputPlaceholder="Ex: Planejamento sucessório..."
              />
            </div>
            <div className="space-y-2">
              <Label>Título da sessão</Label>
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Ex: Revisar orçamento mensal e cortar gastos supérfluos"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas / Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Detalhes da sessão, decisões tomadas, próximos passos..."
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da sessão</Label>
                <Input
                  type="date"
                  value={form.session_date}
                  onChange={(e) => updateField("session_date", e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar Sessão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminImplementation;
