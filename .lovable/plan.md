
Vou implementar o salvamento/reaproveitamento dos personalizados na lista suspensa para escolhas futuras.

## Objetivo

Quando o usuário digitar um valor em `Personalizado`, esse valor deve passar a aparecer como opção normal nos próximos dropdowns daquele mesmo campo.

Exemplo em Seguros:
1. Em `Tipo`, usuário escolhe `Personalizado` e digita `teste`.
2. Ao adicionar outro seguro e abrir `Tipo`, a opção `teste` aparece junto com `Vida`, `Auto`, `Residencial`, etc.
3. Em `Seguradora`, se digitar uma seguradora personalizada, ela também aparece nas próximas escolhas de `Seguradora`.

## Como vou fazer

1. Criar utilitário para opções personalizadas
- Criar uma função reutilizável para:
  - remover `custom:` quando existir;
  - limpar espaços extras;
  - ignorar campos vazios;
  - evitar opções duplicadas;
  - comparar sem diferenciar maiúsculas/minúsculas;
  - juntar opções padrão + opções personalizadas já usadas.

2. Melhorar o componente `SelectWithCustom`
- Ajustar para exibir corretamente valores personalizados já salvos.
- Se o valor atual não estiver na lista padrão, ele poderá aparecer como opção selecionável.
- Manter o botão `Personalizado` no final da lista.
- Garantir que o texto apareça limpo, sem `custom:`.

3. Aplicar primeiro em Seguros
- Em `src/components/onboarding/StepSeguros.tsx`, aplicar a lógica em:
  - `Tipo`
  - `Seguradora`
- O dropdown vai ler os valores já existentes em todos os seguros cadastrados e adicioná-los automaticamente à lista.

4. Aplicar também nos principais campos com personalizado
- Para manter o comportamento consistente, aplicar a mesma regra em:
  - Despesas: `Categoria`
  - Dívidas: `Tipo` e `Credor`
  - Renda: `Descrição`, `Frequência` e `Estabilidade` quando personalizado for usado
  - Patrimônio: `Tipo`
  - Objetivos: `Descrição` e `Prioridade` quando personalizado for usado

5. Compatibilidade com dados atuais
- Dados antigos salvos como `custom:teste` continuarão funcionando.
- Dados já salvos apenas como `teste` também serão reconhecidos.
- Não será necessária migração no banco.

## Resultado esperado

Depois da alteração:

- Personalizados digitados serão reaproveitados automaticamente.
- Ao adicionar um novo item, os personalizados anteriores aparecerão no dropdown.
- O resumo/admin continuará exibindo texto limpo.
- O comportamento será igual em desktop e mobile.
- O usuário não precisará digitar o mesmo personalizado várias vezes.

## Arquivos que serão alterados

- `src/components/ui/select-with-custom.tsx`
- `src/components/onboarding/StepSeguros.tsx`
- `src/components/onboarding/StepDespesas.tsx`
- `src/components/onboarding/StepDividas.tsx`
- `src/components/onboarding/StepRenda.tsx`
- `src/components/onboarding/StepPatrimonio.tsx`
- `src/components/onboarding/StepObjetivos.tsx`

## Validação

Após implementar, vou validar:

1. Criar seguro com `Tipo` personalizado.
2. Criar seguro com `Seguradora` personalizada.
3. Adicionar novo seguro.
4. Confirmar que os dois personalizados aparecem nos dropdowns.
5. Repetir o teste em Despesas, Dívidas, Renda, Patrimônio e Objetivos.
6. Conferir que o app compila sem erros.
