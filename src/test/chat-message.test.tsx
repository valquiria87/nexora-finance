import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatMessage } from "@/components/chat/ChatMessage";

describe("mensagens do chat", () => {
  it("renderiza tabelas em uma área com rolagem horizontal e os metadados", () => {
    const { container } = render(
      <ChatMessage
        msg={{
          id: "assistant-1",
          role: "assistant",
          text: "| Conta | Saldo |\n| --- | ---: |\n| Corrente | R$ 100,00 |",
          mode: "regras",
          meta: {
            periodo: { inicio: "2026-10-01", fim: "2026-10-29" },
            registros: 2,
            fonte: "Plaid Sandbox",
          },
        }}
      />,
    );

    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector(".overflow-x-auto")).toBeInTheDocument();
    expect(screen.getByText("Dio · Assistente Nexora Finance")).toBeInTheDocument();
    expect(screen.getByText("Respostas por regras")).toBeInTheDocument();
    expect(screen.getByText(/2 registros · Fonte: Plaid Sandbox/)).toBeInTheDocument();
    expect(
      screen.getByText("Integração ativa · Plaid Sandbox · dados fictícios"),
    ).toBeInTheDocument();
  });

  it("exibe erro, modo local e botão de nova tentativa no fallback", () => {
    const retry = vi.fn();
    render(
      <ChatMessage
        msg={{
          id: "assistant-error",
          role: "assistant",
          text: "Resposta local",
          mode: "demo",
          errorMessage: "A função não respondeu.",
          retryUserMessageId: "user-1",
        }}
        onRetry={retry}
      />,
    );

    expect(screen.getByText("A função não respondeu.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("Modo demonstração (dados locais)")).toBeInTheDocument();
    expect(
      screen.queryByText("Integração ativa · Plaid Sandbox · dados fictícios"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
