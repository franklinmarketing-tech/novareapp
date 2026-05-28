# Alterações realizadas — Plataforma Novare

> Documento para apresentação ao cliente final.
> **Escopo:** apenas alterações que impactam o produto entregue ao cliente.
> **Excluído:** mudanças internas exclusivas do painel administrativo.

---

## 28 de maio de 2026

### Dashboard do cliente reformulado: dados consolidados + histórico mensal

**Resumo executivo:**
O painel principal do cliente passou a ser o centro único de informação. Agora ele vê **todos os dados do onboarding consolidados** no dashboard e o **histórico mensal de evolução** ali mesmo — sem precisar abrir telas separadas. Após o primeiro fechamento mensal, o menu "Meus Dados" some automaticamente, mantendo só o que faz sentido para o cliente.

**O que mudou para o cliente:**

| Onde | Antes | Agora |
|------|-------|-------|
| Final do dashboard | Botões "Meus Dados" e "Plano de Ação" como atalho | Removidos — os dados agora aparecem direto no próprio dashboard |
| Dashboard — corpo da página | Resumo financeiro básico + objetivos | Adicionado bloco "Seus dados consolidados" com 6 cards (Renda, Despesas, Dívidas, Patrimônio, Seguros, Objetivos), cada um com total + breakdown |
| Dashboard — histórico | — | Novo bloco "Sua evolução mês a mês": gráfico de área (Patrimônio Líquido / Ativos / Dívidas) + tabela dos 6 últimos fechamentos + 4 stats (evolução total, taxa de poupança média, meses fechados, período) |
| Menu lateral / inferior | "Meus Dados" sempre visível | Some automaticamente após o primeiro fechamento mensal — restando Dashboard + Plano de Ação + Lançamento do mês |

**Por que essa mudança?**
- Cliente tem uma única tela como fonte da verdade — sem caminhos paralelos.
- Após o fechamento, faz mais sentido o cliente acompanhar a evolução do que tentar editar dados consolidados.
- O histórico mensal estimula o engajamento — o cliente vê o crescimento visual do patrimônio mês a mês.

---

### Trava de edição dos dados após o primeiro fechamento mensal

**Resumo executivo:**
Depois que o consultor concluir o **primeiro fechamento mensal** de um cliente, a tela **"Meus Dados"** do cliente passa a ficar em **modo visualização** — ele continua acessando todas as informações, mas não consegue mais alterar Renda, Despesas, Dívidas, Patrimônio, Seguros ou Objetivos no painel dele. A partir daí, ajustes nesses dados passam a ser feitos pelo consultor.

**O que mudou para o cliente:**

| Onde | Antes | Agora |
|------|-------|-------|
| Botão "Editar" em cada seção (Renda, Despesas, Dívidas, Patrimônio, Seguros, Objetivos) | Sempre disponível | Vira um selo "🔒 Travado" assim que existe um fechamento mensal |
| Aviso no topo da página | — | Card destacado em azul: "Edição encerrada — seus dados foram fechados a partir do primeiro fechamento mensal" com mês do fechamento |
| Botão "Confirmar Dados" / "Atualizar dados novamente" | Sempre disponível | Some quando há fechamento — não faz sentido confirmar dados que já estão consolidados |
| Tentativa de salvar (caso burlando UI) | Salvava normalmente | Bloqueada por salvaguarda no código com toast: "Edição bloqueada — solicite ao consultor" |

**Por que essa mudança?**
- Garante que o histórico do cliente reflete sempre o que foi efetivamente analisado no fechamento.
- Evita que cliente altere dados retroativos e desalinhe a evolução mensal do plano.
- Mantém a consultoria como autoridade única para ajustes pós-fechamento — o cliente continua acompanhando lançamentos do mês (que NÃO ficam travados).

---

### Auto-save no acompanhamento mensal

**Resumo executivo:**
O campo de descrição do estado atual ("Como está agora? Descreva brevemente...") agora **salva automaticamente** enquanto o cliente digita — não é mais necessário clicar em "Salvar" para preservar o que foi escrito.

**O que mudou para o usuário:**

| Onde | Antes | Agora |
|------|-------|-------|
| Campo de descrição do estado em cada meta acompanhada | Salvava apenas ao clicar no botão de salvar — texto era perdido se o usuário trocasse de tela | Salva sozinho 1,5 segundo após parar de digitar |
| Feedback visual | Apenas via toast no clique manual | Indicador discreto abaixo do campo: "Salvando..." → "Salvo automaticamente" |
| Risco de perder texto | Alto — fácil esquecer de clicar em salvar | Eliminado |

**Comportamento técnico:**
- Auto-save com debounce de 1,5s evita salvamentos excessivos a cada tecla.
- Se já existe um registro do dia, o auto-save atualiza esse registro (não cria histórico duplicado).
- Se for o primeiro registro do dia, cria um novo lançamento — os auto-saves seguintes atualizam o mesmo registro.
- O botão "Salvar" manual continua disponível para confirmação imediata.

---

## 26 de maio de 2026

### 1. Nova funcionalidade: Editar, Incluir e Excluir no Acompanhamento

**Resumo executivo:**
O consultor agora consegue **incluir, editar e excluir** itens financeiros, metas e objetivos diretamente na tela de acompanhamento mensal, sem precisar voltar ao onboarding ou ao plano de ação.

**O que mudou para o usuário:**

| Onde | Antes | Agora |
|------|-------|-------|
| Cabeçalho de cada seção (Rendas, Despesas, Dívidas, Patrimônio, Seguros) | Sem ação | Botão **+ Adicionar** abre formulário rápido |
| Cabeçalho de Objetivos | Sem ação | Botão **+ Novo objetivo** abre formulário |
| Cada item financeiro | Apenas valor visível | Ícones **editar** (✏️) e **excluir** (🗑️) |
| Cada objetivo | Apenas valor aplicado | Ícones **editar** e **excluir** |
| Itens sem meta definida | Aparecia só como "Valor cadastrado" | Botão **Definir meta** cria meta vinculada |
| Itens com meta | Bloco "Plano de Ação" estático | Ícones para **editar** e **excluir** a meta |

**Benefícios:**
- Reduz cliques para corrigir um valor incorreto cadastrado no onboarding.
- Permite ao consultor adicionar uma despesa nova durante o acompanhamento mensal, sem trocar de tela.
- Mantém o histórico de snapshots intacto — só o cadastro original do item é alterado.
- Exclusão de item remove também a meta vinculada, garantindo consistência dos dados.

**Validações implementadas:**
- Campos obrigatórios por tipo (ex.: tipo da dívida, descrição da renda).
- Confirmação antes de excluir.
- Toast de sucesso/erro em todas as operações.
- Cache da página atualiza em tempo real após cada alteração.

---

### 2. Nova funcionalidade: Bloco de Notas por Categoria no Plano de Ação

**Resumo executivo:**
O consultor agora pode salvar **anotações livres por categoria** dentro da seção "Ver Ações". Há um bloco de notas dedicado para cada uma das 6 categorias (Rendas, Despesas, Dívidas, Patrimônio, Seguros e Objetivos). O cliente também consegue ler essas anotações no próprio painel ("Meus Dados"), promovendo transparência na consultoria.

**O que mudou para o usuário:**

| Onde | Antes | Agora |
|------|-------|-------|
| Plano de Ação do consultor | Sem campo de anotação | Bloco de notas expansível por categoria (6 blocos) |
| Painel do cliente ("Meus Dados") | Apenas dados do onboarding | Cliente vê as anotações do consultor por categoria (modo leitura) |
| Salvamento das notas | — | **Auto-save** ao digitar (debounce de 800ms) |

**Como funciona:**
- Cada categoria tem um único bloco de notas contínuo (acumula histórico).
- O consultor digita observações livres: contexto do cliente, planos específicos, lembretes.
- O texto é salvo automaticamente — sem botão de "salvar".
- O cliente acessa as anotações ao expandir cada seção em "Meus Dados".
- Marcador visual de "Atualizado em [data]" mostra a última edição.

**Benefícios:**
- O consultor mantém registro contextual organizado por categoria, sem precisar de ferramenta externa.
- O cliente fica ciente das observações do consultor sobre cada parte da sua vida financeira.
- Reforça a sensação de **personalização** e **acompanhamento próximo** da consultoria.
- Histórico contínuo facilita revisar comentários antigos sem perder contexto.

**Categorias com bloco de notas:**
1. **Rendas** (verde)
2. **Despesas** (rosa)
3. **Dívidas** (vermelho)
4. **Patrimônio** (azul)
5. **Seguros** (roxo)
6. **Objetivos** (azul Novare)

**Segurança e permissões:**
- Apenas o consultor (admin) consegue **editar** as notas.
- Cada cliente lê **apenas** as próprias notas (isolamento garantido por RLS).
- Nenhuma nota é exposta a outros clientes.

---

### 3. Cliente lança valores no próprio painel (com controle do consultor)

**Resumo executivo:**
O cliente agora tem uma aba dedicada **"Lançamento do mês"** no painel dele, com dois modos possíveis controlados pelo consultor: **edição liberada** (cliente atualiza os valores) ou **somente visualização** (cliente só acompanha o progresso). O consultor liga/desliga essa permissão com um botão de destaque na própria tela de lançamento, sem precisar sair do contexto.

**O que mudou para o usuário:**

| Onde | Antes | Agora |
|------|-------|-------|
| Painel do cliente | Aba "Lançamento do mês" não existia | Nova aba na sidebar e na barra mobile |
| Painel do cliente (sem liberação) | — | Cliente vê metas, progresso e histórico em modo leitura, com aviso visual |
| Painel do cliente (liberado) | — | Cliente edita **valor atual** e **estado** de cada meta diretamente |
| Tela do consultor | Sem controle de permissão | Botão grande com efeito glow: **"Liberar lançamento"** ou **"Bloquear edição"** |

**Como funciona:**
- O botão de permissão fica em destaque no topo da tela de "Lançamento do mês" do consultor.
- Quando liberado: aparece em verde com ícone de cadeado aberto e mensagem "Cliente liberado para lançar".
- Quando bloqueado: aparece em âmbar com cadeado fechado e mensagem "Cliente em modo visualização".
- **Sincronização automática:** o cliente percebe a mudança em até 15 segundos, sem precisar recarregar a página, e recebe um aviso toast informando o novo modo.
- A flag é por cliente (global) — não reseta automaticamente entre meses.

**Limitações intencionais para o cliente (mesmo liberado):**
- Cliente **não pode** adicionar nem excluir itens, metas ou objetivos.
- Cliente **não pode** alterar valores das metas ou objetivos cadastrados pelo consultor.
- Cliente **só pode** atualizar o **valor atual** e a **descrição do estado** de cada meta.
- Botões de "+ Adicionar", "+ Novo objetivo", lápis e lixeira ficam **invisíveis** para o cliente.

**Benefícios:**
- Cliente ganha autonomia para registrar o progresso entre encontros com o consultor.
- Cliente sente que está participando ativamente da consultoria.
- Consultor mantém o controle total — concede acesso só quando o cliente está pronto.
- Reduz dependência de mensagens/e-mails entre cliente e consultor para atualização de valores.

**Segurança e permissões:**
- A permissão é controlada por uma flag (`client_can_log_acompanhamento`) na tabela `clients`.
- Apenas o admin (consultor) consegue alterar essa flag.
- Mesmo se um cliente tentar burlar pela API, as políticas de RLS no banco rejeitam o write quando a flag está em `false`.

---

## 27 de maio de 2026

### 4. Plano de Ação do cliente em tempo real

**Resumo executivo:**
O painel do cliente agora mostra automaticamente o **Plano de Ação** assim que o consultor cadastra metas — **sem precisar de F5 nem recarregar a página**. A sincronização é instantânea via Supabase Realtime, criando uma sensação de consultoria viva e contínua.

**O que mudou para o usuário:**

| Onde | Antes | Agora |
|------|-------|-------|
| Painel do cliente · "Plano de Ação" | Mostrava "Seu plano aparecerá quando criado" mesmo após o consultor cadastrar | Cliente vê as metas do consultor **na hora**, agrupadas por categoria |
| Sincronização | Cliente precisava recarregar a página | **Automática** — o painel atualiza sozinho a cada 20 segundos |
| Visualização | Vazio quando não havia `action_items` | Bloco visual com metas por categoria (Rendas, Despesas, Dívidas, Patrimônio, Seguros) |

**Como funciona:**
- Cada meta cadastrada pelo consultor aparece no painel do cliente em até 1 segundo.
- As metas aparecem agrupadas por categoria com cor distinta (verde para Rendas, vermelho para Despesas, etc.).
- Cada card mostra o nome do item, descrição da meta, valor alvo e prazo.
- O cliente também vê em tempo real edições e exclusões — se o consultor ajustar algo, o cliente vê na hora.

**Benefícios:**
- Cliente percebe **atividade imediata** do consultor — reforça percepção de valor.
- Acaba a fricção de "criei a meta, mas o cliente precisa atualizar a página".
- Cliente ganha **transparência total** sobre o que está sendo construído para ele.
- Aplicável também para Objetivos, Investimentos e ações em geral — qualquer mudança do consultor propaga em tempo real.

**Detalhes técnicos:**
- Polling automático a cada 20 segundos enquanto a aba está aberta.
- Refetch instantâneo quando o cliente volta para a aba (vindo do WhatsApp, e-mail, etc.).
- Pausado automaticamente em background — sem consumo de recursos desnecessário.
- Permissões RLS garantem que cada cliente só vê os próprios dados.

---
