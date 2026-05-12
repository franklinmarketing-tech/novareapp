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

        {/* V9: Jornada da Consultoria — cards 3+3 com setas de sequencia */}
        {(() => {
          const completed = completedByStatus[clientStatus] || [];

          const stateOf = (path: string, isActive: boolean): JourneyState => {
            if (isActive) return "active";
            if (disabled.includes(path)) return "locked";
            if (completed.includes(path)) return "completed";
            return "available";
          };

          const cardClasses = (state: JourneyState) =>
            cn(
              "group relative flex flex-col items-center justify-center gap-2 w-full h-full",
              "rounded-2xl px-3 py-4 transition-all duration-300 ease-out",
              "min-w-0 text-center select-none",
              state === "active" &&
                "bg-gradient-to-br from-accent via-accent to-accent/85 text-accent-foreground shadow-[0_10px_30px_-10px_hsl(var(--accent)/0.55)] ring-2 ring-accent/30 scale-[1.02]",
              state === "completed" &&
                "bg-card border-2 border-success/45 text-foreground hover:border-success/65 hover:-translate-y-0.5 hover:shadow-md",
              state === "available" &&
                "bg-card border border-border/60 text-foreground hover:border-accent/50 hover:bg-muted/30 hover:-translate-y-0.5 hover:shadow-sm",
              state === "locked" &&
                "bg-muted/25 border border-border/30 text-muted-foreground/40 cursor-not-allowed",
            );

          const badgeClasses = (state: JourneyState) =>
            cn(
              "absolute -top-2.5 left-1/2 -translate-x-1/2",
              "h-6 w-6 rounded-full flex items-center justify-center",
              "text-[10px] font-bold ring-2 ring-background z-10 shadow-sm",
              state === "active" && "bg-accent-foreground text-accent",
              state === "completed" && "bg-success text-white",
              state === "available" && "bg-foreground/85 text-background",
              state === "locked" && "bg-muted text-muted-foreground/40",
            );

          const iconClasses = (state: JourneyState) =>
            cn(
              "h-6 w-6 transition-transform duration-300",
              state === "active" && "scale-110",
              state === "completed" && "text-success",
              state === "available" && "text-muted-foreground group-hover:text-foreground",
              state === "locked" && "opacity-50",
            );

          const labelClasses = (state: JourneyState) =>
            cn(
              "text-[11px] sm:text-xs font-semibold leading-tight w-full tracking-tight",
              state === "active" && "text-accent-foreground",
              state === "locked" && "text-muted-foreground/50",
            );

          const renderCard = (tab: (typeof tabs)[number]) => {
            const isLocked = disabled.includes(tab.path);
            return (
              <NavLink
                key={tab.path}
                to={`/admin/cliente/${clientSlug}/${tab.path}`}
                onClick={(e) => isLocked && e.preventDefault()}
                aria-disabled={isLocked}
                className="flex-1 min-w-0 outline-none rounded-2xl focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {({ isActive }) => {
                  const state = stateOf(tab.path, isActive && !isLocked);
                  const Icon = tab.icon;
                  return (
                    <div className={cardClasses(state)}>
                      <div className={badgeClasses(state)}>
                        {state === "completed" ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        ) : state === "locked" ? (
                          <Lock className="h-3 w-3" strokeWidth={2.5} />
                        ) : (
                          tab.step
                        )}
                      </div>
                      <Icon className={iconClasses(state)} />
                      <span className={labelClasses(state)}>{tab.label}</span>
                    </div>
                  );
                }}
              </NavLink>
            );
          };

          const HArrow = () => (
            <div className="shrink-0 self-center flex items-center justify-center px-1">
              <ChevronRight
                className="h-5 w-5 text-muted-foreground/45"
                strokeWidth={2.5}
              />
            </div>
          );

          return (
            <div className="mb-7">
              {/* Desktop / tablet: 2 linhas de 3 cards com seta vertical no centro */}
              <div className="hidden md:block">
                <div className="flex items-stretch gap-2 lg:gap-3">
                  {renderCard(tabs[0])}
                  <HArrow />
                  {renderCard(tabs[1])}
                  <HArrow />
                  {renderCard(tabs[2])}
                </div>
                <div className="flex justify-center my-3" aria-hidden>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="h-3 w-px bg-muted-foreground/30" />
                    <ChevronDown
                      className="h-5 w-5 text-muted-foreground/55"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
                <div className="flex items-stretch gap-2 lg:gap-3">
                  {renderCard(tabs[3])}
                  <HArrow />
                  {renderCard(tabs[4])}
                  <HArrow />
                  {renderCard(tabs[5])}
                </div>
              </div>

              {/* Mobile: scroll horizontal continuo dos 6 cards */}
              <div className="md:hidden -mx-4 px-4">
                <div className="flex items-stretch gap-2 overflow-x-auto pb-3 scrollbar-none overscroll-x-contain">
                  {tabs.map((tab, i) => (
                    <Fragment key={tab.path}>
                      <div className="shrink-0 w-[118px]">{renderCard(tab)}</div>
                      {i < tabs.length - 1 && (
                        <div className="shrink-0 self-center">
                          <ChevronRight
                            className="h-4 w-4 text-muted-foreground/45"
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
