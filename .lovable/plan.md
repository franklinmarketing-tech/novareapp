
## Plano de varredura e melhorias gerais na aba Clientes

Vou revisar e ajustar a aba `Clientes` sem alterar a estrutura principal do sistema: sem mudar rotas, banco de dados, fluxo de navegação, layout base ou permissões. O foco será correção fina, segurança operacional, usabilidade e consistência visual.

## Escopo principal

Arquivo principal:

- `src/pages/admin/ClientList.tsx`

Arquivos auxiliares somente se necessário:

- `src/components/layouts/AdminLayout.tsx`
- componentes UI já existentes, sem criar nova estrutura

## Melhorias e correções propostas

### 1. Corrigir carregamento e tratamento de erro

Hoje a busca de clientes ignora alguns erros silenciosamente. Vou melhorar para:

- tratar erro ao carregar `clients`;
- tratar erro ao carregar `profiles`;
- evitar tela vazia enganosa quando houver falha;
- mostrar toast claro em caso de erro;
- garantir que `loading` sempre finalize corretamente;
- evitar consultas desnecessárias quando não houver clientes.

Resultado esperado:

```text
Não foi possível carregar os clientes.
Tente novamente em instantes.
```

Sem quebrar o layout atual.

---

### 2. Melhorar busca sem mudar a tela

A busca atual considera principalmente nome e e-mail. Vou ampliar a busca para também encontrar por:

- cidade;
- profissão;
- consultor responsável;
- status textual.

Exemplo:

```text
Buscar "médico" encontra clientes com profissão Médico
Buscar "São Paulo" encontra clientes daquela cidade
Buscar "pendente" encontra clientes em onboarding pendente
```

Isso melhora a aba sem adicionar novos filtros ou mudar estrutura.

---

### 3. Refinar status dos clientes

Vou revisar o mapa de status para deixar mais claro:

- `onboarding_pendente` → `Pendente Onboarding`
- `em_diagnostico` → `Em Diagnóstico`
- `em_acompanhamento` → `Acompanhamento`

Hoje `em_diagnostico` aparece como `Acompanhamento`, o que pode confundir.

Também manterei as cores atuais:

- amarelo para pendente;
- verde/positivo para acompanhamento;
- tom intermediário para diagnóstico, se compatível com os badges existentes.

---

### 4. Melhorar a exclusão sem afetar segurança

A exclusão já usa confirmação de senha e Edge Function. Vou apenas deixar a experiência mais segura:

- não remover visualmente o cliente antes da confirmação real do Supabase;
- mostrar estado de processamento durante a exclusão;
- manter toast de sucesso somente depois do commit;
- se houver erro, manter o cliente na lista;
- preservar a confirmação por senha e texto `EXCLUIR`.

Isso evita a sensação de que o cliente foi excluído quando a operação ainda pode falhar.

---

### 5. Revisar seed automático de clientes demo

Existe uma chamada automática para `seed-all-demo-clients` dentro da aba Clientes quando alguns clientes demo não existem ou estão incompletos.

Vou revisar esse comportamento porque pode ser perigoso em ambiente real. A correção segura será:

- impedir que a aba Clientes crie clientes demo automaticamente em uso normal;
- manter a lista apenas como leitura/gestão dos clientes existentes;
- se o projeto ainda precisar de seed demo, deixar isso restrito a fluxo explícito de teste, não ao simples acesso da aba.

Essa mudança não altera estrutura, apenas evita criação automática inesperada.

---

### 6. Melhorar estados vazios e sem resultado

Vou refinar as mensagens para ficarem mais úteis:

Quando não houver nenhum cliente:

```text
Sua jornada começa aqui
Cadastre seu primeiro cliente...
```

Quando houver clientes, mas o filtro/busca não encontrar:

```text
Nenhum resultado encontrado
Limpar busca e filtros
```

Também vou adicionar ação rápida para limpar busca/filtros quando aplicável.

---

### 7. Melhorar responsividade e legibilidade

Sem redesenhar a tela, vou ajustar detalhes de responsividade:

- evitar textos cortados de forma ruim em telas menores;
- manter ações `Editar` e `Excluir` acessíveis no mobile;
- revisar espaçamentos dos cards em lista e grade;
- melhorar alinhamento dos badges;
- manter os KPIs e filtros estáveis no viewport atual.

---

### 8. Melhorar acessibilidade dos botões

Vou revisar:

- `aria-label` nos botões de editar/excluir;
- títulos dos botões;
- foco de teclado;
- botões de visualização lista/grade com indicação adequada;
- área clicável do card sem conflito com botões internos.

---

### 9. Revisar consistência visual

Vou manter o estilo atual, apenas polindo:

- pesos de fonte;
- truncamento de nome/e-mail;
- badges;
- estados hover;
- ícones;
- alinhamento entre lista e grade.

Sem alterar identidade visual ou estrutura de navegação.

## Validação após implementar

Depois da implementação, vou validar:

1. Acessar `/admin/clientes`.
2. Confirmar carregamento correto da lista.
3. Testar busca por nome.
4. Testar busca por e-mail.
5. Testar busca por cidade/profissão/consultor.
6. Testar filtros `Todos`, `Pendente` e `Acompanhamento`.
7. Testar ordenação por recentes, nome e status.
8. Alternar entre lista e grade.
9. Conferir estados vazios e sem resultado.
10. Testar fluxo de exclusão com cancelamento e erro.
11. Conferir se nenhum cliente demo é criado automaticamente.
12. Verificar console para erros visíveis.
13. Confirmar que a estrutura de rotas e banco não foi alterada.

## Resultado esperado

A aba Clientes ficará:

- mais confiável;
- mais clara;
- com busca mais útil;
- com exclusão mais segura;
- sem criação automática inesperada de clientes demo;
- mais consistente em desktop e mobile;
- sem mudanças estruturais no sistema.
