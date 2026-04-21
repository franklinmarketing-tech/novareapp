

## Padronizar ícones 3D em todo o sistema (Admin + Cliente)

Aplicar a mesma estética dos ícones 3D do Financeiro (cofre, crescimento, pipeline, premium) em todas as páginas Admin e Cliente, em três pontos: PageBanner, cabeçalhos de cards de gráfico/KPI e empty states.

### 1. Gerar a biblioteca de ícones 3D

Criar 12 novos PNGs no mesmo estilo dos atuais (renderização 3D, brilho suave, paleta vibrante coerente) usando o modelo `google/gemini-3-pro-image-preview` via edge function temporária. Salvar em `src/assets/icons-3d/`:

| Ícone | Uso principal |
|---|---|
| `dashboard-3d.png` | PageBanner do Dashboard (Admin + Cliente) |
| `parecer-3d.png` (pena/quill dourada) | Parecer |
| `market-3d.png` (gráfico ascendente azul) | Investimentos / mercado |
| `selic-3d.png` (porcentagem dourada) | KPI Selic |
| `ipca-3d.png` (cesta) | KPI IPCA |
| `cdi-3d.png` (moedas empilhadas) | KPI CDI |
| `ibov-3d.png` (touro/bull) | KPI Ibovespa |
| `snapshot-3d.png` (câmera) | Acompanhamento |
| `target-3d.png` (alvo) | Objetivos |
| `clipboard-3d.png` (prancheta com check) | Plano de Ação |
| `wrench-3d.png` (chave inglesa) | Implementação |
| `users-3d.png` (avatares) | Lista de Clientes |

Os 4 ícones existentes (`icon-vault-3d`, `icon-growth-3d`, `icon-pipeline-3d`, `icon-premium-3d`) continuam sendo usados onde já fazem sentido.

### 2. Componente reutilizável `Icon3D`

Criar `src/components/ui/Icon3D.tsx` com:
- Suporte a tamanhos (`sm` 24px, `md` 32px, `lg` 48px, `xl` 64-80px)
- Prop opcional `floating` (animação flutuante framer-motion como no hero do Financeiro)
- Prop opcional `hover` (escala + leve rotação no hover)
- `drop-shadow` consistente
- Mapa central `icon3DMap` com chave → import (ex.: `"dashboard"`, `"parecer"`, `"market"`...) para uso simples: `<Icon3D name="parecer" size="md" hover />`

### 3. Atualizar `PageBanner.tsx`

Aceitar nova prop opcional `icon3D?: keyof typeof icon3DMap`. Quando presente, renderiza o PNG 3D (tamanho lg, floating sutil) no lugar do círculo lucide atual. Manter `icon` lucide como fallback retrocompatível.

### 4. Aplicar nas páginas (Admin)

| Página | PageBanner | Cabeçalhos de card | Empty states |
|---|---|---|---|
| `AdminDashboard` | `dashboard` | "Clientes recentes" → `users-3d`, "Próximas ações" → `clipboard-3d` | substituir Inbox/Users lucide por `users-3d` |
| `AdminInvestments` | `market` | KPICards: Selic→`selic-3d`, CDI→`cdi-3d`, IPCA→`ipca-3d`, Ibov→`ibov-3d`, Real→`vault-3d`, Spread→`growth-3d`. Cabeçalhos dos charts ganham ícone 3D ao lado do título no mesmo padrão do Financeiro | indicador vazio → `market-3d` |
| `AdminParecer` | `parecer` | cabeçalhos dos blocos de notas/recomendações | `parecer-3d` |
| `AdminMonitoring` | `snapshot` | "Histórico de Registros"→`snapshot-3d`, "Evolução Patrimonial"→`growth-3d`, "Indicadores de Saúde"→`vault-3d` | `snapshot-3d` |
| `AdminObjetivos` | `target` | cards de objetivos mantém ícones de meta atuais (já são temáticos) | `target-3d` |
| `AdminActionPlan` | `clipboard` | "Ações pendentes/concluídas" → `clipboard-3d` | `clipboard-3d` |
| `AdminImplementation` | `wrench` | cards de produto | `wrench-3d` |
| `ClientList` | `users` | — | `users-3d` |
| `AdminFinanceiro` | já está padronizado, apenas migrar imports para a nova convenção `icon3DMap` | — | — |

### 5. Aplicar nas páginas (Cliente)

| Página | PageBanner | Empty states |
|---|---|---|
| `ClientDashboard` | `dashboard` | `vault-3d` para patrimônio, `growth-3d` para receita |
| `MyData` | `vault` (cofre) | `vault-3d` |
| `ActionPlan` (cliente) | `clipboard` | `clipboard-3d` |
| `Monitoring` (cliente) | `snapshot` | `snapshot-3d` |
| `ClientSettings` | mantém lucide (configuração não é métrica) | — |

### 6. Ajustes finos

- Remover/manter os emojis Unicode (🏆 🚀 ⚡ 📈) do narrative do Financeiro — eles são contextuais e não conflitam com os ícones 3D, então **mantém**.
- Padronizar tamanho dos ícones de cabeçalho de card em **w-8 h-8** com `drop-shadow-lg` em todos os arquivos para coerência visual.
- Empty states: aumentar variante para usar PNG 3D em w-16 h-16 quando `icon3D` for passado, mantendo o componente `EmptyState` retrocompatível com `icon` lucide.

### Detalhes técnicos

- **Geração de assets**: script Node executado uma única vez via `code--exec` chamando `https://ai.gateway.lovable.dev/v1/chat/completions` com `model: "google/gemini-3-pro-image-preview"` e prompt padronizado:  
  *"Render a 3D icon of [SUBJECT] in the same style as a premium fintech app: glossy plastic finish, soft studio lighting, transparent background, vibrant accent color [COLOR], subtle bevel and rim light, slight floating shadow underneath, isometric front-3/4 angle, 512×512, no text."*  
  Resposta base64 → decode → salvar em `src/assets/icons-3d/<name>.png`.
- **EmptyState**: adicionar prop `icon3D?: string` que, quando presente, sobrescreve o render do `Icon` lucide e usa `<img>` com o tamanho/tom apropriado.
- **PageBanner**: nova prop `icon3D` mantém compatibilidade — todas as chamadas atuais continuam funcionando sem alteração até a migração página a página.
- **Lazy loading**: todos os `<img>` de ícones 3D usam `loading="lazy"` exceto os do hero/PageBanner above-the-fold.
- **Sem mudança de DB nem edge functions de produção** — geração de imagem é one-shot para popular a pasta de assets.

### O que NÃO faz parte

- Ícones dentro de tabelas, dropdowns, botões pequenos e navegação lateral → continuam lucide (3D não escala bem em <20px e poluiria).
- Ícones de objetivos (`goal-*.png`) já existem com estilo próprio e seguem como estão.
- SuperAdmin → fora do escopo (telas internas, não cliente-facing).

