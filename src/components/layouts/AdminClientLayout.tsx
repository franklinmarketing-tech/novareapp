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

          // V9 slim: card horizontal compacto (icon + texto lado a lado)
          const cardClasses = (state: JourneyState) =>
            cn(
              "group relative flex items-center gap-2.5 w-full h-full",
              "rounded-lg px-3 py-2 transition-all duration-200 ease-out overflow-hidden",
              "min-h-[56px] min-w-0 select-none",
              state === "active" &&
                "bg-gradient-to-br from-accent via-accent to-accent/90 text-accent-foreground shadow-[0_6px_18px_-8px_hsl(var(--accent)/0.5)]",
              state === "completed" &&
                "bg-card border border-success/30 text-foreground hover:border-success/50 hover:bg-success/[0.03]",
              state === "available" &&
                "bg-card border border-border/55 text-foreground hover:border-accent/45 hover:bg-muted/30",
              state === "locked" &&
                "bg-muted/15 border border-border/25 text-muted-foreground/40 cursor-not-allowed",
            );

          const stepLabelClasses = (state: JourneyState) =>
            cn(
              "text-[9px] font-semibold uppercase tracking-[0.12em] leading-none mb-0.5",
              state === "active" && "text-accent-foreground/75",
              state === "completed" && "text-success",
              state === "available" && "text-muted-foreground/70",
              state === "locked" && "text-muted-foreground/35",
            );

          const iconBoxClasses = (state: JourneyState) =>
            cn(
              "h-8 w-8 rounded-md flex items-center justify-center transition-colors shrink-0",
              state === "active" && "bg-accent-foreground/15 ring-1 ring-accent-foreground/15",
              state === "completed" && "bg-success/10 ring-1 ring-success/20",
              state === "available" && "bg-muted/50 ring-1 ring-border/40 group-hover:bg-accent/10 group-hover:ring-accent/25",
              state === "locked" && "bg-muted/40 ring-1 ring-border/25",
            );

          const iconClasses = (state: JourneyState) =>
            cn(
              "h-[15px] w-[15px] transition-colors",
              state === "active" && "text-accent-foreground",
              state === "completed" && "text-success",
              state === "available" && "text-foreground/65 group-hover:text-accent",
              state === "locked" && "text-muted-foreground/40",
            );

          const titleClasses = (state: JourneyState) =>
            cn(
              "text-[12.5px] font-semibold tracking-tight leading-tight truncate",
              state === "active" && "text-accent-foreground",
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
                className="flex-1 min-w-0 outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                    <div className={cardClasses(state)}>
                      {/* Brilho decorativo no card ativo */}
                      {state === "active" && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-accent-foreground/10 blur-2xl"
                        />
                      )}

                      <div className={iconBoxClasses(state)}>
                        <Icon className={iconClasses(state)} strokeWidth={1.75} />
                      </div>

                      <div className="min-w-0 flex-1 relative">
                        <span className={stepLabelClasses(state)}>{stepText}</span>
                        <span className={cn(titleClasses(state), "block")}>{tab.label}</span>
                      </div>

                      {/* Status chip a direita */}
                      {state === "completed" && (
                        <span className="inline-flex items-center justify-center h-[18px] w-[18px] rounded-full bg-success/15 ring-1 ring-success/30 shrink-0">
                          <Check className="h-[11px] w-[11px] text-success" strokeWidth={3} />
                        </span>
                      )}
                      {state === "locked" && (
                        <span className="inline-flex items-center justify-center h-[18px] w-[18px] rounded-full bg-muted/60 shrink-0">
                          <Lock className="h-2.5 w-2.5 text-muted-foreground/55" strokeWidth={2.5} />
                        </span>
                      )}

                      {/* Indicador discreto na lateral esquerda do card ativo */}
                      {state === "active" && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent-foreground/40"
                        />
                      )}
                    </div>
                  );
                }}
              </NavLink>
            );
          };

          // Seta horizontal slim entre cards
          const HArrow = ({ flowing = false }: { flowing?: boolean }) => (
            <div className="shrink-0 self-center flex items-center justify-center w-4 lg:w-5" aria-hidden>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-colors",
                  flowing ? "text-accent/70" : "text-muted-foreground/30",
                )}
                strokeWidth={2.5}
              />
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

                {/* Bridge vertical slim entre as duas linhas */}
                <div className="flex justify-center py-1.5" aria-hidden>
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-3 w-px transition-colors",
                        verticalFlows ? "bg-accent/60" : "bg-muted-foreground/25",
                      )}
                    />
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 -mt-0.5 transition-colors",
                        verticalFlows ? "text-accent/70" : "text-muted-foreground/40",
                      )}
                      strokeWidth={2.5}
                    />
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
