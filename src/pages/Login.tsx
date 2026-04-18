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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
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
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // If session exists, user is auto-logged in → redirect handled by RootRedirect
        toast({ title: "Conta criada! 🎉", description: "Vamos iniciar seu planejamento financeiro." });
        // Auth state change will handle redirect automatically
      }
    } catch (error: any) {
      toast({
        title: mode === "login" ? "Erro ao fazer login" : "Erro ao criar conta",
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
                    {mode === "login" ? "Entrar na sua conta" : "Criar conta"}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm font-body">
                    {mode === "login"
                      ? "Insira seus dados para acessar a plataforma"
                      : "Insira os dados e crie sua conta"}
                  </p>
                </div>

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
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Digite a senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12 rounded-xl pr-11" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                        {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-2xl font-medium text-sm shadow-[0_6px_20px_-4px_hsl(var(--accent)/0.5)] hover:shadow-[0_8px_28px_-4px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.4)] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2"
                  >
                    {isLoading ? (mode === "login" ? "Entrando..." : "Criando conta...") : (mode === "login" ? "Entrar" : "Criar conta")}
                    {!isLoading && (
                      <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-accent-foreground/20 group-hover:bg-accent-foreground/30 transition-colors">
                        <ArrowRight className="h-6 w-6" />
                      </span>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">
                    {mode === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
                  </span>
                  <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-accent font-medium hover:underline transition-colors">
                    {mode === "login" ? "Criar conta" : "Fazer login"}
                  </button>
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

        {/* Animated charts SVG */}
        <div className="flex-1 flex items-center justify-center relative z-10 p-8">
          <svg viewBox="0 0 700 500" className="w-full max-w-[620px] h-auto" fill="none">
            <defs>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Gradient fills for area under curves */}
              <linearGradient id="gradAccent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 55% 50%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(160 55% 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(220 70% 60%)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="hsl(220 70% 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.08} />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Subtle grid — dots style */}
            <g opacity={0.04}>
              {[...Array(12)].map((_, i) => (
                [...Array(10)].map((_, j) => (
                  <circle key={`${i}-${j}`} cx={i * 62 + 15} cy={j * 52 + 15} r={0.8} fill="white" />
                ))
              ))}
            </g>

            {/* Area fills — smooth gradients */}
            <AnimatedAreaFill
              d="M 0 420 C 70 410, 120 390, 180 360 C 240 330, 280 300, 340 260 C 400 220, 450 190, 520 150 C 570 125, 630 90, 700 55 L 700 500 L 0 500 Z"
              gradientId="gradAccent"
              delay={0.3}
            />
            <AnimatedAreaFill
              d="M 0 430 C 80 420, 140 400, 210 380 C 280 360, 340 330, 400 305 C 460 280, 520 250, 580 220 C 620 200, 660 180, 700 155 L 700 500 L 0 500 Z"
              gradientId="gradBlue"
              delay={0.6}
            />

            {/* Main line — NOVARE (green, strongest growth) */}
            <AnimatedLine
              d="M 0 420 C 70 410, 120 390, 180 360 C 240 330, 280 300, 340 260 C 400 220, 450 190, 520 150 C 570 125, 630 90, 700 55"
              color="hsl(160 55% 50%)"
              delay={0.3}
              thickness={2.5}
              glow
            />

            {/* Secondary line — BANCO A (blue) */}
            <AnimatedLine
              d="M 0 430 C 80 420, 140 400, 210 380 C 280 360, 340 330, 400 305 C 460 280, 520 250, 580 220 C 620 200, 660 180, 700 155"
              color="hsl(220 70% 60%)"
              delay={0.6}
              thickness={1.8}
              glow
            />

            {/* Third line — BANCO B (accent/orange, conservative) */}
            <AnimatedLine
              d="M 0 435 C 100 430, 180 420, 260 405 C 340 390, 420 370, 500 348 C 560 332, 630 315, 700 295"
              color="hsl(var(--accent))"
              delay={0.9}
              thickness={1.5}
            />

            {/* Data points with pulse effect — NOVARE line */}
            <DataPoint cx={180} cy={360} delay={1.2} color="hsl(160 55% 50%)" />
            <DataPoint cx={340} cy={260} delay={1.5} color="hsl(160 55% 50%)" />
            <DataPoint cx={520} cy={150} delay={1.8} color="hsl(160 55% 50%)" />
            <DataPoint cx={690} cy={58} delay={2.1} color="hsl(160 55% 50%)" />

            {/* Ring chart */}
            <RingChart cx={630} cy={55} r={20} delay={1.8} />

            {/* Stat badges */}
            <StatBadge x={25} y={25} value="+14,75%" label="Taxa Selic a.a." color="hsl(160 55% 55%)" delay={2} />
            <StatBadge x={165} y={42} value="~1%" label="Rendimento/mês" color="hsl(160 55% 55%)" delay={2.2} />

            {/* Live indicator */}
            <motion.circle
              cx={140} cy={32} r={3.5}
              fill="hsl(160 60% 50%)"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle
              cx={140} cy={32} r={7}
              fill="none" stroke="hsl(160 60% 50%)" strokeWidth={0.8}
              animate={{ opacity: [0.4, 0, 0.4], scale: [1, 2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Animated value label at end of main line */}
            <motion.g
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.5, duration: 0.6 }}
            >
              <rect x={655} y={62} width={42} height={20} rx={6}
                fill="hsl(160 55% 50%)" fillOpacity={0.15}
                stroke="hsl(160 55% 50%)" strokeOpacity={0.3} strokeWidth={0.5} />
              <text x={676} y={76} textAnchor="middle" fill="hsl(160 55% 50%)" fontSize={9} fontWeight={700} fontFamily="system-ui">+42%</text>
            </motion.g>

            {/* Legend labels */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.8, duration: 0.6 }}
            >
              {/* NOVARE */}
              <rect x={25} y={460} width={8} height={3} rx={1.5} fill="hsl(160 55% 50%)" />
              <text x={38} y={464} fill="white" fontSize={9} fontWeight={700} fontFamily="system-ui" opacity={0.8}>NOVARE</text>
              {/* BANCO A */}
              <rect x={110} y={460} width={8} height={3} rx={1.5} fill="hsl(220 70% 60%)" />
              <text x={123} y={464} fill="white" fontSize={9} fontWeight={600} fontFamily="system-ui" opacity={0.5}>BANCO A</text>
              {/* BANCO B */}
              <rect x={195} y={460} width={8} height={3} rx={1.5} fill="hsl(var(--accent))" />
              <text x={208} y={464} fill="white" fontSize={9} fontWeight={600} fontFamily="system-ui" opacity={0.5}>BANCO B</text>
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
