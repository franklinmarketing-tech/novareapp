import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, MeshDistortMaterial, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { Globe2, TrendingUp, TrendingDown, Users, Activity, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Card3D } from "@/components/ui/card-3d";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_PT_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const RISK_COLORS_HEX: Record<string, string> = {
  A: "#10b981", // success / emerald
  B: "#3b82f6", // primary / blue
  C: "#f59e0b", // accent / amber
  D: "#f97316", // warning / orange
  E: "#ef4444", // destructive / red
};

const fmtBRLShort = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (abs >= 1_000) return `${sign}R$ ${Math.round(abs / 1_000)}k`;
  return `${sign}R$ ${Math.round(abs)}`;
};

interface WealthMonth {
  month: string;
  value: number;
}

interface ClientParticle {
  id: string;
  name: string;
  wealth: number;
  risk: string;
}

// ───────── Central Sphere ─────────
const CentralSphere = ({ trend, scale }: { trend: number; scale: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
      const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 1.2) * 0.03;
      meshRef.current.scale.setScalar(scale * pulse);
    }
  });

  const color = trend > 0 ? "#10b981" : trend < 0 ? "#ef4444" : "#3b82f6";

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={0.35}
        speed={1.5}
        roughness={0.2}
        metalness={0.6}
        emissive={color}
        emissiveIntensity={0.25}
      />
    </mesh>
  );
};

// ───────── Equatorial Ring (6 months) ─────────
const WealthRing = ({ series }: { series: WealthMonth[] }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.08;
    }
  });

  const max = Math.max(...series.map((s) => Math.abs(s.value)), 1);
  const radius = 1.8;

  return (
    <group ref={groupRef}>
      {series.map((s, i) => {
        const angle = (i / series.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 0.15 + (Math.abs(s.value) / max) * 0.6;
        const isPositive = s.value >= 0;
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.18, height, 0.18]} />
            <meshStandardMaterial
              color={isPositive ? "#10b981" : "#ef4444"}
              emissive={isPositive ? "#10b981" : "#ef4444"}
              emissiveIntensity={0.4}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        );
      })}
      {/* Ring base */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.015, 16, 100]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

// ───────── Client Particles ─────────
const ClientParticles = ({ clients }: { clients: ClientParticle[] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<ClientParticle | null>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = -state.clock.getElapsedTime() * 0.05;
    }
  });

  const maxWealth = Math.max(...clients.map((c) => c.wealth), 1);

  const particles = useMemo(() => {
    return clients.map((c, i) => {
      // Distribute on a fibonacci sphere for even spacing
      const phi = Math.acos(1 - (2 * (i + 0.5)) / clients.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      // Distance from center: based on wealth (closer = more wealth)
      const wealthRatio = c.wealth / maxWealth;
      const distance = 2.6 + (1 - wealthRatio) * 1.2;
      const x = Math.cos(theta) * Math.sin(phi) * distance;
      const y = Math.sin(theta) * Math.sin(phi) * distance;
      const z = Math.cos(phi) * distance;
      const size = 0.04 + wealthRatio * 0.08;
      return { client: c, x, y, z, size };
    });
  }, [clients, maxWealth]);

  return (
    <group ref={groupRef}>
      {particles.map((p) => (
        <mesh
          key={p.client.id}
          position={[p.x, p.y, p.z]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(p.client);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(null);
            document.body.style.cursor = "default";
          }}
        >
          <sphereGeometry args={[p.size, 16, 16]} />
          <meshStandardMaterial
            color={RISK_COLORS_HEX[p.client.risk] || "#3b82f6"}
            emissive={RISK_COLORS_HEX[p.client.risk] || "#3b82f6"}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
      {hovered && (
        <Html
          position={[
            particles.find((x) => x.client.id === hovered.id)?.x || 0,
            (particles.find((x) => x.client.id === hovered.id)?.y || 0) + 0.2,
            particles.find((x) => x.client.id === hovered.id)?.z || 0,
          ]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded-lg bg-background/95 backdrop-blur-md border border-border px-3 py-2 shadow-xl whitespace-nowrap">
            <p className="text-xs font-semibold text-foreground">{hovered.name}</p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {fmtBRLShort(hovered.wealth)} · Risco {hovered.risk}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
};

// ───────── Scene ─────────
const Scene = ({
  series,
  clients,
  trend,
  totalWealth,
}: {
  series: WealthMonth[];
  clients: ClientParticle[];
  trend: number;
  totalWealth: number;
}) => {
  // Sphere scale based on total wealth (logarithmic to avoid extremes)
  const scale = useMemo(() => {
    const base = Math.log10(Math.max(Math.abs(totalWealth), 10)) / 8;
    return Math.max(0.7, Math.min(1.3, base + 0.6));
  }, [totalWealth]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, -10, -5]} intensity={0.6} color="#3b82f6" />
      <Stars radius={50} depth={30} count={800} factor={2} fade speed={0.5} />
      <CentralSphere trend={trend} scale={scale} />
      {series.length > 0 && <WealthRing series={series} />}
      {clients.length > 0 && <ClientParticles clients={clients} />}
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.6}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={(2 * Math.PI) / 3}
      />
    </>
  );
};

// ───────── Main Component ─────────
const WealthSphere3D = ({
  selectedMonth,
  selectedYear,
}: {
  selectedMonth: number;
  selectedYear: number;
}) => {
  const isMobile = useIsMobile();
  // Local override of the period (defaults to props from parent dashboard)
  const [localMonth, setLocalMonth] = useState(selectedMonth);
  const [localYear, setLocalYear] = useState(selectedYear);
  const [isCustom, setIsCustom] = useState(false);

  // Sync with parent only when user has not overridden locally
  useEffect(() => {
    if (!isCustom) {
      setLocalMonth(selectedMonth);
      setLocalYear(selectedYear);
    }
  }, [selectedMonth, selectedYear, isCustom]);

  const today = new Date();
  const isCurrentMonth = localMonth === today.getMonth() && localYear === today.getFullYear();

  const goPrev = () => {
    setIsCustom(true);
    if (localMonth === 0) {
      setLocalMonth(11);
      setLocalYear((y) => y - 1);
    } else {
      setLocalMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (isCurrentMonth) return;
    setIsCustom(true);
    if (localMonth === 11) {
      setLocalMonth(0);
      setLocalYear((y) => y + 1);
    } else {
      setLocalMonth((m) => m + 1);
    }
  };
  const resetToParent = () => {
    setIsCustom(false);
    setLocalMonth(selectedMonth);
    setLocalYear(selectedYear);
  };

  const [series, setSeries] = useState<WealthMonth[]>([]);
  const [clients, setClients] = useState<ClientParticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Window of 6 months ending at selected
      const months: { year: number; month: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(localYear, localMonth - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() });
      }
      const windowStart = new Date(months[0].year, months[0].month, 1);
      const windowEnd = new Date(localYear, localMonth + 1, 0, 23, 59, 59);

      const { data: clientRows } = await supabase
        .from("clients")
        .select("id, created_at")
        .lte("created_at", windowEnd.toISOString());
      const clientIds = clientRows?.map((c) => c.id) || [];

      const { data: snapshots } = await supabase
        .from("monitoring_snapshots")
        .select("client_id, snapshot_date, total_assets, total_debts")
        .in("client_id", clientIds.length > 0 ? clientIds : ["__none__"])
        .gte("snapshot_date", windowStart.toISOString().slice(0, 10))
        .lte("snapshot_date", windowEnd.toISOString().slice(0, 10));

      const builtSeries: WealthMonth[] = months.map(({ year, month }) => {
        const monthEndStr = new Date(year, month + 1, 0).toISOString().slice(0, 10);
        const latest: Record<string, { a: number; d: number; date: string }> = {};
        snapshots?.forEach((s) => {
          if (s.snapshot_date <= monthEndStr) {
            const prev = latest[s.client_id];
            if (!prev || s.snapshot_date > prev.date) {
              latest[s.client_id] = {
                a: s.total_assets || 0,
                d: s.total_debts || 0,
                date: s.snapshot_date,
              };
            }
          }
        });
        const vals = Object.values(latest);
        const total = vals.reduce((s, v) => s + v.a - v.d, 0);
        return { month: MONTHS_PT[month], value: total };
      });
      setSeries(builtSeries);

      // Client particles: top 100 by current wealth
      if (clientIds.length > 0) {
        const [diagRes, assetsRes, debtsRes] = await Promise.all([
          supabase.from("diagnosis").select("client_id, risk_classification").in("client_id", clientIds),
          supabase.from("assets").select("client_id, estimated_value").in("client_id", clientIds),
          supabase.from("debts").select("client_id, total_amount").in("client_id", clientIds),
        ]);

        // We need profile names via clients.user_id
        const { data: clientsFull } = await supabase
          .from("clients")
          .select("id, user_id")
          .in("id", clientIds);
        const userIds = (clientsFull || []).map((c) => c.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const nameByUser: Record<string, string> = {};
        profilesData?.forEach((p) => {
          nameByUser[p.user_id] = p.full_name || "Cliente";
        });
        const userByClient: Record<string, string> = {};
        clientsFull?.forEach((c) => {
          userByClient[c.id] = c.user_id;
        });

        const assetsByClient: Record<string, number> = {};
        assetsRes.data?.forEach((a) => {
          assetsByClient[a.client_id] = (assetsByClient[a.client_id] || 0) + (a.estimated_value || 0);
        });
        const debtsByClient: Record<string, number> = {};
        debtsRes.data?.forEach((d) => {
          debtsByClient[d.client_id] = (debtsByClient[d.client_id] || 0) + (d.total_amount || 0);
        });
        const riskByClient: Record<string, string> = {};
        diagRes.data?.forEach((d) => {
          riskByClient[d.client_id] = d.risk_classification || "C";
        });

        const built: ClientParticle[] = clientIds.map((id) => ({
          id,
          name: nameByUser[userByClient[id]] || "Cliente",
          wealth: (assetsByClient[id] || 0) - (debtsByClient[id] || 0),
          risk: riskByClient[id] || "C",
        }));
        // Top 100 by absolute wealth, exclude zeros to avoid clutter
        const filtered = built
          .filter((c) => Math.abs(c.wealth) > 0)
          .sort((a, b) => Math.abs(b.wealth) - Math.abs(a.wealth))
          .slice(0, 100);
        setClients(filtered);
      } else {
        setClients([]);
      }

      setLoading(false);
    };
    fetchData();
  }, [localMonth, localYear]);

  const lastValue = series[series.length - 1]?.value || 0;
  const firstValue = series[0]?.value || 0;
  const trend = lastValue - firstValue;
  const trendPct = firstValue !== 0 ? Math.round((trend / Math.abs(firstValue)) * 100) : 0;
  const healthyCount = clients.filter((c) => c.risk === "A" || c.risk === "B").length;
  const healthyPct = clients.length > 0 ? Math.round((healthyCount / clients.length) * 100) : 0;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Activity;
  const trendColor = trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card3D glowColor="rgba(59,130,246,0.15)">
        <div className="relative overflow-hidden rounded-[inherit]">
          {/* Header */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  Globo Patrimonial
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Visão 3D da carteira · arraste para girar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Period selector — local to the sphere */}
              <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
                <button
                  onClick={goPrev}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background transition-colors"
                  title="Mês anterior"
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <select
                  value={localMonth}
                  onChange={(e) => {
                    setIsCustom(true);
                    setLocalMonth(Number(e.target.value));
                  }}
                  className="h-7 px-2 rounded-lg bg-transparent text-xs font-semibold text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer"
                  aria-label="Selecionar mês"
                >
                  {MONTHS_PT_FULL.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
                <select
                  value={localYear}
                  onChange={(e) => {
                    setIsCustom(true);
                    setLocalYear(Number(e.target.value));
                  }}
                  className="h-7 px-2 rounded-lg bg-transparent text-xs font-semibold text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer tabular-nums"
                  aria-label="Selecionar ano"
                >
                  {Array.from({ length: 6 }, (_, i) => today.getFullYear() - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={goNext}
                  disabled={isCurrentMonth}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isCurrentMonth ? "opacity-30 cursor-not-allowed" : "hover:bg-background"}`}
                  title="Próximo mês"
                  type="button"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {isCustom && (
                <button
                  onClick={resetToParent}
                  className="flex items-center gap-1 px-2 h-7 rounded-lg bg-muted/60 hover:bg-muted text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  title="Voltar ao período do dashboard"
                  type="button"
                >
                  <RotateCcw className="h-3 w-3" />
                  Sincronizar
                </button>
              )}

              {series.length > 0 && firstValue !== 0 && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${trend > 0 ? "bg-success/10" : trend < 0 ? "bg-destructive/10" : "bg-muted"}`}>
                  <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
                  <span className={`text-xs font-bold tabular-nums ${trendColor}`}>
                    {trend >= 0 ? "+" : ""}{trendPct}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Canvas + HUD */}
          <div className="relative h-[380px] w-full">
            {/* Background gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, hsl(var(--primary) / 0.08) 0%, transparent 70%)",
              }}
            />

            {/* HUD overlay */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
              <div className="rounded-xl bg-background/70 backdrop-blur-md border border-border/50 px-3 py-2">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Sob gestão</p>
                <p className="text-lg font-bold text-foreground tabular-nums leading-tight">
                  {loading ? "—" : fmtBRLShort(lastValue)}
                </p>
              </div>
            </div>
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-none">
              <div className="rounded-xl bg-background/70 backdrop-blur-md border border-border/50 px-3 py-2 text-right">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-end gap-1">
                  <Users className="h-2.5 w-2.5" /> Clientes
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums leading-tight">
                  {clients.length}
                </p>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
              <div className="rounded-xl bg-background/70 backdrop-blur-md border border-border/50 px-3 py-2">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Carteira saudável</p>
                <p className="text-lg font-bold text-success tabular-nums leading-tight">
                  {healthyPct}%
                </p>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
              <div className="flex flex-wrap gap-1.5 justify-end max-w-[180px]">
                {(["A", "B", "C", "D", "E"] as const).map((r) => (
                  <div
                    key={r}
                    className="flex items-center gap-1 rounded-md bg-background/70 backdrop-blur-md border border-border/50 px-1.5 py-0.5"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: RISK_COLORS_HEX[r] }}
                    />
                    <span className="text-[9px] font-semibold text-muted-foreground">{r}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reduced motion fallback */}
            {reducedMotion ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary via-success to-accent opacity-60 blur-md" />
                  <p className="text-xs text-muted-foreground">Animação reduzida ativada</p>
                </div>
              </div>
            ) : isMobile ? (
              // Mobile simplified canvas
              <Canvas
                camera={{ position: [0, 0, 7], fov: 50 }}
                dpr={[1, 1.5]}
                frameloop="always"
              >
                <Suspense fallback={null}>
                  <ambientLight intensity={0.6} />
                  <pointLight position={[5, 5, 5]} intensity={1} />
                  <CentralSphere trend={trend} scale={1} />
                  {series.length > 0 && <WealthRing series={series} />}
                  <OrbitControls autoRotate autoRotateSpeed={0.8} enableZoom={false} enablePan={false} />
                </Suspense>
              </Canvas>
            ) : (
              <Canvas
                camera={{ position: [0, 1.2, 6.5], fov: 55 }}
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true }}
              >
                <Suspense fallback={null}>
                  <Scene
                    series={series}
                    clients={clients}
                    trend={trend}
                    totalWealth={lastValue}
                  />
                </Suspense>
              </Canvas>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </Card3D>
    </motion.div>
  );
};

export default WealthSphere3D;
