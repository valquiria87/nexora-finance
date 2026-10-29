import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only client used to invoke dio-chat. A separate project can be configured
 * when the Edge Function is hosted outside the app's default Supabase project.
 * Never import this module from browser components.
 */
let client: SupabaseClient | null = null;
let activeConfig = "";

export function getDioChatSupabaseClient(): SupabaseClient {
  const url = process.env["DIO_CHAT_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key =
    process.env["DIO_CHAT_SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    throw new Error("A configuração server-side do Supabase para o chat está ausente.");
  }

  const configKey = `${url}:${key}`;
  if (!client || activeConfig !== configKey) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    activeConfig = configKey;
  }
  return client;
}
