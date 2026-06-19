import { describe, it, expect } from "vitest";
import {
  emergencyReserveBase,
  emergencyReserveMonths,
  netMonthlyCashFlow,
  savingsRatePct,
} from "@/lib/finance";

describe("emergencyReserveBase", () => {
  it("usa apenas o ativo rotulado como reserva/emergência, ignorando imóvel e veículo", () => {
    const assets = [
      { type: "Investimento", description: "Reserva de Emergência", estimated_value: 44000 },
      { type: "Imóvel", description: "Casa", estimated_value: 230000 },
      { type: "Veículo", description: "Carro", estimated_value: 15000 },
      { type: "Outros", description: "Trailer", estimated_value: 18000 },
    ];
    expect(emergencyReserveBase(assets)).toBe(44000);
  });

  it("cai para ativos líquidos (investimento/poupança) quando não há rótulo de reserva", () => {
    const assets = [
      { type: "Investimento", description: "CCB", estimated_value: 10000 },
      { type: "Imóvel", description: "Casa", estimated_value: 500000 },
    ];
    expect(emergencyReserveBase(assets)).toBe(10000);
  });

  it("retorna 0 quando só há ativos não-líquidos (imóvel/veículo)", () => {
    const assets = [
      { type: "Imóvel", description: "Casa", estimated_value: 1500000 },
      { type: "Veículo", description: "T-Cross", estimated_value: 150000 },
    ];
    expect(emergencyReserveBase(assets)).toBe(0);
  });

  it("é insensível a acentos e maiúsculas no rótulo", () => {
    const assets = [{ type: "POUPANÇA", description: "reserva de emergência", estimated_value: 5000 }];
    expect(emergencyReserveBase(assets)).toBe(5000);
  });

  it("soma múltiplos ativos rotulados como reserva", () => {
    const assets = [
      { type: "Investimento", description: "Reserva 1", estimated_value: 3000 },
      { type: "Poupança", description: "Reserva 2", estimated_value: 2000 },
    ];
    expect(emergencyReserveBase(assets)).toBe(5000);
  });
});

describe("emergencyReserveMonths", () => {
  it("divide a base líquida pelas despesas mensais", () => {
    const assets = [{ type: "Investimento", description: "Reserva de Emergência", estimated_value: 44000 }];
    expect(emergencyReserveMonths(assets, 5587)).toBeCloseTo(7.875, 2);
  });

  it("retorna 0 quando despesas são 0 (evita divisão por zero)", () => {
    const assets = [{ type: "Investimento", description: "Reserva", estimated_value: 10000 }];
    expect(emergencyReserveMonths(assets, 0)).toBe(0);
  });
});

describe("netMonthlyCashFlow / savingsRatePct", () => {
  it("desconta despesas E parcelas de dívida da renda", () => {
    expect(netMonthlyCashFlow(12008, 5587, 2714)).toBe(3707);
  });

  it("taxa de poupança usa o saldo líquido (com dívidas) sobre a renda", () => {
    expect(savingsRatePct(12008, 5587, 2714)).toBeCloseTo((3707 / 12008) * 100, 4);
  });

  it("taxa de poupança é 0 quando renda é 0", () => {
    expect(savingsRatePct(0, 1000, 500)).toBe(0);
  });

  it("saldo pode ser negativo quando gastos superam a renda", () => {
    expect(netMonthlyCashFlow(4400, 7900, 1200)).toBe(-4700);
  });
});
