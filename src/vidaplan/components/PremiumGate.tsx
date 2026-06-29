// Libera o conteúdo premium quando a assinatura está ativa (ou teste válido);
// senão mostra o cartão de bloqueio GOLD com CTA.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "../state/useSubscription";
import { Lock, Sparkles } from "lucide-react";

export const GoldBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-[#E2A03F]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b07d1e]">
    <Sparkles className="h-3 w-3" /> Gold
  </span>
);

const PremiumGate = ({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) => {
  const { loading, isPremium, status, startTrial } = useSubscription();
  if (loading) return null;
  if (isPremium) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-[#E2A03F]/40 bg-[#E2A03F]/[0.06] p-5">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="h-4 w-4 text-[#b07d1e]" />
        <p className="font-display text-lg font-bold text-[#16314f]">{titulo}</p>
        <GoldBadge />
      </div>
      <p className="text-sm text-[#1b2a3d]/60 mb-4">{descricao}</p>
      <div className="flex flex-wrap gap-2">
        {status === "inactive" && (
          <button onClick={startTrial} className="inline-flex items-center gap-1.5 rounded-xl bg-[#16314f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d3e63] transition-colors">
            <Sparkles className="h-4 w-4" /> Testar grátis por 14 dias
          </button>
        )}
        <Link to="/vidaplan/app/assinar" className="inline-flex items-center rounded-xl border border-[#16314f]/20 px-4 py-2 text-sm font-semibold text-[#16314f] hover:bg-white transition-colors">
          Ver planos
        </Link>
      </div>
    </div>
  );
};

export default PremiumGate;
