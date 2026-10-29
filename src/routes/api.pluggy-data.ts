import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  fetchFinanceData,
  linkedItemId,
  sessionIdentity,
} from "@/lib/pluggy.server";

export const Route = createFileRoute("/api/pluggy-data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const itemId = await linkedItemId(request);
          if (!itemId) return Response.json({ connected: false });
          const data = await fetchFinanceData(itemId);
          const owner = await sessionIdentity(request);
          if (data.item.clientUserId !== owner)
            return Response.json(
              { error: "A conexão Pluggy precisa ser refeita." },
              { status: 409 },
            );
          return Response.json({ connected: true, ...data });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
