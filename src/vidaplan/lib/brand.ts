// Identidade de marca do Novare Vida Plan.
// Linguagem 100% própria (sem "número da Vida", sem mascote, sem metáfora espacial).
// O número-âncora do app é o "Marco Horizonte".

import { Compass, Sparkles, Sunrise, Wallet, Landmark, LineChart, ClipboardList, type LucideIcon } from "lucide-react";

export const VIDAPLAN = {
  name: "Novare Vida Plan",
  tagline: "Seu projeto de vida, em números que você controla.",
  anchorLabel: "Marco Horizonte",
  anchorHint: "Quanto seu projeto de vida exige: independência financeira + todos os seus sonhos, a valor de hoje.",
  method: "Método Horizonte Novare",
} as const;

export interface VidaPlanNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  short: string; // rótulo curto p/ navegação mobile
}

// Rótulos próprios (anti-plágio): Sonhos, Independência, Realidade, Carteira, Projeção.
export const VIDAPLAN_NAV: VidaPlanNavItem[] = [
  { to: "/vidaplan/app", label: "Painel", icon: Compass, short: "Painel" },
  { to: "/vidaplan/app/sonhos", label: "Meus Sonhos", icon: Sparkles, short: "Sonhos" },
  { to: "/vidaplan/app/independencia", label: "Independência", icon: Sunrise, short: "Indep." },
  { to: "/vidaplan/app/realidade", label: "Minha Realidade", icon: Wallet, short: "Realidade" },
  { to: "/vidaplan/app/carteira", label: "Carteira", icon: Landmark, short: "Carteira" },
  { to: "/vidaplan/app/projecao", label: "Projeção", icon: LineChart, short: "Projeção" },
  { to: "/vidaplan/app/plano", label: "Plano de Ação", icon: ClipboardList, short: "Plano" },
];
