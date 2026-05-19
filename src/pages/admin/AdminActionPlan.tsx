import { useQuery } from "@tanstack/react-query";
import { useClientId } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, Circle } from "lucide-react";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d?: string | null) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR");
};

type SourceTable = "income" | "expenses" | "debts" | "assets" | "insurance" | "goals";

const SECTION_LABELS: Record<SourceTable, string> = {
  income: "Rendas",
  expenses: "Despesas",
  debts: "Dívidas",
  assets: "Patrimônio",
  insurance: "Seguros",
  goals: "Objetivos",
};

const SECTION_ORDER: SourceTable[] = [
  "income",
  "expenses",
  "debts",
  "assets",
  "insurance",
  "goals",
];

const GRID = "grid-cols-[minmax(0,1.8fr)_120px_110px_minmax(0,2fr)]";

const AdminActionPlan = () => {
  const { clientId } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data: c } = await supabase
        .from("clients")
        .select("user_id")
        .eq("id", clientId)
        .maybeSingle();
      if (!c?.user_id) return null;
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", c.user_id)
        .maybeSingle();
      return p;
    },
    enabled: !!clientId,
  });

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ["parecer_metas", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parecer_metas")
        .select("*")
        .eq("client_id", clientId)
        .order("source_table");
      return data || [];
    },
    enabled: !!clientId,
  });

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Selecione um cliente para ver as ações.
      </div>
    );
  }

  const bySection = SECTION_ORDER.reduce(
    (acc, section) => {
      acc[section] = metas.filter((m: any) => m.source_table === section);
      return acc;
    },
    {} as Record<SourceTable, any[]>,
  );

  const totalMetas = metas.length;
  const totalComMeta = metas.filter((m: any) => m.meta_text).length;
  const totalComPrazo = metas.filter((m: any) => m.prazo).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <h2 className="text-base font-semibold">
            Ver Ações — {client?.full_name ?? "Cliente"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalComMeta} de {totalMetas} ações com meta definida
            {totalComPrazo > 0 && ` · ${totalComPrazo} com prazo`}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            {totalComMeta} com meta
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="w-3 h-3 text-blue-500" />
            {totalComPrazo} com prazo
          </Badge>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      )}

      {!isLoading && totalMetas === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Circle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm">Nenhuma meta definida ainda.</p>
          <p className="text-xs mt-1">Vá para Plano de Ação para definir as metas.</p>
        </div>
      )}

      {SECTION_ORDER.map((section) => {
        const items = bySection[section];
        if (!items.length) return null;
        const comMeta = items.filter((i) => i.meta_text).length;

        return (
          <div key={section}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS[section]}
              </h3>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              {comMeta > 0 && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                  {comMeta} com meta
                </Badge>
              )}
            </div>

            {/* Cabeçalho das colunas */}
            <div className={`grid ${GRID} gap-3 pb-1 mb-1`}>
              <p className="text-xs text-muted-foreground font-medium">Item</p>
              <p className="text-xs text-muted-foreground font-medium">Valor atual</p>
              <p className="text-xs text-muted-foreground font-medium">Prazo</p>
              <p className="text-xs text-muted-foreground font-medium">Meta</p>
            </div>

            <div className="rounded-lg border border-border/60 bg-card px-4">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className={`grid ${GRID} gap-3 items-start py-3 border-b border-border/40 last:border-0`}
                >
                  {/* Nome */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.source_label}</p>
                  </div>

                  {/* Valor atual */}
                  <p className="text-sm text-muted-foreground tabular-nums pt-0.5">
                    {item.current_value > 0 ? formatBRL(Number(item.current_value)) : "—"}
                  </p>

                  {/* Prazo */}
                  <p className="text-sm tabular-nums pt-0.5">
                    {item.prazo ? (
                      <span className="text-blue-600 font-medium">{formatDate(item.prazo)}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </p>

                  {/* Meta */}
                  <div className="flex items-start gap-1.5 pt-0.5">
                    {item.meta_text ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-sm">{item.meta_text}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic">Sem meta definida</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="mt-6" />
          </div>
        );
      })}

      <JourneyFooterNav
        current="plano-acao"
        message="Ações visualizadas. Acompanhe a evolução do cliente."
      />
    </div>
  );
};

export default AdminActionPlan;
