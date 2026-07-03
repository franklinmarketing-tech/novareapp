// Páginas públicas de divulgação (links de venda) — cliente e consultor.
// Rotas: /vidaplan/cliente e /vidaplan/consultor. CTA leva ao cadastro grátis.
import { Link } from "react-router-dom";
import logoBranca from "@/assets/logo-branca.png";
import { Target, Sparkles, Sunrise, Landmark, LineChart, FileText, Palette, Users, ShieldCheck, ArrowRight, Check } from "lucide-react";

type Audience = "cliente" | "consultor";

const CONTEUDO = {
  cliente: {
    eyebrow: "Para você",
    titulo: "Seu projeto de vida, em números que você controla.",
    sub: "Junte seus sonhos, a aposentadoria e a sua realidade num só lugar — e descubra exatamente o que fazer para chegar lá. Sem planilhas.",
    cta: "Criar conta grátis",
    features: [
      { icon: Target, t: "Marco Horizonte", d: "Um número único: independência + todos os seus sonhos." },
      { icon: Sparkles, t: "Seus sonhos", d: "Viagens, casa, estudos… tudo entra na conta." },
      { icon: Sunrise, t: "Independência", d: "Quando e como parar de depender do trabalho." },
      { icon: Landmark, t: "Open Finance", d: "Conecte seus bancos e veja tudo (Banco Central)." },
      { icon: LineChart, t: "Projeção", d: "Ano a ano, com linha da vida e metas de poupança." },
      { icon: FileText, t: "Relatório PDF", d: "Todo o seu plano num documento profissional." },
    ],
    passos: [
      "Liste seus sonhos e sua realidade financeira.",
      "O app calcula seu Marco Horizonte e a viabilidade.",
      "Receba o plano e acompanhe mês a mês.",
    ],
    destaque: "Grátis para começar · seu consultor pode liberar tudo sem custo pra você",
    rodape: "Comece grátis. Sem cartão de crédito.",
  },
  consultor: {
    eyebrow: "Para consultores e assessores",
    titulo: "Ofereça planejamento de vida com a sua marca.",
    sub: "Transforme o Vida Plan na ferramenta da sua consultoria: seu logo, sua carteira de clientes e relatórios profissionais. Você atende, a plataforma faz o cálculo.",
    cta: "Testar 14 dias grátis",
    features: [
      { icon: Palette, t: "Sua marca (white-label)", d: "Seu logo e o nome do sistema no app e no PDF do cliente." },
      { icon: Users, t: "Carteira de clientes", d: "Cada cliente com o próprio projeto de vida, só seu." },
      { icon: ShieldCheck, t: "Dados isolados", d: "Multi-tenant: os dados são seus, ninguém mais vê." },
      { icon: FileText, t: "Atender e recomendar", d: "Notas privadas + recomendação que aparece no app do cliente." },
      { icon: Sparkles, t: "Clientes usam grátis", d: "Seus clientes têm o app completo — incluído no seu plano." },
      { icon: LineChart, t: "Método e IA", d: "Método Horizonte + IA para viabilizar cada plano." },
    ],
    passos: [
      "Crie sua conta, seu logo e o nome do seu sistema.",
      "Convide seus clientes com o seu código.",
      "Acompanhe a carteira, atenda e recomende.",
    ],
    destaque: "14 dias grátis · seus clientes usam o app completo sem custo extra",
    rodape: "14 dias grátis. Sem cartão de crédito.",
  },
} as const;

const Landing = ({ audience }: { audience: Audience }) => {
  const c = CONTEUDO[audience];
  const criarHref = `/vidaplan/login?criar=1${audience === "consultor" ? "&perfil=consultor" : ""}`;

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1b2a3d]">
      {/* Topo */}
      <header className="bg-[#16314f] text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoBranca} alt="Novare" className="h-6 w-auto" />
            <span className="font-display text-base font-bold text-[#E29578]">Vida Plan</span>
          </div>
          <Link to="/vidaplan/login" className="text-sm text-white/70 hover:text-white">Entrar</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#16314f] text-white">
        <div className="max-w-5xl mx-auto px-6 pb-14 pt-4">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#E29578] mb-3">{c.eyebrow}</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight max-w-2xl">{c.titulo}</h1>
          <p className="text-white/65 mt-4 max-w-xl">{c.sub}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to={criarHref} className="inline-flex items-center gap-2 rounded-xl bg-[#E29578] px-6 py-3 text-sm font-bold text-[#16314f] hover:bg-[#eaa98e] transition-colors">
              {c.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-white/50 text-sm">{c.rodape}</span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs text-white/70"><Check className="h-3.5 w-3.5 text-[#7FE3C0]" /> {c.destaque}</div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {c.features.map((f) => (
            <div key={f.t} className="rounded-2xl bg-white border border-black/5 p-5 shadow-[0_1px_3px_rgba(16,42,67,0.06)]">
              <div className="h-10 w-10 rounded-xl bg-[#16314f]/[0.06] flex items-center justify-center mb-3"><f.icon className="h-5 w-5 text-[#16314f]" /></div>
              <p className="font-display text-base font-bold text-[#16314f]">{f.t}</p>
              <p className="text-sm text-[#1b2a3d]/60 mt-1">{f.d}</p>
            </div>
          ))}
        </div>

        {/* Como funciona */}
        <div className="mt-12">
          <p className="font-display text-xl font-bold text-[#16314f] text-center mb-6">Como funciona</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {c.passos.map((p, i) => (
              <div key={i} className="rounded-2xl border border-black/[0.07] p-5">
                <div className="h-8 w-8 rounded-full bg-[#16314f] text-white flex items-center justify-center font-display font-bold mb-3">{i + 1}</div>
                <p className="text-sm text-[#16314f]">{p}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="mt-10 rounded-2xl bg-[#16314f] text-white p-8 text-center">
          <p className="font-display text-2xl font-bold">{audience === "consultor" ? "Comece a atender com a sua marca" : "Comece seu projeto de vida hoje"}</p>
          <p className="text-white/60 text-sm mt-1 mb-5">{c.rodape}</p>
          <Link to={criarHref} className="inline-flex items-center gap-2 rounded-xl bg-[#E29578] px-6 py-3 text-sm font-bold text-[#16314f] hover:bg-[#eaa98e] transition-colors">
            {c.cta} <ArrowRight className="h-4 w-4" />
          </Link>
          {audience === "consultor" && (
            <p className="text-white/45 text-xs mt-4 flex items-center justify-center gap-1.5"><Check className="h-3.5 w-3.5" /> Seus clientes usam o app completo sem custo extra</p>
          )}
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-xs text-[#1b2a3d]/40">
        Novare Consultoria de Investimentos · Método Horizonte · material de divulgação.
      </footer>
    </div>
  );
};

export default Landing;
