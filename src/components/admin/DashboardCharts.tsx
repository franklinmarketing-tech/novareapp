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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Wealth evolution ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card3D>
          <div className="p-6">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-success" />
                <p className="text-sm font-semibold text-foreground">
                  Patrimônio sob gestão
                </p>
              </div>
              {wealthSeries.length > 0 && firstValue !== 0 && (
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    wealthDelta >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {wealthDelta >= 0 ? "+" : ""}
                  {wealthDeltaPct}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums mb-4">
              {loading ? "—" : fmtBRLShort(lastValue)}
            </p>
            <ChartContainer
              config={{
                value: {
                  label: "Patrimônio",
                  color: "hsl(var(--success))",
                },
              }}
              className="h-[180px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wealthSeries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
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
                    strokeWidth={2}
                    fill="url(#wealthFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </Card3D>
      </motion.div>

      {/* ── Risk distribution ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card3D>
          <div className="p-6">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-accent" />
                <p className="text-sm font-semibold text-foreground">
                  Distribuição por risco
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {totalRisk} cliente{totalRisk === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Classificação A (excelente) → E (crítica)
            </p>
            <ChartContainer
              config={{
                count: { label: "Clientes" },
              }}
              className="h-[180px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskBars} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="risk"
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
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {riskBars.map((entry) => (
                      <Cell key={entry.risk} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </Card3D>
      </motion.div>
    </div>
  );
};

export default DashboardCharts;
