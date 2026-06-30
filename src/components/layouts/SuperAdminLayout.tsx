import { useAuth } from "@/contexts/AuthContext";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  ChevronDown,
  Mail,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalBanners } from "@/components/GlobalBanners";
import { useState, useEffect } from "react";

type NavItem = { to: string; label: string; icon: any; end?: boolean };
type NavSection = { id: string; label: string; icon: any; items: NavItem[] };

const sections: NavSection[] = [
  {
    id: "visao",
    label: "Visão",
    icon: LayoutDashboard,
    items: [
      { to: "/super-admin", label: "Visão Geral", icon: LayoutDashboard, end: true },
      { to: "/super-admin/saude", label: "Saúde", icon: Activity },
    ],
  },
  {
    id: "usuarios",
    label: "Usuários",
    icon: Users,
    items: [
      { to: "/super-admin/usuarios", label: "Todos Usuários", icon: Users },
      { to: "/super-admin/admins", label: "Admins", icon: UserCog },
      { to: "/super-admin/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    id: "seguranca",
    label: "Segurança",
    icon: ShieldCheck,
    items: [
      { to: "/super-admin/seguranca", label: "Segurança", icon: ShieldCheck },
      { to: "/super-admin/auditoria", label: "Auditoria", icon: ScrollText },
    ],
  },
  {
    id: "operacoes",
    label: "Operações",
    icon: Power,
    items: [
      { to: "/super-admin/operacoes", label: "Operações", icon: Power },
      { to: "/super-admin/feature-flags", label: "Feature Flags", icon: Flag },
    ],
  },
  {
    id: "vidaplan",
    label: "Vida Plan",
    icon: Briefcase,
    items: [
      { to: "/super-admin/vida-plan", label: "Consultores", icon: Briefcase },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Mail,
    items: [
      { to: "/super-admin/leads", label: "Leads", icon: Mail },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: Settings2,
    items: [
      { to: "/super-admin/configuracao", label: "Config Global", icon: Settings2 },
      { to: "/super-admin/backups", label: "Backups", icon: Database },
    ],
  },
];

interface Props { children: React.ReactNode }

export const SuperAdminLayout = ({ children }: Props) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const findActiveSection = () => {
    for (const s of sections) {
      if (s.items.some(i => i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))) {
        return s.id;
      }
    }
    return "visao";
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({
    [findActiveSection()]: true,
  }));

  useEffect(() => {
    const active = findActiveSection();
    setOpenSections(prev => ({ ...prev, [active]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
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

      <nav className="px-3 space-y-1 flex-1 overflow-y-auto sidebar-scroll">
        {sections.map((section) => {
          const isOpen = !!openSections[section.id];
          const SectionIcon = section.icon;
          return (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.8125rem] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground transition-colors duration-200"
              >
                <SectionIcon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 text-left">{section.label}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 opacity-60", isOpen ? "rotate-0" : "-rotate-90")} />
              </button>
              {isOpen && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border/30 space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "relative flex items-center gap-3 px-3 py-2 rounded-lg text-[0.8125rem] transition-colors duration-200",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium before:absolute before:-left-[13px] before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[2px] before:rounded-r-full before:bg-sidebar-ring"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground/85"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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

      <div className="lg:hidden fixed top-0 inset-x-0 h-14 bg-sidebar z-30 flex items-center px-3 border-b border-sidebar-border/20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground hover:bg-sidebar-accent/40 h-10 w-10"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="ml-2 font-bold text-sidebar-foreground text-sm tracking-tight">SUPER ADMIN</span>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 animate-fade-in">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[280px] max-w-[85vw] bg-sidebar h-full shadow-elevated animate-slide-up">{sidebar}</aside>
        </div>
      )}

      <main className="flex-1 lg:ml-[260px] pt-14 lg:pt-0 min-h-screen">
        <GlobalBanners />
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">{children}</div>
      </main>
    </div>
  );
};
