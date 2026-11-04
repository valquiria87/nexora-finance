import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Landmark,
  PieChart as PieChartIcon,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  demoProvider,
  automaticSpendingInsights,
  isExpense,
  latestTransactions,
  spendingByCategory,
  type FinanceDataProvider,
} from "@/lib/finance";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  const categoryGroups = [
    ...new Set(
      categories.map((item) => item.currency ?? (provider.mode === "demo" ? "BRL" : "UNKNOWN")),
    ),
  ].map((currency) => ({
    currency,
    data: categories
      .filter(
        (item) => (item.currency ?? (provider.mode === "demo" ? "BRL" : "UNKNOWN")) === currency,
      )
      .map((item) => ({ name: item.category, value: item.total })),
  }));
  const monthlyGroups = (() => {
    const grouped = new Map<string, Map<string, number>>();
    for (const transaction of txs) {
      if (!isExpense(transaction) || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) continue;
      const currency =
        transaction.currency ??
        currencyFor(transaction.accountId) ??
        (provider.mode === "demo" ? "BRL" : "UNKNOWN");
      const month = transaction.date.slice(0, 7);
      const months = grouped.get(currency) ?? new Map<string, number>();
      months.set(month, Math.round(((months.get(month) ?? 0) + transaction.amount) * 100) / 100);
      grouped.set(currency, months);
    }
    return [...grouped].map(([currency, months]) => ({
      currency,
      data: [...months]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({
          month,
          label: new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", {
            month: "short",
            year: "2-digit",
          }),
          total,
        })),
    }));
  })();
  const chartColors = ["#16a085", "#4f86c6", "#e6a23c", "#9b72cf", "#e47777", "#58a6a6", "#8b9a46"];
  const insights = automaticSpendingInsights(txs);
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
  const connected = provider.mode !== "demo";
  const title =
    section === "accounts" ? "Contas" : section === "transactions" ? "Transações" : "Visão geral";

  return (
    <section className="nexora-page" aria-label={`Nexora Finance: ${title}`}>
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
                  {provider.mode === "demo" && (
                    <span className="nexora-demo-tag">Ambiente de demonstração</span>
                  )}
                  {provider.mode === "pluggy" && (
                    <span className="nexora-demo-tag">Pluggy Sandbox — dados fictícios</span>
                  )}
                  {provider.mode === "plaid" && (
                    <span className="nexora-demo-tag">Plaid Sandbox · dados fictícios</span>
                  )}
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
                        <PieChartIcon /> Gastos por categoria
                      </h2>
                    </div>
                  </div>
                  <p className="nexora-total">{spendingSummary}</p>
                  <div className="nexora-chart-grid">
                    {categoryGroups.map((group) => (
                      <div className="nexora-chart-card" key={group.currency}>
                        <p className="nexora-chart-caption">
                          Distribuição em{" "}
                          {group.currency === "UNKNOWN" ? "moeda não informada" : group.currency}
                        </p>
                        <div
                          className="nexora-chart"
                          role="img"
                          aria-label={`Gráfico de rosca de gastos por categoria em ${group.currency}`}
                        >
                          <ResponsiveContainer width="100%" height={230}>
                            <PieChart>
                              <Pie
                                data={group.data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={58}
                                outerRadius={88}
                                paddingAngle={3}
                              >
                                {group.data.map((item, index) => (
                                  <Cell
                                    key={item.name}
                                    fill={chartColors[index % chartColors.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) =>
                                  money(
                                    Number(value),
                                    group.currency === "UNKNOWN" ? null : group.currency,
                                  )
                                }
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <ul className="nexora-chart-legend">
                          {group.data.map((item, index) => (
                            <li key={item.name}>
                              <span>
                                <i
                                  style={{ background: chartColors[index % chartColors.length] }}
                                />
                                {item.name}
                              </span>
                              <strong>
                                {money(
                                  item.value,
                                  group.currency === "UNKNOWN" ? null : group.currency,
                                )}
                              </strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
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
              {monthlyGroups.length > 0 && (
                <article className="nexora-panel">
                  <div className="nexora-panel-heading">
                    <div>
                      <p className="nexora-eyebrow">TENDÊNCIA</p>
                      <h2>Evolução das despesas</h2>
                    </div>
                  </div>
                  <p className="nexora-footnote">
                    Somente saídas registradas, agrupadas por mês. Cada moeda é exibida
                    separadamente.
                  </p>
                  <div className="nexora-monthly-charts">
                    {monthlyGroups.map((group) => (
                      <div className="nexora-monthly-chart" key={group.currency}>
                        <p className="nexora-chart-caption">
                          {group.currency === "UNKNOWN" ? "Moeda não informada" : group.currency}
                        </p>
                        <div
                          role="img"
                          aria-label={`Gráfico de evolução mensal das despesas em ${group.currency}`}
                        >
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart
                              data={group.data}
                              margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="label" tickLine={false} axisLine={false} />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                width={76}
                                tickFormatter={(value) =>
                                  Number(value).toLocaleString("pt-BR", { notation: "compact" })
                                }
                              />
                              <Tooltip
                                labelFormatter={(_, payload) => payload?.[0]?.payload?.month ?? ""}
                                formatter={(value) =>
                                  money(
                                    Number(value),
                                    group.currency === "UNKNOWN" ? null : group.currency,
                                  )
                                }
                              />
                              <Bar
                                dataKey="total"
                                name="Despesas"
                                fill="#16a085"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={56}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )}
              {insights.length > 0 && (
                <article className="nexora-panel">
                  <div className="nexora-panel-heading">
                    <div>
                      <p className="nexora-eyebrow">INSIGHTS AUTOMÁTICOS</p>
                      <h2>Padrões observados nas saídas</h2>
                    </div>
                  </div>
                  <ul className="grid gap-3">
                    {insights.map((insight, index) => {
                      const currency =
                        insight.currency ?? (provider.mode === "demo" ? "BRL" : null);
                      const description =
                        insight.type === "top-category"
                          ? `${insight.category} concentra ${(insight.share * 100).toFixed(1)}% das saídas.`
                          : insight.type === "largest-expense"
                            ? `Maior saída individual: ${insight.description}.`
                            : `Média por saída: ${insight.count} transações no cálculo.`;
                      const amount = money(insight.amount, currency);
                      return (
                        <li
                          className="flex items-start justify-between gap-4 text-sm"
                          key={`${insight.type}-${currency ?? "unknown"}-${index}`}
                        >
                          <span>{description}</span>
                          <strong className="shrink-0">{amount}</strong>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Resumo descritivo dos registros disponíveis; não é aconselhamento financeiro.
                  </p>
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
    <div className="nexora-account-grid">
      {accounts.map((account) => {
        const isCredit = account.type === "credit";
        const amount = isCredit
          ? account.debt == null
            ? undefined
            : Math.abs(account.debt)
          : account.type === "other"
            ? account.balance
            : account.available;
        const type =
          account.type === "credit"
            ? "Cartão de crédito"
            : account.type === "checking"
              ? "Conta corrente"
              : account.type === "savings"
                ? "Poupança"
                : "Outra conta";
        return (
          <article
            className={`nexora-account-card ${isCredit ? "is-credit" : "is-cash"}`}
            key={account.id}
          >
            <div className="nexora-account-card-top">
              <span className="nexora-account-icon">
                {isCredit ? <CreditCard /> : <Landmark />}
              </span>
              <span className="nexora-account-type">{type}</span>
            </div>
            <div className="nexora-account-identity">
              <h3>{account.name}</h3>
              <p>
                {institution ?? "Instituição não informada"} ·{" "}
                {account.currency ?? "Moeda não informada"}
              </p>
            </div>
            <div className="nexora-account-balance">
              <span>
                {isCredit
                  ? "Saldo devedor"
                  : account.type === "other"
                    ? "Saldo informado"
                    : "Saldo disponível"}
              </span>
              <strong>{amount == null ? "Não informado" : money(amount, account.currency)}</strong>
            </div>
            {isCredit && account.availableCredit != null && (
              <div className="nexora-account-credit">
                <span>Crédito disponível</span>
                <strong>{money(account.availableCredit, account.currency)}</strong>
              </div>
            )}
          </article>
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
    <div className="nexora-transactions-table-wrap">
      <table className="nexora-transactions-table">
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Descrição</th>
            <th scope="col">Categoria</th>
            <th scope="col">Tipo</th>
            <th scope="col" className="is-numeric">
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const expense = isExpense(transaction);
            const date = new Date(`${transaction.date}T12:00:00`);
            return (
              <tr key={transaction.id}>
                <td className="nexora-transaction-date">
                  {Number.isNaN(date.getTime())
                    ? transaction.date
                    : date.toLocaleDateString("pt-BR")}
                </td>
                <td className="nexora-transaction-description">{transaction.description}</td>
                <td>
                  <span className="nexora-category-tag">
                    {transaction.category || "Não categorizada"}
                  </span>
                </td>
                <td>
                  <span
                    className={`nexora-transaction-kind ${expense ? "is-outflow" : "is-inflow"}`}
                  >
                    {expense ? <ArrowUpRight /> : <ArrowDownLeft />}
                    {expense ? "Saída" : "Entrada"}
                  </span>
                </td>
                <td
                  className={`nexora-transaction-amount ${expense ? "is-outflow-text" : "is-inflow-text"}`}
                >
                  {expense ? "−" : "+"}
                  {money(
                    Math.abs(transaction.amount),
                    transaction.currency ?? currencyFor(transaction.accountId),
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
