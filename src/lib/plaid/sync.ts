// Paginação de /transactions/sync. A busca de página é injetada: aqui não há chamada real ao Plaid.
import type { PlaidSyncPage, PlaidTransaction } from "./types";

export type FetchSyncPage = (cursor: string | null) => Promise<PlaidSyncPage>;

export interface SyncResult {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: string[];
  /** Cursor a ser gravado somente após a última página. */
  nextCursor: string | null;
}

const MUTATION_ERROR = "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION";

function isMutationError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { error_code?: string }).error_code === MUTATION_ERROR
  );
}

export async function syncAllTransactions(
  fetchPage: FetchSyncPage,
  startCursor: string | null,
  maxRestarts = 3,
): Promise<SyncResult> {
  for (let attempt = 0; ; attempt++) {
    const added: PlaidTransaction[] = [];
    const modified: PlaidTransaction[] = [];
    const removed: string[] = [];
    let cursor = startCursor;
    try {
      let hasMore = true;
      while (hasMore) {
        const page = await fetchPage(cursor);
        added.push(...page.added);
        modified.push(...page.modified);
        removed.push(...page.removed.map((r) => r.transaction_id));
        cursor = page.next_cursor;
        hasMore = page.has_more;
      }
      return { added, modified, removed, nextCursor: cursor };
    } catch (e) {
      // Descarta o acumulado e recomeça do cursor original.
      if (isMutationError(e) && attempt < maxRestarts) continue;
      throw e;
    }
  }
}
