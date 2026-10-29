import { describe, expect, it } from "vitest";
import {
  DEMO_ACCOUNTS,
  DEMO_TRANSACTIONS,
  demoProvider,
  spendingByCategory,
  totalAvailableCash,
  totalCardDebt,
} from "@/lib/finance";

// Valores exibidos nos cards do painel (src/components/finchat/Dashboard.tsx).
describe("cálculos do painel", () => {
  it("saldo disponível soma só contas bancárias: 100 + 200 = 300", () => {
    expect(totalAvailableCash(demoProvider.getAccounts())).toBe(300);
  });

  it("saldo disponível ignora dívidas, limites e crédito dos cartões", () => {
    const cash = totalAvailableCash(DEMO_ACCOUNTS);
    expect(cash).not.toBe(300 + 4980); // crédito disponível do cartão business
    expect(cash).toBeLessThan(totalCardDebt(DEMO_ACCOUNTS));
  });

  it("dívida total dos cartões: 410 + 5020 = 5430", () => {
    expect(totalCardDebt(demoProvider.getAccounts())).toBe(5430);
  });

  it("gastos por categoria batem com as transações de demonstração", () => {
    const cats = spendingByCategory(demoProvider.getTransactions());
    expect(cats).toEqual([
      { category: "Transporte", total: 173.9 },
      { category: "Alimentação", total: 147.9 },
      { category: "Moradia", total: 120 },
      { category: "Serviços", total: 49 },
    ]);
  });

  it("total de gastos do painel: 490,80 (entradas como salário não entram)", () => {
    const total = spendingByCategory(DEMO_TRANSACTIONS).reduce((s, c) => s + c.total, 0);
    expect(total).toBeCloseTo(490.8, 2);
  });
});
