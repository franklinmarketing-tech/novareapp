# Varredura Completa do Sistema — Melhorias Propostas

Análise feita em dashboards (Admin, Cliente, Super Admin), tipografia, efeitos visuais, responsividade e funcionalidades. Abaixo está um plano organizado em **5 frentes**, da maior para a menor prioridade.

---

## 1. Dashboards — Consistência e Profundidade

### 1.1 Super Admin Dashboard (mais defasado)

- Cards atuais são planos (`Card` simples) enquanto Admin/Cliente usam `Card3D` e gradientes — falta hierarquia visual.
- Nenhum gráfico, só KPIs estáticos.
- **Mudanças:** adicionar mini sparklines (clientes novos por dia, e-mails enviados 7d), seção "Atividade recente" (últimos 10 eventos do `audit_log`), banner crítico quando `failed_emails > 0` ou `maintenance_mode = ON`, padronizar com glow-cards (`card-glow-primary/accent/warning`) já existentes no CSS.

### 1.2 Admin Dashboard

- Bom, mas o seletor de período tem 6 botões + navegação mês a mês = poluído no mobile.
- **Mudanças:** colapsar atalhos em `Select` no mobile (≤sm), manter pills no desktop. Adicionar card "Próximas reuniões / lembretes" com clientes não confirmados há +30d (já temos `data_confirmations`). Animar contadores numéricos (count-up) nos KPIs principais.

### 1.3 Cliente Dashboard

- Insight card e CTA de onboarding bons, mas falta um "Resumo do mês" comparativo (este mês vs anterior em renda, despesas, patrimônio).
- **Mudanças:** card "Evolução" com mini-chart de patrimônio dos últimos 6 meses (de `monitoring_snapshots`), badge de "streak" quando confirma dados todo mês.

---

## 2. Tipografia — Padronização

Hoje há mistura caótica de `text-[0.6875rem]`, `text-[0.8125rem]`, `text-[0.9375rem]` espalhados em vários componentes.

- **Criar utilitários semânticos no `index.css`:**
  - `.text-label-xs` (0.6875rem, uppercase, tracking 0.14em) — usado em labels de KPI
  - `.text-meta-sm` (0.75rem, muted)
  - `.text-body-md` (0.875rem) — texto padrão
  - `.text-display-lg` (clamp 2rem–2.5rem, font-display) — números grandes
- Substituir `text-[0.xxxrem]` arbitrários nas páginas principais (MyData, Dashboard, ClientDashboard) pelos novos utilitários.
- Padronizar `font-display` (Playfair) apenas para números "hero" (patrimônio, KPIs principais), nunca em texto corrido.
- Heading hierarchy: garantir h1 sempre na PageBanner, h2 para seções, h3 para cards.

---

## 3. Efeitos & Polimento Visual

### 3.1 Microinterações

- **Skeleton loaders consistentes:** hoje SuperAdmin usa `animate-pulse bg-muted/30` simples. Criar `<SkeletonCard>` reutilizável com shimmer (já temos animação de shimmer no Login).
- **Hover states unificados:** cards levantam `hover:-translate-y-0.5` em algumas páginas, em outras só sombra. Padronizar via classe `.card-interactive`.
- **Transições de página:** `PageTransition` existe mas alguns dashboards animam manualmente com framer-motion duplicando trabalho. Auditar e usar só `PageTransition`.

### 3.2 Efeitos novos

- **Glass effect** no breadcrumb header (já tem `backdrop-blur-md`, melhorar borda gradiente).
- **Glow accent** em CTAs primários (variant `premium` no Button já existe — usar mais).
- **Numeric count-up** em todos os KPIs grandes (criar hook `useCountUp` reutilizável extraído do Login).
- **Toast positioning:** atualmente bottom-right; mudar para top-center no mobile (melhor UX).

### 3.3 Empty states

- `EmptyState` existe mas é pouco usado. Aplicar em: AdminDashboard sem clientes, ClientDashboard sem objetivos, ClientList sem resultados de filtro.

---

## 4. Responsividade — Refinamentos Mobile

Cobrimos muito nas iterações anteriores. Restam pontos específicos:

- **AdminLayout breadcrumb:** scroll horizontal funciona, mas falta fade nas bordas + esconder breadcrumbs intermediários no mobile (manter só primeiro e último).
- **AdminDashboard "North Star":** card de Total Clientes ocupa 1/3 em desktop mas no tablet (md) fica espremido. Mudar para `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- **Sidebar mobile:** drawer atual é 280px / 85vw — bom. Adicionar swipe-to-close gesture.
- **Bottom Navigation Bar para Cliente (mobile):** adicionar barra fixa inferior com 4 ícones (Dashboard, Meus Dados, Plano, Acompanhamento) — substitui menu hambúrguer no celular para o cliente final, padrão de apps modernos.
- **Tabelas restantes:** ainda há tabelas em `AdminMonitoring`, `AdminInvestments`, `SuperAdminClients`, `SuperAdminAdmins` que não usam `ScrollableTable` — padronizar.
- **Modais/Dialogs:** garantir `max-h-[90vh] overflow-y-auto` em todos os Dialogs (alguns cortam conteúdo no mobile).

---

## 5. Funcionalidades — Melhorias e Correções

### 5.1 Quick wins funcionais

- **Busca global (Cmd+K):** adicionar `cmdk` (já temos `command.tsx`) com atalhos: ir para cliente, novo cliente, configurações. Disponível só para admin.
- **Notificações in-app:** sino no header com lista de eventos (cliente confirmou dados, novo cliente cadastrado, e-mail falhou). Persistir em nova tabela `notifications` com RLS.
- **Auto-save em formulários longos:** MyData e Onboarding podem perder dados se o admin sair. Salvar rascunho no `localStorage` por step.
- **Undo de exclusão:** ao excluir cliente, mostrar toast com botão "Desfazer" (5s) antes de confirmar exclusão na edge function.
- **Exportar dashboard como PDF:** botão "Exportar" no AdminDashboard que gera relatório executivo (similar ao já existente `generateReportPdf`).

### 5.2 Bugs/inconsistências detectados

- `ClientLayout` re-fetcha profile a cada render se user mudar — usar React Query com cache.
- `AdminDashboard` faz 7+ queries sequenciais no `useEffect` — paralelizar em `Promise.all` (em parte já feito, mas separado por blocos).
- `recentClients` query traz **todos** os clientes só para fatiar 5 — adicionar `.limit(5)` no Supabase.
- Theme toggle no mobile header pode ficar invisível em tema claro (cor sidebar-foreground sobre fundo sidebar).

### 5.3 Novas funcionalidades sugeridas (opcional, decidir depois)

- **Modo apresentação:** botão fullscreen no relatório do cliente para apresentar em reunião.
- **Comentários do consultor visíveis ao cliente:** hoje só o admin vê o "Parecer". Permitir publicar trechos selecionados ao cliente.
- **Tags em clientes:** permitir admin classificar clientes (VIP, atenção, novo) com cores.

---

## Roadmap de execução sugerido

```text
Fase 1 (alta prioridade, ~30min):
  └─ Tipografia (utilitários + substituições principais)
  └─ Skeletons + count-up reutilizáveis
  └─ Bottom nav mobile (cliente)
  └─ Bugs de queries (.limit, paralelização)

Fase 2 (média, ~30min):
  └─ Super Admin Dashboard com sparklines + atividade recente
  └─ Cliente Dashboard "Evolução" com mini-chart
  └─ ScrollableTable nas tabelas restantes
  └─ Modais responsivos

Fase 3 (alto valor, ~45min):
  └─ Busca global Cmd+K
  └─ Notificações in-app
  └─ Undo de exclusão
  └─ Auto-save em formulários
```

### Detalhes técnicos

- Criar `src/hooks/useCountUp.ts` extraindo lógica do Login.
- Criar `src/components/ui/skeleton-card.tsx` com shimmer.
- Criar `src/components/layouts/MobileBottomNav.tsx` (renderizar dentro de `ClientLayout` em `lg:hidden`).
- Nova migration para tabela `notifications (id, user_id, type, payload jsonb, read_at, created_at)` com RLS por `user_id`
- Adicionar `motion.span` count-up em KPIs do `AdminDashboard` linhas 350+.
- Refactor de `AdminLayout` breadcrumb (linhas 432-460) com fade lateral + colapso mobile.

