# Próximas melhorias do Onboarding — o que ainda dá para evoluir

A Fase 1 + auto-save da Fase 2 já estão no ar. Aqui vão as melhorias **mais impactantes que ainda faltam**, organizadas pelo retorno percebido pelo cliente.

---



---

## 2. Mobile-first premium (alto impacto · médio esforço)

**Bottom sheet ao adicionar item (mobile)**

- Em telas <768px, o botão "Adicionar despesa/renda/patrimônio" abre um **sheet inferior** com os campos focados, em vez de empilhar mais um card.
- Categorias viram **chips grandes com ícone** (ex: 🏠 Moradia, 🚗 Transporte) — toque único seleciona.

**Gestos de navegação**

- Swipe horizontal entre micro-steps.
- CTA inferior com altura mínima 52px (tap target confortável).

**Telas de transição cinematográficas**

- StepWelcome e StepTransition com **mesh gradient animado** de fundo (já temos a estrutura, falta o efeito).
- Mini-preview animado: ícones dos próximos steps flutuando sutilmente ("Renda → Despesas → Dívidas").

---

## 3. Gamificação e finalização (médio impacto · médio esforço)

**Marcos de conquista**

- Card de celebração ao terminar Identificação: "🎉 Você desbloqueou 30% do seu diagnóstico" com mini-progress.
- Badge sutil em transições: "Seção 2 de 3 concluída".

**Cronômetro adaptativo visível**

- O hook `useOnboardingTimer` já existe — falta exibir "≈ 4 min restantes" no header, atualizando conforme o ritmo real.

**/**

---

## 4. Confiança e transparência (médio impacto · baixo esforço)

**Microcopy de confiança**

- Selo discreto no header: "🔒 Dados criptografados · LGPD".
- Tooltip em campos sensíveis (CPF, renda): "Visível apenas para você e seu consultor".

**Botão "Salvar e continuar depois"**

- Já salvamos automaticamente — falta um CTA explícito que confirma "✓ Tudo salvo. Você pode fechar e voltar quando quiser".

**Recuperação de erro melhor**

- Quando o save falha (status `error` no SaveIndicator), mostrar toast com botão **"Tentar novamente"** que reexecuta o save da seção atual.

---

