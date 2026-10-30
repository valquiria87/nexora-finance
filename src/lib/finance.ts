// Dados fictícios locais. Preparado para ser substituído por uma API futura.
export type AccountType = "checking" | "savings" | "credit";

export interface DemoAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: string | null;
  /** Saldo da conta (contas correntes/poupança). */
  balance?: number;
  /** Dinheiro disponível (contas correntes/poupança). */
  available?: number;
  /** Dívida atual (cartões). */
  debt?: number;
  /** Crédito disponível (cartões); undefined = não informado. */
  availableCredit?: number;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "chk",
    name: "Conta corrente",
    type: "checking",
    currency: "BRL",
    balance: 110,
    available: 100,
  },
  {
    id: "sav",
    name: "Conta poupança",
    type: "savings",
    currency: "BRL",
    balance: 210,
    available: 200,
  },
  {
    id: "cc",
    name: "Cartão de crédito",
    type: "credit",
    currency: "BRL",
    debt: 410,
  },
  {
    id: "bcc",
    name: "Cartão de crédito empresarial",
    type: "credit",
    currency: "BRL",
    debt: 5020,
    availableCredit: 4980,
  },
];
/** Transação fictícia. Mesma convenção de sinais do Plaid (src/lib/plaid): amount > 0 = saída (despesa); amount < 0 = entrada. */
export interface DemoTransaction {
  id: string;
  accountId: string;
  /** Data ISO (AAAA-MM-DD). */
  date: string;
  description: string;
  amount: number;
  category: string;
  currency?: string;
}

export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  {
    id: "t1",
    accountId: "chk",
    date: "2026-10-01",
    description: "Salário",
    amount: -1500,
    category: "Renda",
  },
  {
    id: "t2",
    accountId: "cc",
    date: "2026-10-03",
    description: "Supermercado Bom Preço",
    amount: 85.4,
    category: "Alimentação",
  },
  {
    id: "t3",
    accountId: "chk",
    date: "2026-10-05",
    description: "Conta de luz",
    amount: 120,
    category: "Moradia",
  },
  {
    id: "t4",
    accountId: "cc",
    date: "2026-10-08",
    description: "Corrida de aplicativo",
    amount: 23.9,
    category: "Transporte",
  },
  {
    id: "t5",
    accountId: "bcc",
    date: "2026-10-10",
    description: "Assinatura de software de gestão",
    amount: 49,
    category: "Serviços",
  },
  {
    id: "t6",
    accountId: "chk",
    date: "2026-10-14",
    description: "Restaurante Sabor Caseiro",
    amount: 62.5,
    category: "Alimentação",
  },
  {
    id: "t7",
    accountId: "sav",
    date: "2026-10-15",
    description: "Rendimento da poupança",
    amount: -1.75,
    category: "Renda",
  },
  {
    id: "t8",
    accountId: "bcc",
    date: "2026-10-18",
    description: "Combustível",
    amount: 150,
    category: "Transporte",
  },
];

export const isExpense = (t: DemoTransaction) => t.amount > 0;

/** Transações mais recentes primeiro. */
export function latestTransactions(txs: DemoTransaction[], n = 5): DemoTransaction[] {
  const limit = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 5;
  return [...txs]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

/** Soma apenas despesas (saídas) por categoria, em ordem decrescente. Entradas nunca entram. */
export function spendingByCategory(
  txs: DemoTransaction[],
): { category: string; total: number; currency?: string }[] {
  const m = new Map<string, { category: string; total: number; currency?: string }>();
  for (const t of txs)
    if (isExpense(t)) {
      const key = `${t.category}\u0000${t.currency ?? ""}`;
      const existing = m.get(key);
      m.set(key, {
        category: t.category,
        total: Math.round(((existing?.total ?? 0) + t.amount) * 100) / 100,
        ...(t.currency ? { currency: t.currency } : {}),
      });
    }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export type SpendingInsight =
  | {
      type: "top-category";
      category: string;
      amount: number;
      share: number;
      currency?: string;
    }
  | {
      type: "largest-expense";
      description: string;
      amount: number;
      currency?: string;
    }
  | {
      type: "average-expense";
      amount: number;
      count: number;
      currency?: string;
    };

export function automaticSpendingInsights(txs: DemoTransaction[]): SpendingInsight[] {
  const expensesByCurrency = new Map<string, DemoTransaction[]>();
  for (const transaction of txs) {
    if (!isExpense(transaction)) continue;
    const key = transaction.currency ?? "";
    const expenses = expensesByCurrency.get(key) ?? [];
    expenses.push(transaction);
    expensesByCurrency.set(key, expenses);
  }

  const insights: SpendingInsight[] = [];
  for (const [currency, expenses] of expensesByCurrency) {
    const total = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
    const categories = spendingByCategory(expenses);
    const topCategory = categories[0];
    const largestExpense = expenses.reduce((largest, transaction) =>
      transaction.amount > largest.amount ? transaction : largest,
    );
    const currencyField = currency ? { currency } : {};

    if (topCategory) {
      insights.push({
        type: "top-category",
        category: topCategory.category,
        amount: topCategory.total,
        share: topCategory.total / total,
        ...currencyField,
      });
    }
    insights.push({
      type: "largest-expense",
      description: largestExpense.description,
      amount: largestExpense.amount,
      ...currencyField,
    });
    if (expenses.length > 1) {
      insights.push({
        type: "average-expense",
        amount: Math.round((total / expenses.length) * 100) / 100,
        count: expenses.length,
        ...currencyField,
      });
    }
  }
  return insights;
}

/** Origem dos dados do chat. Hoje só existe a demonstração; uma fonte real futura implementa a mesma interface. */

export interface FinanceDataProvider {
  mode: "demo" | "pluggy";
  getAccounts(): DemoAccount[];
  getTransactions(): DemoTransaction[];
}

export const demoProvider: FinanceDataProvider = {
  mode: "demo",
  getAccounts: () => DEMO_ACCOUNTS,
  getTransactions: () => DEMO_TRANSACTIONS,
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatBRL(value: number): string {
  return value
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    .replace(/\u00a0/g, " ");
}

const isBank = (a: DemoAccount) => a.type === "checking" || a.type === "savings";

/** Soma apenas o saldo disponível de contas bancárias (corrente/poupança). Nunca inclui cartões, empréstimos ou limites. */
export function totalAvailableCash(accounts: DemoAccount[]): number {
  return accounts
    .filter((a) => isBank(a) && a.available != null)
    .reduce((s, a) => s + (a.available as number), 0);
}

export function totalCardDebt(accounts: DemoAccount[]): number {
  return accounts.filter((a) => a.type === "credit").reduce((s, a) => s + (a.debt ?? 0), 0);
}

export const SUGGESTIONS = [
  "Resuma minhas contas",
  "Quais foram minhas movimentações?",
  "Mostre um resumo financeiro",
  "Quanto tenho disponível?",
  "Quais são meus gastos por categoria?",
];

const DEMO_NOTE = "\n\n_Resposta baseada em dados simulados de demonstração._";

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export type Intent =
  | "summary"
  | "card_purchase"
  | "cash"
  | "card_debt"
  | "card_limit"
  | "transactions"
  | "categories"
  | "accounts"
  | "unknown";

const CARD = /cartao|cartoes|credito/;

/** Identifica a intenção. A ordem importa: perguntas mais específicas vêm antes. */
export function detectIntent(question: string): Intent {
  const q = norm(question);
  const hasSummary =
    /(?:resumo|visao geral|visão geral|panorama|situacao|situação)/.test(q) &&
    /(?:financeiro|financeira|sua situacao|sua situação|contas|geral)/.test(q);
  if (hasSummary || /resumo financeiro/.test(q)) return "summary";
  if (
    CARD.test(q) &&
    /\b(?:usar|uso|pagar|comprar|compra|compras|gastar|gasto|fazer compras)\b/.test(q)
  )
    return "card_purchase";

  const cashLike = /(?:dinheiro|saldo|quanto tenho)/.test(q);
  const limitLike = /(?:credito disponivel|limite|limite total)/.test(q);
  const ignoreLimit = /(?:sem contar|sem incluir|fora|ignorar|nao contar)/.test(q) && limitLike;

  if (cashLike && (!limitLike || ignoreLimit)) return "cash";
  if (cashLike && /(?:dinheiro|saldo)/.test(q) && !/(?:credito disponivel|limite)/.test(q))
    return "cash";
  if (limitLike && !(/(?:dinheiro|saldo)/.test(q) && !ignoreLimit)) return "card_limit";
  if (/(?:divida|devo|devendo|fatura)/.test(q)) return "card_debt";
  if (/(?:transac|movimenta|extrato|ultimas|recentes|compras)/.test(q)) return "transactions";
  if (/(?:categoria|categorias|gastei|gasto|despesa|despesas)/.test(q)) return "categories";
  if (/(?:conta|contas|cartao|cartoes|credito)/.test(q)) return "accounts";
  return "unknown";
}

const fmtOpt = (v: number | undefined) => (v != null ? formatBRL(v) : "não informado");

export function answer(
  question: string,
  accounts: DemoAccount[] = DEMO_ACCOUNTS,
  txs: DemoTransaction[] = DEMO_TRANSACTIONS,
): string {
  const bank = accounts.filter(isBank);
  const cards = accounts.filter((a) => a.type === "credit");
  const cash = formatBRL(totalAvailableCash(accounts));

  switch (detectIntent(question)) {
    case "summary": {
      if (!accounts.length) {
        if (!txs.length)
          return "Não há dados financeiros disponíveis nesta demonstração." + DEMO_NOTE;
        return (
          "Não há contas disponíveis nos dados de demonstração para compor um resumo." + DEMO_NOTE
        );
      }
      const spending = spendingByCategory(txs).reduce((sum, c) => sum + c.total, 0);
      return (
        `**Resumo financeiro da demonstração**\n\n- **Contas de exemplo**: ${accounts.length}\n- **Dinheiro bancário disponível**: ${cash}\n- **Dívida dos cartões**: ${formatBRL(totalCardDebt(accounts))}\n- **Movimentações**: ${txs.length}\n- **Despesas registradas**: ${formatBRL(spending)}\n\nO dinheiro disponível considera apenas contas corrente e poupança. Dívidas e limites de cartão ficam separados. As movimentações são um recorte demonstrativo, não um extrato completo para reconciliar os saldos.` +
        DEMO_NOTE
      );
    }
    case "card_purchase": {
      if (!cards.length) return "Não há cartões de crédito nos dados de demonstração." + DEMO_NOTE;
      const lines = cards.map(
        (a) =>
          `- **${a.name}**: dívida atual ${fmtOpt(a.debt)}; limite total não informado; crédito disponível ${fmtOpt(a.availableCredit)}`,
      );
      return (
        "Sim, um cartão de crédito permite fazer compras usando o **crédito disponível** — mas isso é um empréstimo do emissor, não dinheiro seu na conta. Cada compra aumenta a dívida do cartão.\n\n" +
        "Vale diferenciar:\n\n" +
        "- **Dívida atual**: quanto você já deve ao cartão.\n" +
        "- **Limite total**: o valor máximo de crédito concedido.\n" +
        "- **Crédito disponível**: quanto ainda pode ser usado em compras.\n\n" +
        `Nos dados de demonstração:\n\n${lines.join("\n")}\n\n` +
        "Para o Plaid Credit Card, o crédito disponível não foi informado, então não é possível confirmar se há crédito para uma compra. " +
        `Seu dinheiro próprio disponível nas contas de exemplo é ${cash}, separado do crédito dos cartões.` +
        DEMO_NOTE
      );
    }
    case "cash": {
      if (!bank.length)
        return (
          "Não há contas bancárias nos dados de demonstração para somar o saldo disponível." +
          DEMO_NOTE
        );
      const lines = bank.map(
        (a) =>
          `- **${a.name}**: disponível ${fmtOpt(a.available)} (saldo da conta ${fmtOpt(a.balance)})`,
      );
      return (
        `Seu dinheiro disponível nas contas bancárias de exemplo é **${cash}**:\n\n${lines.join("\n")}\n\n` +
        "Esse total soma apenas o saldo disponível das contas corrente e poupança. Não entram dívidas de cartão, limites ou crédito disponível dos cartões, nem empréstimos — crédito não é dinheiro seu." +
        DEMO_NOTE
      );
    }
    case "card_debt": {
      if (!cards.length)
        return (
          "Não há cartões de crédito nos dados de demonstração para somar dívidas." + DEMO_NOTE
        );
      const lines = cards.map((a) => `- **${a.name}**: dívida atual ${fmtOpt(a.debt)}`);
      return (
        `A dívida atual dos cartões de exemplo soma **${formatBRL(totalCardDebt(accounts))}**:\n\n${lines.join("\n")}\n\n` +
        "Esse valor é o que se deve aos emissores e não é descontado nem somado ao seu dinheiro disponível." +
        DEMO_NOTE
      );
    }
    case "card_limit": {
      if (!cards.length)
        return (
          "Não há cartões de crédito nos dados de demonstração para informar limite." + DEMO_NOTE
        );
      const lines = cards.map(
        (a) =>
          `- **${a.name}**: limite total não informado; crédito disponível ${fmtOpt(a.availableCredit)}`,
      );
      return (
        "O **limite total** é o máximo de crédito concedido; o **crédito disponível** é quanto ainda pode ser usado.\n\n" +
        `Nos dados de demonstração:\n\n${lines.join("\n")}\n\n` +
        "O limite total não está nos dados, e o crédito disponível do Plaid Credit Card não foi informado, então não é possível calculá-los." +
        DEMO_NOTE
      );
    }
    case "transactions": {
      if (!txs.length)
        return "Não há transações disponíveis nos dados de demonstração." + DEMO_NOTE;
      const names = new Map(accounts.map((a) => [a.id, a.name]));
      const lines = latestTransactions(txs).map(
        (t) =>
          `- ${fmtDate(t.date)} · **${t.description}** · ${isExpense(t) ? "despesa" : "entrada"} ${isExpense(t) ? "−" : "+"}${formatBRL(Math.abs(t.amount))} · ${t.category} · ${names.get(t.accountId) ?? "conta não informada"}`,
      );
      return (
        `Estas são as ${lines.length} transações mais recentes dos dados de demonstração:\n\n${lines.join("\n")}\n\n` +
        "Despesas aparecem com “−” e entradas com “+”. Compras no cartão aumentam a dívida do cartão; não saem do seu saldo bancário." +
        DEMO_NOTE
      );
    }
    case "categories": {
      const cats = spendingByCategory(txs);
      if (!cats.length)
        return (
          "Não há despesas nos dados de demonstração para calcular gastos por categoria." +
          DEMO_NOTE
        );
      const total = cats.reduce((s, c) => s + c.total, 0);
      const lines = cats.map((c) => `- **${c.category}**: ${formatBRL(c.total)}`);
      return (
        `Seus gastos por categoria nas transações de demonstração somam **${formatBRL(total)}**:\n\n${lines.join("\n")}\n\n` +
        "O cálculo considera apenas despesas (contas bancárias e cartões); entradas como salário e rendimentos não entram." +
        DEMO_NOTE
      );
    }
    case "accounts": {
      if (!accounts.length)
        return "Não há contas disponíveis nos dados de demonstração." + DEMO_NOTE;
      const lines = accounts.map((a) =>
        a.type === "credit"
          ? `- **${a.name}** (cartão de crédito): dívida ${fmtOpt(a.debt)}; crédito disponível ${fmtOpt(a.availableCredit)}`
          : `- **${a.name}** (${a.type === "checking" ? "conta corrente" : "poupança"}): saldo ${fmtOpt(a.balance)}; disponível ${fmtOpt(a.available)}`,
      );
      return (
        `Estas são as contas de exemplo desta demonstração (não representam todas as suas contas):\n\n${lines.join("\n")}` +
        DEMO_NOTE
      );
    }
    default:
      return (
        "Não consigo responder a essa pergunta com os dados de demonstração disponíveis. " +
        "Tente algo como “Quais são minhas contas?” ou “Qual é meu saldo disponível?”." +
        DEMO_NOTE
      );
  }
}
