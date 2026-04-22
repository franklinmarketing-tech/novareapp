## Melhorias recomendadas para a experiência de edição do Onboarding Admin

A melhor melhoria aqui é transformar a edição em uma experiência mais guiada, com menos fricção e mais segurança para o consultor editar rapidamente sem se perder.

## O que eu melhoraria

### 1. Trocar o modal atual por um painel de edição melhor

Hoje o usuário clica em `Editar` e abre uma janela. Eu melhoraria para um destes formatos:

- Desktop: painel lateral grande ou modal fullscreen centralizado.
- Mobile: tela/painel fullscreen.
- Com rolagem confiável.
- Cabeçalho fixo com o nome da seção.
- Rodapé fixo com `Cancelar` e `Salvar`.
- Total da seção visível enquanto edita.

Exemplo:

```text
Editar Despesas
Total atual: R$ 6.218,00/mês

[lista de despesas editável...]

Cancelar                         Salvar alterações
```

### 2. Mostrar status visual de alteração

Quando o usuário mexer em uma seção, mostrar algo como:

- `Alterado`
- `Não salvo`
- ponto laranja ao lado do título
- botão `Salvar` mais evidente

Exemplo no menu:

```text
Despesas
R$ 6.218,00/mês · Alterado
```

Isso evita o usuário sair achando que já salvou.

### 3. Melhorar a lista principal com ações rápidas

Na tela principal, além de `Editar`, eu melhoraria:

- clicar na linha inteira para abrir/fechar detalhes;
- botão `Editar` mais claro;
- mostrar quantidade de itens cadastrados;
- mostrar resumo mais inteligente.

Exemplo:

```text
Seguros
R$ 0,00/mês · 2 seguros
Editar
```

```text
Dívidas
R$ 15.816,13 · 3 dívidas
Editar
```

### 4. Melhorar cada item dentro da edição

Dentro de Renda, Despesas, Dívidas, Patrimônio, Seguros e Objetivos:

- cada item vira um card mais limpo;
- título do item mostra o nome preenchido;
- valor principal aparece no topo do card;
- botão de excluir fica mais visível;
- ao excluir, confirmar quando o item já tem dados preenchidos;
- novo item recém-adicionado recebe destaque visual.

Exemplo:

```text
Seguro 1
Vida · Porto Seguro                         R$ 120,00/mês
[campos editáveis...]
Excluir
```

### 5. Adicionar salvamento mais seguro

Melhorar o fluxo para evitar perda de dados:

- se fechar com alterações não salvas, mostrar confirmação;
- se clicar fora do modal com alterações, perguntar antes;
- mostrar `Salvando...`;
- mostrar `Salvo com sucesso`;
- em caso de erro, não fechar a edição.

### 6. Melhorar personalizados nos selects

Como você já pediu personalizados reutilizáveis, eu manteria isso e melhoraria a experiência:

- personalizados aparecem com etiqueta `Personalizado`;
- opção personalizada recém-criada aparece imediatamente;
- botão `Personalizado` sempre no fim;
- texto salvo aparece limpo, sem `custom:`;
- ao digitar personalizado, permitir confirmar com Enter.

Exemplo:

```text
Tipo
Vida
Auto
Residencial
teste        Personalizado
+ Personalizado
```



## Plano de implementação

### Etapa 1 — Melhorar o editor

Alterar `src/pages/admin/ClientOnboarding.tsx` para:

- melhorar o `DialogContent`;
- deixar cabeçalho e rodapé fixos;
- mostrar total/resumo da seção dentro do editor;
- impedir fechamento acidental se houver alterações não salvas;
- melhorar botões `Cancelar` e `Salvar`.

### Etapa 2 — Melhorar os cards editáveis

Atualizar os componentes:

- `StepRenda.tsx`
- `StepDespesas.tsx`
- `StepDividas.tsx`
- `StepPatrimonio.tsx`
- `StepSeguros.tsx`
- `StepObjetivos.tsx`

Para:

- mostrar título e valor resumido no topo de cada card;
- deixar excluir mais claro;
- destacar item novo;
- manter botão de adicionar sempre fácil de acessar;
- melhorar espaçamentos e leitura.

### Etapa 3 — Melhorar a lista principal

Em `ClientOnboarding.tsx`:

- mostrar quantidade de itens por seção;
- mostrar status `Alterado` quando houver edição não salva;
- melhorar layout do resumo abaixo do título;
- deixar a linha mais clicável e intuitiva;
- manter o botão `Editar` visível.

### Etapa 4 — Melhorar segurança de salvamento

Adicionar:

- confirmação ao tentar fechar com alterações;
- tratamento visual de erro ao salvar;
- não fechar automaticamente se o salvamento falhar;
- toast mais claro de sucesso/erro.

### Etapa 5 — Refinar personalizados

Em `SelectWithCustom.tsx` e campos relacionados:

- exibir personalizados reaproveitados com boa apresentação;
- permitir confirmar personalizado com Enter;
- manter opções personalizadas futuras funcionando em Seguros, Despesas, Dívidas, Renda, Patrimônio e Objetivos.

## Resultado esperado

Depois dessas melhorias, a edição ficará:

- mais clara;
- mais rápida;
- mais segura;
- menos dependente de abrir/fechar modal pequeno;
- com menos risco de perder alterações;
- mais fácil para o consultor revisar todo o onboarding;
- melhor em desktop e mobile.

## Arquivos principais envolvidos

- `src/pages/admin/ClientOnboarding.tsx`
- `src/components/ui/select-with-custom.tsx`
- `src/components/onboarding/StepRenda.tsx`
- `src/components/onboarding/StepDespesas.tsx`
- `src/components/onboarding/StepDividas.tsx`
- `src/components/onboarding/StepPatrimonio.tsx`
- `src/components/onboarding/StepSeguros.tsx`
- `src/components/onboarding/StepObjetivos.tsx`

## Minha recomendação

Eu começaria por estas 3 melhorias primeiro:

1. Editor maior com cabeçalho/rodapé fixos.
2. Indicador de alterações não salvas.
3. Cards editáveis com resumo no topo de cada item.

Essas três já devem melhorar bastante a experiência sem mudar a estrutura principal do sistema.