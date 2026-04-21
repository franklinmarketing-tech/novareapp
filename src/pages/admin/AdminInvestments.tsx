import { useEffect, useState } from "react";
import { Icon3D } from "@/components/ui/Icon3D";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  DollarSign,
  Percent,
  ShieldCheck,
  BarChart3,
  AlertTriangle,
  Wallet,
  Activity,
  Info,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

interface Indicator {
  name: string;
  unit: string;
  current: number;
  previous: number;
  variation: number;
  history: { date: string; value: number }[];
}

interface Product {
  name: string;
  type: string;
  estimatedReturn: string;
  returnValue: number;
  risk: string;
  liquidity: string;
  minInvestment: string;
  profiles: string[];
}

interface MarketData {
  indicators: Record<string, Indicator>;
  analytics?: {
    realRate?: { value: number; label: string; unit: string };
    cdiVsPoupanca?: { value: number; label: string; unit: string };
  };
  products: Product[];
  updatedAt: string;
}

const riskColors: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  "Muito Baixo": "success",
  Baixo: "success",
  baixo: "success",
  "Médio": "warning",
  medio: "warning",
  Alto: "destructive",
  alto: "destructive",
};

const profileLabels: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const formatNum = (v: number, digits = 2) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

const KPICard = ({
  indicator,
  icon: Icon,
  hint,
}: {
  indicator: Indicator;
  icon: React.ElementType;
  hint?: string;
}) => {
  const isPositive = indicator.variation > 0;
  const isNeutral = indicator.variation === 0;

  const displayValue =
    indicator.unit === "R$"
      ? `R$ ${formatNum(indicator.current, 2)}`
      : indicator.unit === "pts"
      ? formatNum(indicator.current, 0)
      : `${formatNum(indicator.current, 2)}${indicator.unit
          .replace("a.a.", "")
          .replace("a.m.", "")
          .trim()}`;

  return (
    <Card className="relative overflow-hidden hover:border-primary/30 transition-colors">
      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.04]">
        <Icon className="w-full h-full" />
      </div>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {indicator.name}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{displayValue}</p>
            <span className="text-[0.6875rem] text-muted-foreground">{indicator.unit}</span>
          </div>
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              isNeutral
                ? "bg-muted text-muted-foreground"
                : isPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {isNeutral ? (
              <Minus className="h-3.5 w-3.5" />
            ) : isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(indicator.variation).toFixed(2)}%
          </div>
        </div>
        {hint && (
          <p className="text-[0.6875rem] text-muted-foreground mt-3 flex items-start gap-1 border-t border-border/50 pt-2">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{hint}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const IndicatorChart = ({ indicator, color }: { indicator: Indicator; color: string }) => {
  const data = indicator.history.map((h) => ({ ...h, date: h.date.substring(0, 5) }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{indicator.name} — Evolução</CardTitle>
          <Badge variant="outline" className="text-[0.625rem]">
            {data.length} períodos
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${indicator.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#gradient-${indicator.name})`}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const AnalyticsCard = ({
  label,
  value,
  unit,
  tone,
  description,
}: {
  label: string;
  value: number;
  unit: string;
  tone: "success" | "warning" | "destructive";
  description: string;
}) => {
  const toneClass =
    tone === "success"
      ? "border-success/30 bg-success/5"
      : tone === "warning"
      ? "border-warning/30 bg-warning/5"
      : "border-destructive/30 bg-destructive/5";
  const textClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-destructive";

  return (
    <Card className={`border ${toneClass}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className={`h-4 w-4 ${textClass}`} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${textClass}`}>
          {value > 0 ? "+" : ""}
          {formatNum(value, 2)}
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
        <p className="text-[0.6875rem] text-muted-foreground mt-1.5">{description}</p>
      </CardContent>
    </Card>
  );
};

const AdminInvestments = () => {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("fetch-market-data");
      if (error) throw error;
      setData(result);
    } catch (e) {
      if (import.meta.env.DEV) console.error("Erro ao buscar dados de mercado:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState variant="cards" rows={5} />
        <LoadingState variant="page" rows={3} />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={AlertTriangle}
            tone="warning"
            title="Não foi possível carregar os dados de mercado"
            description="Verifique sua conexão e tente novamente em instantes."
            action={
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const { indicators, products, analytics } = data;

  const indicatorHints: Record<string, string> = {
    selic: "Taxa básica de juros definida pelo Copom. Referência para toda renda fixa pós-fixada.",
    cdi: "Taxa interbancária — base de remuneração dos CDBs e fundos DI.",
    ipca: "Inflação oficial mensal medida pelo IBGE.",
    ipca12m: "Inflação acumulada nos últimos 12 meses — referência para metas do BCB.",
    poupanca: "Rendimento mensal da caderneta. Comparar com 70% da Selic vs Selic+TR.",
    dolar: "Cotação PTAX de venda — referência oficial para câmbio.",
    ibovespa: "Principal índice da bolsa brasileira (B3).",
  };

  const kpiIcons: Record<string, React.ElementType> = {
    selic: Percent,
    cdi: Percent,
    ipca: BarChart3,
    ipca12m: BarChart3,
    poupanca: ShieldCheck,
    dolar: DollarSign,
    ibovespa: TrendingUp,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon3D name="market" size="lg" floating lazy={false} alt="Mercado" />
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Investimentos & Mercado</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Indicadores em tempo real (BCB · B3) e catálogo de produtos · atualizado{" "}
              {new Date(data.updatedAt).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[0.6875rem] gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Ao vivo
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="mercado" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full sm:w-auto">
          <TabsTrigger value="mercado" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Mercado
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Catálogo
          </TabsTrigger>
        </TabsList>

        {/* TAB — Mercado */}
        <TabsContent value="mercado" className="space-y-5 mt-0">
          {/* Indicadores principais */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Indicadores oficiais
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(["selic", "cdi", "ipca12m", "dolar"] as const).map(
                (key) =>
                  indicators[key] && (
                    <KPICard
                      key={key}
                      indicator={indicators[key]}
                      icon={kpiIcons[key] || Percent}
                      hint={indicatorHints[key]}
                    />
                  )
              )}
            </div>
          </div>

          {/* Indicadores secundários */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Mercado complementar
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {(["ipca", "poupanca", "ibovespa"] as const).map(
                (key) =>
                  indicators[key] && (
                    <KPICard
                      key={key}
                      indicator={indicators[key]}
                      icon={kpiIcons[key] || Percent}
                      hint={indicatorHints[key]}
                    />
                  )
              )}
            </div>
          </div>

          {/* Análise calculada */}
          {analytics && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Análise rápida
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {analytics.realRate && (
                  <AnalyticsCard
                    label={analytics.realRate.label}
                    value={analytics.realRate.value}
                    unit={analytics.realRate.unit}
                    tone={analytics.realRate.value > 4 ? "success" : analytics.realRate.value > 2 ? "warning" : "destructive"}
                    description="Quanto a renda fixa rende acima da inflação. Acima de 4% é considerado atrativo."
                  />
                )}
                {analytics.cdiVsPoupanca && (
                  <AnalyticsCard
                    label={analytics.cdiVsPoupanca.label}
                    value={analytics.cdiVsPoupanca.value}
                    unit={analytics.cdiVsPoupanca.unit}
                    tone={analytics.cdiVsPoupanca.value > 4 ? "success" : "warning"}
                    description="Diferença entre o CDI e a poupança ao ano. Maior = mais vantagem em sair da poupança."
                  />
                )}
              </div>
            </div>
          )}

          {/* Gráficos de evolução */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Evolução histórica
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <IndicatorChart indicator={indicators.selic} color="hsl(var(--primary))" />
              <IndicatorChart indicator={indicators.ipca} color="hsl(var(--warning))" />
            </div>

            <div className="mt-4">
              <Tabs defaultValue="cdi">
                <TabsList>
                  <TabsTrigger value="cdi">CDI</TabsTrigger>
                  <TabsTrigger value="dolar">Dólar</TabsTrigger>
                  <TabsTrigger value="poupanca">Poupança</TabsTrigger>
                  {indicators.ibovespa && <TabsTrigger value="ibov">Ibovespa</TabsTrigger>}
                </TabsList>
                <TabsContent value="cdi">
                  <IndicatorChart indicator={indicators.cdi} color="hsl(var(--accent))" />
                </TabsContent>
                <TabsContent value="dolar">
                  <IndicatorChart indicator={indicators.dolar} color="hsl(var(--success))" />
                </TabsContent>
                <TabsContent value="poupanca">
                  <IndicatorChart indicator={indicators.poupanca} color="hsl(var(--muted-foreground))" />
                </TabsContent>
                {indicators.ibovespa && (
                  <TabsContent value="ibov">
                    <IndicatorChart indicator={indicators.ibovespa} color="hsl(var(--primary))" />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </TabsContent>

        {/* TAB — Catálogo */}
        <TabsContent value="catalogo" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Catálogo de produtos</CardTitle>
              <CardDescription className="text-xs">
                Produtos disponíveis no mercado com taxas calculadas em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Rent. Estimada</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead>Liquidez</TableHead>
                    <TableHead>Investimento Mín.</TableHead>
                    <TableHead>Perfil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.name}>
                      <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{product.type}</TableCell>
                      <TableCell className="font-medium text-foreground">{product.estimatedReturn}</TableCell>
                      <TableCell>
                        <Badge variant={riskColors[product.risk] || "secondary"}>{product.risk}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{product.liquidity}</TableCell>
                      <TableCell className="text-xs">{product.minInvestment}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {product.profiles.map((p) => (
                            <Badge key={p} variant="outline" className="text-[0.5625rem] px-1.5 py-0">
                              {profileLabels[p]?.[0] || p[0]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInvestments;
