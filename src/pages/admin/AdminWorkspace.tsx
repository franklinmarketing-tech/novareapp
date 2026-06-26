import { useEffect, useState } from "react";
import {
  ArrowUpRight, Sparkles, BookOpen, LucideIcon, Users, Rocket, Tag, Target,
  Calculator, Copy, Check, Link2, ExternalLink,
} from "lucide-react";
import PageBanner from "@/components/PageBanner";
import PageTransition from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const APP_VERSION = "1.4.0";
const SITE = "https://novareapp.com.br";

interface AppCard {
  name: string;
  description: string;
  href: string;          // destino ao abrir (rota interna ou URL externa)
  shareUrl?: string;     // URL pública para copiar/compartilhar (só ferramentas públicas)
  icon: LucideIcon;
  tags: string[];
  accent: string;
  glow: string;
}

interface Group {
  label: string;
  hint: string;
  items: AppCard[];
}

const groups: Group[] = [
  {
    label: "Ferramentas Públicas",
    hint: "Links para compartilhar com leads e clientes",
    items: [
      {
        name: "Simulador de Renda Fixa",
        description: "Compara CDB, Tesouro, LCI/LCA e Poupança com IR e CDI ao vivo. Captura o e-mail antes de liberar a comparação.",
        href: "/ferramentas/simulador-de-renda-fixa",
        shareUrl: `${SITE}/ferramentas/simulador-de-renda-fixa`,
        icon: Calculator,
        tags: ["Renda Fixa", "Simulador", "Leads"],
        accent: "from-violet-500 via-purple-600 to-fuchsia-500",
        glow: "rgba(139,92,246,0.35)",
      },
      {
        name: "Calculadora de Investimentos",
        description: "Landing educacional sobre rendimentos em Renda Fixa com simulador de aposentadoria.",
        href: "/ferramentas/calculadora-de-investimentos",
        shareUrl: `${SITE}/ferramentas/calculadora-de-investimentos`,
        icon: BookOpen,
        tags: ["Renda Fixa", "Conteúdo"],
        accent: "from-emerald-500 via-teal-600 to-cyan-500",
        glow: "rgba(16,185,129,0.35)",
      },
      {
        name: "Objetivos de Vida",
        description: "Formulário público em 5 etapas para captar leads e mapear objetivos, finanças e perfil de investidor.",
        href: "/objetivos-de-vida",
        shareUrl: `${SITE}/objetivos-de-vida`,
        icon: Target,
        tags: ["Captação", "Onboarding"],
        accent: "from-amber-500 via-orange-600 to-rose-500",
        glow: "rgba(245,158,11,0.35)",
      },
    ],
  },
  {
    label: "Captação & Leads",
    hint: "Painéis internos para gerenciar os leads capturados",
    items: [
      {
        name: "Leads · Simulador",
        description: "E-mails capturados pelo Simulador de Renda Fixa, com os parâmetros de cada simulação e o status do contato.",
        href: "/admin/projetos/simulador-renda-fixa",
        icon: Calculator,
        tags: ["Leads", "Renda Fixa"],
        accent: "from-indigo-500 via-blue-600 to-sky-500",
        glow: "rgba(99,102,241,0.35)",
      },
      {
        name: "Leads · Objetivos de Vida",
        description: "Leads do formulário de Objetivos de Vida, com metas, finanças e perfil — e acompanhamento do progresso.",
        href: "/admin/projetos/objetivos-de-vida",
        icon: Target,
        tags: ["Leads", "Metas"],
        accent: "from-amber-500 via-orange-600 to-rose-500",
        glow: "rgba(245,158,11,0.35)",
      },
    ],
  },
  {
    label: "Plataforma",
    hint: "Acesso ao site e ao painel principal",
    items: [
      {
        name: "Novare Consultoria Financeira",
        description: "Plataforma de consultoria financeira personalizada para planejadores e seus clientes.",
        href: SITE,
        shareUrl: SITE,
        icon: Sparkles,
        tags: ["Plataforma", "SaaS"],
        accent: "from-indigo-500 via-blue-600 to-sky-500",
        glow: "rgba(59,130,246,0.35)",
      },
    ],
  },
];

const totalApps = groups.reduce((s, g) => s + g.items.length, 0);
const prettyUrl = (url: string) => url.replace(/^https?:\/\//, "");

interface Metric {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
}

// ── Card de acesso ────────────────────────────────────────────────────────────
const AccessCard = ({ item, copied, onCopy }: { item: AppCard; copied: boolean; onCopy: (url: string) => void }) => {
  const Icon = item.icon;
  return (
    <div
      className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-border flex flex-col"
      style={{ boxShadow: "0 1px 2px hsl(var(--foreground) / 0.04), 0 8px 24px -12px hsl(var(--foreground) / 0.08)" }}
    >
      {/* Glow */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${item.glow} 0%, transparent 70%)` }}
      />

      {/* Header gradiente — clicável */}
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative block bg-gradient-to-br ${item.accent} p-6 overflow-hidden`}
      >
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{ backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)` }}
        />
        <div className="relative flex items-center justify-between">
          <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
            <Icon className="h-6 w-6 text-white drop-shadow" strokeWidth={2} />
          </div>
          <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 group-hover:bg-white/25 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300">
            <ArrowUpRight className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
        </div>
      </a>

      {/* Conteúdo */}
      <div className="p-5 space-y-3 flex-1 flex flex-col">
        <a href={item.href} target="_blank" rel="noopener noreferrer" className="block">
          <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            {item.name}
          </h3>
        </a>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">{item.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="text-[0.6875rem] font-medium px-2.5 py-1 rounded-full bg-muted/70 border border-border/40 text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        {/* Rodapé do card: link público + copiar (ou apenas Abrir) */}
        <div className="pt-3 border-t border-border/40 flex items-center gap-2">
          {item.shareUrl ? (
            <>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate flex-1 min-w-0">
                <Link2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{prettyUrl(item.shareUrl)}</span>
              </span>
              <button
                onClick={() => onCopy(item.shareUrl!)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors",
                  copied
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : "bg-muted/50 text-foreground/70 border-border/50 hover:bg-muted",
                )}
              >
                {copied ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
              </button>
            </>
          ) : (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir painel
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminWorkspace = () => {
  const [activeClients, setActiveClients] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { count } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .in("status", ["em_diagnostico", "em_acompanhamento"]);
      if (mounted) setActiveClients(count ?? 0);
    })();
    return () => { mounted = false; };
  }, []);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl((c) => (c === url ? null : c)), 1800);
    } catch {
      /* clipboard indisponível */
    }
  };

  const metrics: Metric[] = [
    {
      label: "Clientes ativos",
      value: activeClients === null ? "—" : String(activeClients),
      hint: "Em diagnóstico ou acompanhamento",
      icon: Users,
      accent: "from-blue-500/20 to-sky-500/5",
    },
    {
      label: "Apps & ferramentas",
      value: String(totalApps),
      hint: "Aplicativos disponíveis",
      icon: Rocket,
      accent: "from-emerald-500/20 to-teal-500/5",
    },
    {
      label: "Versão atual",
      value: `v${APP_VERSION}`,
      hint: "Última release do SaaS",
      icon: Tag,
      accent: "from-violet-500/20 to-fuchsia-500/5",
    },
  ];

  return (
    <PageTransition>
      <SEO title="Projetos" description="Aplicativos, ferramentas e painéis da Novare." index={false} />
      <PageBanner
        title="Projetos"
        description="Aplicativos, ferramentas e painéis da Novare — acesse e compartilhe"
      />

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className={`relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${m.accent} bg-card p-5 transition-all hover:border-border hover:-translate-y-0.5`}
              style={{ boxShadow: "0 1px 2px hsl(var(--foreground) / 0.04), 0 8px 24px -12px hsl(var(--foreground) / 0.08)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
                  <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.hint}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40">
                  <Icon className="h-5 w-5 text-foreground/70" strokeWidth={2} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grupos de apps */}
      <div className="mt-8 space-y-8">
        {groups.map((group) => (
          <section key={group.label}>
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-base font-bold tracking-tight text-foreground">{group.label}</h2>
              <span className="text-xs text-muted-foreground">{group.hint}</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {group.items.map((item) => (
                <AccessCard
                  key={item.name}
                  item={item}
                  copied={!!item.shareUrl && copiedUrl === item.shareUrl}
                  onCopy={copy}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageTransition>
  );
};

export default AdminWorkspace;
