

## Proteções das rotas HTTP (branch integra-nexora-dev)

As rotas que recebem JSON aplicam leitura limitada do stream antes do parse:
- `POST /api/pluggy-session`: 8 KiB.
- `POST /api/dio-chat`: 64 KiB.
- `POST /api/pluggy-webhook`: 64 KiB, após validar o segredo do webhook.

As rotas de mutação/integração no navegador (`/api/pluggy-token`, `/api/pluggy-session` e `/api/dio-chat`) rejeitam um cabeçalho `Origin` explícito que não corresponda à origem da própria aplicação. Chamadas sem `Origin` continuam aceitas para compatibilidade com integrações não-browser; isso não substitui autenticação de usuário nem uma política CSRF completa. O webhook usa segredo próprio e não depende de Origin.

**Limitação de produção ainda aberta — rate limiting distribuído:** não existe no repositório um armazenamento compartilhado ou gateway de rate limit configurado. Portanto, as rotas públicas Pluggy, chat e snapshot Plaid ainda não têm limitação distribuída de taxa/concorrência. Não usar mapas, contadores ou semáforos em memória como substituto: em runtime serverless eles não são compartilhados entre instâncias e reiniciam sem aviso. Antes de produção, provisionar um mecanismo compartilhado (por exemplo, serviço gerenciado de rate limit/Redis ou função atômica no banco) e definir limites por IP/sessão e por operação, com respostas 429 e observabilidade sem registrar tokens ou dados bancários.

Os limites de corpo e a checagem de Origin são camadas adicionais; não transformam a identidade anônima Pluggy em autenticação de usuário. A verificação de propriedade `clientUserId`, assinatura HMAC e TTL de 15 minutos dos tokens continuam obrigatórias.
