import { describe, it, expect } from "vitest";
import { mapAccount, mapTransaction, sumAvailableCash, sumCardDebt } from "@/lib/plaid/mappers";
import { syncAllTransactions } from "@/lib/plaid/sync";
import type { PlaidAccount, PlaidSyncPage, PlaidTransaction } from "@/lib/plaid/types";

const bal = (available: number | null, current: number | null, limit: number | null = null) => ({
  available,
  current,
  limit,
  iso_currency_code: "USD",
  unofficial_currency_code: null,
});
const checking: PlaidAccount = {
  account_id: "chk",
  name: "Plaid Checking",
  type: "depository",
  subtype: "checking",
  balances: bal(100, 110),
};
const card: PlaidAccount = {
  account_id: "cc",
  name: "Plaid Credit Card",
  type: "credit",
  subtype: "credit card",
  balances: bal(null, 410),
};
const biz: PlaidAccount = {
  account_id: "bcc",
  name: "Plaid Business Credit Card",
  type: "credit",
  subtype: "credit card",
  balances: bal(4980, 5020),
};

describe("conversão de contas", () => {
  it("conta corrente: available = disponível, current = saldo", () => {
    expect(mapAccount(checking)).toMatchObject({
      kind: "cash",
      available: 100,
      balance: 110,
      currency: "USD",
    });
  });
  it("cartão: current = dívida, available = crédito disponível", () => {
    expect(mapAccount(biz)).toMatchObject({
      kind: "credit",
      debt: 5020,
      availableCredit: 4980,
      limit: null,
    });
  });
  it("crédito não informado continua null", () => {
    expect(mapAccount(card)).toMatchObject({ debt: 410, availableCredit: null, limit: null });
  });
});

describe("separação entre saldo, crédito e dívida", () => {
  const accs = [checking, card, biz].map(mapAccount);
  it("dinheiro disponível ignora crédito dos cartões", () => {
    expect(sumAvailableCash(accs)).toBe(100);
  });
  it("dívida soma só cartões", () => {
    expect(sumCardDebt(accs)).toBe(5430);
  });
});

const tx = (id: string, amount: number): PlaidTransaction => ({
  transaction_id: id,
  account_id: "chk",
  amount,
  date: "2026-01-01",
  name: "x",
  pending: false,
  iso_currency_code: "USD",
  unofficial_currency_code: null,
});

describe("sinais das transações", () => {
  it("positivo é saída", () => {
    expect(mapTransaction(tx("a", 25.5))).toMatchObject({
      direction: "outflow",
      amount: 25.5,
      rawAmount: 25.5,
    });
  });
  it("negativo é entrada", () => {
    expect(mapTransaction(tx("b", -500))).toMatchObject({
      direction: "inflow",
      amount: 500,
      rawAmount: -500,
    });
  });
});

describe("paginação de /transactions/sync", () => {
  const page = (ids: string[], next: string, more: boolean): PlaidSyncPage => ({
    added: ids.map((i) => tx(i, 1)),
    modified: [],
    removed: [],
    next_cursor: next,
    has_more: more,
  });

  it("segue next_cursor enquanto has_more e retorna o último cursor", async () => {
    const seen: (string | null)[] = [];
    const pages: Record<string, PlaidSyncPage> = {
      start: page(["1"], "c1", true),
      c1: page(["2"], "c2", false),
    };
    const r = await syncAllTransactions(async (c) => {
      seen.push(c);
      return pages[c ?? "start"]!;
    }, null);
    expect(seen).toEqual([null, "c1"]);
    expect(r.added.map((t) => t.transaction_id)).toEqual(["1", "2"]);
    expect(r.nextCursor).toBe("c2");
  });

  it("recomeça do cursor original após erro de mutação, sem duplicar", async () => {
    let calls = 0;
    const r = await syncAllTransactions(async (c) => {
      calls++;
      if (calls === 2) throw { error_code: "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" };
      return c === "orig" ? page(["1"], "c1", true) : page(["2"], "c2", false);
    }, "orig");
    expect(r.added.map((t) => t.transaction_id)).toEqual(["1", "2"]);
    expect(r.nextCursor).toBe("c2");
  });
});
