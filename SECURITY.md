# Nexora Finance — segurança e privacidade

Este projeto é uma demonstração educacional. Os dados locais e o modo Plaid Sandbox são fictícios; a publicação pública não deve receber dados bancários reais.

## Modelo de ameaça

| Ativo / fronteira | Ameaça | Controles existentes | Risco residual / ação necessária |
| --- | --- | --- | --- |
| Client ID/secret Plaid Sandbox | Commit acidental, captura ou log | `.env.plaid` é ignorado; o launcher lê as variáveis localmente e não as imprime | Rotacionar imediatamente se houver exposição. O segredo Sandbox não deve ser reutilizado em produção. |
| Segredos Supabase | Exposição no bundle/browser ou uso privilegiado indevido | `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são lidos em módulo server-only; sem prefixo `VITE_`; `.env.example` não contém valores | A chave service-role ignora RLS. Restringir acesso ao deploy, rotacioná-la e revisar a função antes de publicar. |
| Mensagens e respostas do chat | Acesso por outra pessoa no mesmo perfil/navegador ou cópia em backup do navegador | Histórico persistido apenas no `localStorage`; há ação para excluir conversa individual | Sem expiração automática e sem proteção contra outros usuários do mesmo perfil/browser. Apagar pelo navegador remove a cópia local, mas não garante exclusão de logs externos. |
| Supabase Edge Function e provedor de IA | Prompt injection, resposta incorreta, retenção de payload e indisponibilidade | Validação Zod, limite de mensagem, timeout, retry transitório, resposta validada e fallback local explícito | `dio-chat` não está no repositório nem foi localizada/publicada no projeto verificado. Revisar autenticação, logs, retenção, rate limit, custo e prompt antes do deploy. |
| Plaid Sandbox / integração bancária | Confundir sandbox com instituição real, permitir operação de escrita ou atravessar usuário/Item | O dashboard local é fictício; não soma transações como saldo; a integração de chat pretendida é somente leitura | O MCP externo Plaid pode incluir ferramenta de preparação/criação de Item Sandbox. Não declarar que todas as ferramentas MCP são read-only. A aplicação não deve expor ferramenta bancária de escrita. |
| Pluggy e consentimento | Ler o Item de outra sessão ou tratar sessão de navegador como conta de produção | Rotas server-side vinculam a conexão à identidade opaca assinada pelo servidor; fluxo de desconexão remove o Item | A identidade é por navegador e não substitui login/tenant persistente. Produção requer autenticação, autorização e isolamento por usuário. |

## Segredos e configuração

- `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_WEBHOOK_SECRET`, `FINCHAT_SESSION_SECRET`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são valores de servidor ou ambiente local privado. Nunca usar prefixo `VITE_`.
- `PLAID_CLIENT_ID` e `PLAID_SECRET` ficam no `.env.plaid` local, ignorado pelo Git. O servidor Plaid MCP local é iniciado pelo `.vscode/start-plaid-mcp.ps1`; não enviar o arquivo ao Lovable nem colocá-lo no repositório.
- `.env.example` documenta somente nomes, sem valores. Verifique o diff e o bundle de produção antes de publicar.
- Não registrar prompts, histórico, tokens, Client ID/secret, access tokens, Item IDs ou payload bancário. Os eventos de retry/falha do handler registram apenas tipo de evento, tentativa e status HTTP.
- O handler server-side usa uma service-role Supabase. Ela não deve ser disponibilizada ao cliente. A revisão do código da Edge Function e seus logs é pendente, pois a função não existe neste repositório.

## Somente leitura e limites do MCP

O dashboard e o fluxo de consulta pretendido não oferecem pagamento, transferência, contratação de crédito ou outra operação bancária de escrita. O desenho para o chat deve usar apenas leituras Plaid Sandbox (`/accounts/get` e `/transactions/get`) e validar ambiente, produto, período, paginação e tamanho das respostas no servidor.

Não há servidor MCP financeiro implementado neste repositório. O `mcp-server-plaid` configurado em VS Code é um programa externo e sua ferramenta de criação de Sandbox pode preparar Items/tokens; por isso, não é correto classificar o conjunto inteiro de ferramentas externas como somente leitura. Nunca expor essas ferramentas como ações de produção sem revisão, autorização explícita e testes de isolamento.

O Pluggy Docs MCP consulta documentação e não é um caminho de acesso a dados bancários. A integração Pluggy existente usa rotas próprias de consentimento e API, fora do MCP de documentação.

## Retenção e exclusão

- O histórico de conversa é armazenado em `localStorage` sob a chave legada `finchat-conversations` no perfil do navegador. O nome é preservado para não perder conversas já salvas. O código atual não define prazo de expiração. A pessoa pode excluir conversas individualmente na interface ou limpar os dados do site no navegador para remover todo o histórico local.
- Os cookies `finchat_pluggy_item` e `finchat_owner` e a variável `FINCHAT_SESSION_SECRET` mantêm nomes legados por compatibilidade com sessões e configurações já existentes. Renomeá-los poderia invalidar conexões/autenticação; não alterá-los nesta padronização visual.
- O chat envia a mensagem atual e até 20 mensagens anteriores para a Edge Function quando a integração está disponível. Como o código da função não está neste repositório, retenção pela plataforma Supabase, logs de função e provedor de IA são **desconhecidos e precisam ser definidos/verificados antes de habilitar o serviço**.
- Não há persistência de conversas em tabela Supabase criada por este projeto. Não prometa que excluir no navegador apaga cópias em logs ou serviços externos.
- Os dados demonstrativos são estáticos no bundle; não há dado pessoal real para excluir. Conexões Pluggy autorizadas podem ser removidas pelo fluxo de desconexão, que chama a remoção do Item no servidor.

## Evolução de autenticação MCP

Não há token MCP em URL implementado no app. Se um MCP financeiro remoto for criado, a evolução recomendada é OAuth com identidade do usuário, autorização server-side e vínculo seguro entre identidade e Item. Não aceitar access token, segredo ou Item ID como autorização enviada pelo cliente. Revogar consentimento/token e remover os dados associados quando a pessoa desconectar ou pedir exclusão.

## Checklist antes de publicar

- [ ] Confirmar que Git, artefatos e capturas não contêm `.env`, `.env.plaid`, tokens ou segredos.
- [ ] Confirmar que o bundle do navegador não contém service-role, segredo Pluggy/Plaid nem credenciais de IA.
- [ ] Revisar e testar `dio-chat` server-side; definir autenticação, limites, logging e retenção.
- [ ] Confirmar que somente dados fictícios são carregados na demo pública e que nenhum endpoint permite escrita financeira.
- [ ] Testar exclusão local de conversa e documentar limitações de retenção externa.
- [ ] Validar comportamento em erro/timeout e garantir que nenhum selo indique integração ativa sem resposta válida.

## Proteções das rotas HTTP (branch integra-nexora-dev)

As rotas que recebem JSON aplicam leitura limitada do stream antes do parse:
- `POST /api/pluggy-session`: 8 KiB.
- `POST /api/dio-chat`: 64 KiB.
- `POST /api/pluggy-webhook`: 64 KiB, após validar o segredo do webhook.

As rotas de mutação/integração no navegador (`/api/pluggy-token`, `/api/pluggy-session` e `/api/dio-chat`) rejeitam um cabeçalho `Origin` explícito que não corresponda à origem da própria aplicação. Chamadas sem `Origin` continuam aceitas para compatibilidade com integrações não-browser; isso não substitui autenticação de usuário nem uma política CSRF completa. O webhook usa segredo próprio e não depende de Origin.

**Limitação de produção ainda aberta — rate limiting distribuído:** não existe no repositório um armazenamento compartilhado ou gateway de rate limit configurado. Portanto, as rotas públicas Pluggy, chat e snapshot Plaid ainda não têm limitação distribuída de taxa/concorrência. Não usar mapas, contadores ou semáforos em memória como substituto: em runtime serverless eles não são compartilhados entre instâncias e reiniciam sem aviso. Antes de produção, provisionar um mecanismo compartilhado (por exemplo, serviço gerenciado de rate limit/Redis ou função atômica no banco) e definir limites por IP/sessão e por operação, com respostas 429 e observabilidade sem registrar tokens ou dados bancários.

Os limites de corpo e a checagem de Origin são camadas adicionais; não transformam a identidade anônima Pluggy em autenticação de usuário. A verificação de propriedade `clientUserId`, assinatura HMAC e TTL de 15 minutos dos tokens continuam obrigatórias.
