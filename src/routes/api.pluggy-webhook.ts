import { createFileRoute } from "@tanstack/react-router";
import {
  handlePluggyWebhook,
  verifyPluggyWebhookSecret,
} from "@/lib/pluggy.server";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/lib/request-security.server";

export const Route = createFileRoute("/api/pluggy-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Authenticate before consuming the payload, then enforce a streaming size cap.
        const auth = verifyPluggyWebhookSecret(request);
        if (!auth.valid)
          return Response.json({ error: auth.error }, { status: auth.status ?? 401 });

        let payload: unknown;
        try {
          payload = await readJsonBodyLimited(request, 64 * 1024);
        } catch (error) {
          if (error instanceof RequestBodyTooLargeError)
            return Response.json({ error: error.message }, { status: 413 });
          return Response.json({ error: "JSON do webhook malformado." }, { status: 400 });
        }

        const forwardedHeaders = new Headers(request.headers);
        forwardedHeaders.delete("content-length");
        const forwarded = new Request(request.url, {
          method: "POST",
          headers: forwardedHeaders,
          body: JSON.stringify(payload),
        });
        return handlePluggyWebhook(forwarded);
      },
    },
  },
});
