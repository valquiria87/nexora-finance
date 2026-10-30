import { createChatRequest } from "./chat-contract";
import type { ChatHistoryMessage, DioChatResponse } from "./chat-contract";
import { askDioChat } from "./dio-chat.service";

export {
  createChatRequest,
  MAX_CHAT_HISTORY_MESSAGES,
  MAX_CHAT_MESSAGE_LENGTH,
  parseDioChatResponse,
} from "./chat-contract";
export type { ChatHistoryMessage, DioChatResponse } from "./chat-contract";

export interface ChatService {
  ask(mensagem: string, historico: ChatHistoryMessage[]): Promise<DioChatResponse>;
}

export const backendChatService: ChatService = {
  async ask(mensagem, historico) {
    const request = createChatRequest(mensagem, historico);
    return askDioChat(request.mensagem, request.historico);
  },
};
