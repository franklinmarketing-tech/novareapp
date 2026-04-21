import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, X, Linkedin, Pencil, Plus, EyeOff, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchFounders, type Founder } from "@/lib/founders";
import { FounderEditor, ICON_OPTIONS, type IconName } from "@/components/FounderEditor";

interface Props {
  /** compact mode for sidebars */
  variant?: "sidebar" | "full";
}

export const FoundersShowcase = ({ variant = "full" }: Props) => {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [founders, setFounders] = useState<Founder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Founder | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      // Admin enxerga inativos para poder gerenciá-los
      const data = await fetchFounders(isAdmin);
      setFounders(data);
    } catch (e) {
      console.error("Failed to load founders", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (loading && founders.length === 0) {
    return <div className={variant === "sidebar" ? "h-20" : "h-40"} />;
  }

  return (
    <>
      {/* Avatars row */}
      <div className={variant === "sidebar" ? "px-4 py-3" : ""}>
        {variant === "sidebar" && (
          <p className="px-4 mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/40">
            Seus consultores
          </p>
        )}
        <div className={`flex ${variant === "sidebar" ? "gap-2 items-center justify-start px-2 flex-wrap" : "gap-12 md:gap-20 justify-center flex-wrap"}`}>
          {founders.map((f) => (
            <div key={f.id} className="relative group/founder">
              <motion.button
                onClick={() => setSelected(f.id)}
                className="flex flex-col items-center gap-2 focus:outline-none"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="relative">
                  <div
                    className={`rounded-full overflow-hidden ring-2 ring-accent/30 group-hover/founder:ring-accent/70 transition-all duration-300 shadow-lg group-hover/founder:shadow-[0_0_20px_-5px_hsl(var(--accent)/0.4)] ${
                      variant === "sidebar" ? "w-12 h-12" : "w-32 h-32 md:w-40 md:h-40 ring-4"
                    } ${!f.active ? "opacity-50" : ""}`}
                  >
                    {f.image_url ? (
                      <img src={f.image_url} alt={f.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <motion.div
                    className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-accent flex items-center justify-center shadow-md ${
                      variant === "sidebar" ? "w-4 h-4" : "w-8 h-8"
                    }`}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ArrowUpRight className={variant === "sidebar" ? "w-2.5 h-2.5 text-accent-foreground" : "w-4 h-4 text-accent-foreground"} />
                  </motion.div>
                  {!f.active && (
                    <div className="absolute -top-1 -left-1 rounded-full bg-muted p-1 shadow">
                      <EyeOff className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {variant !== "sidebar" && (
                  <div className="text-center">
                    <p className="font-bold text-base md:text-lg text-foreground">{f.short_name}</p>
                    <p className="text-xs text-accent font-semibold">{f.certs}</p>
                  </div>
                )}
              </motion.button>

              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(f); }}
                  className="absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full bg-foreground text-background shadow-lg flex items-center justify-center opacity-0 group-hover/founder:opacity-100 transition-opacity hover:scale-110"
                  aria-label={`Editar ${f.short_name}`}
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {isAdmin && (
            <button
              onClick={() => setCreating(true)}
              className={`flex flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed border-sidebar-foreground/20 hover:border-accent hover:bg-accent/5 transition-colors ${
                variant === "sidebar" ? "w-12 h-12" : "w-32 h-32 md:w-40 md:h-40"
              }`}
              title="Adicionar sócio"
            >
              <Plus className={variant === "sidebar" ? "w-4 h-4 text-sidebar-foreground/40" : "w-8 h-8 text-muted-foreground"} />
              {variant !== "sidebar" && (
                <span className="text-xs text-muted-foreground font-medium">Adicionar</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Popup detalhes */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selected && (() => {
            const f = founders.find((x) => x.id === selected);
            if (!f) return null;
            return (
              <motion.div
                key="founder-overlay"
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  className="absolute inset-0 bg-primary/55 backdrop-blur-md"
                  onClick={() => setSelected(null)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />

                <motion.div
                  className="relative z-10 w-full sm:max-w-lg md:max-w-2xl max-h-[92svh] sm:max-h-[88vh] overflow-hidden bg-background rounded-t-[1.75rem] sm:rounded-3xl shadow-2xl border border-border/40"
                  initial={{ opacity: 0, scale: 0.98, y: 44 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 28 }}
                  transition={{ type: "spring", damping: 26, stiffness: 300 }}
                >
                  <button
                    onClick={() => setSelected(null)}
                    className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-background/90 hover:bg-muted flex items-center justify-center transition-colors shadow-soft"
                    aria-label="Fechar apresentação do consultor"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => { setEditing(f); setSelected(null); }}
                      className="absolute top-3 left-3 z-20 px-3 h-9 rounded-full bg-foreground/90 text-background text-xs font-semibold flex items-center gap-1.5 hover:bg-foreground transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                  )}

                  <div className="overflow-y-auto max-h-[92svh] sm:max-h-[88vh] sidebar-scroll">
                    <div className="relative bg-gradient-to-br from-primary via-primary/90 to-accent/30 px-5 sm:px-8 pt-7 sm:pt-8 pb-12 sm:pb-16">
                      <motion.div
                        className="absolute top-4 left-4 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-accent/10"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 6, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute bottom-8 right-8 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-foreground/5"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      />
                    </div>

                    <div className="flex justify-center -mt-12 sm:-mt-14 relative z-10">
                      <motion.div
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-background shadow-xl bg-muted"
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.15, damping: 20 }}
                      >
                        {f.image_url && (
                          <img src={f.image_url} alt={f.name} className="w-full h-full object-cover object-top" />
                        )}
                      </motion.div>
                    </div>

                    <div className="px-5 sm:px-8 pb-6 sm:pb-8 pt-4 space-y-4 sm:space-y-5">
                      <motion.div
                        className="text-center space-y-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight">{f.name}</h3>
                        {f.certs && <p className="text-sm text-accent font-semibold">{f.certs}</p>}
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                          {f.role}{f.short_bio && ` · ${f.short_bio}`}
                        </p>
                      </motion.div>

                      {f.bio && (
                        <motion.p
                          className="text-sm sm:text-[0.9375rem] text-muted-foreground leading-relaxed text-center max-w-md mx-auto"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          {f.bio}
                        </motion.p>
                      )}

                      {f.highlights.length > 0 && (
                        <motion.div
                          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.35 }}
                        >
                          {f.highlights.map((h, i) => {
                            const Icon = ICON_OPTIONS[h.icon as IconName] ?? Star;
                            return (
                              <motion.div
                                key={i}
                                className="flex sm:flex-col items-start sm:items-center gap-3 p-3 sm:p-4 rounded-2xl bg-muted/40 hover:bg-muted/70 transition-colors min-w-0"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.08 }}
                              >
                                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4 text-accent" />
                                </div>
                                <p className="text-sm text-foreground leading-snug sm:text-center break-words min-w-0">{h.text}</p>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}

                      {f.linkedin_url && (
                        <motion.div
                          className="pt-1 sm:pt-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          <a
                            href={f.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                          >
                            <Linkedin className="w-4 h-4" />
                            Ver perfil no LinkedIn
                          </a>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body,
      )}

      {/* Editor admin */}
      <AnimatePresence>
        {(editing || creating) && (
          <FounderEditor
            founder={editing}
            onClose={() => { setEditing(null); setCreating(false); }}
            onSaved={reload}
          />
        )}
      </AnimatePresence>
    </>
  );
};
