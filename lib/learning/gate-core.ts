// Проверочный шлюз для новых правил (метод Microsoft SkillOpt, github.com/microsoft/SkillOpt).
// Арут, 2026-11-13: «Подключи ко всем агентам. Ко всем абсолютно.»
// Правило, которое предложило обучение, проходит в «ждут одобрения» только если на отложенных роликах сценарист
// с этим правилом пишет ближе к финальной правке автора, чем без него. Здесь чистая логика, вызовы модели в gate.ts.

export type Draft = { hook: string; vo: string[] };
export type GateCase = { id: string; about: string; final: Draft };

export const MIN_CASES = 3; // меньше правленых роликов: проверять не на чем, правило идёт как раньше
export const MAX_CASES = 6;

export function draftText(d: Draft) {
  return `Хук: ${d.hook}\nОзвучка: ${d.vo.join(" ")}`;
}

// Правило остаётся, только если оно строго лучше: больше половины сравнений в его пользу.
export function keeps(wins: number, n: number) {
  return n >= MIN_CASES && wins * 2 > n;
}

// Чётные случаи показываем как A = с правилом, нечётные наоборот: судья не угадывает по позиции.
export function order(i: number, withRule: Draft, without: Draft): { a: Draft; b: Draft; ruleIs: "A" | "B" } {
  return i % 2 === 0 ? { a: withRule, b: without, ruleIs: "A" } : { a: without, b: withRule, ruleIs: "B" };
}

export function judgePrompt(c: GateCase, a: Draft, b: Draft) {
  return [
    `О ЧЁМ РОЛИК:\n${c.about}`,
    `ФИНАЛЬНАЯ ВЕРСИЯ АВТОРА (его правка, эталон):\n${draftText(c.final)}`,
    `ВАРИАНТ A:\n${draftText(a)}`,
    `ВАРИАНТ B:\n${draftText(b)}`,
    "Какой вариант ближе к финальной версии автора по смыслу, подаче, хуку и голосу? Не по длине и не по отдельным словам.",
  ].join("\n\n");
}
