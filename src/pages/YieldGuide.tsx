import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ChevronDown, Check, TrendingUp, Shield, Target,
  Phone, MessageCircle, BarChart3, Wallet, PiggyBank, Lock,
  Percent, Calendar, DollarSign, ArrowUpRight, Landmark, Menu, X,
  Users, Award, Briefcase, GraduationCap, Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logoPreta from "@/assets/logo-preta.png";
import logoBranca from "@/assets/logo-branca.png";
import jeffersonImg from "@/assets/jefferson.png";
import leonardoImg from "@/assets/leonardo.png";
import newsletterHero from "@/assets/newsletter-hero.jpg";
import { SEO } from "@/components/SEO";

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
      { icon: Briefcase, text: "Ex-Santander (Especialista Van Gogh / Select) e XP Inc." },
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
      { icon: Briefcase, text: "Ex-líder Triple AAA no Santander · Wave Capital (BTG)" },
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

const bentoFeatures = [
  {
    title: "Prefixado",
    desc: "Você sabe exatamente qual será sua rentabilidade. Trave uma taxa quando esperar queda nos juros.",
    icon: Lock,
    rate: "14,20%",
    rateLabel: "Taxa referência CDB 12 meses",
    span: "md:col-span-1",
    variant: "hero" as const,
    rentAnual: 14.2,
  },
  {
    title: "Pós-fixado (CDI)",
    desc: "Rentabilidade atrelada ao CDI. Ideal quando se espera manutenção ou alta nos juros.",
    icon: TrendingUp,
    rate: "14,73%",
    rateLabel: "104% do CDI a.a.",
    span: "md:col-span-1",
    variant: "default" as const,
    rentAnual: 14.73,
  },
  {
    title: "IPCA+",
    desc: "Proteção contra inflação com taxa real garantida. Preserva o poder de compra no longo prazo.",
    icon: Shield,
    rate: "IPCA + 7%",
    rateLabel: "Ganho real acima da inflação",
    span: "md:col-span-1",
    variant: "default" as const,
    rentAnual: 11.51,
  },
];

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
  totalInvestido: string;
  ganhoLiquido: string;
  atingeMeta: boolean;
  anosAcumulo: number;
  aliquotaIR: number;
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

function simulate(idadeAtual: number, idadeAposent: number, patrimonioAtual: number, aporte: number, rendaDesejada: number, rentAnual: number): SimResult {
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

  for (let m = 1; m <= meses; m++) {
    patrimonioBruto = patrimonioBruto * (1 + taxaMensal) + aporte;
    if (m % 12 === 0) {
      const yearIdx = m / 12;
      const investedSoFar = patrimonioAtual + aporte * m;
      const ganhoBrutoY = patrimonioBruto - investedSoFar;
      // IR no ponto: usa a alíquota do horizonte total (estimativa visual)
      const aliqPonto = getAliquotaIR(yearIdx);
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
  const aliquotaIR = getAliquotaIR(anos);
  const irDevido = ganhoBruto * (aliquotaIR / 100);
  const patrimonioLiquido = patrimonioBruto - irDevido;
  const ganhoLiquido = patrimonioLiquido - totalInvestido;

  // Renda mensal bruta e líquida (sem consumir o principal)
  const rendaMensalBruta = patrimonioBruto * taxaMensal;
  const rendaMensalLiquida = rendaMensalBruta * (1 - aliquotaIR / 100);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return {
    patrimonio: fmt(patrimonioBruto),
    patrimonioLiquido: fmt(patrimonioLiquido),
    rendaMensal: fmt(rendaMensalBruta),
    rendaMensalLiquida: fmt(rendaMensalLiquida),
    totalInvestido: fmt(totalInvestido),
    ganhoLiquido: fmt(ganhoLiquido),
    atingeMeta: rendaMensalLiquida >= rendaDesejada,
    anosAcumulo: anos,
    aliquotaIR,
    patrimonioNum: patrimonioBruto,
    patrimonioLiquidoNum: patrimonioLiquido,
    totalInvestidoNum: totalInvestido,
    ganhoLiquidoNum: ganhoLiquido,
    rendaMensalLiquidaNum: rendaMensalLiquida,
    rendaDesejadaNum: rendaDesejada,
    timeline,
  };
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
  const [sim, setSim] = useState({ idadeAtual: 30, idadeAposent: 60, patrimonioAtual: 10000, aporte: 2000, rendaDesejada: 15000, rentabilidade: 12 });
  const [rentPeriodo, setRentPeriodo] = useState<"anual" | "mensal">("anual");
  const [result, setResult] = useState<SimResult | null>(null);
  const [selectedFounder, setSelectedFounder] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  const rentAnual = rentPeriodo === "mensal"
    ? (Math.pow(1 + sim.rentabilidade / 100, 12) - 1) * 100
    : sim.rentabilidade;

  const handleSimulate = () => {
    setResult(simulate(sim.idadeAtual, sim.idadeAposent, sim.patrimonioAtual, sim.aporte, sim.rendaDesejada, rentAnual));
  };

  const scrollTo = (id: string) => {
    setMobileNav(false);
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
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
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-20">
          <img src={logoPreta} alt="Novare" className="h-10" />
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="text-base text-muted-foreground hover:text-foreground transition-colors font-medium">
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-5 font-medium text-sm hidden sm:inline-flex"
              onClick={() => window.open(whatsappUrl, "_blank")}
            >
              Fale conosco
            </Button>
            <button className="md:hidden text-foreground" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileNav && (
          <div className="md:hidden border-t border-border/40 bg-background px-6 py-4 space-y-3">
            {navLinks.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="block text-sm text-foreground font-medium w-full text-left py-1">
                {l.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────── */}
      <section className="pt-28 pb-6 md:pt-36 md:pb-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
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
      <section className="py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
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
      <section id="intro" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
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
      <section id="renda-fixa" className="py-16 md:py-24 bg-muted/40">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-10">
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

      {/* ── BENTO GRID — INVEST TYPES ───────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-10">
            <motion.div variants={fadeUp} custom={0} className="text-center max-w-2xl mx-auto space-y-4">
              <span className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Categorias</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Entenda cada tipo de Renda Fixa
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4">
              {bentoFeatures.map((f, i) => {
                const isHero = f.variant === "hero";
                return (
                  <motion.div key={f.title} variants={fadeUp} custom={i + 1} className={f.span}>
                    <Card
                      className={`h-full rounded-2xl border-border/40 overflow-hidden relative group transition-all duration-500 cursor-pointer hover:shadow-elevated ${
                        isHero ? "bg-primary text-primary-foreground shadow-lg" : "bg-card text-foreground shadow-subtle hover:-translate-y-1"
                      }`}
                      onClick={() => {
                        setSim(prev => ({ ...prev, rentabilidade: f.rentAnual }));
                        setRentPeriodo("anual");
                        scrollTo("#simulador");
                      }}
                    >
                      {/* Animated background decoration */}
                      {isHero && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <motion.div
                            className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary-foreground/[0.04]"
                            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          />
                          <motion.div
                            className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-primary-foreground/[0.03]"
                            animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                      )}
                      {!isHero && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <motion.div
                            className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/[0.04]"
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>
                      )}

                      <CardContent className="p-7 md:p-8 flex flex-col justify-between h-full relative z-10">
                        <div>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                            isHero ? "bg-primary-foreground/10" : "bg-muted"
                          }`}>
                            <f.icon className={`h-6 w-6 ${isHero ? "" : "text-foreground"}`} />
                          </div>
                          <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-3">{f.title}</h3>
                          <p className={`text-sm leading-relaxed ${isHero ? "opacity-70" : "text-muted-foreground"}`}>
                            {f.desc}
                          </p>
                        </div>

                        {/* Rate footer */}
                        <div className={`mt-6 pt-5 border-t ${isHero ? "border-primary-foreground/10" : "border-border/40"}`}>
                          <div className="flex items-baseline gap-2">
                            <motion.span
                              className={`text-2xl md:text-3xl font-bold ${isHero ? "" : "text-primary"}`}
                              initial={{ opacity: 0, y: 10 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: 0.3 + i * 0.1 }}
                            >
                              {f.rate}
                            </motion.span>
                            {!f.rate.includes("IPCA") && <span className={`text-sm ${isHero ? "opacity-60" : "text-muted-foreground"}`}>a.a.</span>}
                          </div>
                          <p className={`text-xs mt-1 ${isHero ? "opacity-50" : "text-muted-foreground"}`}>{f.rateLabel}</p>
                          <p className={`text-[11px] mt-2 font-medium flex items-center gap-1 ${isHero ? "opacity-50" : "text-accent"}`}>
                            Simular com esta taxa <ArrowRight className="h-6 w-6" />
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SIMULATOR ───────────────────────────── */}
      <section id="simulador" className="py-16 md:py-24 relative overflow-hidden" style={{ background: "linear-gradient(160deg, hsl(220 40% 11%), hsl(220 45% 7%))" }}>
        {/* Background orbs */}
        <motion.div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: "hsl(var(--accent) / 0.05)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px]"
          style={{ background: "hsl(220 60% 40% / 0.08)" }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-10">
            <motion.div variants={fadeUp} custom={0} className="text-center max-w-2xl mx-auto space-y-4">
              <span className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Simulador</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Projete sua renda no longo prazo
              </h2>
              <p className="text-white/50 text-base">Use nosso simulador gratuito para planejar sua aposentadoria.</p>
            </motion.div>

            <motion.div variants={fadeUp} custom={1}>
              <div className="rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                <div className="grid lg:grid-cols-5">
                  {/* Simulator form — glassmorphism dark card */}
                  <div className="lg:col-span-3 p-6 md:p-10 relative" style={{ background: "linear-gradient(145deg, hsl(220 30% 16%), hsl(220 35% 12%))" }}>
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 rounded-l-3xl border border-white/[0.06] pointer-events-none" />
                    <motion.div
                      className="absolute -top-20 -left-20 w-60 h-60 rounded-full blur-[100px]"
                      style={{ background: "hsl(220 50% 40% / 0.08)" }}
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <div className="relative z-10 space-y-6">
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                        {[
                          { label: "Qual sua idade hoje?", key: "idadeAtual", hint: "anos" },
                          { label: "Com que idade quer parar de trabalhar?", key: "idadeAposent", hint: "anos" },
                          { label: "Quanto já tem guardado/investido?", key: "patrimonioAtual", hint: "R$" },
                          { label: "Quanto consegue investir por mês?", key: "aporte", hint: "R$" },
                          { label: "Qual renda mensal deseja no futuro?", key: "rendaDesejada", hint: "R$" },
                        ].map((f) => (
                          <div key={f.key} className="space-y-1.5">
                            <label className="text-xs font-semibold text-white/50 leading-tight block">{f.label}</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={(sim as any)[f.key]}
                                onChange={(e) => setSim({ ...sim, [f.key]: Number(e.target.value) })}
                                className="w-full h-12 rounded-xl px-4 pr-14 text-base font-medium text-white bg-white/[0.06] border border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.04)] focus:border-accent/40 focus:ring-1 focus:ring-accent/20 focus:bg-white/[0.08] outline-none transition-all duration-200 placeholder:text-white/20"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/25 font-medium">{f.hint}</span>
                            </div>
                          </div>
                        ))}

                        {/* Taxa de juros */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-white/50 leading-tight block">Taxa de juros dos seus investimentos</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={sim.rentabilidade}
                              onChange={(e) => setSim({ ...sim, rentabilidade: Number(e.target.value) })}
                              className="w-full h-12 rounded-xl px-4 pr-24 text-base font-medium text-white bg-white/[0.06] border border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.04)] focus:border-accent/40 focus:ring-1 focus:ring-accent/20 focus:bg-white/[0.08] outline-none transition-all duration-200 placeholder:text-white/20"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center bg-white/[0.06] rounded-lg overflow-hidden border border-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => {
                                  if (rentPeriodo === "anual") {
                                    const mensal = (Math.pow(1 + sim.rentabilidade / 100, 1/12) - 1) * 100;
                                    setSim({ ...sim, rentabilidade: Number(mensal.toFixed(2)) });
                                  }
                                  setRentPeriodo("mensal");
                                }}
                                className={`px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 ${rentPeriodo === "mensal" ? "bg-accent text-accent-foreground" : "text-white/40 hover:text-white/60"}`}
                              >
                                % mês
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (rentPeriodo === "mensal") {
                                    const anual = (Math.pow(1 + sim.rentabilidade / 100, 12) - 1) * 100;
                                    setSim({ ...sim, rentabilidade: Number(anual.toFixed(1)) });
                                  }
                                  setRentPeriodo("anual");
                                }}
                                className={`px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 ${rentPeriodo === "anual" ? "bg-accent text-accent-foreground" : "text-white/40 hover:text-white/60"}`}
                              >
                                % ano
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-white/30">
                            {rentPeriodo === "mensal"
                              ? `≈ ${rentAnual.toFixed(1)}% ao ano`
                              : `≈ ${((Math.pow(1 + sim.rentabilidade / 100, 1/12) - 1) * 100).toFixed(2)}% ao mês`
                            }
                            {" · "}Hoje a Selic rende ~1% ao mês
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed">
                        * Valores em rentabilidade nominal (bruta). IR deduzido apenas no resgate conforme tabela regressiva. Resultados são estimativas.
                      </p>
                    </div>
                    {/* 3D Button */}
                    <button
                      onClick={handleSimulate}
                      className="group relative z-10 w-full inline-flex items-center justify-center gap-3 bg-accent text-accent-foreground px-8 py-4 rounded-2xl font-semibold text-base shadow-[0_6px_20px_-4px_hsl(var(--accent)/0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_8px_28px_-4px_hsl(var(--accent)/0.6),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.4)] transition-all duration-200 mt-8"
                    >
                      <BarChart3 className="h-6 w-6" />
                      Simular Aposentadoria
                      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent-foreground/20 group-hover:bg-accent-foreground/30 transition-colors">
                        <ArrowRight className="h-6 w-6" />
                      </span>
                    </button>
                  </div>

                  {/* Results panel */}
                  <div className="lg:col-span-2 flex flex-col" style={{ background: "linear-gradient(160deg, hsl(220 40% 14%), hsl(220 45% 9%))" }}>
                    {/* Patrimônio card */}
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center relative overflow-hidden border-b border-white/[0.06]">
                      <motion.div
                        className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-accent/15 shadow-[0_0_15px_hsl(var(--accent)/0.15)] flex items-center justify-center mb-3">
                          <DollarSign className="h-6 w-6 text-accent" />
                        </div>
                        <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Patrimônio Bruto</p>
                        <motion.p
                          className="text-3xl md:text-4xl font-bold text-white tracking-tight"
                          key={result?.patrimonio}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          {result?.patrimonio || "—"}
                        </motion.p>
                        {result && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-white/30">em {result.anosAcumulo} anos de acumulação</p>
                            <p className="text-xs text-accent/70 font-medium">
                              Líquido após IR ({result.aliquotaIR}%): {result.patrimonioLiquido}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total investido vs Ganhos */}
                    <div className="grid grid-cols-3 border-b border-white/[0.06]">
                      <div className="p-5 md:p-6 border-r border-white/[0.06]">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">Você investiu</p>
                        <motion.p
                          className="text-lg font-bold text-white/70 tracking-tight"
                          key={result?.totalInvestido}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {result?.totalInvestido || "—"}
                        </motion.p>
                      </div>
                      <div className="p-5 md:p-6 border-r border-white/[0.06]">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">Ganho Líquido</p>
                        <motion.p
                          className="text-lg font-bold text-accent tracking-tight"
                          key={result?.ganhoLiquido}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {result?.ganhoLiquido || "—"}
                        </motion.p>
                      </div>
                      <div className="p-5 md:p-6">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">Alíquota IR</p>
                        <motion.p
                          className="text-lg font-bold text-white/70 tracking-tight"
                          key={result?.aliquotaIR}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {result ? `${result.aliquotaIR}%` : "—"}
                        </motion.p>
                        {result && (
                          <p className="text-[10px] text-white/20 mt-0.5">Tabela regressiva</p>
                        )}
                      </div>
                    </div>

                    {/* Renda mensal */}
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center bg-white/[0.02] border-b border-white/[0.06]">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mb-3">
                        <Wallet className="h-6 w-6 text-white/50" />
                      </div>
                      <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Renda Mensal Passiva</p>
                      <motion.p
                        className="text-3xl md:text-4xl font-bold text-white tracking-tight"
                        key={result?.rendaMensalLiquida}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      >
                        {result?.rendaMensalLiquida || "—"}
                      </motion.p>
                      {result && (
                        <p className="text-[11px] text-white/25 mt-1">Bruta: {result.rendaMensal} · Líquida após IR de {result.aliquotaIR}%</p>
                      )}
                      {!result && (
                        <p className="text-[11px] text-white/25 mt-1">Sem consumir o patrimônio principal</p>
                      )}
                    </div>

                    {/* Meta atingida */}
                    <div className={`p-6 md:p-8 flex flex-col justify-center transition-colors duration-500 ${
                      result ? (result.atingeMeta ? "bg-success/[0.08]" : "bg-warning/[0.08]") : "bg-white/[0.01]"
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                        result ? (result.atingeMeta ? "bg-success/15 shadow-[0_0_15px_hsl(var(--success)/0.15)]" : "bg-warning/15") : "bg-white/[0.06]"
                      }`}>
                        <Target className={`h-6 w-6 ${result ? (result.atingeMeta ? "text-success" : "text-warning") : "text-white/40"}`} />
                      </div>
                      <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Meta de Renda Atingida?</p>
                      <motion.p
                        className={`text-2xl font-bold tracking-tight ${result ? (result.atingeMeta ? "text-success" : "text-warning") : "text-white/30"}`}
                        key={result ? String(result.atingeMeta) : "empty"}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        {result ? (result.atingeMeta ? "✓ Sim! Parabéns!" : "Ajuste aportes ou prazo") : "Simule primeiro"}
                      </motion.p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────── */}
      <section className="py-16 md:py-24 bg-muted/40">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-10">
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
      <section id="contato" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <Card className="rounded-3xl border-border/40 shadow-soft overflow-hidden bg-primary text-primary-foreground">
              <CardContent className="p-0">
                <div className="grid lg:grid-cols-2">
                  {/* Left */}
                  <motion.div variants={fadeUp} custom={0} className="p-8 md:p-12 space-y-6 flex flex-col justify-center">
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
      <section id="faq" className="py-16 md:py-24 bg-muted/40">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-10">
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
      <section id="quem-somos" className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="space-y-12">
            <motion.div variants={fadeUp} custom={0} className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Conheça os nossos{" "}
                <span className="text-accent">especialistas</span>
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Profissionais certificados com histórico comprovado no mercado financeiro.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="flex justify-center gap-12 md:gap-20">
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
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
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
                    <div className="max-w-sm mx-auto lg:mx-0 w-full space-y-8">
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
                          placeholder="Seu melhor e-mail"
                          className="h-13 rounded-2xl px-5 border-border/60 bg-muted/30 focus:bg-background transition-colors text-base"
                        />
                        <button
                          className="group relative w-full inline-flex items-center justify-center gap-3 bg-accent text-accent-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-[0_6px_20px_-4px_hsl(var(--accent)/0.5)] hover:shadow-[0_8px_28px_-4px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                        >
                          Quero receber
                          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent-foreground/20 group-hover:bg-accent-foreground/30 transition-colors">
                            <ArrowRight className="h-6 w-6" />
                          </span>
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
      <footer className="py-10 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoPreta} alt="Novare" className="h-6" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Novare Consultoria de Investimentos. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default YieldGuide;
