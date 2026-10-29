import { createServerFn } from "@tanstack/react-start";
import { getPlaidConfigStatus } from "./config.server";

/**
 * Informa o modo atual. A integração real ainda não existe: o app sempre opera em demonstração.
 * Não faz nenhuma chamada ao Plaid e não expõe credenciais.
 */
export const getIntegrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { configured } = getPlaidConfigStatus();
  return {
    mode: "demo" as const,
    plaidCredentialsPresent: configured,
    integrationImplemented: false,
  };
});
