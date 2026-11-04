import { describe, expect, it } from "vitest";
import {
  analyzeTransactions,
  routeIntent,
  sumTransactionsByCurrency,
} from "../../supabase/functions/dio-chat/category-analysis.ts";

const labels = {
  FOOD_AND_DRINK: "Alimentação",
  TRANSFER_OUT: "Transferências de saída",
};

const tx = (
  amount: number,
  currency: string | null,
  options: { pending?: boolean; category?: string } = {},
) => ({
  amount,
  pending: options.pending ?? false,
  iso_currency_code: currency,
  unofficial_currency_code: null,
  personal_finance_category: options.category ? { primary: options.category } : null,
});

describe("analyzeTransactions", () => {
  it("separa a mesma categoria por moeda, sem conversão ou soma cruzada", () => {
    const result = analyzeTransactions(
      [
        tx(100, "USD", { category: "FOOD_AND_DRINK" }),
        tx(50, "BRL", { category: "FOOD_AND_DRINK" }),
      ],
      labels,
    );

    expect(result.categories).toEqual([
      { category: "Alimentação", currency: "BRL", count: 1, total: 50 },
      { category: "Alimentação", currency: "USD", count: 1, total: 100 },
    ]);
  });

  it("classifica saídas, entradas, pendências e valores zerados sem perder registros", () => {
    const result = analyzeTransactions(
      [
        tx(20, "USD", { category: "FOOD_AND_DRINK" }),
        tx(-10, "USD"),
        tx(5, "USD", { pending: true }),
        tx(-3, "USD", { pending: true }),
        tx(0, "USD"),
        tx(7, "USD"),
      ],
      labels,
    );

    expect(result.confirmedOutCount).toBe(2);
    expect(result.confirmedInCount).toBe(1);
    expect(result.pendingOutCount).toBe(1);
    expect(result.pendingInCount).toBe(1);
    expect(result.zeroAmountCount).toBe(1);
    expect(
      result.confirmedOutCount +
        result.confirmedInCount +
        result.pendingOutCount +
        result.pendingInCount +
        result.zeroAmountCount,
    ).toBe(6);
    expect(result.categories.reduce((sum, row) => sum + row.count, 0)).toBe(2);
  });

  it("mantém saídas confirmadas sem categoria em um grupo explícito", () => {
    const result = analyzeTransactions([tx(12, "EUR")], labels);
    expect(result.categories).toEqual([
      { category: "Sem categoria informada", currency: "EUR", count: 1, total: 12 },
    ]);
  });
});

describe("sumTransactionsByCurrency", () => {
  it("separa entradas e saídas por moeda", () => {
    const transactions = [tx(-10, "USD"), tx(-20, "BRL"), tx(7, "USD")];
    expect(sumTransactionsByCurrency(transactions, (item) => item.amount < 0)).toEqual([
      { currency: "BRL", total: 20, count: 1 },
      { currency: "USD", total: 10, count: 1 },
    ]);
  });
});

describe("routeIntent", () => {
  it("prioriza resumo geral quando também menciona categorias de despesas", () => {
    expect(
      routeIntent(
        "Faça um resumo geral das minhas movimentações, separando entradas, saídas e as três principais categorias de despesas.",
      ),
    ).toBe("resumo");
  });

  it("mantém perguntas específicas de gastos na rota de categorias", () => {
    expect(routeIntent("Mostre meus gastos por categoria.")).toBe("categoria");
  });
});
