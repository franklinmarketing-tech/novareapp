import { Fragment, useEffect, useState } from "react";
import { useParams, NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardList,
  BarChart3,
  LineChart,
  FileText,
  PenLine,
  UserCheck,
  Target,
  Check,
  Lock,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { ClientProvider } from "@/contexts/ClientContext";

const statusMap: Record<string, { label: string; variant: string; dot: string }> = {
  onboarding_pendente: { label: "Onboarding Pendente", variant: "warning", dot: "bg-amber-500" },
  em_diagnostico: { label: "Em Diagnóstico", variant: "accent", dot: "bg-blue-500" },
  em_acompanhamento: { label: "Em Acompanhamento", variant: "success", dot: "bg-emerald-500" },
};

const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// V9: jornada da consultoria em 6 etapas
const tabs = [
  { path: "onboarding",     label: "Onboarding",     icon: ClipboardList, step: 1 },
  { path: "diagnostico",    label: "Diagnóstico",    icon: BarChart3,     step: 2 },
  { path: "parecer",        label: "Plano de Ação",  icon: Target,        step: 3 },
  { path: "plano-acao",     label: "Ver Ações",      icon: PenLine,       step: 4 },
  { path: "acompanhamento", label: "Acompanhamento", icon: LineChart,     step: 5 },
  { path: "relatorio",      label: "Relatório",      icon: FileText,      step: 6 },
];

const CONSULTANTS = ["Leonardo", "Jefferson"];

const disabledByStatus: Record<string, string[]> = {
  onboarding_pendente: ["diagnostico", "parecer", "plano-acao", "acompanhamento", "relatorio"],
};

// Etapas marcadas como concluidas com base no status do cliente
const completedByStatus: Record<string, string[]> = {
  onboarding_pendente: [],
  em_diagnostico: ["onboarding"],
  em_acompanhamento: ["onboarding", "diagnostico", "parecer", "plano-acao"],
};

type JourneyState = "active" | "completed" | "available" | "locked";

const AdminClientLayout = () => {
  const { clientSlug } = useParams();
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientStatus, setClientStatus] = useState("onboarding_pendente");
  const [consultant, setConsultant] = useState<string>("");
  const [loading, setLoading] = useState(true);
  // V9: progresso do plano em andamento (mostrado no header)
  const [activePlanInfo, setActivePlanInfo] = useState<{
    variant: string;
    done: number;
    total: number;
    pct: number;
  } | null>(null);

  // V9: timestamps de quando cada etapa foi efetivamente concluida/iniciada
  const [stageTimestamps, setStageTimestamps] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!clientSlug) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: client } = await supabase
        .from("clients")
        .select("id, status, user_id, assigned_consultant, created_at, updated_at")
        .eq("slug", clientSlug)
        .maybeSingle();
      if (!client) { setLoading(false); return; }
      setClientId(client.id);
      setClientStatus(client.status);
      setConsultant(client.assigned_consultant || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", client.user_id)
        .maybeSingle();
      if (profile) setClientName(profile.full_name);

      // V9: carrega timestamps de cada etapa (de varias tabelas em paralelo)
      const [planRes, diagRes, parecerRes, snapRes] = await Promise.all([
        supabase
          .from("action_plans")
          .select("id, applied_variant, applied_at")
          .eq("client_id", client.id)
          .maybeSingle(),
        supabase
          .from("diagnosis")
          .select("updated_at")
          .eq("client_id", client.id)
          .maybeSingle(),
        supabase
          .from("consultant_notes")
          .select("updated_at")
          .eq("client_id", client.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("monthly_closings")
          .select("closed_at")
          .eq("client_id", client.id)
          .eq("status", "fechado")
          .order("closed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const plan = planRes.data;

      setStageTimestamps({
        onboarding: (client as any).created_at || null,
        diagnostico: diagRes.data?.updated_at || null,
        parecer: parecerRes.data?.updated_at || null,
        "plano-acao": plan?.applied_at || null,
        acompanhamento: snapRes.data?.closed_at || null,
        relatorio: null,
      });

      if (plan?.applied_variant && plan.id) {
        const { data: items } = await supabase
          .from("action_items")
          .select("status")
          .eq("action_plan_id", plan.id)
          .is("parent_id", null);
        const rows = items || [];
        const done = rows.filter((i) => i.status === "concluido").length;
        const total = rows.length;
        setActivePlanInfo({
          variant: plan.applied_variant,
          done,
          total,
          pct: total > 0 ? Math.round((done / total) * 100) : 0,
        });
      } else {
        setActivePlanInfo(null);
      }
      setLoading(false);
    };
    fetchData();
  }, [clientSlug]);

  const handleConsultantChange = async (value: string) => {
    if (!clientId) return;
    const val = value === "__none__" ? null : value;
    setConsultant(val || "");
    await supabase.from("clients").update({ assigned_consultant: val }).eq("id", clientId);
  };

  const st = statusMap[clientStatus] || statusMap.onboarding_pendente;
  const disabled = disabledByStatus[clientStatus] || [];

  if (loading || !clientId) {
    return <div className="flex items-center justify-center py-20"><span className="animate-pulse text-muted-foreground">Carregando...</span></div>;
  }

  return (
    <ClientProvider value={{ clientId, clientSlug: clientSlug || "" }}>
      <div>
        <div
          className="relative mb-3 overflow-hidden rounded-xl"
          style={{
            background:
              "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.25) 100%)",
            border: "1.5px solid hsl(var(--foreground) / 0.16)",
            borderTopColor: "hsl(var(--foreground) / 0.22)",
            boxShadow: [
              "0 1px 0 hsl(0 0% 100% / 0.55) inset",
              "0 -1px 0 hsl(0 0% 0% / 0.04) inset",
              "0 2px 4px -1px hsl(0 0% 0% / 0.05)",
              "0 6px 14px -8px hsl(0 0% 0% / 0.08)",
            ].join(", "),
          }}
        >
          {/* Accent ribbon top (azul Novare) */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)",
            }}
          />

          <div className="relative flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5">
            {/* Avatar — quadrado pequeno com status dot */}
            <div
              className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background:
                  "linear-gradient(145deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.06) 100%)",
                border: "1px solid hsl(var(--primary) / 0.3)",
                borderTopColor: "hsl(var(--primary) / 0.45)",
                boxShadow:
                  "0 1px 0 hsl(0 0% 100% / 0.4) inset, 0 1px 3px hsl(var(--primary) / 0.15)",
              }}
            >
              <span className="text-[12px] sm:text-[13px] font-bold text-primary tracking-tight">
                {getInitials(clientName)}
              </span>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card",
                  st.dot,
                )}
                title={st.label}
              />
            </div>

            {/* Nome + badges em linha unica */}
            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <h1 className="text-[13px] sm:text-sm font-bold text-foreground tracking-tight leading-tight truncate max-w-[280px] sm:max-w-none">
                {clientName || "Carregando..."}
              </h1>
              <Badge variant={st.variant as any} className="text-[10px] shrink-0">
                {st.label}
              </Badge>
              {activePlanInfo && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 border-primary/40 text-primary shrink-0"
                >
                  <Target className="h-3 w-3" />
                  Plano {activePlanInfo.variant}
                </Badge>
              )}
            </div>

            {/* Consultor dropdown — compacto */}
            <Select value={consultant || "__none__"} onValueChange={handleConsultantChange}>
              <SelectTrigger
                className="h-8 w-auto min-w-[120px] sm:min-w-[140px] rounded-lg text-xs font-medium shrink-0 gap-1.5 px-2.5 [&>svg]:text-primary-foreground"
                style={{
                  background:
                    "linear-gradient(145deg, hsl(var(--primary) / 1) 0%, hsl(var(--primary) / 0.88) 100%)",
                  border: "1px solid hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  boxShadow:
                    "0 1px 0 hsl(0 0% 100% / 0.18) inset, 0 1px 3px hsl(var(--primary) / 0.18)",
                }}
              >
                <UserCheck className="h-3.5 w-3.5 shrink-0" />
                <SelectValue placeholder="Consultor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem consultor</SelectItem>
                {CONSULTANTS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Divisor sutil entre Header e Stepper */}
          <div
            className="h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.12), transparent)",
            }}
          />

        {/* V9: Jornada da Consultoria — stepper consultivo 3+3 */}
        {(() => {
          const completed = completedByStatus[clientStatus] || [];

          const stateOf = (path: string, isActive: boolean): JourneyState => {
            if (isActive) return "active";
            if (disabled.includes(path)) return "locked";
            if (completed.includes(path)) return "completed";
            return "available";
          };

          // V9 CLEAN: cards minimalistas — sem glow nem sombras pesadas
          const cardStyle = (state: JourneyState): React.CSSProperties => {
            switch (state) {
              case "active":
                return {
                  background: "hsl(var(--primary))",
                  border: "1px solid hsl(var(--primary))",
                  boxShadow: "none",
                };
              case "completed":
                return {
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--success) / 0.4)",
                  boxShadow: "none",
                };
              case "available":
                return {
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "none",
                };
              case "locked":
                return {
                  background: "hsl(var(--muted) / 0.3)",
                  border: "1px solid hsl(var(--border) / 0.6)",
                  boxShadow: "none",
                };
            }
          };

          const cardClasses = (state: JourneyState) =>
            cn(
              "group relative flex items-center gap-2 w-full h-full",
              "rounded-md px-2 py-1.5 transition-colors duration-200 overflow-hidden",
              "min-h-[44px] min-w-0 select-none",
              state === "active" && "text-primary-foreground",
              state === "completed" && "text-foreground hover:bg-muted/30 cursor-pointer",
              state === "available" && "text-foreground hover:bg-muted/30 cursor-pointer",
              state === "locked" && "text-muted-foreground/50 cursor-not-allowed",
            );

          const stepLabelClasses = (state: JourneyState) =>
            cn(
              "text-[9px] font-semibold uppercase tracking-[0.14em] leading-none mb-0.5",
              state === "active" && "text-primary-foreground/80",
              state === "completed" && "text-success",
              state === "available" && "text-muted-foreground/75",
              state === "locked" && "text-muted-foreground/40",
            );

          const iconBoxStyle = (state: JourneyState): React.CSSProperties => {
            switch (state) {
              case "active":
                return {
                  background: "hsl(0 0% 100% / 0.16)",
                  border: "1px solid hsl(0 0% 100% / 0.22)",
                  boxShadow: "none",
                };
              case "completed":
                return {
                  background: "hsl(var(--success) / 0.12)",
                  border: "1px solid hsl(var(--success) / 0.25)",
                  boxShadow: "none",
                };
              case "available":
                return {
                  background: "hsl(var(--muted) / 0.5)",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "none",
                };
              case "locked":
                return {
                  background: "hsl(var(--muted) / 0.4)",
                  border: "1px solid hsl(var(--border) / 0.4)",
                  boxShadow: "none",
                };
            }
          };

          const iconBoxClasses = (_state: JourneyState) =>
            "h-7 w-7 rounded flex items-center justify-center shrink-0";

          const iconClasses = (state: JourneyState) =>
            cn(
              "h-[14px] w-[14px] transition-all duration-300",
              state === "active" && "text-primary-foreground drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.3)]",
              state === "completed" && "text-success",
              state === "available" && "text-foreground/70 group-hover:text-primary group-hover:scale-105",
              state === "locked" && "text-muted-foreground/45",
            );

          const titleClasses = (state: JourneyState) =>
            cn(
              "text-[12px] font-semibold tracking-tight leading-tight truncate",
              state === "active" && "text-primary-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]",
              state === "completed" && "text-foreground",
              state === "available" && "text-foreground",
              state === "locked" && "text-muted-foreground/55",
            );

          // V9: formata um timestamp como "10/05" (curto) ou "há X dias"
          const formatStageTime = (iso: string | null, state: JourneyState): string | null => {
            if (state === "locked") return "Aguardando";
            if (!iso) return null;
            const date = new Date(iso);
            if (isNaN(date.getTime())) return null;
            const diffMs = Date.now() - date.getTime();
            const diffDays = Math.floor(diffMs / 86400000);
            if (state === "active") {
              if (diffDays === 0) return "Iniciada hoje";
              if (diffDays === 1) return "há 1 dia";
              if (diffDays < 30) return `há ${diffDays} dias`;
              return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            }
            // completed
            return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
          };

          const renderCard = (tab: (typeof tabs)[number]) => {
            const isLocked = disabled.includes(tab.path);
            return (
              <NavLink
                key={tab.path}
                to={`/admin/cliente/${clientSlug}/${tab.path}`}
                onClick={(e) => isLocked && e.preventDefault()}
                aria-disabled={isLocked}
                className="flex-1 min-w-0 outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{ perspective: "800px" }}
              >
                {({ isActive }) => {
                  const state = stateOf(tab.path, isActive && !isLocked);
                  const Icon = tab.icon;
                  return (
                    <div
                      className={cardClasses(state)}
                      style={{ ...cardStyle(state), transformStyle: "preserve-3d" }}
                    >
                      {/* Icon box */}
                      <div className={iconBoxClasses(state)} style={iconBoxStyle(state)}>
                        <Icon className={iconClasses(state)} strokeWidth={2} />
                      </div>

                      <div className="min-w-0 flex-1 relative">
                        <span className={cn(titleClasses(state), "block")}>{tab.label}</span>
                      </div>

                      {/* Status chip a direita (3D) */}
                      {state === "completed" && (
                        <span
                          className="inline-flex items-center justify-center h-[20px] w-[20px] rounded-full shrink-0"
                          style={{
                            background: "linear-gradient(145deg, hsl(var(--success) / 0.25) 0%, hsl(var(--success) / 0.1) 100%)",
                            border: "1px solid hsl(var(--success) / 0.35)",
                            boxShadow: "0 1px 0 hsl(0 0% 100% / 0.3) inset, 0 1px 3px hsl(var(--success) / 0.15)",
                          }}
                        >
                          <Check className="h-[12px] w-[12px] text-success" strokeWidth={3} />
                        </span>
                      )}
                      {state === "locked" && (
                        <span
                          className="inline-flex items-center justify-center h-[20px] w-[20px] rounded-full shrink-0"
                          style={{
                            background: "hsl(var(--muted) / 0.7)",
                            border: "1px solid hsl(var(--border) / 0.5)",
                            boxShadow: "0 1px 2px hsl(0 0% 0% / 0.05) inset",
                          }}
                        >
                          <Lock className="h-2.5 w-2.5 text-muted-foreground/55" strokeWidth={2.5} />
                        </span>
                      )}

                    </div>
                  );
                }}
              </NavLink>
            );
          };

          // Seta horizontal premium entre cards
          const HArrow = ({ flowing = false }: { flowing?: boolean }) => (
            <div className="shrink-0 self-center flex items-center justify-center w-5 lg:w-6 relative" aria-hidden>
              {/* Trilho horizontal opcional (apenas quando flowing) */}
              {flowing && (
                <div
                  className="absolute h-px w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.45) 50%, hsl(var(--primary) / 0.05))",
                  }}
                />
              )}
              <div
                className="relative h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300"
                style={
                  flowing
                    ? {
                        background:
                          "linear-gradient(145deg, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.08) 100%)",
                        border: "1px solid hsl(var(--primary) / 0.45)",
                        borderTopColor: "hsl(var(--primary) / 0.6)",
                        boxShadow: [
                          "0 1px 0 hsl(0 0% 100% / 0.5) inset",
                          "0 -1px 0 hsl(var(--primary) / 0.15) inset",
                          "0 2px 4px -1px hsl(var(--primary) / 0.22)",
                          "0 0 0 1px hsl(var(--primary) / 0.12)",
                        ].join(", "),
                      }
                    : {
                        background:
                          "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.4) 100%)",
                        border: "1px solid hsl(var(--foreground) / 0.18)",
                        borderTopColor: "hsl(var(--foreground) / 0.24)",
                        boxShadow: [
                          "0 1px 0 hsl(0 0% 100% / 0.6) inset",
                          "0 -1px 0 hsl(0 0% 0% / 0.05) inset",
                          "0 1px 2px hsl(0 0% 0% / 0.06)",
                        ].join(", "),
                      }
                }
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-all",
                    flowing
                      ? "text-primary drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
                      : "text-muted-foreground/65",
                  )}
                  strokeWidth={2.75}
                />
              </div>
            </div>
          );

          // Cada seta horizontal "flui" se o card anterior estiver concluído
          const flowsAfter = (path: string) => completed.includes(path);
          const verticalFlows =
            completed.includes("parecer") || completed.includes("plano-acao");

          return (
            <div className="px-2.5 py-2 sm:px-3 sm:py-2.5">

              {/* Desktop / tablet: 2 linhas de 3 cards com bridge vertical */}
              <div className="hidden md:block">
                <div className="flex items-stretch gap-2 lg:gap-2.5">
                  {renderCard(tabs[0])}
                  <HArrow flowing={flowsAfter("onboarding")} />
                  {renderCard(tabs[1])}
                  <HArrow flowing={flowsAfter("diagnostico")} />
                  {renderCard(tabs[2])}
                </div>

                {/* Bridge vertical ultra compacto entre as duas linhas */}
                <div className="flex justify-center py-1.5" aria-hidden>
                  <div className="flex flex-col items-center">
                    <div
                      className="h-1 w-[2px] rounded-full transition-colors"
                      style={{
                        background: verticalFlows
                          ? "linear-gradient(180deg, hsl(var(--primary) / 0.7) 0%, hsl(var(--primary) / 0.35) 100%)"
                          : "linear-gradient(180deg, hsl(var(--foreground) / 0.3) 0%, hsl(var(--foreground) / 0.12) 100%)",
                        boxShadow: verticalFlows
                          ? "0 0 6px hsl(var(--primary) / 0.4)"
                          : undefined,
                      }}
                    />
                    <div
                      className="h-4 w-4 -mt-0.5 rounded-full flex items-center justify-center transition-all"
                      style={
                        verticalFlows
                          ? {
                              background:
                                "linear-gradient(145deg, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.08) 100%)",
                              border: "1px solid hsl(var(--primary) / 0.45)",
                              borderTopColor: "hsl(var(--primary) / 0.6)",
                              boxShadow: [
                                "0 1px 0 hsl(0 0% 100% / 0.5) inset",
                                "0 2px 5px -1px hsl(var(--primary) / 0.25)",
                              ].join(", "),
                            }
                          : {
                              background:
                                "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.4) 100%)",
                              border: "1px solid hsl(var(--foreground) / 0.2)",
                              borderTopColor: "hsl(var(--foreground) / 0.26)",
                              boxShadow: "0 1px 0 hsl(0 0% 100% / 0.55) inset, 0 1px 2px hsl(0 0% 0% / 0.05)",
                            }
                      }
                    >
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-all",
                          verticalFlows
                            ? "text-primary drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
                            : "text-muted-foreground/65",
                        )}
                        strokeWidth={2.75}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-stretch gap-2 lg:gap-2.5">
                  {renderCard(tabs[3])}
                  <HArrow flowing={flowsAfter("plano-acao")} />
                  {renderCard(tabs[4])}
                  <HArrow flowing={flowsAfter("acompanhamento")} />
                  {renderCard(tabs[5])}
                </div>
              </div>

              {/* Mobile: stepper horizontal compacto */}
              <div className="md:hidden -mx-4 px-4">
                <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2 scrollbar-none overscroll-x-contain">
                  {tabs.map((tab, i) => (
                    <Fragment key={tab.path}>
                      <div className="shrink-0 w-[180px]">{renderCard(tab)}</div>
                      {i < tabs.length - 1 && (
                        <div className="shrink-0 self-center">
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5",
                              flowsAfter(tab.path) ? "text-accent/70" : "text-muted-foreground/30",
                            )}
                            strokeWidth={2.5}
                          />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        </div>
        {/* /Painel unificado: Header + Stepper */}

        {/* Page content with transition */}
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </ClientProvider>
  );
};

export default AdminClientLayout;
