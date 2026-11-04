import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  fetchFinanceData,
  linkedItemId,
  sessionIdentity,
} from "@/lib/pluggy.server";

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== "";

export const Route = createFileRoute("/api/pluggy-diagnostics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const itemId = await linkedItemId(request);
          if (!itemId) return Response.json({ connected: false }, { status: 401 });

          const data = await fetchFinanceData(itemId);
          const owner = await sessionIdentity(request);
          if (data.item.clientUserId !== owner)
            return Response.json(
              { error: "A conexão Pluggy precisa ser refeita." },
              { status: 409 },
            );

          const cardAccounts = data.accounts.filter((account) =>
            /mastercard black/i.test(account.name ?? ""),
          );
          const accountIds = new Set(cardAccounts.map((account) => account.id));
          const transactions = data.transactions
            .filter((transaction) => accountIds.has(transaction.accountId))
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 50);

          const fields = [
            "operationType",
            "operationTypeAdditionalInfo",
            "descriptionRaw",
            "creditCardMetadata",
          ] as const;

          const counts = Object.fromEntries(
            fields.map((field) => [
              field,
              {
                present: transactions.filter((transaction) => hasValue(transaction[field])).length,
                missing: transactions.filter((transaction) => !hasValue(transaction[field])).length,
              },
            ]),
          );

          return Response.json({
            connected: true,
            source: data.item.connector?.name ?? "Pluggy",
            accountCount: cardAccounts.length,
            transactionCount: transactions.length,
            metadataCounts: counts,
            transactions: transactions.map((transaction) => ({
              date: transaction.date,
              description: transaction.description ?? null,
              type: transaction.type ?? null,
              operationType: transaction.operationType ?? null,
              operationTypeAdditionalInfo: transaction.operationTypeAdditionalInfo ?? null,
              descriptionRaw: transaction.descriptionRaw ?? null,
              creditCardMetadata: transaction.creditCardMetadata ?? null,
            })),
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
