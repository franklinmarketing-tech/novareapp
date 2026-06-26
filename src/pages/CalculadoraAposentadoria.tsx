import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketRates } from "@/hooks/useMarketRates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { SEO } from "@/components/SEO";
import { NovareToolFooter } from "@/components/NovareToolFooter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Sparkles, ArrowRight, PartyPopper, TrendingUp, Info } from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";

// ── Helpers ───────────────────────────────────────────────────────────────────
const monthlyFromAnnual = (a: number) => Math.pow(1 + a, 1 / 12) - 1;
const futureValue = (pv: number, pmt: number, i: number, n: number) => {
  if (i === 0) return pv + pmt * n;
  const f = Math.pow(1 + i, n);
  return pv * f + pmt * ((f - 1) / i);
};
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pctStr = (n: number, d = 1) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;

const SWR = 4; // taxa de retirada segura (regra dos 4%)

export default function CalculadoraAposentadoria() {
  const { data: rates } = useMarketRates();

  // Inputs
  const [idadeAtual, setIdadeAtual] = useState("35");
  const [idadeApos, setIdadeApos] = useState("60");
  const [rendaDesejada, setRendaDesejada] = useState("8000");
  const [patrimonioAtual, setPatrimonioAtual] = useState("50000");
  const [aporteMensal, setAporteMensal] = useState("2000");
  const [rentReal, setRentReal] = useState("5");

  // Fluxo
  const [calculated, setCalculated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const num = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

  const sim = useMemo(() => {
    const ageNow = Math.max(18, Math.round(num(idadeAtual)));
    const ageRet = Math.max(ageNow + 1, Math.round(num(idadeApos)));
    const renda = num(rendaDesejada);
    const pv = num(patrimonioAtual);
    const pmt = num(aporteMensal);
    const real = num(rentReal) / 100;

    const anos = ageRet - ageNow;
    const n = anos * 12;
    const i = monthlyFromAnnual(real);

    const patrimonioProjetado = futureValue(pv, pmt, i, n);
    const fireNumber = renda > 0 ? (renda * 12) / (SWR / 100) : 0;
    const rendaProjetada = patrimonioProjetado * (SWR / 100) / 12;
    const totalInvestido = pv + pmt * n;
    const percentMeta = fireNumber > 0 ? Math.min(100, (patrimonioProjetado / fireNumber) * 100) : 0;
    const atingiu = patrimonioProjetado >= fireNumber && fireNumber > 0;

    // Idade em que o patrimônio cruza o número da independência
    let idadeIndep: number | null = null;
    if (fireNumber > 0) {
      const maxMonths = (95 - ageNow) * 12;
      for (let m = 0; m <= maxMonths; m++) {
        if (futureValue(pv, pmt, i, m) >= fireNumber) { idadeIndep = Math.round(ageNow + m / 12); break; }
      }
    }

    // Aporte necessário para atingir o número exatamente no prazo desejado
    const aporteNecessario = n > 0
      ? (i === 0 ? (fireNumber - pv) / n : (fireNumber - pv * Math.pow(1 + i, n)) * i / (Math.pow(1 + i, n) - 1))
      : 0;
    const aporteFaltante = Math.max(0, aporteNecessario - pmt);

    // Série anual para o gráfico
    const serie = Array.from({ length: anos + 1 }, (_, y) => ({
      idade: ageNow + y,
      Patrimônio: Math.round(futureValue(pv, pmt, i, y * 12)),
    }));

    return {
      ageNow, ageRet, renda, pv, pmt, anos, fireNumber, patrimonioProjetado,
      rendaProjetada, totalInvestido, percentMeta, atingiu, idadeIndep, aporteNecessario, aporteFaltante, serie,
    };
  }, [idadeAtual, idadeApos, rendaDesejada, patrimonioAtual, aporteMensal, rentReal]);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());

  const handleUnlock = async () => {
    if (!emailValido) { toast.error("Informe um e-mail válido."); return; }
    setSubmitting(true);
    try {
      await supabase.from("retirement_leads" as any).insert({
        email: leadEmail.trim(),
        idade_atual: sim.ageNow,
        idade_aposentadoria: sim.ageRet,
        renda_desejada: sim.renda,
        patrimonio_atual: sim.pv,
        aporte_mensal: sim.pmt,
        rentabilidade_real: num(rentReal),
        fire_number: Math.round(sim.fireNumber),
        patrimonio_projetado: Math.round(sim.patrimonioProjetado),
        idade_independencia: sim.idadeIndep,
      });
      setUnlocked(true);
      toast.success("Plano liberado!");
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const fields: { label: string; value: string; set: (v: string) => void; prefix?: string; suffix?: string }[] = [
    { label: "Sua idade hoje", value: idadeAtual, set: setIdadeAtual, suffix: "anos" },
    { label: "Quero me aposentar aos", value: idadeApos, set: setIdadeApos, suffix: "anos" },
    { label: "Renda mensal desejada (hoje)", value: rendaDesejada, set: setRendaDesejada, prefix: "R$" },
    { label: "Quanto já tem investido", value: patrimonioAtual, set: setPatrimonioAtual, prefix: "R$" },
    { label: "Quanto consegue aportar/mês", value: aporteMensal, set: setAporteMensal, prefix: "R$" },
    { label: "Rentabilidade real esperada", value: rentReal, set: setRentReal, suffix: "% a.a." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <SEO
        title="Calculadora de Aposentadoria e Independência Financeira | Novare"
        description="Descubra quanto você precisa juntar para se aposentar ou viver de renda, e em que idade alcança a independência financeira."
      />

      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logoPreta} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs font-medium text-slate-500 hidden sm:flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", rates.live ? "bg-emerald-500" : "bg-amber-400")} />
            Juros real ~{pctStr(rates.jurosReal)} a.a.
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-novare-blue/10 text-novare-blue px-3 py-1 text-xs font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Independência Financeira
        </div>
        <h1 className="text-3xl sm:text-[2.6rem] leading-tight font-display font-bold text-novare-blue">
          Quando você poderá viver de renda?
        </h1>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto">
          Descubra quanto patrimônio você precisa juntar para se aposentar com tranquilidade — e em que idade alcança a independência financeira no seu ritmo atual.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-center mb-6">Sua aposentadoria</h2>

          <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
            {fields.map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                <div className="relative">
                  {f.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{f.prefix}</span>}
                  <Input
                    inputMode="numeric"
                    className={cn("h-11", f.prefix && "pl-9", f.suffix && "pr-16")}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value.replace(/[^\d.,]/g, ""))}
                  />
                  {f.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{f.suffix}</span>}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-4 flex gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
            Cálculo em valores de hoje (poder de compra). A "rentabilidade real" é o ganho acima da inflação — o juros real do Tesouro hoje está em ~{pctStr(rates.jurosReal)} a.a.; para o longo prazo, usar 4% a 6% é prudente.
          </p>

          <div className="flex justify-center mt-6">
            <Button onClick={() => setCalculated(true)}
              className="bg-novare-blue hover:bg-novare-blue/90 text-white font-bold px-10 h-12 text-base gap-2">
              Calcular <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Resultado */}
          {calculated && (
            <div className="mt-8 pt-8 border-t border-slate-100 space-y-5 animate-fade-in">
              {/* 3 cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                  <p className="text-xs text-slate-500">Você vai precisar de</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{brl(sim.fireNumber)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">para viver de renda</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                  <p className="text-xs text-slate-500">Seu patrimônio aos {sim.ageRet}</p>
                  <p className={cn("text-2xl font-bold mt-1 tabular-nums", sim.atingiu ? "text-emerald-600" : "text-slate-900")}>{brl(sim.patrimonioProjetado)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{pctStr(sim.percentMeta, 0)} da meta</p>
                </div>
                <div className="rounded-2xl border border-novare-blue/20 bg-novare-blue-light/50 p-5 text-center">
                  <p className="text-xs text-slate-500">Renda passiva/mês</p>
                  <p className="text-2xl font-bold text-novare-blue mt-1 tabular-nums">{brl(sim.rendaProjetada)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">com seu patrimônio projetado</p>
                </div>
              </div>

              {/* Status */}
              <div className={cn(
                "rounded-2xl px-5 py-4 text-center text-sm",
                sim.atingiu ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200",
              )}>
                {sim.atingiu ? (
                  <span className="flex items-center justify-center gap-2 font-medium">
                    <PartyPopper className="h-4 w-4" />
                    Parabéns! No seu ritmo atual você atinge a independência financeira por volta dos <strong>{sim.idadeIndep ?? sim.ageRet} anos</strong>.
                  </span>
                ) : (
                  <span>
                    Faltam <strong>{brl(Math.max(0, sim.fireNumber - sim.patrimonioProjetado))}</strong> para a sua meta aos {sim.ageRet}.
                    Aumentando o aporte para <strong>{brl(sim.aporteNecessario)}/mês</strong> (+{brl(sim.aporteFaltante)}) você chega lá.
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
                Estimativa educacional baseada na <strong>regra dos 4%</strong> (taxa de retirada segura) e em valores de hoje. Não considera INSS/previdência pública nem impostos. Não é recomendação de investimento.
              </p>

              {/* Gate / desbloqueio */}
              {!unlocked ? (
                <div className="rounded-2xl bg-novare-blue text-white p-6 sm:p-8 text-center">
                  <h3 className="text-xl font-bold">Veja seu plano completo</h3>
                  <p className="text-white/80 text-sm mt-2 max-w-md mx-auto">
                    Informe seu e-mail para liberar o <strong className="text-white">gráfico da sua jornada</strong> até a independência e o passo a passo para chegar lá.
                  </p>
                  <div className="max-w-md mx-auto mt-5 space-y-3">
                    <Input type="email" placeholder="seuemail@exemplo.com" value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="h-12 bg-white text-slate-900 border-0 text-center" />
                    <Button onClick={handleUnlock} disabled={submitting || !emailValido}
                      className="w-full h-12 bg-novare-terracotta hover:bg-novare-terracotta/90 text-white font-bold">
                      {submitting ? "Liberando..." : "Ver meu plano"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/50 mt-4 max-w-md mx-auto leading-relaxed">
                    Ao informar seus dados, você concorda com a Política de Privacidade e aceita receber comunicações da Novare Consultoria de Investimentos.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  {/* Gráfico da jornada */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-bold text-slate-900 mb-3">Sua jornada até a independência</p>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sim.serie} margin={{ left: -8, right: 8, top: 8 }}>
                          <defs>
                            <linearGradient id="gPat" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(215 50% 23%)" stopOpacity={0.28} />
                              <stop offset="100%" stopColor="hsl(215 50% 23%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                          <XAxis dataKey="idade" tickFormatter={(a) => `${a}`} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                          <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: "#94a3b8" }} width={42} />
                          <RTooltip formatter={(v: number) => brl(v)} labelFormatter={(a) => `${a} anos`} />
                          {sim.fireNumber > 0 && (
                            <ReferenceLine y={sim.fireNumber} stroke="#16a34a" strokeDasharray="5 4"
                              label={{ value: "Meta", position: "insideTopRight", fill: "#16a34a", fontSize: 11 }} />
                          )}
                          <Area type="monotone" dataKey="Patrimônio" stroke="hsl(215 50% 23%)" fill="url(#gPat)" strokeWidth={2.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Linha verde = patrimônio necessário ({brl(sim.fireNumber)}). Total que você terá aportado até lá: {brl(sim.totalInvestido)}.
                    </p>
                  </div>

                  {/* Como chegar lá */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                    <p className="text-sm font-bold text-slate-900">Como chegar lá</p>
                    <div className="grid sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-500">Seu aporte atual</p>
                        <p className="font-bold text-slate-900 tabular-nums">{brl(sim.pm)}/mês</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-500">Aporte ideal p/ meta no prazo</p>
                        <p className="font-bold text-slate-900 tabular-nums">{brl(sim.aporteNecessario)}/mês</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-500">Renda passiva projetada</p>
                        <p className="font-bold text-emerald-600 tabular-nums">{brl(sim.rendaProjetada)}/mês</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Um consultor Novare pode montar a estratégia de investimentos para você atingir esse patrimônio com o risco adequado ao seu perfil — e ainda otimizar impostos no caminho.
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="rounded-2xl bg-novare-terracotta text-white p-6 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-bold text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Quer antecipar sua aposentadoria?</p>
                      <p className="text-white/85 text-sm mt-0.5">Fale com a Novare e construa um plano sob medida para a sua independência financeira.</p>
                    </div>
                    <Button asChild variant="secondary" className="bg-white text-novare-terracotta hover:bg-white/90 font-bold">
                      <a href="https://wa.me/5519983402827?text=Quero%20planejar%20minha%20aposentadoria%20com%20a%20Novare" target="_blank" rel="noopener noreferrer">
                        Falar com a Novare
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-14">
          <h2 className="text-xl font-bold text-center mb-6">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: "O que é a “regra dos 4%”?", a: "É a taxa de retirada segura: estudos mostram que retirar cerca de 4% do patrimônio por ano (corrigido pela inflação) permite viver de renda sem esgotar o capital no longo prazo. Por isso o patrimônio necessário é a renda anual desejada dividida por 4%." },
              { q: "O que é rentabilidade real?", a: "É o ganho acima da inflação. Como a calculadora trabalha em valores de hoje, usamos a rentabilidade real para manter tudo no mesmo poder de compra. Hoje o juros real do Tesouro IPCA+ está em torno de " + pctStr(rates.jurosReal) + " ao ano." },
              { q: "A calculadora considera o INSS?", a: "Não. O resultado é o patrimônio que você mesmo precisa acumular. Qualquer renda do INSS ou de previdência pública é um complemento que reduz o valor necessário." },
              { q: "Os valores são garantia?", a: "Não. É uma projeção educacional baseada nas premissas informadas. Rentabilidade passada não garante rentabilidade futura." },
            ].map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border border-slate-200 rounded-xl px-4 bg-white">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-slate-500 leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <NovareToolFooter intro="Calcular é só o primeiro passo. Fale diretamente com os sócios-fundadores e construa um plano real para a sua aposentadoria." />
    </div>
  );
}
