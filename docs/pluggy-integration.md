# Pluggy integration status

The TanStack Start server issues Connect Tokens, hosts the official `react-pluggy-connect` widget, binds the returned Item to a signed, browser-scoped owner ID, and reads the Item, accounts, and up to 5,000 transactions per account over the last 12 months. Transaction reads use Pluggy's cursor endpoint (`GET /v2/transactions`). Account and transaction responses stay server-side until normalized into the dashboard's existing data-provider interface. Deleting the connection calls `DELETE /items/{id}`, which revokes consent and removes Pluggy's stored Item data.

## Local setup

Copy `.env.example` to `.env` and set `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, and a random `FINCHAT_SESSION_SECRET` of at least 32 characters. These are server secrets; do not add a `VITE_` prefix or commit `.env`. Start the app with `bun run dev`. The widget permits Sandbox connectors; Sandbox records are synthetic and do not represent a real account. Real institution access depends on Pluggy account access, connector availability, and the user's Open Finance consent.

The browser stores the signed opaque session cookies as `Secure`, `HttpOnly`, and `SameSite=Lax`. The signed owner ID prevents a caller from attaching an arbitrary Item: the server issues its Connect Token with that `clientUserId` and validates the same value before binding the Item. This is a single-browser demonstration identity, not a user login system or production multi-user tenancy. The current deployment preset is Cloudflare, so the cookie identifies the browser session but does not provide durable application account storage. Production use needs real authentication and a persistent user-to-item database.

## Lovable frontend

The current Lovable-connected TanStack app and backend run in the same origin, so it calls relative `/api/pluggy-*` routes and needs no CORS configuration. A separately hosted Lovable frontend is not configured for cross-origin credentials in this change. Before separating it, configure an explicit allowed origin, credentialed CORS, CSRF protections, and an authenticated backend session; do not expose Pluggy credentials or an Item ID to the frontend as authorization.

## MCP status

There is no MCP server in this repository yet. The app has no authenticated user identity for a remote MCP client to inherit, and `clientUserId` is a browser-scoped demonstration identity, so exposing financial tools over MCP now would not provide production-grade user authorization. A separate MCP service should use OAuth or another authenticated user-bound session and resolve the user's Item on the server; it should then expose read-only tools for accounts, balances, transactions, category summaries, and date-bounded expenses. It must not accept caller-supplied Item IDs.

The attempt to add the official MCP SDK was blocked because the package registry connection was refused in this environment. MCP behavior was therefore not implemented or claimed as tested. Once registry access and an authentication/persistence service exist, implement a Streamable HTTP MCP server as a separate service, then test initialize, tools/list, tools/call, parameter validation, and user isolation with a compatible MCP client.
