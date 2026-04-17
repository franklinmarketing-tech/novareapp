import { useClientId } from "@/contexts/ClientContext";
import { NoteEditor } from "@/components/parecer/NoteEditor";

const AdminParecer = () => {
  const { clientId } = useClientId();

  return (
    <div className="max-w-3xl mx-auto">
      <NoteEditor clientId={clientId} />
    </div>
  );
};

export default AdminParecer;
