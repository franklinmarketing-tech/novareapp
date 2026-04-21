import { NavLink } from "react-router-dom";
import { LayoutDashboard, User, ClipboardList, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Show a small dot indicator on "Meus Dados" when there's pending action */
  dataPending?: boolean;
}

const items = [
  { to: "/cliente", icon: LayoutDashboard, label: "Início", end: true },
  { to: "/cliente/meus-dados", icon: User, label: "Meus dados", key: "meus-dados" },
  { to: "/cliente/plano-acao", icon: ClipboardList, label: "Plano" },
  { to: "/cliente/acompanhamento", icon: BarChart3, label: "Acompanh." },
];

/**
 * Fixed bottom navigation for mobile (cliente role).
 * Hidden on lg+ where the sidebar is always visible.
 */
export const MobileBottomNav = ({ dataPending = false }: Props) => (
  <nav
    aria-label="Navegação principal"
    className={cn(
      "lg:hidden fixed bottom-0 inset-x-0 z-30",
      "bg-background/95 backdrop-blur-md border-t border-border/60",
      "pb-[env(safe-area-inset-bottom)]",
    )}
  >
    <ul className="flex items-stretch justify-around h-[60px]">
      {items.map((item) => (
        <li key={item.to} className="flex-1">
          <NavLink
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center gap-0.5 h-full",
                "text-[0.6875rem] font-medium tracking-tight transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground/80",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative inline-flex">
                  <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]")} />
                  {item.key === "meus-dados" && dataPending && (
                    <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </span>
                <span className="leading-none">{item.label}</span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-primary" />
                )}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
