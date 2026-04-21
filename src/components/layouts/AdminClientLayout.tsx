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

const statusMap: Record<string, { label: string; variant: string }> = {
  onboarding_pendente: { label: "Onboarding Pendente", variant: "warning" },
  em_diagnostico: { label: "Em Diagnóstico", variant: "accent" },
  em_acompanhamento: { label: "Em Acompanhamento", variant: "success" },
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
        {/* Client header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-primary">
                {clientName ? clientName.charAt(0).toUpperCase() : "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-medium text-foreground tracking-tight leading-none truncate">
                {clientName || "Carregando..."}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={st.variant as any} className="text-[10px]">{st.label}</Badge>
              </div>
            </div>
            <Select value={consultant || "__none__"} onValueChange={handleConsultantChange}>
              <SelectTrigger className="h-8 w-auto min-w-[160px] bg-primary text-primary-foreground border-primary hover:bg-primary/90 text-xs font-medium [&>svg]:text-primary-foreground">
                <UserCheck className="h-6 w-6 mr-1 shrink-0" />
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

        {/* Tabs */}
        <div className="border-b border-border/60 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-0 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const isDisabled = disabled.includes(tab.path);
              return (
                <NavLink
                  key={tab.path}
                  to={`/admin/cliente/${clientSlug}/${tab.path}`}
                  onClick={(e) => isDisabled && e.preventDefault()}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 px-3.5 py-2.5 text-[0.8125rem] font-medium border-b-2 transition-colors duration-200 whitespace-nowrap -mb-px",
                      isActive && !isDisabled
                        ? "border-accent text-accent"
                        : "border-transparent",
                      isDisabled
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : !isActive
                          ? "text-muted-foreground hover:text-foreground hover:border-border/70"
                          : ""
                    )
                  }
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>
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
