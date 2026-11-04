/**
 * Request guards for public server routes.
 *
 * These checks are intentionally stateless. They do not implement rate limiting;
 * distributed abuse protection requires a shared store/gateway configured by the
 * deployment environment.
 */
export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("O corpo da requisição excede o limite permitido.");
    this.name = "RequestBodyTooLargeError";
  }
}

export class InvalidJsonBodyError extends Error {
  constructor() {
    super("O pedido não contém JSON válido.");
    this.name = "InvalidJsonBodyError";
  }
}

/** Reject browser requests whose explicit Origin differs from the receiving origin. */
export function sameOriginGuard(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    if (new URL(origin).origin === new URL(request.url).origin) return null;
  } catch {
    // Treat malformed Origin values as untrusted.
  }

  return Response.json({ error: "Origem da requisição não permitida." }, { status: 403 });
}

/**
 * Read JSON with a hard streaming byte limit. Content-Length is only an early
 * rejection hint; the stream counter remains authoritative when it is absent
 * or inaccurate.
 */
export async function readJsonBodyLimited(request: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) throw new InvalidJsonBodyError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new InvalidJsonBodyError();
  }
}
