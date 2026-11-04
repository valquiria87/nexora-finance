import { createFileRoute } from "@tanstack/react-router";
import { getDioChatSupabaseClient } from "@/lib/dio-chat.server";

export const Route = createFileRoute("/api/plaid-data")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await getDioChatSupabaseClient().functions.invoke<unknown>("dio-chat", {
            body: { acao: "snapshot" },
          });
          if (result.error) throw result.error;
          if (!result.data || typeof result.data !== "object" || !("snapshot" in result.data)) {
            const message =
              result.data &&
              typeof result.data === "object" &&
              "erro" in result.data &&
              typeof result.data.erro === "string"
                ? result.data.erro
                : "A Plaid Sandbox retornou dados em formato inesperado.";
            return Response.json({ error: message }, { status: 502 });
          }
          return Response.json(result.data);
        } catch (cause) {
          console.error(
            "plaid_snapshot_upstream_failure",
            cause instanceof Error ? cause.message : "unknown",
          );
          return Response.json(
            { error: "Não foi possível carregar os dados da Plaid Sandbox." },
            { status: 503 },
          );
        }
      },
    },
  },
});
