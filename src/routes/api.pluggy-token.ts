import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  ownerCookie,
  pluggyTokenConfigError,
  PluggyError,
  sessionIdentity,
} from "@/lib/pluggy.server";

export const Route = createFileRoute("/api/pluggy-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const readinessError = pluggyTokenConfigError();
        if (readinessError)
          return Response.json({ error: readinessError.message }, { status: 503 });
        const clientId = process.env["PLUGGY_CLIENT_ID"];
        const clientSecret = process.env["PLUGGY_CLIENT_SECRET"];

        if (!clientId || !clientSecret) {
          return Response.json(
            { error: "Credenciais da Pluggy não configuradas." },
            { status: 500 },
          );
        }

        try {
          const authResponse = await fetch("https://api.pluggy.ai/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId, clientSecret }),
          });

          if (!authResponse.ok) {
            return Response.json({ error: "A autenticação com a Pluggy falhou." }, { status: 502 });
          }

          const authData = (await authResponse.json()) as {
            apiKey?: string;
          };

          if (!authData.apiKey) {
            return Response.json(
              { error: "A Pluggy não retornou uma chave de API válida." },
              { status: 502 },
            );
          }

          const owner = await sessionIdentity(request);
          const tokenResponse = await fetch("https://api.pluggy.ai/connect_token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": authData.apiKey,
            },
            body: JSON.stringify({ options: { clientUserId: owner, avoidDuplicates: true } }),
          });

          if (!tokenResponse.ok) {
            return Response.json(
              { error: "Não foi possível gerar o token de conexão." },
              { status: 502 },
            );
          }

          const tokenData = (await tokenResponse.json()) as {
            accessToken?: string;
          };

          if (!tokenData.accessToken) {
            return Response.json(
              { error: "A Pluggy não retornou o token de conexão." },
              { status: 502 },
            );
          }

          return new Response(JSON.stringify({ accessToken: tokenData.accessToken }), {
            headers: { "content-type": "application/json", "set-cookie": await ownerCookie(owner) },
          });
        } catch (error) {
          if (error instanceof PluggyError) return errorResponse(error);
          return Response.json(
            { error: "Não foi possível comunicar com a Pluggy." },
            { status: 502 },
          );
        }
      },
    },
  },
});
