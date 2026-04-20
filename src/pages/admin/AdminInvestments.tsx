import { useEffect, useState } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, RefreshCw, DollarSign, Percent, ShieldCheck, BarChart3, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
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
  products: Product[];
  updatedAt: string;
}

const riskColors: Record<string, string> = {
  "Muito Baixo": "success",
  "Baixo": "success",
  "Médio": "warning",
  "Alto": "destructive",
};

const profileLabels: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

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
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{indicator.name}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {indicator.unit === "R$" ? `R$ ${indicator.current.toFixed(2)}` : `${indicator.current.toFixed(2)}${indicator.unit.replace("a.a.", "").replace("a.m.", "").trim()}`}
            </p>
            <span className="text-[0.6875rem] text-muted-foreground">{indicator.unit}</span>
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isNeutral ? "bg-muted text-muted-foreground" : isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {isNeutral ? <Minus className="h-6 w-6" /> : isPositive ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
            {Math.abs(indicator.variation).toFixed(2)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const IndicatorChart = ({ indicator, color }: { indicator: Indicator; color: string }) => {
  const data = indicator.history.map(h => ({ ...h, date: h.date.substring(0, 5) }));

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
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="value" stroke={color} fill={`url(#gradient-${indicator.name})`} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminInvestments = () => {
  const { clientId } = useClientId();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!clientId) return;
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
                <RefreshCw className="h-6 w-6 mr-2" /> Tentar novamente
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
    ? products.filter(p => p.profiles.includes(clientProfile))
    : products;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Investimentos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dados atualizados em {new Date(data.updatedAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className="h-6 w-6 mr-1.5" /> Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(indicators).map(([key, ind]) => (
          <KPICard key={key} indicator={ind} icon={kpiIcons[key] || Percent} />
        ))}
      </div>

      {/* Client profile recommendation */}
      {clientProfile && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Perfil do cliente: <span className="text-primary capitalize">{profileLabels[clientProfile] || clientProfile}</span>
              </p>
              <p className="text-xs text-muted-foreground">Produtos filtrados com base no perfil comportamental</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <IndicatorChart indicator={indicators.selic} color="hsl(var(--primary))" />
        <IndicatorChart indicator={indicators.ipca} color="hsl(var(--warning))" />
      </div>

      {/* Products table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Produtos de Investimento</CardTitle>
            {clientProfile && (
              <Badge variant="default" className="text-[0.625rem]">
                Filtrado: {profileLabels[clientProfile] || clientProfile}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
                    <Badge variant={riskColors[product.risk] as any}>{product.risk}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{product.liquidity}</TableCell>
                  <TableCell className="text-xs">{product.minInvestment}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {product.profiles.map(p => (
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

      {/* Additional charts */}
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
    </div>
  );
};

export default AdminInvestments;
