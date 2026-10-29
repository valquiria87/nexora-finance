<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- FinChat answers come from `answer()` in src/lib/finance.ts over local demo data; swap it for a backend call later without touching the UI components. Why: keeps the future API integration in one place.
- Dashboard account and transaction views consume the demo provider and shared financial helpers; do not derive bank balances from the transaction sample. Why: the transactions are a partial illustrative history, not a reconciled ledger.
- Plaid prep lives in src/lib/plaid/: pure mappers/pagination (testable, no network), secrets read only in *.server.ts inside handlers, never VITE_*. Why: keeps credentials server-side and the app runnable in demo mode with no credentials.
