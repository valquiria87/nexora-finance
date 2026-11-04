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
continua pendente. O histórico de validação deste checkout registra `dio-chat` publicada como v4 ACTIVE e uma chamada real bem-sucedida pelo endpoint do app, com `modo: "regras"`. Antes da entrega, confirme no painel Supabase que a função continua ACTIVE e repita o teste ponta a ponta. Não crie outra função nem faça deploy se o código remoto já corresponder ao arquivo versionado.
```

## Sequência manual

1. Confirme no Lovable que o projeto selecionado é o que serve a URL publicada e está ligado ao repositório correto. O site público observado ainda mostra a identidade anterior e três sugestões; este checkout usa a marca Nexora, o produto Nexora Finance, o assistente Dio e tem cinco sugestões no código.
2. Sincronize/revise o branch atual no Lovable. Inspecione as alterações antes de aceitar. O CI local cobre testes, avaliação, lint, typecheck e build; os MCPs externos não são inicializados pelo CI.
3. Verifique a função `dio-chat` já existente no projeto Supabase. O código versionado está em `supabase/functions/dio-chat/index.ts`; o histórico registra a versão remota v4 ACTIVE e secrets configurados. Confirme o estado atual, compare o código remoto com o versionado e teste contrato, leituras da Plaid Sandbox, paginação, limites, erros e logs. Só faça deploy se houver diferença aprovada. Não crie tabelas sem necessidade.
4. Configure os valores server-side necessários ao runtime TanStack. `SUPABASE_SERVICE_ROLE_KEY` não deve ser enviado ao navegador nem colocado em variável pública.
5. Repita o teste ponta a ponta no ambiente publicado: envie uma pergunta, confirme resposta remota válida no contrato e verifique que o selo de integração só aparece após o sucesso. O teste local deste checkout já retornou HTTP 200 pela rota `/api/dio-chat`, com `modo: "regras"`; isso não substitui a validação pública.
6. Revise marca, textos, responsividade, dados fictícios, erros e comportamento de exclusão. Só publique após aprovação manual.
7. Após publicar, teste a URL anônima e atualize README com status verificado, data, capturas sem dados sensíveis e qualquer diferença restante.

## O que não fazer

- Não afirmar que os dados estáticos vêm de uma conexão Plaid ativa.
- Não transportar tokens/segredos em URL, storage do navegador, prompt ou screenshot.
- Não habilitar o MCP local como backend público; o serviço MCP financeiro ainda não existe e requer OAuth, autorização por usuário e testes de isolamento.
- Não publicar automaticamente ou sobrescrever histórico Git existente.
