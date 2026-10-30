# Nexora Finance — roteiro para atualizar o projeto no Lovable

Este roteiro não foi enviado ao Lovable nem publicado. Use-o manualmente no projeto já vinculado a `https://pocketwise-finance-chat.lovable.app`; confirme que o projeto e o repositório selecionados são `valquiria87/nexora-finance`.

## Pedido para colar no Lovable

```text
Atualize o projeto EXISTENTE para refletir o código atual do repositório
valquiria87/nexora-finance. Não crie outro projeto, não publique e não faça
deploy automaticamente. Primeiro mostre o que pretende mudar e aguarde minha
revisão antes de publicar.

Preserve a arquitetura TanStack/React e a camada substituível de chat.
Mantenha o modo demonstração sem login, usando exclusivamente registros
fictícios locais, e mostre sempre “Demonstração · Dados fictícios”.

Mantenha as cinco sugestões clicáveis, envio por Enter/botão, nova conversa,
histórico e exclusão local de conversa. A pergunta não pode ser vazia e tem
limite de 1.000 caracteres. Preserve o painel de contas, saldos e transações.
Não derive saldos da amostra de transações. Não misture moedas e não crie
operações de pagamento, transferência ou escrita bancária.

O chat integrado deve chamar o serviço server-side existente, que invoca
supabase.functions.invoke("dio-chat", { body: { mensagem, historico } }).
Não chame Supabase privilegiado, Plaid, Pluggy ou IA diretamente do navegador.
Não crie variável VITE_ para segredo e não peça que eu cole secrets em prompts
ou arquivos versionados.

Exiba resposta Markdown e tabelas roláveis horizontalmente em celular.
Mostre período e quantidade de registros retornados. Só mostre “Integração ativa
· Plaid Sandbox · dados fictícios” e o modo de resposta após validar uma
resposta real no contrato. Em erro/timeout, mostre o erro de forma clara, o
botão “Tentar de novo” e “Modo demonstração (dados locais)”; nunca mostre
“Conectado” como substituto de uma chamada real. Considere o timeout de 60 s.

Mantenha os insights descritivos locais e sinalize sua origem. Não os apresente
como aconselhamento financeiro nem como dados verificados pela Plaid.

Antes de qualquer publicação, teste a demo sem login, desktop/celular, cinco
sugestões, histórico/exclusão, resposta de sucesso, erro, timeout, fallback e
ausência de segredos no bundle. Informe explicitamente o que funciona e o que
continua pendente. Não declare dio-chat ativo: a função não foi localizada no
projeto Supabase e precisa ser criada/revisada e implantada separadamente.
```

## Sequência manual

1. Confirme no Lovable que o projeto selecionado é o que serve a URL publicada e está ligado ao repositório correto. O site público observado ainda mostra a identidade anterior e três sugestões; este checkout usa a marca Nexora, o produto Nexora Finance, o assistente Dio e tem cinco sugestões no código.
2. Sincronize/revise o branch atual no Lovable. Inspecione as alterações antes de aceitar. O CI local cobre testes, avaliação, lint, typecheck e build; os MCPs externos não são inicializados pelo CI.
3. Crie/revise `dio-chat` no projeto Supabase. O código da função não está neste repositório. Configure secrets somente no painel/ambiente server-side, teste o contrato e as leituras da Plaid Sandbox, paginação, limites, erros e logs. Não crie tabelas sem necessidade.
4. Configure os valores server-side necessários ao runtime TanStack. `SUPABASE_SERVICE_ROLE_KEY` não deve ser enviado ao navegador nem colocado em variável pública.
5. Teste manualmente o fluxo integrado com uma resposta de verdade e confirme que o selo só aparece nesse caso. Uma chamada anterior ao projeto configurado respondeu 404 `NOT_FOUND`.
6. Revise marca, textos, responsividade, dados fictícios, erros e comportamento de exclusão. Só publique após aprovação manual.
7. Após publicar, teste a URL anônima e atualize README com status verificado, data, capturas sem dados sensíveis e qualquer diferença restante.

## O que não fazer

- Não afirmar que os dados estáticos vêm de uma conexão Plaid ativa.
- Não transportar tokens/segredos em URL, storage do navegador, prompt ou screenshot.
- Não habilitar o MCP local como backend público; o serviço MCP financeiro ainda não existe e requer OAuth, autorização por usuário e testes de isolamento.
- Não publicar automaticamente ou sobrescrever histórico Git existente.
