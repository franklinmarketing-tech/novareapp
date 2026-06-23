import { NavLink, useLocation, useParams } from "react-router-dom";
import { LayoutDashboard, User, ClipboardList, CalendarDays, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Show a small dot indicator on "Meus Dados" when there's pending action */
  dataPending?: boolean;
  /** Esconde "Meus Dados" do menu (usado apos primeiro fechamento mensal) */
  hideMeusDados?: boolean;
}

// Lançamento do mês adicionado — visibilidade da edição é controlada por client_can_log_acompanhamento
const buildItems = (basePath: string) => [
  { to: basePath || "/cliente", icon: LayoutDashboard, label: "Início", end: true },
  { to: `${basePath}/meus-dados`, icon: User, label: "Meus dados", key: "meus-dados" },
  { to: `${basePath}/plano-acao`, icon: ClipboardList, label: "Plano" },
  { to: `${basePath}/lancamento-mes`, icon: CalendarDays, label: "Lançamento" },
  { to: `${basePath}/relatorios`, icon: FileText, label: "Relatórios" },
];

/**
 * Fixed bottom navigation for mobile (cliente role).
 * Hidden on lg+ where the sidebar is always visible.
 */
export const MobileBottomNav = ({ dataPending = false, hideMeusDados = false }: Props) => {
  const location = useLocation();
  const { clientSlug } = useParams<{ clientSlug?: string }>();
  const isPreview = location.pathname.startsWith("/admin/preview/");
  const basePath = isPreview && clientSlug ? `/admin/preview/${clientSlug}` : "/cliente";
  const items = buildItems(basePath).filter(
    // No preview do admin, "Meus dados" fica sempre visível (só some para o cliente real)
    (i) => !(hideMeusDados && !isPreview && i.key === "meus-dados"),
  );
  return (
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
};
