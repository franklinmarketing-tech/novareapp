import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  ClipboardList,
  Stethoscope,
  FileText,
  Target,
  TrendingUp,
  LineChart,
  FileBarChart,
  Settings,
  Shield,
  HelpCircle,
  Download,
  Keyboard,
  Lightbulb,
  Lock,
} from "lucide-react";

type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  items: { q: string; a: React.ReactNode; tags?: string[] }[];
};

const sections: Section[] = [
  {
    id: "primeiros-passos",
    title: "Primeiros passos",
    icon: Lightbulb,
    description: "Visão geral, login e estrutura da plataforma.",
    items: [
      {
        q: "O que é a plataforma Novare?",
        a: "É o sistema de planejamento financeiro da Novare para consultores acompanharem clientes — do onboarding ao plano de ação, com diagnóstico, recomendações e monitoramento em um só lugar.",
        tags: ["geral"],
      },
      {
        q: "Como faço login?",
        a: (
          <>
            Acesse <Link className="text-primary underline" to="/login">/login</Link> com seu e-mail e senha. Caso esqueça, use{" "}
            <span className="font-medium">"Esqueci minha senha"</span> para receber um link de redefinição.
          </>
        ),
        tags: ["login", "senha"],
      },
      {
        q: "Quais perfis existem?",
        a: "Cliente (vê apenas seus dados), Admin/Consultor (gerencia carteira de clientes) e Super Admin (administra a plataforma inteira).",
      },
      {
        q: "Como navego entre as áreas?",
        a: "A barra lateral à esquerda agrupa Dashboard, Clientes, Novo Cliente, Financeiro e Configurações. Ao abrir um cliente, abas específicas aparecem no topo.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    description: "KPIs, gráficos e ações rápidas.",
    items: [
      {
        q: "O que vejo no Dashboard?",
        a: "Total de clientes ativos, novos no mês, status do pipeline (onboarding, diagnóstico, acompanhamento), métricas avançadas e atalhos para ações comuns.",
      },
      {
        q: "Como interpretar os gráficos?",
        a: "Os gráficos mostram evolução de clientes por status e período. Passe o mouse sobre as barras/linhas para ver valores exatos.",
      },
      {
        q: "Posso filtrar por período?",
        a: "Sim, use os filtros no topo dos cards de métricas avançadas para alterar o intervalo de análise.",
      },
    ],
  },
  {
    id: "clientes",
    title: "Gestão de clientes",
    icon: Users,
    description: "Listar, filtrar e abrir fichas de clientes.",
    items: [
      {
        q: "Como encontro um cliente?",
        a: (
          <>
            Vá em <Link className="text-primary underline" to="/admin/clientes">Clientes</Link> e use a busca por nome, e-mail ou código. Você também pode filtrar por status.
          </>
        ),
      },
      {
        q: "O que significa cada status?",
        a: (
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Onboarding pendente</b>: cliente ainda preenchendo dados iniciais.</li>
            <li><b>Em diagnóstico</b>: dados completos, em análise pelo consultor.</li>
            <li><b>Em acompanhamento</b>: plano ativo, monitoramento periódico.</li>
          </ul>
        ),
      },
      {
        q: "Como abro a ficha completa?",
        a: "Clique no nome do cliente na lista. Você verá abas para Onboarding, Diagnóstico, Parecer, Plano de Ação, Objetivos, Investimentos, Acompanhamento e Relatório.",
      },
      {
        q: "Posso exportar a lista?",
        a: "Sim, use o botão de exportação na lista de clientes para baixar em CSV.",
      },
    ],
  },
  {
    id: "novo-cliente",
    title: "Novo cliente",
    icon: UserPlus,
    description: "Criar e convidar clientes.",
    items: [
      {
        q: "Como cadastrar um novo cliente?",
        a: (
          <>
            Em <Link className="text-primary underline" to="/admin/novo-cliente">Novo Cliente</Link>, preencha nome, e-mail e dados básicos. O sistema cria a conta e envia o convite por e-mail automaticamente.
          </>
        ),
      },
      {
        q: "O cliente recebe acesso imediato?",
        a: "Sim. Ao criar, o cliente recebe um e-mail com link para definir a senha e iniciar o onboarding.",
      },
      {
        q: "Posso reenviar o convite?",
        a: "Sim, na lista de clientes use a ação 'Reenviar convite' no menu de cada linha.",
      },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding do cliente",
    icon: ClipboardList,
    description: "Preenchimento dos dados financeiros e comportamentais.",
    items: [
      {
        q: "Quais etapas o cliente preenche?",
        a: "Identificação, Renda, Despesas, Dívidas, Patrimônio, Seguros, Objetivos e Comportamental. O progresso é salvo automaticamente.",
      },
      {
        q: "Posso preencher pelo cliente?",
        a: "Sim. Acesse a ficha do cliente → aba Onboarding e edite diretamente. Tudo é gravado em tempo real.",
      },
      {
        q: "Como sei se o cliente terminou?",
        a: "O status muda para 'Em diagnóstico' quando todas as etapas obrigatórias estão completas. Você também recebe notificação no sino do topo.",
      },
    ],
  },
  {
    id: "diagnostico",
    title: "Diagnóstico",
    icon: Stethoscope,
    description: "Análise financeira automatizada.",
    items: [
      {
        q: "O que o diagnóstico mostra?",
        a: "Renda total, despesas totais, capacidade de poupança, índice de endividamento, patrimônio líquido e classificação de risco (A a E).",
      },
      {
        q: "Como é calculada a classificação de risco?",
        a: "Combina endividamento, capacidade de poupança e reserva de emergência. A = excelente, E = situação crítica.",
      },
      {
        q: "Posso adicionar observações?",
        a: "Sim, há um campo de notas livres no diagnóstico para registrar contexto adicional.",
      },
    ],
  },
  {
    id: "parecer",
    title: "Parecer",
    icon: FileText,
    description: "Notas do consultor e recomendações com IA.",
    items: [
      {
        q: "Para que serve o parecer?",
        a: "É o espaço onde você registra a análise técnica do caso, com sidebar mostrando os números do cliente em tempo real.",
      },
      {
        q: "Como uso a análise por IA?",
        a: "Clique em 'Analisar com IA' para receber sugestões de pontos fortes, riscos e próximos passos baseados nos dados do cliente.",
      },
      {
        q: "As recomendações são automáticas?",
        a: "O sistema sugere produtos e ações com base no perfil de risco e objetivos. Você sempre revisa antes de incluir no plano final.",
      },
    ],
  },
  {
    id: "plano-acao",
    title: "Plano de ação",
    icon: Target,
    description: "Tarefas estruturadas por área.",
    items: [
      {
        q: "Como crio uma ação?",
        a: "Na aba Plano de Ação do cliente, clique em '+ Nova ação' e defina área (renda, despesas, dívidas, investimentos, proteção, impostos), descrição, prazo e responsável.",
      },
      {
        q: "Posso criar subtarefas?",
        a: "Sim, cada ação aceita itens filhos para detalhar passos.",
      },
      {
        q: "Como vinculo uma ação a um objetivo?",
        a: "Ao criar/editar a ação, selecione o objetivo no campo 'Vincular a objetivo'.",
      },
      {
        q: "O cliente vê o plano?",
        a: "Sim, o cliente acessa o plano em sua área e marca itens como concluídos.",
      },
    ],
  },
  {
    id: "objetivos",
    title: "Objetivos",
    icon: Target,
    description: "Metas financeiras do cliente.",
    items: [
      {
        q: "Como cadastro um objetivo?",
        a: "Na aba Objetivos, defina descrição, valor-alvo, prazo e prioridade. Ações do plano podem ser vinculadas a cada objetivo.",
      },
      {
        q: "Posso priorizar?",
        a: "Sim, defina alta/média/baixa prioridade para ordenar a execução.",
      },
    ],
  },
  {
    id: "investimentos",
    title: "Investimentos",
    icon: TrendingUp,
    description: "Carteira recomendada por perfil.",
    items: [
      {
        q: "Como funcionam as recomendações?",
        a: "O sistema sugere produtos (renda fixa, variável, internacionais) com alocação em % baseada no perfil. Você ajusta valores e prioridades.",
      },
      {
        q: "O que cada coluna mostra?",
        a: "Produto, tipo, alocação %, retorno esperado, liquidez, investimento mínimo, racional e status (sugerido/aceito/recusado).",
      },
      {
        q: "Posso usar o simulador de rentabilidade?",
        a: (
          <>
            Sim, abra a <Link className="text-primary underline" to="/ferramentas/calculadora-de-investimentos">calculadora de investimentos</Link> para projetar valores futuros.
          </>
        ),
      },
    ],
  },
  {
    id: "acompanhamento",
    title: "Acompanhamento",
    icon: LineChart,
    description: "Snapshots mensais e evolução.",
    items: [
      {
        q: "Como registrar acompanhamento?",
        a: "Na aba Acompanhamento, crie um snapshot mensal com renda, despesas, ativos, dívidas, taxa de poupança e meses de reserva.",
      },
      {
        q: "Como vejo a evolução?",
        a: "Os gráficos comparam snapshots ao longo dos meses, mostrando tendência de patrimônio e endividamento.",
      },
      {
        q: "O que é a confirmação de dados?",
        a: "É o ato do cliente confirmar mensalmente que os dados estão atualizados — registrado em data_confirmations.",
      },
    ],
  },
  {
    id: "relatorio",
    title: "Relatório",
    icon: FileBarChart,
    description: "PDF executivo do cliente.",
    items: [
      {
        q: "Como gero o relatório?",
        a: "Na aba Relatório, clique em 'Gerar PDF'. O documento inclui diagnóstico, parecer, plano de ação, objetivos e recomendações.",
      },
      {
        q: "Posso enviar por e-mail?",
        a: "Sim, há um botão para enviar diretamente ao e-mail cadastrado do cliente.",
      },
    ],
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: Wallet,
    description: "Receita por cliente e indicadores comerciais.",
    items: [
      {
        q: "O que aparece em Financeiro?",
        a: "Receita estimada, distribuição por status, evolução mensal e ranking de clientes — visão consolidada da carteira.",
      },
    ],
  },
  {
    id: "configuracoes",
    title: "Configurações",
    icon: Settings,
    description: "Perfil, equipe, marca, notificações, cobrança e segurança.",
    items: [
      {
        q: "Onde altero meu perfil?",
        a: (
          <>
            Em <Link className="text-primary underline" to="/admin/configuracoes?tab=perfil">Configurações → Perfil</Link>, atualize nome, e-mail e foto.
          </>
        ),
      },
      {
        q: "Como personalizar a marca (cores e logo)?",
        a: (
          <>
            Em <Link className="text-primary underline" to="/admin/configuracoes?tab=marca">Configurações → Marca</Link>, defina cor primária, logo e nome da empresa que aparece nos relatórios.
          </>
        ),
      },
      {
        q: "Como configurar notificações?",
        a: (
          <>
            Em <Link className="text-primary underline" to="/admin/configuracoes?tab=notificacoes">Configurações → Notificações</Link>, escolha quais eventos disparam alertas no sino e por e-mail.
          </>
        ),
      },
      {
        q: "Como troco minha senha?",
        a: (
          <>
            Em <Link className="text-primary underline" to="/admin/configuracoes?tab=seguranca">Configurações → Segurança</Link>, defina nova senha. Use senha forte com 12+ caracteres.
          </>
        ),
      },
    ],
  },
  {
    id: "seguranca",
    title: "Segurança e privacidade",
    icon: Shield,
    description: "Boas práticas e proteção dos dados.",
    items: [
      {
        q: "Os dados dos clientes são protegidos?",
        a: "Sim. Todos os dados ficam protegidos por Row-Level Security (RLS) — você só enxerga os clientes da sua carteira.",
      },
      {
        q: "Existe registro de auditoria?",
        a: "Sim. Ações sensíveis (criar/editar/excluir) ficam registradas em audit_log para rastreabilidade.",
      },
      {
        q: "O que faço se suspeitar de acesso indevido?",
        a: "Troque sua senha imediatamente em Configurações → Segurança e avise o Super Admin para revisar a auditoria.",
      },
    ],
  },
  {
    id: "atalhos",
    title: "Atalhos e produtividade",
    icon: Keyboard,
    description: "Comandos rápidos para acelerar o uso.",
    items: [
      {
        q: "Como abrir a busca rápida (Command Palette)?",
        a: (
          <>
            Pressione <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">K</kbd> (ou{" "}
            <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">K</kbd>) para abrir o navegador de comandos.
          </>
        ),
      },
      {
        q: "Como vejo notificações?",
        a: "Clique no ícone de sino no topo. Notificações não lidas aparecem com badge vermelho.",
      },
      {
        q: "Modo escuro?",
        a: "Use o toggle de tema na barra lateral inferior para alternar entre claro e escuro.",
      },
    ],
  },
];

const sectionIconMap: Record<string, React.ComponentType<{ className?: string }>> = {};
sections.forEach((s) => {
  sectionIconMap[s.id] = s.icon;
});

export default function AdminAjuda() {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("primeiros-passos");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        items: s.items.filter((i) => {
          const text =
            i.q.toLowerCase() +
            " " +
            (typeof i.a === "string" ? i.a.toLowerCase() : "") +
            " " +
            (i.tags?.join(" ") || "");
          return text.includes(q);
        }),
      }))
      .filter((s) => s.items.length > 0 || s.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-10 max-w-6xl mx-auto">
      <SEO
        title="Ajuda e Manual | Admin"
        description="FAQ, manual de uso e guia completo das funcionalidades para consultores."
      />

      {/* Hero */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <HelpCircle className="h-3.5 w-3.5" />
            Central de Ajuda
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
            Como podemos ajudar?
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Manual de uso e perguntas frequentes para consultores. Encontre rapidamente como usar cada
            função do sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href="/manual-consultor.pdf" download>
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por palavra-chave (ex: senha, recomendação, plano de ação...)"
          className="pl-10 h-12 text-base"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* Sidebar nav */}
        <aside className="hidden lg:block sticky top-20 self-start">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3 px-2">
            Tópicos
          </p>
          <nav className="space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === s.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </a>
              );
            })}
          </nav>

          <Card className="p-4 mt-6 bg-muted/30 border-dashed">
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Dica de segurança</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use senha forte e nunca compartilhe seu acesso. Cada consultor deve ter sua própria conta.
                </p>
              </div>
            </div>
          </Card>
        </aside>

        {/* Content */}
        <div className="space-y-10">
          {filtered.length === 0 && (
            <Card className="p-10 text-center">
              <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">Nenhum resultado para "{query}"</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente outra palavra-chave ou navegue pelos tópicos ao lado.
              </p>
            </Card>
          )}

          {filtered.map((s) => {
            const Icon = s.icon;
            return (
              <section key={s.id} id={s.id} className="scroll-mt-20">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    {s.items.length} {s.items.length === 1 ? "item" : "itens"}
                  </Badge>
                </div>

                <Card className="p-2 sm:p-4">
                  <Accordion type="multiple" className="w-full">
                    {s.items.map((item, idx) => (
                      <AccordionItem key={idx} value={`${s.id}-${idx}`} className="border-border/60 last:border-0">
                        <AccordionTrigger className="text-left text-[0.9375rem] hover:no-underline py-4 px-2">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed px-2">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Card>
              </section>
            );
          })}

        </div>
      </div>
    </div>
  );
}
