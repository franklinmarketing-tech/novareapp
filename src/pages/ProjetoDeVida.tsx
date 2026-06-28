import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketRates } from "@/hooks/useMarketRates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { SEO } from "@/components/SEO";
import { NovareToolFooter } from "@/components/NovareToolFooter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { computeLifePlan, type Goal, type GoalType } from "@/lib/lifeplan";
import {
  Sparkles, ArrowRight, Plus, Trash2, Plane, Home, Car, GraduationCap, Gift, Star,
  CalendarClock, TrendingUp, PiggyBank, CheckCircle2, AlertTriangle, Shield, Wallet,
} from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pctStr = (n: number, d = 2) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;

const TIPOS: { id: GoalType; label: string; icon: any }[] = [
  { id: "viagens", label: "Viagens (por ano)", icon: Plane },
  { id: "imovel", label: "Imóvel", icon: Home },
  { id: "carro", label: "Carro (troca)", icon: Car },
  { id: "educacao", label: "Educação", icon: GraduationCap },
  { id: "festas", label: "Festas & Presentes (por ano)", icon: Gift },
  { id: "outro", label: "Outro sonho", icon: Star },
];
const tipoMeta = (t: GoalType) => TIPOS.find((x) => x.id === t)!;

export default function ProjetoDeVida() {
  const { data: rates } = useMarketRates();
  const anoAtual = new Date().getFullYear();

  // Dados
  const [idadeAtual, setIdadeAtual] = useState("35");
  const [idadeApos, setIdadeApos] = useState("60");
  const [idadeFim, setIdadeFim] = useState("85");
  const [renda, setRenda] = useState("15000");
  const [custo, setCusto] = useState("9000");
  const [patrimonio, setPatrimonio] = useState("80000");
  const [rentReal, setRentReal] = useState("4");
  const [rendaApos, setRendaApos] = useState("10000");
  const [inss, setInss] = useState("2000");

  const [goals, setGoals] = useState<Goal[]>([
    { id: 1, tipo: "viagens", valor: 12000 },
    { id: 2, tipo: "imovel", valor: 600000, ano: anoAtual + 10, financiar: true, entradaPct: 30, prazoAnos: 25, jurosAa: 10 },
    { id: 3, tipo: "carro", valor: 40000, ano: anoAtual + 3, intervaloAnos: 5 },
    { id: 4, tipo: "educacao", valor: 100000, ano: anoAtual + 8 },
    { id: 5, tipo: "festas", valor: 8000 },
  ]);
  const [nextId, setNextId] = useState(6);

  const [calculated, setCalculated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const num = (s: string) => parseFloat(String(s).replace(/\./g, "").replace(",", ".")) || 0;

  const addGoal = (tipo: GoalType) => {
    const base: Goal = { id: nextId, tipo, valor: tipo === "viagens" || tipo === "festas" ? 6000 : 50000 };
    if (["imovel", "carro", "educacao", "outro"].includes(tipo)) base.ano = anoAtual + 5;
    if (tipo === "imovel") Object.assign(base, { financiar: true, entradaPct: 30, prazoAnos: 25, jurosAa: 10 });
    if (tipo === "carro") base.intervaloAnos = 5;
    setGoals((p) => [...p, base]); setNextId((n) => n + 1);
  };
  const removeGoal = (id: number) => setGoals((p) => p.filter((g) => g.id !== id));
  const upd = (id: number, patch: Partial<Goal>) => setGoals((p) => p.map((g) => g.id === id ? { ...g, ...patch } : g));

  const plan = useMemo(() => computeLifePlan({
    anoAtual,
    idadeAtual: Math.round(num(idadeAtual)),
    idadeAposentadoria: Math.round(num(idadeApos)),
    idadeFim: Math.round(num(idadeFim)),
    rendaMensal: num(renda), custoFixoMensal: num(custo), patrimonioAtual: num(patrimonio),
    rentRealPct: num(rentReal), rendaAposDesejada: num(rendaApos), rendaINSS: num(inss),
    goals,
  }), [idadeAtual, idadeApos, idadeFim, renda, custo, patrimonio, rentReal, rendaApos, inss, goals, anoAtual]);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());
  const handleUnlock = async () => {
    if (!emailValido) { toast.error("Informe um e-mail válido."); return; }
    setSubmitting(true);
    try {
      await supabase.from("lifeplan_leads" as any).insert({
        email: leadEmail.trim(),
        idade_atual: Math.round(num(idadeAtual)), idade_aposentadoria: Math.round(num(idadeApos)),
        renda_mensal: num(renda), patrimonio_atual: num(patrimonio),
        capital_de_vida: Math.round(plan.capitalDeVida), patrimonio_projetado: Math.round(plan.patrimonioNaApos),
        pct_atingido: Number(plan.pctAtingido.toFixed(1)), viavel: plan.viavel,
      });
      setUnlocked(true); toast.success("Projeto liberado!");
    } catch { toast.error("Erro ao enviar. Tente novamente."); }
    finally { setSubmitting(false); }
  };

  const custoMensal = num(custo);

  const Field = ({ label, value, set, prefix, suffix }: { label: string; value: string; set: (v: string) => void; prefix?: string; suffix?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
        <Input inputMode="numeric" className={cn("h-11", prefix && "pl-9", suffix && "pr-14")} value={value}
          onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, ""))} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <SEO title="Projeto de Vida Novare | Método Horizonte"
        description="Some todos os seus sonhos + aposentadoria num único número — o Capital de Vida — e descubra se o seu projeto é viável." />

      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logoPreta} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs font-medium text-slate-500 hidden sm:block">Método Horizonte</span>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-novare-blue/10 text-novare-blue px-3 py-1 text-xs font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Projeto de Vida Novare
        </div>
        <h1 className="text-3xl sm:text-[2.6rem] leading-tight font-display font-bold text-novare-blue">
          Quanto custa a vida dos seus sonhos?
        </h1>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto">
          Em vez de planilhas soltas, o <strong>Método Horizonte</strong> junta <strong>todos</strong> os seus sonhos e a aposentadoria num único número — o seu <strong>Capital de Vida</strong> — e te diz, com visão macro, se o projeto fecha.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16 space-y-5">
        {/* Bloco 1 — Você */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-1">1 · Você hoje</h2>
          <p className="text-xs text-slate-400 mb-5">Tudo em valores de hoje (poder de compra), com juros reais (acima da inflação).</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Idade atual" value={idadeAtual} set={setIdadeAtual} suffix="anos" />
            <Field label="Aposentar aos" value={idadeApos} set={setIdadeApos} suffix="anos" />
            <Field label="Viver até" value={idadeFim} set={setIdadeFim} suffix="anos" />
            <Field label="Renda mensal" value={renda} set={setRenda} prefix="R$" />
            <Field label="Custo fixo mensal" value={custo} set={setCusto} prefix="R$" />
            <Field label="Patrimônio investido" value={patrimonio} set={setPatrimonio} prefix="R$" />
            <Field label="Rentabilidade real" value={rentReal} set={setRentReal} suffix="% a.a." />
            <Field label="Renda na aposentadoria" value={rendaApos} set={setRendaApos} prefix="R$" />
            <Field label="Já garantido (INSS)" value={inss} set={setInss} prefix="R$" />
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Juros real do Tesouro hoje ~{pctStr(rates.jurosReal, 1)} a.a.; para o longo prazo, 4% a 6% é prudente.</p>
        </div>

        {/* Bloco 2 — Sonhos */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-1">2 · Seus sonhos</h2>
          <p className="text-xs text-slate-400 mb-5">Não se limite. Coloque tudo que faz parte da vida que você quer viver — viagens, casa, carro, educação, festas.</p>

          <div className="space-y-3">
            {goals.map((g) => {
              const meta = tipoMeta(g.tipo);
              const Icon = meta.icon;
              const anual = g.tipo === "viagens" || g.tipo === "festas";
              return (
                <div key={g.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-novare-blue shrink-0" />
                    <Select value={g.tipo} onValueChange={(v) => upd(g.id, { tipo: v as GoalType })}>
                      <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <button onClick={() => removeGoal(g.id)} className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0"><Trash2 className="h-4 w-4" /></button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {g.tipo === "outro" && (
                      <Input className="h-9 col-span-2 sm:col-span-1" placeholder="Nome do sonho" value={g.nome ?? ""}
                        onChange={(e) => upd(g.id, { nome: e.target.value })} />
                    )}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">R$</span>
                      <Input inputMode="numeric" className="h-9 pl-7" placeholder="Valor" value={String(g.valor || "")}
                        onChange={(e) => upd(g.id, { valor: num(e.target.value) })} />
                    </div>
                    {!anual && (
                      <Input inputMode="numeric" className="h-9" placeholder="Ano" value={String(g.ano ?? "")}
                        onChange={(e) => upd(g.id, { ano: parseInt(e.target.value) || undefined })} />
                    )}
                    {g.tipo === "carro" && (
                      <div className="relative">
                        <Input inputMode="numeric" className="h-9 pr-12" placeholder="5" value={String(g.intervaloAnos ?? "")}
                          onChange={(e) => upd(g.id, { intervaloAnos: parseInt(e.target.value) || undefined })} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">a cada</span>
                      </div>
                    )}
                    {anual && <span className="text-[11px] text-slate-400 self-center col-span-2 sm:col-span-2">valor por ano, até a aposentadoria</span>}
                  </div>

                  {g.tipo === "imovel" && (
                    <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
                      <label className="flex items-center gap-1.5 text-slate-600">
                        <input type="checkbox" checked={!!g.financiar} onChange={(e) => upd(g.id, { financiar: e.target.checked })} /> Financiar
                      </label>
                      {g.financiar && (
                        <>
                          <span className="relative"><Input inputMode="numeric" className="h-8 w-20 pr-6" placeholder="30" value={String(g.entradaPct ?? "")} onChange={(e) => upd(g.id, { entradaPct: num(e.target.value) })} /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%ent</span></span>
                          <span className="relative"><Input inputMode="numeric" className="h-8 w-20 pr-7" placeholder="25" value={String(g.prazoAnos ?? "")} onChange={(e) => upd(g.id, { prazoAnos: parseInt(e.target.value) || undefined })} /><span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">anos</span></span>
                          <span className="relative"><Input inputMode="numeric" className="h-8 w-20 pr-9" placeholder="10" value={String(g.jurosAa ?? "")} onChange={(e) => upd(g.id, { jurosAa: num(e.target.value) })} /><span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%a.a</span></span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {TIPOS.map((t) => (
              <button key={t.id} onClick={() => addGoal(t.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-novare-blue hover:bg-novare-blue/5 border border-novare-blue/20 rounded-lg px-2.5 py-1.5">
                <Plus className="h-3.5 w-3.5" /> {t.label.split(" (")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={() => setCalculated(true)}
            className="bg-novare-blue hover:bg-novare-blue/90 text-white font-bold px-10 h-12 text-base gap-2">
            Calcular meu Capital de Vida <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Resultado */}
        {calculated && (
          <div className="space-y-5 animate-fade-in">
            {/* Capital de Vida */}
            <div className="rounded-3xl bg-novare-blue text-white p-7 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-novare-blue-bright">Seu Capital de Vida</p>
              <p className="text-4xl sm:text-5xl font-black tabular-nums mt-1">{brl(plan.capitalDeVida)}</p>
              <p className="text-white/70 text-sm mt-2">
                É o quanto a vida dos seus sonhos custa — {brl(plan.totalObjetivos)} em objetivos + {brl(plan.alvoAposentadoria)} para sustentar a aposentadoria.
              </p>
            </div>

            {/* Viabilidade */}
            <div className={cn("rounded-2xl border p-6 text-center", plan.viavel ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60")}>
              <p className="flex items-center justify-center gap-2 font-bold text-lg" style={{ color: plan.viavel ? "#059669" : "#b45309" }}>
                {plan.viavel ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                {plan.viavel ? "Projeto viável! 🎉" : `Você atinge ${pctStr(plan.pctAtingido, 0)} da sua aposentadoria`}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                No seu ritmo atual, você chega aos {idadeApos} com <strong>{brl(plan.patrimonioNaApos)}</strong> — e a meta é <strong>{brl(plan.alvoAposentadoria)}</strong>.
              </p>
            </div>

            {!unlocked ? (
              <div className="rounded-2xl bg-novare-terracotta text-white p-6 sm:p-8 text-center">
                <h3 className="text-xl font-bold">Veja seu projeto completo</h3>
                <p className="text-white/85 text-sm mt-2 max-w-md mx-auto">
                  Informe seu e-mail para liberar a <strong>linha do tempo do seu patrimônio</strong>, as <strong>3 formas de fechar o projeto</strong> e o plano de ação.
                </p>
                <div className="max-w-md mx-auto mt-5 space-y-3">
                  <Input type="email" placeholder="seuemail@exemplo.com" value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)} className="h-12 bg-white text-slate-900 border-0 text-center" />
                  <Button onClick={handleUnlock} disabled={submitting || !emailValido}
                    className="w-full h-12 bg-white text-novare-terracotta hover:bg-white/90 font-bold">
                    {submitting ? "Liberando..." : "Ver meu projeto de vida"}
                  </Button>
                </div>
                <p className="text-[10px] text-white/60 mt-4 max-w-md mx-auto leading-relaxed">
                  Ao informar seus dados, você concorda com a Política de Privacidade e aceita receber comunicações da Novare Consultoria de Investimentos.
                </p>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in">
                {/* Linha do tempo */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-bold text-slate-900 mb-3">A linha do tempo da sua vida</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={plan.serie} margin={{ left: -4, right: 8, top: 8 }}>
                        <defs>
                          <linearGradient id="gLP" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(215 50% 23%)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(215 50% 23%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                        <XAxis dataKey="idade" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(a) => `${a}`} />
                        <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: "#94a3b8" }} width={44} />
                        <RTooltip formatter={(v: number) => brl(v)} labelFormatter={(a) => `${a} anos`} />
                        <ReferenceLine x={Math.round(num(idadeApos))} stroke="#c2602f" strokeDasharray="4 4" label={{ value: "Aposentadoria", position: "insideTopRight", fill: "#c2602f", fontSize: 10 }} />
                        <ReferenceLine y={0} stroke="#e11d48" strokeWidth={1} />
                        <Area type="monotone" dataKey="patrimonio" stroke="hsl(215 50% 23%)" fill="url(#gLP)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-slate-400">Cada queda é um sonho sendo realizado (saque). Se a linha cruzar o zero, o projeto não se sustenta — aí entram as alavancas abaixo.</p>
                </div>

                {/* Alavancas */}
                {plan.viavel ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                    <p className="font-bold text-emerald-700 flex items-center justify-center gap-2"><CheckCircle2 className="h-5 w-5" /> Seu projeto fecha!</p>
                    <p className="text-sm text-slate-600 mt-1">Seu patrimônio na aposentadoria geraria cerca de <strong className="text-emerald-700">{brl(plan.rendaPassivaProjetada)}/mês</strong> de renda passiva. Agora é executar com disciplina.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-3">3 formas de fechar o seu projeto</p>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                        <CalendarClock className="h-6 w-6 mx-auto text-novare-blue" />
                        <p className="text-2xl font-bold mt-2">{plan.esperarAnos != null ? `+${plan.esperarAnos} ${plan.esperarAnos === 1 ? "ano" : "anos"}` : "—"}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">esperar para aposentar</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                        <TrendingUp className="h-6 w-6 mx-auto text-novare-terracotta" />
                        <p className="text-2xl font-bold mt-2">{plan.rentNecessariaPct != null ? `${pctStr(plan.rentNecessariaPct, 1)}` : "—"}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">render ao ano (real) · perfil reverso</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                        <PiggyBank className="h-6 w-6 mx-auto text-emerald-600" />
                        <p className="text-2xl font-bold mt-2">{plan.pouparMaisMes != null ? `${brl(plan.pouparMaisMes)}` : "—"}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">poupar a mais por mês</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 text-center">Escolha UMA alavanca — ou combine um pouco de cada. Pequenos ajustes mudam todo o projeto.</p>
                  </div>
                )}

                {/* Perfil reverso */}
                {plan.rentNecessariaPct != null && (
                  <div className="rounded-2xl bg-novare-blue-light/60 p-5 text-sm text-slate-700 text-center">
                    🔑 <strong>Perfil reverso:</strong> seu patrimônio precisa render <strong className="text-novare-blue">{pctStr(plan.rentNecessariaPct, 1)} ao ano acima da inflação</strong> para o projeto fechar na idade escolhida. Saber esse número é o que define qual carteira (e qual risco) você precisa ter — não o contrário.
                  </div>
                )}

                {/* Plano de ação */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-bold text-slate-900 mb-3">Plano de ação sugerido</p>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    {[
                      { icon: Wallet, t: "Reserva de emergência", v: brl(custoMensal * 6), h: "6 meses do custo fixo, em liquidez diária" },
                      { icon: Shield, t: "Seguro de vida", v: brl(custoMensal * 12 * 5), h: "5 anos de custo fixo para proteger a família + sucessão" },
                      { icon: PiggyBank, t: "Previdência (VGBL/PGBL)", v: "Vantagem tributária", h: "diferimento de IR e sucessão facilitada no longo prazo" },
                    ].map((a) => (
                      <div key={a.t} className="rounded-xl bg-slate-50 p-3">
                        <a.icon className="h-4 w-4 text-novare-blue mb-1" />
                        <p className="font-bold text-slate-900 text-sm">{a.t}</p>
                        <p className="text-[13px] text-slate-700">{a.v}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{a.h}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="rounded-2xl bg-novare-terracotta text-white p-6 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-lg">Quer colocar seu projeto de vida em prática?</p>
                    <p className="text-white/85 text-sm mt-0.5">Os sócios da Novare ajudam a construir a carteira e as proteções para você viver a vida que sonhou.</p>
                  </div>
                  <Button asChild variant="secondary" className="bg-white text-novare-terracotta hover:bg-white/90 font-bold">
                    <a href="https://wa.me/5519983402827?text=Fiz%20meu%20Projeto%20de%20Vida%20Novare%20e%20quero%20colocar%20em%20pr%C3%A1tica" target="_blank" rel="noopener noreferrer">
                      Falar com a Novare
                    </a>
                  </Button>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
                  Projeção educacional, em valores de hoje (deflacionada) e com a regra dos 4% para a renda na aposentadoria. Não considera impostos sobre o rendimento nem é recomendação de investimento.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <NovareToolFooter intro="Descobrir o Capital de Vida é o primeiro passo. Fale com a Novare e transforme o seu projeto em realidade, com acompanhamento de verdade." />
    </div>
  );
}
