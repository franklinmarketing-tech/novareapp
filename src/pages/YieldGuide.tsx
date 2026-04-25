import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ChevronDown, Check, TrendingUp, Shield, Target,
  Phone, MessageCircle, BarChart3, Wallet, PiggyBank, Lock,
  Percent, Calendar, DollarSign, ArrowUpRight, Landmark, Menu, X,
  Users, Award, Briefcase, GraduationCap, Linkedin, Info, Receipt,
  FileDown, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import logoPreta from "@/assets/logo-preta.png";
import logoBranca from "@/assets/logo-branca.png";
import jeffersonImg from "@/assets/jefferson.png";
import leonardoImg from "@/assets/leonardo.png";
import newsletterHero from "@/assets/newsletter-hero.jpg";
import { SEO } from "@/components/SEO";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generateRendimentoPDF } from "@/lib/generateRendimentoPDF";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

/* ── founder data ──────────────────────────────── */
const founders = [
  {
    id: "jefferson",
    name: "Jefferson Freitas",
    certs: "CEA · CNEP-I · CFDe",
    role: "Sócio-fundador",
    img: jeffersonImg,
    shortBio: "Consultor Wealth de Investimentos",
    linkedin: "https://www.linkedin.com/in/jeffersonfreitas",
    highlights: [
      { icon: Briefcase, text: "Santander (Especialista Van Gogh / Select) e XP Inc." },
      { icon: TrendingUp, text: "+R$ 40 milhões em captação líquida em um único ano" },
      { icon: GraduationCap, text: "MBA PAAP CNEP-I · Aprovado CNPI (Conteúdo Brasileiro)" },
      { icon: Shield, text: "13 anos de voluntariado em Tesouraria na CCB" },
    ],
    bio: "Com experiência nas maiores plataformas do mercado, Jefferson se especializou em planejamento patrimonial e estratégias de longo prazo para famílias e empresários de alta renda. Acredita que decisões financeiras sólidas começam com análise profunda e isenta — e é essa a essência da Novare.",
  },
  {
    id: "leonardo",
    name: "Leonardo Freitas de Oliveira",
    certs: "CEA",
    role: "Sócio-fundador",
    img: leonardoImg,
    shortBio: "Consultor Wealth de Investimentos",
    linkedin: "https://www.linkedin.com/in/leonardofreitasdeoliveira",
    highlights: [
      { icon: Briefcase, text: "Líder Triple AAA no Santander · Wave Capital (BTG)" },
      { icon: Users, text: "Liderou +20 profissionais na região de Limeira" },
      { icon: Award, text: "Quadrante A1+ recorrente — referência em assessoria" },
      { icon: GraduationCap, text: "Bacharel em Administração · ANCORD" },
    ],
    bio: "Leonardo construiu sua carreira liderando equipes de alta performance e atendendo clientes de alta renda. Sua especialidade está na alocação estratégica de ativos e no acompanhamento próximo de cada cliente, garantindo que cada decisão esteja alinhada aos objetivos de vida.",
  },
];

/* ── animations ────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

/* ── data ──────────────────────────────────────── */
const featurePills: { label: string; target: string }[] = [
  { label: "Renda Fixa", target: "#renda-fixa" },
  { label: "Simulador", target: "#simulador" },
  { label: "Selic", target: "#renda-fixa" },
  { label: "CDI", target: "#renda-fixa" },
  { label: "IPCA+", target: "#renda-fixa" },
  { label: "CDB", target: "#renda-fixa" },
  { label: "Tesouro Direto", target: "#renda-fixa" },
  { label: "FGC", target: "#faq" },
  { label: "Aposentadoria", target: "#simulador" },
  { label: "Consultoria", target: "#contato" },
  { label: "Planejamento", target: "#contato" },
  { label: "Rendimento", target: "#renda-fixa" },
];

const tableData = [
  { ativo: "CDB Prefixado", rent: "14,20%", v50: "R$ 55.857", v100: "R$ 111.715", v1m: "R$ 1.117.150" },
  { ativo: "CDB Pós-fixado – 104% CDI", rent: "14,73%", v50: "R$ 56.076", v100: "R$ 112.153", v1m: "R$ 1.121.535" },
  { ativo: "IPCA + 7% (isento IR)", rent: "11,51%", v50: "R$ 55.755", v100: "R$ 111.510", v1m: "R$ 1.115.100" },
];

type TipoRenda = "fixa" | "mista" | "variavel";

interface BentoFeature {
  title: string;
  desc: string;
  icon: typeof Lock;
  rate: string;
  rateLabel: string;
  span: string;
  variant: "hero" | "default";
  rentAnual: number;
}

/** Cards "Prefixado / Pós-fixado / IPCA+" — variam conforme o tipo de renda escolhido */
const bentoByTipo: Record<TipoRenda, BentoFeature[]> = {
  fixa: [
    {
      title: "Prefixado",
      desc: "Taxa travada — ideal em queda de juros.",
      icon: Lock,
      rate: "14,20%",
      rateLabel: "CDB 12 meses",
      span: "md:col-span-1",
      variant: "hero",
      rentAnual: 14.2,
    },
    {
      title: "Pós-fixado (CDI)",
      desc: "Acompanha o CDI — segue a Selic.",
      icon: TrendingUp,
      rate: "14,73%",
      rateLabel: "104% do CDI a.a.",
      span: "md:col-span-1",
      variant: "default",
      rentAnual: 14.73,
    },
    {
      title: "IPCA+",
      desc: "Protege da inflação com ganho real.",
      icon: Shield,
      rate: "IPCA + 7%",
      rateLabel: "Ganho real",
      span: "md:col-span-1",
      variant: "default",
      rentAnual: 11.51,
    },
  ],
  mista: [
    {
      title: "Multimercado",
      desc: "Gestão ativa multiestratégia.",
      icon: Landmark,
      rate: "16,50%",
      rateLabel: "Média 12 meses",
      span: "md:col-span-1",
      variant: "hero",
      rentAnual: 16.5,
    },
    {
      title: "Renda + Ações",
      desc: "Carteira balanceada 60/40.",
      icon: TrendingUp,
      rate: "15,80%",
      rateLabel: "60% RF + 40% RV",
      span: "md:col-span-1",
      variant: "default",
      rentAnual: 15.8,
    },
    {
      title: "Previdência PGBL",
      desc: "Benefício fiscal + longo prazo.",
      icon: Shield,
      rate: "13,20%",
      rateLabel: "Plano misto",
      span: "md:col-span-1",
      variant: "default",
      rentAnual: 13.2,
    },
  ],
  variavel: [
    {
      title: "Ações Brasil",
      desc: "Blue chips brasileiras com dividendos.",
      icon: TrendingUp,
      rate: "18,00%",
      rateLabel: "Ibovespa+",
      span: "md:col-span-1",
      variant: "hero",
      rentAnual: 18,
    },
    {
      title: "FIIs",
      desc: "Renda mensal isenta de IR (PF).",
      icon: Landmark,
      rate: "13,50%",
      rateLabel: "DY + valorização",
      span: "md:col-span-1",
      variant: "default",
      rentAnual: 13.5,
    },
    {
      title: "Ações Globais",
      desc: "BDRs e ETFs internacionais.",
      icon: Shield,
      rate: "20,00%",
      rateLabel: "S&P 500 (10 anos)",
      span: "md:col-span-1",
      variant: "default",
      rentAnual: 20,
    },
  ],
};

// Mantém a referência usada no resto do código (default = renda fixa).
const bentoFeatures = bentoByTipo.fixa;

/* ── IR automático por tipo de renda + prazo ───── */
function getAliquotaIRPorTipo(tipo: TipoRenda, anos: number): number {
  // Tabela regressiva padrão (Renda Fixa e fundos)
  const dias = anos * 365;
  const regressiva = dias <= 180 ? 22.5 : dias <= 360 ? 20 : dias <= 720 ? 17.5 : 15;

  switch (tipo) {
    case "fixa":
      // Renda Fixa: tabela regressiva pura
      return regressiva;
    case "mista":
      // Renda Mista: regressiva, mas mínima de 15% (fundos de longo prazo)
      return Math.max(15, regressiva);
    case "variavel":
      // Renda Variável: 15% fixo sobre ganho de capital (ações/ETFs)
      return 15;
    default:
      return regressiva;
  }
}

/** Texto explicativo da regra aplicada */
function getRegraIR(tipo: TipoRenda, anos: number): string {
  const aliq = getAliquotaIRPorTipo(tipo, anos).toString().replace(".", ",");
  if (tipo === "variavel") return `${aliq}% — alíquota fixa sobre ganho de capital (ações e ETFs)`;
  if (tipo === "mista") {
    if (anos >= 2) return `${aliq}% — fundos de longo prazo (após 720 dias)`;
    return `${aliq}% — tabela regressiva por prazo (${anos} ${anos === 1 ? "ano" : "anos"})`;
  }
  // fixa
  if (anos < 0.5) return `${aliq}% — até 180 dias (tabela regressiva)`;
  if (anos < 1) return `${aliq}% — 181 a 360 dias (tabela regressiva)`;
  if (anos < 2) return `${aliq}% — 361 a 720 dias (tabela regressiva)`;
  return `${aliq}% — acima de 720 dias (alíquota mínima)`;
}

const bentoStats = [
  { value: "14,75%", label: "Taxa Selic", icon: Percent, color: "text-accent" },
  { value: "~1%", label: "Rendimento/mês", icon: ArrowUpRight, color: "text-success" },
  { value: "9,51%", label: "Juros Real", icon: TrendingUp, color: "text-primary" },
  { value: "R$ 250k", label: "Proteção FGC", icon: Shield, color: "text-warning" },
];

const benefits = [
  { icon: Target, title: "Planejamento personalizado", desc: "Metas alinhadas aos seus objetivos de vida" },
  { icon: BarChart3, title: "Acompanhamento contínuo", desc: "Monitoramento e rebalanceamento do portfólio" },
  { icon: Wallet, title: "Consultoria independente", desc: "Sem conflito de interesse, foco no seu resultado" },
  { icon: PiggyBank, title: "Construção de patrimônio", desc: "Estratégias para crescer consistentemente" },
];

const testimonials = [
  { name: "Ricardo M.", role: "Empresário", text: "A Novare me ajudou a estruturar uma carteira de Renda Fixa que gera renda passiva consistente." },
  { name: "Fernanda S.", role: "Médica", text: "Consegui planejar minha aposentadoria de forma realista. O atendimento personalizado faz toda a diferença." },
  { name: "Carlos A.", role: "Engenheiro", text: "Minha rentabilidade melhorou significativamente depois que comecei com a Novare." },
];

const faqs = [
  { q: "O que é Renda Fixa?", a: "São investimentos com regras de remuneração definidas no momento da aplicação. O investidor sabe qual será a taxa de retorno ou o índice que será utilizado para corrigir o valor investido." },
  { q: "Qual a diferença entre CDB Prefixado e Pós-fixado?", a: "No Prefixado, a taxa é definida na aplicação. No Pós-fixado, a rentabilidade acompanha um indicador (geralmente o CDI), podendo variar ao longo do tempo." },
  { q: "O que é a taxa Selic e como ela afeta meus investimentos?", a: "A Selic é a taxa básica de juros do Brasil. Quando sobe, investimentos em Renda Fixa se tornam mais atrativos. Atualmente está em 14,75% ao ano." },
  { q: "Quanto preciso para começar a investir?", a: "É possível começar com valores a partir de R$ 100 em muitos títulos de Renda Fixa. O importante é começar e manter a disciplina de aportes regulares." },
  { q: "Meus investimentos são seguros?", a: "A maioria dos investimentos em Renda Fixa conta com a proteção do FGC para valores até R$ 250 mil por CPF por instituição financeira." },
  { q: "Como a Novare pode me ajudar?", a: "A Novare oferece consultoria personalizada e independente, construindo um plano de investimentos alinhado aos seus objetivos de vida e metas financeiras." },
];

const navLinks = [
  { href: "#intro", label: "Introdução" },
  { href: "#renda-fixa", label: "Renda Fixa" },
  { href: "#simulador", label: "Simulador" },
  { href: "#faq", label: "FAQ" },
  { href: "#quem-somos", label: "Quem Somos" },
  { href: "#contato", label: "Contato" },
];

/* ── simulator ─────────────────────────────────── */
interface YearPoint {
  year: number;        // ano relativo (1, 2, 3...)
  age: number;         // idade no fim do ano
  invested: number;    // total aportado acumulado (numérico)
  gross: number;       // patrimônio bruto acumulado
  net: number;         // patrimônio líquido após IR
  gain: number;        // ganho líquido (net - invested)
}

interface SimResult {
  patrimonio: string;
  patrimonioLiquido: string;
  rendaMensal: string;
  rendaMensalLiquida: string;
  rendaAnualLiquida: string;
  totalInvestido: string;
  totalAportado: string;
  ganhoLiquido: string;
  ganhoBruto: string;
  irDevido: string;
  multiploInvestido: number;   // patrimônio / total investido
  rendaVsDesejada: number;     // % atingido (renda líquida / desejada)
  atingeMeta: boolean;
  anosAcumulo: number;
  mesesAcumulo: number;
  aliquotaIR: number;
  taxaMensalEfetiva: number;   // %
  // Numerical for charts
  patrimonioNum: number;
  patrimonioLiquidoNum: number;
  totalInvestidoNum: number;
  ganhoLiquidoNum: number;
  rendaMensalLiquidaNum: number;
  rendaDesejadaNum: number;
  /** Ano-a-ano para gráficos / tabela */
  timeline: YearPoint[];
}

function getAliquotaIR(anos: number): number {
  const dias = anos * 365;
  if (dias <= 180) return 22.5;
  if (dias <= 360) return 20;
  if (dias <= 720) return 17.5;
  return 15;
}

function simulate(
  idadeAtual: number,
  idadeAposent: number,
  patrimonioAtual: number,
  aporte: number,
  rendaDesejada: number,
  rentAnual: number,
  aliquotaIROverride?: number | null
): SimResult {
  const anos = Math.max(0, idadeAposent - idadeAtual);
  const meses = anos * 12;
  const taxaMensal = Math.pow(1 + rentAnual / 100, 1 / 12) - 1;

  // Rentabilidade NOMINAL (bruta) — sem descontar inflação
  let patrimonioBruto = patrimonioAtual;
  const timeline: YearPoint[] = [];
  // Ponto inicial (ano 0)
  timeline.push({
    year: 0,
    age: idadeAtual,
    invested: patrimonioAtual,
    gross: patrimonioAtual,
    net: patrimonioAtual,
    gain: 0,
  });

  // Quando há override (incl. 0 = isento), usamos esse valor em todos os pontos.
  // Caso contrário, aplicamos a tabela regressiva conforme o horizonte do ponto.
  const usaOverride = aliquotaIROverride !== undefined && aliquotaIROverride !== null;

  for (let m = 1; m <= meses; m++) {
    patrimonioBruto = patrimonioBruto * (1 + taxaMensal) + aporte;
    if (m % 12 === 0) {
      const yearIdx = m / 12;
      const investedSoFar = patrimonioAtual + aporte * m;
      const ganhoBrutoY = patrimonioBruto - investedSoFar;
      const aliqPonto = usaOverride ? (aliquotaIROverride as number) : getAliquotaIR(yearIdx);
      const irY = Math.max(0, ganhoBrutoY) * (aliqPonto / 100);
      const netY = patrimonioBruto - irY;
      timeline.push({
        year: yearIdx,
        age: idadeAtual + yearIdx,
        invested: investedSoFar,
        gross: patrimonioBruto,
        net: netY,
        gain: netY - investedSoFar,
      });
    }
  }

  const totalInvestido = patrimonioAtual + aporte * meses;
  const ganhoBruto = patrimonioBruto - totalInvestido;

  // IR incide apenas sobre o ganho, no momento do resgate
  const aliquotaIR = usaOverride ? (aliquotaIROverride as number) : getAliquotaIR(anos);
  const irDevido = ganhoBruto * (aliquotaIR / 100);
  const patrimonioLiquido = patrimonioBruto - irDevido;
  const ganhoLiquido = patrimonioLiquido - totalInvestido;

  // Renda mensal bruta e líquida (sem consumir o principal)
  const rendaMensalBruta = patrimonioBruto * taxaMensal;
  const rendaMensalLiquida = rendaMensalBruta * (1 - aliquotaIR / 100);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const totalAportado = aporte * meses;
  const rendaAnualLiquida = rendaMensalLiquida * 12;
  const multiploInvestido = totalInvestido > 0 ? patrimonioBruto / totalInvestido : 0;
  const rendaVsDesejada = rendaDesejada > 0 ? (rendaMensalLiquida / rendaDesejada) * 100 : 0;

  return {
    patrimonio: fmt(patrimonioBruto),
    patrimonioLiquido: fmt(patrimonioLiquido),
    rendaMensal: fmt(rendaMensalBruta),
    rendaMensalLiquida: fmt(rendaMensalLiquida),
    rendaAnualLiquida: fmt(rendaAnualLiquida),
    totalInvestido: fmt(totalInvestido),
    totalAportado: fmt(totalAportado),
    ganhoLiquido: fmt(ganhoLiquido),
    ganhoBruto: fmt(ganhoBruto),
    irDevido: fmt(irDevido),
    multiploInvestido,
    rendaVsDesejada,
    atingeMeta: rendaMensalLiquida >= rendaDesejada,
    anosAcumulo: anos,
    mesesAcumulo: meses,
    aliquotaIR,
    taxaMensalEfetiva: taxaMensal * 100,
    patrimonioNum: patrimonioBruto,
    patrimonioLiquidoNum: patrimonioLiquido,
    totalInvestidoNum: totalInvestido,
    ganhoLiquidoNum: ganhoLiquido,
    rendaMensalLiquidaNum: rendaMensalLiquida,
    rendaDesejadaNum: rendaDesejada,
    timeline,
  };
}

/** Formato compacto para evitar overflow em valores enormes: R$ 1,2 mi / 3,4 bi / 5,6 tri */
function formatCompactBRL(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  // \u00A0 (NBSP) entre símbolo e número impede quebras feias do tipo "R$\n100 mil"
  const f = (n: number, suffix: string) =>
    `${sign}R$\u00A0${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}\u00A0${suffix}`;
  if (abs >= 1e12) return f(v / 1e12, "tri");
  if (abs >= 1e9) return f(v / 1e9, "bi");
  if (abs >= 1e6) return f(v / 1e6, "mi");
  if (abs >= 1e3) return f(v / 1e3, "mil");
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).replace(/\s/g, "\u00A0");
}

/* ── Scrolling pills ───────────────────────────── */
const ScrollingPills = ({ onPillClick }: { onPillClick: (target: string) => void }) => (
  <div className="overflow-hidden py-4 group">
    <motion.div
      className="flex gap-3 shrink-0 w-max"
      animate={{ x: [0, "-50%"] }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      style={{ animationPlayState: "running" }}
      whileHover={{ x: undefined }}
    >
      {[...featurePills, ...featurePills].map((pill, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPillClick(pill.target)}
          aria-label={`Ir para seção ${pill.label}`}
          className="px-4 py-2 rounded-full border border-border/60 text-sm text-muted-foreground font-medium whitespace-nowrap bg-card hover:bg-accent hover:text-accent-foreground hover:border-accent/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {pill.label}
        </button>
      ))}
    </motion.div>
  </div>
);

/* ── page component ────────────────────────────── */
const YieldGuide = () => {
  const [tipoRenda, setTipoRenda] = useState<TipoRenda>("fixa");
  const currentBento = bentoByTipo[tipoRenda];
  const _preFaixa = currentBento[0];
  const [sim, setSim] = useState({ idadeAtual: 0, idadeAposent: 0, patrimonioAtual: 0, aporte: 0, rendaDesejada: 0, rentabilidade: _preFaixa.rentAnual });
  const [rentPeriodo, setRentPeriodo] = useState<"anual" | "mensal">("anual");
  const [result, setResult] = useState<SimResult | null>(null);
  const [selectedFaixa, setSelectedFaixa] = useState<string | null>(_preFaixa.title);
  const [resultFaixa, setResultFaixa] = useState<BentoFeature | null>(null);

  // Quando o usuário troca o tipo de renda, sincroniza o card destacado e a taxa do simulador
  const handleTipoRendaChange = (novoTipo: TipoRenda) => {
    if (novoTipo === tipoRenda) return;
    const novoConjunto = bentoByTipo[novoTipo];
    const primeira = novoConjunto[0];
    setTipoRenda(novoTipo);
    setSelectedFaixa(primeira.title);
    setSim((prev) => ({ ...prev, rentabilidade: primeira.rentAnual }));
    setRentPeriodo("anual");
    // Bento agora está embutido no simulador — nenhum scroll externo necessário.
  };
  const [selectedFounder, setSelectedFounder] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simCountdown, setSimCountdown] = useState(5);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterDone, setNewsletterDone] = useState(false);

  const handleNewsletterSubmit = async () => {
    const schema = z.object({
      email: z.string().trim().email("E-mail inválido").max(255),
    });
    const parsed = schema.safeParse({ email: newsletterEmail });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "E-mail inválido");
      return;
    }
    setNewsletterLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: { email: parsed.data.email, source: "yield-guide" },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || "Não foi possível concluir sua inscrição");
      } else {
        toast.success("Inscrição confirmada! Verifique sua caixa de entrada.");
        setNewsletterDone(true);
        setNewsletterEmail("");
      }
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setNewsletterLoading(false);
    }
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections = navLinks.map((l) => l.href.replace("#", ""));
      const vh = window.innerHeight;

      // Se está perto do final da página, marca a última seção
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
      if (nearBottom) {
        setActiveSection(sections[sections.length - 1]);
        return;
      }

      // Caso contrário, escolhe a seção com maior área visível na viewport
      let bestId = "";
      let bestVisible = 0;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const top = Math.max(rect.top, 0);
        const bottom = Math.min(rect.bottom, vh);
        const visible = Math.max(0, bottom - top);
        if (visible > bestVisible) {
          bestVisible = visible;
          bestId = id;
        }
      }
      setActiveSection(bestId);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const rentAnual = rentPeriodo === "mensal"
    ? (Math.pow(1 + sim.rentabilidade / 100, 12) - 1) * 100
    : sim.rentabilidade;

  // Alíquota de IR é 100% automática: depende do TIPO de renda + PRAZO (anos até a aposentadoria).
  const anosHorizonte = Math.max(0, sim.idadeAposent - sim.idadeAtual);
  const aliquotaEfetivaAtual = getAliquotaIRPorTipo(tipoRenda, anosHorizonte);
  const regraIRTexto = getRegraIR(tipoRenda, anosHorizonte);

  const handleSimulate = () => {
    setIsSimulating(true);
    setSimCountdown(5);
    // calcula imediatamente, mas mantém o loader visível por 5s para criar expectativa
    const r = simulate(sim.idadeAtual, sim.idadeAposent, sim.patrimonioAtual, sim.aporte, sim.rendaDesejada, rentAnual, aliquotaEfetivaAtual);
    const faixa = selectedFaixa ? currentBento.find((b) => b.title === selectedFaixa) ?? null : null;

    // Contador regressivo
    const tickInterval = window.setInterval(() => {
      setSimCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    window.setTimeout(() => {
      window.clearInterval(tickInterval);
      setResult(r);
      setResultFaixa(faixa);
      setIsSimulating(false);
    }, 5000);
  };

  // 🔄 Recalcula AUTOMATICAMENTE após a primeira simulação
  // Garante que trocar tipo de renda, taxa, idade ou aporte atualize TUDO em tempo real
  // (KPIs, gráfico, IR estimado) sem precisar clicar em "Simular" novamente.
  useEffect(() => {
    if (!result || isSimulating) return;
    const r = simulate(sim.idadeAtual, sim.idadeAposent, sim.patrimonioAtual, sim.aporte, sim.rendaDesejada, rentAnual, aliquotaEfetivaAtual);
    const faixa = selectedFaixa ? currentBento.find((b) => b.title === selectedFaixa) ?? null : null;
    setResult(r);
    setResultFaixa(faixa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoRenda, sim.idadeAtual, sim.idadeAposent, sim.patrimonioAtual, sim.aporte, sim.rendaDesejada, rentAnual, aliquotaEfetivaAtual, selectedFaixa]);

  const scrollTo = (id: string) => {
    setMobileNav(false);
    const el = document.querySelector(id) as HTMLElement | null;
    if (!el) return;
    // offset = altura do header fixo (h-20 = 80px / h-16 quando rolado = 64px) + folga
    const headerH = window.scrollY > 20 ? 64 : 80;
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - 16;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const whatsappUrl = "https://api.whatsapp.com/send/?phone=5519983402827&text=Li+o+conteúdo+da+Novare+e+gostaria+de+falar+com+um+consultor";

  return (
    <div className="min-h-screen bg-background font-body">
      <SEO
        title="Calculadora de Investimentos: simule sua aposentadoria"
        description="Simule sua aposentadoria e entenda os rendimentos em Renda Fixa com a calculadora gratuita da Novare."
        canonicalPath="/ferramentas/calculadora-de-investimentos"
      />
      {/* ── NAV ─────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-2xl border-b border-border"
            : "backdrop-blur-xl border-b border-border/30"
        }`}
        style={{
          background: scrolled
            ? "linear-gradient(180deg, hsl(0 0% 100% / 0.92), hsl(220 30% 97% / 0.88))"
            : "linear-gradient(180deg, hsl(0 0% 100% / 0.82), hsl(220 30% 98% / 0.76))",
          boxShadow: scrolled
            ? "0 10px 40px -12px hsl(220 50% 20% / 0.18), 0 2px 0 hsl(0 0% 100% / 0.6) inset, 0 -1px 0 hsl(220 30% 90% / 0.6) inset"
            : "0 4px 20px -8px hsl(220 50% 20% / 0.08), 0 1px 0 hsl(0 0% 100% / 0.6) inset",
        }}
      >
        {/* faixa accent superior 3D */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className={`max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 transition-all duration-300 ${scrolled ? "h-14 sm:h-16" : "h-16 sm:h-20"}`}>
          <motion.img
            src={logoPreta}
            alt="Novare"
            className={`transition-all duration-300 ${scrolled ? "h-7 sm:h-8" : "h-8 sm:h-10"}`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          />

          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((l, i) => {
              const id = l.href.replace("#", "");
              const isActive = activeSection === id;
              return (
                <motion.button
                  key={l.href}
                  onClick={() => scrollTo(l.href)}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0, scale: 0.97 }}
                  className={`relative group px-2.5 lg:px-3.5 py-2 rounded-xl text-[13px] lg:text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {/* fundo ativo com profundidade 3D */}
                  {isActive && (
                    <motion.span
                      layoutId="navActiveBg"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: "linear-gradient(180deg, hsl(var(--accent) / 0.14), hsl(var(--accent) / 0.06))",
                        boxShadow:
                          "0 4px 12px -4px hsl(var(--accent) / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.7), inset 0 -1px 0 hsl(var(--accent) / 0.2)",
                        border: "1px solid hsl(var(--accent) / 0.25)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {/* hover sweep */}
                  <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: "linear-gradient(180deg, hsl(220 30% 95% / 0.6), transparent)" }}
                  />
                  <span className="relative z-10">{l.label}</span>
                  {/* underline animado no hover */}
                  {!isActive && (
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-1 h-[2px] w-0 group-hover:w-6 bg-accent rounded-full transition-all duration-300" />
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ y: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              onClick={() => window.open(whatsappUrl, "_blank")}
              className="hidden sm:inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-4 sm:px-5 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm relative overflow-hidden group whitespace-nowrap"
              style={{
                boxShadow:
                  "0 6px 18px -4px hsl(var(--accent) / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.25), inset 0 -2px 0 hsl(var(--accent) / 0.4)",
              }}
            >
              {/* shine sweep */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="relative z-10">Fale conosco</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </motion.button>
            <button className="md:hidden text-foreground p-2 rounded-lg hover:bg-muted/60 transition-colors" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menu">
              {mobileNav ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileNav && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl px-4 sm:px-6 py-4 space-y-1"
          >
            {navLinks.map((l, i) => {
              const id = l.href.replace("#", "");
              const isActive = activeSection === id;
              return (
                <motion.button
                  key={l.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => { scrollTo(l.href); setMobileNav(false); }}
                  className={`block w-full text-left text-sm font-semibold py-2.5 px-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-accent/10 text-foreground border-l-2 border-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {l.label}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </motion.nav>

      {/* ── HERO ────────────────────────────────── */}
      <section className="pt-16 pb-6 md:pt-24 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-5 lg:px-6 text-center">
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase tracking-widest">
              <Landmark className="h-6 w-6" />
              Consultoria de Investimentos
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.08] tracking-tight">
              Quanto rende um{" "}
              <span className="text-accent">investimento</span>?
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Simulações atualizadas de quanto rendem R$ 50 mil, R$ 100 mil e R$ 1 milhão nas principais estratégias de Renda Fixa do Brasil.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap justify-center gap-4 pt-4">
              <button
                onClick={() => scrollTo("#simulador")}
                className="group relative inline-flex items-center gap-3 bg-accent text-accent-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-[0_6px_20px_-4px_hsl(var(--accent)/0.5)] hover:shadow-[0_8px_28px_-4px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                Simular agora
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent-foreground/20 group-hover:bg-accent-foreground/30 transition-colors">
                  <BarChart3 className="h-6 w-6" />
                </span>
              </button>
              <button
                onClick={() => scrollTo("#intro")}
                className="group relative inline-flex items-center gap-3 bg-white text-foreground font-semibold text-base px-8 py-4 rounded-2xl border border-border/60 shadow-[0_4px_12px_-2px_hsl(var(--foreground)/0.06)] hover:shadow-[0_6px_20px_-4px_hsl(var(--foreground)/0.1)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                Começar a leitura
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted group-hover:bg-accent/10 transition-colors">
                  <ArrowRight className="h-6 w-6" />
                </span>
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scrolling pills */}
        <div className="mt-12">
          <ScrollingPills onPillClick={scrollTo} />
        </div>
      </section>

      {/* ── BENTO STATS ─────────────────────────── */}
      <section className="py-6 md:py-9">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {bentoStats.map((s, i) => (
              <motion.div key={s.label} variants={fadeUp} custom={i}>
                <Card className="rounded-2xl border-border/40 shadow-subtle hover:shadow-soft transition-shadow h-full">
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-6">
                      <s.icon className={`h-6 w-6 ${s.color}`} />
                    </div>
                    <div>
                      <p className={`text-3xl md:text-4xl font-bold tracking-tight tabular-nums ${s.color}`}>{s.value}</p>
                      <p className="text-sm text-muted-foreground mt-1.5 font-medium">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── INTRO / ABOUT ───────────────────────── */}
      <section id="intro" className="py-6 md:py-9">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <motion.div variants={fadeUp} custom={0} className="space-y-6">
                <span className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Cenário Atual</span>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
                  O Brasil tem a segunda maior taxa de{" "}
                  <span className="text-accent">juros real</span> do mundo.
                </h2>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Em março de 2026, o Banco Central reduziu a Selic para <strong className="text-foreground">14,75% a.a.</strong> — ainda assim, a Renda Fixa brasileira segue entre as mais rentáveis do planeta, com juros reais de 9,51%.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Neste conteúdo, mostramos quanto rendem diferentes estratégias com valores reais, para que você tome decisões com base em dados e não em achismos.
                </p>
              </motion.div>

              {/* Bento grid mini */}
              <motion.div variants={fadeUp} custom={1} className="grid grid-cols-2 gap-4">
                <Card className="rounded-2xl border-border/40 shadow-subtle col-span-2 bg-primary text-primary-foreground">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Rentabilidade média</span>
                    </div>
                    <p className="text-4xl font-bold tracking-tight">~1% <span className="text-lg font-medium opacity-60">ao mês</span></p>
                    <p className="text-sm opacity-60 mt-2">Renda Fixa no cenário atual de juros elevados</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/40 shadow-subtle">
                  <CardContent className="p-5">
                    <Calendar className="h-6 w-6 text-accent mb-3" />
                    <p className="text-2xl font-bold text-foreground">12 meses</p>
                    <p className="text-xs text-muted-foreground mt-1">Período das simulações</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/40 shadow-subtle">
                  <CardContent className="p-5">
                    <Shield className="h-6 w-6 text-success mb-3" />
                    <p className="text-2xl font-bold text-foreground">FGC</p>
                    <p className="text-xs text-muted-foreground mt-1">Até R$ 250k protegidos</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── RENDA FIXA TABLE ────────────────────── */}
      <section id="renda-fixa" className="py-6 md:py-9 bg-muted/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-6">
            <motion.div variants={fadeUp} custom={0} className="text-center max-w-2xl mx-auto space-y-4">
              <span className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Simulação</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Quanto rendem seus investimentos?
              </h2>
              <p className="text-muted-foreground text-base">Resultados em 12 meses para diferentes valores iniciais.</p>
            </motion.div>

            <motion.div variants={fadeUp} custom={1}>
              <Card className="overflow-hidden border-border/40 shadow-soft rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="text-left px-6 py-4 font-semibold">Ativo</th>
                        <th className="text-center px-4 py-4 font-semibold">Rentabilidade</th>
                        <th className="text-right px-4 py-4 font-semibold">R$ 50.000</th>
                        <th className="text-right px-4 py-4 font-semibold">R$ 100.000</th>
                        <th className="text-right px-6 py-4 font-semibold">R$ 1.000.000</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, i) => (
                        <tr key={row.ativo} className={`border-b border-border/30 ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
                          <td className="px-6 py-4 font-medium text-foreground">{row.ativo}</td>
                          <td className="text-center px-4 py-4 text-accent font-semibold">{row.rent}</td>
                          <td className="text-right px-4 py-4 text-muted-foreground tabular-nums">{row.v50}</td>
                          <td className="text-right px-4 py-4 text-muted-foreground tabular-nums">{row.v100}</td>
                          <td className="text-right px-6 py-4 font-semibold text-foreground tabular-nums">{row.v1m}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <p className="text-xs text-muted-foreground mt-4 text-center max-w-3xl mx-auto">
                Taxas pós-fixadas e atreladas a inflação podem sofrer alteração. Alíquota de IR considerada: 17,5%. Inflação implícita: 4,51%. DI futuro: 13,16% — referência Anbima.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Seção "Entenda cada tipo..." movida para DENTRO do simulador (abaixo dos 3 cards de tipo de renda). */}

      {/* ── SIMULATOR (image-faithful, Novare blue) ─────────── */}
      <section
        id="simulador"
        className="py-6 md:py-9 relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background"
      >
        {/* Background orbs sutis (azul Novare) */}
        <motion.div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[180px] pointer-events-none"
          style={{ background: "hsl(var(--novare-blue) / 0.05)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px] pointer-events-none"
          style={{ background: "hsl(var(--novare-blue-bright) / 0.07)" }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-novare-blue/40 to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>

            {/* ─── TOPO: Hero esquerda + 3 cards de tipo de renda direita ─── */}
            <motion.div variants={fadeUp} custom={0} className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)] gap-4 md:gap-5 items-center mb-4 md:mb-5">
              {/* Hero esquerda */}
              <div className="space-y-3 md:space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55 }}
                  className="calc-novare-banner relative w-full flex items-center justify-between gap-3 sm:gap-4 pl-3 pr-2.5 sm:pl-4 sm:pr-3 md:pl-5 md:pr-4 py-2.5 sm:py-3 md:py-3.5 rounded-2xl overflow-hidden"
                >
                  {/* Lado esquerdo: logo + tagline */}
                  <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 relative z-10 min-w-0 flex-1">
                    <img
                      src={logoBranca}
                      alt="Novare Consultoria de Investimentos"
                      className="h-6 sm:h-7 md:h-9 w-auto shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    />
                    <span className="hidden sm:block h-7 md:h-9 w-px bg-gradient-to-b from-transparent via-white/30 to-transparent shrink-0" />
                    <div className="hidden sm:flex flex-col leading-[1.15] min-w-0 truncate">
                      <span className="text-white text-[10.5px] md:text-[12.5px] font-semibold tracking-[0.12em] uppercase truncate">
                        Consultoria
                      </span>
                      <span className="text-white/60 text-[9px] md:text-[10.5px] tracking-[0.16em] uppercase font-medium truncate">
                        de Investimentos
                      </span>
                    </div>
                  </div>

                  {/* Lado direito: badge premium */}
                  <span className="relative z-10 inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg bg-gradient-to-br from-novare-blue-bright to-novare-blue text-white text-[9.5px] sm:text-[10px] md:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.16em] font-bold shrink-0 whitespace-nowrap shadow-[0_2px_8px_-2px_hsl(var(--novare-blue-bright)/0.6),inset_0_1px_0_hsl(0_0%_100%/0.25)] ring-1 ring-novare-blue-bright/40">
                    <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] shrink-0" strokeWidth={2.5} />
                    Simulador
                  </span>
                </motion.div>

                <h2 className="text-3xl md:text-4xl lg:text-[2.85rem] font-black text-foreground tracking-tight leading-[1.04]">
                  Simulador Inteligente
                </h2>
                <h3 className="text-2xl md:text-3xl lg:text-[2.4rem] font-black tracking-tight leading-[1.04]">
                  <span className="text-foreground">Projete sua renda</span>{" "}
                  <span className="bg-gradient-to-r from-novare-blue via-novare-blue-bright to-novare-blue bg-clip-text text-transparent">
                    no longo prazo
                  </span>
                </h3>
                <p className="text-muted-foreground text-sm md:text-base max-w-md leading-relaxed">
                  Simule gratuitamente e planeje sua{" "}
                  <strong className="text-foreground font-semibold">aposentadoria</strong> com precisão profissional.
                </p>
              </div>

              {/* Bloco unificado: 3 tipos de renda + 3 estratégias (6 cards juntos) */}
              <div className="rounded-2xl border border-border/60 bg-card/40 dark:bg-card/20 backdrop-blur-sm p-3 md:p-4 space-y-3">
                <div className="space-y-2">
                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.28em] text-muted-foreground font-bold text-center lg:text-left">
                  Escolha a forma de rendimento
                </p>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 items-stretch">
                  {([
                    {
                      id: "fixa" as TipoRenda,
                      title: "Renda Fixa",
                      desc: "Mais previsível",
                      icon: TrendingUp,
                      badge: "Menor risco",
                      badgeBg: "bg-novare-blue-light text-novare-blue dark:bg-novare-blue/30 dark:text-novare-blue-bright",
                    },
                    {
                      id: "mista" as TipoRenda,
                      title: "Renda Mista",
                      desc: "Equilíbrio",
                      icon: Landmark,
                      badge: "Médio risco",
                      badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                    },
                    {
                      id: "variavel" as TipoRenda,
                      title: "Renda Variável",
                      desc: "Maior retorno",
                      icon: ArrowUpRight,
                      badge: "Maior risco",
                      badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                    },
                  ]).map((t) => {
                    const Icon = t.icon;
                    const isSel = t.id === tipoRenda;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTipoRendaChange(t.id)}
                        aria-pressed={isSel}
                        className={`relative flex flex-col h-full min-w-0 text-left rounded-xl border transition-all duration-200 p-2 sm:p-2.5 md:p-3 cursor-pointer group ${
                          isSel
                            ? "border-novare-blue/60 bg-novare-blue-light/40 dark:bg-novare-blue/15 shadow-[0_8px_22px_-12px_hsl(var(--novare-blue)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.5)]"
                            : "border-border/60 bg-card hover:border-novare-blue/30 hover:-translate-y-0.5 hover:shadow-md"
                        }`}
                      >
                        {/* Bolinha de seleção no canto superior direito */}
                        <span
                          className={`absolute top-1.5 right-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full transition-all ${
                            isSel
                              ? "bg-novare-blue text-white shadow-[0_2px_6px_-1px_hsl(215_50%_23%/0.5)]"
                              : "bg-transparent border border-border/70 group-hover:border-novare-blue/50"
                          }`}
                          aria-hidden
                        >
                          {isSel && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                        </span>

                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSel
                                ? "bg-novare-blue/15 dark:bg-novare-blue-bright/20"
                                : "bg-muted/70"
                            }`}
                          >
                            <Icon
                              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 ${
                                isSel ? "text-novare-blue dark:text-novare-blue-bright" : "text-muted-foreground"
                              }`}
                              strokeWidth={2.25}
                            />
                          </div>
                          <p
                            className={`text-[10.5px] sm:text-[12px] md:text-sm font-bold leading-tight pr-4 min-w-0 break-words ${
                              isSel ? "text-novare-blue dark:text-novare-blue-bright" : "text-foreground"
                            }`}
                          >
                            {t.title}
                          </p>
                        </div>

                        <p className="text-[9.5px] sm:text-[10px] md:text-[11px] text-muted-foreground mt-1 sm:mt-1.5 leading-snug">{t.desc}</p>

                        <span
                          className={`inline-flex self-start mt-auto pt-1.5 sm:pt-2 px-1.5 py-0.5 rounded text-[8px] sm:text-[8.5px] md:text-[9.5px] font-bold uppercase tracking-wider w-fit ${t.badgeBg}`}
                        >
                          {t.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider sutil entre os 3 tipos e as 3 estratégias */}
              <div className="h-px bg-border/50 my-1" />

              {/* ─── BENTO de faixas (Prefixado / CDI / IPCA+ ...) — embutido logo abaixo dos 3 tipos ─── */}
              <div className="space-y-2">
                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.28em] text-muted-foreground font-bold text-center lg:text-left">
                  {tipoRenda === "fixa"
                    ? "Entenda cada tipo de Renda Fixa — selecione um"
                    : tipoRenda === "mista"
                      ? "Estratégias de Renda Mista — selecione uma"
                      : "Opções em Renda Variável — selecione uma"}
                </p>
                <div key={tipoRenda} className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 items-stretch">
                  {currentBento.map((f, i) => {
                    const isHero = f.variant === "hero";
                    const isSelected = selectedFaixa === f.title;
                    return (
                      <motion.div
                        key={f.title}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.07, ease: "easeOut" }}
                        className="h-full min-w-0"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSim((prev) => ({ ...prev, rentabilidade: f.rentAnual }));
                            setRentPeriodo("anual");
                            setSelectedFaixa(f.title);
                          }}
                          aria-pressed={isSelected}
                          className={`relative w-full text-left h-full rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? isHero
                                ? "bg-primary text-primary-foreground calc-card-md-dark-selected"
                                : "bg-card text-foreground calc-card-md-selected"
                              : isHero
                                ? "bg-primary text-primary-foreground calc-card-md-dark hover:-translate-y-0.5"
                                : "bg-card text-foreground calc-card-md hover:-translate-y-0.5"
                          }`}
                        >
                          {/* Bolinha de seleção no canto superior direito */}
                          <span
                            className={`absolute top-2 right-2 z-20 inline-flex items-center justify-center rounded-full transition-all duration-200 ${
                              isSelected
                                ? "w-5 h-5 md:w-[22px] md:h-[22px] bg-accent text-accent-foreground ring-2 ring-accent/30 shadow-[0_4px_12px_-2px_hsl(var(--accent)/0.6)] scale-100"
                                : isHero
                                  ? "w-4 h-4 md:w-[18px] md:h-[18px] bg-primary-foreground/5 border-[1.5px] border-primary-foreground/50"
                                  : "w-4 h-4 md:w-[18px] md:h-[18px] bg-background border-[1.5px] border-border"
                            }`}
                            aria-hidden
                          >
                            {isSelected && <Check className="h-3 w-3 md:h-3.5 md:w-3.5" strokeWidth={4} />}
                          </span>

                          <div className="p-2 sm:p-2.5 md:p-3 flex flex-col h-full relative z-10 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 min-w-0">
                              <div
                                className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-accent/20 ring-1 ring-accent/40"
                                    : isHero
                                      ? "bg-primary-foreground/10"
                                      : "bg-muted"
                                }`}
                              >
                                <f.icon
                                  className={`h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 ${
                                    isSelected ? "text-accent" : isHero ? "" : "text-foreground"
                                  }`}
                                  strokeWidth={2.25}
                                />
                              </div>
                              <h3 className="text-[10px] sm:text-[11px] md:text-xs font-bold tracking-tight pr-5 leading-tight min-w-0 break-words">
                                {f.title}
                              </h3>
                            </div>

                            <p
                              className={`hidden md:block text-[10px] leading-snug mb-2 line-clamp-2 ${
                                isHero ? "opacity-75" : "text-muted-foreground"
                              }`}
                            >
                              {f.desc}
                            </p>

                            <div
                              className={`mt-auto pt-1.5 border-t ${
                                isHero ? "border-primary-foreground/15" : "border-border/40"
                              }`}
                            >
                              <div className="flex items-baseline gap-1 flex-wrap">
                                <span className={`text-[13px] sm:text-sm md:text-base font-extrabold tracking-tight ${isHero ? "" : "text-primary"}`}>
                                  {f.rate}
                                </span>
                                {!f.rate.includes("IPCA") && (
                                  <span className={`text-[8.5px] sm:text-[9px] ${isHero ? "opacity-60" : "text-muted-foreground"}`}>a.a.</span>
                                )}
                              </div>
                              <p className={`text-[8.5px] sm:text-[9px] mt-0.5 leading-tight line-clamp-1 ${isHero ? "opacity-55" : "text-muted-foreground"}`}>
                                {f.rateLabel}
                              </p>
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              </div>
            </motion.div>

            {/* ─── CORPO: Form esquerda / Resultados direita ─── */}
            <div className="grid lg:grid-cols-2 gap-4 md:gap-5 mt-4 md:mt-5">

              {/* ====== COLUNA ESQUERDA — Formulário em grupos ====== */}
              <motion.div variants={fadeUp} custom={1} className="calc-card-light rounded-3xl p-4 md:p-5 space-y-5 md:space-y-6">

                {/* Grupo 1 — INFORMAÇÕES PESSOAIS */}
                <div className="space-y-3">
                  <p className="sim-group-label">
                    <Users className="h-3.5 w-3.5" />
                    Informações Pessoais
                  </p>
                  <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
                    {([
                      { label: "Qual sua idade hoje?", key: "idadeAtual", hint: "anos", kind: "int" as const, placeholder: "ex: 30" },
                      { label: "Com que idade quer parar de trabalhar?", key: "idadeAposent", hint: "anos", kind: "int" as const, placeholder: "ex: 60" },
                    ]).map((f) => {
                      const numVal = (sim as any)[f.key] as number;
                      const display = numVal ? String(numVal) : "";
                      return (
                        <div key={f.key} className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground/85 leading-tight block">{f.label}</label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={display}
                              placeholder={f.placeholder}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "");
                                setSim({ ...sim, [f.key]: digits ? parseInt(digits, 10) : 0 });
                              }}
                              className="calc-input pl-4 pr-14"
                            />
                            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold transition-colors ${numVal ? "text-novare-blue dark:text-novare-blue-bright" : "text-muted-foreground/50"}`}>{f.hint}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grupo 2 — INVESTIMENTOS ATUAIS */}
                <div className="space-y-3">
                  <p className="sim-group-label">
                    <PiggyBank className="h-3.5 w-3.5" />
                    Investimentos Atuais
                  </p>
                  <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
                    {([
                      { label: "Quanto já tem guardado/investido?", key: "patrimonioAtual", placeholder: "ex: 100.000,00" },
                      { label: "Quanto consegue investir por mês?", key: "aporte", placeholder: "ex: 1.500,00" },
                    ]).map((f) => {
                      const numVal = (sim as any)[f.key] as number;
                      const display = numVal ? numVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
                      return (
                        <div key={f.key} className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground/85 leading-tight block">{f.label}</label>
                          <div className="relative">
                            <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold transition-colors ${numVal ? "text-novare-blue dark:text-novare-blue-bright" : "text-muted-foreground/80"}`}>R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={display}
                              placeholder={f.placeholder}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "");
                                const cents = digits ? parseInt(digits, 10) : 0;
                                setSim({ ...sim, [f.key]: cents / 100 });
                              }}
                              className="calc-input pl-11 pr-4"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grupo 3 — RENDIMENTOS E TAXAS */}
                <div className="space-y-3">
                  <p className="sim-group-label">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Rendimentos e Taxas
                  </p>
                  <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground/85 leading-tight block">Qual renda mensal deseja no futuro?</label>
                      <div className="relative">
                        <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold transition-colors ${sim.rendaDesejada ? "text-novare-blue dark:text-novare-blue-bright" : "text-muted-foreground/80"}`}>R$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={sim.rendaDesejada ? sim.rendaDesejada.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                          placeholder="ex: 10.000,00"
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            const cents = digits ? parseInt(digits, 10) : 0;
                            setSim({ ...sim, rendaDesejada: cents / 100 });
                          }}
                          className="calc-input pl-11 pr-4"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-foreground/85 leading-tight block">Taxa de juros dos seus investimentos</label>
                        {/* Toggle Anual / Mensal */}
                        <div className="inline-flex items-center rounded-full border border-border/60 bg-background/60 p-0.5 shadow-sm">
                          {(["anual", "mensal"] as const).map((p) => {
                            const ativo = rentPeriodo === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  if (ativo) return;
                                  // Converte o valor digitado para o novo período (preserva equivalência)
                                  setSim((prev) => {
                                    if (!prev.rentabilidade) return prev;
                                    const novoValor = p === "mensal"
                                      ? (Math.pow(1 + prev.rentabilidade / 100, 1 / 12) - 1) * 100
                                      : (Math.pow(1 + prev.rentabilidade / 100, 12) - 1) * 100;
                                    return { ...prev, rentabilidade: Number(novoValor.toFixed(2)) };
                                  });
                                  setRentPeriodo(p);
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wide transition-all ${
                                  ativo
                                    ? "bg-novare-blue text-white shadow-[0_2px_8px_-2px_hsl(var(--novare-blue)/0.55)]"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {p === "anual" ? "Anual" : "Mensal"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={rentPeriodo === "mensal" ? "ex: 1,28" : "ex: 16,5"}
                          value={
                            sim.rentabilidade
                              ? sim.rentabilidade.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                              : ""
                          }
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
                            const n = parseFloat(raw);
                            const max = rentPeriodo === "mensal" ? 50 : 200;
                            const clamped = Number.isFinite(n) ? Math.min(n, max) : 0;
                            setSim({ ...sim, rentabilidade: clamped });
                            setSelectedFaixa(null);
                          }}
                          className="calc-input pl-4 pr-20"
                        />
                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold transition-colors ${sim.rentabilidade ? "text-novare-blue dark:text-novare-blue-bright" : "text-muted-foreground/50"}`}>
                          {rentPeriodo === "mensal" ? "% a.m." : "% a.a."}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">
                        {rentPeriodo === "mensal"
                          ? `≈ ${rentAnual.toFixed(2)}% ao ano`
                          : `≈ ${((Math.pow(1 + sim.rentabilidade / 100, 1 / 12) - 1) * 100).toFixed(2)}% ao mês`}
                        {" · "}Selic atual ~14,75% a.a.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grupo 4 — IMPOSTO DE RENDA NA APLICAÇÃO (100% automático) */}
                <div className="space-y-3">
                  <p className="sim-group-label">
                    <Receipt className="h-3.5 w-3.5" />
                    Imposto de Renda na Aplicação
                  </p>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Calculado automaticamente conforme o <span className="font-semibold text-foreground/80">tipo de renda</span> e o <span className="font-semibold text-foreground/80">prazo</span> escolhidos.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
                    {/* Card 1 — Alíquota automática */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground/85 leading-tight block">
                        Alíquota de IR ({tipoRenda === "fixa" ? "Renda Fixa" : tipoRenda === "mista" ? "Renda Mista" : "Renda Variável"})
                      </label>
                      <div className="calc-input pl-4 pr-4 flex items-center justify-between bg-gradient-to-br from-novare-blue-light/40 to-transparent dark:from-novare-blue/15">
                        <span className="text-xl font-extrabold text-novare-blue dark:text-novare-blue-bright tabular-nums tracking-tight">
                          {aliquotaEfetivaAtual.toString().replace(".", ",")}%
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-novare-blue/10 dark:bg-novare-blue-bright/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-novare-blue dark:text-novare-blue-bright">
                          <Sparkles className="h-3 w-3" />
                          Auto
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 leading-snug">{regraIRTexto}</p>
                    </div>

                    {/* Card 2 — Rendimento líquido após IR */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground/85 leading-tight block">Rendimento líquido após IR</label>
                      <div className="calc-input pl-4 pr-4 flex items-center justify-between bg-gradient-to-br from-novare-blue-light/40 to-transparent dark:from-novare-blue/15">
                        <span className="text-xl font-extrabold text-novare-blue dark:text-novare-blue-bright tabular-nums tracking-tight">
                          {sim.rentabilidade
                            ? `${(rentAnual * (1 - aliquotaEfetivaAtual / 100)).toFixed(2).replace(".", ",")}%`
                            : "—"}
                        </span>
                        <span className="text-[10px] font-bold text-novare-blue/70 dark:text-novare-blue-bright/70 uppercase tracking-wider">a.a.</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80">
                        Bruto {rentAnual.toFixed(2).replace(".", ",")}% − IR {aliquotaEfetivaAtual.toString().replace(".", ",")}%
                      </p>
                    </div>

                    {/* Card 3 — Valor de IR estimado sobre o ganho */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground/85 leading-tight block">Imposto estimado no resgate</label>
                      <div className="calc-input pl-4 pr-4 flex items-center justify-between bg-gradient-to-br from-amber-100/40 to-transparent dark:from-amber-900/15">
                        <span className="text-xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums tracking-tight">
                          {result ? result.irDevido : "—"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-400/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          <Receipt className="h-3 w-3" />
                          IR devido
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80">
                        {result
                          ? `${aliquotaEfetivaAtual.toString().replace(".", ",")}% sobre o ganho bruto de ${result.ganhoBruto}.`
                          : "Será calculado após você simular a aposentadoria."}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10.5px] text-muted-foreground/70 leading-relaxed border-t border-border/40 pt-3">
                  <span className="font-bold text-foreground/70">*</span> Valores em rentabilidade nominal (bruta). IR deduzido apenas no resgate conforme tabela regressiva. Resultados são estimativas.
                </p>

                {/* Botão principal — junto da edição de dados */}
                <button
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className="sim-btn-orange group w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-bold text-sm md:text-base disabled:opacity-70 disabled:cursor-wait"
                >
                  <BarChart3 className="h-[18px] w-[18px]" />
                  <span>{result ? "Recalcular simulação" : "Simular Aposentadoria"}</span>
                  <ArrowRight className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </motion.div>

              {/* ====== COLUNA DIREITA — Cenário projetado + KPIs + Gráfico ====== */}
              <motion.div variants={fadeUp} custom={2} className="flex flex-col gap-4 md:gap-5 min-w-0">

                {/* Painel escuro — Seu cenário projetado */}
                <div className="sim-hero-dark relative rounded-3xl p-4 md:p-5 overflow-hidden">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <p className="text-xs md:text-sm uppercase tracking-[0.18em] text-white/70 font-bold">Seu cenário projetado</p>
                    </div>
                    {result && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-novare-blue-bright/25 border border-novare-blue-bright/40 text-novare-blue-bright text-[11px] font-bold uppercase tracking-wider">
                        aos {sim.idadeAposent} anos
                      </span>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5 md:gap-6 relative">
                    <div className="min-w-0 sm:pr-5 sm:border-r border-white/10">
                      <p className="text-[11px] md:text-xs uppercase tracking-wider text-white/65 font-semibold mb-2">Patrimônio bruto estimado</p>
                      <motion.p
                        key={result?.patrimonioNum ?? "empty-bruto"}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="calc-num text-[1.7rem] md:text-[2.1rem] lg:text-[2.4rem] font-black text-novare-blue-bright leading-[1] break-words"
                        style={{ textShadow: "0 2px 24px hsl(var(--novare-blue-bright) / 0.45)" }}
                        title={result?.patrimonio}
                      >
                        {result ? formatCompactBRL(result.patrimonioNum) : "R$ —"}
                      </motion.p>
                      <p className="text-[11px] text-white/55 mt-2 font-medium">Valor acumulado ao final do período</p>
                    </div>
                    <div className="min-w-0 sm:pl-1">
                      <p className="text-[11px] md:text-xs uppercase tracking-wider text-white/65 font-semibold mb-2">Patrimônio líquido após IR</p>
                      <motion.p
                        key={result?.patrimonioLiquidoNum ?? "empty-liq"}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 }}
                        className="calc-num text-[1.7rem] md:text-[2.1rem] lg:text-[2.4rem] font-black text-white leading-[1] break-words"
                        title={result?.patrimonioLiquido}
                      >
                        {result ? formatCompactBRL(result.patrimonioLiquidoNum) : "R$ —"}
                      </motion.p>
                      <p className="text-[11px] text-white/55 mt-2 font-medium">Valor líquido acumulado ao final do período</p>
                    </div>
                  </div>
                </div>

                {/* 3 KPIs laterais */}
                <div className="grid sm:grid-cols-3 gap-3 md:gap-4">
                  {[
                    {
                      label: "Renda mensal",
                      icon: Wallet,
                      value: result ? formatCompactBRL(result.rendaMensalLiquidaNum) : "R$ —",
                      sub: "em valores de hoje",
                    },
                    {
                      label: "Renda anual",
                      icon: Calendar,
                      value: result ? formatCompactBRL(result.rendaMensalLiquidaNum * 12) : "R$ —",
                      sub: "em valores de hoje",
                    },
                    {
                      label: "Taxa de reposição",
                      icon: Percent,
                      value: result && result.rendaDesejadaNum > 0
                        ? `${Math.min(999, Math.round(result.rendaVsDesejada))}%`
                        : "—",
                      sub: "da renda desejada\nem valores de hoje",
                    },
                  ].map((k) => {
                    const Icon = k.icon;
                    return (
                      <div key={k.label} className="sim-kpi min-w-0">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: "linear-gradient(135deg, hsl(var(--novare-blue) / 0.18), hsl(var(--novare-blue-bright) / 0.06))",
                              border: "1px solid hsl(var(--novare-blue) / 0.20)",
                              boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.7)",
                            }}
                          >
                            <Icon className="h-[18px] w-[18px] text-novare-blue dark:text-novare-blue-bright" strokeWidth={2.25} />
                          </div>
                          <p className="text-[11px] md:text-xs uppercase tracking-[0.12em] text-foreground/75 font-bold leading-tight">{k.label}</p>
                        </div>
                        <p className="calc-num text-lg md:text-xl lg:text-[1.4rem] font-black text-novare-blue dark:text-novare-blue-bright leading-tight truncate" title={k.value}>
                          {k.value}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground mt-1.5 leading-snug whitespace-pre-line font-medium">
                          {k.sub}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Gráfico de evolução do patrimônio líquido */}
                <div className="calc-card-light rounded-3xl p-4 md:p-5 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight leading-tight">
                        Evolução do patrimônio líquido após IR
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-novare-blue-light/70 dark:bg-novare-blue/20 text-novare-blue dark:text-novare-blue-bright text-xs font-bold border border-novare-blue/20">
                      Cenário base
                      <ChevronDown className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  {result && result.timeline.length > 1 ? (
                    <div className="relative h-[260px] md:h-[300px] -ml-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.timeline} margin={{ top: 30, right: 16, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradNetBlue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--novare-blue-bright))" stopOpacity={0.45} />
                              <stop offset="100%" stopColor="hsl(var(--novare-blue))" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 6" stroke="hsl(220 13% 88%)" vertical={false} />
                          <XAxis
                            dataKey="age"
                            tick={{ fill: "hsl(220 9% 38%)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: "hsl(220 13% 88%)" }}
                            tickFormatter={(v) => `${v} anos`}
                            interval="preserveStartEnd"
                            minTickGap={32}
                          />
                          <YAxis
                            tick={{ fill: "hsl(220 9% 38%)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) => {
                              if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
                              if (v >= 1_000) return `R$ ${Math.round(v / 1_000)}k`;
                              return `R$ ${v}`;
                            }}
                            width={60}
                          />
                          <RTooltip
                            contentStyle={{
                              background: "hsl(0 0% 100%)",
                              border: "1px solid hsl(var(--novare-blue) / 0.2)",
                              borderRadius: 12,
                              color: "hsl(220 20% 12%)",
                              fontSize: 12,
                              boxShadow: "0 12px 32px -12px hsl(var(--novare-blue) / 0.25)",
                            }}
                            labelFormatter={(label, payload) => {
                              const p = payload?.[0]?.payload as YearPoint | undefined;
                              return p ? `Ano ${p.year} · ${p.age} anos` : `${label} anos`;
                            }}
                            formatter={(value: number) => [
                              value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
                              "Patrimônio líquido",
                            ]}
                          />
                          <Area
                            type="monotone"
                            dataKey="net"
                            stroke="hsl(var(--novare-blue-bright))"
                            strokeWidth={2.75}
                            fill="url(#gradNetBlue)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>

                      {/* Badge final flutuante */}
                      <div className="absolute top-1 right-3 sim-chart-badge text-[11px] md:text-xs font-bold leading-tight">
                        <p className="calc-num text-sm md:text-base font-black">
                          {formatCompactBRL(result.patrimonioLiquidoNum)}
                        </p>
                        <p className="text-[10px] font-semibold text-white/85">aos {sim.idadeAposent} anos</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[260px] md:h-[300px] flex flex-col items-center justify-center text-center px-6 rounded-2xl border border-dashed border-border/60 bg-muted/30">
                      <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">
                        Preencha os campos ao lado e clique em <span className="font-bold text-novare-blue dark:text-novare-blue-bright">Simular Aposentadoria</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">para visualizar a evolução do seu patrimônio.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* ─── CTAs FINAIS — Falar com especialista + PDF ─── */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-5"
            >
              <button
                onClick={() => window.open(whatsappUrl, "_blank")}
                className="sim-btn-blue group inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-bold text-sm md:text-base"
              >
                <MessageCircle className="h-[18px] w-[18px]" />
                <span>Falar com um especialista</span>
                <ArrowRight className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => result && generateRendimentoPDF(result, {
                  idadeAtual: sim.idadeAtual,
                  idadeAposent: sim.idadeAposent,
                  patrimonioAtual: sim.patrimonioAtual,
                  aporte: sim.aporte,
                  rendaDesejada: sim.rendaDesejada,
                  rentabilidadeAnual: rentAnual,
                })}
                disabled={!result}
                title={!result ? "Simule primeiro para gerar o relatório" : undefined}
                className="sim-btn-outline inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-bold text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed !text-red-600 dark:!text-red-400"
              >
                <FileDown className="h-[18px] w-[18px] text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400">Baixar relatório em PDF</span>
              </button>
            </motion.div>

            {/* Selo de segurança */}
            <p className="text-center text-[11px] text-muted-foreground mt-4 inline-flex items-center justify-center gap-2 w-full">
              <Lock className="h-3 w-3 text-novare-blue dark:text-novare-blue-bright" />
              Seus dados estão seguros e protegidos conosco.
            </p>

            {/* ── DETALHAMENTO DO CÁLCULO DO IR ───── */}
            {result && result.totalInvestidoNum > 0 && (() => {
              const baseCalculo = Math.max(0, result.patrimonioNum - result.totalInvestidoNum); // ganho bruto
              const valorIR = baseCalculo * (result.aliquotaIR / 100);
              const fmtFull = (v: number) =>
                v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const aliquotaTabela = [
                { faixa: "Até 180 dias", aliq: 22.5 },
                { faixa: "181 a 360 dias", aliq: 20 },
                { faixa: "361 a 720 dias", aliq: 17.5 },
                { faixa: "Acima de 720 dias", aliq: 15 },
              ];
              const steps = [
                {
                  num: 1,
                  label: "Base de cálculo (ganho bruto)",
                  formula: "Patrimônio bruto − Total investido",
                  detail: `${formatCompactBRL(result.patrimonioNum)} − ${formatCompactBRL(result.totalInvestidoNum)}`,
                  value: formatCompactBRL(baseCalculo),
                  fullValue: fmtFull(baseCalculo),
                  tooltip: "O Imposto de Renda incide APENAS sobre o lucro (rendimento), nunca sobre o que você aportou. A base de cálculo é a diferença entre o patrimônio acumulado e o total que você investiu ao longo do tempo.",
                  color: "text-foreground",
                },
                {
                  num: 2,
                  label: "Alíquota aplicada",
                  formula: `Tabela regressiva · ${result.anosAcumulo} anos de aplicação`,
                  detail: result.anosAcumulo > 2 ? "Acima de 720 dias = menor alíquota" : "Resgate em prazo curto = alíquota maior",
                  value: `${result.aliquotaIR}%`,
                  fullValue: `${result.aliquotaIR}% sobre o ganho`,
                  tooltip: "A tabela regressiva do IR premia quem investe por mais tempo: até 180 dias paga 22,5%, entre 181-360 dias paga 20%, 361-720 dias paga 17,5%, e acima de 720 dias paga apenas 15% — a menor alíquota possível em renda fixa.",
                  color: "text-warning",
                },
                {
                  num: 3,
                  label: "Imposto devido (descontado)",
                  formula: `Base × Alíquota`,
                  detail: `${formatCompactBRL(baseCalculo)} × ${result.aliquotaIR}%`,
                  value: formatCompactBRL(valorIR),
                  fullValue: fmtFull(valorIR),
                  tooltip: "Este é o valor que será retido pelo governo no momento do resgate. Ele sai automaticamente do seu rendimento — você recebe líquido na conta. Em fundos com come-cotas, parte é antecipada semestralmente.",
                  color: "text-accent",
                },
                {
                  num: 4,
                  label: "Patrimônio líquido (o que você recebe)",
                  formula: "Patrimônio bruto − IR devido",
                  detail: `${formatCompactBRL(result.patrimonioNum)} − ${formatCompactBRL(valorIR)}`,
                  value: formatCompactBRL(result.patrimonioLiquidoNum),
                  fullValue: fmtFull(result.patrimonioLiquidoNum),
                  tooltip: "Este é o valor final que efetivamente cai na sua conta após o desconto do Imposto de Renda no resgate. É o valor real disponível para você usar ou reinvestir.",
                  color: "text-success",
                },
              ];
              return (
                <TooltipProvider delayDuration={200}>
                  <motion.div
                    variants={fadeUp}
                    custom={1.5}
                    className="calc-card-light rounded-3xl overflow-hidden"
                  >
                    <div className="p-6 md:p-8">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-11 h-11 rounded-xl bg-warning/15 shadow-[0_0_15px_hsl(var(--warning)/0.15)] flex items-center justify-center shrink-0">
                          <Receipt className="h-6 w-6 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
                            Como o Imposto de Renda foi calculado
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Passo a passo do desconto sobre seus rendimentos · passe o mouse em cada item para entender
                          </p>
                        </div>
                      </div>

                      {/* Steps */}
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {steps.map((s) => (
                          <Tooltip key={s.num}>
                            <TooltipTrigger asChild>
                              <div className="group relative p-4 md:p-5 rounded-2xl bg-card border border-border/40 hover:border-accent/30 hover:bg-muted/40 transition-all duration-200 cursor-help min-w-0 shadow-soft">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-accent/15 text-accent text-xs font-bold">
                                    {s.num}
                                  </span>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-accent transition-colors" />
                                </div>
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-semibold leading-tight mb-1.5">
                                  {s.label}
                                </p>
                                <p className={`text-xl md:text-2xl font-bold tracking-tight tabular-nums break-words ${s.color}`} title={s.fullValue}>
                                  {s.value}
                                </p>
                                <div className="mt-2 pt-2 border-t border-border/40 space-y-0.5">
                                  <p className="text-[10px] text-muted-foreground/80 font-medium">{s.formula}</p>
                                  <p className="text-[10px] text-muted-foreground/60 truncate" title={s.detail}>{s.detail}</p>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                              {s.tooltip}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>

                      {/* Tabela regressiva auxiliar */}
                      <div className="mt-6 pt-5 border-t border-border/40">
                        <div className="flex items-center gap-2 mb-3">
                          <Percent className="h-4 w-4 text-muted-foreground/80" />
                          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-semibold">
                            Tabela regressiva do IR (Renda Fixa)
                          </p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-accent cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                              Quanto mais tempo você mantém o investimento, menor a alíquota de IR. É um incentivo do governo ao investimento de longo prazo.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {aliquotaTabela.map((t) => {
                            const isCurrent = t.aliq === result.aliquotaIR;
                            return (
                              <div
                                key={t.faixa}
                                className={`p-3 rounded-xl transition-all ${
                                  isCurrent
                                    ? "calc-card-sm-selected"
                                    : "calc-card-sm"
                                }`}
                              >
                                <p className={`text-[10px] uppercase tracking-wider font-semibold ${isCurrent ? "text-accent" : "text-muted-foreground/80"}`}>
                                  {t.faixa}
                                </p>
                                <p className={`text-lg font-bold tabular-nums mt-0.5 ${isCurrent ? "text-accent" : "text-muted-foreground"}`}>
                                  {t.aliq.toString().replace(".", ",")}%
                                </p>
                                {isCurrent && (
                                  <p className="text-[9px] text-accent/80 font-semibold mt-0.5 uppercase tracking-wider">
                                    ✓ Sua alíquota
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mt-3 leading-relaxed">
                          * Aplicável a investimentos como CDB, LCI/LCA (estes isentos), Tesouro Direto, debêntures e fundos de renda fixa. Ações e fundos imobiliários têm regras próprias.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </TooltipProvider>
              );
            })()}

            {/* ── EVOLUÇÃO: Tabela ano-a-ano ───────── */}
            {result && result.timeline.length > 1 && (
              <motion.div
                variants={fadeUp}
                custom={2}
                className="calc-card-light rounded-3xl p-6 md:p-8 relative overflow-hidden"
              >
                <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-novare-blue dark:text-novare-blue-bright font-semibold mb-1">Tabela ano a ano</p>
                    <h3 className="text-xl font-bold text-foreground tracking-tight">Acompanhe o crescimento</h3>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Patrimônio líquido estimado após IR (tabela regressiva). Ano 0 = hoje.
                  </p>
                </div>
                <div className="max-h-[360px] overflow-y-auto pr-1 -mr-1 sidebar-scroll">
                  <Table>
                    <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(var(--muted))" }}>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold h-9">Idade</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold text-right h-9">Investido</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold text-right h-9">Patrimônio</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-novare-blue dark:text-novare-blue-bright font-semibold text-right h-9">Ganho</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.timeline.map((row, idx) => {
                        const isLast = idx === result.timeline.length - 1;
                        return (
                          <TableRow
                            key={row.year}
                            className={`border-border/40 hover:bg-muted/40 ${isLast ? "bg-novare-blue/[0.06]" : ""}`}
                          >
                            <TableCell className="text-xs text-foreground/80 font-medium py-2.5">
                              {row.age}
                              <span className="text-muted-foreground/60 ml-1 text-[10px]">(ano {row.year})</span>
                            </TableCell>
                            <TableCell className="text-xs text-foreground/55 text-right tabular-nums py-2.5">
                              {row.invested.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-right tabular-nums py-2.5 text-foreground">
                              {row.net.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-xs text-novare-blue dark:text-novare-blue-bright font-semibold text-right tabular-nums py-2.5">
                              {row.gain >= 0 ? "+" : ""}
                              {row.gain.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            )}

          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────── */}
      <section className="py-6 md:py-9 bg-muted/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-6">
            <motion.div variants={fadeUp} custom={0} className="text-center max-w-2xl mx-auto space-y-4">
              <span className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Depoimentos</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                O que dizem nossos clientes
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4">
              {testimonials.map((t, i) => (
                <motion.div key={t.name} variants={fadeUp} custom={i + 1}>
                  <Card className="h-full rounded-2xl border-border/40 shadow-subtle">
                    <CardContent className="p-7 space-y-5">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <span key={j} className="text-accent text-sm">★</span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                      <div className="flex items-center gap-3 pt-3 border-t border-border/30">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{t.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA BENTO ───────────────────────────── */}
      <section id="contato" className="py-6 md:py-9">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <Card className="rounded-3xl border-border/40 shadow-soft overflow-hidden bg-primary text-primary-foreground">
              <CardContent className="p-0">
                <div className="grid lg:grid-cols-2">
                  {/* Left */}
                  <motion.div variants={fadeUp} custom={0} className="p-6 md:p-10 space-y-4 flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Consultoria Novare</span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.15]">
                      Conte com um especialista para investir melhor
                    </h2>
                    <p className="text-primary-foreground/60 text-base leading-relaxed">
                      A Novare constrói um plano personalizado a partir dos seus objetivos de vida. Sem conflito de interesse, só foco no seu resultado.
                    </p>
                    <div className="space-y-2.5">
                      {["Consultoria personalizada e independente", "Acompanhamento contínuo do portfólio", "Comunicação direta com seu consultor"].map((item) => (
                        <div key={item} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                            <Check className="h-6 w-6 text-accent" />
                          </div>
                          <span className="text-sm font-medium opacity-80">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      <button
                        onClick={() => window.open(whatsappUrl, "_blank")}
                        className="group relative inline-flex items-center gap-2.5 bg-accent text-accent-foreground font-semibold text-sm px-6 py-3.5 rounded-2xl shadow-[0_6px_20px_-4px_hsl(var(--accent)/0.5)] hover:shadow-[0_8px_28px_-4px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap"
                      >
                        Falar com especialista
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-foreground/20 group-hover:bg-accent-foreground/30 transition-colors">
                          <MessageCircle className="h-6 w-6" />
                        </span>
                      </button>
                      <button
                        onClick={() => window.open("tel:+5519983402827")}
                        className="group relative inline-flex items-center gap-2.5 bg-primary-foreground/10 text-primary-foreground font-semibold text-sm px-6 py-3.5 rounded-2xl border border-primary-foreground/20 hover:bg-primary-foreground/15 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap"
                      >
                        (19) 98340-2827
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-foreground/10 group-hover:bg-primary-foreground/20 transition-colors">
                          <Phone className="h-6 w-6" />
                        </span>
                      </button>
                    </div>
                  </motion.div>

                  {/* Right — animated bento grid */}
                  <motion.div variants={fadeUp} custom={1} className="hidden lg:grid grid-cols-2 grid-rows-3 gap-3 p-6 min-h-[420px]">
                    {/* Card 1 — Clientes with animated counter */}
                    <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 p-6 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                      <motion.div
                        className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-accent/10"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center mb-auto relative z-10">
                        <Users className="h-6 w-6 text-accent" />
                      </div>
                      <div className="relative z-10">
                        <motion.p
                          className="text-4xl font-bold text-primary-foreground"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                        >+500</motion.p>
                        <p className="text-sm opacity-60 mt-1">Clientes atendidos</p>
                      </div>
                    </div>

                    {/* Card 2 — Experiência with pulse ring */}
                    <div className="rounded-2xl bg-primary-foreground/[0.06] p-6 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                      <div className="relative w-10 h-10 mb-auto">
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-primary-foreground/10"
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                        <div className="relative w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                          <Award className="h-6 w-6 text-primary-foreground/70" />
                        </div>
                      </div>
                      <div>
                        <motion.p
                          className="text-4xl font-bold"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 }}
                        >8 anos</motion.p>
                        <p className="text-sm opacity-60 mt-1">De experiência</p>
                      </div>
                    </div>

                    {/* Card 3 — animated mini chart visual */}
                    <div className="rounded-2xl bg-gradient-to-br from-primary-foreground/[0.08] to-transparent p-6 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                      {/* Animated bars */}
                      <div className="flex items-end gap-1.5 h-16 mb-auto">
                        {[40, 55, 35, 65, 50, 75, 60, 85, 70, 95].map((h, i) => (
                          <motion.div
                            key={i}
                            className="flex-1 rounded-t-sm bg-accent/30"
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05, duration: 0.6, ease: "easeOut" }}
                          />
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-semibold opacity-80">Crescimento consistente</p>
                        <p className="text-xs opacity-50 mt-0.5">Retornos acima da média de mercado</p>
                      </div>
                    </div>

                    {/* Card 4 — Patrimônio with floating particles */}
                    <div className="rounded-2xl bg-gradient-to-br from-accent/15 to-primary-foreground/[0.06] p-6 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                      <motion.div
                        className="absolute top-4 right-4 w-3 h-3 rounded-full bg-accent/40"
                        animate={{ y: [0, -12, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute top-12 right-10 w-2 h-2 rounded-full bg-primary-foreground/20"
                        animate={{ y: [0, -8, 0], opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                      />
                      <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center mb-auto relative z-10">
                        <DollarSign className="h-6 w-6 text-accent" />
                      </div>
                      <div className="relative z-10">
                        <motion.p
                          className="text-4xl font-bold text-primary-foreground"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 }}
                        >R$ 200M+</motion.p>
                        <p className="text-sm opacity-60 mt-1">Em patrimônio assessorado</p>
                      </div>
                    </div>

                    {/* Card 5 — Full width trust bar */}
                    <div className="col-span-2 rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/10 p-5 flex items-center gap-5 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex -space-x-2">
                          {["R", "M", "A", "L"].map((initial, i) => (
                            <motion.div
                              key={initial}
                              className="w-9 h-9 rounded-full bg-accent/20 border-2 border-primary flex items-center justify-center"
                              initial={{ x: -20, opacity: 0 }}
                              whileInView={{ x: 0, opacity: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.08 }}
                            >
                              <span className="text-xs font-bold text-accent">{initial}</span>
                            </motion.div>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Confiança de quem investe</p>
                          <p className="text-xs opacity-50">4.9 ★ de avaliação média dos clientes</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <motion.span
                            key={i}
                            className="text-accent text-sm"
                            initial={{ opacity: 0, scale: 0 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + i * 0.08 }}
                          >★</motion.span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────── */}
      <section id="faq" className="py-6 md:py-9 bg-muted/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 lg:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-6">
            <motion.div variants={fadeUp} custom={0} className="text-center space-y-4">
              <span className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">FAQ</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Perguntas Frequentes
              </h2>
            </motion.div>

            <motion.div variants={fadeUp} custom={1}>
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border border-border/40 rounded-2xl px-6 bg-card data-[state=open]:shadow-soft transition-shadow">
                    <AccordionTrigger className="text-left text-base font-semibold text-foreground py-5 hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── QUEM SOMOS ──────────────────────────── */}
      <section id="quem-somos" className="py-6 md:py-9">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-5">
            <motion.div variants={fadeUp} custom={0} className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Conheça os nossos{" "}
                <span className="text-accent">especialistas</span>
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Profissionais certificados com histórico comprovado no mercado financeiro.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="flex justify-center gap-8 md:gap-14">
              {founders.map((f, i) => (
                <motion.button
                  key={f.id}
                  onClick={() => setSelectedFounder(f.id)}
                  className="group flex flex-col items-center gap-4 focus:outline-none"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                >
                  <div className="relative">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-4 ring-accent/30 group-hover:ring-accent/70 transition-all duration-300 shadow-lg group-hover:shadow-[0_0_30px_-5px_hsl(var(--accent)/0.4)]">
                      <img src={f.img} alt={f.name} className="w-full h-full object-cover object-top" />
                    </div>
                    <motion.div
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-md"
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ArrowUpRight className="w-4 h-4 text-accent-foreground" />
                    </motion.div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-foreground text-base md:text-lg">{f.name.split(" ").slice(0, 2).join(" ")}</p>
                    <p className="text-xs text-accent font-semibold">{f.certs}</p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOUNDER POPUP ────────────────────────── */}
      <AnimatePresence>
        {selectedFounder && (() => {
          const f = founders.find(x => x.id === selectedFounder)!;
          return (
            <motion.div
              key="founder-overlay"
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Backdrop */}
              <motion.div
                className="absolute inset-0 bg-primary/60 backdrop-blur-md"
                onClick={() => setSelectedFounder(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              {/* Content */}
              <motion.div
                className="relative z-10 w-full max-w-lg bg-background rounded-3xl shadow-2xl overflow-hidden border border-border/40"
                initial={{ opacity: 0, scale: 0.8, y: 40, rotateX: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                {/* Close */}
                <button
                  onClick={() => setSelectedFounder(null)}
                  className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>

                {/* Header with gradient */}
                <div className="relative bg-gradient-to-br from-primary via-primary/90 to-accent/30 px-8 pt-8 pb-16">
                  <motion.div
                    className="absolute top-4 left-4 w-24 h-24 rounded-full bg-accent/10"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 6, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute bottom-8 right-8 w-16 h-16 rounded-full bg-primary-foreground/5"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                </div>

                {/* Avatar overlap */}
                <div className="flex justify-center -mt-14 relative z-10">
                  <motion.div
                    className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-background shadow-xl"
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.15, damping: 20 }}
                  >
                    <img src={f.img} alt={f.name} className="w-full h-full object-cover object-top" />
                  </motion.div>
                </div>

                {/* Info */}
                <div className="px-8 pb-8 pt-4 space-y-5">
                  <motion.div
                    className="text-center space-y-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className="text-xl font-bold text-foreground">{f.name}</h3>
                    <p className="text-sm text-accent font-semibold">{f.certs}</p>
                    <p className="text-xs text-muted-foreground">{f.role} · {f.shortBio}</p>
                  </motion.div>

                  <motion.p
                    className="text-sm text-muted-foreground leading-relaxed text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {f.bio}
                  </motion.p>

                  {/* Highlights */}
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                  >
                    {f.highlights.map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.08 }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <h.icon className="w-4 h-4 text-accent" />
                        </div>
                        <p className="text-sm text-foreground leading-snug">{h.text}</p>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* LinkedIn CTA */}
                  <motion.div
                    className="pt-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <a
                      href={f.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      <Linkedin className="w-4 h-4" />
                      Ver perfil no LinkedIn
                    </a>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── NEWSLETTER — immersive bento ────────── */}
      <section className="py-6 md:py-9">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <Card className="rounded-3xl border-border/40 shadow-soft overflow-hidden">
              <CardContent className="p-0">
                <div className="grid lg:grid-cols-2 min-h-[480px]">
                  {/* Left — visual side */}
                  <motion.div
                    variants={fadeUp}
                    custom={0}
                    className="relative min-h-[320px] lg:min-h-0 overflow-hidden"
                  >
                    <img
                      src={newsletterHero}
                      alt="Consultoria financeira"
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      width={800}
                      height={1024}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-primary/20" />

                    {/* Content over image */}
                    <div className="relative z-10 p-8 md:p-12 flex flex-col justify-end h-full">
                      <div className="space-y-4">
                        <motion.div
                          className="w-14 h-14 rounded-2xl bg-accent/20 backdrop-blur-sm flex items-center justify-center"
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 6, repeat: Infinity }}
                        >
                          <MessageCircle className="h-7 w-7 text-accent" />
                        </motion.div>
                        <h3 className="text-2xl md:text-3xl font-bold text-primary-foreground tracking-tight leading-tight">
                          Conteúdos que fazem<br />seu dinheiro render mais
                        </h3>
                        <p className="text-primary-foreground/60 text-sm max-w-xs">
                          Análises semanais sobre o mercado financeiro direto na sua caixa de entrada.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Right — form side */}
                  <motion.div
                    variants={fadeUp}
                    custom={1}
                    className="p-8 md:p-12 flex flex-col justify-center"
                  >
                    <div className="max-w-sm mx-auto lg:mx-0 w-full space-y-5">
                      <div className="space-y-3">
                        <img src={logoPreta} alt="Novare" className="h-7" />
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">
                          Receba conteúdos exclusivos
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Simulações, análises e dicas de investimento direto no seu email. Sem spam.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="Seu melhor e-mail"
                          value={newsletterEmail}
                          onChange={(e) => setNewsletterEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !newsletterLoading) handleNewsletterSubmit();
                          }}
                          disabled={newsletterLoading || newsletterDone}
                          maxLength={255}
                          className="h-13 rounded-2xl px-5 border-border/60 bg-muted/30 focus:bg-background transition-colors text-base"
                        />
                        <button
                          type="button"
                          onClick={handleNewsletterSubmit}
                          disabled={newsletterLoading || newsletterDone}
                          className="group relative w-full inline-flex items-center justify-center gap-3 bg-accent text-accent-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-[0_6px_20px_-4px_hsl(var(--accent)/0.5)] hover:shadow-[0_8px_28px_-4px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                          {newsletterDone ? "Inscrição confirmada ✓" : newsletterLoading ? "Enviando..." : "Quero receber"}
                          {!newsletterDone && (
                            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent-foreground/20 group-hover:bg-accent-foreground/30 transition-colors">
                              <ArrowRight className="h-6 w-6" />
                            </span>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-muted-foreground/50 leading-relaxed">
                        Ao se cadastrar, você concorda em receber comunicações da Novare Consultoria.
                      </p>

                      {/* Social proof */}
                      <div className="flex items-center gap-3 pt-2">
                        <div className="flex -space-x-2">
                          {["R", "M", "A"].map((initial, i) => (
                            <motion.div
                              key={initial}
                              className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center"
                              initial={{ x: -10, opacity: 0 }}
                              whileInView={{ x: 0, opacity: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: 0.5 + i * 0.1 }}
                            >
                              <span className="text-xs font-bold text-primary">{initial}</span>
                            </motion.div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">+320</span> assinantes
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────── */}
      <footer className="py-5 md:py-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoPreta} alt="Novare" className="h-6" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Novare Consultoria de Investimentos. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* ── LOADING OVERLAY: Simulação em andamento ────────────── */}
      <AnimatePresence>
        {isSimulating && (
          <motion.div
            key="sim-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-6"
            style={{
              background:
                "radial-gradient(80% 60% at 50% 50%, hsl(var(--card) / 0.95), hsl(var(--muted) / 0.98))",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {/* Orbs de fundo animadas — agora em azul Novare */}
            <motion.div
              className="pointer-events-none absolute top-1/4 left-1/4 w-[420px] h-[420px] rounded-full blur-[140px]"
              style={{ background: "hsl(var(--novare-blue-bright) / 0.30)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="pointer-events-none absolute bottom-1/4 right-1/4 w-[380px] h-[380px] rounded-full blur-[130px]"
              style={{ background: "hsl(var(--novare-blue) / 0.35)" }}
              animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />

            <motion.div
              initial={{ scale: 0.85, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-3xl p-8 md:p-10 text-center"
              style={{
                background:
                  "linear-gradient(160deg, hsl(var(--card) / 0.95), hsl(var(--muted) / 0.95))",
                border: "1px solid hsl(var(--border))",
                boxShadow:
                  "0 30px 80px -20px hsl(var(--novare-blue-bright) / 0.45), 0 0 0 1px hsl(var(--novare-blue-bright) / 0.18), inset 0 1px 0 hsl(0 0% 100% / 0.5)",
              }}
            >
              {/* Logo Novare com halos pulsantes — efeitos enriquecidos */}
              <div className="relative mx-auto mb-6 w-44 h-44 flex items-center justify-center">
                {/* Anel orbital 1 — externo lento */}
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-[hsl(var(--novare-blue-bright)/0.35)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  style={{ borderRightColor: "transparent", borderBottomColor: "transparent" }}
                />
                {/* Anel orbital 2 — médio inverso */}
                <motion.span
                  className="absolute inset-3 rounded-full border-2 border-[hsl(var(--novare-blue-bright)/0.45)]"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                  style={{ borderLeftColor: "transparent", borderTopColor: "transparent" }}
                />
                {/* Anel orbital 3 — interno rápido tracejado */}
                <motion.span
                  className="absolute inset-6 rounded-full border-2 border-dashed border-[hsl(var(--novare-blue)/0.55)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />

                {/* Partículas orbitando (4 pontos azuis) */}
                {[0, 1, 2, 3].map((i) => (
                  <motion.span
                    key={`particle-${i}`}
                    className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      background: "hsl(var(--novare-blue-bright))",
                      boxShadow: "0 0 12px hsl(var(--novare-blue-bright) / 0.9), 0 0 24px hsl(var(--novare-blue-bright) / 0.6)",
                    }}
                    animate={{
                      x: [
                        Math.cos((i * Math.PI) / 2) * 80,
                        Math.cos((i * Math.PI) / 2 + Math.PI * 2) * 80,
                      ],
                      y: [
                        Math.sin((i * Math.PI) / 2) * 80,
                        Math.sin((i * Math.PI) / 2 + Math.PI * 2) * 80,
                      ],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: i * 0.3 }}
                  />
                ))}

                {/* Halo pulsante interno azul */}
                <motion.span
                  className="absolute inset-8 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, hsl(var(--novare-blue-bright) / 0.5), transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.35, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Conic-gradient sweep (radar) */}
                <motion.span
                  className="absolute inset-2 rounded-full pointer-events-none"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, hsl(var(--novare-blue-bright) / 0.35) 60deg, transparent 120deg)",
                    maskImage:
                      "radial-gradient(circle, transparent 38%, black 40%, black 100%)",
                    WebkitMaskImage:
                      "radial-gradient(circle, transparent 38%, black 40%, black 100%)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                />

                {/* Logo com glow azul + leve respiração */}
                <motion.img
                  src={logoPreta}
                  alt="Novare"
                  className="relative z-10 w-24 h-auto"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    filter:
                      "drop-shadow(0 0 18px hsl(var(--novare-blue-bright) / 0.7)) drop-shadow(0 0 36px hsl(var(--novare-blue) / 0.45))",
                  }}
                />

                {/* Scan-line horizontal cruzando o logo */}
                <motion.span
                  className="absolute left-8 right-8 h-px pointer-events-none z-20"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, hsl(var(--novare-blue-bright)) 50%, transparent)",
                    boxShadow: "0 0 12px hsl(var(--novare-blue-bright) / 0.9)",
                  }}
                  animate={{ top: ["20%", "80%", "20%"], opacity: [0, 1, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              {/* Título com gradiente azul */}
              <motion.h3
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl md:text-3xl font-black mb-2 bg-gradient-to-r from-foreground via-foreground to-[hsl(var(--novare-blue-bright))] bg-clip-text text-transparent"
              >
                Calculando sua aposentadoria
              </motion.h3>

              {/* Subtítulo dinâmico */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground mb-4"
              >
                Nossa inteligência financeira está montando seu cenário…
              </motion.p>

              {/* Contador regressivo — azul */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/80 font-semibold">
                  Pronto em
                </span>
                <motion.div
                  key={simCountdown}
                  initial={{ scale: 0.6, opacity: 0, y: -6 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="relative inline-flex items-center justify-center min-w-[44px] h-9 px-2.5 rounded-lg font-mono font-black text-base text-[hsl(var(--novare-blue-bright))]"
                  style={{
                    background:
                      "linear-gradient(180deg, hsl(var(--novare-blue-bright) / 0.18), hsl(var(--novare-blue-bright) / 0.06))",
                    border: "1px solid hsl(var(--novare-blue-bright) / 0.40)",
                    boxShadow:
                      "0 0 18px hsl(var(--novare-blue-bright) / 0.40), inset 0 1px 0 hsl(0 0% 100% / 0.6)",
                  }}
                >
                  {simCountdown}s
                </motion.div>
              </div>

              {/* Barra de progresso azul */}
              <div className="relative h-1.5 w-full rounded-full bg-muted/60 overflow-hidden mb-5">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(var(--novare-blue-bright)), hsl(var(--novare-blue) / 0.7))",
                    boxShadow: "0 0 12px hsl(var(--novare-blue-bright) / 0.7)",
                  }}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 5, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </div>

              {/* Etapas animadas — bullets azuis */}
              <div className="space-y-2 text-left">
                {[
                  { label: "Analisando seu perfil de investidor", delay: 0 },
                  { label: "Projetando juros compostos", delay: 1.2 },
                  { label: "Calculando IR e renda líquida", delay: 2.5 },
                  { label: "Finalizando relatório", delay: 3.8 },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                    className="flex items-center gap-2.5 text-xs text-foreground/80"
                  >
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--novare-blue-bright))] shrink-0"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: step.delay,
                      }}
                    />
                    <span>{step.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Selo */}
              <div className="mt-6 pt-5 border-t border-border/40 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 font-semibold">
                <span className="w-1 h-1 rounded-full bg-[hsl(var(--novare-blue-bright))]" />
                Powered by Novare
                <span className="w-1 h-1 rounded-full bg-[hsl(var(--novare-blue-bright))]" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YieldGuide;
