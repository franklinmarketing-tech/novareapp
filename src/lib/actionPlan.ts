// Cálculo de conclusão do plano de ação — fonte única de verdade.
//
// Um plano pode ser plano (só tarefas de topo) ou aninhado (tarefa-pai com
// subtarefas). A conclusão é medida pelas tarefas "folha": itens que não têm
// subtarefas. Assim, uma tarefa-pai com filhos não é contada (ela é apenas um
// agrupador; seu progresso vem dos filhos), mas uma tarefa de topo sem filhos
// conta normalmente. Isso evita que planos planos (sem subtarefas) apareçam
// sempre como 0% — bug que existia quando só os filhos eram contados.

export interface ActionItemLike {
  id: string;
  parent_id?: string | null;
  status?: string | null;
}

/** Tarefas folha = itens que não são pai de nenhum outro item. */
export const leafActionItems = <T extends ActionItemLike>(items: T[]): T[] => {
  const parentIds = new Set(items.filter((i) => i.parent_id).map((i) => i.parent_id as string));
  return items.filter((i) => !parentIds.has(i.id));
};

/** Conclusão do plano: { done, total, pct } com base nas tarefas folha. */
export const planCompletion = (
  items: ActionItemLike[],
): { done: number; total: number; pct: number } => {
  const leaves = leafActionItems(items);
  const total = leaves.length;
  const done = leaves.filter((i) => i.status === "concluido").length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
};
