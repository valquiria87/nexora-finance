# Nexora Finance — Open Finance e assistente financeiro

Projeto desenvolvido para o desafio de Open Finance da DIO, com uma interface financeira responsiva, painel de contas e transações, conexão bancária por meio da Pluggy e assistente conversacional em português.

> **Aviso:** este projeto é educacional. O modo de demonstração utiliza dados fictícios. Conexões Pluggy Sandbox também retornam dados sintéticos. Não utilize os dados exibidos para decisões financeiras reais.

## Funcionalidades

- Painel financeiro com visão de contas, saldos disponíveis, dívidas de cartão, transações e gastos por categoria.
- Conexão com instituições por meio do widget oficial Pluggy Connect.
- Consultas à API Pluggy realizadas no servidor; credenciais e identificadores de conexão não são usados como autorização no navegador.
- Modo de demonstração local, sem necessidade de credenciais, para permitir explorar a interface.
- Chat em português, com histórico local de conversas, sugestões, estado de carregamento, tratamento de falhas e nova tentativa.
- Integração do chat com a Supabase Edge Function \`dio-chat\`, por meio de uma rota server-side.
- Regras financeiras que mantêm dinheiro em contas, dívida de cartão e crédito disponível em campos separados.

## Arquitetura

\`\`\`text
Navegador
  ├── Painel / Pluggy Connect
  │     └── Rotas server-side /api/pluggy-*
  │           └── API Pluggy
  │
  └── Chat
        └── POST /api/dio-chat
              └── Supabase Edge Function: dio-chat
                    └── resposta do assistente
\`\`\`

### Chat e Supabase

O navegador envia a pergunta para \`POST /api/dio-chat\`. A rota valida a mensagem e o histórico, limita o histórico às 12 mensagens mais recentes e chama a função publicada no Supabase:

\`\`\`ts
supabase.functions.invoke("dio-chat", {
  body: { mensagem, historico },
});
\`\`\`

O payload contém \`mensagem\` e \`historico\`, sendo cada item do histórico formado por \`{ role: "user" | "assistant", content: string }\`. A interface espera uma resposta com \`resposta\`, \`modo\` e \`meta\` (período, quantidade de registros e fonte).

A implementação da rota e do cliente server-side está versionada em:
- \`src/routes/api.dio-chat.ts\`
- \`src/lib/dio-chat.server.ts\`
- \`src/lib/dio-chat.service.ts\`

**Importante:** o código-fonte da Edge Function \`dio-chat\` permanece no projeto Supabase e não está armazenado neste repositório. Este repositório documenta e implementa a chamada feita pela aplicação; não afirma que o código remoto da função ou a execução interna de ferramentas MCP foi auditada aqui. Para reproduzir integralmente o backend, a função também precisa ser versionada em um repositório ou exportada como artefato, sem incluir segredos.

### Pluggy

A aplicação usa o servidor TanStack Start para criar Connect Tokens, receber o resultado do widget Pluggy Connect e consultar contas e transações no servidor. O vínculo da conexão é mantido por cookie assinado, \`HttpOnly\`, com identidade de demonstração por navegador.

O fluxo atual não é um sistema de autenticação multiusuário nem uma implementação de produção. A documentação técnica e as limitações estão em [docs/pluggy-integration.md](docs/pluggy-integration.md).

### MCP: distinção importante

O Pluggy Docs MCP é um servidor remoto para consultar a documentação da Pluggy. Ele não equivale, por si só, a um servidor MCP que disponibiliza dados financeiros da pessoa usuária. A pesquisa conceitual sobre o objeto Item está em [docs/pluggy-mcp-item.md](docs/pluggy-mcp-item.md).

A existência de um MCP financeiro e a execução de ferramentas MCP dentro da Edge Function \`dio-chat\` não podem ser comprovadas somente pelo código deste repositório, pois a implementação remota da função não está versionada aqui. Não descreva essa parte como testada sem anexar o código ou evidências da execução.

## Regras e dados financeiros

- Sem conexão Pluggy ativa, o painel usa \`DEMO_ACCOUNTS\` e \`DEMO_TRANSACTIONS\` de \`src/lib/finance.ts\`.
- Os dados de demonstração são fictícios e não representam um extrato bancário completo.
- O saldo disponível considera apenas contas corrente e poupança.
- Dívidas e limites de cartão não são somados ao dinheiro disponível.
- Valor positivo em uma transação representa saída/despesa; valor negativo representa entrada.
- As transações são uma amostra ilustrativa e não reconciliam nem recalculam o saldo das contas.
- Valores ausentes são exibidos como não informados, sem estimativas.

## Tecnologias

- React 19 e TypeScript
- TanStack Start e TanStack Router
- Vite
- Tailwind CSS v4
- Supabase JavaScript Client
- Pluggy Connect e API Pluggy
- Vitest, Testing Library e jsdom
- Bun
- Lucide React e Recharts

## Executar localmente

Requisito: [Bun](https://bun.sh).

\`\`\`bash
bun install
bun run dev
\`\`\`

Para executar os testes, lint e build:

\`\`\`bash
bun run test
bun run lint
bun run build
\`\`\`

A demonstração local pode ser aberta sem credenciais. Para testar a conexão Pluggy e o chat conectado, configure as variáveis server-side descritas em [\`.env.example\`](.env.example). Nunca coloque credenciais em variáveis \`VITE_*\`, no código do navegador, em capturas de tela ou no Git.

## Variáveis de ambiente

Copie \`.env.example\` para \`.env\` e preencha somente no ambiente local ou no provedor de hospedagem:

| Variável | Uso |
| --- | --- |
| \`PLUGGY_CLIENT_ID\` / \`PLUGGY_CLIENT_SECRET\` | Credenciais da API Pluggy, somente no servidor |
| \`FINCHAT_SESSION_SECRET\` | Assinatura dos cookies de sessão de demonstração |
| \`SUPABASE_URL\` / \`SUPABASE_SERVICE_ROLE_KEY\` | Cliente server-side usado para invocar a Edge Function |
| \`DIO_CHAT_SUPABASE_URL\` / \`DIO_CHAT_SUPABASE_SERVICE_ROLE_KEY\` | Opcionais, apenas se \`dio-chat\` estiver em outro projeto Supabase |
| \`PLUGGY_WEBHOOK_SECRET\` | Segredo para validar notificações de webhook, se configurado |

A chave \`service_role\` concede privilégios elevados. Ela deve permanecer exclusivamente no servidor e nunca ser exposta ao navegador. Não envie valores dessas variáveis por chat ou documentação.

## Testes e integração contínua

Os testes automatizados ficam em \`src/test/\` e são executados com Vitest. O workflow do GitHub Actions executa testes, lint e build em pushes e pull requests para \`main\`.

A aprovação do workflow valida o código versionado. Ela não substitui um teste funcional com a Edge Function publicada, uma conexão Pluggy Sandbox ou uma sessão MCP real.

## Evidências para a entrega

Antes de apresentar o desafio, reúna evidências próprias e sem credenciais visíveis:

1. Tela do painel em modo de demonstração, com o aviso de dados fictícios.
2. Conexão Pluggy Sandbox concluída e dados sintéticos carregados, se esse fluxo fizer parte da demonstração.
3. Conversa real com a Edge Function \`dio-chat\`, incluindo uma pergunta sobre contas ou transações.
4. Evidência da execução das ferramentas MCP exigidas pelo enunciado, mostrando nome da ferramenta, parâmetros não sensíveis e resultado.
5. Capturas da interface em desktop e celular.

Não use números do laboratório, exemplos do professor ou dados fictícios como se fossem resultados de uma conta real. Não inclua tokens, chaves, cookies, identificadores privados ou dados pessoais.

## Estado e limites conhecidos

- A chamada da aplicação para a Edge Function \`dio-chat\` está implementada nesta branch.
- O código-fonte da Edge Function publicada não está incluído neste repositório.
- O painel Pluggy é executado por rotas server-side e pode operar com Sandbox; Sandbox contém dados sintéticos.
- O Pluggy Docs MCP é documentação, não prova de acesso a dados financeiros via MCP.
- A sessão Pluggy atual é uma identidade de demonstração por navegador, não autenticação multiusuário.
- A validação final da integração remota exige teste funcional no ambiente Supabase/Pluggy e evidências da execução MCP.

## Referências

- [Pluggy Docs](https://docs.pluggy.ai/)
- [Pluggy MCP](https://mcp.pluggy.ai/mcp)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [DIO](https://www.dio.me/)
