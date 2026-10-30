import { describe, expect, it } from "vitest";
import {
  evaluateCategorization,
  loadCategorizationEvaluationDataset,
} from "@/lib/categorization-evaluation";
import { categorizeTransaction, TRANSACTION_CATEGORIES } from "@/lib/categorization";

describe("categorização de transações", () => {
  it("classifica descrições conhecidas e deixa descrições desconhecidas como Outros", () => {
    expect(categorizeTransaction("Corrida de aplicativo Uber")).toBe("Transporte");
    expect(categorizeTransaction("Supermercado Bom Preço")).toBe("Alimentação");
    expect(categorizeTransaction("Estabelecimento sem categoria")).toBe("Outros");
  });

  it("mede a acurácia em 120 transações fictícias rotuladas e balanceadas", () => {
    const dataset = loadCategorizationEvaluationDataset();
    const counts = new Map<string, number>();
    for (const sample of dataset) counts.set(sample.label, (counts.get(sample.label) ?? 0) + 1);

    expect(dataset).toHaveLength(120);
    expect([...counts.keys()].sort()).toEqual([...TRANSACTION_CATEGORIES].sort());
    expect([...counts.values()]).toEqual(Array(10).fill(12));
    expect(evaluateCategorization(dataset)).toEqual({
      total: 120,
      correct: 120,
      accuracy: 1,
    });
  });
});
