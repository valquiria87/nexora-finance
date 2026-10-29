import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Landmark,
  PieChart,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  demoProvider,
  isExpense,
  latestTransactions,
  spendingByCategory,
  type FinanceDataProvider,
} from "@/lib/finance";
import { Button } from "@/components/ui/button";

export type DashboardSection = "overview" | "accounts" | "transactions";

export function Dashboard({
  compact = false,
  provider = demoProvider,
  institution,
  section = "overview",
  loading = false,
  error,
  onRefresh,
  onConnect,
}: {
  compact?: boolean;
  provider?: FinanceDataProvider;
  institution?: string | null | undefined;
  section?: DashboardSection;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onConnect?: (() => void) | undefined;
}) {
  const [transactionLimit, setTransactionLimit] = useState(50);
  useEffect(() => setTransactionLimit(50), [section]);
  const accounts = provider.getAccounts();
  const txs = provider.getTransactions();
  const currencyFor = (id: string) =>
    accounts.find((account) => account.id === id)?.currency ?? null;
  const money = (value: number, currency: string | null) =>
    currency
      ? value.toLocaleString("pt-BR", { style: "currency", currency }).replace(/\u00a0/g, " ")
      : `${value.toLocaleString("pt-BR")} · moeda não informada`;

  const totals = (kind: "cash" | "debt") => {
    const byCurrency = new Map<string, number>();
    for (const account of accounts) {
      const isCash = account.type === "checking" || account.type === "savings";
      if ((kind === "cash" && !isCash) || (kind === "debt" && account.type !== "credit")) continue;
      const value = kind === "cash" ? account.available : account.debt;
      if (value == null) continue;
      const currency = account.currency ?? "UNKNOWN";
      byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + value);
    }
    return [...byCurrency]
      .map(([currency, amount]) => money(amount, currency === "UNKNOWN" ? null : currency))
      .join(" · ");
  };

  const categories = spendingByCategory(txs);
  const categoryTotals = new Map<string, number>();
  const categoryMax = new Map<string, number>();
  for (const category of categories) {
    const currency = category.currency ?? (provider.mode === "demo" ? "BRL" : "UNKNOWN");
    categoryTotals.set(currency, (categoryTotals.get(currency) ?? 0) + category.total);
    categoryMax.set(currency, Math.max(categoryMax.get(currency) ?? 0, category.total));
  }
  const spendingSummary = [...categoryTotals]
    .map(([currency, amount]) => money(amount, currency === "UNKNOWN" ? null : currency))
    .join(" · ");
  const latest = latestTransactions(txs, section === "overview" ? 5 : transactionLimit);
  const connected = provider.mode === "pluggy";
  const title =
    section === "accounts" ? "Contas" : section === "transactions" ? "Transações" : "Visão geral";

  return (
    <section className="nexora-page" aria-label={title}>
      {!compact && (
        <div className="nexora-page-heading">
          <div>
            <h1>{title}</h1>
            <p className="nexora-subtitle">
              {section === "overview"
                ? "Seu panorama financeiro em um só lugar."
                : section === "accounts"
                  ? "Suas contas em um só lugar."
                  : "Acompanhe suas movimentações recentes."}
            </p>
          </div>
          <div className="nexora-actions">
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="nexora-alert" role="alert">
          {error}
        </div>
      )}

      {loading && !connected ? (
        <div className="nexora-loading" role="status">
          <span className="nexora-spinner" /> Carregando suas informações…
        </div>
      ) : (
        <>
          {section === "overview" && (
            <>
              <div className="nexora-stat-grid nexora-summary-grid">
                <article className="nexora-stat-card nexora-stat-primary">
                  <div className="nexora-stat-label">
                    <Wallet /> Saldo disponível
                  </div>
                  <p className="nexora-stat-value">{totals("cash") || "Saldo indisponível"}</p>
                </article>
                {!!totals("debt") && (
                  <article className="nexora-stat-card">
                    <div className="nexora-stat-label">
                      <CreditCard /> Dívida em cartões
                    </div>
                    <p className="nexora-stat-value">{totals("debt")}</p>
                  </article>
                )}
              </div>

              {(accounts.length > 0 || txs.length > 0) && (
                <div className="nexora-quick-stats">
                  {accounts.length > 0 && (
                    <div>
                      <Landmark />
                      <span>
                        <strong>{accounts.length}</strong>{" "}
                        {accounts.length === 1 ? "conta conectada" : "contas conectadas"}
                      </span>
                    </div>
                  )}
                  {txs.length > 0 && (
                    <div>
                      <RefreshCw />
                      <span>
                        <strong>{txs.length}</strong>{" "}
                        {txs.length === 1 ? "movimentação" : "movimentações"}
                      </span>
                    </div>
                  )}
                  {!connected && <span className="nexora-demo-tag">Ambiente de demonstração</span>}
                </div>
              )}

              <article className="nexora-panel">
                <div className="nexora-panel-heading">
                  <div>
                    <p className="nexora-eyebrow">ATIVIDADE</p>
                    <h2>Movimentações recentes</h2>
                  </div>
                </div>
                <TransactionList
                  transactions={latest}
                  currencyFor={currencyFor}
                  money={money}
                  emptyText={
                    connected
                      ? "Nenhuma movimentação disponível."
                      : "Conecte sua conta para visualizar suas informações financeiras."
                  }
                />
              </article>
              {!connected && onConnect && (
                <div className="nexora-secondary-actions">
                  <Button variant="outline" onClick={onConnect} disabled={loading}>
                    <Landmark /> Conectar conta
                  </Button>
                </div>
              )}
              {categories.length > 0 && (
                <article className="nexora-panel">
                  <div className="nexora-panel-heading">
                    <div>
                      <p className="nexora-eyebrow">RESUMO</p>
                      <h2>
                        <PieChart /> Gastos por categoria
                      </h2>
                    </div>
                  </div>
                  <p className="nexora-total">{spendingSummary}</p>
                  <div className="nexora-category-list">
                    {categories.map((category) => {
                      const currency =
                        category.currency ?? (provider.mode === "demo" ? "BRL" : "UNKNOWN");
                      const max = categoryMax.get(currency) ?? category.total;
                      return (
                        <div className="nexora-category" key={`${category.category}-${currency}`}>
                          <div className="nexora-category-line">
                            <span>{category.category}</span>
                            <strong>
                              {money(category.total, currency === "UNKNOWN" ? null : currency)}
                            </strong>
                          </div>
                          <div className="nexora-progress">
                            <span style={{ width: `${max ? (category.total / max) * 100 : 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              )}
            </>
          )}
          {section === "accounts" && (
            <article className="nexora-panel">
              <div className="nexora-panel-heading">
                <div>
                  <p className="nexora-eyebrow">INSTITUIÇÕES</p>
                  <h2>Suas contas</h2>
                </div>
              </div>
              {accounts.length ? (
                <AccountList accounts={accounts} money={money} institution={institution} />
              ) : (
                <p className="nexora-empty">
                  {connected
                    ? "A instituição não retornou contas."
                    : "Nenhuma conta conectada. Use Conectar instituição para começar."}
                </p>
              )}
            </article>
          )}

          {section === "transactions" && (
            <article className="nexora-panel">
              <div className="nexora-panel-heading">
                <div>
                  <p className="nexora-eyebrow">EXTRATO</p>
                  <h2>Transações consultadas</h2>
                </div>
                <span className="nexora-count">{txs.length}</span>
              </div>
              <TransactionList
                transactions={latest}
                currencyFor={currencyFor}
                money={money}
                emptyText={
                  connected
                    ? "Nenhuma transação foi retornada no período consultado."
                    : "A demonstração não tem uma consulta bancária ativa."
                }
              />
              {txs.length > latest.length && (
                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setTransactionLimit((current) => current + 50)}
                  >
                    Carregar mais 50 · {latest.length} de {txs.length}
                  </Button>
                </div>
              )}
            </article>
          )}
        </>
      )}
    </section>
  );
}

function AccountList({
  accounts,
  money,
  institution,
}: {
  accounts: ReturnType<FinanceDataProvider["getAccounts"]>;
  money: (value: number, currency: string | null) => string;
  institution?: string | null | undefined;
}) {
  return (
    <div className="nexora-account-list">
      {accounts.map((account) => {
        const amount = account.type === "credit" ? account.debt : account.available;
        const type =
          account.type === "credit"
            ? "Cartão de crédito"
            : account.type === "checking"
              ? "Conta corrente"
              : "Poupança";
        return (
          <div className="nexora-account-row" key={account.id}>
            <span className="nexora-icon-box">
              <Landmark />
            </span>
            <div className="nexora-row-main">
              <strong>{account.name}</strong>
              <span>
                {type} · {account.currency ?? "Moeda não informada"} ·{" "}
                {institution ?? "Instituição não informada"}
              </span>
            </div>
            <div className="nexora-row-value">
              <strong>{amount == null ? "Não informado" : money(amount, account.currency)}</strong>
              <span>{account.type === "credit" ? "Saldo devedor" : "Saldo disponível"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionList({
  transactions,
  currencyFor,
  money,
  emptyText,
}: {
  transactions: ReturnType<FinanceDataProvider["getTransactions"]>;
  currencyFor: (id: string) => string | null;
  money: (value: number, currency: string | null) => string;
  emptyText: string;
}) {
  if (!transactions.length) return <p className="nexora-empty">{emptyText}</p>;
  return (
    <div className="nexora-transaction-list">
      {transactions.map((transaction) => {
        const expense = isExpense(transaction);
        const date = new Date(`${transaction.date}T12:00:00`);
        return (
          <div className="nexora-transaction-row" key={transaction.id}>
            <span
              className={`nexora-flow-icon ${expense ? "is-outflow" : "is-inflow"}`}
              aria-label={expense ? "Saída" : "Entrada"}
            >
              {expense ? <ArrowUpRight /> : <ArrowDownLeft />}
            </span>
            <div className="nexora-row-main">
              <strong>{transaction.description}</strong>
              <span>
                {Number.isNaN(date.getTime()) ? transaction.date : date.toLocaleDateString("pt-BR")}{" "}
                · {transaction.category || "Categoria não informada"}
              </span>
            </div>
            <div className={`nexora-row-value ${expense ? "is-outflow-text" : "is-inflow-text"}`}>
              <strong>
                {expense ? "−" : "+"}
                {money(
                  Math.abs(transaction.amount),
                  transaction.currency ?? currencyFor(transaction.accountId),
                )}
              </strong>
              <span>{expense ? "Saída" : "Entrada"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
