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
  User as UserIcon,
  Image as ImageIcon,
  Bell,
  CreditCard,
  Lock,
  Shield,
  HelpCircle,
  Mail,
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

/* ── nav config ─────────────────────────────────────────── */

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
      { to: "/admin/financeiro", icon: Wallet, label: "Financeiro" },
      { to: "/admin/leads", icon: Mail, label: "Leads" },
    ],
  },
  {
    label: "Suporte",
    items: [
      { to: "/admin/ajuda", icon: HelpCircle, label: "Ajuda & Manual" },
    ],
  },
];


/* ── breadcrumb helpers ─────────────────────────────────── */

const staticSegments: Record<string, string> = {
  admin: "Dashboard",
  clientes: "Clientes",
  "novo-cliente": "Novo Cliente",
  financeiro: "Financeiro",
  configuracoes: "Configurações",
  cliente: "Cliente",
  onboarding: "Onboarding",
  diagnostico: "Diagnóstico",
  parecer: "Parecer",
  "plano-acao": "Plano de Ação",
  investimentos: "Investimentos",
  implementacao: "Implementação",
  acompanhamento: "Acompanhamento",
  relatorio: "Relatório",
  workspace: "Workspace",
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
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const settingsCompletion = useSettingsCompletion();
  const isOnSettings = location.pathname.startsWith("/admin/configuracoes");
  const [settingsOpen, setSettingsOpen] = useState(isOnSettings);
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

  /* ── breadcrumbs ──────────────────────────────────────── */

  const buildBreadcrumbs = () => {
    const segments = pathParts;
    const crumbs: { label: string; path: string }[] = [];
    let accumulated = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accumulated += "/" + seg;

      // Skip "admin" as first crumb — it's implicit
      if (i === 0 && seg === "admin") continue;

      // Slug segment after "cliente" → show client name
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

  /* ── sidebar content ──────────────────────────────────── */

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-y-auto sidebar-scroll">
      {/* Logo */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoBranca} alt="Novare" className="h-8 w-auto" />
        </div>
      </div>

      {/* Admin profile — TOP (with dropdown) */}
      <div className="px-3 pb-4 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30 w-full hover:bg-sidebar-accent/60 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sidebar-primary/30 to-sidebar-accent flex items-center justify-center shrink-0 ring-1 ring-sidebar-border/40">
                <span className="text-[0.8125rem] font-semibold text-sidebar-foreground">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-semibold text-sidebar-foreground truncate leading-tight">
                  {profile?.full_name || "Administrador"}
                </p>
                <p className="text-[0.6875rem] text-sidebar-foreground/50 truncate leading-tight mt-0.5">
                  {profile?.email || ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
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
      <nav className="px-3 space-y-5 shrink-0">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-4 mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.8125rem] font-medium transition-colors duration-200 group",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-sidebar-ring"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground/85"
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Founders */}
      <div className="border-t border-sidebar-border/30 mt-4 shrink-0">
        <FoundersShowcase variant="sidebar" />
      </div>

      {/* Workspace */}
      <div className="px-3 mt-2 shrink-0">
        <NavLink
          to="/admin/workspace"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              "relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.8125rem] font-medium transition-colors duration-200",
              isActive
                ? "bg-sidebar-accent text-sidebar-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-sidebar-ring"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground"
            )
          }
        >
          <Gem className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1 truncate">Projetos</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        </NavLink>
      </div>

      <div className="mt-auto border-t border-sidebar-border/30 shrink-0">
        {/* Settings (expandable) */}
        <div className="px-3 pt-3 space-y-0.5">
          <NavLink
            to="/admin/configuracoes"
            onClick={() => {
              setSettingsOpen(true);
              setMobileOpen(false);
            }}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.8125rem] font-medium transition-colors duration-200 w-full",
                isActive || isOnSettings
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-sidebar-ring"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground/85"
              )
            }
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1 text-left truncate">Configurações</span>
            {!settingsCompletion.loading && settingsCompletion.pendingCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold"
                aria-label={`${settingsCompletion.pendingCount} itens pendentes`}
              >
                {settingsCompletion.pendingCount}
              </span>
            )}
          </NavLink>

          <ThemeToggle variant="sidebar" />
        </div>

        {/* Sign out */}
        <div className="px-3 pt-1 pb-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70 transition-all duration-200 w-full"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-[232px] xl:w-[260px] bg-sidebar flex-col fixed inset-y-0 z-30 border-r border-sidebar-border/20">
        {sidebarContent}
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
        <img src={logoBranca} alt="Novare" className="h-7 w-auto ml-2" />
        <div className="ml-auto flex items-center gap-1">
          <NotificationsBell className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/40" />
          <ThemeToggle className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/40" />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 animate-fade-in">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[280px] max-w-[85vw] bg-sidebar h-full shadow-elevated animate-slide-up">{sidebarContent}</aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-[232px] xl:ml-[260px] pt-14 lg:pt-0 min-h-screen min-w-0">
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

        <div className="p-4 sm:p-6 xl:p-8 max-w-[1600px] mx-auto w-full min-w-0">{children}</div>
      </main>

      {/* Global ⌘K palette (admin only) */}
      <CommandPalette />
    </div>
  );
};
