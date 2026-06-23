import { useAuth } from "@/contexts/AuthContext";
import logoBranca from "@/assets/logo-branca.png";
import { NavLink, useNavigate, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  ClipboardList,
  CalendarDays,
  FileText,
  LogOut,
  Menu,
  X,
  Settings,
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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FoundersShowcase } from "@/components/FoundersShowcase";
import { MobileBottomNav } from "@/components/layouts/MobileBottomNav";

const buildNavItems = (basePath: string) => [
  { to: basePath || "/cliente", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: `${basePath}/meus-dados`, icon: User, label: "Meus Dados", badgeKey: "meus-dados" },
  { to: `${basePath}/plano-acao`, icon: ClipboardList, label: "Plano de Ação" },
  { to: `${basePath}/lancamento-mes`, icon: CalendarDays, label: "Lançamento do mês" },
  { to: `${basePath}/relatorios`, icon: FileText, label: "Relatórios" },
];

interface Props {
  children: React.ReactNode;
}

export const ClientLayout = ({ children }: Props) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { clientSlug } = useParams<{ clientSlug?: string }>();
  // Detecta modo preview do admin: /admin/preview/:clientSlug/* → basePath dinâmico
  const isPreview = location.pathname.startsWith("/admin/preview/");
  const basePath = isPreview && clientSlug ? `/admin/preview/${clientSlug}` : "/cliente";
  const navItems = buildNavItems(basePath);
  const configPath = isPreview ? `${basePath}/configuracoes` : "/cliente/configuracoes";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dataPending, setDataPending] = useState(false);
  const [hasClosedMonth, setHasClosedMonth] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const [{ data: client }, { data: p }] = await Promise.all([
        supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle(),
      ]);
      if (p) setProfile(p);
      if (!client) return;
      const monthRef = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
      const [{ data: conf }, { data: closings }] = await Promise.all([
        supabase.from("data_confirmations").select("id").eq("client_id", client.id).eq("month_ref", monthRef).maybeSingle(),
        supabase.from("monthly_closings").select("status").eq("client_id", client.id),
      ]);
      setDataPending(!conf);
      // "Meus Dados" some após o 1º fechamento — mas reaparece se o consultor
      // reabrir um mês ("reaberto") para o cliente corrigir os dados.
      const rows = closings ?? [];
      setHasClosedMonth(rows.length > 0 && !rows.some((c) => c.status === "reaberto"));
    };
    check();
  }, [user]);

  // Após o primeiro fechamento mensal, "Meus Dados" some do menu — o consultor
  // passa a ser o único responsável por ajustes nos dados do onboarding.
  // No preview do admin, porém, mantemos sempre visível (o consultor precisa
  // acessar os dados do cliente).
  const visibleNavItems = navItems.filter(
    (i) => !(hasClosedMonth && !isPreview && i.to === `${basePath}/meus-dados`),
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "C";

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-y-auto sidebar-scroll">
      {/* Logo */}
      <div className="px-6 pt-6 pb-4 shrink-0 flex items-center gap-2">
        <img src={logoBranca} alt="Novare" className="h-8 w-auto" />
        <span className="text-xs text-white font-mono font-semibold">v5.5</span>
      </div>

      {/* Profile — TOP (with dropdown) */}
      <div className="px-3 pb-4 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30 w-full hover:bg-sidebar-accent/60 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sidebar-primary/30 to-sidebar-accent flex items-center justify-center shrink-0 ring-1 ring-sidebar-border/40">
                <span className="text-[0.8125rem] font-semibold text-sidebar-foreground">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-semibold text-sidebar-foreground truncate leading-tight">
                  {profile?.full_name || "Cliente"}
                </p>
                <p className="text-[0.6875rem] text-sidebar-foreground/50 truncate leading-tight mt-0.5">
                  {profile?.email || ""}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium truncate">{profile?.full_name || "Cliente"}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setMobileOpen(false); navigate(configPath); }}>
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

      {/* Navigation */}
      <nav className="px-3 space-y-0.5 shrink-0">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.8125rem] font-medium transition-colors duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-sidebar-ring"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground/85"
              )
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{item.label}</span>
            {(item as any).badgeKey === "meus-dados" && dataPending && (
              <span className="ml-auto w-2 h-2 rounded-full bg-accent shrink-0" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Founders */}
      <div className="border-t border-sidebar-border/30 mt-4 shrink-0">
        <FoundersShowcase variant="sidebar" />
      </div>

      {/* Bottom */}
      <div className="mt-auto border-t border-sidebar-border/30 shrink-0">
        {/* Settings + Theme toggle */}
        <div className="px-3 pt-3 space-y-0.5">
          <NavLink
            to={configPath}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.8125rem] font-medium transition-colors duration-200 w-full",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-sidebar-ring"
                  : "text-sidebar-foreground/55 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground/80"
              )
            }
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">Configurações</span>
          </NavLink>
          <ThemeToggle variant="sidebar" />
        </div>

        {/* Sign out */}
        <div className="px-3 pt-1 pb-2">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70 transition-all duration-200 w-full"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sair
          </button>
        </div>

        {/* LGPD footer links — discretos */}
        <div className="px-5 pb-3 flex items-center gap-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/35">
          <NavLink to="/termos" onClick={() => setMobileOpen(false)} className="hover:text-sidebar-foreground/60 transition-colors">
            Termos
          </NavLink>
          <span className="text-sidebar-foreground/20">·</span>
          <NavLink to="/privacidade" onClick={() => setMobileOpen(false)} className="hover:text-sidebar-foreground/60 transition-colors">
            Privacidade
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] bg-sidebar flex-col fixed inset-y-0 z-30 border-r border-sidebar-border/20">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-14 bg-sidebar z-30 flex items-center px-3 border-b border-sidebar-border/20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/40 h-10 w-10"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center ml-2">
          <img src={logoBranca} alt="Novare" className="h-7 w-auto" />
          <span className="text-xs text-white font-mono font-semibold ml-1.5">v5.5</span>
        </div>
        <div className="ml-auto">
          <ThemeToggle className="!text-sidebar-foreground hover:!text-sidebar-foreground hover:!bg-sidebar-accent/40" />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 animate-fade-in">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[280px] max-w-[85vw] bg-sidebar h-full shadow-elevated animate-slide-up">{sidebarContent}</aside>
        </div>
      )}

      {/* Mobile bottom nav (cliente) */}
      <MobileBottomNav dataPending={dataPending} hideMeusDados={hasClosedMonth} />

      {/* Main content */}
      <main className="flex-1 lg:ml-[260px] pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">{children}</div>
      </main>
    </div>
  );
};
