import { useAuth } from "@/contexts/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Shield,
  LayoutDashboard,
  UserCog,
  Users,
  ScrollText,
  Flag,
  Settings2,
  Database,
  LogOut,
  Menu,
  X,
  Activity,
  ShieldCheck,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalBanners } from "@/components/GlobalBanners";
import { useState } from "react";

const navItems = [
  { to: "/super-admin", label: "Visão Geral", icon: LayoutDashboard, end: true },
  { to: "/super-admin/saude", label: "Saúde", icon: Activity },
  { to: "/super-admin/usuarios", label: "Usuários", icon: Users },
  { to: "/super-admin/admins", label: "Admins", icon: UserCog },
  { to: "/super-admin/clientes", label: "Clientes", icon: Users },
  { to: "/super-admin/seguranca", label: "Segurança", icon: ShieldCheck },
  { to: "/super-admin/operacoes", label: "Operações", icon: Power },
  { to: "/super-admin/auditoria", label: "Auditoria", icon: ScrollText },
  { to: "/super-admin/feature-flags", label: "Feature Flags", icon: Flag },
  { to: "/super-admin/configuracao", label: "Config Global", icon: Settings2 },
  { to: "/super-admin/backups", label: "Backups", icon: Database },
];

interface Props { children: React.ReactNode }

export const SuperAdminLayout = ({ children }: Props) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground tracking-tight">SUPER ADMIN</p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Controle Total</p>
          </div>
        </div>
      </div>

      <nav className="px-3 space-y-0.5 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/80"
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border/30 p-3 space-y-1">
        <ThemeToggle variant="sidebar" />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70 transition-all w-full"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-[260px] bg-sidebar flex-col fixed inset-y-0 z-30 border-r border-sidebar-border/20">
        {sidebar}
      </aside>

      <div className="lg:hidden fixed top-0 inset-x-0 h-14 bg-sidebar z-30 flex items-center px-4 border-b border-sidebar-border/20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground hover:bg-sidebar-accent/40"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <span className="ml-3 font-bold text-sidebar-foreground">SUPER ADMIN</span>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[260px] bg-sidebar h-full shadow-elevated">{sidebar}</aside>
        </div>
      )}

      <main className="flex-1 lg:ml-[260px] pt-14 lg:pt-0 min-h-screen">
        <GlobalBanners />
        <div className="p-4 lg:p-6 xl:p-8 max-w-[1600px] mx-auto w-full">{children}</div>
      </main>
    </div>
  );
};
