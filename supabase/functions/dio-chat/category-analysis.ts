export interface AnalyzableTransaction {
  amount: number;
  pending: boolean;
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
  personal_finance_category?: { primary?: string } | null;
}

export interface CategoryTotal {
  category: string;
  currency: string | null;
  count: number;
  total: number;
}

export interface TransactionAnalysis {
  categories: CategoryTotal[];
  confirmedOutCount: number;
  confirmedInCount: number;
  pendingOutCount: number;
  pendingInCount: number;
  zeroAmountCount: number;
}

export function transactionCurrency(transaction: AnalyzableTransaction): string | null {
  return transaction.iso_currency_code ?? transaction.unofficial_currency_code ?? null;
}

export function sumTransactionsByCurrency(
  transactions: AnalyzableTransaction[],
  predicate: (transaction: AnalyzableTransaction) => boolean,
): Array<{ currency: string | null; total: number; count: number }> {
  const groups = new Map<string, { currency: string | null; total: number; count: number }>();
  for (const transaction of transactions.filter(predicate)) {
    const currency = transactionCurrency(transaction);
    const key = currency ?? "__NO_CURRENCY__";
    const current = groups.get(key) ?? { currency, total: 0, count: 0 };
    current.total += Math.abs(transaction.amount);
    current.count += 1;
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => (a.currency ?? "").localeCompare(b.currency ?? ""));
}

export function analyzeTransactions(
  transactions: AnalyzableTransaction[],
  categoryLabels: Record<string, string>,
): TransactionAnalysis {
  const categories = new Map<string, CategoryTotal>();
  let confirmedOutCount = 0;
  let confirmedInCount = 0;
  let pendingOutCount = 0;
  let pendingInCount = 0;
  let zeroAmountCount = 0;

  for (const transaction of transactions) {
    if (transaction.amount === 0) {
      zeroAmountCount += 1;
      continue;
    }
    if (transaction.pending) {
      if (transaction.amount > 0) pendingOutCount += 1;
      else pendingInCount += 1;
      continue;
    }
    if (transaction.amount < 0) {
      confirmedInCount += 1;
      continue;
    }

    confirmedOutCount += 1;
    const primary = transaction.personal_finance_category?.primary;
    const category = primary && categoryLabels[primary] ? categoryLabels[primary] : "Sem categoria informada";
    const currency = transactionCurrency(transaction);
    const key = `${category}\u0000${currency ?? "__NO_CURRENCY__"}`;
    const current = categories.get(key) ?? { category, currency, count: 0, total: 0 };
    current.count += 1;
    current.total += transaction.amount;
    categories.set(key, current);
  }

  return {
    categories: [...categories.values()].sort((a, b) =>
      a.category.localeCompare(b.category) ||
      (a.currency ?? "").localeCompare(b.currency ?? ""),
    ),
    confirmedOutCount,
    confirmedInCount,
    pendingOutCount,
    pendingInCount,
    zeroAmountCount,
  };
}


export type ChatIntent = "contas" | "saldos" | "recentes" | "entradas" | "categoria" | "resumo" | "ajuda";

export type ChatIntentHandlers<T> = {
  contas: () => T;
  saldos: () => T;
  recentes: () => T;
  entradas: () => T;
  categoria: () => T;
  resumo: () => T;
};

export function dispatchChatIntent<T>(intent: Exclude<ChatIntent, "ajuda">, handlers: ChatIntentHandlers<T>): T {
  switch (intent) {
    case "contas": return handlers.contas();
    case "saldos": return handlers.saldos();
    case "recentes": return handlers.recentes();
    case "entradas": return handlers.entradas();
    case "categoria": return handlers.categoria();
    case "resumo": return handlers.resumo();
  }
}

export interface BalanceAccount {
  type: string;
  subtype: string | null;
  balances: {
    available: number | null;
    current?: number | null;
    limit?: number | null;
    iso_currency_code?: string | null;
    unofficial_currency_code?: string | null;
  };
}

export interface AccountCurrencyTotal {
  currency: string | null;
  total: number;
  count: number;
  missingCount: number;
}

export function sumAccountsByCurrency<T extends BalanceAccount>(
  accounts: T[],
  getValue: (account: T) => number | null | undefined,
): AccountCurrencyTotal[] {
  const totals = new Map<string, AccountCurrencyTotal>();
  for (const account of accounts) {
    const currency = account.balances.iso_currency_code ?? account.balances.unofficial_currency_code ?? null;
    const key = currency ?? "__NO_CURRENCY__";
    const current = totals.get(key) ?? { currency, total: 0, count: 0, missingCount: 0 };
    const value = getValue(account);
    if (value === null || value === undefined || !Number.isFinite(value)) {
      current.missingCount += 1;
    } else {
      current.total += value;
      current.count += 1;
    }
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => (a.currency ?? "").localeCompare(b.currency ?? ""));
}

export function classifyBalanceAccounts<T extends BalanceAccount>(accounts: T[]) {
  return {
    deposits: accounts.filter((account) => account.type === "depository"),
    investments: accounts.filter((account) => account.type === "investment"),
    debts: accounts.filter((account) => account.type === "credit" || account.type === "loan"),
    otherAssets: accounts.filter(
      (account) =>
        account.type !== "depository" &&
        account.type !== "investment" &&
        account.type !== "credit" &&
        account.type !== "loan",
    ),
  };
}

export function routeIntent(message: string): ChatIntent {
  const normalized = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Listagens explícitas de contas devem prevalecer sobre menções a saldo/tipo.
  if (
    /conta/.test(normalized) &&
    /liste|listar|mostre|quais|todos|todas|tipos|incluindo/.test(normalized)
  ) return "contas";

  // Resumo geral tem prioridade sobre termos secundários como "categorias".
  if (/resum|visao geral|panorama/.test(normalized)) {
    return /conta/.test(normalized) ? "contas" : "resumo";
  }
  if (/entrad|receit|credito recebido|dinheiro recebido|deposito recebido/.test(normalized)) return "entradas";
  if (/gast|categoria|aliment|transporte|viage|compras|lazer/.test(normalized)) return "categoria";
  if (/saldo|disponivel|divida|limite|quanto tenho/.test(normalized)) return "saldos";
  if (/ultima|recente|extrato|transac|movimentac/.test(normalized)) return "recentes";
  if (/conta|banco|cartao/.test(normalized)) return "contas";
  return "ajuda";
}


/**
 * Reads an explicit recent-transaction count from the user's message.
 * Defaults to five and caps requests at twenty to keep chat responses concise.
 */
export function requestedRecentLimit(
  message: string,
  defaultLimit = 5,
  maxLimit = 20,
): number {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const match =
    normalized.match(/\b(?:ultimas?|recentes?)\s+(\d{1,2})\b/) ??
    normalized.match(/\b(\d{1,2})\s+(?:ultimas?|recentes?|transacoes?)\b/);
  const requested = match ? Number(match[1]) : defaultLimit;
  if (!Number.isInteger(requested) || requested < 1) return defaultLimit;
  return Math.min(requested, maxLimit);
}

export function selectRecentTransactions<T extends { date: string }>(
  transactions: T[],
  limit = 5,
): T[] {
  return [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
