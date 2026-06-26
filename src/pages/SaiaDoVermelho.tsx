import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { SEO } from "@/components/SEO";
import { NovareToolFooter } from "@/components/NovareToolFooter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Plus, Trash2, TrendingDown, Snowflake, Mountain, Info } from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";

// ── Helpers ───────────────────────────────────────────────────────────────────
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlFull = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

interface DebtInput { id: number; nome: string; saldo: string; juros: string; parcela: string }
interface DebtNum { nome: string; saldo: number; juros: number; parcela: number }

interface SimResult {
  meses: number;
  totalJuros: number;
  primeiroQuitado: number | null; // mês em que a 1ª dívida zera
  naoQuita: boolean;
  serie: { mes: number; saldo: number }[];
}

const MAX_MONTHS = 600;

/** Simula a quitação mês a mês com rolagem das parcelas (debt rolling). */
function simulate(debts: DebtNum[], extra: number, strategy: "snowball" | "avalanche"): SimResult {
  const bal = debts.map((d) => ({ ...d }));
  const totalMin = debts.reduce((s, d) => s + d.parcela, 0);
  const budget = extra + totalMin;
  let meses = 0;
  let totalJuros = 0;
  let primeiroQuitado: number | null = null;
  const serie: { mes: number; saldo: number }[] = [
    { mes: 0, saldo: debts.reduce((s, d) => s + d.saldo, 0) },
  ];

  while (bal.some((d) => d.saldo > 0.01) && meses < MAX_MONTHS) {
    meses++;
    // 1. juros do mês
    bal.forEach((d) => {
      if (d.saldo > 0) { const j = d.saldo * d.juros; d.saldo += j; totalJuros += j; }
    });
    // 2. paga as parcelas mínimas dos ativos
    let remaining = budget;
    bal.forEach((d) => {
      if (d.saldo > 0) { const pay = Math.min(d.parcela, d.saldo, remaining); d.saldo -= pay; remaining -= pay; }
    });
    // 3. sobra (extra + parcelas liberadas) ataca o alvo conforme a estratégia
    const active = bal.filter((d) => d.saldo > 0);
    const sorted = strategy === "snowball"
      ? [...active].sort((a, b) => a.saldo - b.saldo)
      : [...active].sort((a, b) => b.juros - a.juros);
    for (const d of sorted) {
      if (remaining <= 0.01) break;
      const pay = Math.min(remaining, d.saldo);
      d.saldo -= pay; remaining -= pay;
    }
    // marca quando a 1ª dívida zera
    if (primeiroQuitado === null && bal.some((d) => d.saldo <= 0.01)) primeiroQuitado = meses;
    serie.push({ mes: meses, saldo: Math.max(0, bal.reduce((s, d) => s + d.saldo, 0)) });
  }
  return { meses, totalJuros, primeiroQuitado, naoQuita: meses >= MAX_MONTHS, serie };
}

const mesesLabel = (m: number) => {
  const anos = Math.floor(m / 12);
  const meses = m % 12;
  if (anos === 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  if (meses === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos}a ${meses}m`;
};

export default function SaiaDoVermelho() {
  const [debts, setDebts] = useState<DebtInput[]>([
    { id: 1, nome: "Cartão de crédito", saldo: "8000", juros: "12", parcela: "800" },
    { id: 2, nome: "Empréstimo pessoal", saldo: "15000", juros: "4", parcela: "600" },
    { id: 3, nome: "Cheque especial", saldo: "3000", juros: "8", parcela: "300" },
  ]);
  const [extra, setExtra] = useState("500");
  const [nextId, setNextId] = useState(4);

  const [calculated, setCalculated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const num = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

  const addDebt = () => {
    setDebts((p) => [...p, { id: nextId, nome: "", saldo: "", juros: "", parcela: "" }]);
    setNextId((n) => n + 1);
  };
  const removeDebt = (id: number) => setDebts((p) => p.filter((d) => d.id !== id));
  const updateDebt = (id: number, field: keyof DebtInput, v: string) =>
    setDebts((p) => p.map((d) => (d.id === id ? { ...d, [field]: v } : d)));

  const sim = useMemo(() => {
    const ds: DebtNum[] = debts
      .map((d) => ({ nome: d.nome || "Dívida", saldo: num(d.saldo), juros: num(d.juros) / 100, parcela: num(d.parcela) }))
      .filter((d) => d.saldo > 0);
    if (!ds.length) return null;
    const ex = num(extra);
    const avalanche = simulate(ds, ex, "avalanche");
    const snowball = simulate(ds, ex, "snowball");
    const totalDivida = ds.reduce((s, d) => s + d.saldo, 0);
    const economia = snowball.totalJuros - avalanche.totalJuros;
    // série combinada para o gráfico
    const maxLen = Math.max(avalanche.serie.length, snowball.serie.length);
    const serie = Array.from({ length: maxLen }, (_, m) => ({
      mes: m,
      Avalanche: avalanche.serie[m]?.saldo ?? 0,
      "Bola de neve": snowball.serie[m]?.saldo ?? 0,
    }));
    return { ds, ex, avalanche, snowball, totalDivida, economia, serie };
  }, [debts, extra]);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());

  const handleUnlock = async () => {
    if (!emailValido) { toast.error("Informe um e-mail válido."); return; }
    if (!sim) return;
    setSubmitting(true);
    try {
      await supabase.from("debt_leads" as any).insert({
        email: leadEmail.trim(),
        total_divida: Math.round(sim.totalDivida),
        num_dividas: sim.ds.length,
        extra_mensal: sim.ex,
        meses_avalanche: sim.avalanche.meses,
        juros_avalanche: Math.round(sim.avalanche.totalJuros),
        meses_snowball: sim.snowball.meses,
        juros_snowball: Math.round(sim.snowball.totalJuros),
      });
      setUnlocked(true);
      toast.success("Plano liberado!");
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <SEO
        title="Saia do Vermelho — Calculadora de Quitação de Dívidas | Novare"
        description="Descubra em quanto tempo você quita suas dívidas e quanto economiza usando a estratégia Avalanche ou Bola de Neve."
      />

      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logoPreta} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs font-medium text-slate-500 hidden sm:block">Quitação de dívidas</span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-novare-blue/10 text-novare-blue px-3 py-1 text-xs font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Saia do Vermelho
        </div>
        <h1 className="text-3xl sm:text-[2.6rem] leading-tight font-display font-bold text-novare-blue">
          Quite suas dívidas mais rápido
        </h1>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto">
          Liste suas dívidas e veja em quanto tempo você fica livre — e quanto economiza de juros — usando as estratégias <strong>Avalanche</strong> e <strong>Bola de Neve</strong>.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-center mb-6">Suas dívidas</h2>

          {/* Cabeçalho da lista (desktop) */}
          <div className="hidden sm:grid grid-cols-[1.4fr_1fr_0.8fr_1fr_auto] gap-2 px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Dívida</span><span>Saldo (R$)</span><span>Juros %a.m.</span><span>Parcela (R$)</span><span />
          </div>

          <div className="space-y-2">
            {debts.map((d) => (
              <div key={d.id} className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_0.8fr_1fr_auto] gap-2 items-center">
                <Input className="col-span-2 sm:col-span-1 h-10" placeholder="Nome da dívida" value={d.nome}
                  onChange={(e) => updateDebt(d.id, "nome", e.target.value)} />
                <Input inputMode="numeric" className="h-10" placeholder="Saldo" value={d.saldo}
                  onChange={(e) => updateDebt(d.id, "saldo", e.target.value.replace(/[^\d.,]/g, ""))} />
                <Input inputMode="numeric" className="h-10" placeholder="% a.m." value={d.juros}
                  onChange={(e) => updateDebt(d.id, "juros", e.target.value.replace(/[^\d.,]/g, ""))} />
                <Input inputMode="numeric" className="h-10" placeholder="Parcela" value={d.parcela}
                  onChange={(e) => updateDebt(d.id, "parcela", e.target.value.replace(/[^\d.,]/g, ""))} />
                <button onClick={() => removeDebt(d.id)} disabled={debts.length <= 1}
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30 transition-colors justify-self-end"
                  title="Remover">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button onClick={addDebt}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-novare-blue hover:underline">
            <Plus className="h-4 w-4" /> Adicionar dívida
          </button>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quanto a mais você consegue pagar por mês?</label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
              <Input inputMode="numeric" className="h-11 pl-9" value={extra}
                onChange={(e) => setExtra(e.target.value.replace(/[^\d.,]/g, ""))} />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
              Esse valor extra é somado às parcelas e direcionado para acelerar a quitação. Use os juros mensais reais de cada dívida (cartão costuma passar de 12% a.m.).
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <Button onClick={() => setCalculated(true)}
              className="bg-novare-blue hover:bg-novare-blue/90 text-white font-bold px-10 h-12 text-base gap-2">
              Calcular <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Resultado */}
          {calculated && sim && (
            <div className="mt-8 pt-8 border-t border-slate-100 space-y-5 animate-fade-in">
              {sim.avalanche.naoQuita ? (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 px-5 py-4 text-center text-sm">
                  Com esse valor as dívidas não se quitam (os juros superam o pagamento). Aumente o valor extra mensal ou renegocie os juros — um consultor Novare pode ajudar.
                </div>
              ) : (
                <>
                  {/* 3 cards (estratégia avalanche = a que economiza) */}
                  <div className="rounded-2xl bg-novare-blue-light/60 px-5 py-4 text-center text-sm text-slate-700">
                    Sua dívida total é de <strong className="text-novare-blue">{brl(sim.totalDivida)}</strong>. Pagando <strong className="text-novare-blue">{brl(sim.ex)}/mês a mais</strong>, veja o resultado:
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                      <p className="text-xs text-slate-500">Tempo para quitar</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{mesesLabel(sim.avalanche.meses)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">estratégia Avalanche</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                      <p className="text-xs text-slate-500">Total de juros</p>
                      <p className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">{brl(sim.avalanche.totalJuros)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">o que a dívida custa</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
                      <p className="text-xs text-slate-500">Economia c/ Avalanche</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">{brl(Math.max(0, sim.economia))}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">vs Bola de Neve</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
                    Simulação educacional. A <strong>Avalanche</strong> ataca primeiro a dívida de maior juro (paga menos juros no total); a <strong>Bola de Neve</strong> ataca a menor dívida (motiva por quitar rápido a primeira). Não é recomendação financeira.
                  </p>

                  {/* Gate */}
                  {!unlocked ? (
                    <div className="rounded-2xl bg-novare-blue text-white p-6 sm:p-8 text-center">
                      <h3 className="text-xl font-bold">Veja seu plano de quitação completo</h3>
                      <p className="text-white/80 text-sm mt-2 max-w-md mx-auto">
                        Informe seu e-mail para liberar a <strong className="text-white">comparação entre as estratégias</strong> e o gráfico da sua saída do vermelho.
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
                      {/* Comparação das estratégias */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <p className="font-bold text-slate-900 flex items-center gap-2"><Mountain className="h-4 w-4 text-novare-blue" /> Avalanche</p>
                          <p className="text-xs text-slate-500 mb-3">Ataca o maior juro primeiro · menos juros no total</p>
                          <dl className="space-y-1.5 text-sm">
                            <div className="flex justify-between"><dt className="text-slate-500">Tempo</dt><dd className="font-semibold">{mesesLabel(sim.avalanche.meses)}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Juros pagos</dt><dd className="font-semibold text-rose-600">{brl(sim.avalanche.totalJuros)}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">1ª dívida quitada</dt><dd className="font-semibold">{sim.avalanche.primeiroQuitado ? mesesLabel(sim.avalanche.primeiroQuitado) : "—"}</dd></div>
                          </dl>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <p className="font-bold text-slate-900 flex items-center gap-2"><Snowflake className="h-4 w-4 text-sky-500" /> Bola de Neve</p>
                          <p className="text-xs text-slate-500 mb-3">Ataca a menor dívida primeiro · mais motivação</p>
                          <dl className="space-y-1.5 text-sm">
                            <div className="flex justify-between"><dt className="text-slate-500">Tempo</dt><dd className="font-semibold">{mesesLabel(sim.snowball.meses)}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Juros pagos</dt><dd className="font-semibold text-rose-600">{brl(sim.snowball.totalJuros)}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">1ª dívida quitada</dt><dd className="font-semibold text-emerald-600">{sim.snowball.primeiroQuitado ? mesesLabel(sim.snowball.primeiroQuitado) : "—"}</dd></div>
                          </dl>
                        </div>
                      </div>

                      {sim.economia > 0 && (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 text-center text-sm">
                          A <strong>Avalanche</strong> economiza <strong>{brl(sim.economia)}</strong> em juros. A <strong>Bola de Neve</strong> quita a 1ª dívida mais cedo — boa se você precisa de motivação.
                        </div>
                      )}

                      {/* Gráfico */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-sm font-bold text-slate-900 mb-3">Evolução da dívida total</p>
                        <div className="h-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sim.serie} margin={{ left: -8, right: 8, top: 4 }}>
                              <defs>
                                <linearGradient id="gAva" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(215 50% 23%)" stopOpacity={0.25} />
                                  <stop offset="100%" stopColor="hsl(215 50% 23%)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                              <XAxis dataKey="mes" tickFormatter={(m) => `${m}m`} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} width={42} />
                              <RTooltip formatter={(v: number) => brlFull(v)} labelFormatter={(m) => `Mês ${m}`} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Area type="monotone" dataKey="Avalanche" stroke="hsl(215 50% 23%)" fill="url(#gAva)" strokeWidth={2.5} />
                              <Area type="monotone" dataKey="Bola de neve" stroke="#38bdf8" fill="none" strokeWidth={2} strokeDasharray="5 4" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="rounded-2xl bg-novare-terracotta text-white p-6 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-bold text-lg flex items-center gap-2"><TrendingDown className="h-5 w-5" /> Quer sair do vermelho com um plano?</p>
                          <p className="text-white/85 text-sm mt-0.5">A Novare ajuda a renegociar juros, organizar o orçamento e voltar a investir.</p>
                        </div>
                        <Button asChild variant="secondary" className="bg-white text-novare-terracotta hover:bg-white/90 font-bold">
                          <a href="https://wa.me/5519983402827?text=Quero%20ajuda%20para%20sair%20do%20vermelho%20com%20a%20Novare" target="_blank" rel="noopener noreferrer">
                            Falar com a Novare
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-14">
          <h2 className="text-xl font-bold text-center mb-6">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: "Qual a diferença entre Avalanche e Bola de Neve?", a: "Na Avalanche você quita primeiro a dívida de MAIOR juro — paga menos juros no total. Na Bola de Neve você quita primeiro a MENOR dívida — some uma conta rápido e dá motivação. As duas usam o mesmo valor mensal." },
              { q: "Como funciona a “rolagem”?", a: "Quando uma dívida é quitada, o valor que você pagava nela é redirecionado para a próxima dívida da fila. Por isso o ritmo acelera ao longo do tempo." },
              { q: "Onde acho o juro mensal das minhas dívidas?", a: "Na fatura do cartão, no contrato do empréstimo ou no extrato. O cartão de crédito rotativo costuma passar de 12% ao mês; cheque especial fica em torno de 8%." },
              { q: "Vale a pena pegar um empréstimo mais barato para quitar?", a: "Às vezes sim — trocar uma dívida de juro alto por uma de juro menor (portabilidade/consolidação) acelera a saída. Um consultor Novare pode avaliar seu caso." },
            ].map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border border-slate-200 rounded-xl px-4 bg-white">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-slate-500 leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <NovareToolFooter intro="Calcular é só o primeiro passo. Fale com a Novare e monte um plano real para sair do vermelho e voltar a investir." />
    </div>
  );
}
