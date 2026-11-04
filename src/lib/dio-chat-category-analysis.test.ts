import { describe, expect, it } from "vitest";
import {
  analyzeTransactions,
  classifyBalanceAccounts,
  dispatchChatIntent,
  requestedRecentLimit,
  routeIntent,
  selectRecentTransactions,
  sumAccountsByCurrency,
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
  it("soma apenas entradas confirmadas por moeda quando filtradas", () => {
    const transactions = [
      tx(-10, "USD"),
      tx(-20, "BRL"),
      tx(-5, "USD", { pending: true }),
      tx(7, "USD"),
    ];
    expect(
      sumTransactionsByCurrency(transactions, (item) => !item.pending && item.amount < 0),
    ).toEqual([
      { currency: "BRL", total: 20, count: 1 },
      { currency: "USD", total: 10, count: 1 },
    ]);
  });

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

  it("reconhece perguntas sobre entradas confirmadas", () => {
    expect(routeIntent("Mostre minhas entradas confirmadas por moeda.")).toBe("entradas");
    expect(routeIntent("Quais receitas foram recebidas?")).toBe("entradas");
  });

  it("encaminha uma pergunta sobre entradas confirmadas para o handler de entradas", () => {
    const handlers = {
      contas: () => "contas",
      saldos: () => "saldos",
      recentes: () => "recentes",
      entradas: () => "incomeAnswer",
      categoria: () => "categoria",
      resumo: () => "resumo",
    };

    const intent = routeIntent("Mostre minhas entradas confirmadas por moeda.");
    expect(intent).toBe("entradas");
    if (intent === "ajuda") throw new Error("A pergunta deveria ser reconhecida.");
    expect(dispatchChatIntent(intent, handlers)).toBe("incomeAnswer");
  });

  it("prioriza a listagem completa de contas mesmo quando a pergunta menciona saldos e tipos", () => {
    expect(
      routeIntent("Liste todas as contas e seus tipos e saldos, incluindo CD, IRA e 401(k)."),
    ).toBe("contas");
    expect(routeIntent("Quais contas existem, incluindo investimentos?")).toBe("contas");
  });

  it("mantém perguntas específicas de gastos na rota de categorias", () => {
    expect(routeIntent("Mostre meus gastos por categoria.")).toBe("categoria");
  });
});

describe("classifyBalanceAccounts", () => {
  it("inclui depósitos sem saldo disponível e separa investimentos de dívidas", () => {
    const accounts = [
      { type: "depository", subtype: "checking", balances: { available: 100 } },
      { type: "depository", subtype: "cd", balances: { available: null } },
      { type: "investment", subtype: "ira", balances: { available: null } },
      { type: "investment", subtype: "401k", balances: { available: null } },
      { type: "loan", subtype: "student", balances: { available: null } },
      { type: "other", subtype: "unknown", balances: { available: null } },
    ];
    const groups = classifyBalanceAccounts(accounts);
    expect(groups.deposits).toHaveLength(2);
    expect(groups.investments.map((account) => account.subtype)).toEqual(["ira", "401k"]);
    expect(groups.debts).toHaveLength(1);
    expect(groups.otherAssets.map((account) => account.subtype)).toEqual(["unknown"]);
    expect(
      groups.deposits.length +
        groups.investments.length +
        groups.debts.length +
        groups.otherAssets.length,
    ).toBe(accounts.length);
  });
});

describe("recent transaction limits", () => {
  it("uses five transactions by default and reads explicit requested counts", () => {
    expect(requestedRecentLimit("Mostre minhas últimas transações.")).toBe(5);
    expect(requestedRecentLimit("Mostre exatamente 10 transações.")).toBe(10);
    expect(requestedRecentLimit("Mostre as últimas 8.")).toBe(8);
    expect(requestedRecentLimit("Mostre 12 últimas transações.")).toBe(12);
  });

  it("caps unusually large requests at twenty and ignores zero", () => {
    expect(requestedRecentLimit("Mostre 99 transações.")).toBe(20);
    expect(requestedRecentLimit("Mostre 0 transações.")).toBe(5);
  });

  it("returns the requested number in newest-first order without mutating the source", () => {
    const transactions = [
      { id: "old", date: "2026-10-01" },
      { id: "newest", date: "2026-10-26" },
      { id: "middle", date: "2026-10-20" },
    ];
    expect(selectRecentTransactions(transactions, 2).map((item) => item.id)).toEqual([
      "newest",
      "middle",
    ]);
    expect(transactions.map((item) => item.id)).toEqual(["old", "newest", "middle"]);
  });
});

describe("sumAccountsByCurrency", () => {
  it("soma valores de contas por moeda e preserva valores ausentes", () => {
    const accounts = [
      {
        type: "depository",
        subtype: "checking",
        balances: {
          available: 100,
          current: 110,
          limit: null,
          iso_currency_code: "USD",
          unofficial_currency_code: null,
        },
      },
      {
        type: "depository",
        subtype: "cd",
        balances: {
          available: null,
          current: 1000,
          limit: null,
          iso_currency_code: "USD",
          unofficial_currency_code: null,
        },
      },
      {
        type: "investment",
        subtype: "ira",
        balances: {
          available: null,
          current: 320.76,
          limit: null,
          iso_currency_code: "USD",
          unofficial_currency_code: null,
        },
      },
      {
        type: "loan",
        subtype: "student",
        balances: {
          available: null,
          current: 500,
          limit: null,
          iso_currency_code: "BRL",
          unofficial_currency_code: null,
        },
      },
    ];

    expect(sumAccountsByCurrency(accounts, (account) => account.balances.available)).toEqual([
      { currency: "BRL", total: 0, count: 0, missingCount: 1 },
      { currency: "USD", total: 100, count: 1, missingCount: 2 },
    ]);
    expect(sumAccountsByCurrency(accounts, (account) => account.balances.current)).toEqual([
      { currency: "BRL", total: 500, count: 1, missingCount: 0 },
      { currency: "USD", total: 1430.76, count: 3, missingCount: 0 },
    ]);
  });
});
