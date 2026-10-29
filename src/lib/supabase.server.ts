import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseConfigError extends Error {}
export class WebhookPersistenceError extends Error {}

export type WebhookEventStatus = "processing" | "completed" | "failed" | "ignored";

export interface WebhookEventRecord {
  event_id: string;
  event_type: string;
  item_id: string | null;
  status: WebhookEventStatus;
  attempts: number;
  error_code: string | null;
  error_message: string | null;
  created_at?: string;
  updated_at?: string;
  processed_at?: string | null;
}

export function getSupabaseServerConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceRoleKey) {
    throw new SupabaseConfigError(
      "Credenciais do Supabase não configuradas no servidor (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return { url, serviceRoleKey };
}

let serverClientInstance: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  const { url, serviceRoleKey } = getSupabaseServerConfig();
  if (!serverClientInstance) {
    serverClientInstance = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverClientInstance;
}

export function resetSupabaseServerClientForTest(): void {
  serverClientInstance = null;
}

export type ClaimResult =
  | { action: "process"; record: WebhookEventRecord }
  | { action: "duplicate"; record: WebhookEventRecord }
  | { action: "in_flight"; record: WebhookEventRecord };

export async function claimWebhookEvent(
  params: {
    eventId: string;
    eventType: string;
    itemId?: string | null;
  },
  client?: SupabaseClient,
): Promise<ClaimResult> {
  const supabase = client ?? getSupabaseServerClient();
  const { eventId, eventType, itemId } = params;

  // 1. Inserção atômica inicial
  const { data: inserted, error: insertError } = await supabase
    .from("webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      item_id: itemId ?? null,
      status: "processing",
      attempts: 1,
    })
    .select()
    .maybeSingle();

  if (inserted && !insertError) {
    return { action: "process", record: inserted as WebhookEventRecord };
  }

  // 2. Se falhou por conflito de chave primária única (código 23505 no Postgres)
  const isConflict =
    insertError &&
    (insertError.code === "23505" ||
      insertError.message?.toLowerCase().includes("duplicate key") ||
      insertError.message?.toLowerCase().includes("unique constraint"));

  if (!isConflict && insertError) {
    throw new WebhookPersistenceError(
      `Falha na persistência do evento ${eventId}: ${insertError.message}`,
    );
  }

  // 3. Consultar o registro já existente
  const { data: existing, error: fetchError } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (fetchError || !existing) {
    throw new WebhookPersistenceError(
      `Falha ao consultar evento existente ${eventId}: ${fetchError?.message ?? "registro não encontrado"}`,
    );
  }

  const record = existing as WebhookEventRecord;

  // Se já foi processado ou ignorado: deduplicado com sucesso
  if (record.status === "completed" || record.status === "ignored") {
    return { action: "duplicate", record };
  }

  // Se já está sendo processado por outra requisição concorrente
  if (record.status === "processing") {
    return { action: "in_flight", record };
  }

  // Se falhou anteriormente: permitir retentativa segura e incrementar attempts
  if (record.status === "failed") {
    const nextAttempts = (record.attempts ?? 1) + 1;
    const { data: updated, error: updateError } = await supabase
      .from("webhook_events")
      .update({
        status: "processing",
        attempts: nextAttempts,
        updated_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      })
      .eq("event_id", eventId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new WebhookPersistenceError(
        `Falha ao reativar evento para retentativa ${eventId}: ${updateError?.message}`,
      );
    }

    return { action: "process", record: updated as WebhookEventRecord };
  }

  return { action: "duplicate", record };
}

export async function markWebhookEventCompleted(
  params: {
    eventId: string;
    status?: "completed" | "ignored";
  },
  client?: SupabaseClient,
): Promise<void> {
  const supabase = client ?? getSupabaseServerClient();
  const { error } = await supabase
    .from("webhook_events")
    .update({
      status: params.status ?? "completed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", params.eventId);

  if (error) {
    throw new WebhookPersistenceError(
      `Falha ao marcar evento ${params.eventId} como concluído: ${error.message}`,
    );
  }
}

export async function markWebhookEventFailed(
  params: {
    eventId: string;
    errorCode?: string;
    errorMessage?: string;
  },
  client?: SupabaseClient,
): Promise<void> {
  const supabase = client ?? getSupabaseServerClient();
  const { error } = await supabase
    .from("webhook_events")
    .update({
      status: "failed",
      error_code: params.errorCode ?? "UNKNOWN_ERROR",
      error_message: params.errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", params.eventId);

  if (error) {
    throw new WebhookPersistenceError(
      `Falha ao registrar falha do evento ${params.eventId}: ${error.message}`,
    );
  }
}
