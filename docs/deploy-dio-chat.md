# Implantar a Edge Function `dio-chat`

Pré-requisitos: projeto Supabase, Supabase CLI (`npx supabase`), Client ID e Secret **de Sandbox** da Plaid (dashboard.plaid.com → Developers → Keys).

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase secrets set PLAID_CLIENT_ID=... PLAID_SECRET=...
npx supabase functions deploy dio-chat
```

- `PLAID_ACCESS_TOKEN` é opcional. Sem ele, a função cria um Item de Sandbox (First Platypus Bank, `ins_109508`, produto `transactions`) na primeira consulta.
- No app (variáveis **server-side**, nunca `VITE_`): `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do mesmo projeto.

## Teste rápido (sem expor chaves no print)

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/dio-chat" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "content-type: application/json" \
  -d '{"mensagem":"Mostrar minhas contas","historico":[]}'
```

Esperado: JSON com `resposta` (tabelas), `modo: "regras"` e `meta` com período e registros.
