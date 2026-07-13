// Identidade de marca do Novare Vida Plan.
// Linguagem 100% própria (sem "número da Vida", sem mascote, sem metáfora espacial).
// O número-âncora do app é o "Marco Horizonte".

import { Compass, Sparkles, Sunrise, Wallet, Landmark, LineChart, ClipboardList, Activity, Bot, Users, Palette, type LucideIcon } from "lucide-react";

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

// Itens de navegação (rótulos próprios, anti-plágio).
const ITEM = {
  painel: { to: "/vidaplan/app", label: "Painel", icon: Compass, short: "Painel" },
  sonhos: { to: "/vidaplan/app/sonhos", label: "Meus Sonhos", icon: Sparkles, short: "Sonhos" },
  independencia: { to: "/vidaplan/app/independencia", label: "Independência", icon: Sunrise, short: "Indep." },
  realidade: { to: "/vidaplan/app/realidade", label: "Minha Realidade", icon: Wallet, short: "Realidade" },
  carteira: { to: "/vidaplan/app/carteira", label: "Conectar Banco", icon: Landmark, short: "Banco" },
  projecao: { to: "/vidaplan/app/projecao", label: "Projeção", icon: LineChart, short: "Projeção" },
  plano: { to: "/vidaplan/app/plano", label: "Plano de Ação", icon: ClipboardList, short: "Plano" },
  progresso: { to: "/vidaplan/app/progresso", label: "Meu Progresso", icon: Activity, short: "Progresso" },
  ia: { to: "/vidaplan/app/assistente", label: "IA Novare", icon: Bot, short: "IA" },
  clientes: { to: "/vidaplan/app/clientes", label: "Meus Clientes", icon: Users, short: "Clientes" },
  marca: { to: "/vidaplan/app/marca", label: "Minha Marca", icon: Palette, short: "Marca" },
} satisfies Record<string, VidaPlanNavItem>;

// CLIENTE: só as ferramentas do plano de vida (sem cockpit de consultor).
export const VIDAPLAN_NAV_CLIENTE: VidaPlanNavItem[] = [
  ITEM.painel, ITEM.sonhos, ITEM.independencia, ITEM.realidade,
  ITEM.carteira, ITEM.projecao, ITEM.plano, ITEM.progresso, ITEM.ia,
];
// ASSESSOR: cockpit (Clientes, Marca) no topo + acesso ao plano p/ demonstrar.
export const VIDAPLAN_NAV_CONSULTOR: VidaPlanNavItem[] = [
  ITEM.clientes, ITEM.marca, ITEM.painel, ITEM.realidade, ITEM.carteira, ITEM.projecao, ITEM.ia,
];

// Compat: menu padrão (cliente) para telas que ainda importam VIDAPLAN_NAV.
export const VIDAPLAN_NAV = VIDAPLAN_NAV_CLIENTE;

export const VIDAPLAN_NAV_MOBILE_CLIENTE: VidaPlanNavItem[] = [ITEM.painel, ITEM.sonhos, ITEM.realidade, ITEM.carteira, ITEM.progresso];
export const VIDAPLAN_NAV_MOBILE_CONSULTOR: VidaPlanNavItem[] = [ITEM.clientes, ITEM.marca, ITEM.painel, ITEM.carteira, ITEM.ia];
export const VIDAPLAN_NAV_MOBILE = VIDAPLAN_NAV_MOBILE_CLIENTE;
