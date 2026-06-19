import { describe, it, expect } from "vitest";
import { leafActionItems, planCompletion } from "@/lib/actionPlan";

describe("planCompletion", () => {
  it("plano plano (só tarefas de topo, sem subtarefas): conta todas as tarefas", () => {
    const items = [
      { id: "a", parent_id: null, status: "concluido" },
      { id: "b", parent_id: null, status: "pendente" },
    ];
    expect(planCompletion(items)).toEqual({ done: 1, total: 2, pct: 50 });
  });

  it("plano aninhado: conta só as folhas (pai com filhos não conta)", () => {
    const items = [
      { id: "p", parent_id: null, status: "pendente" }, // pai com filhos — não conta
      { id: "c1", parent_id: "p", status: "concluido" },
      { id: "c2", parent_id: "p", status: "concluido" },
      { id: "c3", parent_id: "p", status: "pendente" },
    ];
    expect(planCompletion(items)).toEqual({ done: 2, total: 3, pct: 67 });
  });

  it("misto: pai sem filhos conta como folha; pai com filhos não", () => {
    const items = [
      { id: "flat", parent_id: null, status: "concluido" }, // folha (sem filhos)
      { id: "p", parent_id: null, status: "pendente" }, // pai com 1 filho — não conta
      { id: "c1", parent_id: "p", status: "pendente" },
    ];
    // folhas: "flat" (done) e "c1" (pendente) => 1/2
    expect(planCompletion(items)).toEqual({ done: 1, total: 2, pct: 50 });
  });

  it("plano vazio: 0% sem divisão por zero", () => {
    expect(planCompletion([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it("leafActionItems exclui pais que têm filhos", () => {
    const items = [
      { id: "p", parent_id: null, status: "x" },
      { id: "c", parent_id: "p", status: "x" },
      { id: "solo", parent_id: null, status: "x" },
    ];
    expect(leafActionItems(items).map((i) => i.id).sort()).toEqual(["c", "solo"]);
  });
});
