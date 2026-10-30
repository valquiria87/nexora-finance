# Integração do chat com a Supabase Edge Function

## Fluxo implementado

1. A interface mantém a conversa e prepara as últimas 12 mensagens anteriores.
2. O navegador chama a rota interna \`POST /api/dio-chat\`; a chave privilegiada do Supabase não é enviada ao navegador.
3. A rota valida \`mensagem\` e \`historico\`, limita a pergunta a 1.000 caracteres e o conteúdo de cada mensagem do histórico a 4.000 caracteres.
4. O servidor cria um cliente Supabase com credenciais exclusivamente server-side e executa:

\`\`\`ts
supabase.functions.invoke("dio-chat", {
  body: { mensagem, historico },
});
\`\`\`

5. A resposta validada é devolvida à interface. Em caso de falha, a interface informa que a consulta conectada falhou e oferece resposta local de demonstração.

## Contrato enviado

\`\`\`ts
type Historico = Array<{
  role: "user" | "assistant";
  content: string;
}>;

type RequestBody = {
  mensagem: string;
  historico: Historico;
};
\`\`\`

A aplicação envia apenas a pergunta atual e até 12 mensagens anteriores. O texto da mensagem atual é limitado a 1.000 caracteres; cada conteúdo do histórico é truncado em 4.000 caracteres.

## Contrato de resposta esperado

\`\`\`ts
type DioChatResponse = {
  resposta: string;
  modo: "claude" | "regras";
  meta: {
    periodo: { inicio: string; fim: string } | null;
    registros: number;
    fonte: string;
  };
};
\`\`\`

A Edge Function também pode retornar \`{ erro: string }\`, que é tratado como falha de integração.

## Configuração

Configure no ambiente de execução do servidor:
- \`SUPABASE_URL\`
- \`SUPABASE_SERVICE_ROLE_KEY\`

Se a Edge Function estiver em outro projeto Supabase, use também:
- \`DIO_CHAT_SUPABASE_URL\`
- \`DIO_CHAT_SUPABASE_SERVICE_ROLE_KEY\`

O cliente usa primeiro as variáveis \`DIO_CHAT_*\` e, se não estiverem definidas, usa \`SUPABASE_URL\` e \`SUPABASE_SERVICE_ROLE_KEY\`.

**Nunca** prefixe essas variáveis com \`VITE_\`, inclua seus valores no repositório ou envie chaves por chat. A chave \`service_role\` é privilegiada e deve existir apenas no servidor.

## Limite de escopo e evidência

O código da Edge Function está em `supabase/functions/dio-chat/index.ts`. Ela usa regras (modo `regras`) sobre a Plaid Sandbox. Implantação: `docs/deploy-dio-chat.md`.

O código versionado também não prova, sozinho, quais ferramentas MCP a Edge Function executa. Para comprovar a parte MCP do desafio, anexe evidências reais da execução (nome da ferramenta, parâmetros não sensíveis e resultado) e mantenha o código do backend disponível para auditoria quando possível.

O endpoint \`/api/dio-chat\` é uma rota de demonstração sem autenticação de usuário implementada neste projeto. Antes de qualquer uso público com dados reais, implemente autenticação, autorização por usuário, proteção contra abuso/rate limiting e controles de privacidade no backend.
