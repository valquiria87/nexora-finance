import { describe, expect, it } from "vitest";
import { mapPlaidAccounts } from "@/lib/plaid-snapshot";
import type { PlaidSnapshotAccount } from "@/lib/plaid-snapshot";
import { totalAvailableCash } from "@/lib/finance";

const account = (type: string, subtype: string, id = subtype): PlaidSnapshotAccount => ({
  account_id: id,
  name: `Plaid ${subtype}`,
  type,
  subtype,
  balances: {
    available: 100,
    current: 120,
    limit: null,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
  },
});

describe("classificação de contas Plaid no dashboard", () => {
  it("mantém checking, savings e credit nas categorias corretas", () => {
    expect(
      mapPlaidAccounts([
        account("depository", "checking"),
        account("depository", "savings"),
        account("credit", "credit card"),
      ]).map(({ type }) => type),
    ).toEqual(["checking", "savings", "credit"]);
  });

  it("preserva CD, money market, HSA e cash management como outras contas", () => {
    const mapped = mapPlaidAccounts([
      account("depository", "cd"),
      account("depository", "money market"),
      account("depository", "hsa"),
      account("depository", "cash management"),
    ]);
    expect(mapped.map(({ type }) => type)).toEqual(["other", "other", "other", "other"]);
    expect(mapped.every(({ available }) => available === undefined)).toBe(true);
    expect(mapped.every(({ balance }) => balance === 120)).toBe(true);
  });

  it("não inclui contas de investimento nem empréstimos como dinheiro disponível", () => {
    expect(
      mapPlaidAccounts([
        account("investment", "ira"),
        account("investment", "401k"),
        account("loan", "student"),
        account("loan", "mortgage"),
      ]),
    ).toEqual([]);
  });

  it("não soma outras contas ao saldo disponível de checking/savings", () => {
    const mapped = mapPlaidAccounts([
      account("depository", "checking", "checking-1"),
      account("depository", "cd", "cd-1"),
      account("depository", "money market", "mm-1"),
    ]);
    expect(totalAvailableCash(mapped)).toBe(100);
  });
});
