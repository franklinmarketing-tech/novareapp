import { useEffect, useState } from "react";
import { ArrowUpRight, LucideIcon, Users, Rocket, Tag, Copy, Check, Link2, ExternalLink } from "lucide-react";
import PageBanner from "@/components/PageBanner";
import PageTransition from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import cardSimulador from "@/assets/card-simulador.webp";
import cardAposentadoria from "@/assets/card-aposentadoria.webp";
import cardDividas from "@/assets/card-dividas.webp";
import cardComparador from "@/assets/card-comparador.webp";
import cardCalculadora from "@/assets/card-calculadora.webp";
import cardObjetivos from "@/assets/card-objetivos.webp";
import cardLeadsSimulador from "@/assets/card-leads-simulador.webp";
import cardLeadsObjetivos from "@/assets/card-leads-objetivos.webp";
import cardNovare from "@/assets/card-novare.webp";

const APP_VERSION = "1.4.0";
const SITE = "https://novareapp.com.br";

interface AppCard {
  name: string;
  description: string;
  href: string;          // destino ao abrir (rota interna ou URL externa)
  shareUrl?: string;     // URL pública para copiar/compartilhar (só ferramentas públicas)
  icon: string;          // imagem de capa (full-bleed)
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
        icon: cardSimulador,
        tags: ["Renda Fixa", "Simulador", "Leads"],
        accent: "from-violet-500 via-purple-600 to-fuchsia-500",
        glow: "rgba(139,92,246,0.35)",
      },
      {
        name: "Calculadora de Aposentadoria",
        description: "Descubra quanto juntar para viver de renda e em que idade alcança a independência financeira (regra dos 4%).",
        href: "/ferramentas/calculadora-de-aposentadoria",
        shareUrl: `${SITE}/ferramentas/calculadora-de-aposentadoria`,
        icon: cardAposentadoria,
        tags: ["Aposentadoria", "FIRE", "Captação"],
        accent: "from-teal-500 via-emerald-600 to-green-500",
        glow: "rgba(16,185,129,0.35)",
      },
      {
        name: "Saia do Vermelho",
        description: "Calculadora de quitação de dívidas (Avalanche × Bola de Neve): tempo para quitar e economia de juros.",
        href: "/ferramentas/saia-do-vermelho",
        shareUrl: `${SITE}/ferramentas/saia-do-vermelho`,
        icon: cardDividas,
        tags: ["Dívidas", "Captação"],
        accent: "from-rose-500 via-red-600 to-orange-500",
        glow: "rgba(244,63,94,0.35)",
      },
      {
        name: "Comparador de Investimentos",
        description: "Compara CDB, LCI, Tesouro, Debêntures e FIIs pela rentabilidade líquida (com IR e isenções). Mostra o melhor do bolso.",
        href: "/ferramentas/comparador-de-investimentos",
        shareUrl: `${SITE}/ferramentas/comparador-de-investimentos`,
        icon: cardComparador,
        tags: ["Renda Fixa", "Comparador", "Captação"],
        accent: "from-blue-500 via-indigo-600 to-violet-500",
        glow: "rgba(99,102,241,0.35)",
      },
      {
        name: "Calculadora de Investimentos",
        description: "Landing educacional sobre rendimentos em Renda Fixa com simulador de aposentadoria.",
        href: "/ferramentas/calculadora-de-investimentos",
        shareUrl: `${SITE}/ferramentas/calculadora-de-investimentos`,
        icon: cardCalculadora,
        tags: ["Renda Fixa", "Conteúdo"],
        accent: "from-emerald-500 via-teal-600 to-cyan-500",
        glow: "rgba(16,185,129,0.35)",
      },
      {
        name: "Objetivos de Vida",
        description: "Formulário público em 5 etapas para captar leads e mapear objetivos, finanças e perfil de investidor.",
        href: "/objetivos-de-vida",
        shareUrl: `${SITE}/objetivos-de-vida`,
        icon: cardObjetivos,
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
        icon: cardLeadsSimulador,
        tags: ["Leads", "Renda Fixa"],
        accent: "from-indigo-500 via-blue-600 to-sky-500",
        glow: "rgba(99,102,241,0.35)",
      },
      {
        name: "Leads · Objetivos de Vida",
        description: "Leads do formulário de Objetivos de Vida, com metas, finanças e perfil — e acompanhamento do progresso.",
        href: "/admin/projetos/objetivos-de-vida",
        icon: cardLeadsObjetivos,
        tags: ["Leads", "Metas"],
        accent: "from-amber-500 via-orange-600 to-rose-500",
        glow: "rgba(245,158,11,0.35)",
      },
      {
        name: "Leads · Aposentadoria",
        description: "Leads da Calculadora de Aposentadoria, com idade, patrimônio, aporte e o número da independência financeira de cada um.",
        href: "/admin/projetos/aposentadoria",
        icon: cardAposentadoria,
        tags: ["Leads", "Aposentadoria"],
        accent: "from-teal-500 via-emerald-600 to-green-500",
        glow: "rgba(16,185,129,0.35)",
      },
      {
        name: "Leads · Saia do Vermelho",
        description: "Leads da calculadora de dívidas, com dívida total, aporte extra e o tempo de quitação de cada um.",
        href: "/admin/projetos/dividas",
        icon: cardDividas,
        tags: ["Leads", "Dívidas"],
        accent: "from-rose-500 via-red-600 to-orange-500",
        glow: "rgba(244,63,94,0.35)",
      },
      {
        name: "Leads · Comparador",
        description: "Leads do Comparador de Investimentos, com valor, prazo e a melhor opção apontada para cada um.",
        href: "/admin/projetos/comparador",
        icon: cardComparador,
        tags: ["Leads", "Comparador"],
        accent: "from-blue-500 via-indigo-600 to-violet-500",
        glow: "rgba(99,102,241,0.35)",
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
        icon: cardNovare,
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
  return (
    <div
      className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:border-border hover:shadow-elevated flex flex-col"
      style={{ boxShadow: "0 1px 2px hsl(var(--foreground) / 0.04), 0 8px 24px -12px hsl(var(--foreground) / 0.08)" }}
    >
      {/* Glow */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${item.glow} 0%, transparent 70%)` }}
      />

      {/* Header — imagem de capa full-bleed, clicável */}
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-40 overflow-hidden"
      >
        <img
          src={item.icon}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700"
          loading="lazy"
        />
        {/* leve gradiente no topo para contraste do botão */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent" />
        <div className="absolute top-3 right-3 p-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 group-hover:bg-white/40 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300">
          <ArrowUpRight className="h-4 w-4 text-white drop-shadow" strokeWidth={2.5} />
        </div>
      </a>
      {/* linha de acento da cor do card */}
      <div className={`h-1 bg-gradient-to-r ${item.accent}`} />

      {/* Conteúdo */}
      <div className="p-5 space-y-3 flex-1 flex flex-col">
        <a href={item.href} target="_blank" rel="noopener noreferrer" className="block">
          <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors text-center">
            {item.name}
          </h3>
        </a>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1 text-center">{item.description}</p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {item.tags.map((tag) => (
            <span key={tag} className="text-[0.6875rem] font-medium px-2.5 py-1 rounded-full bg-muted/70 border border-border/40 text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        {/* Link público (só ferramentas públicas) */}
        {item.shareUrl && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center pt-1">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{prettyUrl(item.shareUrl)}</span>
          </div>
        )}

        {/* Ações: Acessar + Copiar */}
        <div className="flex gap-2 pt-1">
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {item.shareUrl ? "Acessar" : "Abrir painel"}
            {item.shareUrl ? <ArrowUpRight className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          </a>
          {item.shareUrl && (
            <button
              onClick={() => onCopy(item.shareUrl!)}
              title="Copiar link para compartilhar"
              className={cn(
                "shrink-0 inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl border text-sm font-semibold transition-colors",
                copied
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : "bg-muted/40 text-foreground/70 border-border/50 hover:bg-muted",
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
            </button>
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
