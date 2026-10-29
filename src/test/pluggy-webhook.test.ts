import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  handlePluggyWebhook,
  timingSafeEqual,
  verifyPluggyWebhookSecret,
} from "@/lib/pluggy.server";
import {
  claimWebhookEvent,
  markWebhookEventCompleted,
  markWebhookEventFailed,
  WebhookPersistenceError,
  type WebhookEventRecord,
} from "@/lib/supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";

const TEST_SECRET = "test-webhook-secret-at-least-32-chars-long";

describe("timingSafeEqual", () => {
  it("retorna true para strings idênticas", () => {
    expect(timingSafeEqual("abc123XYZ", "abc123XYZ")).toBe(true);
    expect(timingSafeEqual(TEST_SECRET, TEST_SECRET)).toBe(true);
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("retorna false para strings de comprimentos diferentes", () => {
    expect(timingSafeEqual("curto", "comprimento_maior")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });

  it("retorna false para strings de mesmo tamanho com conteúdo diferente", () => {
    expect(timingSafeEqual("abcdef", "abcdeg")).toBe(false);
    expect(timingSafeEqual("12345678", "87654321")).toBe(false);
  });

  it("retorna false para entradas inválidas (não-strings)", () => {
    // @ts-expect-error teste com tipos inválidos em runtime
    expect(timingSafeEqual(null, "abc")).toBe(false);
    // @ts-expect-error teste com tipos inválidos em runtime
    expect(timingSafeEqual("abc", undefined)).toBe(false);
  });
});

describe("Autenticação do Webhook da Pluggy", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, PLUGGY_WEBHOOK_SECRET: TEST_SECRET };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("retorna 503 se PLUGGY_WEBHOOK_SECRET não estiver configurado no servidor", () => {
    delete process.env["PLUGGY_WEBHOOK_SECRET"];
    const req = new Request("http://localhost/api/pluggy-webhook", {
      method: "POST",
      headers: { "x-webhook-secret": TEST_SECRET },
    });
    const result = verifyPluggyWebhookSecret(req);
    expect(result.valid).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error).toContain("não configurado");
  });

  it("retorna 401 se nenhum header de autenticação for fornecido", () => {
    const req = new Request("http://localhost/api/pluggy-webhook", {
      method: "POST",
    });
    const result = verifyPluggyWebhookSecret(req);
    expect(result.valid).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toContain("ausente");
  });

  it("retorna 401 se o segredo for incorreto", () => {
    const req = new Request("http://localhost/api/pluggy-webhook", {
      method: "POST",
      headers: { "x-webhook-secret": "segredo-incorreto" },
    });
    const result = verifyPluggyWebhookSecret(req);
    expect(result.valid).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toContain("inválido");
  });

  it("autentica com sucesso com x-webhook-secret correto", () => {
    const req = new Request("http://localhost/api/pluggy-webhook", {
      method: "POST",
      headers: { "x-webhook-secret": TEST_SECRET },
    });
    const result = verifyPluggyWebhookSecret(req);
    expect(result.valid).toBe(true);
  });

  it("autentica com sucesso com x-signature", () => {
    const req = new Request("http://localhost/api/pluggy-webhook", {
      method: "POST",
      headers: { "x-signature": TEST_SECRET },
    });
    const result = verifyPluggyWebhookSecret(req);
    expect(result.valid).toBe(true);
  });

  it("autentica com sucesso com Authorization Bearer", () => {
    const req = new Request("http://localhost/api/pluggy-webhook", {
      method: "POST",
      headers: { authorization: `Bearer ${TEST_SECRET}` },
    });
    const result = verifyPluggyWebhookSecret(req);
    expect(result.valid).toBe(true);
  });
});

/**
 * Cria um mock de cliente Supabase que simula fielmente as operações
 * na tabela `webhook_events` (insert atômico, conflito de chave primária, select e update).
 */
function createMockSupabaseClient(initialRows: WebhookEventRecord[] = []) {
  const store = new Map<string, WebhookEventRecord>();
  for (const row of initialRows) {
    store.set(row.event_id, { ...row });
  }

  let shouldFailOperations = false;
  let failureErrorMessage = "Simulated database connection failure";

  const client = {
    setShouldFail(fail: boolean, msg = "Simulated database connection failure") {
      shouldFailOperations = fail;
      failureErrorMessage = msg;
    },
    getRows() {
      return store;
    },
    from(table: string) {
      if (table !== "webhook_events") {
        throw new Error(`Tabela não suportada no mock: ${table}`);
      }

      return {
        insert(data: Partial<WebhookEventRecord>) {
          return {
            select() {
              return {
                maybeSingle: async () => {
                  if (shouldFailOperations) {
                    return { data: null, error: { message: failureErrorMessage, code: "50000" } };
                  }
                  const id = data.event_id!;
                  if (store.has(id)) {
                    // Simular violação de chave primária do Postgres (código 23505)
                    return {
                      data: null,
                      error: {
                        code: "23505",
                        message: "duplicate key value violates unique constraint",
                      },
                    };
                  }
                  const created: WebhookEventRecord = {
                    event_id: id,
                    event_type: data.event_type ?? "unknown",
                    item_id: data.item_id ?? null,
                    status: (data.status as WebhookEventRecord["status"]) ?? "processing",
                    attempts: data.attempts ?? 1,
                    error_code: data.error_code ?? null,
                    error_message: data.error_message ?? null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    processed_at: null,
                  };
                  store.set(id, created);
                  return { data: created, error: null };
                },
              };
            },
          };
        },
        select() {
          return {
            eq(column: string, val: string) {
              return {
                single: async () => {
                  if (shouldFailOperations) {
                    return { data: null, error: { message: failureErrorMessage, code: "50000" } };
                  }
                  if (column === "event_id") {
                    const row = store.get(val);
                    if (!row) return { data: null, error: { message: "Row not found" } };
                    return { data: { ...row }, error: null };
                  }
                  return { data: null, error: { message: "Coluna não suportada" } };
                },
              };
            },
          };
        },
        update(updates: Partial<WebhookEventRecord>) {
          return {
            eq(column: string, val: string) {
              const runUpdate = () => {
                if (shouldFailOperations) {
                  return { data: null, error: { message: failureErrorMessage, code: "50000" } };
                }
                if (column === "event_id") {
                  const existing = store.get(val);
                  if (!existing) {
                    return { data: null, error: { message: "Row not found for update" } };
                  }
                  const updated: WebhookEventRecord = {
                    ...existing,
                    ...updates,
                    updated_at: new Date().toISOString(),
                  };
                  store.set(val, updated);
                  return { data: updated, error: null };
                }
                return { data: null, error: { message: "Coluna não suportada" } };
              };

              return {
                select() {
                  return {
                    single: async () => runUpdate(),
                  };
                },
                then(
                  resolve: (val: { data: WebhookEventRecord | null; error: unknown }) => unknown,
                ) {
                  return Promise.resolve(runUpdate()).then(resolve);
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient & {
    setShouldFail: (fail: boolean, msg?: string) => void;
    getRows: () => Map<string, WebhookEventRecord>;
  };

  return client;
}

describe("Camada de Persistência Supabase (supabase.server.ts)", () => {
  it("claimWebhookEvent insere novo evento com status 'processing' e attempts=1", async () => {
    const mockClient = createMockSupabaseClient();
    const result = await claimWebhookEvent(
      { eventId: "evt_novo", eventType: "item/updated", itemId: "item_1" },
      mockClient,
    );

    expect(result.action).toBe("process");
    expect(result.record.event_id).toBe("evt_novo");
    expect(result.record.status).toBe("processing");
    expect(result.record.attempts).toBe(1);
  });

  it("claimWebhookEvent identifica duplicidade quando status já é 'completed'", async () => {
    const mockClient = createMockSupabaseClient([
      {
        event_id: "evt_concluido",
        event_type: "item/updated",
        item_id: "item_1",
        status: "completed",
        attempts: 1,
        error_code: null,
        error_message: null,
        processed_at: new Date().toISOString(),
      },
    ]);

    const result = await claimWebhookEvent(
      { eventId: "evt_concluido", eventType: "item/updated", itemId: "item_1" },
      mockClient,
    );

    expect(result.action).toBe("duplicate");
    expect(result.record.status).toBe("completed");
  });

  it("claimWebhookEvent identifica 'in_flight' quando evento está sendo processado concorrentemente", async () => {
    const mockClient = createMockSupabaseClient([
      {
        event_id: "evt_concorrente",
        event_type: "item/updated",
        item_id: "item_1",
        status: "processing",
        attempts: 1,
        error_code: null,
        error_message: null,
        processed_at: null,
      },
    ]);

    const result = await claimWebhookEvent(
      { eventId: "evt_concorrente", eventType: "item/updated", itemId: "item_1" },
      mockClient,
    );

    expect(result.action).toBe("in_flight");
  });

  it("claimWebhookEvent permite retentativa segura para evento que falhou anteriormente", async () => {
    const mockClient = createMockSupabaseClient([
      {
        event_id: "evt_falho",
        event_type: "item/updated",
        item_id: "item_1",
        status: "failed",
        attempts: 1,
        error_code: "ITEM_VERIFICATION_FAILED",
        error_message: "Erro temporário",
        processed_at: null,
      },
    ]);

    const result = await claimWebhookEvent(
      { eventId: "evt_falho", eventType: "item/updated", itemId: "item_1" },
      mockClient,
    );

    expect(result.action).toBe("process");
    expect(result.record.status).toBe("processing");
    expect(result.record.attempts).toBe(2);
    expect(result.record.error_code).toBeNull();
  });

  it("lança WebhookPersistenceError se a operação no banco falhar", async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.setShouldFail(true, "Conexão com PostgreSQL recusada");

    await expect(
      claimWebhookEvent(
        { eventId: "evt_erro_banco", eventType: "item/updated", itemId: "item_1" },
        mockClient,
      ),
    ).rejects.toThrow(WebhookPersistenceError);
  });

  it("markWebhookEventCompleted atualiza status para 'completed' e define processed_at", async () => {
    const mockClient = createMockSupabaseClient([
      {
        event_id: "evt_1",
        event_type: "item/updated",
        item_id: "item_1",
        status: "processing",
        attempts: 1,
        error_code: null,
        error_message: null,
        processed_at: null,
      },
    ]);

    await markWebhookEventCompleted({ eventId: "evt_1" }, mockClient);
    const updated = mockClient.getRows().get("evt_1");
    expect(updated?.status).toBe("completed");
    expect(updated?.processed_at).toBeDefined();
  });

  it("markWebhookEventFailed atualiza status para 'failed' com código e mensagem não sensíveis", async () => {
    const mockClient = createMockSupabaseClient([
      {
        event_id: "evt_falha_1",
        event_type: "item/updated",
        item_id: "item_1",
        status: "processing",
        attempts: 1,
        error_code: null,
        error_message: null,
        processed_at: null,
      },
    ]);

    await markWebhookEventFailed(
      {
        eventId: "evt_falha_1",
        errorCode: "ITEM_VERIFICATION_FAILED",
        errorMessage: "Item não encontrado na Pluggy",
      },
      mockClient,
    );

    const updated = mockClient.getRows().get("evt_falha_1");
    expect(updated?.status).toBe("failed");
    expect(updated?.error_code).toBe("ITEM_VERIFICATION_FAILED");
    expect(updated?.error_message).toBe("Item não encontrado na Pluggy");
  });
});

describe("handlePluggyWebhook com Supabase", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PLUGGY_WEBHOOK_SECRET: TEST_SECRET,
      PLUGGY_CLIENT_ID: "mock-client-id",
      PLUGGY_CLIENT_SECRET: "mock-client-secret",
      SUPABASE_URL: "https://mock.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "mock-service-role-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  function makeWebhookRequest(body: unknown, secret = TEST_SECRET): Request {
    return new Request("http://localhost/api/pluggy-webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { "x-webhook-secret": secret } : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("retorna 503 se credenciais do Supabase não estiverem configuradas no servidor", async () => {
    delete process.env["SUPABASE_URL"];
    delete process.env["SUPABASE_SERVICE_ROLE_KEY"];

    const req = makeWebhookRequest({
      event: "item/updated",
      eventId: "evt_sem_supabase",
      itemId: "item_1",
    });

    const res = await handlePluggyWebhook(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("Credenciais do Supabase não configuradas");
  });

  it("retorna 500 se o banco Supabase estiver inacessível (falha de persistência)", async () => {
    const mockSupabase = createMockSupabaseClient();
    mockSupabase.setShouldFail(true, "Database timeout");

    const req = makeWebhookRequest({
      event: "item/updated",
      eventId: "evt_timeout_banco",
      itemId: "item_1",
    });

    const res = await handlePluggyWebhook(req, mockSupabase);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Falha na persistência do webhook");
  });

  it("processa evento novo com sucesso: insere como 'processing', valida Pluggy e conclui como 'completed' (200)", async () => {
    const mockSupabase = createMockSupabaseClient();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).endsWith("/auth")) {
        return new Response(JSON.stringify({ apiKey: "mock-api-key" }), { status: 200 });
      }
      if (String(url).includes("/items/item_valido")) {
        return new Response(
          JSON.stringify({
            id: "item_valido",
            status: "UPDATED",
            connector: { name: "Pluggy Bank" },
          }),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const req = makeWebhookRequest({
      event: "item/updated",
      eventId: "evt_novo_sucesso",
      itemId: "item_valido",
    });

    const res = await handlePluggyWebhook(req, mockSupabase);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      received: true,
      event: "item/updated",
      eventId: "evt_novo_sucesso",
      itemId: "item_valido",
      itemStatus: "UPDATED",
    });

    // Validar estado gravado no banco Supabase
    const saved = mockSupabase.getRows().get("evt_novo_sucesso");
    expect(saved).toBeDefined();
    expect(saved?.status).toBe("completed");
    expect(saved?.attempts).toBe(1);
    expect(saved?.processed_at).toBeDefined();
  });

  it("ignora evento duplicado sem reconsultar a API da Pluggy (200)", async () => {
    const mockSupabase = createMockSupabaseClient([
      {
        event_id: "evt_ja_processado",
        event_type: "item/updated",
        item_id: "item_valido",
        status: "completed",
        attempts: 1,
        error_code: null,
        error_message: null,
        processed_at: new Date().toISOString(),
      },
    ]);

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const req = makeWebhookRequest({
      event: "item/updated",
      eventId: "evt_ja_processado",
      itemId: "item_valido",
    });

    const res = await handlePluggyWebhook(req, mockSupabase);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      received: true,
      duplicate: true,
      eventId: "evt_ja_processado",
    });

    // A Pluggy não deve ser chamada para eventos duplicados
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("registra falha no Supabase quando a verificação do item na Pluggy falha (422)", async () => {
    const mockSupabase = createMockSupabaseClient();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).endsWith("/auth")) {
        return new Response(JSON.stringify({ apiKey: "mock-api-key" }), { status: 200 });
      }
      if (String(url).includes("/items/item_inexistente")) {
        return new Response(JSON.stringify({ error: "Item not found" }), { status: 404 });
      }
      return new Response("Not found", { status: 404 });
    });

    const req = makeWebhookRequest({
      event: "item/updated",
      eventId: "evt_item_inexistente",
      itemId: "item_inexistente",
    });

    const res = await handlePluggyWebhook(req, mockSupabase);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("não pôde ser verificado na Pluggy");

    // Validar que o registro no banco foi marcado como 'failed'
    const saved = mockSupabase.getRows().get("evt_item_inexistente");
    expect(saved?.status).toBe("failed");
    expect(saved?.error_code).toBe("ITEM_VERIFICATION_FAILED");
  });

  it("permite retentativa de evento após falha anterior e atualiza para 'completed'", async () => {
    // Evento registrado anteriormente como falho
    const mockSupabase = createMockSupabaseClient([
      {
        event_id: "evt_retentativa_1",
        event_type: "item/updated",
        item_id: "item_valido",
        status: "failed",
        attempts: 1,
        error_code: "ITEM_VERIFICATION_FAILED",
        error_message: "Pluggy temporariamente instável",
        processed_at: null,
      },
    ]);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).endsWith("/auth")) {
        return new Response(JSON.stringify({ apiKey: "mock-api-key" }), { status: 200 });
      }
      if (String(url).includes("/items/item_valido")) {
        return new Response(JSON.stringify({ id: "item_valido", status: "UPDATED" }), {
          status: 200,
        });
      }
      return new Response("Not found", { status: 404 });
    });

    const req = makeWebhookRequest({
      event: "item/updated",
      eventId: "evt_retentativa_1",
      itemId: "item_valido",
    });

    const res = await handlePluggyWebhook(req, mockSupabase);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.duplicate).toBeUndefined();

    // Validar que no banco foi atualizado para attempts=2 e status='completed'
    const saved = mockSupabase.getRows().get("evt_retentativa_1");
    expect(saved?.status).toBe("completed");
    expect(saved?.attempts).toBe(2);
    expect(saved?.error_code).toBeNull();
  });

  it("processa evento 'item/deleted' marcando no Supabase como completed sem consultar item ativo (200)", async () => {
    const mockSupabase = createMockSupabaseClient();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const req = makeWebhookRequest({
      event: "item/deleted",
      eventId: "evt_deleted_1",
      itemId: "item_deletado",
    });

    const res = await handlePluggyWebhook(req, mockSupabase);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.event).toBe("item/deleted");

    expect(fetchSpy).not.toHaveBeenCalled();

    const saved = mockSupabase.getRows().get("evt_deleted_1");
    expect(saved?.status).toBe("completed");
  });
});
