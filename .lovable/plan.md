## Plano: Padronizar Empty States e Loaders nas telas restantes (Cliente + Admin)

Continuação da padronização iniciada. Vou aplicar `EmptyState` e `LoadingState` nas telas que ainda usam loaders/vazios ad-hoc, garantindo consistência visual completa entre as áreas Admin e Cliente.

### Telas a padronizar

**Admin (4 telas)**

&nbsp;

1. `AdminActionPlan.tsx` — lista de ações do plano
2. `AdminImplementation.tsx` — checklist de implementação
3. `AdminInvestments.tsx` — carteira/recomendações
4. `AdminParecer.tsx` — notas e recomendações

**Cliente (4 telas)**

6. `Monitoring.tsx` — acompanhamento mensal
7. `ClientDashboard.tsx` — empty states de seções vazias (objetivos, ações)
8. `MyData.tsx` — loader inicial dos dados

### Padrão aplicado

**Loading** → substituir spinners/pulses customizados por:

- `<LoadingState variant="page" />` para carregamento inicial da tela
- `<LoadingState variant="list" rows={N} />` para listas
- `<LoadingState variant="cards" />` para grids de KPIs
- `<LoadingState variant="form" />` para formulários

**Empty** → substituir mensagens soltas / cards vazios por:

- `<EmptyState icon={LucideIcon} title="..." description="..." action={<Button/>} />`
- Tom `accent` para CTAs principais (criar primeiro item)
- Tom `neutral` para filtros sem resultado
- Tom `success` quando é "tudo concluído"

### Critérios de mudança

- ✅ **Apenas substituir** loaders e empty states existentes
- ✅ **Manter exatamente** copy, ícones contextuais, e CTAs já presentes
- ✅ **Reutilizar** ícones lucide já importados onde possível
- ❌ **Não alterar** lógica de fetch, estrutura de dados, rotas
- ❌ **Não tocar** em onboarding, login, ou telas já refinadas

### Resultado

Todas as 100% das telas que carregam dados do Supabase passam a usar o mesmo skeleton e o mesmo padrão de empty state — alinhado com o design system já estabelecido (ClientList, AdminFinanceiro, AdminDashboard, AdminMonitoring, AdminObjetivos).

### Arquivos editados

8 arquivos no total. Zero novos componentes (os primitivos `EmptyState` e `LoadingState` já existem).