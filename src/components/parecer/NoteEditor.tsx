import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
  Bold, Italic, Underline, List, ListOrdered, Quote, Minus, Eraser,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DOMPurify from "dompurify";
import {
  fmtBRL,
  SOURCE_CONFIG,
  type SnapshotChip,
} from "./snapshotTypes";

interface Note {
  id: string;
  client_id: string;
  title: string;
  content: string;
  snapshots?: SnapshotChip[];
  created_at: string;
  updated_at: string;
}

export interface NoteEditorHandle {
  /** Insere um chip de referencia no editor na posicao do cursor */
  insertChip: (chip: SnapshotChip) => void;
}

// V9: IA agora gera RASCUNHO DE TEXTO (nao acoes — isso e do Plano de Acao)
interface ParecerDraftSection {
  title: string;
  content: string; // HTML simples
}

interface ParecerKeyFinding {
  kind: "atencao" | "oportunidade" | "forte";
  text: string;
}

interface ParecerDraft {
  suggested_text: string;
  sections: ParecerDraftSection[];
  key_findings: ParecerKeyFinding[];
}

interface Props {
  clientId: string;
}

export const NoteEditor = forwardRef<NoteEditorHandle, Props>(({ clientId }, ref) => {
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
  const [historyOpen, setHistoryOpen] = useState(true);

  // V9: rascunho de texto da IA (substitui as antigas sugestoes de acao)
  const [draft, setDraft] = useState<ParecerDraft | null>(null);
  const [showDraft, setShowDraft] = useState(false);
  const [insertedSections, setInsertedSections] = useState<Set<number>>(new Set());

  // Detecta alterações não salvas (estado "em edição")
  const isDirty = activeNote
    ? title !== activeNote.title || content !== activeNote.content
    : Boolean(title.trim() || content.trim());
  const isEditing = Boolean(activeNote) && isDirty;

  // V9: auto-save state
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // V9: tick que forca re-render a cada 5s para atualizar "Salvo ha Xs"
  const [, setNow] = useState(Date.now());
  // V9: word counter em state, atualizado via debounce no handleEditorInput
  const [wordCount, setWordCount] = useState(0);
  // V9: lock para evitar race condition entre auto-save e save manual
  const savingLockRef = useRef(false);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [clientId]);

  // V9: tick a cada 5s para atualizar o badge "Salvo ha Xs"
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

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
    setDraft(null);
    setShowDraft(false);
    setInsertedSections(new Set());
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content);
    setDraft(null);
    setShowDraft(false);
    setInsertedSections(new Set());
    setHistoryOpen(false);
  };

  // Detecta se o erro do Supabase eh por coluna 'snapshots' nao existir
  // (migration ainda nao aplicada no projeto remoto)
  const isSnapshotsColumnMissing = (err: any) => {
    const msg = (err?.message || err?.details || "").toLowerCase();
    return msg.includes("snapshots") && (msg.includes("does not exist") || msg.includes("column"));
  };

  const saveNote = async (silent = false) => {
    if (!content.trim() && !getPlainText()) {
      if (!silent) toast({ title: "Escreva algo antes de salvar", variant: "destructive" });
      return;
    }
    // V9: lock anti-race — evita auto-save + save manual concorrentes
    if (savingLockRef.current) {
      if (!silent) toast({ title: "Aguarde, save em andamento..." });
      return;
    }
    savingLockRef.current = true;
    if (silent) setAutoSaving(true);
    else setSaving(true);

    const snapshots = extractSnapshots();
    const noteTitle = title.trim() || `Parecer ${format(new Date(), "dd/MM/yyyy HH:mm")}`;

    // Tenta com snapshots; se a coluna nao existir no banco, retenta sem
    const attemptSave = async (withSnapshots: boolean) => {
      if (activeNote) {
        const payload: any = { title: noteTitle, content };
        if (withSnapshots) payload.snapshots = snapshots;
        const { error } = await supabase
          .from("consultant_notes")
          .update(payload)
          .eq("id", activeNote.id);
        return { error, data: null };
      } else {
        const payload: any = { client_id: clientId, title: noteTitle, content };
        if (withSnapshots) payload.snapshots = snapshots;
        const res = await supabase
          .from("consultant_notes")
          .insert(payload)
          .select()
          .single();
        return { error: res.error, data: res.data };
      }
    };

    try {
      let { error, data } = await attemptSave(true);
      // Se a coluna snapshots ainda nao existe, retenta sem ela e avisa
      if (error && isSnapshotsColumnMissing(error)) {
        if (!silent) {
          toast({
            title: "Migration pendente",
            description: "A coluna 'snapshots' não existe no banco — salvando sem chips. Rode a migration para preservar referências.",
            variant: "destructive",
          });
        }
        const retry = await attemptSave(false);
        error = retry.error;
        data = retry.data;
      }
      if (error) throw error;

      if (!activeNote && data) {
        setActiveNote(data as Note);
        setTitle((data as Note).title || noteTitle);
      }
      await loadNotes();
      setLastSavedAt(new Date());
      if (!silent) {
        toast({
          title: "Parecer arquivado",
          description: "O parecer foi salvo no histórico. Iniciando um novo rascunho.",
        });
        // V9: save manual = arquiva no historico + abre novo parecer em branco
        // Limpa o editor explicitamente (DOM) — newNote() so reseta state
        if (editorRef.current) editorRef.current.innerHTML = "";
        newNote();
        setWordCount(0);
        setHistoryOpen(true); // mostra o historico com a nota recem arquivada
      }
    } catch (e: any) {
      if (import.meta.env.DEV) console.error("[NoteEditor.saveNote]", e);
      const desc = e?.message || e?.details || e?.hint || "Verifique sua conexão e tente novamente.";
      toast({
        title: silent ? "Auto-save falhou" : "Erro ao salvar",
        description: desc,
        variant: "destructive",
      });
    }
    if (silent) setAutoSaving(false);
    else setSaving(false);
    savingLockRef.current = false;
  };

  // V9: auto-save com debounce de 30s — cria nota nova se ainda nao existe,
  // mas apenas quando ha conteudo significativo (>=10 caracteres de texto)
  useEffect(() => {
    if (!isDirty) return;
    const hasSignificantContent = getPlainText().length >= 10;
    // Em nota nova precisa de conteudo minimo para nao criar fantasma
    if (!activeNote && !hasSignificantContent) return;

    // Debounce de 30s — consultor escreve com calma sem chamadas desnecessarias
    const t = setTimeout(() => {
      saveNote(true);
    }, 30000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title, isDirty, activeNote?.id]);

  const deleteNote = async (id: string) => {
    await supabase.from("consultant_notes").delete().eq("id", id);
    if (activeNote?.id === id) newNote();
    await loadNotes();
    toast({ title: "Parecer excluído" });
  };

  // V9: content agora carrega HTML do editor (preserva chips de referencia).
  // Notas legadas que vinham como texto plano continuam renderizando porque
  // o contentEditable aceita texto puro como nodos de texto.
  const getEditorText = useCallback(() => {
    return editorRef.current?.innerHTML ?? "";
  }, []);

  // Extrai texto puro (sem chips e sem imagens) para enviar a IA
  const getPlainText = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return "";
    const clone = editor.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".parecer-chip, img").forEach((el) => el.remove());
    return (clone.innerText || clone.textContent || "").trim();
  }, []);

  const handleEditorInput = useCallback(() => {
    setContent(getEditorText());
    // V9: atualiza word counter (sem chamar getPlainText em cada render)
    const plain = getPlainText();
    setWordCount(plain.split(/\s+/).filter(Boolean).length);
    // V9: placeholder reaparece quando so ha <br>/<p></p> vazios
    const editor = editorRef.current;
    if (editor) {
      const isVisuallyEmpty =
        plain.length === 0 &&
        editor.querySelectorAll(".parecer-chip, img").length === 0;
      editor.setAttribute("data-placeholder-visible", isVisuallyEmpty ? "true" : "false");
    }
  }, [getEditorText, getPlainText]);

  // V9: Insere um chip de referencia na posicao do cursor
  const insertChip = useCallback((chip: SnapshotChip) => {
    const editor = editorRef.current;
    if (!editor) return;

    const cfg = SOURCE_CONFIG[chip.source];
    const valuePart =
      chip.value != null && chip.value > 0 ? ` · ${fmtBRL(chip.value)}` : "";
    const countPart =
      chip.kind === "group" && typeof chip.meta?.count === "number"
        ? ` (${chip.meta.count})`
        : "";
    const text = `${cfg.emoji} ${chip.label}${countPart}${valuePart}`;

    // V9: tooltip nativo com detalhe completo do snapshot
    const tooltipParts = [
      `${cfg.label}${chip.kind === "group" ? " (grupo)" : ""}: ${chip.label}`,
      chip.value != null && chip.value > 0 ? `Valor: ${fmtBRL(chip.value)}` : null,
      chip.kind === "group" && typeof chip.meta?.count === "number"
        ? `${chip.meta.count} itens`
        : null,
      `Capturado em ${new Date(chip.capturedAt).toLocaleDateString("pt-BR")}`,
    ].filter(Boolean) as string[];

    const chipEl = document.createElement("span");
    chipEl.className = "parecer-chip";
    chipEl.setAttribute("contenteditable", "false");
    chipEl.setAttribute("data-chip", JSON.stringify(chip));
    chipEl.setAttribute("data-chip-id", chip.chipId);
    chipEl.setAttribute("data-chip-source", chip.source);
    chipEl.setAttribute("title", tooltipParts.join(" • "));

    const labelEl = document.createElement("span");
    labelEl.className = "parecer-chip-label";
    labelEl.textContent = text;

    const removeEl = document.createElement("span");
    removeEl.className = "parecer-chip-remove";
    removeEl.setAttribute("role", "button");
    removeEl.setAttribute("tabindex", "0");
    removeEl.setAttribute("aria-label", "Remover referência");
    removeEl.textContent = "×";

    chipEl.appendChild(labelEl);
    chipEl.appendChild(removeEl);

    editor.focus();
    const selection = window.getSelection();
    const isSelectionInsideEditor =
      selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode);

    // V9 fix: garante espaco ANTES e DEPOIS do chip
    const endsWithoutSpace = (node: Node | null | undefined): boolean => {
      if (!node) return false;
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent || "";
        return t.length > 0 && !/\s$/.test(t);
      }
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as HTMLElement).classList?.contains("parecer-chip")
      ) {
        return true;
      }
      return false;
    };

    if (isSelectionInsideEditor) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      // Verifica se precisa de espaco ANTES do chip
      const { startContainer, startOffset } = range;
      let needSpaceBefore = false;
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const before = (startContainer.textContent || "").slice(0, startOffset);
        if (before.length > 0 && !/\s$/.test(before)) needSpaceBefore = true;
      } else if (startContainer.nodeType === Node.ELEMENT_NODE && startOffset > 0) {
        const prev = startContainer.childNodes[startOffset - 1];
        if (prev) needSpaceBefore = endsWithoutSpace(prev);
      }
      if (needSpaceBefore) {
        const leading = document.createTextNode(" ");
        range.insertNode(leading);
        range.setStartAfter(leading);
        range.collapse(true);
      }

      range.insertNode(chipEl);
      const trailing = document.createTextNode(" ");
      chipEl.parentNode?.insertBefore(trailing, chipEl.nextSibling);
      range.setStartAfter(trailing);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Sem cursor dentro do editor: acrescenta no final, garantindo espaco antes
      if (endsWithoutSpace(editor.lastChild)) {
        editor.appendChild(document.createTextNode(" "));
      }
      editor.appendChild(chipEl);
      editor.appendChild(document.createTextNode(" "));
    }

    handleEditorInput();
  }, [handleEditorInput]);

  // V9: extrai os chips atuais do DOM para persistir como snapshots
  const extractSnapshots = useCallback((): SnapshotChip[] => {
    const editor = editorRef.current;
    if (!editor) return [];
    const chips = editor.querySelectorAll<HTMLSpanElement>(".parecer-chip[data-chip]");
    const out: SnapshotChip[] = [];
    chips.forEach((c) => {
      try {
        const raw = c.getAttribute("data-chip");
        if (raw) out.push(JSON.parse(raw) as SnapshotChip);
      } catch {
        /* ignora chip corrompido */
      }
    });
    return out;
  }, []);

  // V9: click no botao "×" do chip remove a referencia + colapsa espacos
  const handleEditorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("parecer-chip-remove")) {
        e.preventDefault();
        e.stopPropagation();
        const chip = target.closest(".parecer-chip");
        if (!chip) return;

        // Antes de remover, captura nodos adjacentes para colapsar espacos duplos
        const prev = chip.previousSibling;
        const next = chip.nextSibling;
        chip.remove();

        // Se sobraram dois nodos de texto com espacos adjacentes, colapsa
        if (
          prev?.nodeType === Node.TEXT_NODE &&
          next?.nodeType === Node.TEXT_NODE
        ) {
          const merged = (prev.textContent || "") + (next.textContent || "");
          prev.textContent = merged.replace(/\s{2,}/g, " ");
          next.parentNode?.removeChild(next);
        }
        handleEditorInput();
      }
    },
    [handleEditorInput],
  );

  // Expoe insertChip para o pai (AdminParecer + AlinhamentoConsultivo)
  useImperativeHandle(ref, () => ({ insertChip }), [insertChip]);

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

    // V9: paste de texto/HTML — sanitiza HTML sujo (Word, Google Docs, etc)
    // Se o clipboard tem HTML, limpamos via DOMPurify; senao, deixa o navegador
    // inserir como texto plano via insertText.
    const html = e.clipboardData?.getData("text/html");
    const text = e.clipboardData?.getData("text/plain");
    if (html && html.trim().length > 0) {
      e.preventDefault();
      const safe = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "a"],
        ALLOWED_ATTR: ["href", "target", "rel"],
      });
      document.execCommand("insertHTML", false, safe);
      handleEditorInput();
    } else if (text && text.trim().length > 0) {
      e.preventDefault();
      document.execCommand("insertText", false, text);
      handleEditorInput();
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
      // Sanitize before injecting to prevent stored XSS via notes
      const safeHtml = DOMPurify.sanitize(htmlContent, {
        ALLOWED_TAGS: ["img", "br", "p", "div", "b", "i", "u", "strong", "em", "ul", "ol", "li", "a", "span", "h2", "h3", "h4", "blockquote", "hr"],
        ALLOWED_ATTR: [
          "src",
          "alt",
          "style",
          "href",
          "target",
          "rel",
          // V9: chips de referencia do parecer
          "class",
          "contenteditable",
          "data-chip",
          "data-chip-id",
          "data-chip-source",
          "role",
          "tabindex",
          "aria-label",
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      });
      if (editorRef.current.innerHTML !== safeHtml) {
        editorRef.current.innerHTML = safeHtml;
      }
    }
  }, [activeNote]);

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    setShowDraft(false);
    try {
      const textOnly = getPlainText();
      const snapshots = extractSnapshots();
      const { data, error } = await supabase.functions.invoke("analyze-notes", {
        body: { content: textOnly || null, clientId, snapshots },
      });
      if (error) throw error;
      const result: ParecerDraft = {
        suggested_text: data?.suggested_text || "",
        sections: Array.isArray(data?.sections) ? data.sections : [],
        key_findings: Array.isArray(data?.key_findings) ? data.key_findings : [],
      };
      setDraft(result);
      setInsertedSections(new Set());
      setShowDraft(true);
      toast({
        title: "Rascunho de parecer gerado",
        description: `${result.sections.length} seções e ${result.key_findings.length} pontos chave.`,
      });
    } catch (e: any) {
      toast({ title: e?.message || "Erro ao gerar parecer com IA", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  // V9: insere HTML do rascunho no editor (no final do conteudo atual)
  // Sanitiza o output da IA antes de inserir — defesa contra prompt injection
  const insertHtmlIntoEditor = (html: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const safe = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "hr"],
      ALLOWED_ATTR: [],
    });
    const wrapper = document.createElement("div");
    wrapper.innerHTML = safe;
    // adiciona uma linha em branco se ja ha conteudo
    if (editor.innerHTML.trim().length > 0) {
      editor.appendChild(document.createElement("br"));
    }
    while (wrapper.firstChild) {
      editor.appendChild(wrapper.firstChild);
    }
    handleEditorInput();
    editor.focus();
  };

  const insertFullDraft = () => {
    if (!draft?.suggested_text) return;
    insertHtmlIntoEditor(draft.suggested_text);
    setInsertedSections(new Set(draft.sections.map((_, i) => i)));
    toast({ title: "Rascunho completo inserido no editor" });
  };

  const insertSection = (idx: number) => {
    if (!draft?.sections[idx]) return;
    const sec = draft.sections[idx];
    insertHtmlIntoEditor(`<h3>${sec.title}</h3>${sec.content}`);
    setInsertedSections((prev) => new Set(prev).add(idx));
  };

  // V9: toolbar de formatacao — operacoes em contenteditable
  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const insertSeparator = () => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, "<hr />");
    handleEditorInput();
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
          <div className="mt-3 grid gap-3 sm:grid-cols-2 max-h-[28rem] overflow-y-auto pr-1">
            {loading && (
              <div className="sm:col-span-2 space-y-2">
                <LoadingState variant="inline" />
                <LoadingState variant="inline" />
              </div>
            )}
            {!loading && notes.length === 0 && (
              <div className="sm:col-span-2">
                <EmptyState
                  icon={FileText}
                  variant="compact"
                  tone="neutral"
                  title="Nenhum parecer salvo"
                  description="Crie sua primeira nota para começar."
                />
              </div>
            )}
            {notes.map((note) => {
              const isActive = activeNote?.id === note.id;
              // V9: preview limpo — strip de chips, imagens, tags HTML e markdown
              const plainText = (note.content || "")
                .replace(/<span\s+class="parecer-chip"[^>]*>.*?<\/span>/g, "")
                .replace(/<img\b[^>]*>/g, "")
                .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/g, " ")
                .replace(/&[a-z]+;/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              const preview = plainText.length > 220 ? plainText.slice(0, 220) + "…" : plainText;
              const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
              const updated = note.updated_at && note.updated_at !== note.created_at;
              return (
                <article
                  key={note.id}
                  className={`group relative flex flex-col rounded-xl border bg-card shadow-sm transition-all hover:shadow-md ${
                    isActive
                      ? isEditing
                        ? "border-warning/50 ring-2 ring-warning/25 shadow-md animate-fade-in"
                        : "border-accent/50 ring-2 ring-accent/20"
                      : "border-border/60 hover:border-accent/30"
                  }`}
                >
                  {isActive && (
                    <span
                      className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${
                        isEditing ? "bg-warning animate-pulse" : "bg-accent"
                      }`}
                      aria-hidden
                    />
                  )}
                  <header className="flex items-start justify-between gap-2 p-4 pb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className={`h-4 w-4 shrink-0 ${isActive && isEditing ? "text-warning" : "text-accent"}`} />
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {note.title || "Parecer sem título"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[0.6875rem] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(note.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {updated && (
                          <Badge variant="secondary" className="text-[0.625rem] h-4 px-1.5">
                            editado
                          </Badge>
                        )}
                        {isActive && isEditing && (
                          <Badge variant="warning" className="text-[0.625rem] h-4 px-1.5 gap-1">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-75 animate-ping" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
                            </span>
                            alterações não salvas
                          </Badge>
                        )}
                        {isActive && !isEditing && (
                          <Badge className="bg-accent/10 text-accent border-accent/30 text-[0.625rem] h-4 px-1.5">
                            em edição
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 hover:bg-destructive/10 rounded-md shrink-0"
                      aria-label="Excluir parecer"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </header>

                  <div className="px-4 pb-3 flex-1">
                    {preview ? (
                      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-5 whitespace-pre-wrap">
                        {preview}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/60">Sem conteúdo</p>
                    )}
                  </div>

                  <footer className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border/40 bg-muted/20 rounded-b-xl">
                    <span className="text-[0.6875rem] text-muted-foreground">
                      {wordCount} {wordCount === 1 ? "palavra" : "palavras"}
                    </span>
                    <Button
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className="h-7 text-xs gap-1.5"
                      onClick={() => selectNote(note)}
                    >
                      <PenLine className="h-3 w-3" />
                      {isActive ? "Editando" : "Abrir"}
                    </Button>
                  </footer>
                </article>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Editor */}
      <Card
        className={`flex-1 transition-all ${
          isEditing
            ? "border-warning/40 ring-2 ring-warning/15 shadow-md"
            : activeNote
            ? "border-accent/30"
            : ""
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <PenLine className={`h-6 w-6 ${isEditing ? "text-warning" : "text-accent"}`} />
              <CardTitle className="text-lg truncate">
                {activeNote ? "Editar Parecer" : "Novo Parecer"}
              </CardTitle>
              {isEditing && autoSaving && (
                <Badge variant="outline" className="gap-1.5 ml-1 animate-fade-in border-accent/40 text-accent">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando...
                </Badge>
              )}
              {isEditing && !autoSaving && (
                <Badge variant="warning" className="gap-1.5 ml-1 animate-fade-in">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
                  </span>
                  Editando — auto-save em 30s
                </Badge>
              )}
              {activeNote && !isEditing && (
                <Badge variant="success" className="gap-1 ml-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {lastSavedAt
                    ? `Salvo há ${Math.max(0, Math.floor((Date.now() - lastSavedAt.getTime()) / 1000))}s`
                    : "Salvo"}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => saveNote(false)}
                disabled={saving || !isDirty}
                className="gap-1.5"
              >
                {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                {isEditing ? "Salvar alterações" : "Salvar"}
              </Button>
              <Button
                size="sm"
                onClick={analyzeWithAI}
                disabled={analyzing}
                className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                IA: rascunho do parecer
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

          {/* V9: toolbar de formatacao do parecer */}
          <div className="flex items-center gap-0.5 flex-wrap rounded-md border border-border/60 bg-muted/30 px-1.5 py-1">
            <ToolbarBtn label="Título" onClick={() => exec("formatBlock", "h3")}>
              <span className="text-[12px] font-bold tracking-tight">H</span>
            </ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn label="Negrito (Ctrl+B)" onClick={() => exec("bold")}>
              <Bold className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn label="Itálico (Ctrl+I)" onClick={() => exec("italic")}>
              <Italic className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn label="Sublinhado (Ctrl+U)" onClick={() => exec("underline")}>
              <Underline className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn label="Lista" onClick={() => exec("insertUnorderedList")}>
              <List className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn label="Lista numerada" onClick={() => exec("insertOrderedList")}>
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn label="Citação" onClick={() => exec("formatBlock", "blockquote")}>
              <Quote className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn label="Linha separadora" onClick={insertSeparator}>
              <Minus className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn label="Limpar formatação" onClick={() => exec("removeFormat")}>
              <Eraser className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <div className="ml-auto flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground/85">
              <span>{wordCount} {wordCount === 1 ? "palavra" : "palavras"}</span>
            </div>
          </div>

          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              onPaste={handlePaste}
              onClick={handleEditorClick}
              data-placeholder="Escreva o parecer técnico sobre o cliente aqui.

Dicas:
• Clique no '+' do painel ao lado para inserir referências dos dados do onboarding
• Use a toolbar acima para formatar (títulos, negrito, listas)
• Clique em 'IA: rascunho do parecer' para a IA redigir um texto inicial pronto pra você revisar

💡 Você pode colar imagens diretamente aqui (Ctrl+V)"
              className="parecer-editor min-h-[320px] text-[0.9375rem] leading-relaxed resize-y p-4 rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 overflow-auto empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:whitespace-pre-wrap"
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
          </div>
        </CardContent>
      </Card>

      {/* AI Loading */}
      {analyzing && (
        <Card className="border-accent/20">
          <CardContent className="py-6 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">A IA está redigindo um rascunho do parecer...</p>
            <p className="text-[11px] text-muted-foreground/70">
              Cruzando dados do onboarding, chips inseridos e suas observações.
            </p>
          </CardContent>
        </Card>
      )}

      {/* V9: Rascunho de parecer da IA (substitui as antigas sugestoes de acao) */}
      {showDraft && draft && (
        <Card className="border-accent/20 bg-gradient-to-br from-accent/[0.04] via-card to-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Rascunho da IA</CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Texto pronto para você revisar e inserir no parecer.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8"
                  onClick={insertFullDraft}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Inserir tudo
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 h-8 text-muted-foreground"
                  onClick={() => setShowDraft(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Pontos chave (findings) */}
            {draft.key_findings.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/85 mb-2">
                  Pontos chave identificados
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {draft.key_findings.map((f, i) => {
                    const tone =
                      f.kind === "atencao"
                        ? "border-amber-500/35 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300"
                        : f.kind === "oportunidade"
                          ? "border-accent/30 bg-accent/[0.05] text-accent"
                          : "border-success/30 bg-success/[0.05] text-success";
                    const label =
                      f.kind === "atencao" ? "Atenção" : f.kind === "oportunidade" ? "Oportunidade" : "Ponto forte";
                    return (
                      <div key={i} className={`rounded-lg border px-2.5 py-2 ${tone}`}>
                        <p className="text-[9.5px] font-bold uppercase tracking-wider mb-0.5 opacity-80">{label}</p>
                        <p className="text-[11.5px] text-foreground leading-snug">{f.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Secoes com botao de inserir */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/85 mb-2">
                Estrutura do rascunho ({draft.sections.length} seções)
              </p>
              <div className="space-y-2">
                {draft.sections.map((sec, i) => {
                  const inserted = insertedSections.has(i);
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 transition-colors ${
                        inserted
                          ? "border-success/35 bg-success/[0.04]"
                          : "border-border/60 bg-card hover:border-accent/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-[12.5px] font-semibold text-foreground tracking-tight">
                          {sec.title}
                        </p>
                        <Button
                          size="sm"
                          variant={inserted ? "ghost" : "outline"}
                          className="gap-1 h-7 text-[11px] shrink-0"
                          onClick={() => insertSection(i)}
                          disabled={inserted}
                        >
                          {inserted ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              Inserida
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Inserir
                            </>
                          )}
                        </Button>
                      </div>
                      <div
                        className="text-[11.5px] text-muted-foreground leading-relaxed prose-sm max-w-none [&_p]:mb-1.5 [&_strong]:text-foreground [&_strong]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: sec.content }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

NoteEditor.displayName = "NoteEditor";

// V9: botoes da toolbar de formatacao
const ToolbarBtn = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()} // nao perde o foco do editor
    onClick={onClick}
    title={label}
    aria-label={label}
    className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
  >
    {children}
  </button>
);

const ToolbarSep = () => (
  <span aria-hidden className="inline-block h-4 w-px bg-border/60 mx-0.5" />
);
