import { createFileRoute } from "@tanstack/react-router";
import { getDioChatSupabaseClient } from "@/lib/dio-chat.server";
import type { DioChatHistoryMessage, DioChatSuccess } from "@/lib/dio-chat.service";

function errorJson(message: string, status: number) {
  return Response.json({ erro: message }, { status });
}

function isHistoryMessage(value: unknown): value is DioChatHistoryMessage {
  if (!value || typeof value !== "object") return false;
  const entry = value as { role?: unknown; content?: unknown };
  return (entry.role === "user" || entry.role === "assistant") && typeof entry.content === "string";
}

export const Route = createFileRoute("/api/dio-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { mensagem?: unknown; historico?: unknown };
        try {
          body = (await request.json()) as { mensagem?: unknown; historico?: unknown };
        } catch {
          return errorJson("O pedido não contém JSON válido.", 400);
        }

        if (typeof body.mensagem !== "string" || !body.mensagem.trim()) {
          return errorJson("Digite uma pergunta antes de enviar.", 400);
        }
        const mensagem = body.mensagem.trim();
        if (mensagem.length > 1000) {
          return errorJson("A mensagem deve ter no máximo 1.000 caracteres.", 413);
        }

        const historicoInput = Array.isArray(body.historico) ? body.historico : [];
        if (!historicoInput.every(isHistoryMessage)) {
          return errorJson("O histórico da conversa está em formato inválido.", 400);
        }

        const historico = historicoInput.slice(-12).map((entry) => ({
          role: entry.role,
          content: entry.content.slice(0, 4000),
        }));

        try {
          const { data, error } = await getDioChatSupabaseClient().functions.invoke("dio-chat", {
            body: { mensagem, historico },
          });

          if (error || !data) {
            return errorJson(
              "Não foi possível consultar o assistente conectado. A demonstração local continua disponível.",
              502,
            );
          }
          if (typeof data.erro === "string" && data.erro.trim()) {
            return errorJson(data.erro.slice(0, 500), 502);
          }

          const result = data as Partial<DioChatSuccess>;
          if (
            typeof result.resposta !== "string" ||
            (result.modo !== "claude" && result.modo !== "regras") ||
            !result.meta ||
            typeof result.meta.registros !== "number" ||
            typeof result.meta.fonte !== "string" ||
            !(
              result.meta.periodo === null ||
              (typeof result.meta.periodo?.inicio === "string" &&
                typeof result.meta.periodo?.fim === "string")
            )
          ) {
            return errorJson("O assistente retornou uma resposta em formato inesperado.", 502);
          }

          return Response.json({
            resposta: result.resposta,
            modo: result.modo,
            meta: result.meta,
          } satisfies DioChatSuccess);
        } catch {
          return errorJson(
            "A integração com o assistente está indisponível no servidor. A demonstração local continua disponível.",
            503,
          );
        }
      },
    },
  },
});
