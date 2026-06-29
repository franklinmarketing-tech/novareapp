// Minha Realidade: renda, patrimônio, custo por categoria e rentabilidade.
import { useMemo } from "react";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { computeLifePlan, type Debt, type RendaEvento, type Seguro } from "@/lib/lifeplan";
import { VPCard, VPTitle, VPField } from "../components/ui";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Plus, Trash2, CreditCard, TrendingUp, TrendingDown, Shield } from "lucide-react";

const CORES = ["#16314f", "#C8643F", "#2F8F6B", "#E2A03F", "#5B8DB8", "#8E6BC8", "#C84F6B", "#3FA0A0", "#A0843F", "#6B7280"];
const CENARIOS = [2, 3, 4, 5, 6, 7];

const Realidade = () => {
  const { input, setField, setCategorias } = useVidaPlan();
  const cats = input.custoCategorias ?? [];
  const totalCusto = cats.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const sobra = input.rendaMensal - totalCusto;

  const cenarios = useMemo(
    () => CENARIOS.map((r) => ({ r, renda: computeLifePlan({ ...input, rentRealPct: r }).rendaPassivaProjetada })),
    [input],
  );

  const upd = (i: number, patch: Partial<{ nome: string; valor: number }>) =>
    setCategorias(cats.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const add = () => setCategorias([...cats, { nome: "Nova categoria", valor: 0 }]);
  const del = (i: number) => setCategorias(cats.filter((_, idx) => idx !== i));

  // Dívidas
  const dividas = input.dividas ?? [];
  const setDiv = (list: Debt[]) => setField("dividas", list);
  const updDiv = (id: number, patch: Partial<Debt>) => setDiv(dividas.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const totalDividas = dividas.reduce((s, d) => s + (Number(d.saldo) || 0), 0);

  // Renda futura
  const eventos = input.rendaEventos ?? [];
  const setEv = (list: RendaEvento[]) => setField("rendaEventos", list);
  const updEv = (id: number, patch: Partial<RendaEvento>) => setEv(eventos.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  // Custo futuro
  const custoEv = input.custoEventos ?? [];
  const setCev = (list: RendaEvento[]) => setField("custoEventos", list);
  const updCev = (id: number, patch: Partial<RendaEvento>) => setCev(custoEv.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  // Seguros
  const seguros = input.seguros ?? [];
  const setSeg = (list: Seguro[]) => setField("seguros", list);
  const updSeg = (id: number, patch: Partial<Seguro>) => setSeg(seguros.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-6">
      <VPTitle hint="Sua fotografia financeira atual. É a base de toda a projeção.">Minha Realidade</VPTitle>

      <VPCard className="p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <VPField label="Renda mensal líquida" suffix="R$/mês" value={input.rendaMensal} step={100} onChange={(v) => setField("rendaMensal", v)} />
          <VPField label="Patrimônio investido hoje" suffix="R$" value={input.patrimonioAtual} step={1000} onChange={(v) => setField("patrimonioAtual", v)} />
          <VPField label="Ativos imobilizados" suffix="R$ (imóvel próprio etc.)" value={input.ativosImobilizados ?? 0} step={1000} onChange={(v) => setField("ativosImobilizados", v)} />
          <VPField label="Consórcio / patrimônio previsto" suffix="R$ (carta de crédito)" value={input.consorcio ?? 0} step={1000} onChange={(v) => setField("consorcio", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-xl bg-[#16314f]/[0.04] px-4 py-3">
            <span className="text-sm text-[#1b2a3d]/60">Sobra mensal</span>
            <span className={cn("font-display text-base font-bold tabular-nums", sobra >= 0 ? "text-[#2F8F6B]" : "text-[#C8643F]")}>{brl0(sobra)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#16314f]/[0.04] px-4 py-3">
            <span className="text-sm text-[#1b2a3d]/60">Patrimônio total</span>
            <span className="font-display text-base font-bold tabular-nums text-[#16314f]">{brl0(input.patrimonioAtual + (input.ativosImobilizados ?? 0))}</span>
          </div>
        </div>
      </VPCard>

      {/* Custo por categoria */}
      <VPCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-lg font-bold text-[#16314f]">Custo por categoria</p>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-[#1b2a3d]/50">Total mensal</p>
            <p className="font-display text-lg font-bold text-[#C8643F] tabular-nums">{brl0(totalCusto)}</p>
          </div>
        </div>

        {totalCusto > 0 && (
          <div className="h-44 mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={cats.filter((c) => c.valor > 0)} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={75} paddingAngle={1}>
                  {cats.filter((c) => c.valor > 0).map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="space-y-2">
          {cats.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CORES[i % CORES.length] }} />
              <input value={c.nome} onChange={(e) => upd(i, { nome: e.target.value })}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#16314f] outline-none border-b border-transparent focus:border-[#C8643F]/40 py-0.5" />
              <div className="flex items-center rounded-lg border border-black/10 px-2">
                <span className="text-[11px] text-[#1b2a3d]/40">R$</span>
                <input type="number" value={c.valor} onChange={(e) => upd(i, { valor: parseFloat(e.target.value) || 0 })}
                  className="w-20 bg-transparent py-1.5 pl-1 text-sm text-right text-[#16314f] outline-none tabular-nums" />
              </div>
              <button onClick={() => del(i)} className="text-[#1b2a3d]/30 hover:text-[#C8643F] transition-colors shrink-0"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={add} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#16314f] hover:text-[#C8643F] transition-colors">
          <Plus className="h-4 w-4" /> Adicionar categoria
        </button>
      </VPCard>

      {/* Rentabilidade */}
      <VPCard className="p-5">
        <p className="font-display text-lg font-bold text-[#16314f] mb-1">Rentabilidade do projeto</p>
        <p className="text-sm text-[#1b2a3d]/60 mb-3">Ganho real esperado ao ano (acima do IPCA). Toque para escolher e ver o impacto na renda futura.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {cenarios.map(({ r, renda }) => {
            const ativo = Math.abs(input.rentRealPct - r) < 0.05;
            return (
              <button key={r} onClick={() => setField("rentRealPct", r)}
                className={cn("rounded-xl border p-3 text-left transition-colors",
                  ativo ? "border-[#C8643F] bg-[#C8643F]/[0.06]" : "border-black/10 hover:border-[#16314f]/30")}>
                <p className={cn("text-sm font-bold", ativo ? "text-[#C8643F]" : "text-[#16314f]")}>IPCA + {r}%</p>
                <p className="text-[11px] text-[#1b2a3d]/50">renda ~ {brl0(renda)}/mês</p>
              </button>
            );
          })}
        </div>
      </VPCard>

      {/* Dívidas */}
      <VPCard className="p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#C8643F]" />
            <p className="font-display text-lg font-bold text-[#16314f]">Dívidas</p>
          </div>
          {totalDividas > 0 && <span className="text-sm font-semibold text-[#C8643F] tabular-nums">{brl0(totalDividas)}</span>}
        </div>
        <p className="text-sm text-[#1b2a3d]/60 mb-3">Financiamentos e empréstimos em aberto — a parcela mensal entra como saída até quitar.</p>
        <div className="space-y-2">
          {dividas.map((d) => (
            <div key={d.id} className="rounded-xl border border-black/[0.07] p-3">
              <div className="flex items-center gap-2 mb-2">
                <input value={d.nome ?? ""} placeholder="Ex.: financiamento do carro" onChange={(e) => updDiv(d.id, { nome: e.target.value })}
                  className="flex-1 min-w-0 bg-transparent font-semibold text-[#16314f] outline-none border-b border-transparent focus:border-[#C8643F]/40 pb-0.5" />
                <button onClick={() => setDiv(dividas.filter((x) => x.id !== d.id))} className="text-[#1b2a3d]/30 hover:text-[#C8643F]"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Mini label="Saldo (R$)"><input type="number" value={d.saldo} onChange={(e) => updDiv(d.id, { saldo: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" /></Mini>
                <Mini label="Parcelas"><input type="number" value={d.parcelas} onChange={(e) => updDiv(d.id, { parcelas: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" /></Mini>
                <Mini label="Juros % a.a."><input type="number" value={d.jurosAa} onChange={(e) => updDiv(d.id, { jurosAa: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" /></Mini>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setDiv([...dividas, { id: Date.now(), nome: "", saldo: 0, parcelas: 12, jurosAa: 18 }])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#16314f] hover:text-[#C8643F] transition-colors">
          <Plus className="h-4 w-4" /> Adicionar dívida
        </button>
      </VPCard>

      {/* Renda futura */}
      <VPCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-[#2F8F6B]" />
          <p className="font-display text-lg font-bold text-[#16314f]">Renda futura</p>
        </div>
        <p className="text-sm text-[#1b2a3d]/60 mb-3">Aumentos (ou reduções) de renda previstos. Use valor negativo para queda de renda.</p>
        <div className="space-y-2">
          {eventos.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2">
              <Mini label="A partir do ano"><input type="number" value={ev.ano} onChange={(e) => updEv(ev.id, { ano: parseFloat(e.target.value) || input.anoAtual })} className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" /></Mini>
              <Mini label="Variação mensal (R$)"><input type="number" value={ev.delta} onChange={(e) => updEv(ev.id, { delta: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" /></Mini>
              <button onClick={() => setEv(eventos.filter((x) => x.id !== ev.id))} className="text-[#1b2a3d]/30 hover:text-[#C8643F] shrink-0"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setEv([...eventos, { id: Date.now(), ano: input.anoAtual + 3, delta: 1500 }])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#16314f] hover:text-[#C8643F] transition-colors">
          <Plus className="h-4 w-4" /> Adicionar mudança de renda
        </button>
      </VPCard>

      {/* Custo futuro */}
      <VPCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="h-5 w-5 text-[#C8643F]" />
          <p className="font-display text-lg font-bold text-[#16314f]">Custo futuro</p>
        </div>
        <p className="text-sm text-[#1b2a3d]/60 mb-3">Mudanças de custo previstas — ex.: parar de pagar aluguel ao comprar a casa (valor negativo) ou um filho a caminho (positivo).</p>
        <div className="space-y-2">
          {custoEv.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2">
              <Mini label="A partir do ano"><input type="number" value={ev.ano} onChange={(e) => updCev(ev.id, { ano: parseFloat(e.target.value) || input.anoAtual })} className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" /></Mini>
              <Mini label="Variação mensal (R$)"><input type="number" value={ev.delta} onChange={(e) => updCev(ev.id, { delta: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" /></Mini>
              <button onClick={() => setCev(custoEv.filter((x) => x.id !== ev.id))} className="text-[#1b2a3d]/30 hover:text-[#C8643F] shrink-0"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setCev([...custoEv, { id: Date.now(), ano: input.anoAtual + 5, delta: -1000 }])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#16314f] hover:text-[#C8643F] transition-colors">
          <Plus className="h-4 w-4" /> Adicionar mudança de custo
        </button>
      </VPCard>

      {/* Seguros */}
      <VPCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-[#16314f]" />
          <p className="font-display text-lg font-bold text-[#16314f]">Seguros</p>
        </div>
        <p className="text-sm text-[#1b2a3d]/60 mb-3">Prêmios que você paga. Mensal entra no custo; anual sai do patrimônio uma vez por ano.</p>
        <div className="space-y-2">
          {seguros.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input value={s.nome ?? ""} placeholder="Ex.: seguro de vida" onChange={(e) => updSeg(s.id, { nome: e.target.value })}
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-[#16314f] outline-none border-b border-transparent focus:border-[#C8643F]/40 py-1" />
              <Mini label="Valor (R$)"><input type="number" value={s.valor} onChange={(e) => updSeg(s.id, { valor: parseFloat(e.target.value) || 0 })} className="w-20 bg-transparent text-sm text-[#16314f] outline-none tabular-nums" /></Mini>
              <Mini label="Período">
                <select value={s.periodicidade} onChange={(e) => updSeg(s.id, { periodicidade: e.target.value as "mensal" | "anual" })} className="bg-transparent text-sm text-[#16314f] outline-none">
                  <option value="mensal">Mensal</option><option value="anual">Anual</option>
                </select>
              </Mini>
              <button onClick={() => setSeg(seguros.filter((x) => x.id !== s.id))} className="text-[#1b2a3d]/30 hover:text-[#C8643F] shrink-0"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setSeg([...seguros, { id: Date.now(), nome: "", valor: 0, periodicidade: "mensal" }])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#16314f] hover:text-[#C8643F] transition-colors">
          <Plus className="h-4 w-4" /> Adicionar seguro
        </button>
      </VPCard>
    </div>
  );
};

const Mini = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-black/[0.07] px-2.5 py-1.5">
    <p className="text-[9px] uppercase tracking-wider text-[#1b2a3d]/40">{label}</p>
    {children}
  </div>
);

export default Realidade;
