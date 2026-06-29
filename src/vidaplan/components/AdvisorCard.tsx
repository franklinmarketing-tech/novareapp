// Card do consultor Novare — contato direto, vínculo por código e convite.
import { useVidaPlan } from "../state/VidaPlanContext";
import { MessageCircle, UserRound, Share2 } from "lucide-react";

const WHATS = "5519983402827";
const MSG = encodeURIComponent("Olá! Quero falar sobre meu projeto de vida no Novare Vida Plan.");
const APP_URL = "https://vidaplan-novare.vercel.app";

const AdvisorCard = () => {
  const { input, setField } = useVidaPlan();

  const convidar = async () => {
    const texto = `Conheça o Novare Vida Plan — monte seu projeto de vida: ${APP_URL}`;
    try {
      if (navigator.share) { await navigator.share({ title: "Novare Vida Plan", text: texto, url: APP_URL }); return; }
    } catch { /* cancelou */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div className="rounded-2xl bg-[#16314f] p-5 text-white">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <UserRound className="h-5 w-5 text-[#E29578]" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/50">Seu consultor</p>
          <p className="font-display text-lg font-bold leading-tight">Novare Consultoria</p>
        </div>
      </div>
      <p className="text-sm text-white/60 mt-3">
        Um especialista revisa seu plano e personaliza a estratégia — investimentos, proteção e sucessão — pra sua realidade.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`https://wa.me/${WHATS}?text=${MSG}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#E29578] px-4 py-2.5 text-sm font-semibold text-[#16314f] hover:bg-[#eaa98e] transition-colors">
          <MessageCircle className="h-4 w-4" /> Falar com a Novare
        </a>
        <button onClick={convidar}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10 transition-colors">
          <Share2 className="h-4 w-4" /> Convidar
        </button>
      </div>

      <label className="mt-4 block">
        <span className="text-[11px] text-white/50">Tem o código de um consultor? Vincule aqui (opcional)</span>
        <input value={input.advisorCodigo ?? ""} onChange={(e) => setField("advisorCodigo", e.target.value)}
          placeholder="Código do consultor"
          className="mt-1 w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E29578]" />
      </label>
    </div>
  );
};

export default AdvisorCard;
