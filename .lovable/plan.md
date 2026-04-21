

## Modernizar a aba Clientes

Vou transformar a página `/admin/clientes` num painel mais profissional, com KPIs no topo, cards de cliente mais ricos em informação, e uma experiência visual mais polida — mantendo toda a lógica funcional atual (busca, filtros, exclusão com undo, seed automático).

### O que muda visualmente

**1. Faixa de KPIs no topo (4 cards)**
Logo abaixo do banner, uma linha com métricas em tempo real:
- **Total de Clientes** (com ícone Users)
- **Em Acompanhamento** (verde, ícone TrendingUp)
- **Pendentes Onboarding** (âmbar, ícone Clock)
- **Novos este mês** (azul, ícone Sparkles) — calculado por `created_at`

Cada KPI mostra número grande, label, ícone com fundo translúcido e uma micro-tendência ("+2 esta semana").

**2. Barra de ações refinada**
- Busca com ícone à esquerda + atalho visual `⌘K`
- Toggle de **visualização** (Lista / Grade) à direita com ícones `List` / `LayoutGrid`
- Dropdown de **ordenação** (Mais recentes / A-Z / Status)
- Contador "Mostrando X de Y clientes" abaixo

**3. Filtros em formato pílula (chips)**
Substituo as tabs com sublinhado por chips arredondados modernos:
- Pílula ativa com fundo `accent/10`, borda `accent/30`, texto `accent`
- Pílulas inativas com hover suave
- Contagem como badge interno

**4. Cards de cliente redesenhados (modo Lista)**
Cada linha ganha:
- **Avatar maior (h-12 w-12)** com gradiente accent + iniciais (2 letras)
- **Indicador de status** em ponto colorido animado (pulse) ao lado do nome
- **Linha de metadata**: cidade · profissão · "Cliente há Xd" (usa `created_at` com `date-fns`)
- **Badge de consultor** com avatar pequeno (se houver `assigned_consultant`)
- **Badge de status** colorida (mantém atual)
- **Ações revealed on hover**: editar, excluir, "abrir parecer" — agrupadas em pílula no canto direito
- Borda esquerda colorida fina (4px) refletindo o status (verde/âmbar)
- Hover: leve elevação + shimmer accent na borda esquerda

**5. Modo Grade (novo)**
Layout em grid `1/2/3 colunas` (mobile/tablet/desktop) com cards verticais:
- Avatar centralizado no topo
- Nome, email, status
- Mini-stats: profissão, cidade
- Botão "Abrir cliente" no rodapé do card

**6. Empty states aprimorados**
Mantenho os existentes mas com ilustração mais rica (ícone em círculo gradiente accent).

### Implementação técnica

**Arquivo único editado:** `src/pages/admin/ClientList.tsx`

- Adicionar 4 novos imports: `TrendingUp, Clock, Sparkles, LayoutGrid, List, ArrowUpDown` do `lucide-react`, `formatDistanceToNow` do `date-fns/locale ptBR`, `DropdownMenu*` do `@/components/ui/dropdown-menu`
- Novo state: `viewMode: "list" | "grid"` (persistido em `localStorage`), `sortBy: "recent" | "name" | "status"`
- Novo cálculo `kpis` via `useMemo` derivado de `clients`
- Componente interno `<KpiCard>` reutilizável (4 instâncias)
- Componente interno `<ClientCardGrid>` para o modo grade
- Manter toda lógica de `loadClients`, `handleDeleteConfirm`, seed demo, `PasswordConfirmDialog`
- Animações com `framer-motion` reutilizando o `fadeUp` existente, com `staggerChildren`

### Layout (ASCII)

```text
┌─ PageBanner: Clientes ───────────────────[+ Novo Cliente]─┐
└──────────────────────────────────────────────────────────┘

┌─KPI: Total─┐ ┌─KPI: Acomp.─┐ ┌─KPI: Pendentes─┐ ┌─KPI: Novos─┐
│  12        │ │  8 ↑        │ │  3 ⏱           │ │  +2 ✨     │
└────────────┘ └─────────────┘ └────────────────┘ └────────────┘

[● Todos 12] [Pendente 3] [Acompanhamento 8]    [List|Grid] [Sort▾]
[🔍 Buscar...                              ⌘K]    Mostrando 12 de 12

┃ ● [JD] João da Silva                     SP · Engenheiro · há 5d
┃     joao@email.com               [Maria↗] [Acomp.]  ✏ 🗑 →
┃ ● [MA] Maria Andrade                     RJ · Médica · há 2d
┃     maria@email.com              [Sem cons.] [Pend.] ✏ 🗑 →
```

### Sem mudanças

- Rotas, navegação, lógica de exclusão (undo de 5s), seed demo, `SEO`, `PageBanner`, `PasswordConfirmDialog` permanecem idênticos
- Nenhuma alteração de banco ou edge function

