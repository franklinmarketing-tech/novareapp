// Marca efetiva vista por quem está logado (white-label):
//  1) consultor com marca própria → a marca dele;
//  2) cliente vinculado a um consultor → a marca do consultor (lida do banco);
//  3) caso contrário → Novare Vida Plan (padrão).
import { useEffect, useState } from "react";
import { useVidaPlan } from "./VidaPlanContext";
import { useConsultorPerfil } from "./ConsultorPerfil";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as { from: (t: string) => any };

export interface Marca {
  logo?: string;       // dataURL (assessor) — quando ausente, usa o logo Novare
  logoRatio?: number;
  nome: string;        // nome do sistema exibido (ex.: "Vida Plan" ou o nome do assessor)
  empresa?: string;
  custom: boolean;     // true = marca de assessor (não Novare)
}

export function useBrand(): Marca {
  const { input } = useVidaPlan();
  const { isConsultor } = useConsultorPerfil();
  const b = input.branding;
  const consultorId = input.advisorVinculo?.consultorId ?? null;
  const [linked, setLinked] = useState<Marca | null>(null);

  const ownCustom = isConsultor && !!(b?.logo || b?.sistema || b?.empresa);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (ownCustom || !consultorId) { setLinked(null); return; }
      try {
        const { data } = await db.from("vidaplan_consultores").select("logo, logo_ratio, sistema, nome, empresa").eq("consultor_id", consultorId).maybeSingle();
        if (cancel) return;
        if (data && (data.logo || data.sistema || data.empresa)) {
          setLinked({
            logo: data.logo || undefined,
            logoRatio: data.logo_ratio || undefined,
            nome: data.sistema || data.empresa || input.advisorVinculo?.nome || "Vida Plan",
            empresa: data.empresa || undefined,
            custom: true,
          });
        } else setLinked(null);
      } catch { if (!cancel) setLinked(null); }
    })();
    return () => { cancel = true; };
  }, [ownCustom, consultorId]);

  if (ownCustom) {
    return { logo: b!.logo, logoRatio: b!.logoRatio, nome: b!.sistema || b!.empresa || "Vida Plan", empresa: b!.empresa, custom: true };
  }
  if (linked) return linked;
  return { nome: "Vida Plan", custom: false };
}
