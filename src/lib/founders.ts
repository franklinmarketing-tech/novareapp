import { supabase } from "@/integrations/supabase/client";
import jeffersonImg from "@/assets/jefferson.png";
import leonardoImg from "@/assets/leonardo.png";

// Fallback para fotos dos sócios originais (até admin enviar novas pelo Storage)
const FALLBACK_IMAGES: Record<string, string> = {
  jefferson: jeffersonImg,
  leonardo: leonardoImg,
};

export type FounderHighlight = { icon: string; text: string };

export interface Founder {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  certs: string;
  role: string;
  short_bio: string;
  bio: string;
  image_url: string | null;
  linkedin_url: string | null;
  highlights: FounderHighlight[];
  display_order: number;
  active: boolean;
}

export const fetchFounders = async (includeInactive = false): Promise<Founder[]> => {
  let q = supabase.from("founders").select("*").order("display_order", { ascending: true });
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((d) => ({
    ...d,
    highlights: Array.isArray(d.highlights) ? (d.highlights as any) : [],
  })) as Founder[];
};
