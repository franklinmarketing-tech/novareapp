import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card3D } from "@/components/ui/card-3d";
import { Search, ChevronRight, UserPlus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import PageTransition from "@/components/PageTransition";
import PageBanner from "@/components/PageBanner";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

interface ClientRow {
  id: string;
  user_id: string;
  status: string;
  city: string | null;
  profession: string | null;
  slug: string;
  profiles: { full_name: string; email: string } | null;
}

const statusMap: Record<string, { label: string; variant: "outline" | "warning" | "accent" | "success" }> = {
  onboarding_pendente: { label: "Pendente Onboarding", variant: "warning" },
  em_diagnostico: { label: "Acompanhamento", variant: "success" },
  em_acompanhamento: { label: "Acompanhamento", variant: "success" },
};

type FilterKey = "all" | "pendente" | "acompanhamento";

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pendente", label: "Pendente Onboarding" },
  { key: "acompanhamento", label: "Acompanhamento" },
];

const ClientList = () => {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadClients = async () => {
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, user_id, status, city, profession, assigned_consultant, slug")
      .order("created_at", { ascending: false });
    if (!clientsData) return [] as any[];

    const userIds = clientsData.map((c) => c.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const profileMap = new Map((profilesData ?? []).map((p) => [p.user_id, p]));
    const merged = clientsData.map((c) => ({ ...c, profiles: profileMap.get(c.user_id) ?? null })) as any[];
    setClients(merged);
    return merged;
  };

  useEffect(() => {
    const init = async () => {
      const list = await loadClients();

      // Auto-seed dos clientes de demonstração (Maria + Lucas) em PARALELO,
      // em background — sem travar a UI. Roda apenas 1x por sessão.
      const maria = list.find((c: any) => c.profiles?.email === "maria.endividada@novare.com");
      const lucas = list.find((c: any) => c.profiles?.email === "lucas.teste@novare.com");
      const mariaIncomplete = !maria || maria.status === "onboarding_pendente";
      const lucasIncomplete = !lucas || lucas.status === "onboarding_pendente";
      const needsSeed = mariaIncomplete || lucasIncomplete;
      const alreadyTried = sessionStorage.getItem("seed_demo_attempted");

      if (needsSeed && !alreadyTried) {
        sessionStorage.setItem("seed_demo_attempted", "1");
        // Background — não usa await na UI principal
        (async () => {
          try {
            const { error } = await supabase.functions.invoke("seed-all-demo-clients", { body: {} });
            if (!error) {
              await loadClients();
            }
          } catch {
            // silencioso
          }
        })();
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matchesFilter = (status: string, filter: FilterKey) => {
    if (filter === "all") return true;
    if (filter === "pendente") return status === "onboarding_pendente";
    if (filter === "acompanhamento") return status === "em_diagnostico" || status === "em_acompanhamento";
    return true;
  };

  const filtered = clients.filter((c) => {
    const name = (c.profiles as any)?.full_name ?? "";
    const email = (c.profiles as any)?.email ?? "";
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesFilter(c.status, activeFilter);
  });

  const countByStatus = (filter: FilterKey) =>
    filter === "all" ? clients.length : clients.filter((c) => matchesFilter(c.status, filter)).length;

  return (
    <PageTransition>
      <PageBanner
        title="Clientes"
        description="Gerencie seus clientes cadastrados"
        icon={Users}
        action={
          <Button onClick={() => navigate("/admin/novo-cliente")} variant="premium" className="rounded-2xl gap-2">
            <UserPlus className="h-6 w-6" />
            Novo Cliente
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border/60 -mx-6 lg:-mx-10 px-6 lg:px-10">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              "px-4 py-2.5 text-[0.8125rem] font-medium border-b-2 transition-colors duration-200 whitespace-nowrap",
              activeFilter === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-2 text-[0.6875rem] px-1.5 py-0.5 rounded-full font-semibold",
                activeFilter === tab.key
                  ? "bg-accent/10 text-accent"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {countByStatus(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Client cards */}
      <motion.div initial="hidden" animate="visible" className="space-y-2">
        {filtered.map((client, i) => {
          const profile = client.profiles as any;
          const st = statusMap[client.status] ?? statusMap.onboarding_pendente;
          return (
            <motion.div key={client.id} variants={fadeUp} custom={i}>
              <Card3D
                clickable
                interactive
                className="group"
                onClick={() => navigate(`/admin/cliente/${client.slug}/onboarding`)}
              >
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "linear-gradient(145deg, hsl(var(--accent) / 0.2), hsl(var(--accent) / 0.05))",
                        border: "1px solid hsl(var(--accent) / 0.15)",
                      }}
                    >
                      <span className="text-sm font-semibold text-accent">
                        {(profile?.full_name || "?").charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate text-[0.9375rem]">
                        {profile?.full_name || "Sem nome"}
                      </p>
                      <p className="text-[0.8125rem] text-muted-foreground truncate">{profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-xs text-muted-foreground font-medium">
                      {(client as any).assigned_consultant || "Sem consultor"}
                    </span>
                    <Badge variant={st.variant as any}>{st.label}</Badge>
                    <ChevronRight className="h-6 w-6 text-muted-foreground/30 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Card3D>
            </motion.div>
          );
        })}
        {filtered.length === 0 && clients.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-accent/40" />
            </div>
            <p className="text-foreground font-semibold mb-1">Sua jornada começa aqui</p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
              Cadastre seu primeiro cliente e veja como a plataforma organiza diagnósticos, planos e acompanhamento automaticamente.
            </p>
            <Button onClick={() => navigate("/admin/novo-cliente")} variant="premium" className="rounded-2xl gap-2">
              <UserPlus className="h-6 w-6" /> Cadastrar primeiro cliente
            </Button>
          </div>
        )}
        {filtered.length === 0 && clients.length > 0 && (
          <div className="text-center py-16">
            <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum resultado para essa busca.</p>
          </div>
        )}
      </motion.div>
    </PageTransition>
  );
};

export default ClientList;
