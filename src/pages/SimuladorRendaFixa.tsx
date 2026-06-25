import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketRates } from "@/hooks/useMarketRates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TrendingUp, Lock, ShieldCheck, Calculator, ArrowRight, Sparkles, Info, MessageCircle,
} from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";

// ── Helpers financeiros ───────────────────────────────────────────────────────

const monthlyFromAnnual = (a: number) => Math.pow(1 + a, 1 / 12) - 1;

/** Valor futuro com aporte mensal no fim de cada período. */
const futureValue = (pv: number, pmt: number, i: number, n: number) => {
  if (i === 0) return pv + pmt * n;
  const f = Math.pow(1 + i, n);
  return pv * f + pmt * ((f - 1) / i);
};

/** Tabela regressiva do IR sobre renda fixa (com base no prazo em dias). */
const aliquotaIR = (meses: number) => {
  const dias = meses * 30;
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.20;
  if (dias <= 720) return 0.175;
  return 0.15;
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlFull = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const pctStr = (n: number, d = 2) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;

interface ProductResult {
  label: string;
  hint: string;
  isento: boolean;
  destaque?: boolean;
  bruto: number;
  rendimento: number;
  ir: number;
  liquido: number;
  annual: number;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SimuladorRendaFixa() {
  const { data: rates } = useMarketRates();
  const cdi = rates.selic / 100; // CDI ≈ Selic (proxy)

  // Inputs
  const [valorInicial, setValorInicial] = useState("10000");
  const [aporteMensal, setAporteMensal] = useState("1000");
  const [prazoMeses, setPrazoMeses] = useState("36");
  const [pctCDI, setPctCDI] = useState("110");

  // Gate de e-mail
  const [unlocked, setUnlocked] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadWhats, setLeadWhats] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const num = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

  // ── Cálculo ──────────────────────────────────────────────────────────────
  const sim = useMemo(() => {
    const pv = num(valorInicial);
    const pmt = num(aporteMensal);
    const n = Math.max(1, Math.round(num(prazoMeses)));
    const pct = num(pctCDI);
    const investido = pv + pmt * n;
    const aliq = aliquotaIR(n);

    // Poupança: regra atual (Selic > 8,5% a.a. → 0,5%/mês)
    const poupAnnual = cdi > 0.085 ? 0.0617 : cdi * 0.7;

    const build = (label: string, hint: string, annual: number, isento: boolean, destaque = false): ProductResult => {
      const i = monthlyFromAnnual(annual);
      const bruto = futureValue(pv, pmt, i, n);
      const rendimento = bruto - investido;
      const ir = isento ? 0 : rendimento * aliq;
      return { label, hint, isento, destaque, bruto, rendimento, ir, liquido: bruto - ir, annual };
    };

    const products: ProductResult[] = [
      build(`Seu CDB · ${pct}% do CDI`, "Tributado (IR regressivo)", cdi * (pct / 100), false, true),
      build("Tesouro Selic", "100% do CDI · tributado", cdi, false),
      build("LCI / LCA · 95% do CDI", "Isento de IR", cdi * 0.95, true),
      build("Poupança", "Isento · referência", poupAnnual, true),
    ];

    // Evolução mensal do investimento principal (para o gráfico)
    const main = products[0];
    const iMain = monthlyFromAnnual(main.annual);
    const serie = Array.from({ length: n + 1 }, (_, m) => ({
      mes: m,
      Investido: Math.round(pv + pmt * m),
      Bruto: Math.round(futureValue(pv, pmt, iMain, m)),
    }));

    return { pv, pmt, n, investido, aliq, products, main, serie };
  }, [valorInicial, aporteMensal, prazoMeses, pctCDI, cdi]);

  // ── Submissão do gate ──────────────────────────────────────────────────────
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());

  const handleUnlock = async () => {
    if (!emailValido) { toast.error("Informe um e-mail válido."); return; }
    setSubmitting(true);
    try {
      await supabase.from("simulator_leads" as any).insert({
        name: leadName.trim() || null,
        email: leadEmail.trim(),
        whatsapp: leadWhats.trim() || null,
        valor_inicial: sim.pv,
        aporte_mensal: sim.pmt,
        prazo_meses: sim.n,
        pct_cdi: num(pctCDI),
        tipo_principal: `CDB ${num(pctCDI)}% CDI`,
        resultado_liquido: Math.round(sim.main.liquido),
      });
      setUnlocked(true);
      setGateOpen(false);
      toast.success("Resultado liberado!");
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimular = () => {
    if (unlocked) return;
    setGateOpen(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <SEO
        title="Simulador de Renda Fixa | Novare"
        description="Compare CDB, Tesouro Selic, LCI/LCA e Poupança. Veja o rendimento líquido com IR regressivo e CDI atualizado."
      />

      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logoPreta} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs font-medium text-slate-500 hidden sm:flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", rates.live ? "bg-emerald-500" : "bg-amber-400")} />
            CDI {pctStr(rates.selic)} a.a.
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-novare-blue/10 text-novare-blue px-3 py-1 text-xs font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Simulador de Renda Fixa
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Quanto seu dinheiro <span className="text-novare-blue">realmente</span> rende?
        </h1>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto">
          Compare CDB, Tesouro Selic, LCI/LCA e Poupança lado a lado — com o imposto de renda já descontado e o CDI atualizado em tempo real.
        </p>
      </section>

      {/* Simulador */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* Inputs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Calculator className="h-5 w-5 text-novare-blue" /> Seus dados
            </div>

            {[
              { label: "Valor inicial", value: valorInicial, set: setValorInicial, prefix: "R$" },
              { label: "Aporte mensal", value: aporteMensal, set: setAporteMensal, prefix: "R$" },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{f.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{f.prefix}</span>
                  <Input inputMode="numeric" className="pl-9" value={f.value}
                    onChange={(e) => f.set(e.target.value.replace(/[^\d.,]/g, ""))} />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Prazo</label>
                <Select value={prazoMeses} onValueChange={setPrazoMeses}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["6","6 meses"],["12","1 ano"],["24","2 anos"],["36","3 anos"],["60","5 anos"],["120","10 anos"]].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">% do CDI</label>
                <div className="relative">
                  <Input inputMode="numeric" className="pr-7" value={pctCDI}
                    onChange={(e) => setPctCDI(e.target.value.replace(/[^\d.,]/g, ""))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed flex gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
              O % do CDI define o rendimento do seu CDB. Os demais produtos usam taxas de referência de mercado.
            </p>

            {!unlocked && (
              <Button onClick={handleSimular} className="w-full bg-novare-blue hover:bg-novare-blue/90 text-white font-bold gap-2 h-11">
                Simular agora <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Resultados */}
          <div className="relative">
            {/* Cards principais */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Valor bruto", value: sim.main.bruto, color: "text-slate-900" },
                { label: "Imposto de renda", value: -sim.main.ir, color: "text-rose-600", sub: `Alíquota ${pctStr(sim.aliq * 100, 1)}` },
                { label: "Valor líquido", value: sim.main.liquido, color: "text-emerald-600", highlight: true },
              ].map((c) => (
                <div key={c.label} className={cn(
                  "rounded-2xl border p-5",
                  c.highlight ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white",
                )}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
                  <p className={cn("text-2xl font-bold mt-1 tabular-nums", c.color)}>{brl(c.value)}</p>
                  {c.sub && <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>}
                </div>
              ))}
            </div>

            {/* Área com blur quando bloqueado */}
            <div className="relative mt-4">
              <div className={cn("space-y-4 transition-all", !unlocked && "blur-md pointer-events-none select-none")}>
                {/* Gráfico */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-bold text-slate-900 mb-3">Evolução do seu CDB</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sim.serie} margin={{ left: -10, right: 8, top: 4 }}>
                        <defs>
                          <linearGradient id="gBruto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--novare-blue, 217 91% 50%))" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(var(--novare-blue, 217 91% 50%))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                        <XAxis dataKey="mes" tickFormatter={(m) => `${m}m`} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} width={44} />
                        <RTooltip formatter={(v: number) => brlFull(v)} labelFormatter={(m) => `Mês ${m}`} />
                        <Area type="monotone" dataKey="Investido" stroke="#cbd5e1" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="Bruto" stroke="#1e5bb8" fill="url(#gBruto)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tabela comparativa */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 px-5 pt-5">Comparativo de produtos</p>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="text-left font-semibold px-5 py-2.5">Produto</th>
                          <th className="text-right font-semibold px-3 py-2.5">Bruto</th>
                          <th className="text-right font-semibold px-3 py-2.5">IR</th>
                          <th className="text-right font-semibold px-5 py-2.5">Líquido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sim.products.map((p) => (
                          <tr key={p.label} className={cn(
                            "border-b border-slate-50 last:border-0",
                            p.destaque && "bg-novare-blue/5",
                          )}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{p.label}</span>
                                {p.isento && <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Isento</span>}
                              </div>
                              <span className="text-[11px] text-slate-400">{p.hint}</span>
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-slate-600">{brl(p.bruto)}</td>
                            <td className="px-3 py-3 text-right tabular-nums text-rose-500">{p.ir > 0 ? `-${brl(p.ir)}` : "—"}</td>
                            <td className={cn("px-5 py-3 text-right tabular-nums font-bold", p.destaque ? "text-novare-blue" : "text-slate-900")}>{brl(p.liquido)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-400 px-5 py-3 border-t border-slate-100">
                    Total investido no período: <strong className="text-slate-600">{brl(sim.investido)}</strong> · CDI de referência: {pctStr(rates.selic)} a.a.
                  </p>
                </div>
              </div>

              {/* Overlay de bloqueio */}
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6 max-w-xs">
                    <div className="h-11 w-11 rounded-full bg-novare-blue/10 text-novare-blue flex items-center justify-center mx-auto mb-3">
                      <Lock className="h-5 w-5" />
                    </div>
                    <p className="font-bold text-slate-900">Veja a comparação completa</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Informe seu e-mail para liberar o gráfico e a tabela comparativa.</p>
                    <Button onClick={() => setGateOpen(true)} className="w-full bg-novare-blue hover:bg-novare-blue/90 text-white font-bold">
                      Liberar resultado
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* CTA consultor */}
            {unlocked && (
              <div className="mt-4 rounded-2xl bg-novare-blue text-white p-6 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Quer otimizar ainda mais?</p>
                  <p className="text-white/80 text-sm mt-0.5">Um consultor Novare pode montar uma carteira sob medida para os seus objetivos.</p>
                </div>
                <Button asChild variant="secondary" className="bg-white text-novare-blue hover:bg-white/90 font-bold gap-2">
                  <a href="https://wa.me/5519981829686?text=Quero%20uma%20an%C3%A1lise%20da%20Novare" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> Falar com a Novare
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="text-xl font-bold text-center mb-6">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: "Como o imposto de renda é calculado?", a: `Pela tabela regressiva: 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720 e 15% acima de 720 dias. Quanto mais tempo investido, menor o imposto. Na sua simulação a alíquota é de ${pctStr(sim.aliq * 100, 1)}.` },
              { q: "O que significa “% do CDI”?", a: "É quanto o investimento rende em relação ao CDI (taxa que acompanha de perto a Selic). Um CDB de 110% do CDI rende 110% dessa taxa. Hoje o CDI está em aproximadamente " + pctStr(rates.selic) + " ao ano." },
              { q: "Por que LCI/LCA e Poupança não pagam IR?", a: "São investimentos isentos de imposto de renda para pessoa física por lei. Por isso, mesmo com taxa nominal menor, podem render mais no líquido." },
              { q: "Os valores são uma garantia de rendimento?", a: "Não. A simulação é uma projeção educacional baseada nas taxas atuais. Rentabilidade passada não garante rentabilidade futura." },
            ].map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border border-slate-200 rounded-xl px-4 bg-white">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-slate-500 leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Simulação educacional · Novare Consultoria de Investimentos © {new Date().getFullYear()}
        </p>
      </footer>

      {/* Gate de e-mail (estilo Nomad) */}
      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-novare-blue" /> Quase lá!
            </DialogTitle>
            <DialogDescription>
              Informe seus dados para liberar a comparação completa e receber uma análise personalizada de um consultor Novare.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input placeholder="Seu nome" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
            <Input type="email" placeholder="seu@email.com *" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} />
            <Input placeholder="WhatsApp (opcional)" value={leadWhats} onChange={(e) => setLeadWhats(e.target.value)} />
            <Button onClick={handleUnlock} disabled={submitting || !emailValido}
              className="w-full bg-novare-blue hover:bg-novare-blue/90 text-white font-bold h-11">
              {submitting ? "Liberando..." : "Ver meu resultado"}
            </Button>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Ao informar seus dados, você concorda com a Política de Privacidade e aceita receber comunicações da Novare Consultoria de Investimentos.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
