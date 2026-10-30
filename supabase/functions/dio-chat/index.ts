// Supabase Edge Function (Deno): dio-chat
// Recebe { mensagem, historico } e responde { resposta, modo, meta } ou { erro }.
// Lê contas e transações FICTÍCIAS da Plaid Sandbox (https://sandbox.plaid.com).
// Segredos ficam só nos "Secrets" da Edge Function: PLAID_CLIENT_ID, PLAID_SECRET
// e, opcionalmente, PLAID_ACCESS_TOKEN (se ausente, cria um Item de Sandbox).
// Somente leitura: nenhuma operação de escrita bancária.

const PLAID_BASE = "https://sandbox.plaid.com";
const SANDBOX_INSTITUTION = "ins_109508"; // First Platypus Bank
const WINDOW_DAYS = 90;
const CACHE_MS = 5 * 60 * 1000;
const MAX_MESSAGE = 1000;
const FONTE = "Plaid Sandbox (sandbox.plaid.com) · dados fictícios";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------- tipos mínimos ----------
interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string | null;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
    iso_currency_code: string | null;
    unofficial_currency_code: string | null;
  };
}
interface PlaidTx {
  transaction_id: string;
  account_id: string;
  amount: number; // Plaid: positivo = saída, negativo = entrada
  date: string;
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
  personal_finance_category?: { primary?: string } | null;
}
interface Snapshot {
  accounts: PlaidAccount[];
  transactions: PlaidTx[];
  inicio: string;
  fim: string;
  at: number;
}

class UserFacingError extends Error {}

// ---------- Plaid ----------
let cachedToken: string | null = null;
let cachedSnapshot: Snapshot | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function creds() {
  const client_id = Deno.env.get("PLAID_CLIENT_ID");
  const secret = Deno.env.get("PLAID_SECRET");
  if (!client_id || !secret) {
    throw new UserFacingError(
      "A integração com a Plaid Sandbox ainda não está configurada no servidor (faltam os Secrets PLAID_CLIENT_ID e PLAID_SECRET).",
    );
  }
  return { client_id, secret };
}

async function plaid<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${PLAID_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...creds(), ...body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (json as { error_code?: string }).error_code ?? `HTTP_${res.status}`;
    const err = new Error(code) as Error & { plaidCode: string };
    err.plaidCode = code;
    throw err;
  }
  return json as T;
}

async function getAccessToken(): Promise<string> {
  const fromEnv = Deno.env.get("PLAID_ACCESS_TOKEN");
  if (fromEnv) return fromEnv;
  if (cachedToken) return cachedToken;
  const created = await plaid<{ public_token: string }>("/sandbox/public_token/create", {
    institution_id: SANDBOX_INSTITUTION,
    initial_products: ["transactions"],
  });
  const exchanged = await plaid<{ access_token: string }>("/item/public_token/exchange", {
    public_token: created.public_token,
  });
  cachedToken = exchanged.access_token;
  return cachedToken;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

async function loadSnapshot(): Promise<Snapshot> {
  if (cachedSnapshot && Date.now() - cachedSnapshot.at < CACHE_MS) return cachedSnapshot;

  const access_token = await getAccessToken();
  const end = new Date();
  const start = new Date(end.getTime() - (WINDOW_DAYS - 1) * 86_400_000);
  const inicio = isoDay(start);
  const fim = isoDay(end);

  const { accounts } = await plaid<{ accounts: PlaidAccount[] }>("/accounts/get", { access_token });

  const transactions: PlaidTx[] = [];
  let total = Infinity;
  let guard = 0;
  while (transactions.length < total && guard++ < 50) {
    let page: { transactions: PlaidTx[]; total_transactions: number } | null = null;
    for (let attempt = 1; attempt <= 3 && !page; attempt++) {
      try {
        page = await plaid("/transactions/get", {
          access_token,
          start_date: inicio,
          end_date: fim,
          options: {
            count: 100,
            offset: transactions.length,
            include_personal_finance_category: true,
          },
        });
      } catch (e) {
        const code = (e as { plaidCode?: string }).plaidCode;
        if (code === "PRODUCT_NOT_READY" && attempt < 3) {
          await sleep(2000 * attempt);
          continue;
        }
        if (code === "PRODUCT_NOT_READY") {
          throw new UserFacingError(
            "A Plaid ainda está preparando as transações de teste. Tente novamente em alguns segundos.",
          );
        }
        throw e;
      }
    }
    if (!page) break;
    total = page.total_transactions;
    if (page.transactions.length === 0) break;
    transactions.push(...page.transactions);
  }

  cachedSnapshot = { accounts, transactions, inicio, fim, at: Date.now() };
  return cachedSnapshot;
}

// ---------- formatação ----------
const currencyOf = (b: { iso_currency_code: string | null; unofficial_currency_code: string | null }) =>
  b.iso_currency_code ?? b.unofficial_currency_code ?? null;

function money(value: number | null | undefined, currency: string | null): string {
  if (value === null || value === undefined) return "Não informado";
  const n = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency === "USD") return `US$ ${n}`;
  return currency ? `${currency} ${n}` : n;
}

const dateBR = (iso: string) => iso.split("-").reverse().join("/");
// "*" vira "∗" (visualmente igual) para não quebrar o Markdown das tabelas.
const cell = (s: string) =>
  s.replace(/\|/g, "/").replace(/\*/g, "\u2217").replace(/\s+/g, " ").trim();

const SUBTYPE_PT: Record<string, string> = {
  checking: "Corrente",
  savings: "Poupança",
  cd: "Depósito a prazo",
  "credit card": "Cartão de crédito",
  "money market": "Mercado monetário",
  ira: "Aposentadoria (IRA)",
  "401k": "Aposentadoria (401k)",
  student: "Crédito estudantil",
  mortgage: "Crédito imobiliário",
  hsa: "Conta de saúde (HSA)",
  "cash management": "Gestão de caixa",
  auto: "Crédito de veículo",
  home_equity: "Crédito com garantia",
  "home equity": "Crédito com garantia",
  paypal: "PayPal",
};
const typeLabel = (a: PlaidAccount) =>
  SUBTYPE_PT[(a.subtype ?? "").toLowerCase()] ?? a.subtype ?? a.type;

const isDebtAccount = (a: PlaidAccount) => a.type === "credit" || a.type === "loan";

// ---------- categorias ----------
const CATEGORY_PT: Record<string, string> = {
  FOOD_AND_DRINK: "Alimentação",
  TRANSPORTATION: "Transporte",
  TRANSFER_OUT: "Transferências de saída",
  TRANSFER_IN: "Transferências de entrada",
  LOAN_PAYMENTS: "Pagamentos de empréstimos/cartões",
  RENT_AND_UTILITIES: "Aluguel e contas",
  TRAVEL: "Viagens",
  GENERAL_MERCHANDISE: "Compras em geral",
  PERSONAL_CARE: "Cuidados pessoais",
  INCOME: "Renda",
  ENTERTAINMENT: "Lazer",
  MEDICAL: "Saúde",
  GENERAL_SERVICES: "Serviços",
  BANK_FEES: "Tarifas bancárias",
  HOME_IMPROVEMENT: "Casa",
  GOVERNMENT_AND_NON_PROFIT: "Governo e doações",
  OTHER: "Outros",
};

function categoryOf(t: PlaidTx): string {
  const key = t.personal_finance_category?.primary;
  if (key && CATEGORY_PT[key]) return CATEGORY_PT[key];
  return "Sem categoria informada";
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/aliment|comida|restaurante|mercado|lanche|food/, "Alimentação"],
  [/transporte|uber|taxi|corrida|combustivel/, "Transporte"],
  [/viage|hotel|passagem|voo/, "Viagens"],
  [/transfer|pix/, "Transferências de saída"],
  [/emprestimo|divida|financiamento/, "Pagamentos de empréstimos/cartões"],
  [/aluguel|conta de luz|moradia|utilidade/, "Aluguel e contas"],
  [/compra|loja|varejo/, "Compras em geral"],
  [/cuidado|beleza|personal/, "Cuidados pessoais"],
  [/lazer|entretenimento|cinema/, "Lazer"],
  [/saude|medic|farmacia/, "Saúde"],
];

// ---------- respostas ----------
function describeWindow(s: Snapshot, n: number): string {
  return `_Período: ${dateBR(s.inicio)} a ${dateBR(s.fim)} · ${n} transações analisadas · ${FONTE}._`;
}

function accountsAnswer(s: Snapshot): { text: string; registros: number } {
  const cash = s.accounts.filter((a) => !isDebtAccount(a));
  const debt = s.accounts.filter(isDebtAccount);

  const cashRows = cash.map(
    (a) =>
      `| ${cell(a.name)} | ${typeLabel(a)} | ${money(a.balances.current, currencyOf(a.balances))} | ${money(a.balances.available, currencyOf(a.balances))} |`,
  );
  const debtRows = debt.map(
    (a) =>
      `| ${cell(a.name)} | ${typeLabel(a)} | ${money(a.balances.current, currencyOf(a.balances))} | ${money(a.balances.available, currencyOf(a.balances))} | ${money(a.balances.limit, currencyOf(a.balances))} |`,
  );

  const text = [
    `Encontrei **${s.accounts.length} contas** de teste na Plaid Sandbox. **Todos os dados são fictícios.**`,
    "",
    "**Dinheiro e investimentos**",
    "",
    "| Conta | Tipo | Saldo atual | Disponível |",
    "| --- | --- | --- | --- |",
    ...cashRows,
    "",
    "**Dívidas e limites** (saldo atual = quanto se deve; \"disponível\" é crédito, não dinheiro)",
    "",
    "| Conta | Tipo | Dívida atual | Crédito disponível | Limite |",
    "| --- | --- | --- | --- | --- |",
    ...debtRows,
    "",
    "_Não some as linhas como patrimônio: dívidas, limites e investimentos têm naturezas diferentes. Saldos vêm de `/accounts/get`, sem atualização em tempo real._",
  ].join("\n");
  return { text, registros: s.accounts.length };
}

function balancesAnswer(s: Snapshot): { text: string; registros: number } {
  const liquid = s.accounts.filter(
    (a) => a.type === "depository" && a.balances.available !== null,
  );
  const rows = liquid.map(
    (a) =>
      `| ${cell(a.name)} | ${money(a.balances.current, currencyOf(a.balances))} | ${money(a.balances.available, currencyOf(a.balances))} |`,
  );
  const debt = s.accounts.filter(isDebtAccount);
  const debtRows = debt.map(
    (a) => `| ${cell(a.name)} | ${money(a.balances.current, currencyOf(a.balances))} |`,
  );
  const text = [
    "Aqui estão os saldos das contas de depósito e as dívidas, **sempre separados**. Dados fictícios.",
    "",
    "| Conta de depósito | Saldo atual | Disponível |",
    "| --- | --- | --- |",
    ...rows,
    "",
    "| Cartões e empréstimos | Dívida atual |",
    "| --- | --- |",
    ...debtRows,
    "",
    "_Dívida não é dinheiro disponível. Valores em USD, como recebidos da Plaid (sem conversão)._",
  ].join("\n");
  return { text, registros: liquid.length + debt.length };
}

function recentAnswer(s: Snapshot): { text: string; registros: number } {
  const byId = new Map(s.accounts.map((a) => [a.account_id, a.name]));
  const sorted = [...s.transactions].sort((a, b) => b.date.localeCompare(a.date));
  const top = sorted.slice(0, 5);
  if (top.length === 0) {
    return {
      text: `Não encontrei transações no período consultado.\n\n${describeWindow(s, 0)}`,
      registros: 0,
    };
  }
  const rows = top.map((t) => {
    const out = t.amount > 0;
    return `| ${dateBR(t.date)} | ${cell(t.merchant_name ?? t.name)} | ${cell(byId.get(t.account_id) ?? "Não informado")} | ${out ? "Saída" : "Entrada"} | ${money(Math.abs(t.amount), currencyOf(t))} | ${t.pending ? "Pendente" : "Confirmada"} |`;
  });
  const text = [
    top.length < 5
      ? `Estas são as **${top.length} transações** encontradas no período:`
      : "Estas são as **5 transações mais recentes** (o período tem mais registros; mostro só estas):",
    "",
    "| Data | Descrição | Conta | Tipo | Valor | Situação |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "_Na Plaid, valor positivo é saída e negativo é entrada. Descrições são as retornadas pela API; os valores de Sandbox podem parecer pouco realistas._",
    "",
    describeWindow(s, s.transactions.length),
  ].join("\n");
  return { text, registros: s.transactions.length };
}

function categoryTotals(s: Snapshot) {
  const confirmed = s.transactions.filter((t) => !t.pending && t.amount > 0);
  const map = new Map<string, { n: number; total: number; cur: string | null }>();
  for (const t of confirmed) {
    const key = categoryOf(t);
    const cur = map.get(key) ?? { n: 0, total: 0, cur: currencyOf(t) };
    cur.n += 1;
    cur.total += t.amount;
    map.set(key, cur);
  }
  return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
}

function categoryAnswer(s: Snapshot, message: string): { text: string; registros: number } {
  const totals = categoryTotals(s);
  const m = norm(message);
  const wanted = CATEGORY_HINTS.find(([re]) => re.test(m))?.[1];
  const pending = s.transactions.filter((t) => t.pending).length;
  const pendingNote = pending ? ` ${pending} pendentes ficaram fora dos totais.` : "";

  const table = [
    "| Categoria (Plaid) | Registros | Saídas confirmadas |",
    "| --- | --- | --- |",
    ...totals.map(([k, v]) => `| ${k} | ${v.n} | ${money(v.total, v.cur)} |`),
  ];

  let intro: string;
  if (wanted) {
    const hit = totals.find(([k]) => k === wanted);
    intro = hit
      ? `Em **${wanted}**, foram **${hit[1].n} ${hit[1].n === 1 ? "saída" : "saídas"}** somando **${money(hit[1].total, hit[1].cur)}** no período. Veja o quadro completo por categoria:`
      : `Não encontrei saídas confirmadas em **${wanted}** no período. Veja as categorias que aparecem nos dados:`;
  } else {
    intro = "Estas são as saídas confirmadas por categoria (categorias retornadas pela Plaid):";
  }

  const text = [
    intro,
    "",
    ...table,
    "",
    `_Transferências e pagamentos de dívidas podem ser movimentações entre contas, não consumo.${pendingNote}_`,
    "",
    describeWindow(s, s.transactions.length),
  ].join("\n");
  return { text, registros: s.transactions.length };
}

function summaryAnswer(s: Snapshot): { text: string; registros: number } {
  const confirmed = s.transactions.filter((t) => !t.pending);
  const outs = confirmed.filter((t) => t.amount > 0);
  const ins = confirmed.filter((t) => t.amount < 0);
  const sum = (xs: PlaidTx[]) => xs.reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const cur = currencyOf(s.transactions[0] ?? { iso_currency_code: "USD", unofficial_currency_code: null });
  const top = categoryTotals(s).slice(0, 3);
  const pending = s.transactions.length - confirmed.length;

  const text = [
    "Resumo das movimentações do período (**dados fictícios**):",
    "",
    "| Indicador | Resultado |",
    "| --- | --- |",
    `| Transações confirmadas | ${confirmed.length} |`,
    `| Pendentes (fora dos totais) | ${pending} |`,
    `| Entradas confirmadas | ${money(sum(ins), cur)} |`,
    `| Saídas confirmadas | ${money(sum(outs), cur)} |`,
    "",
    "**Três maiores categorias de saída**",
    "",
    "| Categoria | Registros | Saídas |",
    "| --- | --- | --- |",
    ...top.map(([k, v]) => `| ${k} | ${v.n} | ${money(v.total, v.cur)} |`),
    "",
    "_Os totais incluem transferências e pagamentos de dívidas; não equivalem a renda e consumo._",
    "",
    describeWindow(s, s.transactions.length),
  ].join("\n");
  return { text, registros: s.transactions.length };
}

const HELP = [
  "Ainda não sei responder isso com os dados disponíveis. Posso ajudar com:",
  "",
  "- **Mostrar minhas contas**",
  "- **Consultar meus saldos**",
  "- **Ver minhas últimas transações**",
  "- **Quanto gastei com alimentação?** (ou transporte, viagens…)",
  "- **Resumir minhas movimentações**",
  "",
  "_Não faço pagamentos, transferências nem outras operações. Dados fictícios da Plaid Sandbox._",
].join("\n");

function route(message: string): "contas" | "saldos" | "recentes" | "categoria" | "resumo" | "ajuda" {
  const m = norm(message);
  if (/gast|categoria|aliment|transporte|viage|compras|lazer/.test(m)) return "categoria";
  if (/saldo|disponivel|divida|limite|quanto tenho/.test(m)) return "saldos";
  if (/resum|visao geral|panorama/.test(m)) return /conta/.test(m) ? "contas" : "resumo";
  if (/ultima|recente|extrato|transac|movimentac/.test(m)) return "recentes";
  if (/conta|banco|cartao/.test(m)) return "contas";
  return "ajuda";
}

// ---------- servidor ----------
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Use o método POST." }, 405);

  let body: { mensagem?: unknown; historico?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ erro: "O pedido não contém JSON válido." }, 400);
  }

  const mensagem = typeof body.mensagem === "string" ? body.mensagem.trim() : "";
  if (!mensagem) return json({ erro: "Digite uma pergunta antes de enviar." }, 400);
  if (mensagem.length > MAX_MESSAGE) {
    return json({ erro: `A mensagem deve ter no máximo ${MAX_MESSAGE} caracteres.` }, 400);
  }

  const intent = route(mensagem);
  if (intent === "ajuda") {
    return json({
      resposta: HELP,
      modo: "regras",
      meta: { periodo: null, registros: 0, fonte: "Sem consulta: pergunta fora do escopo" },
    });
  }

  try {
    const snap = await loadSnapshot();
    const out =
      intent === "contas"
        ? accountsAnswer(snap)
        : intent === "saldos"
          ? balancesAnswer(snap)
          : intent === "recentes"
            ? recentAnswer(snap)
            : intent === "categoria"
              ? categoryAnswer(snap, mensagem)
              : summaryAnswer(snap);

    return json({
      resposta: out.text,
      modo: "regras",
      meta: {
        periodo: { inicio: snap.inicio, fim: snap.fim },
        registros: out.registros,
        fonte: FONTE,
      },
    });
  } catch (e) {
    if (e instanceof UserFacingError) return json({ erro: e.message });
    const code = (e as { plaidCode?: string }).plaidCode;
    console.error(JSON.stringify({ event: "dio_chat_failure", code: code ?? "unknown" }));
    if (code === "INVALID_API_KEYS" || code === "INVALID_CLIENT_ID" || code === "INVALID_SECRET") {
      return json({ erro: "As credenciais da Plaid Sandbox configuradas no servidor foram recusadas." });
    }
    if (code === "ITEM_LOGIN_REQUIRED" || code === "INVALID_ACCESS_TOKEN") {
      cachedToken = null;
      cachedSnapshot = null;
      return json({ erro: "O acesso de teste expirou. Tente novamente para criar um novo Item de Sandbox." });
    }
    return json({ erro: "Não foi possível consultar a Plaid Sandbox agora. Tente novamente." });
  }
});
