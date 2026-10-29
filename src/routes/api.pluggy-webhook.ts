import { createFileRoute } from "@tanstack/react-router";
import { handlePluggyWebhook } from "@/lib/pluggy.server";

export const Route = createFileRoute("/api/pluggy-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handlePluggyWebhook(request);
      },
    },
  },
});
