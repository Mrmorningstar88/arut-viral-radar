import assert from "node:assert/strict";
import { test } from "node:test";
import { judgePrompt, keeps, MIN_CASES, order } from "../lib/learning/gate-core";

const a = { hook: "А", vo: ["раз", "два"] };
const b = { hook: "Б", vo: ["три", "четыре"] };

test("правило проходит, только если строго чаще ближе к правке автора", () => {
  assert.equal(keeps(4, 6), true);
  assert.equal(keeps(3, 6), false); // ничья не проходит
  assert.equal(keeps(2, 2), false); // мало роликов для вывода
  assert.equal(keeps(MIN_CASES, MIN_CASES), true);
});

test("вариант с правилом по очереди стоит то первым, то вторым", () => {
  assert.deepEqual(order(0, a, b), { a, b, ruleIs: "A" });
  assert.deepEqual(order(1, a, b), { a: b, b: a, ruleIs: "B" });
});

test("судья видит эталон автора и оба варианта", () => {
  const p = judgePrompt({ id: "1", about: "Ролик про ставки", final: { hook: "Финал", vo: ["правка"] } }, a, b);
  assert.match(p, /Финал/);
  assert.match(p, /ВАРИАНТ A:\nХук: А/);
  assert.match(p, /ВАРИАНТ B:\nХук: Б/);
});
