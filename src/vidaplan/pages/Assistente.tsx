// Assistente IA do Novare Vida Plan — conversa sobre o projeto de vida do usuário (premium).
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { computeActionPlan } from "../lib/actionplan";
import { VPTitle } from "../components/ui";
import PremiumGate from "../components/PremiumGate";
import { Sparkles, Send, Loader2, Bot } from "lucide-react";

const SUGESTOES = [
  "Por onde eu começo?",
  "Como faço pra ficar viável?",
  "Onde posso cortar custos?",
  "Vale a pena adiar a aposentadoria?",
];

interface Msg { role: "user" | "assistant"; content: string }

const Chat = () => {
  const { input, plan } = useVidaPlan();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const resumo = useMemo(() => {
    const ap = computeActionPlan(input, plan);
    return [
      `Marco Horizonte (custo total do projeto): ${brl0(plan.capitalDeVida)}.`,
      `Independência: aos ${input.idadeAposentadoria} anos, renda desejada ${brl0(input.rendaAposDesejada)}/mês, patrimônio necessário ${brl0(plan.alvoAposentadoria)}.`,
      `Projeção: patrimônio aos ${input.idadeAposentadoria} = ${brl0(plan.patrimonioNaApos)} (${Math.round(plan.pctAtingido)}% da meta); ${plan.viavel ? "VIÁVEL" : "NÃO viável"}.`,
      `Realidade: renda ${brl0(input.rendaMensal)}/mês, custo ${brl0(input.custoFixoMensal)}/mês, sobra ${brl0(input.rendaMensal - input.custoFixoMensal)}/mês, patrimônio ${brl0(input.patrimonioAtual)}, rentabilidade IPCA+${input.rentRealPct}%.`,
      `Sonhos: ${input.goals.map((g) => `${g.nome || g.tipo} ${brl0(g.valor)}`).join("; ") || "—"}.`,
      `Plano de ação: aporte recomendado ${brl0(ap.aporteRecomendadoMes)}/mês, reserva ${brl0(ap.reservaEmergencia)}, carteira ${ap.horizonte} (IPCA+${ap.rentEsperadaPct.toFixed(1)}%), proteção família ${brl0(ap.protecaoFamilia)}.`,
      `Alavancas p/ viabilizar: esperar ${plan.esperarAnos ?? "—"} ano(s); rentabilidade IPCA+${plan.rentNecessariaPct?.toFixed(1) ?? "—"}%; poupar +${brl0(plan.pouparMaisMes ?? 0)}/mês.`,
    ].join("\n");
  }, [input, plan]);

  const enviar = async (pergunta: string) => {
    if (!pergunta.trim() || loading) return;
    const novo: Msg[] = [...msgs, { role: "user", content: pergunta }];
    setMsgs(novo); setTexto(""); setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("vidaplan-assist", {
        body: { resumo, pergunta, historico: msgs.slice(-8) },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      const answer = data?.answer || data?.error || "Não consegui responder agora.";
      setMsgs([...novo, { role: "assistant", content: answer }]);
    } catch {
      setMsgs([...novo, { role: "assistant", content: "Tive um problema para responder. Tente de novo em instantes." }]);
    } finally {
      setLoading(false);
      setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="flex flex-col">
      {msgs.length === 0 ? (
        <div className="rounded-2xl bg-[#16314f] p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#E29578] to-[#C8643F] flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5 text-white" /></div>
            <div>
              <p className="font-display text-lg font-bold leading-tight">IA Novare</p>
              <p className="text-white/55 text-xs">Enxergo todos os seus números e respondo com base neles.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button key={s} onClick={() => enviar(s)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/20 transition-colors">{s}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#E29578] to-[#C8643F] flex items-center justify-center shrink-0 mt-0.5"><Bot className="h-4 w-4 text-white" /></div>}
              <div className={cn("max-w-[82%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap", m.role === "user" ? "bg-[#16314f] text-white" : "bg-white border border-black/5 text-[#1b2a3d]")}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#E29578] to-[#C8643F] flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-white" /></div>
              <div className="rounded-2xl bg-white border border-black/5 px-4 py-2.5 text-sm text-[#1b2a3d]/50 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> pensando…</div>
            </div>
          )}
          <div ref={fim} />
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="mt-4 flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua pergunta…"
          className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F]" />
        <button type="submit" disabled={loading || !texto.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-[#16314f] px-4 text-white hover:bg-[#1d3e63] transition-colors disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="text-[11px] text-[#1b2a3d]/45 mt-2">Orientação educativa, não recomendação personalizada. Para decisões, fale com seu consultor Novare.</p>
    </div>
  );
};

const Assistente = () => (
  <div className="space-y-6">
    <VPTitle hint="Seu consultor financeiro com IA, 24/7, com base no seu projeto de vida.">IA Novare</VPTitle>
    <PremiumGate titulo="IA Novare" descricao="Converse com a inteligência da Novare sobre o seu plano: por onde começar, como ficar viável, onde cortar custos.">
      <Chat />
    </PremiumGate>
  </div>
);

export default Assistente;
