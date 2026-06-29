// Projeção: trajetória do patrimônio + fluxo completo ano a ano + metas de poupança.
import { useMemo } from "react";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { destinoDaRenda, composicaoPatrimonio } from "../lib/insights";
import { VPCard, VPTitle } from "../components/ui";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

const n = (v: number) => Math.round(v).toLocaleString("pt-BR");

const Projecao = () => {
  const { plan, input } = useVidaPlan();
  const pico = plan.serie.reduce((m, p) => Math.max(m, p.patrimonio), 0);
  const metas = useMemo(
    () => plan.serie.filter((p) => p.idade < input.idadeAposentadoria && p.sobra > 0).slice(0, 6),
    [plan.serie, input.idadeAposentadoria],
  );
  const destino = useMemo(() => destinoDaRenda(input, plan), [input, plan]);
  const composicao = useMemo(() => composicaoPatrimonio(input, plan), [input, plan]);

  return (
    <div className="space-y-6">
      <VPTitle hint="Tudo em poder de compra de hoje. A linha marca o início da sua independência.">📈 Projeção</VPTitle>

      <VPCard className="p-4 pt-5">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={plan.serie} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="vpFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8643F" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#C8643F" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,49,79,0.08)" vertical={false} />
              <XAxis dataKey="idade" tick={{ fontSize: 11, fill: "#1b2a3d99" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} tick={{ fontSize: 11, fill: "#1b2a3d99" }} tickLine={false} axisLine={false} width={42} />
              <Tooltip
                formatter={(v: number) => [brl0(v), "Patrimônio"]}
                labelFormatter={(l) => `Aos ${l} anos`}
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(16,49,79,0.1)", fontSize: 12 }}
              />
              <ReferenceLine x={input.idadeAposentadoria} stroke="#16314f" strokeDasharray="4 4" label={{ value: "Independência", fontSize: 10, fill: "#16314f", position: "insideTopRight" }} />
              <Area type="monotone" dataKey="patrimonio" stroke="#C8643F" strokeWidth={2.5} fill="url(#vpFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </VPCard>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <VPCard className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Pico de patrimônio</p><p className="font-display text-lg font-bold text-[#16314f] tabular-nums">{brl0(pico)}</p></VPCard>
        <VPCard className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Aos {input.idadeAposentadoria} anos</p><p className="font-display text-lg font-bold text-[#16314f] tabular-nums">{brl0(plan.patrimonioNaApos)}</p></VPCard>
        <VPCard className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Aos {input.idadeFim} anos</p><p className="font-display text-lg font-bold text-[#16314f] tabular-nums">{brl0(plan.serie[plan.serie.length - 1]?.patrimonio ?? 0)}</p></VPCard>
      </div>

      {/* Destino da renda + Composição do patrimônio */}
      <div className="grid lg:grid-cols-2 gap-4">
        <VPCard className="p-5">
          <p className="font-display text-base font-bold text-[#16314f] mb-3">Para onde vai sua renda</p>
          <div className="space-y-2.5">
            {destino.fatias.map((f) => {
              const pct = destino.total > 0 ? (f.valor / destino.total) * 100 : 0;
              return (
                <div key={f.nome}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-[#16314f]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.cor }} />{f.nome}</span>
                    <span className="tabular-nums text-[#1b2a3d]/60">{brl0(f.valor)} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: f.cor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </VPCard>

        <VPCard className="p-5">
          <p className="font-display text-base font-bold text-[#16314f] mb-1">Como seu patrimônio se forma</p>
          <p className="text-sm text-[#1b2a3d]/60 mb-2">Aos {input.idadeAposentadoria} anos: {brl0(composicao.total)}</p>
          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={composicao.fatias} dataKey="valor" nameKey="nome" innerRadius={38} outerRadius={62} paddingAngle={1}>
                    {composicao.fatias.map((f, i) => <Cell key={i} fill={f.cor} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {composicao.fatias.map((f) => {
                const pct = composicao.total > 0 ? (f.valor / composicao.total) * 100 : 0;
                return (
                  <div key={f.nome}>
                    <p className="text-xs text-[#1b2a3d]/60 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.cor }} />{f.nome}</p>
                    <p className="text-sm font-bold text-[#16314f] tabular-nums">{brl0(f.valor)} <span className="text-[#1b2a3d]/45 font-normal">· {pct.toFixed(0)}%</span></p>
                  </div>
                );
              })}
            </div>
          </div>
          {composicao.fatias.length > 1 && (
            <p className="text-[11px] text-[#1b2a3d]/50 mt-2">O juro trabalhou por você: {((composicao.fatias[1]?.valor ?? 0) / (composicao.total || 1) * 100).toFixed(0)}% do patrimônio veio de rendimento.</p>
          )}
        </VPCard>
      </div>

      {/* Metas de Poupança */}
      {metas.length > 0 && (
        <VPCard className="p-5">
          <p className="font-display text-base font-bold text-[#16314f] mb-1">Metas de poupança</p>
          <p className="text-sm text-[#1b2a3d]/60 mb-3">Quanto investir por ano para o projeto se sustentar.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase tracking-wider text-[#1b2a3d]/50 border-b border-black/[0.06]">
                <th className="text-left font-semibold py-2 pr-3">Ano</th>
                <th className="text-right font-semibold py-2 px-3">Mensal</th>
                <th className="text-right font-semibold py-2 pl-3">Anual</th>
              </tr></thead>
              <tbody>
                {metas.map((m) => (
                  <tr key={m.ano} className="border-b border-black/[0.04] last:border-0">
                    <td className="py-2 pr-3 text-[#16314f] font-medium">{m.ano}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-[#2F8F6B] font-semibold">{brl0(m.sobra / 12)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-[#16314f]">{brl0(m.sobra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </VPCard>
      )}

      {/* Fluxo completo */}
      <VPCard className="overflow-hidden">
        <div className="px-5 pt-5">
          <p className="font-display text-base font-bold text-[#16314f]">Fluxo financeiro completo</p>
          <p className="text-sm text-[#1b2a3d]/60">Renda, saídas, objetivos e sobras a cada ano (valores de hoje).</p>
        </div>
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-white">
              <tr className="text-[10px] uppercase tracking-wider text-[#1b2a3d]/50 border-b border-black/[0.06]">
                <th className="text-left font-semibold px-4 py-2">Ano</th>
                <th className="text-right font-semibold px-3 py-2">Renda</th>
                <th className="text-right font-semibold px-3 py-2">Saídas</th>
                <th className="text-right font-semibold px-3 py-2">Objetivos</th>
                <th className="text-right font-semibold px-3 py-2">Sobras</th>
                <th className="text-right font-semibold px-4 py-2">Patrimônio</th>
              </tr>
            </thead>
            <tbody>
              {plan.serie.map((p) => (
                <tr key={p.ano} className={`border-b border-black/[0.04] last:border-0 ${p.idade === input.idadeAposentadoria ? "bg-[#16314f]/[0.05]" : ""}`}>
                  <td className="px-4 py-1.5 text-[#16314f] font-medium">{p.ano}<span className="text-[#1b2a3d]/40"> · {p.idade}</span></td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[#1b2a3d]/70">{n(p.renda)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[#C8643F]">{n(p.saidas)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[#C8643F]">{p.objetivos ? n(p.objetivos) : "—"}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${p.sobra < 0 ? "text-[#C8643F]" : "text-[#2F8F6B]"}`}>{n(p.sobra)}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums font-semibold text-[#16314f]">{n(p.patrimonio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </VPCard>
    </div>
  );
};

export default Projecao;
