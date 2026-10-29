// Tipos neutros do app + formatos mínimos de resposta do Plaid (somente tipos, sem chamadas).

export interface CashAccount {
  kind: "cash";
  id: string;
  name: string;
  currency: string | null;
  /** Dinheiro disponível; null = não informado. */
  available: number | null;
  /** Saldo da conta; null = não informado. */
  balance: number | null;
}

export interface CreditAccount {
  kind: "credit";
  id: string;
  name: string;
  currency: string | null;
  /** Dívida atual (o que se deve ao emissor); null = não informado. */
  debt: number | null;
  /** Crédito ainda utilizável; null = não informado. Nunca é dinheiro próprio. */
  availableCredit: number | null;
  /** Limite total; null = não informado. */
  limit: number | null;
}

export type AppAccount = CashAccount | CreditAccount;

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  currency: string | null;
  /** Valor absoluto da movimentação. */
  amount: number;
  /** Plaid: positivo = saída de dinheiro; negativo = entrada. */
  direction: "outflow" | "inflow";
  /** Valor original do Plaid, sinal preservado. */
  rawAmount: number;
  pending: boolean;
}

export interface PlaidBalances {
  available: number | null;
  current: number | null;
  limit: number | null;
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string | null;
  balances: PlaidBalances;
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
}

export interface PlaidSyncPage {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  next_cursor: string;
  has_more: boolean;
}
