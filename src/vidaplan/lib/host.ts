// Detecção do app "Novare Vida Plan" por subdomínio.
// Em produção o app vive em vidaplan.novareapp.com.br (mesmo build, DNS aponta pra cá).
// Em localhost/preview, acessa-se direto por /vidaplan.

export const VIDAPLAN_BASE = "/vidaplan";

export const isVidaPlanHost = (): boolean => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h === "vidaplan.novareapp.com.br" || h.startsWith("vidaplan.");
};
