// Card no Painel do cliente com a recomendação escrita pelo consultor (assessor).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVidaPlan } from "../state/VidaPlanContext";
import { VPCard } from "./ui";
import { MessageCircle } from "lucide-react";

const db = supabase as unknown as { from: (t: string) => any };

const RecomendacaoConsultor = () => {
  const { user } = useAuth();
  const { input } = useVidaPlan();
  const [rec, setRec] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user) return;
      try {
        const { data } = await db.from("vidaplan_atendimento").select("recomendacao").eq("cliente_id", user.id).order("updated_at", { ascending: false }).limit(1);
        const texto = Array.isArray(data) && data[0]?.recomendacao ? String(data[0].recomendacao).trim() : "";
        if (!cancel) setRec(texto || null);
      } catch { /* tabela ausente */ }
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  if (!rec) return null;
  const nome = input.advisorVinculo?.nome || input.advisorVinculo?.empresa || "seu consultor";

  return (
    <VPCard className="p-5 border-l-4" style={{ borderLeftColor: "#2F8F6B" }}>
      <p className="text-[11px] uppercase tracking-wider text-[#2F8F6B] font-bold flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Recomendação de {nome}</p>
      <p className="text-sm text-[#16314f] mt-1.5 whitespace-pre-line">{rec}</p>
    </VPCard>
  );
};

export default RecomendacaoConsultor;
