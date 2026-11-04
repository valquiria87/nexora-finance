import { describe, it, expect } from "vitest";
import {
  DEMO_TRANSACTIONS,
  latestTransactions,
  spendingByCategory,
  answer,
  detectIntent,
  formatBRL,
  totalAvailableCash,
  totalCardDebt,
  DEMO_ACCOUNTS,
  SUGGESTIONS,
  displayCategory,
} from "@/lib/finance";

describe("regras financeiras", () => {
  it("as cinco sugestões permanecem disponíveis e incluem as principais intenções", () => {
    expect(SUGGESTIONS).toHaveLength(5);
    expect(detectIntent("Resuma minhas contas")).toBe("summary");
    expect(detectIntent("Quais foram minhas movimentações?")).toBe("transactions");
    expect(detectIntent("Mostre um resumo financeiro")).toBe("summary");
    expect(detectIntent("Qual é o resumo da minha situação financeira?")).toBe("summary");
  });
  it("o resumo separa dinheiro bancário, dívida e despesas", () => {
    const result = answer("Mostre um resumo financeiro");
    expect(result).toContain("**Dinheiro bancário disponível**: R$ 300,00");
    expect(result).toContain("**Dívida dos cartões**: R$ 5.430,00");
    expect(result).toContain("**Despesas registradas**: R$ 490,80");
    expect(result).toContain("**Movimentações recebidas**: 8");
  });
  it("resuma minhas contas apresenta saldos, dívida, crédito e origem Pluggy", () => {
    const accounts = [
      {
        id: "checking",
        name: "Conta Corrente",
        type: "checking" as const,
        currency: "BRL",
        balance: 36166.9,
        available: 36166.9,
      },
      {
        id: "card",
        name: "Mastercard Black",
        type: "credit" as const,
        currency: "BRL",
        debt: -838.5,
        availableCredit: 300000,
      },
    ];
    const result = answer("Resuma minhas contas", accounts, [], "pluggy");
    expect(result).toContain("Conta Corrente");
    expect(result).toContain("R$ 36.166,90");
    expect(result).toContain("Mastercard Black");
    expect(result).toContain("R$ 838,50");
    expect(result).toContain("R$ 300.000,00");
    expect(result).toContain("Pluggy Sandbox");
    expect(result).toContain("Dados fict");
  });
  it("contas e resumo vazios não inventam dados", () => {
    expect(answer("Resuma minhas contas", [], [])).toContain("N\u00e3o h\u00e1 dados financeiros");
    expect(answer("Mostre um resumo financeiro", [], [])).toContain("Não há dados financeiros");
    expect(answer("Qual é o resumo da minha situação financeira?", [], [])).toContain(
      "Não há dados financeiros",
    );
  });
  it("formata em R$ com vírgula decimal", () => {
    expect(formatBRL(110)).toBe("R$ 110,00");
    expect(formatBRL(5020)).toBe("R$ 5.020,00");
  });
  it("dinheiro disponível não inclui dívidas nem limite", () => {
    expect(totalAvailableCash(DEMO_ACCOUNTS)).toBe(300);
  });
  it("normaliza divida negativa sem somar limite ao dinheiro", () => {
    const accounts = [
      {
        id: "card",
        name: "Mastercard Black",
        type: "credit" as const,
        currency: "BRL",
        debt: -838.5,
        availableCredit: 300000,
      },
    ];
    const result = answer("Resuma minhas contas", accounts, [], "pluggy");
    expect(totalCardDebt(accounts)).toBe(838.5);
    expect(result).toContain("R$ 838,50");
    expect(result).toContain("R$ 300.000,00");
  });
  it("sem transações nos dados, não inventa", () => {
    expect(answer("Quais foram minhas últimas transações?", DEMO_ACCOUNTS, [])).toContain(
      "Não há transações",
    );
    expect(answer("Quanto gastei por categoria?", DEMO_ACCOUNTS, [])).toContain("Não há despesas");
  });
  it("crédito não informado é dito claramente", () => {
    expect(answer("Quais são minhas contas?")).toContain("crédito disponível não informado");
  });
});

describe("perguntas sobre cartão", () => {
  const r = answer("Posso usar o saldo do cartão de crédito para pagar uma compra?");
  it("não responde sobre transações", () => {
    expect(r).not.toContain("Não há transações");
  });
  it("usa o crédito informado do cartão empresarial", () => {
    expect(r).toContain("crédito disponível R$ 4.980,00");
  });
  it("não inventa o crédito do Plaid Credit Card", () => {
    expect(r).toContain(
      "Cartão de crédito**: dívida atual R$ 410,00; limite total não informado; crédito disponível não informado",
    );
  });
});

describe("regressão: cada pergunta recebe sua intenção", () => {
  const cases: [string, string][] = [
    ["Quanto dinheiro tenho disponível, sem contar o limite dos cartões de crédito?", "cash"],
    ["Qual é meu saldo disponível?", "cash"],
    ["Posso usar o saldo do cartão de crédito para pagar uma compra?", "card_purchase"],
    ["Posso fazer compras com o cartão?", "card_purchase"],
    ["Quanto realmente consumi no cartão?", "card_spending"],
    ["Quanto gastei no cartão de crédito?", "card_spending"],
    ["Qual é a dívida atual dos meus cartões?", "card_debt"],
    ["Quanto devo no cartão?", "card_debt"],
    ["Qual é o limite total do meu cartão?", "card_limit"],
    ["Quanto tenho de crédito disponível?", "card_limit"],
    ["Quais foram minhas últimas transações?", "transactions"],
    ["Quanto gastei por categoria?", "categories"],
    [
      "Liste os gastos por categoria das contas bancárias. Não quero saldo disponível nem dívida de cartão; exclua movimentações de cartão cujo tipo não foi identificado.",
      "categories",
    ],
    ["Quanto gastei por categoria e qual é meu saldo disponível?", "categories"],
    ["Quais são minhas contas?", "accounts"],
  ];
  it.each(cases)("%s → %s", (q, intent) => {
    expect(detectIntent(q)).toBe(intent);
  });

  it("dinheiro disponível sem limite soma só contas bancárias: R$ 300,00", () => {
    const r = answer(
      "Quanto dinheiro tenho disponível, sem contar o limite dos cartões de crédito?",
    );
    expect(r).toContain("**R$ 300,00**");
    expect(r).not.toContain("Sim, um cartão de crédito permite");
    expect(r).not.toContain("4.980");
  });
  it("dívida dos cartões soma R$ 5.430,00", () => {
    expect(answer("Qual é a dívida atual dos meus cartões?")).toContain("**R$ 5.430,00**");
  });
  it("limite não inventa valores", () => {
    const r = answer("Qual é o limite total do meu cartão?");
    expect(r).toContain(
      "Cartão de crédito**: limite total não informado; crédito disponível não informado",
    );
    expect(r).toContain(
      "Cartão de crédito empresarial**: limite total não informado; crédito disponível R$ 4.980,00",
    );
  });
  it("saldo disponível ausente não é inventado nem somado", () => {
    expect(
      totalAvailableCash([{ id: "x", name: "X", type: "checking", currency: "USD", balance: 50 }]),
    ).toBe(0);
  });
});

describe("transações e gastos por categoria", () => {
  it("últimas transações vêm da mais recente para a mais antiga", () => {
    expect(latestTransactions(DEMO_TRANSACTIONS).map((t) => t.id)).toEqual([
      "t8",
      "t7",
      "t6",
      "t5",
      "t4",
    ]);
  });
  it("resposta de transações mostra despesa e entrada com sinais", () => {
    const r = answer("Quais foram minhas últimas transações?");
    expect(r).toContain("18/10/2026 · **Combustível** · despesa na conta −R$ 150,00");
    expect(r).toContain("**Rendimento da poupança** · entrada na conta +R$ 1,75");
    expect(r).not.toContain("Salário");
  });
  it("gastos por categoria somam só despesas", () => {
    expect(spendingByCategory(DEMO_TRANSACTIONS)).toEqual([
      { category: "Transporte", total: 173.9 },
      { category: "Alimentação", total: 147.9 },
      { category: "Moradia", total: 120 },
      { category: "Serviços", total: 49 },
    ]);
  });
  it("traduz categorias Pluggy na resposta sem alterar a categoria original", () => {
    const pluggyTransactions = [
      {
        id: "h",
        accountId: "bank",
        date: "2026-10-01",
        description: "Condomínio",
        amount: 4000,
        category: "Housing",
      },
      {
        id: "e",
        accountId: "bank",
        date: "2026-10-02",
        description: "Luz",
        amount: 1110,
        category: "Electricity",
      },
      {
        id: "t",
        accountId: "bank",
        date: "2026-10-03",
        description: "Internet",
        amount: 720,
        category: "Telecommunications",
      },
      {
        id: "c",
        accountId: "bank",
        date: "2026-10-04",
        description: "Fatura",
        amount: 503.1,
        category: "Credit card payment",
      },
      {
        id: "b",
        accountId: "bank",
        date: "2026-10-05",
        description: "Boleto",
        amount: 100,
        category: "Transfer - Bank Slip",
      },
    ];
    const result = answer("Quanto gastei por categoria?", [], pluggyTransactions, "pluggy");
    expect(result).toContain("**Moradia**: R$ 4.000,00");
    expect(result).toContain("**Eletricidade**: R$ 1.110,00");
    expect(result).toContain("**Telecomunicações**: R$ 720,00");
    expect(result).toContain(
      "**Pagamento de fatura (fora do total de gastos por categoria)**: R$ 503,10",
    );
    expect(result).toContain("**Transferência – boleto**: R$ 100,00");
    expect(result).toContain("**R$ 5.930,00**");
    expect(result).toContain("não é somado ao total acima");
    expect(displayCategory("Housing")).toBe("Moradia");
    expect(displayCategory("Categoria nova")).toBe("Categoria nova");
    expect(pluggyTransactions[0]?.category).toBe("Housing");
  });
  it("resposta de categorias traz total R$ 490,80 sem renda", () => {
    const r = answer("Quanto gastei por categoria?");
    expect(r).toContain("**R$ 490,80**");
    expect(r).not.toContain("**Renda**");
  });
  it("transações não alteram o dinheiro disponível", () => {
    expect(answer("Qual é meu saldo disponível?")).toContain("**R$ 300,00**");
  });
});

describe("consumo identificado no cartão", () => {
  const accounts = [
    { id: "bank", name: "Conta corrente", type: "checking" as const, currency: "BRL" },
    { id: "card", name: "Mastercard Black", type: "credit" as const, currency: "BRL", debt: 838.5 },
  ];
  const transactions = [
    {
      id: "purchase",
      accountId: "card",
      date: "2026-10-01",
      description: "Mercado",
      amount: 120,
      category: "Alimentação",
      classification: "card-expense" as const,
    },
    {
      id: "unknown",
      accountId: "card",
      date: "2026-10-02",
      description: "Movimento incerto",
      amount: -89.9,
      category: "Serviços",
      classification: "card-unknown" as const,
    },
    {
      id: "credit",
      accountId: "card",
      date: "2026-10-03",
      description: "Crédito",
      amount: -20,
      category: "Outros",
      classification: "card-credit" as const,
    },
    {
      id: "payment",
      accountId: "bank",
      date: "2026-10-04",
      description: "Pagamento de fatura",
      amount: 503.1,
      category: "Credit card payment",
    },
  ];

  it("soma somente compras identificadas e discrimina movimentos ambíguos e créditos", () => {
    const result = answer("Quanto realmente consumi no cartão?", accounts, transactions, "pluggy");
    expect(result).toContain(
      "**Compras identificadas no cartão**: R$ 120,00 em 1 movimentação(ões).",
    );
    expect(result).toContain(
      "Movimentações de cartão sem tipo identificado**: 1 registro(s), totalizando R$ 89,90",
    );
    expect(result).toContain(
      "Créditos identificados no cartão**: 1 registro(s), totalizando R$ 20,00",
    );
    expect(result).not.toContain("R$ 503,10");
  });
});

describe("movimentações de cartão sem identificação", () => {
  const accounts = [
    { id: "card", name: "Mastercard Black", type: "credit" as const, currency: "BRL", debt: 838.5 },
  ];
  const transactions = [
    {
      id: "unknown-credit",
      accountId: "card",
      date: "2026-10-10",
      description: "SMART FIT ACADEMIA",
      amount: -89.9,
      category: "Serviços",
      classification: "card-unknown" as const,
    },
  ];

  it("não chama movimentação ambígua de estorno nem de compra", () => {
    const result = answer("Quais foram minhas movimentações?", accounts, transactions, "pluggy");
    expect(result).toContain("movimentação no cartão — tipo não identificado");
    expect(result).not.toContain("estorno identificado");
    expect(result).toContain("não forneceu detalhes suficientes");
  });

  it("não soma movimentação ambígua como despesa por categoria", () => {
    expect(spendingByCategory(transactions)).toEqual([]);
    expect(answer("Quanto gastei por categoria?", accounts, transactions, "pluggy")).toContain(
      "Não há despesas",
    );
  });
});
