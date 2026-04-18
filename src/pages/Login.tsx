import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import logoPreta from "@/assets/logo-preta.png";

/* ── Premium easing for smooth growth feel ─── */
const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

/* ── Count-up hook (rAF based) ──────────────── */
const useCountUp = (target: number, duration = 2200, delay = 0, decimals = 1) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let startTs = 0;
    const start = performance.now() + delay;
    const tick = (ts: number) => {
      if (ts < start) { raf = requestAnimationFrame(tick); return; }
      if (!startTs) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(parseFloat((target * eased).toFixed(decimals)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, decimals]);
  return value;
};

/* ── Premium animated line (with optional shimmer loop) ── */
const AnimatedLine = ({
  d, color, delay = 0, thickness = 2, glow = false, shimmer = false, dimmed = false,
}: {
  d: string; color: string; delay?: number; thickness?: number;
  glow?: boolean; shimmer?: boolean; dimmed?: boolean;
}) => (
  <g opacity={dimmed ? 0.55 : 1}>
    {glow && (
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={thickness + 8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.22}
        filter="url(#softGlow)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.6, delay, ease: PREMIUM_EASE }}
      />
    )}
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={thickness}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2.6, delay, ease: PREMIUM_EASE }}
    />
    {shimmer && (
      <motion.path
        d={d}
        fill="none"
        stroke="white"
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="40 360"
        initial={{ strokeDashoffset: 400, opacity: 0 }}
        animate={{ strokeDashoffset: -400, opacity: [0, 0.7, 0] }}
        transition={{
          duration: 3.2, repeat: Infinity, repeatDelay: 1.4,
          delay: delay + 2.8, ease: "easeInOut",
        }}
      />
    )}
    {dimmed && (
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        animate={{ opacity: [0.45, 0.65, 0.45] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    )}
  </g>
);

/* ── Gradient area fill ────────────────────── */
const AnimatedAreaFill = ({
  d, gradientId, delay = 0
}: {
  d: string; gradientId: string; delay?: number;
}) => (
  <motion.path
    d={d}
    fill={`url(#${gradientId})`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2, delay: delay + 1, ease: "easeOut" }}
  />
);

/* ── Floating data point with pulse ────────── */
const DataPoint = ({ cx, cy, delay, color }: { cx: number; cy: number; delay: number; color: string }) => (
  <g>
    <motion.circle
      cx={cx} cy={cy} r={6}
      fill={color}
      opacity={0.15}
      initial={{ scale: 0 }}
      animate={{ scale: [0, 2, 1.5] }}
      transition={{ delay, duration: 1.5, ease: "easeOut" }}
    />
    <motion.circle
      cx={cx} cy={cy} r={3}
      fill={color}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: delay + 0.2, duration: 0.6, ease: "easeOut" }}
    />
    <motion.circle
      cx={cx} cy={cy} r={1.5}
      fill="white"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: delay + 0.4, duration: 0.4, ease: "easeOut" }}
    />
  </g>
);

/* ── Traveling pulse along the Novare path ── */
const TravelingPulse = ({ pathRef, color }: { pathRef: React.RefObject<SVGPathElement>; color: string }) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    let startTs = 0;
    const LOOP = 5500; // ms per pass
    const PAUSE = 1200;

    const tick = (ts: number) => {
      if (!pathRef.current) { raf = requestAnimationFrame(tick); return; }
      if (!startTs) startTs = ts;
      const elapsed = (ts - startTs) % (LOOP + PAUSE);
      if (elapsed > LOOP) {
        setVisible(false);
      } else {
        const t = elapsed / LOOP;
        const length = pathRef.current.getTotalLength();
        const pt = pathRef.current.getPointAtLength(t * length);
        setPos({ x: pt.x, y: pt.y });
        setVisible(true);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pathRef]);

  if (!pos || !visible) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle cx={pos.x} cy={pos.y} r={10} fill={color} opacity={0.18} />
      <circle cx={pos.x} cy={pos.y} r={5} fill={color} opacity={0.55} />
      <circle cx={pos.x} cy={pos.y} r={2.2} fill="white" />
    </g>
  );
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { signIn, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Refs / values for chart animations
  const novarePathRef = useRef<SVGPathElement>(null);
  const novareVal = useCountUp(24.8, 2400, 600, 1);
  const cdiVal = useCountUp(11.2, 2400, 900, 1);
  const poupVal = useCountUp(6.4, 2400, 1200, 1);
  const acumuladoVal = useCountUp(8420, 2600, 1500, 0);

  if (role === "admin") {
    navigate("/admin", { replace: true });
  } else if (role === "client") {
    navigate("/cliente", { replace: true });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        toast({ title: "Login realizado com sucesso!" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: "Conta criada! 🎉", description: "Vamos iniciar seu planejamento financeiro." });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setForgotSent(true);
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir a senha.",
        });
      }
    } catch (error: any) {
      toast({
        title:
          mode === "login"
            ? "Erro ao fazer login"
            : mode === "signup"
            ? "Erro ao criar conta"
            : "Erro ao enviar email",
        description:
          error.message === "Invalid login credentials"
            ? "Email ou senha incorretos."
            : error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-between px-6 sm:px-12 lg:px-20 py-10 bg-background">
        <div>
          <img src={logoPreta} alt="Novare" className="h-8 w-auto" />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">
                    {mode === "login"
                      ? "Planejamento Financeiro"
                      : mode === "signup"
                      ? "Criar conta"
                      : "Recuperar senha"}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm font-body">
                    {mode === "login"
                      ? "Insira seus dados para acessar a plataforma"
                      : mode === "signup"
                      ? "Insira os dados e crie sua conta"
                      : forgotSent
                      ? "Pronto! Verifique seu email para continuar."
                      : "Informe seu email e enviaremos um link para redefinir sua senha"}
                  </p>
                </div>

                {mode === "forgot" && forgotSent ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-accent/10 border border-accent/20 p-5 text-center">
                      <p className="text-sm text-foreground/80 font-body">
                        Enviamos um link de recuperação para <strong className="text-foreground">{email}</strong>.
                        Clique no link no email para definir uma nova senha.
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
                      <Input id="email" type="email" placeholder="Digite o email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
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
                          <Input id="password" type={showPassword ? "text" : "password"} placeholder="Digite a senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12 rounded-xl pr-11" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                            {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group relative w-full inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-2xl font-medium text-sm shadow-[0_6px_20px_-4px_hsl(var(--accent)/0.5)] hover:shadow-[0_8px_28px_-4px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.4)] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2"
                    >
                      {isLoading
                        ? mode === "login"
                          ? "Entrando..."
                          : mode === "signup"
                          ? "Criando conta..."
                          : "Enviando..."
                        : mode === "login"
                        ? "Entrar"
                        : mode === "signup"
                        ? "Criar conta"
                        : "Enviar link de recuperação"}
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
                  ) : (
                    <>
                      <span className="text-muted-foreground">
                        {mode === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
                      </span>
                      <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-accent font-medium hover:underline transition-colors">
                        {mode === "login" ? "Criar conta" : "Fazer login"}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/40 font-body text-center">
          © {new Date().getFullYear()} Novare
        </p>
      </div>

      {/* Right — Tech animated panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col" style={{ background: "linear-gradient(145deg, hsl(220 40% 13%), hsl(220 45% 8%))" }}>
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full blur-[150px]"
          style={{ background: "hsl(var(--accent) / 0.06)" }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/6 w-[350px] h-[350px] rounded-full blur-[120px]"
          style={{ background: "hsl(220 70% 45% / 0.1)" }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />

        {/* Narrative header */}
        <motion.div
          className="relative z-10 px-10 pt-10"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: PREMIUM_EASE }}
        >
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
            <motion.span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(160_60%_50%)]"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Performance comparada · últimos 12 meses
          </div>
          <h2 className="mt-2 text-white/90 font-display text-[1.75rem] leading-tight font-medium">
            Sua jornada com a{" "}
            <span className="text-[hsl(160_55%_55%)] font-semibold">Novare</span>
          </h2>
        </motion.div>

        {/* Animated charts SVG */}
        <div className="flex-1 flex items-center justify-center relative z-10 px-8">
          <svg viewBox="0 0 700 460" className="w-full max-w-[640px] h-auto" fill="none">
            <defs>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="gradAccent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 55% 50%)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="hsl(160 55% 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(220 70% 60%)" stopOpacity={0.05} />
                <stop offset="100%" stopColor="hsl(220 70% 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="novareStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(160 60% 45%)" />
                <stop offset="100%" stopColor="hsl(160 70% 60%)" />
              </linearGradient>
            </defs>

            {/* Subtle grid — dots */}
            <g opacity={0.04}>
              {[...Array(12)].map((_, i) => (
                [...Array(8)].map((_, j) => (
                  <circle key={`${i}-${j}`} cx={i * 62 + 15} cy={j * 48 + 60} r={0.8} fill="white" />
                ))
              ))}
            </g>

            {/* X-axis month labels */}
            <g opacity={0.3} fontFamily="system-ui" fontSize={8} fill="white">
              {["Jan", "Abr", "Jul", "Out", "Hoje"].map((m, i) => (
                <text key={m} x={20 + i * 165} y={420} textAnchor="middle" fontWeight={500}>{m}</text>
              ))}
            </g>

            {/* Area fill — NOVARE only (heavy) */}
            <AnimatedAreaFill
              d="M 0 380 C 70 370, 120 350, 180 320 C 240 290, 280 260, 340 220 C 400 180, 450 150, 520 110 C 570 85, 630 50, 700 25 L 700 400 L 0 400 Z"
              gradientId="gradAccent"
              delay={0.3}
            />
            <AnimatedAreaFill
              d="M 0 390 C 80 380, 140 360, 210 340 C 280 320, 340 290, 400 265 C 460 240, 520 215, 580 195 C 620 180, 660 165, 700 145 L 700 400 L 0 400 Z"
              gradientId="gradBlue"
              delay={0.6}
            />

            {/* Poupança — desaturated, thin, dimmed */}
            <AnimatedLine
              d="M 0 395 C 100 392, 180 385, 260 375 C 340 365, 420 352, 500 340 C 560 330, 630 318, 700 305"
              color="hsl(220 15% 65%)"
              delay={0.9}
              thickness={1}
              dimmed
            />

            {/* CDI / Banco A — desaturated mid */}
            <AnimatedLine
              d="M 0 390 C 80 380, 140 360, 210 340 C 280 320, 340 290, 400 265 C 460 240, 520 215, 580 195 C 620 180, 660 165, 700 145"
              color="hsl(220 30% 60%)"
              delay={0.6}
              thickness={1.2}
              dimmed
            />

            {/* MAIN — NOVARE */}
            <g>
              <motion.path
                d="M 0 380 C 70 370, 120 350, 180 320 C 240 290, 280 260, 340 220 C 400 180, 450 150, 520 110 C 570 85, 630 50, 700 25"
                fill="none"
                stroke="hsl(160 60% 50%)"
                strokeWidth={11}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.18}
                filter="url(#softGlow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.6, delay: 0.3, ease: PREMIUM_EASE }}
              />
              <motion.path
                ref={novarePathRef}
                d="M 0 380 C 70 370, 120 350, 180 320 C 240 290, 280 260, 340 220 C 400 180, 450 150, 520 110 C 570 85, 630 50, 700 25"
                fill="none"
                stroke="url(#novareStroke)"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.6, delay: 0.3, ease: PREMIUM_EASE }}
              />
              <motion.path
                d="M 0 380 C 70 370, 120 350, 180 320 C 240 290, 280 260, 340 220 C 400 180, 450 150, 520 110 C 570 85, 630 50, 700 25"
                fill="none"
                stroke="white"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeDasharray="60 700"
                initial={{ strokeDashoffset: 760, opacity: 0 }}
                animate={{ strokeDashoffset: -100, opacity: [0, 0.65, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 1.6, delay: 3, ease: "easeInOut" }}
              />
              <TravelingPulse pathRef={novarePathRef} color="hsl(160 70% 60%)" />
            </g>

            {/* Sparse data points on NOVARE */}
            <DataPoint cx={340} cy={220} delay={1.5} color="hsl(160 60% 55%)" />
            <DataPoint cx={520} cy={110} delay={1.8} color="hsl(160 60% 55%)" />

            {/* Pulsing endpoint */}
            <g>
              <motion.circle
                cx={697} cy={25} r={14}
                fill="hsl(160 60% 50%)" opacity={0.25}
                animate={{ scale: [1, 1.8, 1], opacity: [0.25, 0, 0.25] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                style={{ transformOrigin: "697px 25px" }}
              />
              <motion.circle
                cx={697} cy={25} r={5.5}
                fill="hsl(160 70% 55%)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2.8, duration: 0.6, ease: PREMIUM_EASE }}
              />
              <motion.circle
                cx={697} cy={25} r={2.2}
                fill="white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 3, duration: 0.4 }}
              />
            </g>

            {/* End tooltip — "+24,8% Hoje" */}
            <motion.g
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3.1, duration: 0.7, ease: PREMIUM_EASE }}
            >
              <rect x={595} y={42} width={92} height={28} rx={8}
                fill="hsl(160 55% 18%)" fillOpacity={0.95}
                stroke="hsl(160 55% 50%)" strokeOpacity={0.5} strokeWidth={0.8} />
              <text x={641} y={56} textAnchor="middle" fill="hsl(160 70% 65%)" fontSize={11} fontWeight={700} fontFamily="system-ui">
                +{novareVal.toFixed(1)}%
              </text>
              <text x={641} y={66} textAnchor="middle" fill="white" fillOpacity={0.5} fontSize={7} fontWeight={500} fontFamily="system-ui" letterSpacing={0.4}>
                HOJE
              </text>
              <path d="M 687 56 L 695 30 L 685 50 Z" fill="hsl(160 55% 18%)" fillOpacity={0.95} />
            </motion.g>

            {/* Novare "N" signature near endpoint */}
            <motion.g
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 3.3, duration: 0.5, ease: PREMIUM_EASE }}
              style={{ transformOrigin: "670px 12px" }}
            >
              <circle cx={670} cy={12} r={9} fill="hsl(160 55% 50%)" fillOpacity={0.18} stroke="hsl(160 55% 55%)" strokeOpacity={0.4} strokeWidth={0.6} />
              <text x={670} y={15} textAnchor="middle" fill="hsl(160 70% 65%)" fontSize={9} fontWeight={800} fontFamily="system-ui">N</text>
            </motion.g>

            {/* Comparison panel — anchored top-left */}
            <motion.g
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: PREMIUM_EASE }}
            >
              <rect x={20} y={20} width={205} height={108} rx={14}
                fill="hsl(220 40% 11%)" fillOpacity={0.92}
                stroke="white" strokeOpacity={0.07} strokeWidth={0.6} />
              <text x={36} y={40} fill="white" fillOpacity={0.45} fontSize={8} fontWeight={600} fontFamily="system-ui" letterSpacing={1.2}>
                12 MESES · COMPARATIVO
              </text>

              <circle cx={36} cy={62} r={4} fill="hsl(160 60% 55%)" />
              <text x={48} y={66} fill="white" fontSize={11} fontWeight={700} fontFamily="system-ui" letterSpacing={0.5}>NOVARE</text>
              <text x={210} y={66} textAnchor="end" fill="hsl(160 70% 60%)" fontSize={13} fontWeight={800} fontFamily="system-ui">
                +{novareVal.toFixed(1)}%
              </text>

              <circle cx={36} cy={86} r={3} fill="hsl(220 30% 60%)" opacity={0.7} />
              <text x={48} y={90} fill="white" fillOpacity={0.55} fontSize={10} fontWeight={500} fontFamily="system-ui">CDI</text>
              <text x={210} y={90} textAnchor="end" fill="white" fillOpacity={0.55} fontSize={11} fontWeight={600} fontFamily="system-ui">
                +{cdiVal.toFixed(1)}%
              </text>

              <circle cx={36} cy={108} r={3} fill="hsl(220 15% 65%)" opacity={0.6} />
              <text x={48} y={112} fill="white" fillOpacity={0.45} fontSize={10} fontWeight={500} fontFamily="system-ui">Poupança</text>
              <text x={210} y={112} textAnchor="end" fill="white" fillOpacity={0.45} fontSize={11} fontWeight={600} fontFamily="system-ui">
                +{poupVal.toFixed(1)}%
              </text>
            </motion.g>

            {/* Acumulado KPI — bottom right */}
            <motion.g
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.7, ease: PREMIUM_EASE }}
            >
              <rect x={475} y={335} width={210} height={56} rx={12}
                fill="hsl(220 40% 11%)" fillOpacity={0.85}
                stroke="white" strokeOpacity={0.06} strokeWidth={0.5} />
              <text x={490} y={355} fill="white" fillOpacity={0.4} fontSize={8} fontWeight={600} fontFamily="system-ui" letterSpacing={1}>
                ACUMULADO COM NOVARE
              </text>
              <text x={490} y={378} fill="hsl(160 70% 60%)" fontSize={20} fontWeight={800} fontFamily="system-ui">
                +R$ {acumuladoVal.toLocaleString("pt-BR")}
              </text>
            </motion.g>
          </svg>
        </div>

        {/* Testimonial card */}
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
