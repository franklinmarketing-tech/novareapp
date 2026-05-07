# Novare App — Guia para Claude

Plataforma de consultoria financeira SaaS multi-tenant com papéis super-admin, admin e cliente.

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 + TypeScript |
| Bundler | Vite (porta 8080 em dev) |
| Backend/DB | Supabase (PostgreSQL + Edge Functions) |
| Estilo | Tailwind CSS + shadcn/ui (Radix UI) |
| Roteamento | React Router DOM v6 |
| Estado/Cache | TanStack React Query v5 |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Animações | Framer Motion |
| 3D | Three.js + @react-three/fiber + drei |
| PDF | jsPDF + html2canvas |
| PWA | vite-plugin-pwa |
| Temas | next-themes (dark/light) |
| Notificações | Sonner |
| Ícones | Lucide React |
| Testes | Vitest |

---

## Comandos do Projeto

```bash
npm run dev          # Servidor de desenvolvimento (porta 8080)
npm run build        # Build de produção
npm run build:dev    # Build de desenvolvimento
npm run preview      # Preview do build de produção
npm run lint         # Verificação ESLint
npm test             # Testes unitários (Vitest)
npm run test:watch   # Testes em modo watch
```

---

## Variáveis de Ambiente

Arquivo `.env` na raiz (todas com prefixo `VITE_` — expostas ao cliente):

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

---

## Estrutura de Pastas

```
novareapp/
├── public/                   # Assets estáticos e ícones PWA
├── src/
│   ├── assets/               # Ícones SVG, ícones 3D, imagens
│   ├── components/
│   │   ├── admin/            # Componentes exclusivos do admin
│   │   ├── layouts/          # Shells de layout por papel (Admin, Client, SuperAdmin)
│   │   ├── monitoring/       # Fechamentos mensais
│   │   ├── onboarding/       # Fluxo multi-step de onboarding
│   │   ├── parecer/          # Editor de parecer financeiro
│   │   ├── super-admin/      # Componentes do super-admin
│   │   └── ui/               # Biblioteca shadcn/ui (50+ componentes)
│   ├── contexts/
│   │   ├── AuthContext.tsx   # Sessão, usuário, papel, status do cliente
│   │   ├── ClientContext.tsx # Contexto do cliente ativo
│   │   └── ThemeContext.tsx  # Dark/light mode
│   ├── hooks/                # Custom hooks (use-mobile, useNotifications, etc.)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts     # Inicialização do cliente Supabase
│   │       └── types.ts      # Tipos do DB gerados automaticamente
│   ├── lib/                  # Utilitários: PDF, email, utils (cn)
│   ├── pages/
│   │   ├── admin/            # Páginas do painel admin
│   │   ├── cliente/          # Páginas do painel cliente
│   │   └── super-admin/      # Páginas do super-admin
│   ├── test/                 # Arquivos de teste
│   ├── App.tsx               # Roteador principal
│   ├── index.css             # Estilos globais e variáveis CSS
│   └── main.tsx              # Entry point + registro do PWA
├── supabase/
│   ├── functions/            # Edge Functions (Deno)
│   └── migrations/           # Migrações do banco de dados
├── .claude/
│   └── settings.json         # Permissões pré-aprovadas do Claude
├── CLAUDE.md                 # Este arquivo
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── components.json           # Configuração shadcn/ui
```

---

## Arquitetura de Rotas

**Públicas:** `/login`, `/reset-password`, `/aceitar-convite/:token`, `/ferramentas/calculadora-de-investimentos`

**Super Admin** (`/super-admin/*`): protegidas por `SuperAdminRoute`

**Admin** (`/admin/*`): protegidas por `ProtectedRoute` com `requiredRole="admin"`
- Lista e detalhe de clientes, financeiro, workspace, leads, ajuda, configurações

**Cliente** (`/cliente/*`): protegidas por `ProtectedRoute` com `requiredRole="client"`
- Dashboard, onboarding, meus dados, plano de ação, acompanhamento, configurações

---

## Convenções de Código

### Componentes
- Componentes funcionais TypeScript com tipagem explícita de props
- Props desestruturadas na assinatura da função
- Páginas: `export default`; componentes de UI: `export` nomeado
- Nomes de arquivos em PascalCase para componentes, kebab-case para utilitários

### Imports (ordem padrão)
```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard } from "lucide-react";
```

### Alias de Paths
- `@/` mapeia para `./src/` — sempre usar nos imports internos

### Estilo
- Classes Tailwind direto no JSX; `cn()` para classes condicionais
- Cores Novare: `novare-terracotta`, `novare-blue`, `novare-blue-light`, `novare-blue-bright`
- Variáveis CSS HSL para tema (definidas em `index.css`)

### Dados
- TanStack React Query para busca e cache
- Mutations do Supabase dentro de `useMutation`
- Tipos do banco sempre importados de `@/integrations/supabase/types`

### Formulários
- React Hook Form + Zod para validação
- Schema Zod definido fora do componente
- Componentes `FormField` do shadcn/ui para integração

---

## Padrões Importantes

- **Autenticação:** sempre via `useAuth()` do `AuthContext` — nunca chamar Supabase auth direto nas páginas
- **Roles:** `super_admin` > `admin` > `client` — verificar via `role` do AuthContext
- **Toast:** usar `toast()` do Sonner (`import { toast } from "sonner"`)
- **Merge de classes:** sempre usar `cn()` de `@/lib/utils`
- **Edge Functions:** ficam em `supabase/functions/`, escritas em Deno/TypeScript

---

## Fluxo Git

Após cada conjunto coerente de alterações, execute automaticamente em sequência **sem pedir confirmação**:

```bash
git add <arquivos-alterados>
git commit -m "tipo: descrição em português"
git push origin main
```

### Tipos de commit
| Tipo | Quando usar |
|------|------------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `style` | Ajustes visuais/CSS sem lógica |
| `refactor` | Refatoração sem mudança de comportamento |
| `chore` | Configurações, dependências, arquivos de infra |
| `docs` | Documentação |
| `test` | Testes |

### Exemplos
```
feat: adiciona filtro por data no painel de leads
fix: corrige cálculo de rendimento no simulador
style: ajusta espaçamento do card no mobile
chore: adiciona permissões pré-aprovadas ao settings.json
```

Sempre fazer `git push` para a branch `main` após o commit, sem pedir confirmação ao usuário.
