import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Legend } from "recharts";
import { SEO } from "@/components/SEO";
import { NovareToolFooter } from "@/components/NovareToolFooter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Sparkles, Check, RotateCcw } from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";

// ── Perguntas (cada opção vale pontos) ────────────────────────────────────────
interface Pergunta { q: string; opcoes: { label: string; pts: number }[] }

const PERGUNTAS: Pergunta[] = [
  { q: "Qual seu principal objetivo ao investir?", opcoes: [
    { label: "Preservar meu dinheiro", pts: 1 },
    { label: "Gerar uma renda complementar", pts: 2 },
    { label: "Fazer o patrimônio crescer", pts: 3 },
    { label: "Multiplicar com mais risco", pts: 4 },
  ] },
  { q: "Por quanto tempo pretende deixar o dinheiro investido?", opcoes: [
    { label: "Menos de 1 ano", pts: 1 },
    { label: "De 1 a 3 anos", pts: 2 },
    { label: "De 3 a 5 anos", pts: 3 },
    { label: "Mais de 5 anos", pts: 4 },
  ] },
  { q: "Como você descreve seu conhecimento sobre investimentos?", opcoes: [
    { label: "Iniciante", pts: 1 },
    { label: "Básico", pts: 2 },
    { label: "Intermediário", pts: 3 },
    { label: "Avançado", pts: 4 },
  ] },
  { q: "Se sua carteira caísse 20% em um mês, você...", opcoes: [
    { label: "Venderia tudo", pts: 1 },
    { label: "Ficaria muito preocupado", pts: 2 },
    { label: "Manteria a estratégia", pts: 3 },
    { label: "Aproveitaria para comprar mais", pts: 4 },
  ] },
  { q: "Quanto do patrimônio você aceita ver oscilar para buscar mais retorno?", opcoes: [
    { label: "Nada, quero segurança", pts: 1 },
    { label: "Até 10%", pts: 2 },
    { label: "Até 30%", pts: 3 },
    { label: "Mais de 30%", pts: 4 },
  ] },
  { q: "Onde você já investiu?", opcoes: [
    { label: "Só na poupança", pts: 1 },
    { label: "CDB, Tesouro, fundos", pts: 2 },
    { label: "Ações e FIIs", pts: 3 },
    { label: "Derivativos, cripto", pts: 4 },
  ] },
];

interface Perfil {
  nome: string; cor: string; chartColor: string; descricao: string;
  aloc: { name: string; value: number; fill: string }[];
}

const RF = "#1e3a5f", MM = "#c2602f", RV = "#4a9fe0";

function perfilFromScore(score: number): Perfil {
  if (score <= 11) return {
    nome: "Conservador", cor: "text-emerald-600", chartColor: "#059669",
    descricao: "Você prioriza a segurança e a previsibilidade. Sua carteira ideal concentra-se em renda fixa de baixo risco, com uma pequena parcela para buscar um retorno extra.",
    aloc: [{ name: "Renda Fixa", value: 85, fill: RF }, { name: "Multimercado", value: 10, fill: MM }, { name: "Renda Variável", value: 5, fill: RV }],
  };
  if (score <= 17) return {
    nome: "Moderado", cor: "text-novare-blue", chartColor: "#1e3a5f",
    descricao: "Você equilibra segurança e crescimento. Aceita alguma oscilação em troca de retornos melhores, com a maior parte ainda protegida em renda fixa.",
    aloc: [{ name: "Renda Fixa", value: 60, fill: RF }, { name: "Multimercado", value: 25, fill: MM }, { name: "Renda Variável", value: 15, fill: RV }],
  };
  if (score <= 21) return {
    nome: "Arrojado", cor: "text-novare-terracotta", chartColor: "#c2602f",
    descricao: "Você busca crescimento e tolera oscilações relevantes no curto prazo em troca de retornos maiores no longo prazo. A renda variável tem peso importante.",
    aloc: [{ name: "Renda Fixa", value: 40, fill: RF }, { name: "Multimercado", value: 30, fill: MM }, { name: "Renda Variável", value: 30, fill: RV }],
  };
  return {
    nome: "Agressivo", cor: "text-rose-600", chartColor: "#e11d48",
    descricao: "Você prioriza o máximo crescimento e está confortável com alta volatilidade. A maior parte da carteira fica em renda variável e estratégias de maior risco.",
    aloc: [{ name: "Renda Fixa", value: 20, fill: RF }, { name: "Multimercado", value: 30, fill: MM }, { name: "Renda Variável", value: 50, fill: RV }],
  };
}

export default function TesteDePerfil() {
  const [answers, setAnswers] = useState<(number | null)[]>(Array(PERGUNTAS.length).fill(null));
  const [revealed, setRevealed] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const score = useMemo(() => answers.reduce((s, a, i) => s + (a !== null ? PERGUNTAS[i].opcoes[a].pts : 0), 0), [answers]);
  const perfil = useMemo(() => perfilFromScore(score), [score]);

  const select = (qi: number, oi: number) =>
    setAnswers((p) => p.map((a, i) => (i === qi ? oi : a)));

  const reset = () => { setAnswers(Array(PERGUNTAS.length).fill(null)); setRevealed(false); setUnlocked(false); };

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());

  const handleUnlock = async () => {
    if (!emailValido) { toast.error("Informe um e-mail válido."); return; }
    setSubmitting(true);
    try {
      await supabase.from("profile_leads" as any).insert({
        email: leadEmail.trim(), perfil: perfil.nome, score,
      });
      setUnlocked(true);
      toast.success("Perfil liberado!");
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <SEO
        title="Teste de Perfil de Investidor | Novare"
        description="Descubra em 1 minuto se você é Conservador, Moderado, Arrojado ou Agressivo — e qual carteira combina com você."
      />

      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logoPreta} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs font-medium text-slate-500 hidden sm:block">Suitability</span>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-novare-blue/10 text-novare-blue px-3 py-1 text-xs font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Perfil de Investidor
        </div>
        <h1 className="text-3xl sm:text-[2.6rem] leading-tight font-display font-bold text-novare-blue">
          Que tipo de investidor é você?
        </h1>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto">
          Responda 6 perguntas rápidas e descubra seu perfil — Conservador, Moderado, Arrojado ou Agressivo — e a carteira ideal para você.
        </p>
      </section>

      <section className="max-w-2xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {!revealed ? (
            <>
              <div className="space-y-6">
                {PERGUNTAS.map((p, qi) => (
                  <div key={qi}>
                    <p className="font-semibold text-slate-800 mb-2.5">
                      <span className="text-novare-blue">{qi + 1}.</span> {p.q}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {p.opcoes.map((o, oi) => (
                        <button key={oi} onClick={() => select(qi, oi)}
                          className={cn(
                            "text-left text-sm px-3.5 py-2.5 rounded-xl border transition-all",
                            answers[qi] === oi
                              ? "bg-novare-blue border-novare-blue text-white font-medium"
                              : "border-slate-200 text-slate-600 hover:border-novare-blue/40",
                          )}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-7">
                <Button onClick={() => setRevealed(true)} disabled={!allAnswered}
                  className="bg-novare-blue hover:bg-novare-blue/90 text-white font-bold px-10 h-12 text-base">
                  Ver meu perfil
                </Button>
              </div>
              {!allAnswered && (
                <p className="text-center text-xs text-slate-400 mt-2">
                  Responda todas as perguntas ({answers.filter((a) => a !== null).length}/{PERGUNTAS.length}).
                </p>
              )}
            </>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* Resultado */}
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Seu perfil é</p>
                <p className={cn("text-3xl font-display font-bold mt-1", perfil.cor)}>{perfil.nome}</p>
                <p className="text-xs text-slate-400 mt-1">Pontuação: {score}/24</p>
              </div>

              {!unlocked ? (
                <div className="rounded-2xl bg-novare-blue text-white p-6 sm:p-8 text-center">
                  <h3 className="text-xl font-bold">Veja sua carteira ideal</h3>
                  <p className="text-white/80 text-sm mt-2 max-w-md mx-auto">
                    Informe seu e-mail para liberar a <strong className="text-white">alocação recomendada</strong> para o perfil <strong className="text-white">{perfil.nome}</strong> e as orientações.
                  </p>
                  <div className="max-w-md mx-auto mt-5 space-y-3">
                    <Input type="email" placeholder="seuemail@exemplo.com" value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="h-12 bg-white text-slate-900 border-0 text-center" />
                    <Button onClick={handleUnlock} disabled={submitting || !emailValido}
                      className="w-full h-12 bg-novare-terracotta hover:bg-novare-terracotta/90 text-white font-bold">
                      {submitting ? "Liberando..." : "Ver minha carteira"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/50 mt-4 max-w-md mx-auto leading-relaxed">
                    Ao informar seus dados, você concorda com a Política de Privacidade e aceita receber comunicações da Novare Consultoria de Investimentos.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  <p className="text-sm text-slate-600 leading-relaxed text-center">{perfil.descricao}</p>

                  {/* Alocação */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-bold text-slate-900 mb-3 text-center">Carteira sugerida · perfil {perfil.nome}</p>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={perfil.aloc} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                            {perfil.aloc.map((a, i) => <Cell key={i} fill={a.fill} />)}
                          </Pie>
                          <RTooltip formatter={(v: number) => `${v}%`} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center">Alocação educacional de referência. A carteira real depende dos seus objetivos e da conjuntura.</p>
                  </div>

                  {/* CTA */}
                  <div className="rounded-2xl bg-novare-terracotta text-white p-6 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-bold text-lg">Quer montar essa carteira na prática?</p>
                      <p className="text-white/85 text-sm mt-0.5">Um consultor Novare monta a alocação ideal para o seu perfil {perfil.nome}.</p>
                    </div>
                    <Button asChild variant="secondary" className="bg-white text-novare-terracotta hover:bg-white/90 font-bold">
                      <a href={`https://wa.me/5519983402827?text=Sou%20perfil%20${encodeURIComponent(perfil.nome)}%20e%20quero%20montar%20minha%20carteira%20com%20a%20Novare`} target="_blank" rel="noopener noreferrer">
                        Falar com a Novare
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <button onClick={reset} className="mx-auto flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600">
                <RotateCcw className="h-3.5 w-3.5" /> Refazer o teste
              </button>
            </div>
          )}
        </div>

        {/* Como funciona */}
        <div className="max-w-2xl mx-auto mt-10 grid sm:grid-cols-4 gap-3 text-center">
          {[
            { p: "Conservador", c: "text-emerald-600" },
            { p: "Moderado", c: "text-novare-blue" },
            { p: "Arrojado", c: "text-novare-terracotta" },
            { p: "Agressivo", c: "text-rose-600" },
          ].map((x) => (
            <div key={x.p} className="rounded-xl border border-slate-200 bg-white p-3">
              <Check className={cn("h-4 w-4 mx-auto mb-1", x.c)} />
              <p className={cn("text-sm font-bold", x.c)}>{x.p}</p>
            </div>
          ))}
        </div>
      </section>

      <NovareToolFooter intro="Conhecer seu perfil é o primeiro passo. Fale com a Novare e monte a carteira ideal para os seus objetivos." />
    </div>
  );
}
