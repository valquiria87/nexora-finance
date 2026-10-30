import { z } from "zod";

export const MAX_CHAT_MESSAGE_LENGTH = 1000;
export const MAX_CHAT_HISTORY_MESSAGES = 20;

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DioChatResponse {
  resposta: string;
  modo: "claude" | "regras";
  meta: {
    periodo: { inicio: string; fim: string } | null;
    registros: number;
    fonte: string;
  };
}

const historyMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(20_000),
  })
  .superRefine((message, context) => {
    if (message.role === "user" && message.content.length > MAX_CHAT_MESSAGE_LENGTH)
      context.addIssue({
        code: "custom",
        message: `Mensagens do usuário devem ter no máximo ${MAX_CHAT_MESSAGE_LENGTH} caracteres.`,
        path: ["content"],
      });
  });

export const chatRequestSchema = z.object({
  mensagem: z
    .string()
    .trim()
    .min(1, "Digite uma pergunta antes de enviar.")
    .max(
      MAX_CHAT_MESSAGE_LENGTH,
      `A mensagem deve ter no máximo ${MAX_CHAT_MESSAGE_LENGTH} caracteres.`,
    ),
  historico: z.array(historyMessageSchema).max(MAX_CHAT_HISTORY_MESSAGES),
});

const dioChatResponseSchema = z.object({
  resposta: z.string().trim().min(1),
  modo: z.enum(["claude", "regras"]),
  meta: z.object({
    periodo: z
      .object({
        inicio: z.string(),
        fim: z.string(),
      })
      .nullable(),
    registros: z.number().int().nonnegative(),
    fonte: z.string(),
  }),
});

const dioChatErrorSchema = z.object({ erro: z.string().trim().min(1) });

export function createChatRequest(
  mensagem: string,
  historico: ChatHistoryMessage[],
): { mensagem: string; historico: ChatHistoryMessage[] } {
  const parsed = chatRequestSchema.safeParse({
    mensagem,
    historico: historico.slice(-MAX_CHAT_HISTORY_MESSAGES),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Pedido inválido.");
  return parsed.data;
}

export function parseDioChatResponse(value: unknown): DioChatResponse {
  const functionError = dioChatErrorSchema.safeParse(value);
  if (functionError.success) throw new Error(functionError.data.erro);

  const response = dioChatResponseSchema.safeParse(value);
  if (response.success) return response.data;
  throw new Error("A função dio-chat retornou uma resposta fora do contrato esperado.");
}
