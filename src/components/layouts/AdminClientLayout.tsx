import { useEffect, useState } from "react";
import { useParams, NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardList,
  BarChart3,
  Target,
  LineChart,
  FileText,
  TrendingUp,
  PenLine,
  UserCheck,
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

const tabs = [
  { path: "onboarding", label: "Onboarding", icon: ClipboardList },
  { path: "diagnostico", label: "Diagnóstico", icon: BarChart3 },
  { path: "parecer", label: "Parecer", icon: PenLine },
  { path: "objetivos", label: "Objetivos", icon: Target },
  { path: "plano-acao", label: "Plano de Ação", icon: ClipboardList },
  { path: "investimentos", label: "Investimentos", icon: TrendingUp },
  { path: "acompanhamento", label: "Acompanhamento", icon: LineChart },
  { path: "relatorio", label: "Relatório", icon: FileText },
];

const CONSULTANTS = ["Leonardo", "Jefferson"];

const disabledByStatus: Record<string, string[]> = {
  onboarding_pendente: ["diagnostico", "plano-acao", "acompanhamento", "relatorio"],
};

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

        {/* Tabs — modern pill-style with bottom indicator */}
        <div className="relative mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="border-b border-border/60">
            <nav className="flex gap-1 overflow-x-auto scrollbar-none overscroll-x-contain">
              {tabs.map((tab) => {
                const isDisabled = disabled.includes(tab.path);
                return (
                  <NavLink
                    key={tab.path}
                    to={`/admin/cliente/${clientSlug}/${tab.path}`}
                    onClick={(e) => isDisabled && e.preventDefault()}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-1.5 px-3.5 py-2.5 text-[0.8125rem] font-medium transition-all duration-200 whitespace-nowrap rounded-t-lg",
                        isActive && !isDisabled
                          ? "text-accent"
                          : isDisabled
                            ? "text-muted-foreground/30 cursor-not-allowed"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <tab.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            isActive && !isDisabled && "scale-110"
                          )}
                        />
                         <span className="truncate">{tab.label}</span>
                        {isActive && !isDisabled && (
                          <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent rounded-full" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Page content with transition */}
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </ClientProvider>
  );
};

export default AdminClientLayout;
