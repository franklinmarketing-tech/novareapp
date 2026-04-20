import { ArrowUpRight, Sparkles, BookOpen, LucideIcon } from "lucide-react";
import PageBanner from "@/components/PageBanner";
import PageTransition from "@/components/PageTransition";
import { SEO } from "@/components/SEO";

interface Project {
  name: string;
  description: string;
  url: string;
  icon: LucideIcon;
  tags: string[];
  accent: string;
  glow: string;
}

const projects: Project[] = [
  {
    name: "Novare Planejamento Financeiro",
    description: "Plataforma de consultoria financeira personalizada para planejadores e seus clientes.",
    url: "https://novareappcombr.lovable.app",
    icon: Sparkles,
    tags: ["Planejamento", "Investimentos", "Acompanhamento"],
    accent: "from-indigo-500 via-blue-600 to-sky-500",
    glow: "rgba(59,130,246,0.35)",
  },
  {
    name: "Calculadora de Investimentos",
    description: "Landing page educacional sobre rendimentos em Renda Fixa com simulador de aposentadoria.",
    url: "/ferramentas/calculadora-de-investimentos",
    icon: BookOpen,
    tags: ["Renda Fixa", "Simulador", "Conteúdo"],
    accent: "from-emerald-500 via-teal-600 to-cyan-500",
    glow: "rgba(16,185,129,0.35)",
  },
];

const AdminWorkspace = () => {
  return (
    <PageTransition>
      <SEO title="Workspace" description="Projetos e produtos desenvolvidos pela Novare." index={false} />
      <PageBanner
        title="Workspace"
        description="Projetos e produtos desenvolvidos pela Novare"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {projects.map((project) => {
          const isExternal = project.url.startsWith("http");
          const Icon = project.icon;
          return (
            <a
              key={project.name}
              href={project.url}
              target={isExternal ? "_blank" : "_self"}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-border"
              style={{
                boxShadow: "0 1px 2px hsl(var(--foreground) / 0.04), 0 8px 24px -12px hsl(var(--foreground) / 0.08)",
              }}
            >
              {/* Animated glow */}
              <div
                className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${project.glow} 0%, transparent 70%)` }}
              />

              {/* Gradient header */}
              <div className={`relative bg-gradient-to-br ${project.accent} p-6 overflow-hidden`}>
                {/* Mesh pattern overlay */}
                <div
                  className="absolute inset-0 opacity-30 mix-blend-overlay"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
                  }}
                />
                {/* Grain noise */}
                <div
                  className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  }}
                />

                <div className="relative flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <Icon className="h-6 w-6 text-white drop-shadow" strokeWidth={2} />
                  </div>
                  <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 group-hover:bg-white/25 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300">
                    <ArrowUpRight className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                    {project.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {project.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[0.6875rem] font-medium px-2.5 py-1 rounded-full bg-muted/70 border border-border/40 text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom accent line */}
              <div className={`h-0.5 bg-gradient-to-r ${project.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            </a>
          );
        })}
      </div>
    </PageTransition>
  );
};

export default AdminWorkspace;
