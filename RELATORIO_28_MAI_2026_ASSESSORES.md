# 📋 Relatório de Atualizações — 28 de maio de 2026
## Plataforma Novare v5.0 — Guia rápido para assessores

> Documento interno: explica o que cada nova função faz e como o consultor (admin) usa no dia a dia.

---

## 🎯 Resumo executivo

A plataforma chegou na **versão 5.0** com 24 melhorias agrupadas em 6 frentes:

1. **Relatório financeiro** — novos gráficos no app e no PDF
2. **Acompanhamento mensal** — auto-save e persistência de histórico
3. **Trava pós-fechamento** — proteção dos dados do cliente após o primeiro fechamento
4. **Dashboard do cliente** — visão consolidada com histórico mensal
5. **Notificações automáticas** — cliente avisado em tempo real das ações do consultor
6. **Conformidade LGPD** — termos de uso, política de privacidade e aceite obrigatório
7. **Painel de teste de e-mail** — para validar envio antes de cadastrar clientes

---

## 1. 📊 Relatório financeiro mais visual

### O que mudou
O **Relatório Final** do cliente (acessível em `Admin → Cliente → Relatório`) ganhou **12 gráficos novos**, divididos em duas seções.

### Gráficos consolidados (Visão geral)
| Gráfico | Para que serve |
|---------|----------------|
| **Gauge de Saúde Financeira** | Mostra a letra de risco (A–E) num medidor visual, fica claro instantaneamente se o cliente está bem ou em situação crítica |
| **Composição da Renda** (barra empilhada) | Mostra em % quanto da renda vai para Despesas vs Poupança — fácil de ler para o cliente |
| **Receitas × Despesas × Saldo** (barras verticais) | Comparação visual dos 3 indicadores principais do mês. Se saldo for negativo, aparece alerta vermelho automático |
| **Composição dos Ativos** (barras horizontais) | Top 8 ativos do cliente em ordem decrescente, identifica concentração de patrimônio |
| **Top ações por impacto** | Quais ações do plano vão gerar maior economia/ganho — útil para priorizar no atendimento |
| **Evolução da Taxa de Poupança** | Histórico mês a mês da taxa de poupança com 4 estatísticas (início, atual, variação, média) |

### Gráficos de análise das metas (nova seção "Análise Visual das Metas")
| Gráfico | Para que serve |
|---------|----------------|
| **Pizza — Status das Metas** | Quantas metas estão Concluídas / Em andamento / Sem lançamentos / Atrasadas |
| **Pizza — Metas por Categoria** | Distribuição das metas entre Renda, Despesa, Dívida, Patrimônio, Seguro |
| **Barras — Progresso por Meta** | Cada meta com % atingido (vermelho/laranja/azul/verde por faixa). Background cinza ajuda a comparar |
| **Barras agrupadas — Alvo vs Atual** | Quanto o cliente já chegou perto do alvo em cada meta. Verde quando atinge |
| **Linhas — Evolução Mensal das Metas** | Quais metas estão progredindo bem e quais travaram ao longo do tempo |
| **Barras empilhadas — Lançamentos por Mês** | Quantos lançamentos o cliente fez por categoria em cada mês (indicador de engajamento) |

### Importante
- **Tudo isso também aparece no PDF gerado** — quando você clica em "Baixar PDF", o documento que vai para o cliente já tem todos os gráficos.
- A geração de PDF passa por uma IA que comenta as metas antes — você pode editar o comentário antes de baixar.

---

## 2. ✍️ Auto-save no acompanhamento mensal

### O que mudou
No **Acompanhamento de metas** (`Admin → Cliente → Lançamento do mês`), o campo de descrição do estado ("Como está agora?") agora **salva automaticamente** enquanto se digita.

### Como funciona
- Para de digitar → 1,5 segundo depois → salva sozinho
- Indicador discreto abaixo do campo: "Salvando automaticamente..." → "Salvo automaticamente"
- Se já existe um registro do dia, **atualiza** esse registro (não cria duplicado no histórico)
- Botão "Salvar" manual continua existindo para quem quiser confirmar imediatamente

### Por que isso importa
Antes, se o consultor (ou o cliente) escrevesse no campo e esquecesse de clicar em salvar, o texto era perdido. Agora isso não acontece mais.

---

## 3. 🔒 Trava pós-fechamento mensal

### O que mudou
Depois que o consultor **conclui o primeiro fechamento mensal** de um cliente, o painel do cliente (tela **"Meus Dados"**) entra em **modo somente leitura**.

### O que acontece no painel do cliente
- Botões "Editar" em cada seção (Renda, Despesas, Dívidas, Patrimônio, Seguros, Objetivos) viram um selo **"🔒 Travado"**
- Aparece um aviso no topo: "Edição encerrada — seus dados foram fechados a partir do primeiro fechamento mensal de [mês]"
- O item **"Meus Dados"** **some do menu lateral/inferior** automaticamente
- O cliente continua acessando o **Dashboard**, **Plano de Ação** e **Lançamento do mês** normalmente

### Por que isso importa
- Garante que o histórico do cliente reflete sempre o que foi analisado no fechamento
- Evita que o cliente altere dados retroativos e desalinhe a evolução mensal
- A partir do primeiro fechamento, **só o consultor** ajusta dados de onboarding pela tela do admin

### O que o consultor deve fazer
- Antes do primeiro fechamento: garantir que os dados do cliente estão completos e corretos
- Depois do primeiro fechamento: se o cliente pedir ajuste, faça você mesmo pelo painel do admin

---

## 4. 🎨 Dashboard do cliente reformulado

### O que mudou
O **Dashboard do cliente** virou o **centro único de informação**:

- **Bloco "Seus dados consolidados"**: 6 cards (Renda, Despesas, Dívidas, Patrimônio, Seguros, Objetivos) com total + breakdown
- **Bloco "Sua evolução mês a mês"**: gráfico de área de Patrimônio/Ativos/Dívidas + tabela com os últimos 6 fechamentos + 4 estatísticas (evolução total, taxa de poupança média, meses fechados, período)
- **Botões "Meus Dados" e "Plano de Ação" foram removidos** do final do dashboard (eram redundantes)

### Por que isso importa
- O cliente vê tudo em uma tela só, sem precisar navegar entre páginas
- Após o fechamento, "Meus Dados" some e isso não atrapalha porque os dados ficam visíveis no dashboard mesmo
- O histórico mensal estimula engajamento — o cliente vê o patrimônio crescendo mês a mês

---

## 5. 🔔 Notificações automáticas para o cliente

### O que mudou
O cliente agora recebe **notificações em tempo real** no app quando o consultor pratica certas ações.

### Eventos que disparam notificação para o cliente
| Ação do consultor | Notificação que o cliente recebe | Link |
|------|------|------|
| Salvar/atualizar parecer | "Seu parecer foi atualizado" | Dashboard |
| Fechar mês | "Mês fechado pelo seu consultor" | Dashboard |
| **Liberar lançamento** | "Você pode atualizar suas metas!" | Lançamento do mês |
| **Bloquear lançamento** | "Lançamentos em modo visualização" | Lançamento do mês |
| Criar nova meta | "Nova meta definida" | Plano de Ação |

### Detalhes técnicos
- Aparecem em tempo real (sem precisar recarregar a página)
- Têm link direto para a tela relevante
- Updates em metas existentes **não** disparam notificação (evita spam) — só criação

### Por que isso importa
Antes, o cliente entrava no app sem saber se houve novidade. Agora ele é avisado e isso aumenta o engajamento + percepção de valor da consultoria.

---

## 6. 📜 Conformidade LGPD

### O que mudou
A plataforma passou a respeitar a **Lei Geral de Proteção de Dados**:

### Páginas legais
- **`/termos`** — Termos de Uso (descrição do serviço, disclaimer CVM, foro, lei aplicável)
- **`/privacidade`** — Política de Privacidade (dados coletados, finalidade, base legal, direitos do titular, DPO)

Ambas as páginas têm um link discreto no rodapé do menu lateral (admin e cliente).

### Aceite obrigatório no cadastro
- No **cadastro pelo convite** e no **signup público**: checkbox **obrigatório** "Li e aceito os Termos e a Política de Privacidade"
- Botão de criar conta só habilita após o aceite
- Registro auditável: salva data, hora e versão dos termos aceitos no banco

### Banner de cookies
Banner discreto no rodapé na primeira visita, com botão "Aceitar" (válido por 365 dias).

### Por que isso importa
- Regulatório obrigatório no Brasil para tratar dados financeiros
- Protege a Novare e os assessores de questionamentos legais
- Necessário antes de vender o serviço para clientes externos

### Pendência operacional
A migration `APLICAR_LGPD.sql` precisa ser aplicada no Supabase Dashboard. Sem isso, o aceite aparece na tela mas não persiste no banco.

---

## 7. ✉️ Painel de teste de e-mail

### O que é
Em **`Admin → Configurações → Notificações`**, role até o card **"Testar envio de e-mail"**.

### Para que serve
Permite que o assessor envie um e-mail de teste com qualquer um dos templates do app **antes de cadastrar clientes reais**. Útil para:
- Validar se o Resend está funcionando
- Conferir como os e-mails aparecem na caixa do cliente
- Diagnosticar erros (o painel mostra detalhe técnico quando falha)

### Como usar
1. Informe um e-mail (sugestão: seu próprio email)
2. Escolha um dos 6 templates: Boas-vindas, Boas-vindas com senha, Atualização patrimonial, Ação concluída, Meta atingida, Diagnóstico atualizado
3. Clique em **"Enviar teste"**
4. Verifique a caixa de entrada (e o spam)

### Quando aparecer erro
O painel mostra a mensagem técnica. Os 3 motivos mais comuns:
- `RESEND_API_KEY` não configurada nas Secrets do Supabase
- Domínio `novareapp.com.br` não verificado no Resend
- Edge function não foi deployada com a versão mais recente

---

## 8. 📧 Leads de volta no painel do admin

### O que mudou
A página **Leads** (com abas Newsletter e PDF) voltou a aparecer no menu do admin. Item **"Leads"** adicionado no grupo "Gestão" do menu lateral, entre "Novo Cliente" e "Financeiro".

### Para que serve
- **Aba Newsletter**: lista de pessoas que se inscreveram para receber a newsletter da Novare
- **Aba PDF**: lista de pessoas que baixaram o PDF de lead magnet do site

### Por que isso importa
Antes, só o super-admin via os leads. Agora os assessores (admins) também têm acesso para fazer follow-up comercial.

---

## 9. 🛠️ Outras melhorias técnicas

### Integração com Resend
- As funções de envio de email agora chamam o Resend **diretamente**, sem passar por gateway intermediário (mais robusto, menos dependências)
- Erros agora mostram o motivo exato (antes só dizia "Resend error")
- Quando o envio dá certo, retorna o ID do email para rastreamento no Resend Dashboard

### Sincronização de histórico
- O **Relatório Final** agora busca **todos os lançamentos** do cliente (não só os do mês selecionado) — assim a evolução consultiva fica completa
- O **Acompanhamento de metas** preserva o histórico entre meses via `source_label` (não duplica registros quando o mês é clonado)
- O **Lançamento do mês** sincroniza com o mês selecionado no Onboarding (não fica fixo no "mês corrente")

---

## ✅ Pendências operacionais (a fazer pelo TI)

Antes de começar a operar com clientes reais, é preciso:

1. **Aplicar a migration LGPD** no Supabase Dashboard (`APLICAR_LGPD.sql`)
2. **Aplicar a migration de "Liberar lançamento"** se ainda não foi (`APLICAR_LIBERAR_LANCAMENTO.sql`)
3. **Configurar o Auth Hook** no Supabase para que e-mails de "Esqueci minha senha" funcionem
4. **Confirmar deploy** das edge functions `send-client-email` e `super-admin-invite`
5. **Rotacionar a chave do Resend** se já foi exposta

O time técnico já tem instruções detalhadas para cada item.

---

## 📞 Dúvidas?

Qualquer dúvida sobre como usar uma função específica, fale com o time técnico.

**Versão**: 5.0
**Data**: 28 de maio de 2026
