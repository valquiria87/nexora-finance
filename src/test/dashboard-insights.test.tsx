import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dashboard } from "@/components/chat/Dashboard";
import { demoProvider } from "@/lib/finance";

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("histórico de transações", () => {
  it("apresenta um extrato tabular com data, descrição, categoria, tipo e valor", () => {
    const count = demoProvider.getTransactions().length;
    render(<Dashboard provider={demoProvider} section="transactions" />);

    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Data" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Descrição" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Categoria" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Tipo" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Valor" })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(count + 1);
  });
});

describe("identificação da integração", () => {
  it("exibe Pluggy Sandbox e informa que os dados são fictícios", () => {
    const provider = { ...demoProvider, mode: "pluggy" as const };
    render(<Dashboard provider={provider} section="overview" />);

    expect(screen.getByText(/Pluggy Sandbox.*dados fictícios/)).toBeVisible();
  });
});

describe("insights automáticos do painel", () => {
  it("apresenta padrões calculados a partir das saídas demonstrativas", () => {
    render(<Dashboard />);

    expect(screen.getByRole("heading", { name: "Padrões observados nas saídas" })).toBeVisible();
    expect(screen.getByText("Transporte concentra 35.4% das saídas.")).toBeVisible();
    expect(screen.getByText("Maior saída individual: Combustível.")).toBeVisible();
    expect(screen.getByText("Média por saída: 6 transações no cálculo.")).toBeVisible();
  });
});

describe("gráficos do panorama financeiro", () => {
  it("exibe a distribuição por categoria e a evolução mensal das despesas", () => {
    render(<Dashboard />);

    expect(screen.getByRole("heading", { name: "Gastos por categoria" })).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Gráfico de rosca de gastos por categoria em BRL" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evolução das despesas" })).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Gráfico de evolução mensal das despesas em BRL" }),
    ).toBeInTheDocument();
  });

  it("não exibe gráficos quando não há despesas registradas", () => {
    const provider = {
      mode: "pluggy" as const,
      getAccounts: () => [],
      getTransactions: () => [],
    };
    render(<Dashboard provider={provider} />);
    expect(screen.queryByRole("heading", { name: "Gastos por categoria" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Evolução das despesas" }),
    ).not.toBeInTheDocument();
  });
});

describe("cartao conectado", () => {
  it("mostra divida positiva e credito disponivel sem mistura-los", () => {
    const provider = {
      mode: "pluggy" as const,
      getAccounts: () => [
        {
          id: "card",
          name: "Mastercard Black",
          type: "credit" as const,
          currency: "BRL",
          debt: -838.5,
          availableCredit: 300000,
        },
      ],
      getTransactions: () => [],
    };
    render(<Dashboard provider={provider} section="accounts" />);
    expect(screen.getByText("R$ 838,50")).toBeVisible();
    expect(screen.getByText("Crédito disponível")).toBeVisible();
    expect(screen.getByText("R$ 300.000,00")).toBeVisible();
  });
});
