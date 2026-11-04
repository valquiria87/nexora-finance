import type { DemoAccount, DemoTransaction } from "@/lib/finance";

export interface PlaidSnapshotAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string | null;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
    iso_currency_code: string | null;
    unofficial_currency_code: string | null;
  };
}
export interface PlaidSnapshotTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
  personal_finance_category?: { primary?: string } | null;
}
export interface PlaidSnapshot {
  accounts: PlaidSnapshotAccount[];
  transactions: PlaidSnapshotTransaction[];
  inicio: string;
  fim: string;
}
export interface PlaidSnapshotResponse {
  snapshot: PlaidSnapshot;
  fonte: string;
}

const CATEGORY_PT: Record<string, string> = {
  FOOD_AND_DRINK: "Alimentação",
  TRANSPORTATION: "Transporte",
  TRANSFER_OUT: "Transferências de saída",
  TRANSFER_IN: "Transferências de entrada",
  LOAN_PAYMENTS: "Pagamentos de empréstimos/cartões",
  RENT_AND_UTILITIES: "Aluguel e contas",
  TRAVEL: "Viagens",
  GENERAL_MERCHANDISE: "Compras em geral",
  PERSONAL_CARE: "Cuidados pessoais",
  INCOME: "Renda",
  ENTERTAINMENT: "Lazer",
  MEDICAL: "Saúde",
  GENERAL_SERVICES: "Serviços",
  BANK_FEES: "Tarifas bancárias",
  HOME_IMPROVEMENT: "Casa",
  GOVERNMENT_AND_NON_PROFIT: "Governo e doações",
  OTHER: "Outros",
};

const currencyOf = (value: {
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
}) => value.iso_currency_code ?? value.unofficial_currency_code ?? null;

export function mapPlaidAccounts(accounts: PlaidSnapshotAccount[]): DemoAccount[] {
  return accounts.flatMap((account) => {
    // Preserve depository accounts, but only checking/savings count as liquid cash.
    // CDs, money markets, HSAs and cash-management accounts stay "other".
    if (account.type !== "depository" && account.type !== "credit") return [];
    const currency = currencyOf(account.balances);
    const type =
      account.type === "credit"
        ? "credit"
        : account.subtype === "checking"
          ? "checking"
          : account.subtype === "savings"
            ? "savings"
            : "other";
    const current = account.balances.current;
    const available = account.balances.available;
    return [
      {
        id: account.account_id,
        name: account.name || "Conta sem nome",
        type,
        currency,
        ...(current != null ? { balance: Math.abs(current) } : {}),
        ...(type === "credit"
          ? {
              ...(current != null ? { debt: Math.abs(current) } : {}),
              ...(account.balances.limit != null && current != null
                ? { availableCredit: Math.max(0, account.balances.limit - Math.abs(current)) }
                : {}),
            }
          : type === "other"
            ? {}
            : available != null
              ? { available: Math.max(0, available) }
              : current != null
                ? { available: Math.max(0, current) }
                : {}),
      },
    ];
  });
}

export function mapPlaidTransactions(
  transactions: PlaidSnapshotTransaction[],
  accounts: PlaidSnapshotAccount[],
): DemoTransaction[] {
  const creditIds = new Set(
    accounts.filter((account) => account.type === "credit").map((account) => account.account_id),
  );
  return transactions
    .filter((transaction) => !transaction.pending)
    .map((transaction) => ({
      id: transaction.transaction_id,
      accountId: transaction.account_id,
      date: transaction.date,
      description: transaction.merchant_name?.trim() || transaction.name || "Movimentação",
      amount: transaction.amount,
      category:
        CATEGORY_PT[transaction.personal_finance_category?.primary ?? ""] ??
        "Sem categoria informada",
      ...(currencyOf(transaction) ? { currency: currencyOf(transaction)! } : {}),
      ...(creditIds.has(transaction.account_id) ? { classification: "card-unknown" as const } : {}),
    }));
}
