<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to Lovable. Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- The chat flow is src/routes/index.tsx → askDioChat() in src/lib/dio-chat.service.ts → POST /api/dio-chat → Supabase Edge Function dio-chat. Keep the service-role client in src/lib/dio-chat.server.ts; never import it into browser code or expose its credentials. If the remote function fails, the UI falls back to answer() in src/lib/finance.ts and must clearly label the response as local demo data.
- The dio-chat Edge Function source lives in supabase/functions/dio-chat/index.ts (rule-based answers over Plaid Sandbox REST endpoints, not an MCP client). Do not claim it is deployed or verified until execution evidence is added. The Pluggy Docs MCP is documentation-only; it is not a financial-data MCP server.
- Dashboard data comes from the Pluggy provider when a connection is active and from demoProvider otherwise. Do not derive account balances from the transaction sample: the sample is illustrative, not a reconciled ledger. Keep bank cash, card debt, and available credit separate.
- Pluggy API credentials and session secrets are server-only. The server integration lives in src/lib/pluggy.server.ts and src/routes/api.pluggy-*.ts; never prefix secrets with VITE_ or expose them to the browser.
- The current Pluggy connection identity is browser-scoped demonstration state, not production multi-user authentication. Do not present it as a secure multi-user tenancy model.
- src/lib/plaid/ contains legacy, pure Plaid mapping/pagination preparation and is not the active bank connection. Do not merge it into or substitute it for the current Pluggy integration without an explicit requirement.
- Keep the application runnable in local demo mode without credentials. Do not add credentials, create database tables, or publish/deploy the app unless the user explicitly requests that separate action.
- Nexora Finance calls the `dio-chat` Supabase Edge Function through the replaceable service in src/lib/chat-service.ts; on failure, `answer()` in src/lib/finance.ts supplies the clearly labeled local demo fallback. Why: keeps backend integration out of UI components while preserving demo behavior.
- Dashboard account and transaction views consume the demo provider and shared financial helpers; do not derive bank balances from the transaction sample. Why: the transactions are a partial illustrative history, not a reconciled ledger.
- Plaid prep lives in src/lib/plaid/: pure mappers/pagination (testable, no network), secrets read only in _.server.ts inside handlers, never VITE__. Why: keeps credentials server-side and the app runnable in demo mode with no credentials.
