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

// Jornadas separadas por subdomínio:
//  - parceiros./assessor./consultor.  → jornada do ASSESSOR
//  - app./cliente.                     → jornada do CLIENTE
//  - host neutro (vercel/localhost)    → null (mostra a escolha)
// Para testar antes do DNS: ?a=consultor ou ?a=cliente (fica salvo no navegador).
export type Audience = "consultor" | "cliente";

export const hostAudience = (): Audience | null => {
  if (typeof window === "undefined") return null;
  const h = window.location.hostname.toLowerCase();
  try {
    const forced = new URLSearchParams(window.location.search).get("a");
    if (forced === "consultor" || forced === "cliente") { localStorage.setItem("vidaplan:audience", forced); return forced; }
  } catch { /* ignora */ }
  if (/parceiro|assessor|consultor/.test(h)) return "consultor";
  if (/(^|\.)app\.|cliente/.test(h)) return "cliente";
  // host neutro: respeita a escolha salva (para testes pré-DNS)
  try { const s = localStorage.getItem("vidaplan:audience"); if (s === "consultor" || s === "cliente") return s as Audience; } catch { /* ignora */ }
  return null;
};
