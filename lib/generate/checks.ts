import { CHARACTER_REF } from "./persona";
import type { ReelAnalysis, RedPillStory } from "./schema";

// Проверки, которые JSON Schema не выразит: язык ключевого слова и тег персонажа в промптах.
export function semanticIssues(a: Pick<ReelAnalysis, "i18n"> | Pick<RedPillStory, "i18n">): string[] {
  const issues: string[] = [];
  if (!/^[А-ЯЁ]+$/.test(a.i18n.ru.adaptation.keyword)) issues.push("i18n.ru.adaptation.keyword должен быть одним русским словом КАПСОМ");
  if (!/^[A-Z]+$/.test(a.i18n.en.adaptation.keyword)) issues.push("i18n.en.adaptation.keyword должен быть одним английским словом CAPS");
  for (const lang of ["ru", "en"] as const) {
    a.i18n[lang].adaptation.storyboard.forEach((s) => {
      if (!s.prompt.includes(CHARACTER_REF)) issues.push(`i18n.${lang} кадр ${s.n}: prompt должен содержать ${CHARACTER_REF}`);
      if (/[А-Яа-яЁё]/.test(s.prompt)) issues.push(`i18n.${lang} кадр ${s.n}: prompt только на английском`);
    });
  }
  return issues;
}
