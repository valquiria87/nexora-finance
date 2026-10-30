import { createFileRoute } from "@tanstack/react-router";
import { getDioChatSupabaseClient } from "@/lib/dio-chat.server";
import { parseDioChatResponse, chatRequestSchema } from "@/lib/chat-contract";
import { getDioChatStatus, isRetryableDioChatError } from "@/lib/dio-chat-retry";
import { retry } from "@/lib/retry";
import type { DioChatSuccess } from "@/lib/dio-chat.service";

const MAX_ATTEMPTS = 3;

function errorJson(message: string, status: number) {
  return Response.json({ erro: message }, { status });
}

export const Route = createFileRoute("/api/dio-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorJson("O pedido não contém JSON válido.", 400);
        }

        const parsedRequest = chatRequestSchema.safeParse(body);
        if (!parsedRequest.success) {
          return errorJson(
            parsedRequest.error.issues[0]?.message ?? "O pedido está em formato inválido.",
            400,
          );
        }
        const { mensagem } = parsedRequest.data;
        const historico = parsedRequest.data.historico.slice(-12);

        let attempts = 0;
        try {
          const data = await retry(
            async () => {
              attempts++;
              const result = await getDioChatSupabaseClient().functions.invoke<unknown>("dio-chat", {
                body: { mensagem, historico },
              });
              if (result.error) throw result.error;
              if (!result.data) throw new Error("A função não retornou dados.");
              return result.data;
            },
            {
              maxAttempts: MAX_ATTEMPTS,
              delayMs: 250,
              shouldRetry: isRetryableDioChatError,
              onRetry: ({ attempt }) =>
                console.warn(
                  JSON.stringify({
                    event: "dio_chat_retry",
                    failed_attempt: attempt,
                    max_attempts: MAX_ATTEMPTS,
                  }),
                ),
            },
          );
          const response = parseDioChatResponse(data);
          return Response.json(response satisfies DioChatSuccess);
        } catch (cause) {
          console.error(
            JSON.stringify({
              event: "dio_chat_upstream_failure",
              attempts,
              status: getDioChatStatus(cause),
            }),
          );
          const parsed = parseDioChatResponseError(cause);
          return errorJson(
            parsed ??
              "A integração com o assistente está indisponível no servidor. A demonstração local continua disponível.",
            parsed ? 502 : 503,
          );
        }
      },
    },
  },
});

function parseDioChatResponseError(cause: unknown): string | null {
  if (cause instanceof Error && cause.message !== "A função não retornou dados.") {
    return cause.message;
  }
  return null;
}
