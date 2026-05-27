import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card3D } from "@/components/ui/card-3d";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Search,
  ChevronRight,
  UserPlus,
  Users,
  SearchX,
  Pencil,
  Trash2,
  TrendingUp,
  Clock,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  ArrowUpDown,
  MapPin,
  Briefcase,
  Loader2,
  KeyRound,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import PageTransition from "@/components/PageTransition";
import PageBanner from "@/components/PageBanner";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";
import { toast as sonnerToast } from "sonner";
import { STATUS_MAP, getStatusConfig } from "@/lib/statusConfig";
import { PasswordConfirmDialog } from "@/components/super-admin/PasswordConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
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
  created_at?: string;
  assigned_consultant?: string | null;
  profiles: { full_name: string; email: string } | null;
}

// Re-exported for local convenience
const statusMap = STATUS_MAP as Record<string, ReturnType<typeof getStatusConfig>>;

type FilterKey = "all" | "pendente" | "acompanhamento";
type ViewMode = "list" | "grid";
type SortKey = "recent" | "name" | "status";

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pendente", label: "Pendente" },
  { key: "acompanhamento", label: "Acompanhamento" },
];

const sortLabels: Record<SortKey, string> = {
  recent: "Mais recentes",
  name: "Nome (A–Z)",
  status: "Status",
};

const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const normalizeSearch = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ElementType;
  tint: string; // tailwind classes for icon background tint
  iconColor: string;
}

const KpiCard = ({ label, value, hint, icon: Icon, tint, iconColor }: KpiCardProps) => (
  <Card3D className="px-3.5 py-3">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", tint)}>
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground/70 truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-foreground tabular-nums leading-tight">{value}</span>
          {hint && <span className="text-[0.65rem] text-muted-foreground truncate hidden sm:block">{hint}</span>}
        </div>
      </div>
    </div>
  </Card3D>
);

const ClientList = () => {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  // V9: reset de senha pelo consultor
  const [resetTarget, setResetTarget] = useState<ClientRow | null>(null);
  const [resettingClientId, setResettingClientId] = useState<string | null>(null);
  const [tempPasswordResult, setTempPasswordResult] = useState<{ clientName: string; password: string } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem("clients_view_mode") as ViewMode) || "list";
  });
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const navigate = useNavigate();


  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("clients_view_mode", viewMode);
    }
  }, [viewMode]);

  const loadClients = async () => {
    try {
      setLoadError(false);
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, user_id, status, city, profession, assigned_consultant, slug, created_at")
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;
      if (!clientsData?.length) {
        setClients([]);
        return [] as ClientRow[];
      }

      const userIds = clientsData.map((c) => c.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profilesData ?? []).map((p) => [p.user_id, p]));
      const merged = clientsData.map((c) => ({ ...c, profiles: profileMap.get(c.user_id) ?? null })) as ClientRow[];
      setClients(merged);
      return merged;
    } catch (error) {
      setLoadError(true);
      sonnerToast.error("Não foi possível carregar os clientes", {
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
      return [] as ClientRow[];
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadClients();
      setLoading(false);
    };
    init();

    // Realtime: refletir mudanças em clients e profiles sem reload
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadClients();
      }, 250);
    };

    const channel = supabase
      .channel("admin-clients-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleReload)
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matchesFilter = (status: string, filter: FilterKey) => {
    if (filter === "all") return true;
    if (filter === "pendente") return status === "onboarding_pendente";
    if (filter === "acompanhamento") return status === "em_diagnostico" || status === "em_acompanhamento";
    return true;
  };

  const kpis = useMemo(() => {
    const total = clients.length;
    const tracking = clients.filter((c) => c.status === "em_diagnostico" || c.status === "em_acompanhamento").length;
    const pending = clients.filter((c) => c.status === "onboarding_pendente").length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = clients.filter((c) => {
      if (!c.created_at) return false;
      return new Date(c.created_at) >= startOfMonth;
    }).length;
    return { total, tracking, pending, newThisMonth };
  }, [clients]);

  const filtered = useMemo(() => {
    const s = normalizeSearch(search.trim());
    const arr = clients.filter((c) => {
      const name = (c.profiles as any)?.full_name ?? "";
      const email = (c.profiles as any)?.email ?? "";
      const statusLabel = statusMap[c.status]?.label ?? c.status;
      const searchable = [name, email, c.city, c.profession, c.assigned_consultant, statusLabel, c.status]
        .map(normalizeSearch)
        .join(" ");
      const matchesSearch = !s || searchable.includes(s);
      return matchesSearch && matchesFilter(c.status, activeFilter);
    });

    const sorted = [...arr];
    if (sortBy === "name") {
      sorted.sort((a, b) =>
        ((a.profiles as any)?.full_name ?? "").localeCompare((b.profiles as any)?.full_name ?? "", "pt-BR")
      );
    } else if (sortBy === "status") {
      const order: Record<string, number> = { onboarding_pendente: 0, em_diagnostico: 1, em_acompanhamento: 2 };
      sorted.sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99));
    } else {
      sorted.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    }
    return sorted;
  }, [clients, search, activeFilter, sortBy]);

  const countByStatus = (filter: FilterKey) =>
    filter === "all" ? clients.length : clients.filter((c) => matchesFilter(c.status, filter)).length;

  const clearSearchAndFilters = () => {
    setSearch("");
    setActiveFilter("all");
  };

  // Extrai a mensagem real do corpo da resposta da edge function quando
  // ela retorna status non-2xx. Por padrao o supabase-js so devolve o
  // generico "Edge Function returned a non-2xx status code".
  const readEdgeError = async (error: any, fallback: string) => {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.clone().json();
        if (body?.error) return String(body.error);
      }
      if (ctx && typeof ctx.text === "function") {
        const txt = await ctx.clone().text();
        if (txt) return txt;
      }
    } catch {
      // se nao conseguir parsear, usa o fallback
    }
    return error?.message || fallback;
  };

  const handleDeleteConfirm = async ({ password }: { password: string; reason: string; confirm_text: string }) => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const targetName = target.profiles?.full_name ?? "Cliente";

    setDeletingClientId(target.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-client", {
        body: { client_id: target.id, password },
      });
      if (error || data?.error) {
        const message = data?.error ?? (await readEdgeError(error, "Não foi possível excluir o cliente."));
        sonnerToast.error("Erro ao excluir", { description: message });
        return;
      }
      sonnerToast.success("Cliente excluído", { description: `${targetName} foi removido permanentemente.` });
      await loadClients();
      setDeleteTarget(null);
    } finally {
      setDeletingClientId(null);
    }
  };

  const handleResetConfirm = async ({ password }: { password: string; reason: string; confirm_text: string }) => {
    if (!resetTarget) return;
    const target = resetTarget;
    const targetName = target.profiles?.full_name ?? "Cliente";

    setResettingClientId(target.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-client-password", {
        body: { client_id: target.id, password },
      });
      if (error || data?.error) {
        const message = data?.error ?? (await readEdgeError(error, "Não foi possível redefinir a senha."));
        sonnerToast.error("Erro ao redefinir senha", { description: message });
        return;
      }
      const tempPassword = (data?.temp_password as string | undefined) ?? "";
      setResetTarget(null);
      if (tempPassword) {
        setTempPasswordResult({ clientName: targetName, password: tempPassword });
      } else {
        sonnerToast.success("Senha redefinida", {
          description: `Uma nova senha foi gerada para ${targetName}.`,
        });
      }
    } finally {
      setResettingClientId(null);
    }
  };

  const copyTempPassword = async () => {
    if (!tempPasswordResult) return;
    try {
      await navigator.clipboard.writeText(tempPasswordResult.password);
      sonnerToast.success("Senha copiada", { description: "A senha temporária foi copiada para a área de transferência." });
    } catch {
      sonnerToast.error("Não foi possível copiar", { description: "Copie manualmente o valor exibido." });
    }
  };

  const renderListCard = (client: ClientRow, i: number) => {
    const profile = client.profiles as any;
    const st = statusMap[client.status] ?? statusMap.onboarding_pendente;
    const initials = getInitials(profile?.full_name);
    const isDeleting = deletingClientId === client.id;
    const isResetting = resettingClientId === client.id;
    const since = client.created_at
      ? formatDistanceToNow(new Date(client.created_at), { locale: ptBR, addSuffix: false })
      : null;

    return (
      <motion.div key={client.id} variants={fadeUp} custom={i}>
        <Card3D
          clickable
          interactive
          className={cn(
            "group relative overflow-hidden",
            "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:transition-all",
            st.border
          )}
          onClick={() => navigate(`/admin/cliente/${client.slug}/onboarding`)}
        >
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 p-4 sm:p-5 pl-5 sm:pl-6 min-w-0">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{
                  background:
                    "linear-gradient(145deg, hsl(var(--accent) / 0.25), hsl(var(--accent) / 0.08))",
                  border: "1px solid hsl(var(--accent) / 0.18)",
                }}
              >
                <span className="text-sm font-bold text-accent tracking-tight">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span
                      className={cn(
                        "absolute inline-flex h-full w-full rounded-full opacity-60",
                        client.status === "onboarding_pendente" && "animate-ping",
                        st.dot
                      )}
                    />
                    <span className={cn("relative inline-flex rounded-full h-2 w-2", st.dot)} />
                  </span>
                  <p className="font-semibold text-foreground truncate text-[0.9375rem]">
                    {profile?.full_name || "Sem nome"}
                  </p>
                </div>
                <p className="text-[0.8125rem] text-muted-foreground truncate mt-0.5">{profile?.email}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[0.6875rem] text-muted-foreground/85 flex-wrap">
                  {client.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {client.city}
                    </span>
                  )}
                  {client.profession && (
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {client.profession}
                    </span>
                  )}
                  {since && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Cliente há {since}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 xl:ml-4 flex-wrap xl:flex-nowrap justify-start xl:justify-end min-w-0">
              <span className="text-xs text-muted-foreground font-medium hidden 2xl:inline truncate max-w-[140px]">
                {client.assigned_consultant || "Sem consultor"}
              </span>
              <Badge variant={st.variant as any}>{st.label}</Badge>
              <div className="flex items-center gap-1 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity duration-200 rounded-xl bg-muted/40 xl:bg-transparent p-0.5 xl:p-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                  title="Ver painel do cliente (preview)"
                  aria-label={`Ver painel de ${profile?.full_name || "cliente"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/admin/preview/${client.slug}`, "_blank");
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Editar cliente"
                  aria-label={`Editar ${profile?.full_name || "cliente"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/cliente/${client.slug}/onboarding`);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                  title="Redefinir senha do cliente"
                  aria-label={`Redefinir senha de ${profile?.full_name || "cliente"}`}
                  disabled={isResetting}
                  onClick={(e) => {
                    e.stopPropagation();
                    setResetTarget(client);
                  }}
                >
                  {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Excluir cliente"
                  aria-label={`Excluir ${profile?.full_name || "cliente"}`}
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(client);
                  }}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
              <ChevronRight className="hidden xl:block h-5 w-5 text-muted-foreground/30 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </Card3D>
      </motion.div>
    );
  };

  const renderGridCard = (client: ClientRow, i: number) => {
    const profile = client.profiles as any;
    const st = statusMap[client.status] ?? statusMap.onboarding_pendente;
    const initials = getInitials(profile?.full_name);
    const isDeleting = deletingClientId === client.id;
    const isResetting = resettingClientId === client.id;
    const since = client.created_at
      ? formatDistanceToNow(new Date(client.created_at), { locale: ptBR, addSuffix: false })
      : null;

    return (
      <motion.div key={client.id} variants={fadeUp} custom={i}>
        <Card3D
          clickable
          interactive
          className={cn(
            "group relative overflow-hidden h-full",
            "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
            st.border
          )}
          onClick={() => navigate(`/admin/cliente/${client.slug}/onboarding`)}
        >
          <div className="p-5 flex flex-col h-full gap-4">
            <div className="flex items-start justify-between gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                style={{
                  background:
                    "linear-gradient(145deg, hsl(var(--accent) / 0.25), hsl(var(--accent) / 0.08))",
                  border: "1px solid hsl(var(--accent) / 0.18)",
                }}
              >
                <span className="text-base font-bold text-accent tracking-tight">{initials}</span>
              </div>
              <Badge variant={st.variant as any}>{st.label}</Badge>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", st.dot)} />
                </span>
                <p className="font-semibold text-foreground truncate text-[0.9375rem]">
                  {profile?.full_name || "Sem nome"}
                </p>
              </div>
              <p className="text-[0.8125rem] text-muted-foreground truncate mt-0.5">{profile?.email}</p>
            </div>

            <div className="space-y-1.5 text-[0.75rem] text-muted-foreground border-t border-border/50 pt-3">
              {client.profession && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 opacity-70" />
                  <span className="truncate">{client.profession}</span>
                </div>
              )}
              {client.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 opacity-70" />
                  <span className="truncate">{client.city}</span>
                </div>
              )}
              {since && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 opacity-70" />
                  <span className="truncate">Cliente há {since}</span>
                </div>
              )}
            </div>

            <div className="mt-auto flex items-center justify-between gap-1 pt-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                aria-label={`Ver painel de ${profile?.full_name || "cliente"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/admin/preview/${client.slug}`, "_blank");
                }}
                title="Ver painel do cliente (preview)"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Ver Dash
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 px-2"
                aria-label={`Editar ${profile?.full_name || "cliente"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/cliente/${client.slug}/onboarding`);
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                aria-label={`Redefinir senha de ${profile?.full_name || "cliente"}`}
                disabled={isResetting}
                onClick={(e) => {
                  e.stopPropagation();
                  setResetTarget(client);
                }}
                title="Gerar nova senha temporária"
              >
                {isResetting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <KeyRound className="h-3.5 w-3.5 mr-1" />}
                Senha
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label={`Excluir ${profile?.full_name || "cliente"}`}
                disabled={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(client);
                }}
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                {isDeleting ? "Excluindo" : "Excluir"}
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all ml-auto" />
            </div>
          </div>
        </Card3D>
      </motion.div>
    );
  };

  return (
    <PageTransition>
      <SEO title="Clientes" description="Lista completa de clientes da consultoria Novare." index={false} />
      <PageBanner
        title="Clientes"
        description="Gerencie seus clientes cadastrados"
        icon3D="users"
        action={
          <Button onClick={() => navigate("/admin/novo-cliente")} variant="premium" className="rounded-2xl gap-2">
            <UserPlus className="h-6 w-6" />
            Novo Cliente
          </Button>
        }
      />

      {/* KPIs */}
      <motion.div
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4"
      >
        <motion.div variants={fadeUp} custom={0}>
          <KpiCard
            label="Total de Clientes"
            value={kpis.total}
            hint={kpis.total === 1 ? "1 cliente cadastrado" : `${kpis.total} clientes cadastrados`}
            icon={Users}
            tint="bg-accent/10"
            iconColor="text-accent"
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={1}>
          <KpiCard
            label="Em Acompanhamento"
            value={kpis.tracking}
            hint={kpis.total ? `${Math.round((kpis.tracking / kpis.total) * 100)}% do total` : "—"}
            icon={TrendingUp}
            tint="bg-success/10"
            iconColor="text-success"
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={2}>
          <KpiCard
            label="Pendentes Onboarding"
            value={kpis.pending}
            hint={kpis.pending > 0 ? "Aguardando preenchimento" : "Todos em dia"}
            icon={Clock}
            tint="bg-warning/10"
            iconColor="text-warning"
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={3}>
          <KpiCard
            label="Novos este mês"
            value={kpis.newThisMonth}
            hint={kpis.newThisMonth === 0 ? "Nenhum ainda" : "Cadastrados no mês"}
            icon={Sparkles}
            tint="bg-primary/10"
            iconColor="text-primary"
          />
        </motion.div>
      </motion.div>

      {/* Filter chips + view + sort */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4 min-w-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count = countByStatus(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[0.8125rem] font-medium border transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-accent/10 border-accent/30 text-accent shadow-sm"
                    : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "text-[0.6875rem] px-1.5 py-0.5 rounded-full font-semibold tabular-nums",
                    isActive ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 text-xs max-w-[180px]">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline truncate">{sortLabels[sortBy]}</span>
                <span className="sm:hidden">Ordenar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 max-w-[calc(100vw-1rem)]">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={cn(sortBy === key && "bg-accent/10 text-accent")}
                >
                  {sortLabels[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="inline-flex items-center rounded-xl border border-border/60 bg-background p-0.5 shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                viewMode === "list"
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Lista"
              aria-label="Visualização em lista"
            >
              <ListIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                viewMode === "grid"
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grade"
              aria-label="Visualização em grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <div className="relative max-w-md min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Buscar por nome, email, cidade, profissão, consultor ou status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-16 h-10"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted/60 px-1.5 font-mono text-[0.625rem] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4 tabular-nums">
        Mostrando <span className="font-semibold text-foreground">{filtered.length}</span> de{" "}
        <span className="font-semibold text-foreground">{clients.length}</span>{" "}
        {clients.length === 1 ? "cliente" : "clientes"}
      </p>

      {/* Client cards */}
      {loading ? (
        <LoadingState variant="list" rows={5} />
      ) : loadError ? (
        <EmptyState
          icon={SearchX}
          tone="destructive"
          title="Não foi possível carregar os clientes"
          description="Tente novamente em instantes."
          action={
            <Button variant="outline" className="rounded-xl" onClick={loadClients}>
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4"
              : "space-y-2"
          )}
        >
          {filtered.map((client, i) =>
            viewMode === "grid" ? renderGridCard(client, i) : renderListCard(client, i)
          )}
          {filtered.length === 0 && clients.length === 0 && (
            <div className={viewMode === "grid" ? "col-span-full" : ""}>
              <EmptyState
                icon={UserPlus}
                tone="accent"
                title="Sua jornada começa aqui"
                description="Cadastre seu primeiro cliente e veja como a plataforma organiza diagnósticos, planos e acompanhamento automaticamente."
                action={
                  <Button onClick={() => navigate("/admin/novo-cliente")} variant="premium" className="rounded-2xl gap-2">
                    <UserPlus className="h-6 w-6" /> Cadastrar primeiro cliente
                  </Button>
                }
              />
            </div>
          )}
          {filtered.length === 0 && clients.length > 0 && (
            <div className={viewMode === "grid" ? "col-span-full" : ""}>
              <EmptyState
                icon={SearchX}
                variant="compact"
                title="Nenhum resultado encontrado"
                description="Tente ajustar a busca ou limpar os filtros ativos."
                action={
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={clearSearchAndFilters}>
                    Limpar busca e filtros
                  </Button>
                }
              />
            </div>
          )}
        </motion.div>
      )}

      <PasswordConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Excluir cliente"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir ${deleteTarget.profiles?.full_name ?? "este cliente"}? Esta ação remove o cliente e seus dados permanentemente.`
            : ""
        }
        destructive
        requireConfirmText="EXCLUIR"
        confirmLabel="Excluir definitivamente"
        passwordLabel="Sua senha"
        onConfirm={handleDeleteConfirm}
      />

      <PasswordConfirmDialog
        open={!!resetTarget}
        onOpenChange={(v) => !v && setResetTarget(null)}
        title="Redefinir senha do cliente"
        description={
          resetTarget
            ? `Vamos gerar uma nova senha temporária para ${resetTarget.profiles?.full_name ?? "este cliente"}. As sessões ativas dele serão encerradas e você precisará entregar a nova senha pessoalmente.`
            : ""
        }
        confirmLabel="Gerar nova senha"
        passwordLabel="Sua senha"
        onConfirm={handleResetConfirm}
      />

      <Dialog
        open={!!tempPasswordResult}
        onOpenChange={(v) => !v && setTempPasswordResult(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Senha temporária gerada
            </DialogTitle>
            <DialogDescription>
              Esta senha aparecerá apenas uma vez. Copie agora e entregue ao cliente
              {tempPasswordResult ? ` ${tempPasswordResult.clientName}` : ""}.
            </DialogDescription>
          </DialogHeader>
          {tempPasswordResult && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/8 px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Esta senha aparece <span className="underline">apenas uma vez</span> — copie agora antes de fechar.
                </p>
              </div>
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 flex items-center justify-between gap-3">
                <code className="text-base font-mono font-semibold tracking-wider text-foreground select-all">
                  {tempPasswordResult.password}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  onClick={copyTempPassword}
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-[11px] text-emerald-900 dark:text-emerald-100 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Senha atualizada com sucesso. As sessões anteriores foram encerradas — o cliente
                  já pode entrar diretamente com esta senha.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setTempPasswordResult(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default ClientList;
