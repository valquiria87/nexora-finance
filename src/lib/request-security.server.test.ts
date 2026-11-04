import { describe, expect, it } from "vitest";
import {
  InvalidJsonBodyError,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
  sameOriginGuard,
} from "./request-security.server";

describe("sameOriginGuard", () => {
  it("allows same-origin browser requests", () => {
    const request = new Request("https://nexora.example/api/test", {
      method: "POST",
      headers: { origin: "https://nexora.example" },
    });
    expect(sameOriginGuard(request)).toBeNull();
  });

  it("rejects cross-origin and malformed Origin values", () => {
    const crossOrigin = new Request("https://nexora.example/api/test", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    });
    const malformed = new Request("https://nexora.example/api/test", {
      method: "POST",
      headers: { origin: "not an origin" },
    });
    expect(sameOriginGuard(crossOrigin)?.status).toBe(403);
    expect(sameOriginGuard(malformed)?.status).toBe(403);
  });

  it("does not reject requests without an Origin header", () => {
    const request = new Request("https://nexora.example/api/test", { method: "POST" });
    expect(sameOriginGuard(request)).toBeNull();
  });
});

describe("readJsonBodyLimited", () => {
  it("parses JSON within the configured byte limit", async () => {
    const request = new Request("https://nexora.example/api/test", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
      headers: { "content-type": "application/json" },
    });
    await expect(readJsonBodyLimited(request, 32)).resolves.toEqual({ ok: true });
  });

  it("rejects an oversized declared body before reading", async () => {
    const request = new Request("https://nexora.example/api/test", {
      method: "POST",
      body: "{}",
      headers: { "content-length": "100" },
    });
    await expect(readJsonBodyLimited(request, 10)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects an oversized streamed body even without Content-Length", async () => {
    const request = new Request("https://nexora.example/api/test", {
      method: "POST",
      body: JSON.stringify({ payload: "x".repeat(100) }),
    });
    await expect(readJsonBodyLimited(request, 10)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("https://nexora.example/api/test", {
      method: "POST",
      body: "{",
    });
    await expect(readJsonBodyLimited(request, 10)).rejects.toBeInstanceOf(InvalidJsonBodyError);
  });
});
