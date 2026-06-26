import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketRates } from "@/hooks/useMarketRates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell,
} from "recharts";
import { SEO } from "@/components/SEO";
import { NovareToolFooter } from "@/components/NovareToolFooter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Plus, Trash2, Trophy, Scale, Info } from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";

// ── Tipos de investimento ─────────────────────────────────────────────────────
type Mode = "cdi" | "ipca" | "pre" | "dy";
interface TipoDef { label: string; mode: Mode; isento: boolean; rateLabel: string; def: string }

const TIPOS: Record<string, TipoDef> = {
  cdb:           { label: "CDB / LC / RDB",          mode: "cdi",  isento: false, rateLabel: "% do CDI",          def: "110" },
  lci:           { label: "LCI / LCA",               mode: "cdi",  isento: true,  rateLabel: "% do CDI",          def: "95" },
  tesouro_selic: { label: "Tesouro Selic",           mode: "cdi",  isento: false, rateLabel: "% do CDI",          def: "100" },
  tesouro_ipca:  { label: "Tesouro IPCA+",           mode: "ipca", isento: false, rateLabel: "IPCA + (% a.a.)",   def: "6" },
  tesouro_pre:   { label: "Tesouro Prefixado",       mode: "pre",  isento: false, rateLabel: "% a.a.",            def: "12" },
  debenture:     { label: "Debênture",               mode: "cdi",  isento: false, rateLabel: "% do CDI",          def: "115" },
  deb_inc:       { label: "Debênture Incentivada",   mode: "ipca", isento: true,  rateLabel: "IPCA + (% a.a.)",   def: "6.5" },
  fii:           { label: "FII (Fundo Imobiliário)", mode: "dy",   isento: true,  rateLabel: "Dividend Yield % a.a.", def: "9" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const aliquotaIR = (meses: number) => {
  const dias = meses * 30;
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.20;
  if (dias <= 720) return 0.175;
  return 0.15;
};
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pctStr = (n: number, d = 2) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;

interface OpcaoInput { id: number; tipo: string; taxa: string }
interface OpcaoResult {
  id: number; tipoLabel: string; isento: boolean; annual: number;
  bruto: number; rendimento: number; ir: number; liquido: number; liquidoAA: number; best?: boolean;
}

export default function ComparadorInvestimentos() {
  const { data: rates } = useMarketRates();
  const cdi = rates.selic / 100;
  const ipca = rates.ipca12 / 100;

  const [valor, setValor] = useState("10000");
  const [prazo, setPrazo] = useState("24");
  const [opcoes, setOpcoes] = useState<OpcaoInput[]>([
    { id: 1, tipo: "cdb", taxa: "110" },
    { id: 2, tipo: "lci", taxa: "95" },
    { id: 3, tipo: "tesouro_ipca", taxa: "6" },
  ]);
  const [nextId, setNextId] = useState(4);

  const [calculated, setCalculated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const num = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

  const addOpcao = () => { setOpcoes((p) => [...p, { id: nextId, tipo: "cdb", taxa: TIPOS.cdb.def }]); setNextId((n) => n + 1); };
  const removeOpcao = (id: number) => setOpcoes((p) => p.filter((o) => o.id !== id));
  const setTipo = (id: number, tipo: string) =>
    setOpcoes((p) => p.map((o) => (o.id === id ? { ...o, tipo, taxa: TIPOS[tipo].def } : o)));
  const setTaxa = (id: number, taxa: string) =>
    setOpcoes((p) => p.map((o) => (o.id === id ? { ...o, taxa } : o)));

  const annualForTipo = (tipo: string, taxa: number) => {
    const t = TIPOS[tipo]; const r = taxa / 100;
    switch (t.mode) {
      case "cdi": return cdi * r;
      case "ipca": return (1 + ipca) * (1 + r) - 1;
      case "pre": return r;
      case "dy": return r;
      default: return cdi * r;
    }
  };

  const sim = useMemo(() => {
    const v = num(valor);
    const n = Math.max(1, Math.round(num(prazo)));
    const aliq = aliquotaIR(n);
    const results: OpcaoResult[] = opcoes.map((o) => {
      const t = TIPOS[o.tipo];
      const annual = annualForTipo(o.tipo, num(o.taxa));
      const bruto = v * Math.pow(1 + annual, n / 12);
      const rendimento = bruto - v;
      const ir = t.isento ? 0 : rendimento * aliq;
      const liquido = bruto - ir;
      const liquidoAA = v > 0 ? (Math.pow(liquido / v, 12 / n) - 1) * 100 : 0;
      return { id: o.id, tipoLabel: `${t.label} · ${o.taxa}${t.mode === "cdi" ? "% CDI" : t.mode === "dy" ? "% DY" : t.mode === "ipca" ? "% +IPCA" : "% a.a."}`, isento: t.isento, annual, bruto, rendimento, ir, liquido, liquidoAA };
    });
    results.sort((a, b) => b.liquido - a.liquido);
    if (results.length) results[0].best = true;
    const melhor = results[0];
    const pior = results[results.length - 1];
    return { v, n, aliq, results, melhor, pior };
  }, [valor, prazo, opcoes, cdi, ipca]);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());

  const handleUnlock = async () => {
    if (!emailValido) { toast.error("Informe um e-mail válido."); return; }
    setSubmitting(true);
    try {
      await supabase.from("comparator_leads" as any).insert({
        email: leadEmail.trim(),
        valor: sim.v,
        prazo_meses: sim.n,
        num_opcoes: sim.results.length,
        melhor_tipo: sim.melhor?.tipoLabel ?? null,
        melhor_liquido_aa: sim.melhor ? Number(sim.melhor.liquidoAA.toFixed(2)) : null,
      });
      setUnlocked(true);
      toast.success("Comparação liberada!");
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <SEO
        title="Comparador de Investimentos | Novare"
        description="Compare CDB, LCI/LCA, Tesouro, Debêntures e FIIs lado a lado pela rentabilidade líquida — já com IR e isenções."
      />

      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logoPreta} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs font-medium text-slate-500 hidden sm:flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", rates.live ? "bg-emerald-500" : "bg-amber-400")} />
            CDI {pctStr(rates.selic, 1)} · IPCA {pctStr(rates.ipca12, 1)}
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-novare-blue/10 text-novare-blue px-3 py-1 text-xs font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Comparador
        </div>
        <h1 className="text-3xl sm:text-[2.6rem] leading-tight font-display font-bold text-novare-blue">
          Qual investimento rende mais no líquido?
        </h1>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto">
          Coloque as ofertas que você está avaliando — CDB, LCI, Tesouro, Debêntures, FIIs — e veja o ranking pela <strong>rentabilidade líquida</strong>, já descontando o Imposto de Renda.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-center mb-6">As opções que você está comparando</h2>

          {/* Valor + prazo */}
          <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor a investir</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                <Input inputMode="numeric" className="h-11 pl-9" value={valor}
                  onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prazo</label>
              <Select value={prazo} onValueChange={setPrazo}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["6","6 meses"],["12","1 ano"],["24","2 anos"],["36","3 anos"],["60","5 anos"],["120","10 anos"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista de opções */}
          <div className="hidden sm:grid grid-cols-[1.6fr_1fr_auto] gap-2 px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Tipo de investimento</span><span>Taxa</span><span />
          </div>
          <div className="space-y-2">
            {opcoes.map((o) => {
              const t = TIPOS[o.tipo];
              return (
                <div key={o.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_1fr_auto] gap-2 items-center">
                  <Select value={o.tipo} onValueChange={(v) => setTipo(o.id, v)}>
                    <SelectTrigger className="h-10 col-span-2 sm:col-span-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}{v.isento ? " (isento)" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Input inputMode="numeric" className="h-10 pr-12" value={o.taxa}
                      onChange={(e) => setTaxa(o.id, e.target.value.replace(/[^\d.,]/g, ""))} />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">{t.mode === "cdi" ? "%CDI" : t.mode === "dy" ? "%DY" : t.mode === "ipca" ? "+IPCA" : "%a.a."}</span>
                  </div>
                  <button onClick={() => removeOpcao(o.id)} disabled={opcoes.length <= 2}
                    className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30 transition-colors justify-self-end"
                    title="Remover">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <button onClick={addOpcao}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-novare-blue hover:underline">
            <Plus className="h-4 w-4" /> Adicionar opção
          </button>

          <p className="text-[11px] text-slate-400 mt-4 flex gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
            CDI atual {pctStr(rates.selic, 1)} a.a. e IPCA {pctStr(rates.ipca12, 1)} a.a. LCI/LCA, CRI/CRA, Debêntures incentivadas e FIIs são isentos de IR. FII é renda variável — usamos o dividend yield como referência.
          </p>

          <div className="flex justify-center mt-6">
            <Button onClick={() => setCalculated(true)}
              className="bg-novare-blue hover:bg-novare-blue/90 text-white font-bold px-10 h-12 text-base gap-2">
              Comparar <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Resultado */}
          {calculated && sim.melhor && (
            <div className="mt-8 pt-8 border-t border-slate-100 space-y-5 animate-fade-in">
              {/* Vencedor */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-center gap-1.5">
                  <Trophy className="h-4 w-4" /> Melhor opção
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1.5">{sim.melhor.tipoLabel}</p>
                <div className="flex items-center justify-center gap-6 mt-3">
                  <div>
                    <p className="text-2xl font-bold text-emerald-600 tabular-nums">{pctStr(sim.melhor.liquidoAA)}</p>
                    <p className="text-[11px] text-slate-500">líquido a.a.</p>
                  </div>
                  <div className="h-8 w-px bg-emerald-200" />
                  <div>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">{brl(sim.melhor.liquido)}</p>
                    <p className="text-[11px] text-slate-500">em {sim.n} meses</p>
                  </div>
                </div>
              </div>

              {/* Gate */}
              {!unlocked ? (
                <div className="rounded-2xl bg-novare-blue text-white p-6 sm:p-8 text-center">
                  <h3 className="text-xl font-bold">Veja o ranking completo</h3>
                  <p className="text-white/80 text-sm mt-2 max-w-md mx-auto">
                    Informe seu e-mail para liberar a <strong className="text-white">comparação das {sim.results.length} opções</strong> com bruto, IR e líquido de cada uma.
                  </p>
                  <div className="max-w-md mx-auto mt-5 space-y-3">
                    <Input type="email" placeholder="seuemail@exemplo.com" value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="h-12 bg-white text-slate-900 border-0 text-center" />
                    <Button onClick={handleUnlock} disabled={submitting || !emailValido}
                      className="w-full h-12 bg-novare-terracotta hover:bg-novare-terracotta/90 text-white font-bold">
                      {submitting ? "Liberando..." : "Ver ranking"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/50 mt-4 max-w-md mx-auto leading-relaxed">
                    Ao informar seus dados, você concorda com a Política de Privacidade e aceita receber comunicações da Novare Consultoria de Investimentos.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  {/* Tabela ranking */}
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 px-5 pt-5 flex items-center gap-2"><Scale className="h-4 w-4 text-novare-blue" /> Ranking por rentabilidade líquida</p>
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            <th className="text-left font-semibold px-5 py-2.5">Investimento</th>
                            <th className="text-right font-semibold px-3 py-2.5">Bruto</th>
                            <th className="text-right font-semibold px-3 py-2.5">IR</th>
                            <th className="text-right font-semibold px-3 py-2.5">Líquido</th>
                            <th className="text-right font-semibold px-5 py-2.5">Líq. a.a.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sim.results.map((r) => (
                            <tr key={r.id} className={cn("border-b border-slate-50 last:border-0", r.best && "bg-emerald-50/60")}>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800">{r.tipoLabel}</span>
                                  {r.best && <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Trophy className="h-2.5 w-2.5" /> Melhor</span>}
                                </div>
                                <span className="text-[11px] text-slate-400">{r.isento ? "isento de IR" : "tributado"}</span>
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-slate-600">{brl(r.bruto)}</td>
                              <td className="px-3 py-3 text-right tabular-nums text-rose-500">{r.ir > 0 ? `-${brl(r.ir)}` : "—"}</td>
                              <td className={cn("px-3 py-3 text-right tabular-nums font-bold", r.best ? "text-emerald-600" : "text-slate-900")}>{brl(r.liquido)}</td>
                              <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-700">{pctStr(r.liquidoAA)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {sim.pior && sim.melhor.liquido > sim.pior.liquido && (
                      <p className="text-[11px] text-slate-400 px-5 py-3 border-t border-slate-100">
                        A melhor opção rende <strong className="text-emerald-600">{brl(sim.melhor.liquido - sim.pior.liquido)}</strong> a mais que a pior em {sim.n} meses — só pela escolha certa.
                      </p>
                    )}
                  </div>

                  {/* Gráfico */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-bold text-slate-900 mb-3">Líquido por opção</p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sim.results.map((r) => ({ nome: r.tipoLabel.split(" · ")[0], Líquido: Math.round(r.liquido), best: r.best }))} margin={{ left: -6, right: 8, top: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                          <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-12} textAnchor="end" height={50} />
                          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} width={42} />
                          <RTooltip formatter={(v: number) => brl(v)} />
                          <Bar dataKey="Líquido" radius={[6, 6, 0, 0]}>
                            {sim.results.map((r, idx) => (
                              <Cell key={idx} fill={r.best ? "#16a34a" : "hsl(215 50% 23%)"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="rounded-2xl bg-novare-terracotta text-white p-6 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-bold text-lg">Quer a melhor carteira para o seu perfil?</p>
                      <p className="text-white/85 text-sm mt-0.5">A Novare seleciona os produtos certos, com o risco e os prazos adequados aos seus objetivos.</p>
                    </div>
                    <Button asChild variant="secondary" className="bg-white text-novare-terracotta hover:bg-white/90 font-bold">
                      <a href="https://wa.me/5519983402827?text=Quero%20comparar%20investimentos%20com%20a%20Novare" target="_blank" rel="noopener noreferrer">
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
              { q: "Por que comparar pelo líquido e não pela taxa?", a: "Porque um CDB de 115% do CDI tributado pode render menos no bolso que uma LCI de 95% isenta de IR. O que importa é quanto sobra depois do imposto — a rentabilidade líquida." },
              { q: "Como o IR é descontado?", a: "Pela tabela regressiva da renda fixa: 22,5% até 180 dias, 20% até 360, 17,5% até 720 e 15% acima. Produtos isentos (LCI, LCA, CRI, CRA, debênture incentivada, FII) não pagam IR sobre o rendimento." },
              { q: "FII entra na comparação como?", a: "FII é renda variável; aqui usamos o dividend yield informado como referência de rendimento isento. O preço da cota oscila, então o resultado real pode variar." },
              { q: "Os valores são garantia?", a: "Não. É uma simulação educacional com as taxas informadas. Rentabilidade passada não garante rentabilidade futura." },
            ].map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border border-slate-200 rounded-xl px-4 bg-white">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-slate-500 leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <NovareToolFooter intro="Comparar é só o primeiro passo. Fale com a Novare e monte uma carteira com os produtos certos para os seus objetivos." />
    </div>
  );
}
