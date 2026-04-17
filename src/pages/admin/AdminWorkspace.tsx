import { ExternalLink, Gem, BookOpen } from "lucide-react";
import PageBanner from "@/components/PageBanner";
import PageTransition from "@/components/PageTransition";

const projects = [
  {
    name: "Novare SaaS",
    description: "Plataforma de consultoria financeira personalizada para planejadores e seus clientes.",
    url: "https://novareappcombr.lovable.app",
    icon: Gem,
    tags: ["Planejamento", "Investimentos", "Acompanhamento"],
  },
  {
    name: "Calculadora de Investimentos",
    description: "Landing page educacional sobre rendimentos em Renda Fixa com simulador de aposentadoria.",
    url: "/ferramentas/calculadora-de-investimentos",
    icon: BookOpen,
    tags: ["Renda Fixa", "Simulador", "Conteúdo"],
  },
];

const AdminWorkspace = () => {
  return (
    <PageTransition>
      <PageBanner
        title="Workspace"
        description="Projetos e produtos desenvolvidos pela Novare"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {projects.map((project) => {
          const isExternal = project.url.startsWith("http");
          return (
            <a
              key={project.name}
              href={project.url}
              target={isExternal ? "_blank" : "_self"}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="group relative bg-card border border-border/40 rounded-2xl overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5"
            >
              {/* Gradient header */}
              <div className="bg-gradient-to-br from-primary to-primary/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
                    <project.icon className="h-6 w-6 text-white" />
                  </div>
                  <ExternalLink className="h-6 w-6 text-white/30 group-hover:text-white/70 transition-colors" />
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[0.6875rem] font-medium px-2.5 py-1 rounded-lg bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </PageTransition>
  );
};

export default AdminWorkspace;
