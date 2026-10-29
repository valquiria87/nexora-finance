import { createFileRoute } from "@tanstack/react-router";
import {
  clearSessionCookie,
  errorResponse,
  linkedItemId,
  ownerCookie,
  pluggyFetch,
  sessionCookie,
  sessionIdentity,
} from "@/lib/pluggy.server";

export const Route = createFileRoute("/api/pluggy-session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const owner = await sessionIdentity(request);
          return new Response(JSON.stringify({ connected: Boolean(await linkedItemId(request)) }), {
            headers: { "content-type": "application/json", "set-cookie": await ownerCookie(owner) },
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { itemId?: unknown };
          if (typeof body.itemId !== "string" || !/^[\w-]{1,100}$/.test(body.itemId))
            return Response.json({ error: "Item inválido." }, { status: 400 });
          const owner = await sessionIdentity(request);
          const itemResponse = await pluggyFetch(`/items/${encodeURIComponent(body.itemId)}`);
          const item = (await itemResponse.json()) as { clientUserId?: string };
          if (item.clientUserId !== owner)
            return Response.json(
              { error: "Este item não pertence a esta sessão." },
              { status: 403 },
            );
          return new Response(JSON.stringify({ connected: true }), {
            headers: {
              "content-type": "application/json",
              "set-cookie": await sessionCookie(body.itemId, owner),
            },
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const itemId = await linkedItemId(request);
          if (itemId)
            await pluggyFetch(`/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
          return new Response(JSON.stringify({ connected: false }), {
            headers: { "content-type": "application/json", "set-cookie": clearSessionCookie },
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
