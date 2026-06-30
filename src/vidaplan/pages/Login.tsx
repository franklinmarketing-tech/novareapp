// Login + Cadastro do Novare Vida Plan (auth Supabase, identidade própria).
// Self-service: cliente e consultor criam a própria conta e senha.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logoBranca from "@/assets/logo-branca.png";
import logoPreta from "@/assets/logo-preta.png";
import { VIDAPLAN } from "../lib/brand";
import { Loader2, LogIn, UserPlus } from "lucide-react";

type Modo = "entrar" | "criar";

const traduzErro = (msg: string): string => {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/user already registered|already exists/i.test(msg)) return "Esse e-mail já tem conta. É só entrar.";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter ao menos 6 caracteres.";
  if (/unable to validate email|invalid email/i.test(msg)) return "E-mail inválido.";
  return msg || "Não foi possível concluir.";
};

const Login = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => { if (user) navigate("/vidaplan/app", { replace: true }); }, [user, navigate]);

  const trocarModo = (m: Modo) => { setModo(m); setErro(""); setInfo(""); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setInfo(""); setLoading(true);
    try {
      if (modo === "entrar") {
        await signIn(email.trim(), password);
        navigate("/vidaplan/app", { replace: true });
      } else {
        if (password.length < 6) { setErro("A senha precisa ter ao menos 6 caracteres."); setLoading(false); return; }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: nome.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          navigate("/vidaplan/app", { replace: true });
        } else {
          setInfo("Conta criada! Enviamos um e-mail de confirmação — confirme para entrar.");
          setModo("entrar");
        }
      }
    } catch (err: any) {
      setErro(traduzErro(err?.message || ""));
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

          {/* Alternância Entrar / Criar conta */}
          <div className="inline-flex rounded-xl border border-black/[0.08] p-1 bg-black/[0.02] mb-5">
            <button type="button" onClick={() => trocarModo("entrar")}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${modo === "entrar" ? "bg-[#16314f] text-white" : "text-[#1b2a3d]/55 hover:text-[#16314f]"}`}>Entrar</button>
            <button type="button" onClick={() => trocarModo("criar")}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${modo === "criar" ? "bg-[#16314f] text-white" : "text-[#1b2a3d]/55 hover:text-[#16314f]"}`}>Criar conta</button>
          </div>

          <h1 className="font-display text-2xl font-bold text-[#16314f]">{modo === "entrar" ? "Entrar" : "Crie sua conta grátis"}</h1>
          <p className="text-sm text-[#1b2a3d]/60 mt-1 mb-6">{modo === "entrar" ? "Acesse seu projeto de vida." : "Comece em minutos. Sem cartão de crédito."}</p>

          {modo === "criar" && (
            <label className="block mb-3">
              <span className="text-xs font-semibold text-[#1b2a3d]/70">Nome</span>
              <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome"
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F] placeholder:text-[#1b2a3d]/30" />
            </label>
          )}

          <label className="block mb-3">
            <span className="text-xs font-semibold text-[#1b2a3d]/70">E-mail</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F]" />
          </label>
          <label className="block mb-4">
            <span className="text-xs font-semibold text-[#1b2a3d]/70">Senha</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={modo === "criar" ? "mínimo 6 caracteres" : undefined}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F] placeholder:text-[#1b2a3d]/30" />
          </label>

          {erro && <p className="text-sm text-[#C8643F] mb-3">{erro}</p>}
          {info && <p className="text-sm text-[#2F8F6B] mb-3">{info}</p>}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16314f] py-3 text-sm font-semibold text-white hover:bg-[#1d3e63] transition-colors disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : modo === "entrar" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {modo === "entrar" ? "Entrar" : "Criar conta grátis"}
          </button>

          <p className="text-xs text-[#1b2a3d]/45 mt-5 text-center">
            {modo === "entrar" ? (
              <>Ainda não tem conta? <button type="button" onClick={() => trocarModo("criar")} className="font-semibold text-[#16314f] hover:text-[#C8643F]">Criar agora</button></>
            ) : (
              <>Já tem conta? <button type="button" onClick={() => trocarModo("entrar")} className="font-semibold text-[#16314f] hover:text-[#C8643F]">Entrar</button></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
