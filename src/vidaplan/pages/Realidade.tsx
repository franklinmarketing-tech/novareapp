// Minha Realidade: renda, patrimônio, custo por categoria e rentabilidade.
import { useMemo } from "react";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { computeLifePlan } from "@/lib/lifeplan";
import { VPCard, VPTitle, VPField } from "../components/ui";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Plus, Trash2 } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <VPTitle hint="Sua fotografia financeira atual. É a base de toda a projeção.">Minha Realidade</VPTitle>

      <VPCard className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <VPField label="Renda mensal líquida" suffix="R$/mês" value={input.rendaMensal} step={100} onChange={(v) => setField("rendaMensal", v)} />
          <VPField label="Patrimônio investido hoje" suffix="R$" value={input.patrimonioAtual} step={1000} onChange={(v) => setField("patrimonioAtual", v)} />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[#16314f]/[0.04] px-4 py-3">
          <span className="text-sm text-[#1b2a3d]/60">Sobra mensal estimada</span>
          <span className={cn("font-display text-lg font-bold tabular-nums", sobra >= 0 ? "text-[#2F8F6B]" : "text-[#C8643F]")}>{brl0(sobra)}</span>
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
    </div>
  );
};

export default Realidade;
