import { useEffect, useMemo, useState } from "react";
import { useClientId } from "@/contexts/ClientContext";
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
  LineChart as LineIcon,
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

interface Recommendation {
  id: string;
  product_name: string;
  product_type: string;
  allocation_pct: number;
  invested_amount: number | null;
  expected_return: string | null;
  risk_level: string;
  liquidity: string | null;
  min_investment: number | null;
  rationale: string | null;
  status: string;
  priority: number;
}

const riskColors: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  "Muito Baixo": "success",
  "Baixo": "success",
  "baixo": "success",
  "Médio": "warning",
  "medio": "warning",
  "Alto": "destructive",
  "alto": "destructive",
};

const profileLabels: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const statusLabels: Record<string, { label: string; variant: "secondary" | "default" | "success" | "warning" }> = {
  sugerido: { label: "Sugerido", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  implementado: { label: "Implementado", variant: "success" },
  recusado: { label: "Recusado", variant: "warning" },
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground))",
];

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const KPICard = ({ indicator, icon: Icon }: { indicator: Indicator; icon: React.ElementType }) => {
  const isPositive = indicator.variation > 0;
  const isNeutral = indicator.variation === 0;

  return (
    <Card className="relative overflow-hidden">
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
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {indicator.unit === "R$"
                ? `R$ ${indicator.current.toFixed(2)}`
                : `${indicator.current.toFixed(2)}${indicator.unit
                    .replace("a.a.", "")
                    .replace("a.m.", "")
                    .trim()}`}
            </p>
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
      </CardContent>
    </Card>
  );
};

const IndicatorChart = ({ indicator, color }: { indicator: Indicator; color: string }) => {
  const data = indicator.history.map((h) => ({ ...h, date: h.date.substring(0, 5) }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{indicator.name} — Evolução</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${indicator.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                domain={["auto", "auto"]}
              />
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

const PortfolioSummary = ({ recommendations }: { recommendations: Recommendation[] }) => {
  const totals = useMemo(() => {
    const totalInvested = recommendations.reduce((s, r) => s + (r.invested_amount || 0), 0);
    const totalAllocation = recommendations.reduce((s, r) => s + (r.allocation_pct || 0), 0);
    const implemented = recommendations.filter((r) => r.status === "implementado").length;
    const pending = recommendations.length - implemented;
    return { totalInvested, totalAllocation, implemented, pending };
  }, [recommendations]);

  const allocationByType = useMemo(() => {
    const map = new Map<string, number>();
    recommendations.forEach((r) => {
      const key = r.product_type || "Outros";
      map.set(key, (map.get(key) || 0) + (r.allocation_pct || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [recommendations]);

  const allocationByRisk = useMemo(() => {
    const map = new Map<string, number>();
    recommendations.forEach((r) => {
      const key = r.risk_level || "—";
      map.set(key, (map.get(key) || 0) + (r.allocation_pct || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [recommendations]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Wallet className="h-3.5 w-3.5" /> Total recomendado
            </div>
            <p className="text-xl font-bold">{formatBRL(totals.totalInvested)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <PieChartIcon className="h-3.5 w-3.5" /> Alocação total
            </div>
            <p className="text-xl font-bold">{totals.totalAllocation.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Target className="h-3.5 w-3.5" /> Implementados
            </div>
            <p className="text-xl font-bold text-success">{totals.implemented}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Sparkles className="h-3.5 w-3.5" /> Pendentes
            </div>
            <p className="text-xl font-bold text-warning">{totals.pending}</p>
          </CardContent>
        </Card>
      </div>

      {recommendations.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Alocação por tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationByType}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(e) => `${e.value.toFixed(0)}%`}
                    >
                      {allocationByType.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Alocação por risco</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationByRisk}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(e) => `${e.value.toFixed(0)}%`}
                    >
                      {allocationByRisk.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const AdminInvestments = () => {
  const { clientId } = useClientId();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [clientProfile, setClientProfile] = useState<string | null>(null);

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

  const fetchRecommendations = async () => {
    if (!clientId) return;
    setLoadingRecs(true);
    try {
      const { data: recs } = await supabase
        .from("investment_recommendations")
        .select("*")
        .eq("client_id", clientId)
        .order("priority", { ascending: true });
      setRecommendations((recs as Recommendation[]) || []);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!clientId) return;
    fetchRecommendations();
    const fetchProfile = async () => {
      const { data: client } = await supabase
        .from("clients")
        .select("behavioral_profile")
        .eq("id", clientId)
        .maybeSingle();
      if (client?.behavioral_profile) {
        const bp = client.behavioral_profile as Record<string, unknown>;
        const profile = (bp.computed_profile as string) || null;
        setClientProfile(profile);
      }
    };
    fetchProfile();

    // Realtime: atualiza a carteira quando recomendações mudam (Parecer → Investimentos)
    const channel = supabase
      .channel(`investment-recs-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investment_recommendations",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchRecommendations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

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

  const { indicators, products } = data;
  const kpiIcons: Record<string, React.ElementType> = {
    selic: Percent,
    cdi: Percent,
    ipca: BarChart3,
    poupanca: ShieldCheck,
    dolar: DollarSign,
  };

  const filteredProducts = clientProfile
    ? products.filter((p) => p.profiles.includes(clientProfile))
    : products;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Investimentos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carteira do cliente, mercado e catálogo de produtos · atualizado{" "}
            {new Date(data.updatedAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {clientProfile && (
            <Badge variant="outline" className="text-[0.6875rem]">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Perfil: {profileLabels[clientProfile] || clientProfile}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="carteira" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="carteira" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Carteira do cliente</span>
            <span className="sm:hidden">Carteira</span>
          </TabsTrigger>
          <TabsTrigger value="mercado" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Mercado
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Catálogo
          </TabsTrigger>
        </TabsList>

        {/* TAB 1 — Carteira do cliente */}
        <TabsContent value="carteira" className="space-y-4 mt-0">
          {loadingRecs ? (
            <LoadingState variant="cards" rows={4} />
          ) : recommendations.length === 0 ? (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={Briefcase}
                  title="Nenhuma recomendação ainda"
                  description="As recomendações de investimento aparecerão aqui após serem criadas no Parecer ou geradas pela IA."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <PortfolioSummary recommendations={recommendations} />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Carteira recomendada</CardTitle>
                  <CardDescription className="text-xs">
                    {recommendations.length} produto(s) — ordenado por prioridade
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Alocação</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Risco</TableHead>
                        <TableHead>Liquidez</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendations.map((rec) => {
                        const status = statusLabels[rec.status] || statusLabels.sugerido;
                        return (
                          <TableRow key={rec.id}>
                            <TableCell>
                              <div className="font-medium text-foreground text-sm">{rec.product_name}</div>
                              {rec.rationale && (
                                <div className="text-[0.6875rem] text-muted-foreground mt-0.5 line-clamp-2 max-w-xs">
                                  {rec.rationale}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{rec.product_type}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {rec.allocation_pct?.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              {rec.invested_amount ? formatBRL(rec.invested_amount) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={riskColors[rec.risk_level] || "secondary"} className="text-[0.625rem]">
                                {rec.risk_level}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{rec.liquidity || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant as any} className="text-[0.625rem]">
                                {status.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB 2 — Mercado */}
        <TabsContent value="mercado" className="space-y-4 mt-0">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(indicators).map(([key, ind]) => (
              <KPICard key={key} indicator={ind} icon={kpiIcons[key] || Percent} />
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <IndicatorChart indicator={indicators.selic} color="hsl(var(--primary))" />
            <IndicatorChart indicator={indicators.ipca} color="hsl(var(--warning))" />
          </div>

          <Tabs defaultValue="cdi">
            <TabsList>
              <TabsTrigger value="cdi">CDI</TabsTrigger>
              <TabsTrigger value="dolar">Dólar</TabsTrigger>
              <TabsTrigger value="poupanca">Poupança</TabsTrigger>
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
          </Tabs>
        </TabsContent>

        {/* TAB 3 — Catálogo */}
        <TabsContent value="catalogo" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Catálogo de produtos</CardTitle>
                  <CardDescription className="text-xs">
                    Produtos disponíveis no mercado
                    {clientProfile && ` filtrados pelo perfil ${profileLabels[clientProfile]}`}
                  </CardDescription>
                </div>
                {clientProfile && (
                  <Badge variant="default" className="text-[0.625rem]">
                    {filteredProducts.length} produto(s)
                  </Badge>
                )}
              </div>
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
                  {filteredProducts.map((product) => (
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
