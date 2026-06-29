// Card do consultor — Novare por padrão, ou marca personalizada do consultor (white-label).
import { Link } from "react-router-dom";
import { useVidaPlan } from "../state/VidaPlanContext";
import { MessageCircle, UserRound, Share2, Palette } from "lucide-react";

const WHATS = "5519983402827";
const MSG = encodeURIComponent("Olá! Quero falar sobre meu projeto de vida no Novare Vida Plan.");
const APP_URL = "https://vidaplan-novare.vercel.app";

const AdvisorCard = () => {
  const { input, setField } = useVidaPlan();
  const b = input.branding;
  const temMarca = !!(b?.logo || b?.consultor || b?.empresa);

  const tel = (b?.telefone ?? "").replace(/\D/g, "");
  const whats = tel ? (tel.startsWith("55") ? tel : `55${tel}`) : WHATS;
  const nomeContato = b?.consultor || b?.empresa || "a Novare";

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
        {temMarca && b?.logo ? (
          <div className="h-11 min-w-11 max-w-[140px] rounded-lg bg-white flex items-center justify-center px-2 shrink-0">
            <img src={b.logo} alt={b?.empresa || "Consultor"} className="max-h-8 max-w-full object-contain" />
          </div>
        ) : (
          <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <UserRound className="h-5 w-5 text-[#E29578]" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-white/50">Seu consultor</p>
          <p className="font-display text-lg font-bold leading-tight truncate">
            {temMarca ? (b?.consultor || b?.empresa) : "Novare Consultoria"}
          </p>
          {temMarca && b?.consultor && b?.empresa && <p className="text-xs text-white/55 truncate">{b.empresa}</p>}
        </div>
      </div>
      <p className="text-sm text-white/60 mt-3">
        Um especialista revisa seu plano e personaliza a estratégia — investimentos, proteção e sucessão — pra sua realidade.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`https://wa.me/${whats}?text=${MSG}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#E29578] px-4 py-2.5 text-sm font-semibold text-[#16314f] hover:bg-[#eaa98e] transition-colors">
          <MessageCircle className="h-4 w-4" /> Falar com {nomeContato}
        </a>
        <button onClick={convidar}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10 transition-colors">
          <Share2 className="h-4 w-4" /> Convidar
        </button>
      </div>

      {!temMarca ? (
        <label className="mt-4 block">
          <span className="text-[11px] text-white/50">Tem o código de um consultor? Vincule aqui (opcional)</span>
          <input value={input.advisorCodigo ?? ""} onChange={(e) => setField("advisorCodigo", e.target.value)}
            placeholder="Código do consultor"
            className="mt-1 w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E29578]" />
        </label>
      ) : (
        <Link to="/vidaplan/app/marca" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white transition-colors">
          <Palette className="h-3.5 w-3.5" /> Editar minha marca
        </Link>
      )}
    </div>
  );
};

export default AdvisorCard;
