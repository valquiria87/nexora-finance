export function getDioChatStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const context = error.context;
  if (!context || typeof context !== "object" || !("status" in context)) return null;
  return typeof context.status === "number" ? context.status : null;
}

export function isRetryableDioChatError(error: unknown): boolean {
  const status = getDioChatStatus(error);
  return status === null || status === 408 || status === 425 || status === 429 || status >= 500;
}
