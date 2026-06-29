// Projeção: trajetória do patrimônio (valores de hoje) até a expectativa de vida.
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { VPCard, VPTitle } from "../components/ui";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const Projecao = () => {
  const { plan, input } = useVidaPlan();
  const pico = plan.serie.reduce((m, p) => Math.max(m, p.patrimonio), 0);

  return (
    <div className="space-y-6">
      <VPTitle hint="Tudo em poder de compra de hoje. A linha marca o início da sua independência.">Projeção</VPTitle>

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
        <VPCard className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Pico de patrimônio</p>
          <p className="font-display text-lg font-bold text-[#16314f] tabular-nums">{brl0(pico)}</p>
        </VPCard>
        <VPCard className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Aos {input.idadeAposentadoria} anos</p>
          <p className="font-display text-lg font-bold text-[#16314f] tabular-nums">{brl0(plan.patrimonioNaApos)}</p>
        </VPCard>
        <VPCard className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Aos {input.idadeFim} anos</p>
          <p className="font-display text-lg font-bold text-[#16314f] tabular-nums">{brl0(plan.serie[plan.serie.length - 1]?.patrimonio ?? 0)}</p>
        </VPCard>
      </div>

      <VPCard className="overflow-hidden">
        <p className="font-display text-base font-bold text-[#16314f] px-5 pt-5">Patrimônio ano a ano</p>
        <div className="mt-3 max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-[11px] uppercase tracking-wider text-[#1b2a3d]/50 border-b border-black/[0.06]">
                <th className="text-left font-semibold px-5 py-2">Idade</th>
                <th className="text-left font-semibold px-3 py-2">Ano</th>
                <th className="text-right font-semibold px-5 py-2">Patrimônio</th>
              </tr>
            </thead>
            <tbody>
              {plan.serie.map((p) => (
                <tr key={p.ano} className={`border-b border-black/[0.04] last:border-0 ${p.idade === input.idadeAposentadoria ? "bg-[#16314f]/[0.04]" : ""}`}>
                  <td className="px-5 py-2 text-[#16314f] font-medium">{p.idade}</td>
                  <td className="px-3 py-2 text-[#1b2a3d]/60">{p.ano}</td>
                  <td className={`px-5 py-2 text-right tabular-nums ${p.patrimonio < 0 ? "text-[#C8643F]" : "text-[#16314f]"}`}>{brl0(p.patrimonio)}</td>
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
