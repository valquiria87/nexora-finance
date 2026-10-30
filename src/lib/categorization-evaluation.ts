import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  categorizeTransaction,
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "./categorization";

export interface LabeledTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  label: TransactionCategory;
}

export function loadCategorizationEvaluationDataset(): LabeledTransaction[] {
  const csv = readFileSync(resolve(process.cwd(), "data", "categorization-evaluation.csv"), "utf8");
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (header !== "id,date,description,amount,currency,label")
    throw new Error("Cabeçalho inválido no conjunto de avaliação de categorização.");

  return rows.map((row, index) => {
    const [id, date, description, amountText, currency, labelText, ...extra] = row.split(",");
    const label = z.enum(TRANSACTION_CATEGORIES).safeParse(labelText);
    const amount = Number(amountText);
    if (
      !id ||
      !date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !description ||
      !Number.isFinite(amount) ||
      !currency ||
      !label.success ||
      extra.length > 0
    )
      throw new Error(`Linha inválida no conjunto de avaliação: ${index + 2}.`);
    return { id, date, description, amount, currency, label: label.data };
  });
}

export function evaluateCategorization(dataset: LabeledTransaction[]) {
  const correct = dataset.filter(
    ({ description, label }) => categorizeTransaction(description) === label,
  ).length;
  return {
    total: dataset.length,
    correct,
    accuracy: dataset.length === 0 ? 0 : correct / dataset.length,
  };
}
