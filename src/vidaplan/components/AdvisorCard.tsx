// Card do consultor: marca própria (consultor) OU vínculo do cliente com seu consultor por código.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useVidaPlan } from "../state/VidaPlanContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, UserRound, Share2, Palette, Loader2, Link2, X } from "lucide-react";

const WHATS = "5519983402827";
const MSG = encodeURIComponent("Olá! Quero falar sobre meu projeto de vida no Novare Vida Plan.");
const APP_URL = "https://vidaplan-novare.vercel.app";
const db = supabase as unknown as { from: (t: string) => any };

const AdvisorCard = () => {
  const { input, setField } = useVidaPlan();
  const { user } = useAuth();
  const b = input.branding;
  const temMarca = !!(b?.logo || b?.consultor || b?.empresa);
  const vinculo = input.advisorVinculo;

  const [cod, setCod] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const nomeUser = () => (user as { user_metadata?: { full_name?: string; name?: string } } | null)?.user_metadata?.full_name
    || (user as { user_metadata?: { name?: string } } | null)?.user_metadata?.name
    || user?.email?.split("@")[0] || "Cliente";

  // Mantém o snapshot do plano atualizado para o consultor vinculado.
  useEffect(() => {
    if (!user || !vinculo) return;
    db.from("vidaplan_vinculos").upsert({
      cliente_id: user.id, consultor_id: vinculo.consultorId, cliente_nome: nomeUser(),
      snapshot: { ...input, branding: undefined }, updated_at: new Date().toISOString(),
    }).then?.(() => {}, () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vincular = async () => {
    const codigo = cod.trim().toUpperCase();
    if (codigo.length < 3) return;
    setLoading(true); setMsg(null);
    try {
      const { data: c } = await db.from("vidaplan_consultores").select("consultor_id,nome,empresa,codigo").eq("codigo", codigo).maybeSingle();
      if (!c) { setMsg("Código não encontrado. Confira com seu consultor."); return; }
      if (user) {
        await db.from("vidaplan_vinculos").upsert({
          cliente_id: user.id, consultor_id: c.consultor_id, cliente_nome: nomeUser(),
          snapshot: { ...input, branding: undefined }, updated_at: new Date().toISOString(),
        });
      }
      setField("advisorVinculo", { codigo, consultorId: c.consultor_id, nome: c.nome, empresa: c.empresa });
      setField("advisorCodigo", codigo);
      setCod("");
    } catch { setMsg("Não foi possível vincular agora. Tente de novo."); }
    finally { setLoading(false); }
  };

  const desvincular = async () => {
    try { if (user) await db.from("vidaplan_vinculos").delete().eq("cliente_id", user.id); } catch { /* ignora */ }
    setField("advisorVinculo", undefined);
  };

  const convidar = async () => {
    const texto = `Conheça o Novare Vida Plan — monte seu projeto de vida: ${APP_URL}`;
    try { if (navigator.share) { await navigator.share({ title: "Novare Vida Plan", text: texto, url: APP_URL }); return; } } catch { /* cancelou */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const tel = (b?.telefone ?? "").replace(/\D/g, "");
  const whats = tel ? (tel.startsWith("55") ? tel : `55${tel}`) : WHATS;
  // Quem aparece como "Seu consultor": marca própria > consultor vinculado > Novare.
  const nomeConsultor = temMarca ? (b?.consultor || b?.empresa) : vinculo ? (vinculo.nome || vinculo.empresa || "Seu consultor") : "Novare Consultoria";
  const subConsultor = temMarca ? (b?.consultor && b?.empresa ? b.empresa : null) : vinculo ? (vinculo.nome && vinculo.empresa ? vinculo.empresa : null) : null;

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
          <p className="font-display text-lg font-bold leading-tight truncate">{nomeConsultor}</p>
          {subConsultor && <p className="text-xs text-white/55 truncate">{subConsultor}</p>}
        </div>
      </div>
      <p className="text-sm text-white/60 mt-3">
        Um especialista revisa seu plano e personaliza a estratégia — investimentos, proteção e sucessão — pra sua realidade.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`https://wa.me/${whats}?text=${MSG}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#E29578] px-4 py-2.5 text-sm font-semibold text-[#16314f] hover:bg-[#eaa98e] transition-colors">
          <MessageCircle className="h-4 w-4" /> Falar com {temMarca ? (b?.consultor || "o consultor") : "a Novare"}
        </a>
        <button onClick={convidar}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10 transition-colors">
          <Share2 className="h-4 w-4" /> Convidar
        </button>
      </div>

      {temMarca ? (
        <Link to="/vidaplan/app/marca" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white transition-colors">
          <Palette className="h-3.5 w-3.5" /> Editar minha marca
        </Link>
      ) : vinculo ? (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.07] px-3 py-2">
          <span className="text-[11px] text-white/60">Vinculado pelo código <strong className="font-mono text-white/80">{vinculo.codigo}</strong></span>
          <button onClick={desvincular} className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white"><X className="h-3.5 w-3.5" /> desvincular</button>
        </div>
      ) : (
        <div className="mt-4">
          <span className="text-[11px] text-white/50">Tem o código do seu consultor? Vincule e ele acompanha seu plano.</span>
          <div className="mt-1 flex gap-2">
            <input value={cod} onChange={(e) => setCod(e.target.value.toUpperCase())} placeholder="Código do consultor"
              onKeyDown={(e) => e.key === "Enter" && vincular()}
              className="flex-1 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm font-mono tracking-wide text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-white/30 outline-none focus:border-[#E29578]" />
            <button onClick={vincular} disabled={loading || cod.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E29578] px-3 py-2 text-sm font-semibold text-[#16314f] hover:bg-[#eaa98e] disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Vincular
            </button>
          </div>
          {msg && <p className="text-[11px] text-[#E29578] mt-1.5">{msg}</p>}
        </div>
      )}
    </div>
  );
};

export default AdvisorCard;
