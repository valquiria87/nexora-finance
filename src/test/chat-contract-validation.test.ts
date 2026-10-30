import { describe, expect, it } from "vitest";
import { createChatRequest, MAX_CHAT_MESSAGE_LENGTH } from "@/lib/chat-contract";

describe("validação de entrada do chat", () => {
  it("rejeita histórico contendo mensagem de usuário acima do limite", () => {
    expect(() =>
      createChatRequest("Pergunta válida", [
        { role: "user", content: "x".repeat(MAX_CHAT_MESSAGE_LENGTH + 1) },
      ]),
    ).toThrow("no máximo 1000 caracteres");
  });
});
