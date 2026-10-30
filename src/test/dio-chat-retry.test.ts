import { describe, expect, it, vi } from "vitest";
import { getDioChatStatus, isRetryableDioChatError } from "@/lib/dio-chat-retry";
import { retry } from "@/lib/retry";

describe("retries da Edge Function dio-chat", () => {
  it("repete até sucesso, com espera exponencial e tentativas limitadas", async () => {
    const wait = vi.fn(async () => {});
    let calls = 0;
    const result = await retry(
      async () => {
        calls++;
        if (calls < 3) throw new TypeError("network unavailable");
        return "ok";
      },
      { maxAttempts: 3, delayMs: 10, shouldRetry: isRetryableDioChatError, wait },
    );

    expect(result).toBe("ok");
    expect(calls).toBe(3);
    expect(wait.mock.calls).toEqual([[10], [20]]);
  });

  it("para depois do número configurado de tentativas", async () => {
    const operation = vi.fn(async () => {
      throw new TypeError("network unavailable");
    });

    await expect(
      retry(operation, {
        maxAttempts: 3,
        delayMs: 1,
        shouldRetry: isRetryableDioChatError,
        wait: async () => {},
      }),
    ).rejects.toThrow("network unavailable");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("não repete erros HTTP 4xx que não sejam 429", () => {
    const error = { context: new Response(null, { status: 404 }) };
    expect(getDioChatStatus(error)).toBe(404);
    expect(isRetryableDioChatError(error)).toBe(false);
    expect(isRetryableDioChatError({ context: new Response(null, { status: 408 }) })).toBe(true);
    expect(isRetryableDioChatError({ context: new Response(null, { status: 429 }) })).toBe(true);
    expect(isRetryableDioChatError({ context: new Response(null, { status: 503 }) })).toBe(true);
  });
});
