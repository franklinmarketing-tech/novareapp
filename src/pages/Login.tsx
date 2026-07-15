import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";
import { SEO } from "@/components/SEO";
import { Checkbox } from "@/components/ui/checkbox";
import { TERMS_VERSION } from "@/pages/Termos";
import { PRIVACY_VERSION } from "@/pages/Privacidade";

/**
 * Login otimizado.
 * Removidas animacoes infinitas pesadas (rAF getPointAtLength, blur 150px animado,
 * shimmer loops, count-up em rAF) que estavam travando a pagina e aumentando a
 * percepcao de lentidao no submit. Mantida a identidade visual do painel direito
 * com CSS estatico + uma unica animacao de entrada (pathLength) via SVG SMIL leve.
 */
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { signIn, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "super_admin") navigate("/super-admin", { replace: true });
    else if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "client") navigate("/cliente", { replace: true });
  }, [role, navigate]);

  const siteOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://novareapp.com.br";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        toast.success("Login realizado com sucesso!");
      } else if (mode === "signup") {
        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedName.length < 2) throw new Error("Informe seu nome completo.");
        if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        if (!acceptedTerms)
          throw new Error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");

        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { full_name: trimmedName }, emailRedirectTo: siteOrigin },
        });
        if (error) throw error;

        try {
          const uid = data.user?.id;
          if (uid && data.session) {
            const nowIso = new Date().toISOString();
            await supabase
              .from("profiles")
              .update({
                terms_accepted_at: nowIso,
                terms_version: TERMS_VERSION,
                privacy_accepted_at: nowIso,
                privacy_version: PRIVACY_VERSION,
              } as any)
              .eq("user_id", uid);
          }
        } catch (err) {
          console.error("Falha ao registrar aceite LGPD:", err);
        }

        supabase.functions
          .invoke("send-client-email", {
            body: {
              to: trimmedEmail,
              templateName: "welcome",
              templateData: { clientName: trimmedName },
            },
          })
          .catch((err) => console.error("Falha ao enviar welcome:", err));

        if (!data.session) {
          setSignupSent(true);
          toast.success("Conta criada! Confirme seu e-mail", {
            description: "Enviamos um link de ativação para o e-mail informado.",
          });
        } else {
          toast.success("Conta criada!", { description: "Vamos iniciar sua consultoria financeira." });
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${siteOrigin}/reset-password`,
        });
        if (error) throw error;
        setForgotSent(true);
        toast.success("Email enviado!", {
          description: "Verifique sua caixa de entrada para redefinir a senha.",
        });
      }
    } catch (error: any) {
      if (mode === "login" || mode === "signup") setPassword("");
      const rawMessage = error?.message || "";
      const description =
        rawMessage === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : /already.*registered|already.*exists/i.test(rawMessage)
            ? "Este e-mail ja esta cadastrado. Tente fazer login ou recuperar a senha."
            : /password should be at least/i.test(rawMessage)
              ? "A senha precisa ter pelo menos 6 caracteres."
              : /invalid email/i.test(rawMessage)
                ? "Email invalido."
                : rawMessage;
      toast.error(
        mode === "login" ? "Erro ao fazer login" : mode === "signup" ? "Erro ao criar conta" : "Erro ao enviar email",
        { description },
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <SEO title="Login" description="Acesse sua conta na Novare Consultoria de Investimentos." canonicalPath="/login" />

      {/* Left — Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-between px-6 sm:px-12 lg:px-20 py-10 bg-background">
        <div>
          <img src={logoPreta} alt="Novare" className="h-8 w-auto" />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px]">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-body font-semibold tracking-tight text-foreground">
                {mode === "login"
                  ? "Consultoria Financeira"
                  : mode === "signup"
                  ? signupSent ? "Confirme seu email" : "Criar conta"
                  : "Recuperar senha"}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm font-body">
                {mode === "login"
                  ? "Insira seus dados para acessar a plataforma"
                  : mode === "signup"
                  ? signupSent
                    ? "Pronto! Verifique seu email para ativar a conta."
                    : "Insira os dados e crie sua conta"
                  : forgotSent
                  ? "Pronto! Verifique seu email para continuar."
                  : "Informe seu email e enviaremos um link para redefinir sua senha"}
              </p>
            </div>

            {mode === "signup" && signupSent ? (
              <div className="space-y-6">
                <div className="rounded-2xl bg-accent/10 border border-accent/20 p-5 text-center">
                  <p className="text-sm text-foreground/80 font-body">
                    Enviamos um link de ativacao para <strong className="text-foreground">{email}</strong>. Clique no link para confirmar sua conta e depois faca login normalmente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setMode("login"); setSignupSent(false); setPassword(""); }}
                  className="w-full text-sm text-accent font-medium hover:underline"
                >
                  Voltar ao login
                </button>
              </div>
            ) : mode === "forgot" && forgotSent ? (
              <div className="space-y-6">
                <div className="rounded-2xl bg-accent/10 border border-accent/20 p-5 text-center">
                  <p className="text-sm text-foreground/80 font-body">
                    Enviamos um link de recuperação para <strong className="text-foreground">{email}</strong>. Clique no link no email para definir uma nova senha.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setMode("login"); setForgotSent(false); }}
                  className="w-full text-sm text-accent font-medium hover:underline"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Nome</Label>
                    <Input id="fullName" placeholder="Digite seu nome" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-12 rounded-xl" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="Digite o email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs text-accent font-medium hover:underline transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        placeholder="Digite a senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-12 rounded-xl pr-11"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                        {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "signup" && (
                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id="login-accept-terms"
                      checked={acceptedTerms}
                      onCheckedChange={(v) => setAcceptedTerms(v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="login-accept-terms" className="text-xs leading-relaxed text-muted-foreground font-normal cursor-pointer">
                      Li e aceito os{" "}
                      <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Termos de Uso</a>
                      {" "}e a{" "}
                      <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Política de Privacidade</a>.
                    </Label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || (mode === "signup" && !acceptedTerms)}
                  className="group relative w-full inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-2xl font-medium text-sm shadow-[0_6px_20px_-4px_hsl(var(--accent)/0.5)] hover:shadow-[0_8px_28px_-4px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2"
                >
                  {isLoading
                    ? mode === "login" ? "Entrando..." : mode === "signup" ? "Criando conta..." : "Enviando..."
                    : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link de recuperação"}
                  {!isLoading && (
                    <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-accent-foreground/20 group-hover:bg-accent-foreground/30 transition-colors">
                      <ArrowRight className="h-6 w-6" />
                    </span>
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              {mode === "forgot" ? (
                <button type="button" onClick={() => { setMode("login"); setForgotSent(false); }} className="text-accent font-medium hover:underline transition-colors">
                  Voltar ao login
                </button>
              ) : signupSent ? null : (
                <>
                  <span className="text-muted-foreground">
                    {mode === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setMode(mode === "login" ? "signup" : "login"); setSignupSent(false); setPassword(""); }}
                    className="text-accent font-medium hover:underline transition-colors"
                  >
                    {mode === "login" ? "Criar conta" : "Fazer login"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/40 font-body text-center">
          © {new Date().getFullYear()} Novare
        </p>
      </div>

      {/* Right — painel estatico leve (sem animacoes infinitas) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col"
        style={{ background: "linear-gradient(145deg, hsl(220 40% 13%), hsl(220 45% 8%))" }}
      >
        {/* Orbs estaticos com blur — GPU friendly, sem animation */}
        <div
          className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full blur-[120px] opacity-40 pointer-events-none"
          style={{ background: "hsl(var(--accent) / 0.08)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/6 w-[350px] h-[350px] rounded-full blur-[100px] opacity-25 pointer-events-none"
          style={{ background: "hsl(220 70% 45% / 0.12)" }}
        />

        <div className="relative z-10 px-10 pt-10">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(160_60%_50%)] animate-pulse" />
            Performance comparada · últimos 12 meses
          </div>
          <h2 className="mt-2 text-white/90 font-display text-[1.75rem] leading-tight font-medium">
            Sua jornada com a{" "}
            <span className="text-[hsl(160_55%_55%)] font-semibold">Novare</span>
          </h2>
        </div>

        {/* SVG estatico — sem framer-motion, sem rAF */}
        <div className="flex-1 flex items-center justify-center relative z-10 px-8">
          <svg viewBox="0 0 700 460" className="w-full max-w-[640px] h-auto" fill="none">
            <defs>
              <linearGradient id="gradAccent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 55% 50%)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="hsl(160 55% 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="novareStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(160 60% 45%)" />
                <stop offset="100%" stopColor="hsl(160 70% 60%)" />
              </linearGradient>
            </defs>

            <g opacity={0.3} fontFamily="system-ui" fontSize={8} fill="white">
              {["Jan", "Abr", "Jul", "Out", "Hoje"].map((m, i) => (
                <text key={m} x={20 + i * 165} y={420} textAnchor="middle" fontWeight={500}>{m}</text>
              ))}
            </g>

            <path
              d="M 0 380 C 70 370, 120 350, 180 320 C 240 290, 280 260, 340 220 C 400 180, 450 150, 520 110 C 570 85, 630 50, 700 25 L 700 400 L 0 400 Z"
              fill="url(#gradAccent)"
            />
            <path
              d="M 0 395 C 100 392, 180 385, 260 375 C 340 365, 420 352, 500 340 C 560 330, 630 318, 700 305"
              fill="none" stroke="hsl(35 85% 60%)" strokeWidth={2.2} strokeLinecap="round"
            />
            <path
              d="M 0 390 C 80 380, 140 360, 210 340 C 280 320, 340 290, 400 265 C 460 240, 520 215, 580 195 C 620 180, 660 165, 700 145"
              fill="none" stroke="hsl(220 80% 65%)" strokeWidth={2.4} strokeLinecap="round"
            />
            <path
              d="M 0 380 C 70 370, 120 350, 180 320 C 240 290, 280 260, 340 220 C 400 180, 450 150, 520 110 C 570 85, 630 50, 700 25"
              fill="none" stroke="url(#novareStroke)" strokeWidth={3.5} strokeLinecap="round"
            />

            <circle cx={697} cy={25} r={5.5} fill="hsl(160 70% 55%)" />
            <circle cx={697} cy={25} r={2.2} fill="white" />

            <g>
              <rect x={595} y={42} width={92} height={28} rx={8}
                fill="hsl(160 55% 18%)" fillOpacity={0.95}
                stroke="hsl(160 55% 50%)" strokeOpacity={0.5} strokeWidth={0.8} />
              <text x={641} y={56} textAnchor="middle" fill="hsl(160 70% 65%)" fontSize={11} fontWeight={700} fontFamily="system-ui">
                +16,0%
              </text>
              <text x={641} y={66} textAnchor="middle" fill="white" fillOpacity={0.5} fontSize={7} fontWeight={500} fontFamily="system-ui" letterSpacing={0.4}>
                HOJE
              </text>
            </g>

            <g>
              <rect x={20} y={20} width={205} height={108} rx={14}
                fill="hsl(220 40% 11%)" fillOpacity={0.92}
                stroke="white" strokeOpacity={0.07} strokeWidth={0.6} />
              <text x={36} y={40} fill="white" fillOpacity={0.45} fontSize={8} fontWeight={600} fontFamily="system-ui" letterSpacing={1.2}>
                12 MESES · COMPARATIVO
              </text>

              <circle cx={36} cy={62} r={4} fill="hsl(160 60% 55%)" />
              <text x={48} y={66} fill="white" fontSize={11} fontWeight={700} fontFamily="system-ui" letterSpacing={0.5}>NOVARE</text>
              <text x={210} y={66} textAnchor="end" fill="hsl(160 70% 60%)" fontSize={13} fontWeight={800} fontFamily="system-ui">+16,0%</text>

              <circle cx={36} cy={86} r={3.5} fill="hsl(220 80% 65%)" />
              <text x={48} y={90} fill="white" fillOpacity={0.7} fontSize={10} fontWeight={500} fontFamily="system-ui">CDI</text>
              <text x={210} y={90} textAnchor="end" fill="hsl(220 80% 75%)" fontSize={11} fontWeight={600} fontFamily="system-ui">+11,2%</text>

              <circle cx={36} cy={108} r={3.5} fill="hsl(35 85% 60%)" />
              <text x={48} y={112} fill="white" fillOpacity={0.7} fontSize={10} fontWeight={500} fontFamily="system-ui">Poupança</text>
              <text x={210} y={112} textAnchor="end" fill="hsl(35 85% 70%)" fontSize={11} fontWeight={600} fontFamily="system-ui">+6,4%</text>
            </g>
          </svg>
        </div>

        <div className="px-8 pb-8 relative z-10">
          <div className="rounded-2xl p-7 bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
            <p className="text-white/80 font-body text-[0.9375rem] leading-relaxed">
              "A <span className="font-semibold text-white">Novare</span> mudou completamente a forma como eu organizo minhas finanças. É{" "}
              <span className="font-semibold text-accent">claro</span>,{" "}
              <span className="font-semibold text-accent">intuitivo</span> e me dá segurança para tomar decisões."
            </p>
            <div className="flex items-center gap-3 mt-5">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-sm font-bold text-white/80">MC</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Marina Costa</p>
                <p className="text-xs text-white/40">Empresária</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
