import { describe, expect, it } from "vitest";
import {
  createChatRequest,
  MAX_CHAT_HISTORY_MESSAGES,
  MAX_CHAT_MESSAGE_LENGTH,
  parseDioChatResponse,
} from "@/lib/chat-contract";

describe("serviço do chat financeiro", () => {
  it("limita a mensagem, rejeita vazia e mantém somente as últimas mensagens", () => {
    const historico = Array.from({ length: MAX_CHAT_HISTORY_MESSAGES + 3 }, (_, index) => ({
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `mensagem ${index}`,
    }));

    expect(createChatRequest("  Oi  ", historico)).toEqual({
      mensagem: "Oi",
      historico: historico.slice(-MAX_CHAT_HISTORY_MESSAGES),
    });
    expect(() => createChatRequest(" ", [])).toThrow("Digite uma pergunta");
    expect(() => createChatRequest("a".repeat(MAX_CHAT_MESSAGE_LENGTH + 1), [])).toThrow(
      "no máximo 1000 caracteres",
    );
  });

  it("valida o contrato de sucesso e metadados", () => {
    expect(
      parseDioChatResponse({
        resposta: "| Total | 10 |",
        modo: "claude",
        meta: {
          periodo: { inicio: "2026-10-01", fim: "2026-10-29" },
          registros: 4,
          fonte: "Plaid Sandbox",
        },
      }),
    ).toEqual({
      resposta: "| Total | 10 |",
      modo: "claude",
      meta: {
        periodo: { inicio: "2026-10-01", fim: "2026-10-29" },
        registros: 4,
        fonte: "Plaid Sandbox",
      },
    });
  });

  it("repassa erro da função e rejeita respostas incompletas", () => {
    expect(() => parseDioChatResponse({ erro: "Dados temporariamente indisponíveis." })).toThrow(
      "Dados temporariamente indisponíveis.",
    );
    expect(() => parseDioChatResponse({ resposta: "Sem metadados" })).toThrow(
      "fora do contrato esperado",
    );
  });
});
