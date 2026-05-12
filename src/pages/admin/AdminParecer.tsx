import { useRef } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { NoteEditor, type NoteEditorHandle } from "@/components/parecer/NoteEditor";
import { AlinhamentoConsultivo } from "@/components/parecer/AlinhamentoConsultivo";
import type { SnapshotChip } from "@/components/parecer/snapshotTypes";

const AdminParecer = () => {
  const { clientId } = useClientId();
  const editorRef = useRef<NoteEditorHandle>(null);

  const handleInsertChip = (chip: SnapshotChip) => {
    editorRef.current?.insertChip(chip);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-1">
        <AlinhamentoConsultivo clientId={clientId} onInsertChip={handleInsertChip} />
      </div>
      <div className="xl:col-span-2">
        <NoteEditor ref={editorRef} clientId={clientId} />
      </div>
    </div>
  );
};

export default AdminParecer;
