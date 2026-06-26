import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketRates } from "@/hooks/useMarketRates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TrendingUp, ShieldCheck, ArrowRight, Lock, MessageCircle, Trophy, Mail, Phone, Globe } from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";
import logoBranca from "@/assets/logo-branca.png";
import jeffersonImg from "@/assets/jefferson.png";
import leonardoImg from "@/assets/leonardo.png";

// ── Produtos de renda fixa (isencao de IR + taxa de referencia em % do CDI) ──

interface Produto { id: string; label: string; isento: boolean; refCdi: number | null }

const PRODUTOS: Produto[] = [
  { id: "cdb",      label: "CDB / LC / RDB",            isento: false, refCdi: 1.00 },
  { id: "tesouro",  label: "Tesouro Direto",            isento: false, refCdi: 1.00 },
  { id: "lci",      label: "LCI / LCA (Isento)",        isento: true,  refCdi: 0.92 },
  { id: "cri",      label: "CRI / CRA (Isento)",        isento: true,  refCdi: 0.97 },
  { id: "deb",      label: "Debênture",                 isento: false, refCdi: 1.08 },
  { id: "deb_inc",  label: "Debênture Incentivada (Isento)", isento: true, refCdi: 1.05 },
  { id: "poupanca", label: "Poupança (Isento)",         isento: true,  refCdi: null },
];

const RENTAB = [
  { id: "prefixado", label: "Prefixado" },
  { id: "pos_cdi",   label: "Pós-fixado (% do CDI)" },
  { id: "ipca",      label: "IPCA+" },
  { id: "selic",     label: "Selic+" },
];

// Rótulo + valor padrão do campo de taxa, conforme o tipo de rentabilidade
const RATE_FIELD: Record<string, { label: string; def: string; suffix: string }> = {
  prefixado: { label: "Taxa Anual", def: "12", suffix: "% a.a." },
  pos_cdi:   { label: "% do CDI",   def: "100", suffix: "%" },
  ipca:      { label: "IPCA +",     def: "6",  suffix: "% a.a." },
  selic:     { label: "Selic +",    def: "2",  suffix: "% a.a." },
};

// ── Helpers financeiros ───────────────────────────────────────────────────────

const monthlyFromAnnual = (a: number) => Math.pow(1 + a, 1 / 12) - 1;

const futureValue = (pv: number, pmt: number, i: number, n: number) => {
  if (i === 0) return pv + pmt * n;
  const f = Math.pow(1 + i, n);
  return pv * f + pmt * ((f - 1) / i);
};

const aliquotaIR = (meses: number) => {
  const dias = meses * 30;
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.20;
  if (dias <= 720) return 0.175;
  return 0.15;
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const brl0 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pctStr = (n: number, d = 1) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;

interface Row {
  id: string; label: string; isento: boolean;
  annual: number; bruto: number; rendimento: number; ir: number; liquido: number; best?: boolean;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SimuladorRendaFixa() {
  const { data: rates } = useMarketRates();
  const cdi = rates.selic / 100;    // CDI ≈ Selic
  const ipca = rates.ipca12 / 100;
  const selic = rates.selic / 100;

  // Inputs
  const [produtoId, setProdutoId] = useState("cdb");
  const [tipo, setTipo] = useState("pos_cdi");
  const [valorInicial, setValorInicial] = useState("1000");
  const [aporteMensal, setAporteMensal] = useState("1000");
  const [taxa, setTaxa] = useState("100");
  const [prazoMeses, setPrazoMeses] = useState("12");

  // Fluxo
  const [simulated, setSimulated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // Gate de e-mail
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const num = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

  // Taxa anual efetiva conforme o tipo de rentabilidade
  const annualForTipo = (t: string, rate: number) => {
    const r = rate / 100;
    switch (t) {
      case "prefixado": return r;
      case "pos_cdi":   return cdi * r;
      case "ipca":      return (1 + ipca) * (1 + r) - 1;
      case "selic":     return selic + r;
      default:          return cdi;
    }
  };

  const poupAnnual = cdi > 0.085 ? 0.0617 : cdi * 0.7;

  // ── Cálculo ──────────────────────────────────────────────────────────────
  const sim = useMemo(() => {
    const pv = num(valorInicial);
    const pmt = num(aporteMensal);
    const n = Math.max(1, Math.round(num(prazoMeses)));
    const investido = pv + pmt * n;
    const aliq = aliquotaIR(n);
    const produto = PRODUTOS.find((p) => p.id === produtoId)!;

    const compute = (annual: number, isento: boolean) => {
      const i = monthlyFromAnnual(annual);
      const bruto = futureValue(pv, pmt, i, n);
      const rendimento = bruto - investido;
      const ir = isento ? 0 : rendimento * aliq;
      return { annual, bruto, rendimento, ir, liquido: bruto - ir };
    };

    // Resultado principal: produto + taxa escolhidos pelo usuario
    const mainAnnual = produtoId === "poupanca" ? poupAnnual : annualForTipo(tipo, num(taxa));
    const main = { id: produto.id, label: produto.label, isento: produto.isento, ...compute(mainAnnual, produto.isento) };

    // Retorno % no periodo (liquido)
    const retornoPeriodo = investido > 0 ? (main.liquido - investido) / investido * 100 : 0;

    // Comparativo entre todos os produtos (taxas de referencia)
    const rows: Row[] = PRODUTOS.map((p) => {
      const annual = p.id === produtoId
        ? mainAnnual
        : (p.refCdi != null ? cdi * p.refCdi : poupAnnual);
      return { id: p.id, label: p.label, isento: p.isento, ...compute(annual, p.isento) };
    });
    const bestLiquido = Math.max(...rows.map((r) => r.liquido));
    rows.forEach((r) => { r.best = r.liquido === bestLiquido; });
    const melhorAnnual = Math.max(...rows.map((r) => r.annual)) * 100;

    // Evolucao mensal do produto principal
    const iMain = monthlyFromAnnual(mainAnnual);
    const serie = Array.from({ length: n + 1 }, (_, m) => ({
      mes: m,
      Investido: Math.round(pv + pmt * m),
      Bruto: Math.round(futureValue(pv, pmt, iMain, m)),
    }));

    return { pv, pmt, n, investido, aliq, produto, main, retornoPeriodo, rows, melhorAnnual, serie };
  }, [valorInicial, aporteMensal, prazoMeses, taxa, tipo, produtoId, cdi, ipca, selic]);

  const onTipoChange = (t: string) => { setTipo(t); setTaxa(RATE_FIELD[t].def); };

  // ── Submissão do gate ──────────────────────────────────────────────────────
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());

  const handleUnlock = async () => {
    if (!emailValido) { toast.error("Informe um e-mail válido."); return; }
    setSubmitting(true);
    try {
      await supabase.from("simulator_leads" as any).insert({
        email: leadEmail.trim(),
        valor_inicial: sim.pv,
        aporte_mensal: sim.pmt,
        prazo_meses: sim.n,
        pct_cdi: num(taxa),
        tipo_principal: `${sim.produto.label} · ${RENTAB.find((r) => r.id === tipo)?.label}`,
        resultado_liquido: Math.round(sim.main.liquido),
      });
      setUnlocked(true);
      toast.success("Comparação liberada!");
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const rf = RATE_FIELD[tipo];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <SEO
        title="Calculadora de Investimentos em Renda Fixa | Novare"
        description="Compare CDB, Tesouro, LCI/LCA, CRI/CRA, Debêntures e Poupança. Veja o rendimento líquido com IR regressivo e CDI atualizado."
      />

      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logoPreta} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs font-medium text-slate-500 hidden sm:flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", rates.live ? "bg-emerald-500" : "bg-amber-400")} />
            CDI {pctStr(rates.selic)} a.a.
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <h1 className="text-3xl sm:text-[2.6rem] leading-tight font-display font-bold text-novare-blue">
          Calculadora de Investimentos
        </h1>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto">
          Calcule o retorno real dos seus investimentos em renda fixa. Compare CDB, LCI, Tesouro e outros ativos, já com o desconto automático do Imposto de Renda, e veja a projeção de crescimento do seu patrimônio com clareza.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        {/* Card do simulador */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-center mb-6">Simulador de Renda Fixa</h2>

          <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Investimento</label>
              <Select value={produtoId} onValueChange={setProdutoId}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUTOS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Rentabilidade</label>
              <Select value={tipo} onValueChange={onTipoChange} disabled={produtoId === "poupanca"}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RENTAB.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor Inicial (R$)</label>
              <Input inputMode="numeric" className="h-11" value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value.replace(/[^\d.,]/g, ""))} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Aporte Mensal (R$)</label>
              <Input inputMode="numeric" className="h-11" value={aporteMensal}
                onChange={(e) => setAporteMensal(e.target.value.replace(/[^\d.,]/g, ""))} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {rf.label}{produtoId === "poupanca" && " (regra da poupança)"}
              </label>
              <div className="relative">
                <Input inputMode="numeric" className="h-11 pr-14" value={taxa} disabled={produtoId === "poupanca"}
                  onChange={(e) => setTaxa(e.target.value.replace(/[^\d.,]/g, ""))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{rf.suffix}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prazo (Meses)</label>
              <Input inputMode="numeric" className="h-11" value={prazoMeses}
                onChange={(e) => setPrazoMeses(e.target.value.replace(/[^\d]/g, ""))} />
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Considerando CDI atual de {pctStr(rates.selic)} a.a. {rates.live ? "(atualizado em tempo real)" : "(valor de referência)"}.
          </p>

          <div className="flex justify-center mt-6">
            <Button onClick={() => setSimulated(true)}
              className="bg-novare-blue hover:bg-novare-blue/90 text-white font-bold px-10 h-12 text-base gap-2">
              Simular Investimento <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Resultado */}
          {simulated && (
            <div className="mt-8 pt-8 border-t border-slate-100 space-y-5 animate-fade-in">
              {/* Frase-resumo */}
              <div className="rounded-2xl bg-novare-blue-light/60 px-5 py-4 text-center text-sm text-slate-700">
                Ao investir <strong className="text-novare-blue">{brl0(sim.pv)}</strong> e aportes de{" "}
                <strong className="text-novare-blue">{brl0(sim.pmt)}</strong> em{" "}
                <strong className="text-novare-blue">{sim.produto.label}</strong> por{" "}
                <strong className="text-novare-blue">{sim.n} meses</strong>, você poderia acumular:
              </div>

              {/* 3 cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                  <p className="text-xs text-slate-500">Valor Bruto</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{brl(sim.main.bruto)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                  <p className="text-xs text-slate-500">Imposto de Renda</p>
                  <p className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">{sim.main.ir > 0 ? brl(sim.main.ir) : "Isento"}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{sim.main.isento ? "Isento de IR" : `Tributado · ${pctStr(sim.aliq * 100)}`}</p>
                </div>
                <div className="rounded-2xl border border-novare-blue/20 bg-novare-blue-light/50 p-5 text-center">
                  <p className="text-xs text-slate-500">Valor Líquido</p>
                  <p className="text-2xl font-bold text-novare-blue mt-1 tabular-nums">{brl(sim.main.liquido)}</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
                Os cálculos são estimativas baseadas nos dados preenchidos, mantidos constantes durante o período. O Imposto de Renda segue a tabela regressiva: 22,5% até 6 meses, 20% até 12, 17,5% até 24 e 15% acima de 24 meses.
              </p>

              {/* Gate de e-mail (libera comparacao) */}
              {!unlocked ? (
                <div className="rounded-2xl bg-novare-blue text-white p-6 sm:p-8 text-center">
                  <h3 className="text-xl font-bold flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-novare-terracotta" /> Qual investimento rende mais?
                  </h3>
                  <p className="text-white/80 text-sm mt-2 max-w-md mx-auto">
                    Sua simulação rendeu <strong className="text-white">{pctStr(sim.retornoPeriodo, 2)}</strong> no período.
                    Informe seu e-mail e descubra os investimentos que podem render até <strong className="text-white">{pctStr(sim.melhorAnnual)} ao ano</strong>.
                  </p>
                  <div className="max-w-md mx-auto mt-5 space-y-3">
                    <Input type="email" placeholder="seuemail@exemplo.com" value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="h-12 bg-white text-slate-900 border-0 text-center" />
                    <Button onClick={handleUnlock} disabled={submitting || !emailValido}
                      className="w-full h-12 bg-novare-terracotta hover:bg-novare-terracotta/90 text-white font-bold">
                      {submitting ? "Liberando..." : "Comparar investimentos"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/50 mt-4 max-w-md mx-auto leading-relaxed">
                    Ao informar seus dados, você concorda com a Política de Privacidade e aceita receber comunicações da Novare Consultoria de Investimentos.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  {/* Tabela comparativa */}
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 px-5 pt-5">Comparativo de produtos · líquido em {sim.n} meses</p>
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
                          {[...sim.rows].sort((a, b) => b.liquido - a.liquido).map((r) => (
                            <tr key={r.id} className={cn("border-b border-slate-50 last:border-0", r.best && "bg-novare-blue/5")}>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800">{r.label}</span>
                                  {r.best && <span className="text-[9px] font-bold uppercase bg-novare-terracotta/15 text-novare-terracotta px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Trophy className="h-2.5 w-2.5" /> Melhor</span>}
                                </div>
                                <span className="text-[11px] text-slate-400">{pctStr(r.annual * 100)} a.a. · {r.isento ? "isento" : "tributado"}</span>
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-slate-600">{brl0(r.bruto)}</td>
                              <td className="px-3 py-3 text-right tabular-nums text-rose-500">{r.ir > 0 ? `-${brl0(r.ir)}` : "—"}</td>
                              <td className={cn("px-5 py-3 text-right tabular-nums font-bold", r.best ? "text-novare-blue" : "text-slate-900")}>{brl0(r.liquido)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-slate-400 px-5 py-3 border-t border-slate-100">
                      Total investido: <strong className="text-slate-600">{brl0(sim.investido)}</strong> · taxas de referência de mercado sobre o CDI de {pctStr(rates.selic)} a.a.
                    </p>
                  </div>

                  {/* Gráfico */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-bold text-slate-900 mb-3">Evolução do patrimônio · {sim.produto.label}</p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sim.serie} margin={{ left: -8, right: 8, top: 4 }}>
                          <defs>
                            <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(215 50% 23%)" stopOpacity={0.28} />
                              <stop offset="100%" stopColor="hsl(215 50% 23%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                          <XAxis dataKey="mes" tickFormatter={(m) => `${m}m`} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} width={42} />
                          <RTooltip formatter={(v: number) => brl(v)} labelFormatter={(m) => `Mês ${m}`} />
                          <Area type="monotone" dataKey="Investido" stroke="#cbd5e1" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                          <Area type="monotone" dataKey="Bruto" stroke="hsl(215 50% 23%)" fill="url(#gB)" strokeWidth={2.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CTA Novare */}
                  <div className="rounded-2xl bg-novare-terracotta text-white p-6 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-bold text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Quer rentabilizar ainda mais?</p>
                      <p className="text-white/85 text-sm mt-0.5">Um consultor Novare monta uma carteira sob medida para os seus objetivos.</p>
                    </div>
                    <Button asChild variant="secondary" className="bg-white text-novare-terracotta hover:bg-white/90 font-bold gap-2">
                      <a href="https://wa.me/5519983402827?text=Quero%20uma%20an%C3%A1lise%20da%20Novare" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" /> Falar com a Novare
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
              { q: "Como o imposto de renda é calculado?", a: `Pela tabela regressiva: 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720 e 15% acima de 720 dias. Quanto mais tempo investido, menor o imposto.` },
              { q: "Quais investimentos são isentos de IR?", a: "LCI, LCA, CRI, CRA, Debêntures Incentivadas e Poupança são isentos de imposto de renda para pessoa física. Por isso, mesmo com taxa nominal menor, costumam render mais no líquido." },
              { q: "O que significa “% do CDI”?", a: "É quanto o investimento rende em relação ao CDI (taxa que acompanha de perto a Selic). Um CDB de 110% do CDI rende 110% dessa taxa. Hoje o CDI está em aproximadamente " + pctStr(rates.selic) + " ao ano." },
              { q: "Os valores são garantia de rendimento?", a: "Não. A simulação é uma projeção educacional baseada nas taxas atuais. Rentabilidade passada não garante rentabilidade futura." },
            ].map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border border-slate-200 rounded-xl px-4 bg-white">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-slate-500 leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Banner CTA — sócios-fundadores da Novare */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-novare-blue shadow-sm">
          {/* brilho sutil */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-novare-blue-bright/20 blur-3xl pointer-events-none" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center p-8 sm:p-10">
            {/* Texto */}
            <div>
              <p className="text-novare-blue-bright text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Novare Wealth · Consultoria de Investimentos</p>
              <h2 className="text-2xl sm:text-[2rem] font-display font-bold text-white leading-tight">
                Construindo seu futuro financeiro com clareza e propósito
              </h2>
              <p className="text-white/80 mt-3 text-sm sm:text-base leading-relaxed">
                Simular é só o primeiro passo. Fale diretamente com os sócios-fundadores e receba uma análise personalizada para os seus objetivos de vida.
              </p>
              <Button asChild className="mt-6 bg-white text-novare-blue hover:bg-white/90 font-bold gap-2 h-12 px-7">
                <a href="https://wa.me/5519983402827?text=Quero%20uma%20an%C3%A1lise%20da%20Novare" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Falar com a Novare
                </a>
              </Button>
            </div>

            {/* Fotos dos fundadores */}
            <div className="flex items-end justify-center md:justify-end gap-5 sm:gap-6">
              {[
                { img: jeffersonImg, name: "Jefferson Freitas", role: "Sócio-fundador · CEA" },
                { img: leonardoImg, name: "Leonardo Oliveira", role: "Sócio-fundador · CEA" },
              ].map((f) => (
                <figure key={f.name} className="text-center">
                  <img
                    src={f.img}
                    alt={f.name}
                    className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover ring-2 ring-white/25 shadow-lg"
                    loading="lazy"
                  />
                  <figcaption className="mt-2.5">
                    <p className="text-white font-bold text-[13px] leading-tight">{f.name}</p>
                    <p className="text-white/55 text-[10px] uppercase tracking-wide mt-0.5">{f.role}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer profissional */}
      <footer className="bg-novare-blue text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Marca */}
            <div>
              <img src={logoBranca} alt="Novare" className="h-8 w-auto" />
              <p className="text-sm text-white/60 mt-4 leading-relaxed">
                Consultoria de investimentos independente. Planejamento financeiro, alocação e acompanhamento contínuo para os seus objetivos de vida.
              </p>
            </div>

            {/* Ferramentas */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Ferramentas</h4>
              <ul className="space-y-2 text-sm text-white/75">
                <li><a href="/ferramentas/simulador-de-renda-fixa" className="hover:text-white transition-colors">Simulador de Renda Fixa</a></li>
                <li><a href="/ferramentas/calculadora-de-investimentos" className="hover:text-white transition-colors">Calculadora de Investimentos</a></li>
                <li><a href="/objetivos-de-vida" className="hover:text-white transition-colors">Objetivos de Vida</a></li>
              </ul>
            </div>

            {/* Institucional */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Institucional</h4>
              <ul className="space-y-2 text-sm text-white/75">
                <li><a href="/termos" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</a></li>
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Fale com a gente</h4>
              <ul className="space-y-2.5 text-sm text-white/75">
                <li><a href="https://wa.me/5519983402827" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors"><Phone className="h-4 w-4 shrink-0" /> (19) 98340-2827</a></li>
                <li><a href="mailto:contato@novareapp.com.br" className="flex items-center gap-2 hover:text-white transition-colors"><Mail className="h-4 w-4 shrink-0" /> contato@novareapp.com.br</a></li>
                <li><a href="https://novareapp.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors"><Globe className="h-4 w-4 shrink-0" /> novareapp.com.br</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-white/50">© {new Date().getFullYear()} Novare Consultoria de Investimentos. Todos os direitos reservados.</p>
            <p className="text-[11px] text-white/45 flex items-start gap-1.5 max-w-md sm:text-right leading-relaxed">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px" />
              Conteúdo educacional. Não constitui recomendação ou oferta de investimento. Rentabilidade passada não garante resultados futuros.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
