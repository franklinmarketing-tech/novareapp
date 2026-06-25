import { useAuth } from "@/contexts/AuthContext";
import logoBranca from "@/assets/logo-branca.png";
import { NavLink, useNavigate, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  LogOut,
  Menu,
  X,
  Settings,
  ChevronRight,
  ChevronDown,
  FolderKanban,
  Gem,
  Target,
  User as UserIcon,
  Image as ImageIcon,
  Bell,
  CreditCard,
  Lock,
  Shield,
  Mail,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FoundersShowcase } from "@/components/FoundersShowcase";
import { useSettingsCompletion, type SettingsTabId } from "@/hooks/useSettingsCompletion";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationsBell } from "@/components/NotificationsBell";

/* â”€â”€ nav config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const sections = [
  {
    label: "Principal",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/admin/clientes", icon: Users, label: "Clientes" },
      { to: "/admin/novo-cliente", icon: UserPlus, label: "Novo Cliente" },
      { to: "/admin/leads", icon: Mail, label: "Leads" },
      { to: "/admin/financeiro", icon: Wallet, label: "Financeiro" },
    ],
  },

];


/* â”€â”€ breadcrumb helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const staticSegments: Record<string, string> = {
  admin: "Dashboard",
  clientes: "Clientes",
  "novo-cliente": "Novo Cliente",
  financeiro: "Financeiro",
  configuracoes: "Configurações",
  cliente: "Cliente",
  onboarding: "Onboarding",
  diagnostico: "Diagnóstico",
  parecer: "Plano de Ação",
  "plano-acao": "Ver Ações",
  investimentos: "Investimentos",
  implementacao: "Implementação",
  acompanhamento: "Lançamento do mês",
  evolucao: "Acompanhamento",
  relatorio: "Relatório",
  workspace: "Workspace",
  projetos: "Projetos",
  "objetivos-de-vida": "Objetivos de Vida",
  ajuda: "Ajuda & Manual",
  leads: "Leads",
  "leads-newsletter": "Leads Newsletter",
  "leads-pdf": "Leads PDF",
};

interface Props {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: Props) => {
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  // V9: estado de sidebar colapsada (persistido em localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("admin:sidebar-collapsed") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("admin:sidebar-collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const settingsCompletion = useSettingsCompletion();
  const isOnSettings = location.pathname.startsWith("/admin/configuracoes");
  const isOnProjetos = location.pathname.startsWith("/admin/projetos") || location.pathname === "/admin/workspace";
  const [settingsOpen, setSettingsOpen] = useState(isOnSettings);
  const [projetosOpen, setProjetosOpen] = useState(isOnProjetos);
  useEffect(() => {
    if (isOnSettings) setSettingsOpen(true);
  }, [isOnSettings]);
  const currentTab = (new URLSearchParams(location.search).get("tab") as SettingsTabId) || "perfil";

  const settingsSubItems: { id: SettingsTabId; label: string; icon: typeof UserIcon }[] = useMemo(
    () => [
      { id: "perfil", label: "Perfil", icon: UserIcon },
      { id: "equipe", label: "Equipe", icon: Users },
      { id: "marca", label: "Marca", icon: ImageIcon },
      { id: "notificacoes", label: "Notificações", icon: Bell },
      { id: "cobranca", label: "Cobrança", icon: CreditCard },
      { id: "seguranca", label: "Segurança", icon: Lock },
    ],
    []
  );

  /* fetch admin profile */
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  /* fetch client name when on a client route (slug-based) */
  const pathParts = location.pathname.split("/").filter(Boolean);
  const clientIdx = pathParts.indexOf("cliente");
  const clientSlug = clientIdx >= 0 ? pathParts[clientIdx + 1] : null;

  useEffect(() => {
    if (!clientSlug || clientNames[clientSlug] || staticSegments[clientSlug]) return;
    supabase
      .from("clients")
      .select("user_id")
      .eq("slug", clientSlug)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.user_id)
          .maybeSingle();
        if (p) setClientNames((prev) => ({ ...prev, [clientSlug]: p.full_name }));
      });
  }, [clientSlug]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "A";

  /* â”€â”€ breadcrumbs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  const buildBreadcrumbs = () => {
    const segments = pathParts;
    const crumbs: { label: string; path: string }[] = [];
    let accumulated = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accumulated += "/" + seg;

      // Skip "admin" as first crumb â€” it's implicit
      if (i === 0 && seg === "admin") continue;

      // Slug segment after "cliente" â†’ show client name
      if (clientSlug && seg === clientSlug) {
        crumbs.push({ label: clientNames[clientSlug] || clientSlug, path: accumulated });
        continue;
      }

      crumbs.push({
        label: staticSegments[seg] || seg,
        path: accumulated,
      });
    }

    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  /* â”€â”€ sidebar content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  // V9: sidebar â€” modo "expanded" (cheio, 232/260px) vs "collapsed" (apenas
  // icones, 64px). Mobile sempre usa expanded.
  const sidebarContent = (forceExpanded = false) => {
    const collapsed = sidebarCollapsed && !forceExpanded;
    return (
    <div className="flex flex-col h-full overflow-y-auto sidebar-scroll">
      {/* Logo + Toggle button */}
      <div className={cn("pt-5 pb-3 shrink-0 flex items-center gap-2", collapsed ? "px-3 justify-center" : "px-5 justify-between")}>
        {!collapsed && (
          <>
            <img src={logoBranca} alt="Novare" className="h-7 w-auto" />
            <span className="text-xs text-white font-mono font-semibold">v6.1</span>
          </>
        )}
        {!forceExpanded && (
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="h-8 w-8 hidden lg:inline-flex items-center justify-center rounded-lg text-sidebar-foreground/55 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Admin profile â€” TOP (with dropdown) */}
      <div className={cn("pb-4 shrink-0", collapsed ? "px-2" : "px-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30 w-full hover:bg-sidebar-accent/60 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                collapsed ? "flex items-center justify-center p-1.5" : "flex items-center gap-3 px-3 py-2.5",
              )}
              title={collapsed ? profile?.full_name || "Administrador" : undefined}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sidebar-primary/30 to-sidebar-accent flex items-center justify-center shrink-0 ring-1 ring-sidebar-border/40">
                <span className="text-[0.8125rem] font-semibold text-sidebar-foreground">{initials}</span>
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] font-semibold text-sidebar-foreground truncate leading-tight">
                      {profile?.full_name || "Administrador"}
                    </p>
                    <p className="text-[0.6875rem] text-sidebar-foreground/50 truncate leading-tight mt-0.5">
                      {profile?.email || ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" sideOffset={8} className="w-56 max-w-[calc(100vw-1rem)]">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium truncate">{profile?.full_name || "Administrador"}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setMobileOpen(false); navigate("/admin/configuracoes"); }}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sections */}
      <nav className={cn("space-y-5 shrink-0", collapsed ? "px-2" : "px-3")}>
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-4 mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center rounded-xl text-[0.8125rem] font-medium transition-colors duration-200 group",
                      collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-4 py-2.5",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-sidebar-ring"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground/85"
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Founders â€” esconde quando collapsed */}
      {!collapsed && (
        <div className="border-t border-sidebar-border/30 mt-4 shrink-0">
          <FoundersShowcase variant="sidebar" />
        </div>
      )}

      {/* Projetos (expansível) */}
      <div className={cn("mt-2 shrink-0", collapsed ? "px-2" : "px-3")}>
        {collapsed ? (
          <NavLink
            to="/admin/workspace"
            onClick={() => setMobileOpen(false)}
            title="Projetos"
            className={({ isActive }) =>
              cn(
                "relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-[0.8125rem] font-medium transition-colors duration-200",
                isActive || isOnProjetos
                  ? "bg-sidebar-accent text-sidebar-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-sidebar-ring"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground"
              )
            }
          >
            <Gem className="h-[18px] w-[18px] shrink-0" />
          </NavLink>
        ) : (
          <div>
            {/* Cabeçalho do grupo Projetos */}
            <button
              onClick={() => setProjetosOpen((v) => !v)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-[0.8125rem] font-medium transition-colors duration-200",
                isOnProjetos
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground",
              )}
            >
              <Gem className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 text-left truncate">Projetos</span>
              {projetosOpen
                ? <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                : <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
            </button>
            {/* Sub-itens */}
            {projetosOpen && (
              <div className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border/30 space-y-0.5">
                <NavLink
                  to="/admin/workspace"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.8125rem] font-medium transition-colors",
                      isActive
                        ? "text-sidebar-foreground bg-sidebar-accent/50"
                        : "text-sidebar-foreground/55 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent/25",
                    )
                  }
                >
                  <FolderKanban className="h-4 w-4 shrink-0" />
                  <span className="truncate">Workspace</span>
                </NavLink>
                <NavLink
                  to="/admin/projetos/objetivos-de-vida"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.8125rem] font-medium transition-colors",
                      isActive
                        ? "text-sidebar-foreground bg-sidebar-accent/50"
                        : "text-sidebar-foreground/55 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent/25",
                    )
                  }
                >
                  <Target className="h-4 w-4 shrink-0" />
                  <span className="truncate">Objetivos de Vida</span>
                </NavLink>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-sidebar-border/30 shrink-0">
        {/* Settings (expandable) */}
        <div className={cn("pt-3 space-y-0.5", collapsed ? "px-2" : "px-3")}>
          <NavLink
            to="/admin/configuracoes"
            onClick={() => {
              setSettingsOpen(true);
              setMobileOpen(false);
            }}
            title={collapsed ? "Configurações" : undefined}
            className={({ isActive }) =>
              cn(
                "relative flex items-center rounded-xl text-[0.8125rem] font-medium transition-colors duration-200",
                collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-4 py-2.5 w-full",
                isActive || isOnSettings
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-sidebar-ring"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground/85"
              )
            }
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">Configurações</span>
                {!settingsCompletion.loading && settingsCompletion.pendingCount > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold"
                    aria-label={`${settingsCompletion.pendingCount} itens pendentes`}
                  >
                    {settingsCompletion.pendingCount}
                  </span>
                )}
              </>
            )}
            {collapsed && !settingsCompletion.loading && settingsCompletion.pendingCount > 0 && (
              <span
                className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive"
                aria-label={`${settingsCompletion.pendingCount} itens pendentes`}
              />
            )}
          </NavLink>

          {!collapsed && <ThemeToggle variant="sidebar" />}
        </div>

        {/* Sign out */}
        <div className={cn("pt-1 pb-2", collapsed ? "px-2" : "px-3")}>
          <button
            onClick={handleSignOut}
            title={collapsed ? "Sair" : undefined}
            className={cn(
              "rounded-xl text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70 transition-all duration-200",
              collapsed ? "flex items-center justify-center h-10 w-10 mx-auto" : "flex items-center gap-3 px-4 py-2.5 w-full",
            )}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {!collapsed && "Sair"}
          </button>
        </div>

        {/* LGPD footer links — discretos (oculta quando collapsed) */}
        {!collapsed && (
          <div className="px-5 pb-3 flex items-center gap-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/35">
            <NavLink to="/termos" onClick={() => setMobileOpen(false)} className="hover:text-sidebar-foreground/60 transition-colors">
              Termos
            </NavLink>
            <span className="text-sidebar-foreground/20">·</span>
            <NavLink to="/privacidade" onClick={() => setMobileOpen(false)} className="hover:text-sidebar-foreground/60 transition-colors">
              Privacidade
            </NavLink>
          </div>
        )}
      </div>
    </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex bg-sidebar flex-col fixed inset-y-0 z-30 border-r border-sidebar-border/20 transition-[width] duration-300 ease-out",
          sidebarCollapsed ? "lg:w-[64px]" : "lg:w-[232px] xl:w-[260px]",
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-14 bg-sidebar z-30 flex items-center px-3 border-b border-sidebar-border/20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground hover:bg-sidebar-accent/40 h-10 w-10"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center ml-2">
          <img src={logoBranca} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs text-white font-mono font-semibold ml-1.5">v6.1</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <NotificationsBell className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/40" />
          <ThemeToggle className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/40" />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 animate-fade-in">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[280px] max-w-[85vw] bg-sidebar h-full shadow-elevated animate-slide-up">{sidebarContent(true)}</aside>
        </div>
      )}

      {/* Main content */}
      <main
        className={cn(
          "flex-1 pt-14 lg:pt-0 min-h-screen min-w-0 transition-[margin-left] duration-300 ease-out",
          sidebarCollapsed ? "lg:ml-[64px]" : "lg:ml-[232px] xl:ml-[260px]",
        )}
      >
        {/* Breadcrumb header */}
        <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border/60">
          <div className="flex items-center h-12 px-4 lg:px-8 gap-3">
            <nav className="flex items-center gap-1.5 text-[0.8125rem] flex-1 min-w-0 overflow-x-auto scrollbar-none">
              <NavLink
                to="/admin"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Dashboard
              </NavLink>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1.5 shrink-0">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  {i === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-foreground truncate">{crumb.label}</span>
                  ) : (
                    <NavLink
                      to={crumb.path}
                      className="text-muted-foreground hover:text-foreground transition-colors truncate"
                    >
                      {crumb.label}
                    </NavLink>
                  )}
                </span>
              ))}
            </nav>
            <div className="hidden lg:flex items-center gap-1 shrink-0">
              <NotificationsBell />
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="pt-2 sm:pt-3 px-4 sm:px-6 xl:px-8 pb-6 sm:pb-8 max-w-[1600px] mx-auto w-full min-w-0">{children}</div>

        {/* Trust footer */}
        <footer className="px-4 sm:px-6 xl:px-8 py-3 border-t border-border/40 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground/60">
            <Lock className="h-3 w-3" />
            <span>Dados protegidos conforme a LGPD Â· Criptografia de ponta a ponta</span>
          </div>
          <span className="text-[0.6875rem] text-muted-foreground/40">
            Novare Consultoria Financeira Â© {new Date().getFullYear()}
          </span>
        </footer>
      </main>

      {/* Global âŒ˜K palette (admin only) */}
      <CommandPalette />
    </div>
  );
};
