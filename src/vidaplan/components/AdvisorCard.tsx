// Card do consultor Novare — fala direto com o time pelo WhatsApp.
import { MessageCircle, UserRound } from "lucide-react";

const WHATS = "5519983402827";
const MSG = encodeURIComponent("Olá! Quero falar sobre meu projeto de vida no Novare Vida Plan.");

const AdvisorCard = () => (
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
    <a href={`https://wa.me/${WHATS}?text=${MSG}`} target="_blank" rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E29578] px-4 py-2.5 text-sm font-semibold text-[#16314f] hover:bg-[#eaa98e] transition-colors">
      <MessageCircle className="h-4 w-4" /> Falar com a Novare
    </a>
  </div>
);

export default AdvisorCard;
