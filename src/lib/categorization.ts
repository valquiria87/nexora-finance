export const TRANSACTION_CATEGORIES = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Compras",
  "Lazer",
  "Serviços",
  "Renda",
  "Transferência",
  "Outros",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

const categoryRules: { category: TransactionCategory; pattern: RegExp }[] = [
  {
    category: "Transferência",
    pattern: /\b(?:transfer|transferencia|pix|wire|zelle|venmo transfer|between accounts)\b/,
  },
  {
    category: "Renda",
    pattern:
      /\b(?:salary|payroll|income|dividend|interest payment|tax refund|salario|rendimento)\b/,
  },
  {
    category: "Alimentação",
    pattern:
      /\b(?:supermarket|supermercado|grocery|groceries|market|restaurant|cafe|coffee|food|bakery|padaria|mercado|restaurante)\b/,
  },
  {
    category: "Moradia",
    pattern:
      /\b(?:rent|aluguel|electric|electricity|water bill|energy bill|condo|housing|mortgage)\b/,
  },
  {
    category: "Transporte",
    pattern:
      /\b(?:uber|lyft|taxi|fuel|gas station|parking|metro|bus pass|toll|combustivel|corrida)\b/,
  },
  {
    category: "Saúde",
    pattern: /\b(?:pharmacy|pharmacia|farmacia|clinic|dentist|hospital|medical|health|saude)\b/,
  },
  {
    category: "Compras",
    pattern: /\b(?:amazon|electronics|clothing|retail|department store|shopping|ecommerce|loja)\b/,
  },
  {
    category: "Lazer",
    pattern: /\b(?:cinema|movie|theater|concert|museum|amusement|leisure|netflix|spotify|show)\b/,
  },
  {
    category: "Serviços",
    pattern:
      /\b(?:subscription|software|internet|phone|insurance|cloud|saas|utility service|servico)\b/,
  },
];

function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function categorizeTransaction(description: string): TransactionCategory {
  const normalized = normalizeDescription(description);
  return categoryRules.find(({ pattern }) => pattern.test(normalized))?.category ?? "Outros";
}
