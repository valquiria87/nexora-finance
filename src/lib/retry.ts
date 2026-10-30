export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  shouldRetry: (error: unknown) => boolean;
  onRetry?: (event: { attempt: number; error: unknown }) => void;
  wait?: (milliseconds: number) => Promise<void>;
}

export async function retry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const wait =
    options.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= options.maxAttempts || !options.shouldRetry(error)) throw error;
      options.onRetry?.({ attempt, error });
      await wait(options.delayMs * 2 ** (attempt - 1));
    }
  }
}
