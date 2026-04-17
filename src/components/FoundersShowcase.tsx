import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight, X, Briefcase, TrendingUp, GraduationCap,
  Shield, Users, Award, Linkedin,
} from "lucide-react";
import jeffersonImg from "@/assets/jefferson.png";
import leonardoImg from "@/assets/leonardo.png";

const founders = [
  {
    id: "jefferson",
    name: "Jefferson Freitas",
    shortName: "Jefferson",
    certs: "CEA · CNEP-I · CFDe",
    role: "Sócio-fundador",
    shortBio: "Consultor Wealth de Investimentos",
    img: jeffersonImg,
    linkedin: "https://www.linkedin.com/in/jeffersonfreitas",
    highlights: [
      { icon: Briefcase, text: "Ex-Santander (Especialista Van Gogh / Select) e XP Inc." },
      { icon: TrendingUp, text: "+R$ 40 milhões em captação líquida em um único ano" },
      { icon: GraduationCap, text: "MBA PAAP CNEP-I · Aprovado CNPI (Conteúdo Brasileiro)" },
      { icon: Shield, text: "13 anos de voluntariado em Tesouraria na CCB" },
    ],
    bio: "Com experiência nas maiores plataformas do mercado, Jefferson se especializou em planejamento patrimonial e estratégias de longo prazo para famílias e empresários de alta renda.",
  },
  {
    id: "leonardo",
    name: "Leonardo Freitas de Oliveira",
    shortName: "Leonardo",
    certs: "CEA",
    role: "Sócio-fundador",
    shortBio: "Consultor Wealth de Investimentos",
    img: leonardoImg,
    linkedin: "https://www.linkedin.com/in/leonardofreitasdeoliveira",
    highlights: [
      { icon: Briefcase, text: "Ex-líder Triple AAA no Santander · Wave Capital (BTG)" },
      { icon: Users, text: "Liderou +20 profissionais na região de Limeira" },
      { icon: Award, text: "Quadrante A1+ recorrente — referência em assessoria" },
      { icon: GraduationCap, text: "Bacharel em Administração · ANCORD" },
    ],
    bio: "Leonardo construiu sua carreira liderando equipes de alta performance e atendendo clientes de alta renda. Especialista em alocação estratégica de ativos.",
  },
];

interface Props {
  /** compact mode for sidebars */
  variant?: "sidebar" | "full";
}

export const FoundersShowcase = ({ variant = "full" }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      {/* Avatars row */}
      <div className={variant === "sidebar" ? "px-4 py-3" : ""}>
        {variant === "sidebar" && (
          <p className="px-4 mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/40">
            Seus consultores
          </p>
        )}
        <div className={`flex ${variant === "sidebar" ? "gap-3 justify-start px-2" : "gap-12 md:gap-20 justify-center"}`}>
          {founders.map((f, i) => (
            <motion.button
              key={f.id}
              onClick={() => setSelected(f.id)}
              className="group flex flex-col items-center gap-2 focus:outline-none"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="relative">
                <div
                  className={`rounded-full overflow-hidden ring-2 ring-accent/30 group-hover:ring-accent/70 transition-all duration-300 shadow-lg group-hover:shadow-[0_0_20px_-5px_hsl(var(--accent)/0.4)] ${
                    variant === "sidebar" ? "w-16 h-16" : "w-32 h-32 md:w-40 md:h-40 ring-4"
                  }`}
                >
                  <img src={f.img} alt={f.name} className="w-full h-full object-cover object-top" />
                </div>
                <motion.div
                  className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-accent flex items-center justify-center shadow-md ${
                    variant === "sidebar" ? "w-5 h-5" : "w-8 h-8"
                  }`}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowUpRight className={variant === "sidebar" ? "w-3 h-3 text-accent-foreground" : "w-4 h-4 text-accent-foreground"} />
                </motion.div>
              </div>
              {variant !== "sidebar" && (
                <div className="text-center">
                  <p className="font-bold text-base md:text-lg text-foreground">{f.shortName}</p>
                  <p className="text-xs text-accent font-semibold">{f.certs}</p>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Popup */}
      <AnimatePresence>
        {selected && (() => {
          const f = founders.find(x => x.id === selected)!;
          return (
            <motion.div
              key="founder-overlay"
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                className="absolute inset-0 bg-primary/60 backdrop-blur-md"
                onClick={() => setSelected(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              <motion.div
                className="relative z-10 w-full max-w-lg bg-background rounded-3xl shadow-2xl overflow-hidden border border-border/40"
                initial={{ opacity: 0, scale: 0.8, y: 40, rotateX: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>

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
    </>
  );
};
