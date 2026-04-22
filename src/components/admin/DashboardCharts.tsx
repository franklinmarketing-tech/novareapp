import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Card3D } from "@/components/ui/card-3d";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, TrendingDown, ShieldAlert, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WealthSphere3D from "@/components/admin/WealthSphere3D";

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const fmtBRLShort = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (abs >= 1_000) return `${sign}R$ ${Math.round(abs / 1_000)}k`;
  return `${sign}R$ ${Math.round(abs)}`;
};

const RISK_COLORS: Record<string, string> = {
  A: "hsl(var(--success))",
  B: "hsl(var(--primary))",
  C: "hsl(var(--accent))",
  D: "hsl(var(--warning))",
  E: "hsl(var(--destructive))",
};

const RISK_LABELS: Record<string, string> = {
  A: "A · Excelente",
  B: "B · Boa",
  C: "C · Moderada",
  D: "D · Atenção",
  E: "E · Crítica",
};

interface WealthPoint {
  month: string;
  value: number;
  monthIdx: number;
}

interface RiskBar {
  risk: string;
  label: string;
  count: number;
  color: string;
}

const DashboardCharts = ({
  selectedMonth,
  selectedYear,
}: {
  selectedMonth: number;
  selectedYear: number;
}) => {
  const [wealthSeries, setWealthSeries] = useState<WealthPoint[]>([]);
  const [riskBars, setRiskBars] = useState<RiskBar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Build the 6-month window ending at selected month (inclusive)
      const months: { year: number; month: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(selectedYear, selectedMonth - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() });
      }
      const windowStart = new Date(months[0].year, months[0].month, 1);
      const windowEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
      const today = new Date();
      const isCurrentMonth =
        selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

      // Pull all clients up to end of window (for membership filtering)
      const { data: clients } = await supabase
        .from("clients")
        .select("id, created_at")
        .lte("created_at", windowEnd.toISOString());

      const clientIds = clients?.map((c) => c.id) || [];

      // Pull snapshots within window
      const { data: snapshots } = await supabase
        .from("monitoring_snapshots")
        .select("client_id, snapshot_date, total_assets, total_debts")
        .in("client_id", clientIds.length > 0 ? clientIds : ["__none__"])
        .gte("snapshot_date", windowStart.toISOString().slice(0, 10))
        .lte("snapshot_date", windowEnd.toISOString().slice(0, 10));

      // For each month, compute net wealth using latest snapshot per client up to end of that month
      const series: WealthPoint[] = months.map(({ year, month }) => {
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
        const monthEndStr = monthEnd.toISOString().slice(0, 10);
        const latestByClient: Record<string, { assets: number; debts: number; date: string }> = {};
        snapshots?.forEach((s) => {
          if (s.snapshot_date <= monthEndStr) {
            const prev = latestByClient[s.client_id];
            if (!prev || s.snapshot_date > prev.date) {
              latestByClient[s.client_id] = {
                assets: s.total_assets || 0,
                debts: s.total_debts || 0,
                date: s.snapshot_date,
              };
            }
          }
        });
        const vals = Object.values(latestByClient);
        const total =
          vals.reduce((sum, v) => sum + v.assets, 0) - vals.reduce((sum, v) => sum + v.debts, 0);
        return {
          month: MONTHS_PT[month],
          value: total,
          monthIdx: month,
        };
      });

      // For the most recent month, if it's the current month use live data
      if (isCurrentMonth && clientIds.length > 0) {
        const [assetsRes, debtsRes] = await Promise.all([
          supabase.from("assets").select("estimated_value").in("client_id", clientIds),
          supabase.from("debts").select("total_amount").in("client_id", clientIds),
        ]);
        const liveAssets =
          assetsRes.data?.reduce((s, r) => s + (r.estimated_value || 0), 0) || 0;
        const liveDebts =
          debtsRes.data?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0;
        series[series.length - 1].value = liveAssets - liveDebts;
      }

      setWealthSeries(series);

      // Risk distribution
      const { data: diagnoses } = await supabase
        .from("diagnosis")
        .select("client_id, risk_classification")
        .in("client_id", clientIds.length > 0 ? clientIds : ["__none__"]);

      const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      diagnoses?.forEach((d) => {
        const r = d.risk_classification || "C";
        counts[r] = (counts[r] || 0) + 1;
      });

      setRiskBars(
        (["A", "B", "C", "D", "E"] as const).map((r) => ({
          risk: r,
          label: RISK_LABELS[r],
          count: counts[r] || 0,
          color: RISK_COLORS[r],
        }))
      );

      setLoading(false);
    };

    fetchData();
  }, [selectedMonth, selectedYear]);

  const totalRisk = riskBars.reduce((s, r) => s + r.count, 0);
  const lastValue = wealthSeries[wealthSeries.length - 1]?.value || 0;
  const firstValue = wealthSeries[0]?.value || 0;
  const wealthDelta = lastValue - firstValue;
  const wealthDeltaPct =
    firstValue !== 0 ? Math.round((wealthDelta / Math.abs(firstValue)) * 100) : 0;
  const wealthValues = wealthSeries.map((p) => p.value);
  const wealthMax = wealthValues.length ? Math.max(...wealthValues) : 0;
  const wealthMin = wealthValues.length ? Math.min(...wealthValues) : 0;
  const wealthAvg = wealthValues.length
    ? wealthValues.reduce((s, v) => s + v, 0) / wealthValues.length
    : 0;

  // Risco: dominante + % saudável (A+B) e % atenção (D+E)
  const dominant = riskBars.reduce(
    (best, r) => (r.count > best.count ? r : best),
    riskBars[0] || { risk: "-", label: "-", count: 0, color: "" },
  );
  const healthy = riskBars.filter((r) => r.risk === "A" || r.risk === "B").reduce((s, r) => s + r.count, 0);
  const attention = riskBars.filter((r) => r.risk === "D" || r.risk === "E").reduce((s, r) => s + r.count, 0);
  const healthyPct = totalRisk > 0 ? Math.round((healthy / totalRisk) * 100) : 0;
  const attentionPct = totalRisk > 0 ? Math.round((attention / totalRisk) * 100) : 0;

  const TrendIcon = wealthDelta > 0 ? ArrowUpRight : wealthDelta < 0 ? ArrowDownRight : Minus;
  const trendColor =
    wealthDelta > 0 ? "text-success" : wealthDelta < 0 ? "text-destructive" : "text-muted-foreground";
  const trendBg =
    wealthDelta > 0 ? "bg-success/10" : wealthDelta < 0 ? "bg-destructive/10" : "bg-muted";

  return (
    <div className="space-y-4">
      {/* ── Hero: Globo Patrimonial 3D ── */}
      <WealthSphere3D selectedMonth={selectedMonth} selectedYear={selectedYear} />

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
      {/* ── Wealth evolution ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card3D glowColor="rgba(52,211,153,0.10)">
          <div className="p-4 sm:p-5 xl:p-6 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    Patrimônio sob gestão
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Evolução nos últimos 6 meses
                  </p>
                </div>
              </div>
              {wealthSeries.length > 0 && firstValue !== 0 && (
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${trendBg}`}>
                  <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
                  <span className={`text-xs font-bold tabular-nums ${trendColor}`}>
                    {wealthDelta >= 0 ? "+" : ""}
                    {wealthDeltaPct}%
                  </span>
                </div>
              )}
            </div>

            {/* Big value + delta */}
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-2xl xl:text-3xl font-bold text-foreground tracking-tight tabular-nums break-words">
                {loading ? "—" : fmtBRLShort(lastValue)}
              </p>
              {wealthSeries.length > 0 && firstValue !== 0 && (
                <span className={`text-xs font-semibold tabular-nums ${trendColor}`}>
                  {wealthDelta >= 0 ? "+" : ""}
                  {fmtBRLShort(wealthDelta)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">
              vs. {fmtBRLShort(firstValue)} no início do período
            </p>

            {/* Chart */}
            <ChartContainer
              config={{
                value: { label: "Patrimônio", color: "hsl(var(--success))" },
              }}
              className="h-[170px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wealthSeries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => fmtBRLShort(v)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => fmtBRLShort(Number(value))}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--success))"
                    strokeWidth={2.5}
                    fill="url(#wealthFill)"
                    dot={{ r: 3, fill: "hsl(var(--success))", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "hsl(var(--success))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/60">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mínimo</p>
                <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{fmtBRLShort(wealthMin)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Média</p>
                <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{fmtBRLShort(wealthAvg)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Máximo</p>
                <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{fmtBRLShort(wealthMax)}</p>
              </div>
            </div>
          </div>
        </Card3D>
      </motion.div>

      {/* ── Risk distribution ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card3D glowColor="rgba(251,146,60,0.08)">
          <div className="p-4 sm:p-5 xl:p-6 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    Distribuição por risco
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Classificação A (excelente) → E (crítica)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{totalRisk}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                  cliente{totalRisk === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {/* Saudável vs Atenção */}
            {totalRisk > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-xl bg-success/[0.06] border border-success/15 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saudável</span>
                    <span className="text-xs font-bold text-success tabular-nums">{healthyPct}%</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">
                    {healthy} <span className="text-[11px] text-muted-foreground font-normal">A + B</span>
                  </p>
                </div>
                <div className="rounded-xl bg-destructive/[0.06] border border-destructive/15 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Atenção</span>
                    <span className="text-xs font-bold text-destructive tabular-nums">{attentionPct}%</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">
                    {attention} <span className="text-[11px] text-muted-foreground font-normal">D + E</span>
                  </p>
                </div>
              </div>
            )}

            {/* Chart */}
            <ChartContainer
              config={{ count: { label: "Clientes" } }}
              className="h-[150px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskBars} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="risk"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontWeight={600}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `${value} cliente${Number(value) === 1 ? "" : "s"}`}
                        labelFormatter={(label) => RISK_LABELS[label as string] || label}
                      />
                    }
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {riskBars.map((entry) => (
                      <Cell key={entry.risk} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Legenda compacta */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 pt-4 border-t border-border/60">
              {riskBars.map((r) => (
                <div key={r.risk} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{r.risk}</span> · {r.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card3D>
      </motion.div>
      </div>
    </div>
  );
};

export default DashboardCharts;
