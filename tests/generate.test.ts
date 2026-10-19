import assert from "node:assert/strict";
import { test } from "node:test";
import { semanticIssues } from "../lib/generate/checks";
import { demoAnalysis } from "../lib/db/demo-analysis";

test("демо-разбор проходит смысловые проверки", () => {
  assert.deepEqual(semanticIssues(demoAnalysis("Хук", "СОТНЯ")), []);
});

test("ловит латинский keyword в RU и кириллицу в промпте", () => {
  const a = demoAnalysis("Хук", "СОТНЯ");
  a.i18n.ru.adaptation.keyword = "MONEY";
  a.i18n.en.adaptation.storyboard[0].prompt = "[ARUT character reference] крупный план";
  const issues = semanticIssues(a);
  assert.equal(issues.length, 2);
});
