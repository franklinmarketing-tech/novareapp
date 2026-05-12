import { useEffect, useRef, useState } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { NoteEditor, type NoteEditorHandle } from "@/components/parecer/NoteEditor";
import { AlinhamentoConsultivo } from "@/components/parecer/AlinhamentoConsultivo";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { PanelLeftClose, PanelLeft, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SnapshotChip } from "@/components/parecer/snapshotTypes";

const AdminParecer = () => {
  const { clientId } = useClientId();
  const editorRef = useRef<NoteEditorHandle>(null);

  // V9: estado de painel Alinhamento Consultivo colapsado (persistido)
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("parecer:panel-collapsed") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("parecer:panel-collapsed", panelCollapsed ? "1" : "0");
  }, [panelCollapsed]);

  const handleInsertChip = (chip: SnapshotChip) => {
    editorRef.current?.insertChip(chip);
  };

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "grid grid-cols-1 gap-4 xl:gap-6 transition-[grid-template-columns] duration-300 ease-out",
          panelCollapsed ? "xl:grid-cols-[44px_1fr]" : "xl:grid-cols-3",
        )}
      >
        {/* Painel — versao collapsada (barra estreita) ou expandida */}
        {panelCollapsed ? (
          <div className="hidden xl:flex flex-col items-center gap-2 sticky top-16 self-start">
            <button
              onClick={() => setPanelCollapsed(false)}
              title="Expandir Alinhamento Consultivo"
              className="h-10 w-10 rounded-lg flex items-center justify-center bg-card border border-border/60 hover:border-accent/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div
              className="rounded-lg px-2 py-3 bg-card border border-border/40 flex flex-col items-center gap-1.5"
              style={{ writingMode: "vertical-rl" }}
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-accent" style={{ writingMode: "horizontal-tb" }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">
                Alinhamento Consultivo
              </span>
            </div>
          </div>
        ) : (
          <div className="xl:col-span-1 relative">
            <button
              onClick={() => setPanelCollapsed(true)}
              title="Recolher Alinhamento Consultivo"
              className="hidden xl:inline-flex absolute top-2 right-2 z-10 h-7 w-7 items-center justify-center rounded-md bg-card/80 backdrop-blur-sm border border-border/40 hover:border-accent/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
            <AlinhamentoConsultivo clientId={clientId} onInsertChip={handleInsertChip} />
          </div>
        )}

        <div className={cn(panelCollapsed ? "" : "xl:col-span-2")}>
          <NoteEditor ref={editorRef} clientId={clientId} />
        </div>
      </div>

      {/* V9: CTA para proxima etapa */}
      <JourneyFooterNav
        current="parecer"
        message="Parecer pronto. Use-o como referência no Plano de Ação — a IA gerará 3 variantes A/B/C com base nele."
      />
    </div>
  );
};

export default AdminParecer;
