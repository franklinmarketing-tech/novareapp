
## Plano para refinar o menu de edição do Onboarding Admin

Vou aplicar as três melhorias diretamente em `src/pages/admin/ClientOnboarding.tsx`, mantendo o layout atual que já está bom, apenas deixando as informações mais claras.

## O que será alterado

### 1. Mensagens orientativas quando a seção estiver vazia

Hoje o resumo mostra contagens como:

```text
R$ 0,00/mês · 0 seguros
R$ 0,00 · 0 objetivos
```

Vou substituir por mensagens mais úteis, por exemplo:

```text
Seguros
Nenhum seguro cadastrado · Adicionar seguro

Objetivos
Nenhum objetivo cadastrado · Adicionar objetivo
```

Também aplicarei o mesmo padrão nas seções repetíveis:

- Renda: `Nenhuma renda cadastrada · Adicionar renda`
- Despesas: `Nenhuma despesa cadastrada · Adicionar despesa`
- Dívidas: `Nenhuma dívida cadastrada · Adicionar dívida`
- Patrimônio: `Nenhum ativo cadastrado · Adicionar ativo`
- Seguros: `Nenhum seguro cadastrado · Adicionar seguro`
- Objetivos: `Nenhum objetivo cadastrado · Adicionar objetivo`

Quando houver itens cadastrados, mantém o resumo com total e quantidade.

---

### 2. Etiqueta visual `Alterado`

Hoje existe apenas o ponto laranja e o texto `Alterado` junto do resumo.

Vou transformar isso em uma etiqueta visual mais evidente:

```text
Alterado
```

Com estilo discreto, mas visível:

- fundo em tom laranja/accent suave;
- texto em accent;
- borda arredondada;
- posicionada ao lado do nome da seção;
- mantendo também o ponto laranja como reforço visual.

Exemplo:

```text
Despesas   Alterado
R$ 6.218,00/mês · 4 despesas
```

---

### 3. Destacar o valor principal da seção

Hoje o resumo inteiro aparece com a mesma força visual.

Vou separar o resumo em duas partes:

```text
Renda
R$ 12.008,00/mês
4 fontes
```

O valor principal ficará com:

- fonte maior;
- peso mais forte;
- `tabular-nums` para valores alinhados;
- cor mais forte.

A informação secundária ficará menor e mais discreta:

- quantidade de itens;
- chamada para adicionar quando vazio;
- informações complementares.

Exemplos:

```text
Renda
R$ 12.008,00/mês
4 fontes
```

```text
Seguros
Nenhum seguro cadastrado
Adicionar seguro
```

```text
Objetivos
R$ 120.000,00
2 objetivos
```

---

## Ajuste técnico

Vou substituir o campo `summary` simples por uma estrutura mais rica por seção, por exemplo:

```ts
{
  title: "Seguros",
  primarySummary: "R$ 320,00/mês",
  secondarySummary: "2 seguros",
  emptyPrimary: "Nenhum seguro cadastrado",
  emptySecondary: "Adicionar seguro"
}
```

Assim o menu consegue renderizar:

- valor principal destacado;
- texto secundário discreto;
- estado vazio orientativo;
- etiqueta `Alterado` separada do texto.

## Arquivo que será alterado

- `src/pages/admin/ClientOnboarding.tsx`

## Resultado esperado

Depois da alteração, o menu ficará mais fácil de ler:

- seções vazias deixam claro o que falta preencher;
- seções alteradas ficam mais evidentes antes de salvar;
- valores financeiros principais aparecem com mais destaque;
- quantidades e detalhes ficam visivelmente secundários;
- a experiência atual será preservada, apenas refinada.
