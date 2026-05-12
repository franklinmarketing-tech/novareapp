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
        {/* V9 PREMIUM: Client header — slim, profissional, uma linha */}
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
          {/* Accent ribbon top */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--accent) / 0.55), transparent)",
            }}
          />

          <div className="relative flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
            {/* Avatar — quadrado pequeno com status dot */}
            <div
              className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background:
                  "linear-gradient(145deg, hsl(var(--accent) / 0.32) 0%, hsl(var(--accent) / 0.1) 100%)",
                border: "1px solid hsl(var(--accent) / 0.32)",
                borderTopColor: "hsl(var(--accent) / 0.5)",
                boxShadow:
                  "0 1px 0 hsl(0 0% 100% / 0.4) inset, 0 1px 3px hsl(var(--accent) / 0.18)",
              }}
            >
              <span className="text-[13px] sm:text-sm font-bold text-accent tracking-tight">
                {getInitials(clientName)}
              </span>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                  st.dot,
                )}
                title={st.label}
              />
            </div>

            {/* Nome + badges em linha unica */}
            <div className="min-w-0 flex-1 flex items-center gap-2.5 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight truncate max-w-[280px] sm:max-w-none">
                {clientName || "Carregando..."}
              </h1>
              <Badge variant={st.variant as any} className="text-[10px] shrink-0">
                {st.label}
              </Badge>
              {activePlanInfo && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 border-accent/40 text-accent shrink-0"
                >
                  <Target className="h-3 w-3" />
                  Plano {activePlanInfo.variant} · {activePlanInfo.done}/{activePlanInfo.total}
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

          // V9 PREMIUM: cards de menu profissional com profundidade real
          const cardStyle = (state: JourneyState): React.CSSProperties => {
            switch (state) {
              case "active":
                return {
                  background:
                    "linear-gradient(140deg, hsl(16 88% 60%) 0%, hsl(var(--accent)) 45%, hsl(16 75% 48%) 100%)",
                  border: "1px solid hsl(16 70% 42%)",
                  borderTopColor: "hsl(16 95% 70%)",
                  borderLeftColor: "hsl(16 90% 65%)",
                  boxShadow: [
                    // inset highlights — luz no topo + sombra no fundo (3D real)
                    "0 1.5px 0 hsl(0 0% 100% / 0.32) inset",
                    "0 -2px 0 hsl(0 0% 0% / 0.18) inset",
                    "1px 0 0 hsl(0 0% 100% / 0.18) inset",
                    "-1px 0 0 hsl(0 0% 0% / 0.1) inset",
                    // outer glow accent (anel halo)
                    "0 0 0 1px hsl(var(--accent) / 0.45)",
                    "0 0 0 5px hsl(var(--accent) / 0.16)",
                    // sombras ambientais em camadas (depth)
                    "0 6px 14px -4px hsl(var(--accent) / 0.55)",
                    "0 14px 32px -8px hsl(var(--accent) / 0.45)",
                    "0 24px 48px -16px hsl(var(--accent) / 0.4)",
                    "0 32px 64px -24px hsl(0 0% 0% / 0.2)",
                  ].join(", "),
                };
              case "completed":
                return {
                  background:
                    "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 55%, hsl(var(--success) / 0.08) 100%)",
                  border: "1.5px solid hsl(var(--success) / 0.55)",
                  borderTopColor: "hsl(var(--success) / 0.7)",
                  borderLeftColor: "hsl(var(--success) / 0.62)",
                  boxShadow: [
                    "0 1px 0 hsl(0 0% 100% / 0.7) inset",
                    "0 -1px 0 hsl(var(--success) / 0.12) inset",
                    "0 2px 4px -1px hsl(var(--success) / 0.15)",
                    "0 8px 18px -6px hsl(var(--success) / 0.22)",
                    "0 14px 28px -12px hsl(var(--success) / 0.18)",
                  ].join(", "),
                };
              case "available":
                return {
                  background:
                    "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 70%, hsl(var(--muted) / 0.35) 100%)",
                  border: "1.5px solid hsl(var(--foreground) / 0.22)",
                  borderTopColor: "hsl(var(--foreground) / 0.3)",
                  borderLeftColor: "hsl(var(--foreground) / 0.24)",
                  boxShadow: [
                    "0 1px 0 hsl(0 0% 100% / 0.8) inset",
                    "0 -1px 0 hsl(0 0% 0% / 0.08) inset",
                    "0 1px 2px hsl(0 0% 0% / 0.06)",
                    "0 4px 8px -2px hsl(0 0% 0% / 0.08)",
                    "0 10px 20px -6px hsl(0 0% 0% / 0.1)",
                  ].join(", "),
                };
              case "locked":
                return {
                  background:
                    "linear-gradient(145deg, hsl(var(--muted) / 0.4) 0%, hsl(var(--muted) / 0.18) 100%)",
                  border: "1.5px solid hsl(var(--foreground) / 0.14)",
                  boxShadow: [
                    "0 1px 2px hsl(0 0% 0% / 0.06) inset",
                    "0 2px 4px hsl(0 0% 0% / 0.04) inset",
                    "0 -1px 0 hsl(0 0% 100% / 0.4) inset",
                  ].join(", "),
                };
            }
          };

          const cardClasses = (state: JourneyState) =>
            cn(
              "group relative flex items-center gap-2.5 w-full h-full",
              "rounded-lg px-3 py-2 transition-all duration-300 ease-out overflow-hidden",
              "min-h-[58px] min-w-0 select-none will-change-transform",
              state === "active" && "text-accent-foreground -translate-y-0.5",
              state === "completed" && "text-foreground hover:-translate-y-0.5 hover:scale-[1.01]",
              state === "available" && "text-foreground hover:-translate-y-0.5 hover:scale-[1.01] cursor-pointer",
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
                  background:
                    "linear-gradient(145deg, hsl(0 0% 100% / 0.32) 0%, hsl(0 0% 100% / 0.14) 60%, hsl(0 0% 100% / 0.06) 100%)",
                  border: "1px solid hsl(0 0% 100% / 0.32)",
                  borderTopColor: "hsl(0 0% 100% / 0.5)",
                  boxShadow: [
                    "0 1px 0 hsl(0 0% 100% / 0.42) inset",
                    "0 -1px 0 hsl(0 0% 0% / 0.18) inset",
                    "0 2px 6px hsl(0 0% 0% / 0.16)",
                    "0 4px 10px -2px hsl(0 0% 0% / 0.18)",
                  ].join(", "),
                };
              case "completed":
                return {
                  background:
                    "linear-gradient(145deg, hsl(var(--success) / 0.22) 0%, hsl(var(--success) / 0.08) 100%)",
                  border: "1px solid hsl(var(--success) / 0.32)",
                  borderTopColor: "hsl(var(--success) / 0.5)",
                  boxShadow: [
                    "0 1px 0 hsl(0 0% 100% / 0.55) inset",
                    "0 -1px 0 hsl(var(--success) / 0.15) inset",
                    "0 2px 5px -1px hsl(var(--success) / 0.18)",
                  ].join(", "),
                };
              case "available":
                return {
                  background:
                    "linear-gradient(145deg, hsl(var(--muted) / 0.85) 0%, hsl(var(--muted) / 0.5) 100%)",
                  border: "1px solid hsl(var(--border) / 0.7)",
                  borderTopColor: "hsl(var(--border) / 1)",
                  boxShadow: [
                    "0 1px 0 hsl(0 0% 100% / 0.5) inset",
                    "0 -1px 0 hsl(0 0% 0% / 0.07) inset",
                    "0 2px 4px -1px hsl(0 0% 0% / 0.08)",
                  ].join(", "),
                };
              case "locked":
                return {
                  background: "hsl(var(--muted) / 0.55)",
                  border: "1px solid hsl(var(--border) / 0.4)",
                  boxShadow: "0 1px 2px hsl(0 0% 0% / 0.05) inset",
                };
            }
          };

          const iconBoxClasses = (state: JourneyState) =>
            cn(
              "h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0",
              state === "active" && "group-hover:rotate-3",
              state === "available" && "group-hover:scale-110 group-hover:rotate-3",
              state === "completed" && "group-hover:scale-105",
            );

          const iconClasses = (state: JourneyState) =>
            cn(
              "h-[18px] w-[18px] transition-all duration-300",
              state === "active" && "text-accent-foreground drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.25)]",
              state === "completed" && "text-success",
              state === "available" && "text-foreground/70 group-hover:text-accent group-hover:scale-105",
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
                      {/* Highlight top horizontal (luz vinda do topo) */}
                      {(state === "active" || state === "available" || state === "completed") && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-3 top-0 h-px"
                          style={{
                            background:
                              state === "active"
                                ? "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.55), hsl(0 0% 100% / 0.3), transparent)"
                                : state === "completed"
                                  ? "linear-gradient(90deg, transparent, hsl(var(--success) / 0.45), transparent)"
                                  : "linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.12), transparent)",
                          }}
                        />
                      )}

                      {/* Glow esferico difuso no canto sup-direito do ativo */}
                      {state === "active" && (
                        <>
                          <span
                            aria-hidden
                            className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full"
                            style={{
                              background:
                                "radial-gradient(circle, hsl(0 0% 100% / 0.25) 0%, transparent 65%)",
                              filter: "blur(8px)",
                            }}
                          />
                          {/* Pequeno glow inferior — efeito de profundidade */}
                          <span
                            aria-hidden
                            className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full"
                            style={{
                              background:
                                "radial-gradient(circle, hsl(0 0% 0% / 0.18) 0%, transparent 70%)",
                              filter: "blur(12px)",
                            }}
                          />
                          {/* Glow externo pulsante (anel ao redor do card) */}
                          <span
                            aria-hidden
                            className="pointer-events-none absolute -inset-2 rounded-2xl opacity-50"
                            style={{
                              background:
                                "radial-gradient(ellipse 80% 60% at center, hsl(var(--accent) / 0.4), transparent 70%)",
                              filter: "blur(16px)",
                              animation: "journeyGlowPulse 2.8s ease-in-out infinite",
                            }}
                          />
                        </>
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

          // Seta horizontal premium entre cards
          const HArrow = ({ flowing = false }: { flowing?: boolean }) => (
            <div className="shrink-0 self-center flex items-center justify-center w-5 lg:w-6 relative" aria-hidden>
              {/* Trilho horizontal opcional (apenas quando flowing) */}
              {flowing && (
                <div
                  className="absolute h-px w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(var(--accent) / 0.05), hsl(var(--accent) / 0.45) 50%, hsl(var(--accent) / 0.05))",
                  }}
                />
              )}
              <div
                className="relative h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300"
                style={
                  flowing
                    ? {
                        background:
                          "linear-gradient(145deg, hsl(var(--accent) / 0.22) 0%, hsl(var(--accent) / 0.08) 100%)",
                        border: "1px solid hsl(var(--accent) / 0.45)",
                        borderTopColor: "hsl(var(--accent) / 0.6)",
                        boxShadow: [
                          "0 1px 0 hsl(0 0% 100% / 0.5) inset",
                          "0 -1px 0 hsl(var(--accent) / 0.15) inset",
                          "0 2px 4px -1px hsl(var(--accent) / 0.22)",
                          "0 0 0 1px hsl(var(--accent) / 0.12)",
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
                      ? "text-accent drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
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
            <div
              className="relative mb-4 rounded-xl px-2 py-2 lg:px-2.5 lg:py-2.5"
              style={{
                background:
                  "linear-gradient(145deg, hsl(var(--muted) / 0.25) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.18) 100%)",
                border: "1px solid hsl(var(--foreground) / 0.12)",
                borderTopColor: "hsl(var(--foreground) / 0.18)",
                boxShadow: [
                  "0 1px 0 hsl(0 0% 100% / 0.55) inset",
                  "0 -1px 0 hsl(0 0% 0% / 0.04) inset",
                  "0 1px 2px hsl(0 0% 0% / 0.04)",
                  "0 4px 10px -6px hsl(0 0% 0% / 0.08)",
                ].join(", "),
              }}
            >
              {/* Label do menu */}
              <div className="hidden md:flex items-center gap-2 mb-2 pl-1">
                <span className="h-[2px] w-3 rounded-full bg-accent/60" />
                <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground/85">
                  Jornada da Consultoria
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
              </div>

              {/* Desktop / tablet: 2 linhas de 3 cards com bridge vertical */}
              <div className="hidden md:block">
                <div className="flex items-stretch gap-1 lg:gap-1.5">
                  {renderCard(tabs[0])}
                  <HArrow flowing={flowsAfter("onboarding")} />
                  {renderCard(tabs[1])}
                  <HArrow flowing={flowsAfter("diagnostico")} />
                  {renderCard(tabs[2])}
                </div>

                {/* Bridge vertical compacto entre as duas linhas */}
                <div className="flex justify-center py-1" aria-hidden>
                  <div className="flex flex-col items-center">
                    <div
                      className="h-2.5 w-[2px] rounded-full transition-colors"
                      style={{
                        background: verticalFlows
                          ? "linear-gradient(180deg, hsl(var(--accent) / 0.7) 0%, hsl(var(--accent) / 0.35) 100%)"
                          : "linear-gradient(180deg, hsl(var(--foreground) / 0.3) 0%, hsl(var(--foreground) / 0.12) 100%)",
                        boxShadow: verticalFlows
                          ? "0 0 6px hsl(var(--accent) / 0.4)"
                          : undefined,
                      }}
                    />
                    <div
                      className="h-5 w-5 -mt-0.5 rounded-full flex items-center justify-center transition-all"
                      style={
                        verticalFlows
                          ? {
                              background:
                                "linear-gradient(145deg, hsl(var(--accent) / 0.25) 0%, hsl(var(--accent) / 0.08) 100%)",
                              border: "1px solid hsl(var(--accent) / 0.45)",
                              borderTopColor: "hsl(var(--accent) / 0.6)",
                              boxShadow: [
                                "0 1px 0 hsl(0 0% 100% / 0.5) inset",
                                "0 2px 5px -1px hsl(var(--accent) / 0.25)",
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
                            ? "text-accent drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
                            : "text-muted-foreground/65",
                        )}
                        strokeWidth={2.75}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-stretch gap-1 lg:gap-1.5">
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
