import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { SEO } from "@/components/SEO";
import { NovareToolFooter } from "@/components/NovareToolFooter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Sparkles, ArrowRight, CalendarCheck, Info, PiggyBank, CreditCard, Shield, TrendingUp } from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function gradeFor(score: number) {
  if (score >= 80) return { grade: "A", label: "Excelente", color: "#059669" };
  if (score >= 65) return { grade: "B", label: "Boa", color: "#1e3a5f" };
  if (score >= 50) return { grade: "C", label: "Mediana", color: "#d97706" };
  if (score >= 35) return { grade: "D", label: "Frágil", color: "#ea580c" };
  return { grade: "E", label: "Crítica", color: "#e11d48" };
}

export default function ScoreSaudeFinanceira() {
  const [renda, setRenda] = useState("8000");
  const [gastos, setGastos] = useState("4500");
  const [dividas, setDividas] = useState("1200");
  const [reserva, setReserva] = useState("10000");
  const [investe, setInveste] = useState("500");

  const [calculated, setCalculated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const num = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

  const sim = useMemo(() => {
    const r = num(renda), g = num(gastos), d = num(dividas), res = num(reserva), inv = num(investe);
    const sobra = r - g - d;
    const taxaPoup = r > 0 ? Math.max(0, sobra) / r : 0;
    const endivid = r > 0 ? d / r : 0;
    const mesesReserva = g > 0 ? res / g : (res > 0 ? 12 : 0);
    const taxaInveste = r > 0 ? inv / r : 0;

    const sPoup = clamp((taxaPoup / 0.20) * 100);
    const sDivida = clamp((1 - endivid / 0.30) * 100);
    const sReserva = clamp((mesesReserva / 6) * 100);
    const sInveste = clamp((taxaInveste / 0.10) * 100);

    const score = Math.round(sPoup * 0.30 + sDivida * 0.25 + sReserva * 0.25 + sInveste * 0.20);
    const g2 = gradeFor(score);

    const dims = [
      { key: "poup", label: "Sobra mensal", icon: PiggyBank, value: sPoup, hint: `${(taxaPoup * 100).toFixed(0)}% da renda sobra`, ideal: "ideal: 20%+" },
      { key: "div", label: "Controle de dívidas", icon: CreditCard, value: sDivida, hint: `${(endivid * 100).toFixed(0)}% da renda em parcelas`, ideal: "ideal: < 30%" },
      { key: "res", label: "Reserva de emergência", icon: Shield, value: sReserva, hint: `${mesesReserva.toFixed(1)} meses de gastos`, ideal: "ideal: 6 meses" },
      { key: "inv", label: "Hábito de investir", icon: TrendingUp, value: sInveste, hint: `${(taxaInveste * 100).toFixed(0)}% da renda investida`, ideal: "ideal: 10%+" },
    ];

    // recomendações (dimensões mais fracas)
    const recs: string[] = [];
    if (sDivida < 60) recs.push("Reduza o peso das dívidas: priorize quitar as de maior juro (use a estratégia Avalanche).");
    if (sReserva < 60) recs.push("Construa uma reserva de emergência de 6 meses de gastos em renda fixa de liquidez diária.");
    if (sPoup < 60) recs.push("Aumente a sobra mensal revisando gastos fixos — a meta saudável é poupar pelo menos 20% da renda.");
    if (sInveste < 60) recs.push("Crie o hábito de investir todo mês, mesmo que pouco — a consistência vale mais que o valor.");
    if (!recs.length) recs.push("Sua saúde financeira está sólida. O próximo passo é otimizar a carteira e o planejamento de longo prazo.");

    return { score, ...g2, dims, recs, r, g, d, res, inv };
  }, [renda, gastos, dividas, reserva, investe]);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());

  const handleUnlock = async () => {
    if (!emailValido) { toast.error("Informe um e-mail válido."); return; }
    setSubmitting(true);
    try {
      await supabase.from("health_score_leads" as any).insert({
        email: leadEmail.trim(), score: sim.score, grade: sim.grade,
        renda: sim.r, gastos: sim.g, dividas: sim.d, reserva: sim.res, investe: sim.inv,
      });
      setUnlocked(true);
      toast.success("Diagnóstico liberado!");
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { label: "Renda mensal", value: renda, set: setRenda },
    { label: "Gastos mensais", value: gastos, set: setGastos },
    { label: "Parcelas de dívidas/mês", value: dividas, set: setDividas },
    { label: "Reserva já guardada", value: reserva, set: setReserva },
    { label: "Quanto investe/mês", value: investe, set: setInveste },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <SEO
        title="Score de Saúde Financeira | Novare"
        description="Descubra sua nota de saúde financeira (0 a 100) em 1 minuto e receba um diagnóstico com os próximos passos."
      />

      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logoPreta} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs font-medium text-slate-500 hidden sm:block">Diagnóstico financeiro</span>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-novare-blue/10 text-novare-blue px-3 py-1 text-xs font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Score de Saúde Financeira
        </div>
        <h1 className="text-3xl sm:text-[2.6rem] leading-tight font-display font-bold text-novare-blue">
          Qual a nota da sua saúde financeira?
        </h1>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto">
          Responda 5 campos e receba sua nota de 0 a 100, com um diagnóstico de onde você está bem e o que precisa melhorar.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-center mb-6">Sua situação hoje</h2>

          <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
            {fields.map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                  <Input inputMode="numeric" className="h-11 pl-9" value={f.value}
                    onChange={(e) => f.set(e.target.value.replace(/[^\d.,]/g, ""))} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-4 flex gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
            "Parcelas de dívidas" é o que sai por mês com financiamentos, cartão e empréstimos. "Reserva" é o total que você já tem guardado para emergências.
          </p>

          <div className="flex justify-center mt-6">
            <Button onClick={() => setCalculated(true)}
              className="bg-novare-blue hover:bg-novare-blue/90 text-white font-bold px-10 h-12 text-base gap-2">
              Ver minha nota <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Resultado */}
          {calculated && (
            <div className="mt-8 pt-8 border-t border-slate-100 space-y-5 animate-fade-in">
              {/* Score ring */}
              <div className="flex flex-col items-center">
                <div className="relative h-44 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="74%" outerRadius="100%" data={[{ value: sim.score, fill: sim.color }]} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "#eef2f6" }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black tabular-nums" style={{ color: sim.color }}>{sim.score}</span>
                    <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">de 100</span>
                  </div>
                </div>
                <p className="mt-2 text-lg font-bold" style={{ color: sim.color }}>
                  Saúde {sim.label} · Nota {sim.grade}
                </p>
              </div>

              {/* Gate */}
              {!unlocked ? (
                <div className="rounded-2xl bg-novare-blue text-white p-6 sm:p-8 text-center">
                  <h3 className="text-xl font-bold">Receba seu diagnóstico completo</h3>
                  <p className="text-white/80 text-sm mt-2 max-w-md mx-auto">
                    Informe seu e-mail para ver a <strong className="text-white">análise dos 4 pilares</strong> e os próximos passos recomendados para a sua saúde financeira.
                  </p>
                  <div className="max-w-md mx-auto mt-5 space-y-3">
                    <Input type="email" placeholder="seuemail@exemplo.com" value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="h-12 bg-white text-slate-900 border-0 text-center" />
                    <Button onClick={handleUnlock} disabled={submitting || !emailValido}
                      className="w-full h-12 bg-novare-terracotta hover:bg-novare-terracotta/90 text-white font-bold">
                      {submitting ? "Liberando..." : "Ver diagnóstico"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/50 mt-4 max-w-md mx-auto leading-relaxed">
                    Ao informar seus dados, você concorda com a Política de Privacidade e aceita receber comunicações da Novare Consultoria de Investimentos.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  {/* Pilares */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <p className="text-sm font-bold text-slate-900">Seus 4 pilares</p>
                    {sim.dims.map((d) => {
                      const Icon = d.icon;
                      const color = d.value >= 70 ? "#059669" : d.value >= 40 ? "#d97706" : "#e11d48";
                      return (
                        <div key={d.key}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-2 font-medium text-slate-700"><Icon className="h-4 w-4 text-slate-400" /> {d.label}</span>
                            <span className="tabular-nums font-bold" style={{ color }}>{Math.round(d.value)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${d.value}%`, background: color }} />
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                            <span>{d.hint}</span><span>{d.ideal}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recomendações */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-bold text-slate-900 mb-2">Próximos passos</p>
                    <ul className="space-y-2">
                      {sim.recs.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-novare-blue shrink-0" /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Agendamento */}
                  <div className="rounded-2xl bg-novare-blue text-white p-6 text-center">
                    <p className="font-bold text-lg flex items-center justify-center gap-2"><CalendarCheck className="h-5 w-5" /> Agende um diagnóstico gratuito</p>
                    <p className="text-white/80 text-sm mt-1 max-w-md mx-auto">Um consultor Novare analisa sua situação em detalhe e monta um plano para elevar sua nota.</p>
                    <Button asChild className="mt-4 bg-white text-novare-blue hover:bg-white/90 font-bold">
                      <a href={`https://wa.me/5519983402827?text=Minha%20nota%20de%20sa%C3%BAde%20financeira%20foi%20${sim.score}.%20Quero%20agendar%20um%20diagn%C3%B3stico%20com%20a%20Novare`} target="_blank" rel="noopener noreferrer">
                        <CalendarCheck className="h-4 w-4 mr-1.5" /> Agendar pelo WhatsApp
                      </a>
                    </Button>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">Diagnóstico educacional baseado nos dados informados. Não é recomendação de investimento.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <NovareToolFooter intro="O diagnóstico é o primeiro passo. Fale com a Novare e construa um plano para elevar sua saúde financeira." />
    </div>
  );
}
