

# Gráfico 3D Avançado no Dashboard

## Recomendação: **Globo Patrimonial 3D Interativo** (Wealth Sphere)

Uma esfera 3D rotativa com **anéis orbitais** representando a evolução patrimonial e a distribuição de risco da carteira de clientes — visualmente impactante, único no mercado de consultoria financeira e alinhado ao tema "Novare" (renovação, movimento).

### Por que esta escolha (e não outras)
| Opção | Profissionalismo | Modernidade | Útil aos dados | Performance |
|---|---|---|---|---|
| **Globo Patrimonial 3D** ✅ | Alto | Altíssimo | Alto (multi-eixo) | Boa (WebGL leve) |
| Gráfico de barras 3D | Médio | Médio | Médio | Boa |
| Treemap 3D | Alto | Alto | Alto | Média |
| Mapa de calor 3D | Médio | Alto | Baixo | Boa |

O globo vence porque **codifica 3 dimensões simultâneas** (tempo, valor, risco) com forte apelo visual — o que barras e mapas de calor não conseguem.

## O que será construído

### Componente `WealthSphere3D.tsx`
Card hero no topo do `DashboardCharts.tsx` (acima dos 2 cards atuais), com:

- **Esfera central rotativa** — pulsa proporcional ao patrimônio total sob gestão
- **Anel equatorial** com 6 segmentos (últimos 6 meses) — altura/cor reflete patrimônio mensal
- **Pontos orbitais** — cada cliente vira uma partícula colorida pelo risco (A verde → E vermelho), distância ao centro = patrimônio individual
- **Auto-rotação suave** com pausa no hover; arrastar para rotacionar manualmente
- **Tooltip 3D** ao passar sobre uma partícula: nome do cliente, patrimônio e risco
- **Glow dinâmico** em volta da esfera muda de cor conforme tendência (verde se +, vermelho se -)
- **Overlay HUD** com KPIs sobrepostos: total sob gestão, nº de clientes, % saudável

### Layout no Dashboard
```text
┌─────────────────────────────────────────────────┐
│  🌐 Globo Patrimonial 3D (hero, full-width)     │
│        [esfera + anel + partículas]              │
│        HUD: R$ 12,4M · 47 clientes · 78%        │
└─────────────────────────────────────────────────┘
┌──────────────────────┬──────────────────────────┐
│ Patrimônio (área)    │ Distribuição risco (bar) │
└──────────────────────┴──────────────────────────┘
```

## Detalhes técnicos

- **Stack**: `@react-three/fiber@^8.18` + `@react-three/drei@^9.122.0` + `three@>=0.133` (versões fixas, compatíveis com React 18)
- **Componentes Three**:
  - `Sphere` central com `MeshDistortMaterial` (drei) para efeito orgânico
  - `Ring` equatorial gerado proceduralmente a partir de `wealthSeries`
  - `Points` (instâncias) para partículas dos clientes
  - `OrbitControls` (autoRotate, enableZoom=false)
  - `Stars` de fundo sutis para profundidade
- **Dados**: reaproveita `monitoring_snapshots`, `clients`, `diagnosis` já consultados em `DashboardCharts.tsx` — **sem novas queries Supabase**
- **Performance**: 
  - `Suspense` + skeleton enquanto carrega o canvas
  - `dpr={[1, 2]}` adaptativo
  - Limita a 100 partículas (top 100 clientes por patrimônio) para manter 60fps
  - `frameloop="demand"` quando aba não está visível
- **Tema**: cores via `hsl(var(--success))`, `--primary`, `--accent`, `--destructive` — funciona em light/dark
- **Acessibilidade**: fallback estático (imagem do gráfico atual) para `prefers-reduced-motion`
- **Mobile (≤768px)**: substitui por versão 2D simplificada (canvas leve) para preservar bateria

## Arquivos afetados
- `src/components/admin/WealthSphere3D.tsx` — novo componente
- `src/components/admin/DashboardCharts.tsx` — adiciona o hero acima do grid atual
- `package.json` — adiciona `three`, `@react-three/fiber@^8.18`, `@react-three/drei@^9.122.0`

## Fora de escopo
- Não substitui os 2 gráficos atuais (área + barras) — eles continuam, o globo é um **hero adicional**
- Não muda o dashboard do cliente nem do super admin (apenas `/admin`)
- Não adiciona novas tabelas no Supabase

