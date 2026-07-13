// Página inicial pública (porta de entrada): escolha Cliente ou Assessor.
// Logado → vai direto pro app. Não logado → mostra os dois caminhos + Entrar.
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoBranca from "@/assets/logo-branca.png";
import { VIDAPLAN } from "../lib/brand";
import { hostAudience } from "../lib/host";
import { User, Briefcase, ArrowRight } from "lucide-react";

const Home = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/vidaplan/app" replace />;

  // Em subdomínio dedicado, pula a escolha e abre a jornada certa.
  const aud = hostAudience();
  if (aud === "consultor") return <Navigate to="/vidaplan/consultor" replace />;
  if (aud === "cliente") return <Navigate to="/vidaplan/cliente" replace />;

  return (
    <div className="min-h-screen bg-[#16314f] text-white flex flex-col">
      <header className="max-w-5xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoBranca} alt="Novare" className="h-7 w-auto" />
          <span className="font-display text-lg font-bold text-[#E29578]">Vida Plan</span>
        </div>
        <Link to="/vidaplan/login" className="text-sm text-white/70 hover:text-white">Entrar</Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 flex flex-col justify-center py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E29578] mb-3">{VIDAPLAN.method}</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight max-w-2xl">Seu projeto de vida, em números que você controla.</h1>
        <p className="text-white/60 mt-3 max-w-xl">Comece grátis. Escolha por onde você entra:</p>

        <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-3xl">
          {/* Cliente */}
          <Link to="/vidaplan/cliente" className="group rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 p-6 transition-colors">
            <div className="h-11 w-11 rounded-xl bg-[#E29578]/20 flex items-center justify-center mb-4"><User className="h-6 w-6 text-[#E29578]" /></div>
            <p className="font-display text-xl font-bold">Sou cliente</p>
            <p className="text-sm text-white/60 mt-1">Organize seus sonhos, a aposentadoria e a sua realidade num só lugar.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#E29578] group-hover:gap-2.5 transition-all">Começar grátis <ArrowRight className="h-4 w-4" /></span>
          </Link>

          {/* Assessor */}
          <Link to="/vidaplan/consultor" className="group rounded-2xl bg-[#E29578] hover:bg-[#eaa98e] text-[#16314f] p-6 transition-colors">
            <div className="h-11 w-11 rounded-xl bg-[#16314f]/10 flex items-center justify-center mb-4"><Briefcase className="h-6 w-6 text-[#16314f]" /></div>
            <p className="font-display text-xl font-bold">Sou assessor / consultor</p>
            <p className="text-sm text-[#16314f]/70 mt-1">Atenda seus clientes com a sua marca. Teste 14 dias grátis.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5 transition-all">Testar grátis <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </div>

        <p className="text-white/40 text-sm mt-8">Já tem conta? <Link to="/vidaplan/login" className="font-semibold text-white/80 hover:text-white">Entrar</Link></p>
      </main>

      <footer className="max-w-5xl w-full mx-auto px-6 py-6 text-xs text-white/30">Novare Consultoria de Investimentos · {VIDAPLAN.method}</footer>
    </div>
  );
};

export default Home;
