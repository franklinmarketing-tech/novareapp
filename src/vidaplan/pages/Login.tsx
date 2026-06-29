// Login do Novare Vida Plan (mesma base de auth Supabase, identidade própria).
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoBranca from "@/assets/logo-branca.png";
import logoPreta from "@/assets/logo-preta.png";
import { VIDAPLAN } from "../lib/brand";
import { Loader2, LogIn } from "lucide-react";

const Login = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => { if (user) navigate("/vidaplan/app", { replace: true }); }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate("/vidaplan/app", { replace: true });
    } catch (err: any) {
      setErro(err?.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : (err?.message || "Não foi possível entrar."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F4F1EA]">
      {/* Lado da marca */}
      <div className="hidden lg:flex flex-col justify-between bg-[#16314f] p-12 text-white">
        <div>
          <img src={logoBranca} alt="Novare" className="h-10 w-auto" />
          <p className="font-display text-2xl font-bold text-[#E29578] mt-2">Vida Plan</p>
        </div>
        <div>
          <p className="font-display text-2xl font-semibold leading-snug max-w-sm">{VIDAPLAN.tagline}</p>
          <p className="text-white/50 text-sm mt-4">{VIDAPLAN.method}</p>
        </div>
        <p className="text-white/30 text-xs">Novare Consultoria de Investimentos</p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <img src={logoPreta} alt="Novare" className="h-9 w-auto" />
            <span className="font-display text-lg font-bold text-[#C8643F] mt-1">Vida Plan</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#16314f]">Entrar</h1>
          <p className="text-sm text-[#1b2a3d]/60 mt-1 mb-6">Acesse seu projeto de vida.</p>

          <label className="block mb-3">
            <span className="text-xs font-semibold text-[#1b2a3d]/70">E-mail</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F]" />
          </label>
          <label className="block mb-4">
            <span className="text-xs font-semibold text-[#1b2a3d]/70">Senha</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F]" />
          </label>

          {erro && <p className="text-sm text-[#C8643F] mb-3">{erro}</p>}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16314f] py-3 text-sm font-semibold text-white hover:bg-[#1d3e63] transition-colors disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Entrar
          </button>

          <p className="text-xs text-[#1b2a3d]/45 mt-5 text-center">
            Ainda não tem acesso? Fale com a Novare para criar sua conta.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
