# Alterações realizadas — Plataforma Novare

> Documento para apresentação ao cliente final.
> **Escopo:** apenas alterações que impactam o produto entregue ao cliente.
> **Excluído:** mudanças internas exclusivas do painel administrativo.

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
