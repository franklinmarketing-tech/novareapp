import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  PenLine, Save, Sparkles, Plus, Clock, FileText, Trash2,
  Target, TrendingUp, CheckCircle2, Loader2, ChevronRight,
  ChevronDown, History, Zap,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Note {
  id: string;
  client_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface SuggestedAction {
  area: string;
  description: string;
  objective: string;
  financial_impact: number;
  goal_description?: string;
  selected: boolean;
}

interface SuggestedInvestment {
  product_name: string;
  product_type: string;
  risk_level: string;
  invested_amount: number;
  rationale: string;
  expected_return?: string;
  selected: boolean;
}

const areaLabels: Record<string, string> = {
  renda: "Renda", despesas: "Despesas", dividas: "Dívidas",
  investimentos: "Investimentos", protecao: "Proteção", impostos: "Impostos",
};

const areaColors: Record<string, string> = {
  renda: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  despesas: "bg-red-500/10 text-red-700 border-red-200",
  dividas: "bg-orange-500/10 text-orange-700 border-orange-200",
  investimentos: "bg-blue-500/10 text-blue-700 border-blue-200",
  protecao: "bg-purple-500/10 text-purple-700 border-purple-200",
  impostos: "bg-amber-500/10 text-amber-700 border-amber-200",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  clientId: string;
}

export const NoteEditor = ({ clientId }: Props) => {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [suggestedInvestments, setSuggestedInvestments] = useState<SuggestedInvestment[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [appliedAiIds, setAppliedAiIds] = useState<Set<number>>(new Set());
  const [applyingAiId, setApplyingAiId] = useState<number | null>(null);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [clientId]);

  const loadNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("consultant_notes")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setNotes((data as Note[]) || []);
    setLoading(false);
  };

  const newNote = () => {
    setActiveNote(null);
    setTitle("");
    setContent("");
    setSuggestedActions([]);
    setSuggestedInvestments([]);
    setShowSuggestions(false);
    setAppliedAiIds(new Set());
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSuggestedActions([]);
    setSuggestedInvestments([]);
    setShowSuggestions(false);
    setAppliedAiIds(new Set());
    setHistoryOpen(false);
  };

  const saveNote = async () => {
    if (!content.trim()) {
      toast({ title: "Escreva algo antes de salvar", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (activeNote) {
        await supabase
          .from("consultant_notes")
          .update({ title, content })
          .eq("id", activeNote.id);
        toast({ title: "Parecer atualizado" });
      } else {
        const { data } = await supabase
          .from("consultant_notes")
          .insert({ client_id: clientId, title, content })
          .select()
          .single();
        if (data) setActiveNote(data as Note);
        toast({ title: "Parecer salvo" });
      }
      await loadNotes();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  const deleteNote = async (id: string) => {
    await supabase.from("consultant_notes").delete().eq("id", id);
    if (activeNote?.id === id) newNote();
    await loadNotes();
    toast({ title: "Parecer excluído" });
  };

  // Sync contentEditable with content state
  const getEditorText = useCallback(() => {
    if (!editorRef.current) return "";
    // Extract text + preserve image markdown
    const clone = editorRef.current.cloneNode(true) as HTMLElement;
    // Replace img elements with their markdown equivalent
    clone.querySelectorAll("img").forEach((img) => {
      const alt = img.getAttribute("alt") || "image";
      const src = img.getAttribute("src") || "";
      const text = document.createTextNode(`![${alt}](${src})`);
      img.parentNode?.replaceChild(text, img);
    });
    return clone.innerText || "";
  }, []);

  const handleEditorInput = useCallback(() => {
    const text = getEditorText();
    setContent(text);
  }, [getEditorText]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        setUploadingImage(true);
        try {
          const ext = file.type.split("/")[1] || "png";
          const fileName = `${clientId}/${Date.now()}.${ext}`;
          const { data, error } = await supabase.storage
            .from("parecer-images")
            .upload(fileName, file, { contentType: file.type });

          if (error) throw error;

          const { data: urlData } = supabase.storage
            .from("parecer-images")
            .getPublicUrl(data.path);

          // Insert image at cursor position
          const img = document.createElement("img");
          img.src = urlData.publicUrl;
          img.alt = "image";
          img.style.maxWidth = "100%";
          img.style.borderRadius = "8px";
          img.style.margin = "8px 0";
          img.style.display = "block";

          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
            range.setStartAfter(img);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            editorRef.current?.appendChild(img);
          }

          // Update content state
          setTimeout(() => handleEditorInput(), 0);
          toast({ title: "Imagem inserida!" });
        } catch (err: any) {
          toast({ title: "Erro ao fazer upload da imagem", variant: "destructive" });
        }
        setUploadingImage(false);
        return;
      }
    }
  }, [clientId, handleEditorInput, toast]);

  // Set editor content when switching notes
  useEffect(() => {
    if (editorRef.current) {
      // Convert markdown images back to img tags for display
      const htmlContent = content.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0;display:block;" />'
      );
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [activeNote]);

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    setShowSuggestions(false);
    try {
      const textOnly = content.replace(/!\[[^\]]*\]\([^)]+\)/g, "").trim();
      const { data, error } = await supabase.functions.invoke("analyze-notes", {
        body: { content: textOnly || null, clientId },
      });
      if (error) throw error;
      setSuggestedActions(
        (data.action_items || []).map((a: any) => ({ ...a, selected: true }))
      );
      setSuggestedInvestments(
        (data.investment_recommendations || []).map((i: any) => ({ ...i, selected: true }))
      );
      setShowSuggestions(true);
      setAppliedAiIds(new Set());
      toast({ title: "Análise concluída!", description: `${(data.action_items || []).length} ações e ${(data.investment_recommendations || []).length} investimentos sugeridos.` });
    } catch (e: any) {
      toast({ title: e?.message || "Erro na análise com IA", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const applyAiAction = async (action: SuggestedAction, idx: number) => {
    setApplyingAiId(idx);
    try {
      // Match goal_description to a goal_id
      let goalId: string | null = null;
      if (action.goal_description) {
        const { data: goalsData } = await supabase
          .from("goals")
          .select("id, description")
          .eq("client_id", clientId);
        if (goalsData) {
          const match = goalsData.find(g =>
            g.description.toLowerCase().includes(action.goal_description!.toLowerCase()) ||
            action.goal_description!.toLowerCase().includes(g.description.toLowerCase())
          );
          if (match) goalId = match.id;
        }
      }

      let { data: plan } = await supabase
        .from("action_plans")
        .select("id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (!plan) {
        const { data: newPlan } = await supabase
          .from("action_plans")
          .insert({ client_id: clientId })
          .select("id")
          .single();
        plan = newPlan;
      }
      if (plan) {
        await supabase.from("action_items").insert({
          action_plan_id: plan.id,
          area: action.area as any,
          description: action.description,
          objective: action.objective,
          financial_impact: action.financial_impact,
          goal_id: goalId,
        });
      }
      setAppliedAiIds(prev => new Set(prev).add(idx));
      toast({ title: "Ação aplicada ao plano!" });
    } catch {
      toast({ title: "Erro ao aplicar ação", variant: "destructive" });
    }
    setApplyingAiId(null);
  };

  const applyAiInvestment = async (inv: SuggestedInvestment, idx: number) => {
    const globalIdx = suggestedActions.length + idx;
    setApplyingAiId(globalIdx);
    try {
      await supabase.from("investment_recommendations").insert({
        client_id: clientId,
        product_name: inv.product_name,
        product_type: inv.product_type,
        risk_level: inv.risk_level,
        invested_amount: inv.invested_amount,
        rationale: inv.rationale,
        expected_return: inv.expected_return || null,
      });
      setAppliedAiIds(prev => new Set(prev).add(globalIdx));
      toast({ title: "Investimento aplicado!" });
    } catch {
      toast({ title: "Erro ao aplicar investimento", variant: "destructive" });
    }
    setApplyingAiId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* History Collapsible */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <History className="h-6 w-6" />
              Histórico ({notes.length})
              <ChevronDown className={`h-6 w-6 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <Button size="sm" onClick={newNote} className="gap-1.5 h-7 text-xs">
            <Plus className="h-6 w-6" />
            Novo Parecer
          </Button>
        </div>
        <CollapsibleContent>
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && notes.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Nenhum parecer salvo</p>
            )}
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all group ${
                  activeNote?.id === note.id
                    ? "bg-accent/8 border-accent/30"
                    : "bg-card border-border/40 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {note.title || "Sem título"}
                    </p>
                    <p className="text-[0.6875rem] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-6 w-6" />
                      {format(new Date(note.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="h-6 w-6 text-destructive" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Editor */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <PenLine className="h-6 w-6 text-accent" />
              <CardTitle className="text-lg">
                {activeNote ? "Editar Parecer" : "Novo Parecer"}
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveNote}
                disabled={saving}
                className="gap-1.5"
              >
                {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                Salvar
              </Button>
              <Button
                size="sm"
                onClick={analyzeWithAI}
                disabled={analyzing}
                className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {analyzing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
                Analisar com IA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Título do parecer (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base font-medium"
          />
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              onPaste={handlePaste}
              data-placeholder="Escreva suas observações e recomendações sobre o cliente aqui...

Exemplos:
• Recomendo que o cliente reduza gastos com alimentação em R$ 500/mês
• Sugiro aplicar R$ 10.000 em CDB 120% CDI para reserva de emergência
• O cliente deve quitar a dívida do cartão de crédito prioritariamente

💡 Você pode colar imagens diretamente aqui (Ctrl+V)"
              className="min-h-[250px] text-[0.9375rem] leading-relaxed resize-y p-3 rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-auto empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:whitespace-pre-wrap"
              suppressContentEditableWarning
            />
            {uploadingImage && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-md">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Enviando imagem...
                </div>
              </div>
            )}
            <div className="absolute bottom-2 right-3 text-xs text-muted-foreground/50">
              {content.length} caracteres
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Loading */}
      {analyzing && (
        <Card className="border-accent/20">
          <CardContent className="py-6 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Analisando parecer com IA...</p>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {showSuggestions && (suggestedActions.length > 0 || suggestedInvestments.length > 0) && (
        <Card className="border-accent/20 bg-accent/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent" />
              <CardTitle className="text-base">Sugestões da IA</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {suggestedActions.length + suggestedInvestments.length} itens
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedActions.map((action, idx) => {
              const applied = appliedAiIds.has(idx);
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    applied ? "bg-emerald-500/5 border-emerald-200" : "bg-card border-border/40"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[0.6875rem] px-1.5 py-0.5 rounded-full border ${areaColors[action.area] || "bg-muted"}`}>
                        {areaLabels[action.area] || action.area}
                      </span>
                      {action.financial_impact > 0 && (
                        <span className="text-xs font-medium text-emerald-600">{fmt(action.financial_impact)}</span>
                      )}
                      {applied && (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-[0.6875rem]">
                          <CheckCircle2 className="h-6 w-6 mr-1" /> Aplicada
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-foreground">{action.description}</p>
                    {action.objective && (
                      <p className="text-[0.6875rem] text-muted-foreground mt-0.5">→ {action.objective}</p>
                    )}
                  </div>
                  {!applied && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 shrink-0"
                      onClick={() => applyAiAction(action, idx)}
                      disabled={applyingAiId === idx}
                    >
                      {applyingAiId === idx ? <Loader2 className="h-6 w-6 animate-spin" /> : <Zap className="h-6 w-6" />}
                      Aplicar
                    </Button>
                  )}
                </div>
              );
            })}

            {suggestedActions.length > 0 && suggestedInvestments.length > 0 && <Separator />}

            {suggestedInvestments.map((inv, idx) => {
              const globalIdx = suggestedActions.length + idx;
              const applied = appliedAiIds.has(globalIdx);
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    applied ? "bg-emerald-500/5 border-emerald-200" : "bg-card border-border/40"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-foreground">{inv.product_name}</span>
                      <Badge variant="outline" className="text-[0.6875rem]">{inv.product_type.replace("_", " ")}</Badge>
                      <Badge variant="secondary" className="text-[0.6875rem]">{inv.risk_level}</Badge>
                      {applied && (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-[0.6875rem]">
                          <CheckCircle2 className="h-6 w-6 mr-1" /> Aplicada
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmt(inv.invested_amount)}
                      {inv.expected_return && ` • Retorno: ${inv.expected_return}`}
                    </p>
                    <p className="text-[0.6875rem] text-muted-foreground mt-0.5">{inv.rationale}</p>
                  </div>
                  {!applied && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 shrink-0"
                      onClick={() => applyAiInvestment(inv, idx)}
                      disabled={applyingAiId === globalIdx}
                    >
                      {applyingAiId === globalIdx ? <Loader2 className="h-6 w-6 animate-spin" /> : <Zap className="h-6 w-6" />}
                      Aplicar
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
