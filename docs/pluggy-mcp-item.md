# Pesquisa: o conceito de Item na Pluggy

## Objetivo

Registrar a consulta à documentação oficial da Pluggy sobre o conceito de **Item**, como parte da documentação técnica do projeto Nexora Finance e do desafio da DIO.

## Pergunta pesquisada

**O que é um Item na Pluggy?**

## Resposta

Um **Item** representa uma conexão entre um usuário e uma instituição financeira, estabelecida por meio de um conector da Pluggy. Após o consentimento do usuário e a conclusão da conexão, o Item funciona como ponto de acesso aos produtos financeiros disponibilizados por aquela conexão, como contas e transações.

### Conceitos relacionados

- **Connector (conector):** representa a instituição financeira e define os produtos que podem ser disponibilizados por meio da integração.
- **Item:** representa a conexão autorizada entre o usuário e a instituição financeira.
- **Produtos financeiros:** dados disponibilizados por meio da conexão, como contas e transações.

## Aplicação ao Nexora Finance

O Item não é a própria conta bancária. Também não significa que dados financeiros foram acessados apenas porque um servidor MCP foi configurado.

Consultar a documentação da Pluggy por meio de uma ferramenta de IA é uma atividade diferente de criar uma conexão bancária real e consultar os dados dessa conexão pela API. Para acessar dados financeiros, são necessários os fluxos de conexão, consentimento e integração apropriados.

## Fontes oficiais

1. [Pluggy Docs — Item (português)](https://docs.pluggy.ai/pt/docs/connections/item)
2. [Pluggy Docs — Referência da API](https://docs.pluggy.ai/pt/reference)
3. [Pluggy MCP — FAQ](https://mcp.pluggy.ai/en/docs/get-started/faq)
4. [Pluggy Docs — Visão geral](https://v2.docs.pluggy.ai/en/docs/overview)

## Escopo e observação

Esta página registra uma pesquisa conceitual baseada na documentação oficial. Ela **não comprova** que uma conta bancária tenha sido conectada, que dados financeiros reais tenham sido consultados ou que a integração Pluggy esteja operacional no projeto.

A configuração de um servidor MCP para consultar documentação não substitui a implementação e os testes da integração com a API.
