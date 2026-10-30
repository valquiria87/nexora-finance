import {
  evaluateCategorization,
  loadCategorizationEvaluationDataset,
} from "../src/lib/categorization-evaluation";

const results = evaluateCategorization(loadCategorizationEvaluationDataset());
console.log(
  `Acurácia da categorização: ${results.correct}/${results.total} (${(results.accuracy * 100).toFixed(2)}%)`,
);

if (results.total < 100 || results.total > 200 || results.accuracy < 0.9) process.exitCode = 1;
