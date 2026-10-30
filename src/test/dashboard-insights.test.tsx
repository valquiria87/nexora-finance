import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dashboard } from "@/components/chat/Dashboard";

describe("insights automáticos do painel", () => {
  it("apresenta padrões calculados a partir das saídas demonstrativas", () => {
    render(<Dashboard />);

    expect(screen.getByRole("heading", { name: "Padrões observados nas saídas" })).toBeVisible();
    expect(screen.getByText("Transporte concentra 35.4% das saídas.")).toBeVisible();
    expect(screen.getByText("Maior saída individual: Combustível.")).toBeVisible();
    expect(screen.getByText("Média por saída: 6 transações no cálculo.")).toBeVisible();
  });
});
