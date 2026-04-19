import { useAuth } from "@/contexts/AuthContext";
import logoBranca from "@/assets/logo-branca.png";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  ClipboardList,
  BarChart3,
  LogOut,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FoundersShowcase } from "@/components/FoundersShowcase";

const navItems = [
  { to: "/cliente", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/cliente/meus-dados", icon: User, label: "Meus Dados", badgeKey: "meus-dados" },
  { to: "/cliente/plano-acao", icon: ClipboardList, label: "Plano de Ação" },
  { to: "/cliente/acompanhamento", icon: BarChart3, label: "Acompanhamento" },
];

interface Props {
  children: React.ReactNode;
}

export const ClientLayout = ({ children }: Props) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dataPending, setDataPending] = useState(false);
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
      const { data: conf } = await supabase
        .from("data_confirmations").select("id").eq("client_id", client.id).eq("month_ref", monthRef).maybeSingle();
      setDataPending(!conf);
    };
    check();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "C";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-7">
        <img src={logoBranca} alt="Novare" className="h-8 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/80"
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
            {(item as any).badgeKey === "meus-dados" && dataPending && (
              <span className="ml-auto w-2 h-2 rounded-full bg-accent shrink-0" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Founders */}
      <div className="border-t border-sidebar-border/30 mt-2">
        <FoundersShowcase variant="sidebar" />
      </div>

      {/* Bottom */}
      <div className="mt-auto border-t border-sidebar-border/30">
        {/* Settings + Theme toggle */}
        <div className="px-3 pt-3 space-y-0.5">
          <NavLink
            to="/cliente/configuracoes"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70"
              )
            }
          >
            <Settings className="h-[18px] w-[18px]" />
            Configurações
          </NavLink>
          <ThemeToggle variant="sidebar" />
        </div>

        {/* Profile */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-sidebar-foreground">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-medium text-sidebar-foreground truncate">
                {profile?.full_name || "Cliente"}
              </p>
              <p className="text-[0.6875rem] text-sidebar-foreground/40 truncate">
                {profile?.email || ""}
              </p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="px-3 pb-4">
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
      <aside className="hidden lg:flex w-[260px] bg-sidebar flex-col fixed inset-y-0 z-30 border-r border-sidebar-border/20">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-14 bg-sidebar z-30 flex items-center px-4 border-b border-sidebar-border/20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground hover:bg-sidebar-accent/40"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <img src={logoBranca} alt="Novare" className="h-7 w-auto ml-3" />
        <div className="ml-auto">
          <ThemeToggle className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/40" />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[260px] bg-sidebar h-full shadow-elevated">{sidebarContent}</aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-[260px] pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6 xl:p-8 max-w-[1600px] mx-auto w-full">{children}</div>
      </main>
    </div>
  );
};
