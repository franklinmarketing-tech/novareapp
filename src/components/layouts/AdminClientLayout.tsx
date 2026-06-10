import { useEffect, useState } from "react";
import { useParams, NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardList,
  BarChart3,
  LineChart,
  Activity,
  FileText,
  Eye,
  UserCheck,
  Target,
  Check,
  Lock,
  Clock,
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

// Jornada da consultoria em 7 etapas
const tabs = [
  { path: "onboarding",     label: "Onboarding",        icon: ClipboardList, step: 1 },
  { path: "diagnostico",    label: "Diagnóstico",       icon: BarChart3,     step: 2 },
  { path: "parecer",        label: "Plano de Ação",     icon: Target,        step: 3 },
  { path: "plano-acao",     label: "Ver Ações",         icon: Eye,           step: 4, accent: true },
  { path: "acompanhamento", label: "Lançamento do mês", icon: LineChart,     step: 5 },
  { path: "evolucao",       label: "Acompanhamento",    icon: Activity,      step: 6, accent: true },
  { path: "relatorio",      label: "Relatório",         icon: FileText,      step: 7 },
];

const CONSULTANTS = ["Leonardo", "Jefferson"];

const disabledByStatus: Record<string, string[]> = {
  onboarding_pendente: ["diagnostico", "parecer", "plano-acao", "acompanhamento", "evolucao", "relatorio"],
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
  const [clientUpdatedAt, setClientUpdatedAt] = useState<string | null>(null);

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
      setClientUpdatedAt((client as any).updated_at || null);

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
  const completedSteps = (completedByStatus[clientStatus] || []).length;
  const daysSinceActivity = clientUpdatedAt
    ? Math.floor((Date.now() - new Date(clientUpdatedAt).getTime()) / 86_400_000)
    : null;

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
              <Badge variant="outline" className="text-[10px] gap-1 border-foreground/15 text-muted-foreground shrink-0 font-mono">
                {completedSteps}/6 etapas
              </Badge>
              {daysSinceActivity !== null && daysSinceActivity >= 7 && (
                <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 bg-amber-500/8 text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock className="h-3 w-3" />
                  Parado há {daysSinceActivity}d
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

        {/* V10: Jornada da Consultoria — timeline horizontal premium */}
        {(() => {
          const completed = completedByStatus[clientStatus] || [];

          const stateOf = (path: string, isActive: boolean): JourneyState => {
            if (isActive) return "active";
            if (disabled.includes(path)) return "locked";
            if (completed.includes(path)) return "completed";
            return "available";
          };

          const progressPct = Math.min(1, completed.length / (tabs.length - 1));

          const renderNode = (tab: (typeof tabs)[number]) => {
            const isLocked = disabled.includes(tab.path);
            return (
              <NavLink
                key={tab.path}
                to={`/admin/cliente/${clientSlug}/${tab.path}`}
                onClick={(e) => isLocked && e.preventDefault()}
                aria-disabled={isLocked}
                title={isLocked ? "Aguardando conclusão do Onboarding" : tab.label}
                className="group relative flex flex-col items-center gap-2 flex-1 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-lg"
              >
                {({ isActive }) => {
                  const state = stateOf(tab.path, isActive && !isLocked);
                  const Icon = tab.icon;
                  const isAccent = (tab as any).accent && (state === "active" || state === "available");
                  return (
                    <>
                      {/* Nó circular */}
                      <div
                        className={cn(
                          "relative h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 z-10",
                          state === "active" && "scale-110",
                          state === "available" && "group-hover:scale-105 group-hover:-translate-y-0.5 cursor-pointer",
                          state === "completed" && "group-hover:scale-105 cursor-pointer",
                          state === "locked" && "cursor-not-allowed",
                          isAccent && "ring-2 ring-novare-terracotta/40 ring-offset-2 ring-offset-card",
                        )}
                        style={
                          state === "active"
                            ? {
                                background: isAccent ? "hsl(var(--novare-terracotta))" : "hsl(var(--primary))",
                                boxShadow: isAccent
                                  ? "0 0 0 1px hsl(var(--novare-terracotta)), 0 4px 14px -2px hsl(var(--novare-terracotta) / 0.45)"
                                  : "0 0 0 1px hsl(var(--primary))",
                              }
                            : state === "completed"
                            ? {
                                background: "hsl(var(--success))",
                                boxShadow: "0 0 0 1px hsl(var(--success))",
                              }
                            : state === "locked"
                            ? {
                                background: "hsl(var(--muted))",
                                boxShadow: "0 0 0 1px hsl(var(--border))",
                              }
                            : isAccent
                            ? {
                                background:
                                  "color-mix(in srgb, hsl(var(--novare-terracotta)) 14%, hsl(var(--card)))",
                                boxShadow:
                                  "0 0 0 1.5px hsl(var(--novare-terracotta)), 0 2px 6px -2px hsl(var(--novare-terracotta) / 0.35)",
                              }
                            : {
                                background: "hsl(var(--card))",
                                boxShadow: "0 0 0 1px hsl(var(--border))",
                              }
                        }
                      >
                        {state === "completed" ? (
                          <Check className="h-[18px] w-[18px] text-white" strokeWidth={3} />
                        ) : state === "locked" ? (
                          <Lock className="h-[13px] w-[13px] text-muted-foreground" strokeWidth={2.5} />
                        ) : (
                          <Icon
                            className={cn(
                              "h-[17px] w-[17px] transition-colors",
                              state === "active" && "text-primary-foreground",
                              state === "available" && !isAccent && "text-foreground/70 group-hover:text-primary",
                              state === "available" && isAccent && "text-novare-terracotta",
                            )}
                            strokeWidth={2.2}
                          />
                        )}
                      </div>

                      {/* Label sob o nó */}
                      <div className="flex flex-col items-center text-center min-w-0 w-full px-1">
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-[0.16em] tabular-nums leading-none mb-1",
                            state === "active" && "text-primary",
                            state === "completed" && "text-success",
                            state === "available" && "text-muted-foreground/60",
                            state === "locked" && "text-muted-foreground/40",
                          )}
                        >
                          {String(tab.step).padStart(2, "0")}
                        </span>
                        <span
                          className={cn(
                            "text-[11.5px] font-semibold tracking-tight leading-tight truncate max-w-full",
                            state === "active" && "text-foreground",
                            state === "completed" && "text-foreground/85",
                            state === "available" && "text-foreground/70 group-hover:text-foreground",
                            state === "locked" && "text-muted-foreground/50",
                          )}
                        >
                          {tab.label}
                        </span>
                      </div>
                    </>
                  );
                }}
              </NavLink>
            );
          };

          return (
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              {/* Desktop: timeline horizontal única */}
              <div className="hidden md:block relative">
                <div
                  aria-hidden
                  className="absolute left-[calc(100%/12)] right-[calc(100%/12)] top-5 h-[2px] rounded-full"
                  style={{ background: "hsl(var(--border) / 0.7)" }}
                />
                <div
                  aria-hidden
                  className="absolute left-[calc(100%/12)] top-5 h-[2px] rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `calc((100% - (100%/6)) * ${progressPct})`,
                    background:
                      "linear-gradient(90deg, hsl(var(--success) / 0.75) 0%, hsl(var(--primary) / 0.85) 100%)",
                  }}
                />

                <div className="relative flex items-start">
                  {tabs.map((tab) => renderNode(tab))}
                </div>
              </div>

              {/* Mobile: scroll horizontal */}
              <div className="md:hidden -mx-4 px-4">
                <div className="flex items-start gap-1 overflow-x-auto pb-2 scrollbar-none overscroll-x-contain">
                  {tabs.map((tab) => (
                    <div key={tab.path} className="shrink-0 w-[88px] flex flex-col items-center">
                      {renderNode(tab)}
                    </div>
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
