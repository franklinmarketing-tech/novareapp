// Detecção do app "Novare Vida Plan" por subdomínio.
// Em produção o app vive em vidaplan.novareapp.com.br (mesmo build, DNS aponta pra cá).
// Em localhost/preview, acessa-se direto por /vidaplan.

export const VIDAPLAN_BASE = "/vidaplan";

// Ativa o app quando o host contém "vidaplan":
// - subdomínio próprio: vidaplan.novareapp.com.br
// - URL do Vercel:      vidaplan-novare.vercel.app (qualquer projeto/alias com "vidaplan")
export const isVidaPlanHost = (): boolean => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h.includes("vidaplan");
};
