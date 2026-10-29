![Testes](https://github.com/valquiria87/finchat-ai/actions/workflows/main.yml/badge.svg)

# Nexora Finance — Open Finance e inteligência financeira

AplicaÃ§Ã£o web desenvolvida como entrega do desafio DIO Bradesco. O Nexora Finance demonstra como uma interface conversacional pode apresentar informaÃ§Ãµes financeiras de forma clara, com regras que mantÃªm saldo bancÃ¡rio, dÃ­vida de cartÃ£o e crÃ©dito disponÃ­vel separados.

> **Modos de dados:** sem conexÃ£o Pluggy, o app usa explicitamente a demonstraÃ§Ã£o local fictÃ­cia. Com uma conexÃ£o, o painel carrega contas e transaÃ§Ãµes retornadas pela Pluggy; as conexÃµes Sandbox usam dados sintÃ©ticos.

## Objetivo e cenÃ¡rio de uso

A pessoa usuÃ¡ria pode explorar um painel financeiro de exemplo e fazer perguntas em portuguÃªs sobre contas, dinheiro disponÃ­vel, dÃ­vida e crÃ©dito de cartÃµes, movimentaÃ§Ãµes, gastos por categoria e resumo financeiro. O projeto Ã© uma demonstraÃ§Ã£o educacional de interface e lÃ³gica de negÃ³cio; nÃ£o deve ser usado para consultar ou tomar decisÃµes sobre finanÃ§as reais.

## AplicaÃ§Ã£o publicada

[https://pocketwise-finance-chat.lovable.app](https://pocketwise-finance-chat.lovable.app)

## Funcionalidades atuais

- Chat em portuguÃªs com sugestÃµes de perguntas e respostas para intenÃ§Ãµes previstas no cÃ³digo.
- Painel com saldo disponÃ­vel, dÃ­vida de cartÃµes, gastos por categoria, contas de exemplo e movimentaÃ§Ãµes recentes.
- HistÃ³rico de conversas e criaÃ§Ã£o de novas conversas, armazenados no `localStorage` do navegador.
- Tratamento de perguntas sem resposta disponÃ­vel e aviso de que as respostas usam dados simulados.
- Layout responsivo para telas menores.
- Regras para nÃ£o somar dÃ­vida ou limite de cartÃ£o ao dinheiro disponÃ­vel. O saldo disponÃ­vel considera apenas contas corrente e poupanÃ§a.

### Limites da demonstraÃ§Ã£o

O chat usa correspondÃªncia de padrÃµes e regras locais; nÃ£o Ã© um modelo de linguagem conectado a uma API. Responde somente Ã s intenÃ§Ãµes codificadas. As quatro contas e oito movimentaÃ§Ãµes sÃ£o exemplos estÃ¡ticos apresentados em reais (BRL). As movimentaÃ§Ãµes sÃ£o um recorte ilustrativo de outubro de 2026, nÃ£o um extrato completo nem uma base para reconciliar saldos. NÃ£o hÃ¡ login, banco de dados, sincronizaÃ§Ã£o, conexÃ£o bancÃ¡ria ou dados pessoais reais. O histÃ³rico fica apenas no armazenamento local do navegador.

## Dados e regras financeiras

No modo de demonstraÃ§Ã£o, os dados vÃªm de `DEMO_ACCOUNTS` e `DEMO_TRANSACTIONS` em `src/lib/finance.ts`, por meio do `demoProvider`. Com conexÃ£o Pluggy, o dashboard consome contas e transaÃ§Ãµes do backend. As contas de exemplo sÃ£o Plaid Checking, Plaid Saving, Plaid Credit Card e Plaid Business Credit Card; os nomes Plaid sÃ£o rÃ³tulos fictÃ­cios, nÃ£o evidÃªncia de conexÃ£o com o Plaid.

As movimentaÃ§Ãµes usam a convenÃ§Ã£o implementada no projeto: valor positivo representa despesa/saÃ­da e valor negativo representa entrada. O painel e as respostas calculam gastos usando somente despesas. As transaÃ§Ãµes nÃ£o atualizam nem determinam os saldos das contas. Valores ausentes, como limite total de cartÃ£o, sÃ£o apresentados como nÃ£o informados em vez de estimados.

## Tecnologias

- React 19 e TypeScript
- TanStack Start e TanStack Router
- Vite
- Tailwind CSS v4
- Vitest, Testing Library e jsdom para testes
- Bun para instalaÃ§Ã£o e execuÃ§Ã£o conforme o `bun.lock`
- Lucide React para Ã­cones

## Arquitetura atual

| Arquivo                                                | Responsabilidade                                                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/index.tsx`                                 | Tela do chat, estado da conversa, histÃ³rico no navegador e alternÃ¢ncia entre chat e painel. Chama `answer()` para responder.                                                  |
| `src/components/finchat/ChatMessage.tsx`               | ApresentaÃ§Ã£o de mensagens.                                                                                                                                                    |
| `src/components/finchat/Dashboard.tsx`                 | Painel de contas e movimentaÃ§Ãµes; usa `demoProvider` e os helpers financeiros compartilhados.                                                                                 |
| `src/lib/finance.ts`                                   | Dados locais, `demoProvider`, cÃ¡lculos, identificaÃ§Ã£o de intenÃ§Ã£o e funÃ§Ã£o `answer()` para o chat de demonstraÃ§Ã£o.                                                     |
| `src/lib/plaid/types.ts`, `mappers.ts`, `sync.ts`      | Tipos, mapeadores puros e lÃ³gica de paginaÃ§Ã£o preparatÃ³ria para Plaid. NÃ£o realizam requisiÃ§Ãµes de rede nem alimentam a interface atual.                                 |
| `src/lib/plaid/config.server.ts`, `plaid.functions.ts` | Leitura server-side da presenÃ§a de variÃ¡veis de configuraÃ§Ã£o e indicaÃ§Ã£o de que a integraÃ§Ã£o nÃ£o foi implementada. NÃ£o expÃµem os segredos nem chamam a API do Plaid. |
| `src/test/`                                            | Testes de lÃ³gica financeira, mapeadores/paginaÃ§Ã£o Plaid, painel e rota inicial.                                                                                              |

O dashboard mantÃ©m o provedor de demonstraÃ§Ã£o como fallback e usa o backend Pluggy quando uma conexÃ£o da sessÃ£o estÃ¡ ativa. O `localStorage` guarda o histÃ³rico de conversas; o vÃ­nculo Pluggy Ã© mantido em cookie assinado `HttpOnly` e consultado somente pelo servidor. Consulte [docs/pluggy-integration.md](./docs/pluggy-integration.md) para configuraÃ§Ã£o, limitaÃ§Ãµes de seguranÃ§a e estado do MCP.

## Instalar e executar localmente

Requisito: [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

O servidor de desenvolvimento informa no terminal o endereÃ§o local. Para executar os testes existentes:

```bash
bun run test
```

Para gerar e visualizar a build de produÃ§Ã£o:

```bash
bun run build
bun run preview
```

A demonstraÃ§Ã£o nÃ£o exige credenciais nem variÃ¡veis de ambiente.

## Testes

Os testes automatizados existentes estÃ£o em `src/test/` e sÃ£o executados com Vitest pelo comando `bun run test`. A execuÃ§Ã£o validada nesta revisÃ£o aprovou 45 testes em 4 arquivos.

## EvidÃªncias

Os dois PDFs registram resultados e instruÃ§Ãµes do laboratÃ³rio MCP. Esse registro documental nÃ£o equivale a capturas brutas das chamadas, e os dados do laboratÃ³rio nÃ£o sÃ£o os dados usados pelo aplicativo.

### LaboratÃ³rio MCP documentado nos PDFs

O laboratÃ³rio descrito a seguir Ã© separado do Nexora Finance publicado. A aplicaÃ§Ã£o continua usando exclusivamente a demonstraÃ§Ã£o local explicada neste README.

#### Pluggy Docs MCP

O Guia do Instrutor (p. 6) orienta adicionar um servidor MCP remoto chamado `pluggy`, do tipo **Streamable HTTP**, com a URL `https://mcp.pluggy.ai/mcp` e sem autenticaÃ§Ã£o. Depois de salvar, reinicie o Codex se necessÃ¡rio e confira `/mcp` numa conversa nova. O servidor Ã© usado para consultar documentaÃ§Ã£o da Pluggy; nÃ£o acessa contas bancÃ¡rias.

O Guia registra que, apÃ³s reiniciar o Codex, o servidor respondeu. P01 retornou quatro operaÃ§Ãµes de transaÃ§Ã£o depois de corrigir o filtro de grupo para `Transaction`; P02 foi usado para explicar conceitos com fontes; P03 foi executado. P04 Ã© um aprofundamento opcional e nÃ£o deve executar consulta de dados (p. 7â€“10). Esses sÃ£o resultados relatados no Guia, nÃ£o uma transcriÃ§Ã£o bruta anexada ao repositÃ³rio.

#### Plaid Sandbox MCP

O Guia (p. 13â€“16) orienta instalar `uv`, localizar o executÃ¡vel `uvx` e adicionar um servidor **STDIO** chamado `plaid`. No Mac do instrutor, a instalaÃ§Ã£o registrada foi `brew install uv`; em outros sistemas, siga as instruÃ§Ãµes oficiais de instalaÃ§Ã£o do [`uv`](https://docs.astral.sh/uv/getting-started/installation/). Use `uvx` como comando se estiver disponÃ­vel no `PATH` do processo do Codex; caso contrÃ¡rio, informe o caminho completo do executÃ¡vel local. O argumento deve ser `mcp-server-plaid`. Configure localmente as variÃ¡veis `PLAID_CLIENT_ID` e `PLAID_SECRET` nos campos de ambiente do servidor; nÃ£o inclua seus valores neste README, em prompts, capturas ou no frontend. Salve e reinicie o Codex, depois confirme o servidor com `/mcp`.

P05 Ã© a verificaÃ§Ã£o documental do servidor. P06 registra a criaÃ§Ã£o de um Item padrÃ£o com o produto `transactions`, sem webhook, e a obtenÃ§Ã£o de um token. O Guia deixa **pendente** a confirmaÃ§Ã£o de que a instituiÃ§Ã£o desse Item foi `First Platypus Bank` (`ins_109508`); portanto, este README nÃ£o afirma que foi. P07 Ã© descrito como consulta de leitura ao Sandbox, usando `/accounts/get` e `/transactions/get`, com paginaÃ§Ã£o `count`/`offset`/`total_transactions` e perÃ­odo de 90 dias. O Guia relata uma primeira falha de rede e uma tentativa posterior bem-sucedida; isso nÃ£o significa que o aplicativo tenha executado essas chamadas (p. 16â€“23).

#### Registro complementar da execuÃ§Ã£o P07

O [relatÃ³rio P07](./docs/evidencias/P07-RESULTADO.md) registra uma consulta de 28/06/2026 a 25/09/2026 com cinco transaÃ§Ãµes em USD, retornadas em uma pÃ¡gina. ApÃ³s uma tentativa com `PRODUCT_NOT_READY`, a nova tentativa teve sucesso. Os resultados agregados foram: USD com 0 transaÃ§Ãµes pendentes e 5 confirmadas, soma algÃ©brica de US$ 163,57 e maior movimento absoluto de US$ 111,47. Este registro Ã© uma evidÃªncia histÃ³rica da integraÃ§Ã£o original, distinta dos dados demonstrativos em reais (BRL) usados na interface atual. TambÃ©m Ã© distinto dos nÃºmeros histÃ³ricos do Guia (14 contas e 48 transaÃ§Ãµes); nÃ£o representa uma saÃ­da bruta da API e nÃ£o comprova as tabelas originais dos trÃªs padrÃµes de gastos.

#### Resultados histÃ³ricos relatados pelo Guia

O Guia registra uma consulta de **28/06/2026 a 25/09/2026**: **14 contas**, **48 transaÃ§Ãµes confirmadas** e **0 pendentes**. Informa entradas confirmadas de **US$ 1.512,66** e saÃ­das confirmadas de **US$ 33.448,38**. Na Plaid, o sinal positivo representa saÃ­da e o negativo, entrada. Esses nÃºmeros sÃ£o resultados documentados do laboratÃ³rio Sandbox; nÃ£o sÃ£o os quatro registros de contas nem as oito transaÃ§Ãµes fictÃ­cias locais do aplicativo (p. 20â€“21).

O Guia tambÃ©m registra trÃªs observaÃ§Ãµes sobre aquele conjunto: seis transferÃªncias de saÃ­da somando **US$ 20.550,00**; nove registros de alimentaÃ§Ã£o e bebidas somando **US$ 1.548,99**; e seis transaÃ§Ãµes identificadas como Uber somando **US$ 35,19**. O prÃ³prio Guia alerta que transferÃªncias podem ser movimentaÃ§Ãµes entre contas, nÃ£o consumo, e que os dados sÃ£o fictÃ­cios (p. 21â€“22). O aplicativo atual calcula gastos por categoria sobre sua prÃ³pria amostra local e nÃ£o produz essas trÃªs observaÃ§Ãµes do Sandbox.

### Resumo da especificaÃ§Ã£o do chat no Lovable

O Guia (p. 25â€“28) contÃ©m uma especificaÃ§Ã£o de chat em portuguÃªs, responsivo, com indicaÃ§Ã£o de demonstraÃ§Ã£o fictÃ­cia, sugestÃµes clicÃ¡veis, envio por botÃ£o/Enter e quebra de linha com Shift+Enter, carregamento, erros compreensÃ­veis, histÃ³rico, contas, saldos, transaÃ§Ãµes, categorias e respostas limitadas aos dados disponÃ­veis. Define uma Etapa 1 funcional com dados locais fictÃ­cios e uma Etapa 2 futura com backend Plaid Sandbox e segredos apenas no servidor. TambÃ©m inclui P09 para revisar a prÃ©via em desktop e celular.

Este parÃ¡grafo Ã© um **resumo da especificaÃ§Ã£o incluÃ­da no Guia**, nÃ£o uma transcriÃ§Ã£o do prompt original enviado ao Lovable. NÃ£o localizei no repositÃ³rio o texto integral do prompt efetivamente utilizado nem um registro que comprove essa submissÃ£o.

### Ajustes confirmados pelo histÃ³rico Git

O histÃ³rico registra a inclusÃ£o de transaÃ§Ãµes fictÃ­cias (`0e86680`), a adiÃ§Ã£o do painel financeiro (`7ad0605`), estados e sugestÃµes de interaÃ§Ã£o (`484805a`), o workflow de testes (`17635bd`) e uma etapa de formataÃ§Ã£o/verificaÃ§Ã£o (`4ddc2da`). Isso confirma a evoluÃ§Ã£o desses arquivos no projeto; nÃ£o comprova quais instruÃ§Ãµes foram enviadas ao Lovable nem uma revisÃ£o manual P09.

### Funcionalidade implementada

**TransaÃ§Ãµes demonstrativas e anÃ¡lise de gastos por categoria.** A demonstraÃ§Ã£o contÃ©m oito transaÃ§Ãµes fictÃ­cias definidas em `src/lib/finance.ts`. A funÃ§Ã£o `spendingByCategory()` soma as despesas por categoria e ordena os totais do maior para o menor. O painel financeiro e as respostas do chat utilizam essa funÃ§Ã£o.

Os testes existentes cobrem essas funcionalidades e esperam os seguintes totais: Transporte: **US$ 173,90**; AlimentaÃ§Ã£o: **US$ 147,90**; Moradia: **US$ 120,00**; ServiÃ§os: **US$ 49,00**; total de despesas: **US$ 490,80**.

### Capturas de tela ainda necessÃ¡rias

NÃ£o hÃ¡ capturas de tela (`.png`, `.jpg`, `.jpeg`, `.webp` ou `.gif`) no repositÃ³rio neste momento. Para completar as evidÃªncias de portfÃ³lio, ainda faltam:

- capturas das respostas reais do Pluggy Docs MCP, sem dados sensÃ­veis;
- capturas do P05 e do P06 do Plaid Sandbox MCP; nÃ£o exiba credenciais ou token, e nÃ£o indique a instituiÃ§Ã£o como confirmada sem prova;
- capturas da consulta P07 mostrando contas, as cinco transaÃ§Ãµes mais recentes e as trÃªs observaÃ§Ãµes, com perÃ­odo e moeda visÃ­veis;
- capturas da conversa com o aplicativo publicado e do painel em desktop e celular, como parte da revisÃ£o P09.

As tabelas e os totais deste README sÃ£o transcriÃ§Ãµes resumidas do Guia do Instrutor, nÃ£o imagens nem registros brutos das chamadas MCP. NÃ£o foram criadas capturas para esta documentaÃ§Ã£o.

Materiais de referÃªncia: [Guia do Instrutor (PDF)](https://hermes.dio.me/files/assets/0e56ff91-f2bd-4f37-bd37-a330f5a844f2.pdf) e [ApresentaÃ§Ã£o da aula (PDF)](https://hermes.dio.me/files/assets/e0d3f15d-6418-4ca0-98a7-4130b7832c43.pdf).

## PrÃ³ximos passos para a integraÃ§Ã£o MCP e produÃ§Ã£o

1. Implementar um servidor MCP autenticado e vinculado a usuÃ¡rios, conforme os requisitos em [docs/pluggy-integration.md](./docs/pluggy-integration.md).
2. Definir e implementar uma integraÃ§Ã£o Plaid no servidor, comeÃ§ando pelo Sandbox e mantendo credenciais fora do frontend e de variÃ¡veis `VITE_*`.
3. Implementar autenticaÃ§Ã£o, fluxo Plaid Link, troca segura de tokens e persistÃªncia protegida por usuÃ¡rio.
4. Implementar chamadas server-side para contas e sincronizaÃ§Ã£o de transaÃ§Ãµes, aproveitando e validando os mapeadores e a paginaÃ§Ã£o jÃ¡ preparados.
5. Criar um provedor real que substitua a origem dos dados de demonstraÃ§Ã£o sem transferir credenciais ou lÃ³gica de integraÃ§Ã£o para os componentes de UI; validar consentimento, erros, atualizaÃ§Ã£o e reconciliaÃ§Ã£o dos dados.

O MCP ainda nÃ£o foi implementado. O fluxo Pluggy do dashboard estÃ¡ disponÃ­vel; Sandbox fornece dados sintÃ©ticos e o uso de instituiÃ§Ãµes reais depende de credenciais e acesso habilitado pela Pluggy.
