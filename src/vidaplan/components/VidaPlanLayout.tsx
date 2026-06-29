// Casca do Novare Vida Plan: sidebar (desktop) + navegação inferior (mobile).
// Identidade própria: navy de marca + área de trabalho clara (creme), tipografia Playfair.

import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoBranca from "@/assets/logo-branca.png";
import { useAuth } from "@/contexts/AuthContext";
import { VIDAPLAN, VIDAPLAN_NAV, VIDAPLAN_NAV_MOBILE } from "../lib/brand";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { useSubscription } from "../state/useSubscription";
import { LogOut, Check, Loader2, Sparkles } from "lucide-react";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
  );

const SaveBadge = ({ state }: { state: "idle" | "saving" | "saved" }) => {
  if (state === "saving") return <span className="inline-flex items-center gap-1 text-[11px] text-white/60"><Loader2 className="h-3 w-3 animate-spin" /> salvando</span>;
  if (state === "saved") return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300"><Check className="h-3 w-3" /> salvo</span>;
  return null;
};

const VidaPlanLayout = () => {
  const { plan, hydrated, saveState } = useVidaPlan();
  const { user, signOut } = useAuth();
  const { isPremium, status, daysLeft } = useSubscription();
  const navigate = useNavigate();

  const sair = async () => { await signOut(); navigate("/vidaplan/login", { replace: true }); };
  const goldLabel = !isPremium ? "Seja GOLD" : status === "trial" ? `GOLD · ${daysLeft}d` : "GOLD ativo";

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1b2a3d]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-[#16314f] px-4 py-6">
        <div className="px-2">
          <img src={logoBranca} alt="Novare" className="h-7 w-auto" />
          <p className="font-display text-base font-bold text-[#E29578] leading-tight mt-2">Vida Plan</p>
          <p className="text-[11px] text-white/40 mt-1">{VIDAPLAN.method}</p>
        </div>

        <div className="mt-6 rounded-2xl bg-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-white/60">{VIDAPLAN.anchorLabel}</p>
            <SaveBadge state={saveState} />
          </div>
          <p className="font-display text-2xl font-bold text-white tabular-nums">{brl0(plan.capitalDeVida)}</p>
        </div>

        <nav className="mt-6 flex-1 space-y-1">
          {VIDAPLAN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/vidaplan/app"} className={navLinkClass}>
              <item.icon className="h-[18px] w-[18px]" /> {item.label}
            </NavLink>
          ))}
        </nav>

        <Link to="/vidaplan/app/assinar"
          className={cn("mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors",
            isPremium ? "bg-[#E2A03F]/15 text-[#E2A03F]" : "bg-[#E29578] text-[#16314f] hover:bg-[#eaa98e]")}>
          <Sparkles className="h-4 w-4" /> {goldLabel}
        </Link>

        <div className="mt-3 border-t border-white/10 pt-3">
          {user?.email && <p className="px-3 text-[11px] text-white/40 truncate mb-1">{user.email}</p>}
          <button onClick={sair} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[#16314f] px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logoBranca} alt="Novare" className="h-5 w-auto" />
          <span className="font-display text-base font-bold text-[#E29578]">Vida Plan</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-white/60">{VIDAPLAN.anchorLabel}</p>
            <p className="text-sm font-bold text-white tabular-nums leading-none">{brl0(plan.capitalDeVida)}</p>
          </div>
          <button onClick={sair} aria-label="Sair" className="text-white/60 hover:text-white"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="lg:pl-64 pb-24 lg:pb-10">
        <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-8">
          {hydrated ? (
            <Outlet />
          ) : (
            <div className="flex items-center justify-center py-24">
              <div className="h-6 w-6 rounded-full border-[3px] border-[#16314f]/15 border-t-[#16314f] animate-spin" />
            </div>
          )}
        </div>
      </main>

      {/* Navegação inferior mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-black/5 pb-[env(safe-area-inset-bottom)]">
        <ul className="flex items-stretch justify-around h-[62px]">
          {VIDAPLAN_NAV_MOBILE.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === "/vidaplan/app"}
                className={({ isActive }) =>
                  cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                    isActive ? "text-[#C8643F]" : "text-[#1b2a3d]/50",
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span className="leading-none">{item.short}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default VidaPlanLayout;
