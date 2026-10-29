// Conversões puras Plaid -> app. Sem rede, sem segredos.
import type { AppAccount, PlaidAccount, PlaidTransaction, Transaction } from "./types";

const currencyOf = (b: {
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
}) => b.iso_currency_code ?? b.unofficial_currency_code ?? null;

export function mapAccount(a: PlaidAccount): AppAccount {
  const currency = currencyOf(a.balances);
  if (a.type === "credit") {
    return {
      kind: "credit",
      id: a.account_id,
      name: a.name,
      currency,
      debt: a.balances.current,
      availableCredit: a.balances.available,
      limit: a.balances.limit,
    };
  }
  return {
    kind: "cash",
    id: a.account_id,
    name: a.name,
    currency,
    available: a.balances.available,
    balance: a.balances.current,
  };
}

export function mapTransaction(t: PlaidTransaction): Transaction {
  return {
    id: t.transaction_id,
    accountId: t.account_id,
    date: t.date,
    description: t.merchant_name ?? t.name,
    currency: currencyOf(t),
    amount: Math.abs(t.amount),
    direction: t.amount > 0 ? "outflow" : "inflow",
    rawAmount: t.amount,
    pending: t.pending,
  };
}

/** Soma só dinheiro disponível em contas; ignora dívida e crédito. Retorna null se nada foi informado. */
export function sumAvailableCash(accounts: AppAccount[]): number | null {
  const vals = accounts.flatMap((a) =>
    a.kind === "cash" && a.available != null ? [a.available] : [],
  );
  return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
}

export function sumCardDebt(accounts: AppAccount[]): number | null {
  const vals = accounts.flatMap((a) => (a.kind === "credit" && a.debt != null ? [a.debt] : []));
  return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
}
