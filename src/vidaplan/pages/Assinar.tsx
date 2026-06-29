// Assinatura GOLD do Novare Vida Plan — teste grátis + planos.
import { useState } from "react";
import { useSubscription } from "../state/useSubscription";
import { VPCard, VPTitle } from "../components/ui";
import { Check, Sparkles, MessageCircle, Loader2 } from "lucide-react";

const WHATS = "5519983402827";
const RECURSOS = [
  "Relatório PDF do seu Projeto de Vida",
  "Gastos invisíveis (assinaturas, juros e taxas)",
  "Consultor Novare dedicado",
  "Plano de ação e carteira sugerida sempre atualizados",
];
const PLANOS = [
  { id: "mensal", titulo: "Mensal", preco: "R$ 19,90", sub: "por mês", eco: "" },
  { id: "semestral", titulo: "Semestral", preco: "R$ 99,90", sub: "= R$ 16,65/mês", eco: "Economize 16%" },
  { id: "anual", titulo: "Anual", preco: "R$ 179,90", sub: "= R$ 14,99/mês", eco: "Economize 25%" },
];

const Assinar = () => {
  const { status, isPremium, daysLeft, startTrial } = useSubscription();
  const [sel, setSel] = useState("anual");
  const [loading, setLoading] = useState(false);

  const plano = PLANOS.find((p) => p.id === sel)!;
  const wa = `https://wa.me/${WHATS}?text=${encodeURIComponent(`Olá! Quero assinar o Novare Vida Plan GOLD — plano ${plano.titulo} (${plano.preco}).`)}`;

  const iniciarTeste = async () => { setLoading(true); await startTrial(); setLoading(false); };

  return (
    <div className="space-y-6">
      <VPTitle hint="Desbloqueie tudo do seu Projeto de Vida.">Seja GOLD</VPTitle>

      {/* Status atual */}
      {isPremium ? (
        <div className="rounded-2xl bg-[#2F8F6B] p-5 text-white">
          <p className="font-display text-lg font-bold flex items-center gap-2"><Sparkles className="h-5 w-5" /> {status === "active" ? "Assinatura GOLD ativa" : `Teste GOLD ativo`}</p>
          <p className="text-white/70 text-sm mt-1">{status === "trial" ? `Restam ${daysLeft} dia(s) de teste grátis. Garanta a continuidade assinando abaixo.` : "Você tem acesso a todos os recursos."}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#16314f] p-5 text-white">
          <p className="font-display text-lg font-bold">Experimente grátis por 14 dias</p>
          <p className="text-white/60 text-sm mt-1 mb-3">Sem cobrança agora. Acesse todos os recursos GOLD na hora.</p>
          <button onClick={iniciarTeste} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E29578] px-4 py-2.5 text-sm font-semibold text-[#16314f] hover:bg-[#eaa98e] transition-colors disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Começar teste grátis
          </button>
        </div>
      )}

      {/* Recursos */}
      <VPCard className="p-5">
        <p className="font-display text-base font-bold text-[#16314f] mb-3">O que vem no GOLD</p>
        <ul className="space-y-2">
          {RECURSOS.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-[#1b2a3d]/80">
              <Check className="h-4 w-4 text-[#2F8F6B] mt-0.5 shrink-0" /> {r}
            </li>
          ))}
        </ul>
      </VPCard>

      {/* Planos */}
      <div className="grid sm:grid-cols-3 gap-3">
        {PLANOS.map((p) => {
          const ativo = sel === p.id;
          return (
            <button key={p.id} onClick={() => setSel(p.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${ativo ? "border-[#C8643F] bg-[#C8643F]/[0.06]" : "border-black/10 hover:border-[#16314f]/30"}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#16314f]">{p.titulo}</p>
                {p.eco && <span className="text-[10px] font-bold text-[#2F8F6B]">{p.eco}</span>}
              </div>
              <p className="font-display text-2xl font-bold text-[#16314f] mt-1">{p.preco}</p>
              <p className="text-xs text-[#1b2a3d]/50">{p.sub}</p>
            </button>
          );
        })}
      </div>

      <a href={wa} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#16314f] py-3.5 text-sm font-semibold text-white hover:bg-[#1d3e63] transition-colors">
        <MessageCircle className="h-4 w-4" /> Assinar plano {plano.titulo}
      </a>
      <p className="text-[11px] text-[#1b2a3d]/45 text-center">
        A assinatura é confirmada com a Novare pelo WhatsApp. Cancele quando quiser.
      </p>
    </div>
  );
};

export default Assinar;
