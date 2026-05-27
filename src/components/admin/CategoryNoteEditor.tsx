import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NotebookPen, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";

export type NoteCategory = "income" | "expenses" | "debts" | "assets" | "insurance" | "goals";

interface Props {
  clientId: string;
  category: NoteCategory;
  readOnly?: boolean;
  /** Acento visual da seção (hex/HSL CSS). Default: cor primária. */
  accent?: string;
  /** Texto inicial mostrado quando vazio (placeholder no admin / "—" no cliente). */
  placeholder?: string;
}

const CATEGORY_LABEL: Record<NoteCategory, string> = {
  income: "Rendas",
  expenses: "Despesas",
  debts: "Dívidas",
  assets: "Patrimônio",
  insurance: "Seguros",
  goals: "Objetivos",
};

const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : null;

export function CategoryNoteEditor({
  clientId, category, readOnly = false, accent, placeholder,
}: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef<string>("");

  const { data: note } = useQuery({
    queryKey: ["acao_notas", clientId, category],
    queryFn: async () => {
      const { data } = await supabase
        .from("acao_notas")
        .select("*")
        .eq("client_id", clientId)
        .eq("category", category)
        .maybeSingle();
      return data as { id: string; content: string; updated_at: string } | null;
    },
    enabled: !!clientId,
  });

  // Hidrata o estado local quando a query carrega
  useEffect(() => {
    if (note) {
      setContent(note.content ?? "");
      setSavedAt(note.updated_at ?? null);
      lastSavedContent.current = note.content ?? "";
    } else {
      setContent("");
      lastSavedContent.current = "";
    }
  }, [note?.id]);

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      // Upsert (uma nota por client_id + category, garantida pelo UNIQUE)
      const { error } = await supabase
        .from("acao_notas")
        .upsert(
          { client_id: clientId, category, content: value },
          { onConflict: "client_id,category" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      lastSavedContent.current = content;
      setSavedAt(new Date().toISOString());
      qc.invalidateQueries({ queryKey: ["acao_notas", clientId, category] });
    },
    onSettled: () => setSaving(false),
  });

  const handleChange = (value: string) => {
    setContent(value);
    if (readOnly) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value === lastSavedContent.current) return;
      setSaving(true);
      saveMutation.mutate(value);
    }, 800);
  };

  // Quando vai desmontar / mudar de cliente, dispara save imediato se houver pendência
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!readOnly && content !== lastSavedContent.current) {
        saveMutation.mutate(content);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasContent = content && content.trim().length > 0;

  // Cor de acento — fallback para variável CSS do tema
  const bar = accent ?? "hsl(var(--primary))";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 backdrop-blur-sm overflow-hidden transition-all",
        open ? "border-border" : "border-border/50 hover:border-border",
      )}
      style={{ borderLeft: `3px solid ${bar}` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `${bar}18`, border: `1px solid ${bar}30` }}
        >
          <NotebookPen className="w-3 h-3" style={{ color: bar }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/70 leading-none">
            Anotações — {CATEGORY_LABEL[category]}
          </p>
          {!open && hasContent && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{content}</p>
          )}
          {!open && !hasContent && (
            <p className="text-[11px] text-muted-foreground/60 italic mt-1">
              {readOnly ? "Sem anotações do consultor." : "Clique para adicionar anotações."}
            </p>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-1.5">
          {readOnly ? (
            <div className="rounded-md bg-muted/30 px-3 py-2.5 min-h-[60px] text-sm whitespace-pre-wrap text-foreground/85">
              {hasContent ? content : <span className="italic text-muted-foreground/70">Sem anotações do consultor.</span>}
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder ?? "Escreva observações, contexto, plano específico para esta categoria..."}
              className="min-h-[80px] text-sm bg-background/70 border-border/60 resize-y"
              rows={4}
            />
          )}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {savedAt ? <>Atualizado em {formatDateTime(savedAt)}</> : (readOnly ? "" : "Salva automaticamente ao digitar")}
            </span>
            {!readOnly && (
              <span className="inline-flex items-center gap-1">
                {saving ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Salvando…</>
                ) : content === lastSavedContent.current && content.length > 0 ? (
                  <><Check className="w-3 h-3 text-emerald-500" /> Salvo</>
                ) : null}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
