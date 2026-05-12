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
  { path: "parecer",        label: "Parecer",        icon: PenLine,       step: 3 },
  { path: "plano-acao",     label: "Plano de Ação",  icon: Target,        step: 4 },
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

  useEffect(() => {
    if (!clientSlug) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: client } = await supabase
        .from("clients")
        .select("id, status, user_id, assigned_consultant")
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

      // V9: carrega resumo do plano em andamento
      const { data: plan } = await supabase
        .from("action_plans")
        .select("id, applied_variant")
        .eq("client_id", client.id)
        .maybeSingle();
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
        {/* Client header — modern, professional */}
        <div className="relative mb-5 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm">
          {/* Decorative accent ribbon */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--accent) / 0.5), transparent)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--accent) / 0.18), transparent 70%)",
            }}
          />

          <div className="relative flex flex-col xl:flex-row xl:items-center gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                style={{
                  background:
                    "linear-gradient(145deg, hsl(var(--accent) / 0.28), hsl(var(--accent) / 0.08))",
                  border: "1px solid hsl(var(--accent) / 0.22)",
                }}
              >
                <span className="text-base font-bold text-accent tracking-tight">
                  {getInitials(clientName)}
                </span>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card",
                    st.dot
                  )}
                  title={st.label}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-1">
                  Cliente
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight truncate">
                  {clientName || "Carregando..."}
                </h1>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant={st.variant as any} className="text-[10px]">
                    {st.label}
                  </Badge>
                  {activePlanInfo && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-accent/40 text-accent">
                      <Target className="h-3 w-3" />
                      Plano {activePlanInfo.variant} · {activePlanInfo.done}/{activePlanInfo.total} · {activePlanInfo.pct}%
                    </Badge>
                  )}
                  {consultant && (
                    <span className="text-[0.6875rem] text-muted-foreground inline-flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      {consultant}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Select value={consultant || "__none__"} onValueChange={handleConsultantChange}>
              <SelectTrigger className="h-9 w-full xl:w-auto xl:min-w-[170px] rounded-xl bg-primary text-primary-foreground border-primary hover:bg-primary/90 text-xs font-medium shadow-sm [&>svg]:text-primary-foreground">
                <UserCheck className="h-4 w-4 mr-1.5 shrink-0" />
                <SelectValue placeholder="Consultor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem consultor</SelectItem>
                {CONSULTANTS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* V9: Jornada da Consultoria — stepper consultivo 3+3 */}
        {(() => {
          const completed = completedByStatus[clientStatus] || [];

          const stateOf = (path: string, isActive: boolean): JourneyState => {
            if (isActive) return "active";
            if (disabled.includes(path)) return "locked";
            if (completed.includes(path)) return "completed";
            return "available";
          };

          // V9 slim+3D: card horizontal com profundidade premium
          const cardStyle = (state: JourneyState): React.CSSProperties => {
            switch (state) {
              case "active":
                return {
                  background: "linear-gradient(145deg, hsl(var(--accent) / 1) 0%, hsl(var(--accent) / 0.88) 60%, hsl(var(--accent) / 0.78) 100%)",
                  borderTop: "1px solid hsl(var(--accent-foreground) / 0.25)",
                  borderLeft: "1px solid hsl(var(--accent-foreground) / 0.12)",
                  borderRight: "1px solid hsl(var(--accent) / 0.6)",
                  borderBottom: "1px solid hsl(var(--accent) / 0.4)",
                  boxShadow: [
                    "0 1px 0 hsl(var(--accent-foreground) / 0.22) inset",
                    "0 -1px 0 hsl(0 0% 0% / 0.18) inset",
                    "0 0 0 3px hsl(var(--accent) / 0.18)",
                    "0 8px 22px -6px hsl(var(--accent) / 0.55)",
                    "0 18px 38px -12px hsl(var(--accent) / 0.4)",
                  ].join(", "),
                };
              case "completed":
                return {
                  background: "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--success) / 0.04) 100%)",
                  borderTop: "1px solid hsl(var(--success) / 0.4)",
                  borderLeft: "1px solid hsl(var(--success) / 0.22)",
                  borderRight: "1px solid hsl(var(--success) / 0.18)",
                  borderBottom: "1px solid hsl(var(--success) / 0.28)",
                  boxShadow: [
                    "0 1px 0 hsl(var(--success) / 0.12) inset",
                    "0 -1px 0 hsl(0 0% 0% / 0.05) inset",
                    "0 4px 10px -4px hsl(var(--success) / 0.2)",
                    "0 8px 22px -8px hsl(var(--success) / 0.18)",
                  ].join(", "),
                };
              case "available":
                return {
                  background: "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.2) 100%)",
                  borderTop: "1px solid hsl(var(--border) / 0.85)",
                  borderLeft: "1px solid hsl(var(--border) / 0.55)",
                  borderRight: "1px solid hsl(var(--border) / 0.55)",
                  borderBottom: "1px solid hsl(var(--border) / 0.95)",
                  boxShadow: [
                    "0 1px 0 hsl(var(--foreground) / 0.04) inset",
                    "0 -1px 0 hsl(0 0% 0% / 0.04) inset",
                    "0 2px 4px -1px hsl(0 0% 0% / 0.06)",
                    "0 6px 14px -4px hsl(0 0% 0% / 0.08)",
                  ].join(", "),
                };
              case "locked":
                return {
                  background: "linear-gradient(145deg, hsl(var(--muted) / 0.35) 0%, hsl(var(--muted) / 0.2) 100%)",
                  border: "1px solid hsl(var(--border) / 0.4)",
                  boxShadow: [
                    "0 1px 2px hsl(0 0% 0% / 0.05) inset",
                    "0 2px 4px hsl(0 0% 0% / 0.05) inset",
                  ].join(", "),
                };
            }
          };

          const cardClasses = (state: JourneyState) =>
            cn(
              "group relative flex items-center gap-2.5 w-full h-full",
              "rounded-xl px-3 py-2 transition-all duration-300 ease-out overflow-hidden",
              "min-h-[60px] min-w-0 select-none",
              state === "active" && "text-accent-foreground",
              state === "completed" && "text-foreground hover:-translate-y-0.5",
              state === "available" && "text-foreground hover:-translate-y-0.5 cursor-pointer",
              state === "locked" && "text-muted-foreground/40 cursor-not-allowed",
            );

          const stepLabelClasses = (state: JourneyState) =>
            cn(
              "text-[9px] font-semibold uppercase tracking-[0.14em] leading-none mb-0.5",
              state === "active" && "text-accent-foreground/80",
              state === "completed" && "text-success",
              state === "available" && "text-muted-foreground/75",
              state === "locked" && "text-muted-foreground/40",
            );

          const iconBoxStyle = (state: JourneyState): React.CSSProperties => {
            switch (state) {
              case "active":
                return {
                  background: "linear-gradient(145deg, hsl(var(--accent-foreground) / 0.28) 0%, hsl(var(--accent-foreground) / 0.12) 100%)",
                  border: "1px solid hsl(var(--accent-foreground) / 0.22)",
                  boxShadow: [
                    "0 1px 0 hsl(var(--accent-foreground) / 0.2) inset",
                    "0 -1px 0 hsl(0 0% 0% / 0.15) inset",
                    "0 2px 4px hsl(0 0% 0% / 0.12)",
                  ].join(", "),
                };
              case "completed":
                return {
                  background: "linear-gradient(145deg, hsl(var(--success) / 0.18) 0%, hsl(var(--success) / 0.08) 100%)",
                  border: "1px solid hsl(var(--success) / 0.3)",
                  boxShadow: [
                    "0 1px 0 hsl(0 0% 100% / 0.4) inset",
                    "0 -1px 0 hsl(var(--success) / 0.15) inset",
                  ].join(", "),
                };
              case "available":
                return {
                  background: "linear-gradient(145deg, hsl(var(--muted) / 0.7) 0%, hsl(var(--muted) / 0.45) 100%)",
                  border: "1px solid hsl(var(--border) / 0.6)",
                  boxShadow: [
                    "0 1px 0 hsl(0 0% 100% / 0.35) inset",
                    "0 -1px 0 hsl(0 0% 0% / 0.06) inset",
                  ].join(", "),
                };
              case "locked":
                return {
                  background: "hsl(var(--muted) / 0.5)",
                  border: "1px solid hsl(var(--border) / 0.4)",
                };
            }
          };

          const iconBoxClasses = (state: JourneyState) =>
            cn(
              "h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0",
              state === "available" && "group-hover:scale-105",
            );

          const iconClasses = (state: JourneyState) =>
            cn(
              "h-[16px] w-[16px] transition-colors",
              state === "active" && "text-accent-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]",
              state === "completed" && "text-success",
              state === "available" && "text-foreground/70 group-hover:text-accent",
              state === "locked" && "text-muted-foreground/45",
            );

          const titleClasses = (state: JourneyState) =>
            cn(
              "text-[12.5px] font-semibold tracking-tight leading-tight truncate",
              state === "active" && "text-accent-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]",
              state === "completed" && "text-foreground",
              state === "available" && "text-foreground",
              state === "locked" && "text-muted-foreground/55",
            );

          const renderCard = (tab: (typeof tabs)[number]) => {
            const isLocked = disabled.includes(tab.path);
            return (
              <NavLink
                key={tab.path}
                to={`/admin/cliente/${clientSlug}/${tab.path}`}
                onClick={(e) => isLocked && e.preventDefault()}
                aria-disabled={isLocked}
                className="flex-1 min-w-0 outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{ perspective: "800px" }}
              >
                {({ isActive }) => {
                  const state = stateOf(tab.path, isActive && !isLocked);
                  const Icon = tab.icon;
                  const stepText =
                    state === "completed"
                      ? "Concluído"
                      : state === "locked"
                        ? "Bloqueado"
                        : `Etapa ${String(tab.step).padStart(2, "0")}`;
                  return (
                    <div
                      className={cardClasses(state)}
                      style={{ ...cardStyle(state), transformStyle: "preserve-3d" }}
                    >
                      {/* Brilho top diagonal (highlight 3D) */}
                      {(state === "active" || state === "available" || state === "completed") && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 top-0 h-px"
                          style={{
                            background:
                              state === "active"
                                ? "linear-gradient(90deg, transparent, hsl(var(--accent-foreground) / 0.35), transparent)"
                                : state === "completed"
                                  ? "linear-gradient(90deg, transparent, hsl(var(--success) / 0.3), transparent)"
                                  : "linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.08), transparent)",
                          }}
                        />
                      )}

                      {/* Glow esferico no canto do card ativo */}
                      {state === "active" && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full"
                          style={{
                            background:
                              "radial-gradient(circle, hsl(var(--accent-foreground) / 0.18) 0%, transparent 65%)",
                            filter: "blur(8px)",
                          }}
                        />
                      )}

                      {/* Icon box 3D */}
                      <div className={iconBoxClasses(state)} style={iconBoxStyle(state)}>
                        <Icon className={iconClasses(state)} strokeWidth={2} />
                      </div>

                      <div className="min-w-0 flex-1 relative">
                        <span className={stepLabelClasses(state)}>{stepText}</span>
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

                      {/* Barra lateral 3D do card ativo */}
                      {state === "active" && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                          style={{
                            background: "linear-gradient(180deg, hsl(var(--accent-foreground) / 0.5), hsl(var(--accent-foreground) / 0.2))",
                            boxShadow: "0 0 8px hsl(var(--accent-foreground) / 0.3)",
                          }}
                        />
                      )}

                      {/* Shine sweep no card ativo (animacao) */}
                      {state === "active" && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
                        >
                          <span
                            className="absolute inset-y-0 w-12 -skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{
                              background: "linear-gradient(90deg, transparent, hsl(var(--accent-foreground) / 0.18), transparent)",
                              animation: "shimmerSweep 2.4s ease-in-out infinite",
                              animationDelay: "0.5s",
                            }}
                          />
                        </span>
                      )}
                    </div>
                  );
                }}
              </NavLink>
            );
          };

          // Seta horizontal slim entre cards (com profundidade sutil)
          const HArrow = ({ flowing = false }: { flowing?: boolean }) => (
            <div className="shrink-0 self-center flex items-center justify-center w-5 lg:w-6" aria-hidden>
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center transition-all"
                style={
                  flowing
                    ? {
                        background: "linear-gradient(145deg, hsl(var(--accent) / 0.15) 0%, hsl(var(--accent) / 0.05) 100%)",
                        border: "1px solid hsl(var(--accent) / 0.25)",
                        boxShadow: "0 1px 0 hsl(0 0% 100% / 0.18) inset, 0 2px 4px -1px hsl(var(--accent) / 0.18)",
                      }
                    : {
                        background: "linear-gradient(145deg, hsl(var(--muted) / 0.4) 0%, hsl(var(--muted) / 0.2) 100%)",
                        border: "1px solid hsl(var(--border) / 0.5)",
                        boxShadow: "0 1px 0 hsl(0 0% 100% / 0.12) inset",
                      }
                }
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    flowing ? "text-accent" : "text-muted-foreground/45",
                  )}
                  strokeWidth={2.5}
                />
              </div>
            </div>
          );

          // Cada seta horizontal "flui" se o card anterior estiver concluído
          const flowsAfter = (path: string) => completed.includes(path);
          const verticalFlows =
            completed.includes("parecer") || completed.includes("plano-acao");

          return (
            <div className="mb-5">
              {/* Desktop / tablet: 2 linhas de 3 cards com bridge vertical */}
              <div className="hidden md:block">
                <div className="flex items-stretch gap-1.5 lg:gap-2">
                  {renderCard(tabs[0])}
                  <HArrow flowing={flowsAfter("onboarding")} />
                  {renderCard(tabs[1])}
                  <HArrow flowing={flowsAfter("diagnostico")} />
                  {renderCard(tabs[2])}
                </div>

                {/* Bridge vertical 3D entre as duas linhas */}
                <div className="flex justify-center py-1.5" aria-hidden>
                  <div className="flex flex-col items-center">
                    <div
                      className={cn("h-3 w-[2px] rounded-full transition-colors")}
                      style={{
                        background: verticalFlows
                          ? "linear-gradient(180deg, hsl(var(--accent) / 0.65), hsl(var(--accent) / 0.35))"
                          : "linear-gradient(180deg, hsl(var(--muted-foreground) / 0.3), hsl(var(--muted-foreground) / 0.15))",
                        boxShadow: verticalFlows
                          ? "0 0 6px hsl(var(--accent) / 0.3)"
                          : undefined,
                      }}
                    />
                    <div
                      className="h-5 w-5 -mt-0.5 rounded-full flex items-center justify-center"
                      style={
                        verticalFlows
                          ? {
                              background: "linear-gradient(145deg, hsl(var(--accent) / 0.18) 0%, hsl(var(--accent) / 0.06) 100%)",
                              border: "1px solid hsl(var(--accent) / 0.28)",
                              boxShadow: "0 1px 0 hsl(0 0% 100% / 0.18) inset, 0 2px 5px -1px hsl(var(--accent) / 0.2)",
                            }
                          : {
                              background: "linear-gradient(145deg, hsl(var(--muted) / 0.45) 0%, hsl(var(--muted) / 0.22) 100%)",
                              border: "1px solid hsl(var(--border) / 0.5)",
                              boxShadow: "0 1px 0 hsl(0 0% 100% / 0.14) inset",
                            }
                      }
                    >
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-colors",
                          verticalFlows ? "text-accent" : "text-muted-foreground/50",
                        )}
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-stretch gap-1.5 lg:gap-2">
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

        {/* Page content with transition */}
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </ClientProvider>
  );
};

export default AdminClientLayout;
