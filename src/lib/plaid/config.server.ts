// Somente servidor (bloqueado do navegador pelo sufixo .server).
// Lê variáveis no momento da chamada; nunca devolve os valores, só se existem.
export function getPlaidConfigStatus(): { configured: boolean; env: "sandbox" } {
  const hasId = Boolean(process.env["PLAID_CLIENT_ID"]);
  const hasSecret = Boolean(process.env["PLAID_SECRET"]);
  return { configured: hasId && hasSecret, env: "sandbox" };
}
