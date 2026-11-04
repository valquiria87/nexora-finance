// Dados fictícios locais. Preparado para ser substituído por uma API futura.
export type AccountType = "checking" | "savings" | "credit" | "other";

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
  classification?: "card-expense" | "card-credit" | "card-unknown";
  /** Metadados opcionais recebidos da instituição; não inferir quando ausentes. */
  operationType?: string | null;
  operationTypeAdditionalInfo?: string | null;
  descriptionRaw?: string | null;
  creditCardMetadata?: Record<string, unknown> | null;
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

export const isExpense = (t: DemoTransaction) =>
  t.classification !== "card-credit" && t.classification !== "card-unknown" && t.amount > 0;

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
  mode: "demo" | "pluggy" | "plaid";
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
  return accounts.filter((a) => a.type === "credit").reduce((s, a) => s + Math.abs(a.debt ?? 0), 0);
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

function requestedCategory(question: string): string | undefined {
  const match = norm(question).match(
    /(?:classificad[oa]s? como|categoria(?:s)?\s+(?:de\s+)?)(.+?)(?:[,?.]|\s+mostrando\b|$)/,
  );
  const category = match?.[1]?.trim();
  return category || undefined;
}

export type Intent =
  | "summary"
  | "card_purchase"
  | "card_spending"
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
  if (/(?:resuma|resumo) (?:das |minhas )?contas/.test(q)) return "summary";
  const hasSummary =
    /(?:resumo|visao geral|visão geral|panorama|situacao|situação)/.test(q) &&
    /(?:financeiro|financeira|sua situacao|sua situação|contas|geral)/.test(q);
  if (hasSummary || /resumo financeiro/.test(q)) return "summary";
  if (
    CARD.test(q) &&
    /\b(?:posso|consigo|poderia|da para|é possivel|e possivel)\b/.test(q) &&
    /\b(?:usar|pagar|comprar|fazer compras)\b/.test(q)
  )
    return "card_purchase";

  // Pedidos explícitos de classificação por categoria prevalecem sobre menções ao cartão.
  if (/(?:categoria|categorias)/.test(q)) return "categories";

  if (
    CARD.test(q) &&
    /\b(?:consumi|consumo|gastei|gastos|gasto|compras|compra|despesas|despesa)\b/.test(q)
  )
    return "card_spending";

  // Uma solicitação explícita de gastos prevalece sobre menções a saldo ou fatura.
  if (/(?:gastei|gasto|despesa|despesas)/.test(q)) return "categories";

  const cashLike = /(?:dinheiro|saldo|quanto tenho)/.test(q);
  const limitLike = /(?:credito disponivel|limite|limite total)/.test(q);
  const ignoreLimit = /(?:sem contar|sem incluir|fora|ignorar|nao contar)/.test(q) && limitLike;

  if (cashLike && (!limitLike || ignoreLimit)) return "cash";
  if (cashLike && /(?:dinheiro|saldo)/.test(q) && !/(?:credito disponivel|limite)/.test(q))
    return "cash";
  if (limitLike && !(/(?:dinheiro|saldo)/.test(q) && !ignoreLimit)) return "card_limit";
  if (/(?:transac|movimenta|extrato|ultimas|recentes|compras)/.test(q)) return "transactions";
  if (/(?:divida|devo|devendo|fatura)/.test(q)) return "card_debt";
  if (/(?:conta|contas|cartao|cartoes|credito)/.test(q)) return "accounts";
  return "unknown";
}

/** Traduz categorias conhecidas apenas na apresentação; o valor original da Pluggy é preservado. */
export function displayCategory(category: string): string {
  const translations: Record<string, string> = {
    housing: "Moradia",
    electricity: "Eletricidade",
    telecommunications: "Telecomunicações",
    "credit card payment": "Pagamento de cartão",
    "transfer - bank slip": "Transferência – boleto",
  };
  return translations[norm(category)] ?? category;
}

const fmtOpt = (v: number | undefined) => (v != null ? formatBRL(v) : "não informado");
const fmtDebt = (v: number | undefined) => (v != null ? formatBRL(Math.abs(v)) : fmtOpt(v));

export function answer(
  question: string,
  accounts: DemoAccount[] = DEMO_ACCOUNTS,
  txs: DemoTransaction[] = DEMO_TRANSACTIONS,
  source: "demo" | "pluggy" = "demo",
): string {
  const sourceLabel = source === "pluggy" ? "Pluggy Sandbox" : "demonstração";
  const sourceNote = source === "pluggy" ? "\n\n_Dados fictícios da Pluggy Sandbox._" : DEMO_NOTE;
  const bank = accounts.filter(isBank);
  const cards = accounts.filter((a) => a.type === "credit");
  const cash = formatBRL(totalAvailableCash(accounts));

  switch (detectIntent(question)) {
    case "summary": {
      if (!accounts.length) {
        if (!txs.length)
          return (
            `N\u00e3o h\u00e1 dados financeiros dispon\u00edveis na ${sourceLabel}.` + sourceNote
          );
        return (
          `N\u00e3o h\u00e1 contas dispon\u00edveis nos dados recebidos da ${sourceLabel} para compor um resumo.` +
          sourceNote
        );
      }
      const spending = spendingByCategory(txs).reduce((sum, c) => sum + c.total, 0);
      const accountLines = accounts.map((account) =>
        account.type === "credit"
          ? `- **${account.name}** (cart\u00e3o): d\u00edvida atual ${fmtDebt(account.debt)}; cr\u00e9dito dispon\u00edvel ${fmtOpt(account.availableCredit)}`
          : `- **${account.name}** (${account.type === "checking" ? "conta corrente" : account.type === "savings" ? "poupan\u00e7a" : "outra conta"}): saldo ${fmtOpt(account.balance)}; dispon\u00edvel ${fmtOpt(account.available)}`,
      );
      return (
        `**Resumo financeiro dos dados recebidos da ${sourceLabel}**\n\n**Contas conectadas (${accounts.length})**\n${accountLines.join("\n")}\n\n- **Dinheiro banc\u00e1rio dispon\u00edvel**: ${cash}\n- **D\u00edvida dos cart\u00f5es**: ${formatBRL(totalCardDebt(accounts))}\n- **Movimenta\u00e7\u00f5es recebidas**: ${txs.length}\n- **Despesas registradas**: ${formatBRL(spending)}\n\nO dinheiro dispon\u00edvel considera apenas contas corrente e poupan\u00e7a. D\u00edvidas e cr\u00e9dito dispon\u00edvel dos cart\u00f5es ficam separados. As movimenta\u00e7\u00f5es recebidas podem ser um recorte e n\u00e3o devem ser usadas para reconciliar os saldos.` +
        sourceNote
      );
    }
    case "card_purchase": {
      if (!cards.length)
        return `Não há cartões de crédito nos dados recebidos da ${sourceLabel}.` + sourceNote;
      const lines = cards.map(
        (a) =>
          `- **${a.name}**: dívida atual ${fmtDebt(a.debt)}; limite total não informado; crédito disponível ${fmtOpt(a.availableCredit)}`,
      );
      return (
        "Sim, um cartão de crédito permite fazer compras usando o **crédito disponível** — mas isso é um empréstimo do emissor, não dinheiro seu na conta. Cada compra aumenta a dívida do cartão.\n\n" +
        "Vale diferenciar:\n\n" +
        "- **Dívida atual**: quanto você já deve ao cartão.\n" +
        "- **Limite total**: o valor máximo de crédito concedido.\n" +
        "- **Crédito disponível**: quanto ainda pode ser usado em compras.\n\n" +
        `Nos dados recebidos da ${sourceLabel}:\n\n${lines.join("\n")}\n\n` +
        "Quando o crédito disponível não é informado, não é possível confirmar quanto ainda pode ser usado para uma compra. " +
        `Seu dinheiro próprio disponível nas contas bancárias é ${cash}, separado do crédito dos cartões.` +
        sourceNote
      );
    }
    case "card_spending": {
      const cardAccounts = new Map(
        accounts
          .filter((account) => account.type === "credit")
          .map((account) => [account.id, account.name]),
      );
      const cardTransactions = txs.filter((transaction) => cardAccounts.has(transaction.accountId));
      const purchases = cardTransactions.filter(
        (transaction) => transaction.classification === "card-expense",
      );
      const unknown = cardTransactions.filter(
        (transaction) => transaction.classification === "card-unknown",
      );
      const credits = cardTransactions.filter(
        (transaction) => transaction.classification === "card-credit",
      );
      const purchaseTotal = purchases.reduce(
        (sum, transaction) => sum + Math.abs(transaction.amount),
        0,
      );
      const unknownTotal = unknown.reduce(
        (sum, transaction) => sum + Math.abs(transaction.amount),
        0,
      );
      const creditTotal = credits.reduce(
        (sum, transaction) => sum + Math.abs(transaction.amount),
        0,
      );
      if (!cardTransactions.length)
        return (
          `Não há movimentações de cartão de crédito nos dados recebidos da ${sourceLabel}.` +
          sourceNote
        );
      const purchaseLines = [
        ...new Set(purchases.map((transaction) => cardAccounts.get(transaction.accountId)!)),
      ].map((name) => {
        const total = purchases
          .filter((transaction) => cardAccounts.get(transaction.accountId) === name)
          .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
        return `- **${name}**: ${formatBRL(total)}`;
      });
      return (
        `**Compras identificadas no cartão**: ${formatBRL(purchaseTotal)} em ${purchases.length} movimentação(ões).` +
        (purchaseLines.length ? `\n\n${purchaseLines.join("\n")}` : "") +
        (unknown.length
          ? `\n\n**Movimentações de cartão sem tipo identificado**: ${unknown.length} registro(s), totalizando ${formatBRL(unknownTotal)}. Esse valor não foi classificado como compra nem incluído no consumo confirmado.`
          : "") +
        (credits.length
          ? `\n\n**Créditos identificados no cartão**: ${credits.length} registro(s), totalizando ${formatBRL(creditTotal)}. A classificação da instituição não permite presumir que sejam estornos.`
          : "") +
        `\n\nO total de compras considera somente movimentações classificadas como compra pela instituição. Pagamentos de fatura debitados da conta bancária não entram aqui, pois são pagamentos da dívida, não novas compras.` +
        sourceNote
      );
    }
    case "cash": {
      if (!bank.length)
        return (
          `Não há contas bancárias nos dados recebidos da ${sourceLabel} para somar o saldo disponível.` +
          sourceNote
        );
      const lines = bank.map(
        (a) =>
          `- **${a.name}**: disponível ${fmtOpt(a.available)} (saldo da conta ${fmtOpt(a.balance)})`,
      );
      return (
        `Seu dinheiro disponível nas contas bancárias conectadas à ${sourceLabel} é **${cash}**:\n\n${lines.join("\n")}\n\n` +
        "Esse total soma apenas o saldo disponível das contas corrente e poupança. Não entram dívidas de cartão, limites ou crédito disponível dos cartões, nem empréstimos — crédito não é dinheiro seu." +
        sourceNote
      );
    }
    case "card_debt": {
      if (!cards.length)
        return (
          `Não há cartões de crédito nos dados recebidos da ${sourceLabel} para somar dívidas.` +
          sourceNote
        );
      const lines = cards.map((a) => `- **${a.name}**: dívida atual ${fmtDebt(a.debt)}`);
      return (
        `A dívida atual dos cartões recebidos da ${sourceLabel} soma **${formatBRL(totalCardDebt(accounts))}**:\n\n${lines.join("\n")}\n\n` +
        "Esse valor é o que se deve aos emissores e não é descontado nem somado ao seu dinheiro disponível." +
        sourceNote
      );
    }
    case "card_limit": {
      if (!cards.length)
        return (
          `Não há cartões de crédito nos dados recebidos da ${sourceLabel} para informar limite.` +
          sourceNote
        );
      const lines = cards.map(
        (a) =>
          `- **${a.name}**: limite total não informado; crédito disponível ${fmtOpt(a.availableCredit)}`,
      );
      return (
        "O **limite total** é o máximo de crédito concedido; o **crédito disponível** é quanto ainda pode ser usado.\n\n" +
        `Nos dados recebidos da ${sourceLabel}:\n\n${lines.join("\n")}\n\n` +
        "O limite total ou o crédito disponível que não constar nos dados não pode ser calculado com segurança." +
        sourceNote
      );
    }
    case "transactions": {
      if (!txs.length)
        return `Não há transações disponíveis nos dados recebidos da ${sourceLabel}.` + sourceNote;
      const names = new Map(accounts.map((a) => [a.id, a.name]));
      const requested = requestedCategory(question);
      const questionText = norm(question);
      const hasCategoryFilter = /classificad[oa]s? como|categoria/.test(questionText);
      const requestedCard = accounts.find(
        (account) => account.type === "credit" && questionText.includes(norm(account.name)),
      );
      const baseTransactions = requestedCard
        ? txs.filter((transaction) => transaction.accountId === requestedCard.id)
        : txs;
      const categoryMatches = requested
        ? baseTransactions.filter((t) => norm(t.category) === requested)
        : hasCategoryFilter
          ? baseTransactions.filter((t) => questionText.includes(norm(t.category)))
          : [];
      if (hasCategoryFilter && !categoryMatches.length)
        return (
          `Não encontrei transações com a categoria solicitada nos dados recebidos da ${sourceLabel}.` +
          sourceNote
        );
      const selected = hasCategoryFilter
        ? categoryMatches
        : requestedCard
          ? latestTransactions(baseTransactions, baseTransactions.length)
          : latestTransactions(txs);
      const lines = selected.map(
        (t) =>
          `- ${fmtDate(t.date)} · **${t.description}** · ${t.classification === "card-expense" ? "compra no cartão" : t.classification === "card-credit" ? "crédito identificado no cartão" : t.classification === "card-unknown" ? "movimentação no cartão — tipo não identificado" : isExpense(t) ? "despesa na conta" : "entrada na conta"} ${t.classification === "card-credit" || t.classification === "card-unknown" ? formatBRL(Math.abs(t.amount)) : `${isExpense(t) ? "−" : "+"}${formatBRL(Math.abs(t.amount))}`} · ${t.category} · ${names.get(t.accountId) ?? "conta não informada"}`,
      );
      const hasCardPurchases = selected.some((t) => t.classification === "card-expense");
      const hasCardCredits = selected.some((t) => t.classification === "card-credit");
      const hasUnidentifiedCardMovements = selected.some(
        (t) => t.classification === "card-unknown",
      );
      const hasBankExpenses = selected.some((t) => !t.classification && isExpense(t));
      const explanations = [
        "Despesas na conta aparecem com “−” e entradas na conta com “+”.",
        ...(hasBankExpenses
          ? [
              "Pagamentos de fatura debitados da conta bancária reduzem o dinheiro disponível; não são compras individuais no cartão.",
            ]
          : []),
        ...(hasCardPurchases
          ? [
              "Compras no cartão aumentam a dívida do cartão e não são debitadas diretamente do saldo bancário.",
            ]
          : []),
        ...(hasCardCredits
          ? [
              "“Crédito identificado no cartão” é a classificação informada pela instituição; não significa necessariamente estorno.",
            ]
          : []),
        ...(hasUnidentifiedCardMovements
          ? [
              "A instituição informou uma movimentação no cartão, mas não forneceu detalhes suficientes para identificar se é compra, estorno ou outro tipo de crédito. O valor não foi somado aos gastos por categoria.",
            ]
          : []),
      ];
      return (
        `${hasCategoryFilter ? "Transações da categoria solicitada" : `Estas são as ${lines.length} transações mais recentes`} nos dados recebidos da ${sourceLabel}:\n\n${lines.join("\n")}\n\n` +
        explanations.join(" ") +
        sourceNote
      );
    }
    case "categories": {
      const allCategories = spendingByCategory(txs);
      // Pagamento da fatura é saída bancária, mas não é uma compra individual.
      // Mantém-se separado para não somá-lo às compras do cartão e duplicar gastos.
      const cardPayments = allCategories.filter(
        (category) => norm(category.category) === "credit card payment",
      );
      const cats = allCategories.filter(
        (category) => norm(category.category) !== "credit card payment",
      );
      if (!cats.length && !cardPayments.length)
        return (
          `Não há despesas nos dados recebidos da ${sourceLabel} para calcular gastos por categoria.` +
          sourceNote
        );
      const total = cats.reduce((sum, category) => sum + category.total, 0);
      const lines = cats.map((c) => `- **${displayCategory(c.category)}**: ${formatBRL(c.total)}`);
      const paymentLines = cardPayments.map(
        (category) =>
          `- **Pagamento de fatura (fora do total de gastos por categoria)**: ${formatBRL(category.total)}`,
      );
      const categorySummary = cats.length
        ? `Seus gastos por categoria nas transações recebidas da ${sourceLabel} somam **${formatBRL(total)}**:\n\n${lines.join("\n")}`
        : `Não há compras ou outras despesas categorizáveis nos dados recebidos da ${sourceLabel}.`;
      const paymentSummary = paymentLines.length
        ? `\n\n${paymentLines.join("\n")}\nEsse pagamento reduz o saldo bancário, mas não é somado ao total acima porque pode corresponder a compras do cartão já registradas separadamente.`
        : "";
      return (
        categorySummary +
        paymentSummary +
        "\n\nO cálculo considera despesas identificadas; entradas como salário e rendimentos não entram. Movimentações de cartão sem tipo identificado também ficam fora do total." +
        sourceNote
      );
    }
    case "accounts": {
      if (!accounts.length)
        return `Não há contas disponíveis nos dados recebidos da ${sourceLabel}.` + sourceNote;
      const lines = accounts.map((a) =>
        a.type === "credit"
          ? `- **${a.name}** (cartão de crédito): dívida ${fmtDebt(a.debt)}; crédito disponível ${fmtOpt(a.availableCredit)}`
          : `- **${a.name}** (${a.type === "checking" ? "conta corrente" : a.type === "savings" ? "poupança" : "outra conta"}): saldo ${fmtOpt(a.balance)}; disponível ${fmtOpt(a.available)}`,
      );
      return `Estas são as contas recebidas da ${sourceLabel}:\n\n${lines.join("\n")}` + sourceNote;
    }
    default:
      return (
        `Não consigo responder a essa pergunta com os dados recebidos da ${sourceLabel}. ` +
        "Tente algo como “Quais são minhas contas?” ou “Qual é meu saldo disponível?”. " +
        sourceNote
      );
  }
}
