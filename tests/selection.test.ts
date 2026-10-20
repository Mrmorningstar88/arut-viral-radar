import assert from "node:assert/strict";
import { test } from "node:test";
import { lanesFor, pickTop, pickWithFallback } from "../lib/selection";

const now = new Date("2026-10-19T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

test("залёт: 10M+ и не старше 90 дней", () => {
  assert.deepEqual(lanesFor({ igId: "a", views: 12e6, postedAt: daysAgo(30), authorFollowers: 1e6 }, now), ["viral"]);
  assert.deepEqual(lanesFor({ igId: "b", views: 12e6, postedAt: daysAgo(91), authorFollowers: 1e6 }, now), []);
});

test("растущий: 3M+ и не старше 7 дней", () => {
  assert.deepEqual(lanesFor({ igId: "c", views: 4e6, postedAt: daysAgo(3), authorFollowers: 1e6 }, now), ["rising"]);
  assert.deepEqual(lanesFor({ igId: "d", views: 15e6, postedAt: daysAgo(2), authorFollowers: 1e6 }, now), ["viral", "rising"]);
  assert.deepEqual(lanesFor({ igId: "e", views: 2e6, postedAt: daysAgo(1), authorFollowers: 1e6 }, now), []);
});

test("без просмотров ролик не проходит", () => {
  assert.deepEqual(lanesFor({ igId: "f", views: null, postedAt: daysAgo(1), authorFollowers: 1e6 }, now), []);
});

test("отбор: без дублей, свежие первыми, при равной дате views/followers, лимит 4", () => {
  const c = [
    { igId: "old", views: 50e6, postedAt: daysAgo(40), authorFollowers: 1e6 },
    { igId: "dup", views: 20e6, postedAt: daysAgo(1), authorFollowers: 1e6 },
    { igId: "fresh-low", views: 11e6, postedAt: daysAgo(1), authorFollowers: 10e6 },
    { igId: "fresh-high", views: 11e6, postedAt: daysAgo(1), authorFollowers: 1e6 },
    { igId: "mid", views: 30e6, postedAt: daysAgo(10), authorFollowers: 1e6 },
    { igId: "mid2", views: 30e6, postedAt: daysAgo(20), authorFollowers: 1e6 },
    { igId: "weak", views: 1e6, postedAt: daysAgo(1), authorFollowers: 1e6 },
  ];
  const ids = pickTop(c, new Set(["dup"]), 4, now).map((x) => x.igId);
  assert.deepEqual(ids, ["fresh-high", "fresh-low", "mid", "mid2"]);
});

test("добор: если строгих залётов мало, берём свежие от 1M по просмотрам", () => {
  const c = [
    { igId: "viral", views: 12e6, postedAt: daysAgo(5), authorFollowers: 1e6 },
    { igId: "t-small", views: 1.5e6, postedAt: daysAgo(10), authorFollowers: 1e6 },
    { igId: "t-big", views: 2.5e6, postedAt: daysAgo(20), authorFollowers: 1e6 },
    { igId: "too-old", views: 9e6, postedAt: daysAgo(40), authorFollowers: 1e6 },
    { igId: "too-small", views: 0.5e6, postedAt: daysAgo(1), authorFollowers: 1e6 },
  ];
  assert.deepEqual(pickWithFallback(c, new Set(), 3, now).map((x) => x.igId), ["viral", "t-big", "t-small"]);
});

test("хэштеги фильтруются по языку", async () => {
  const { tagsForRun } = await import("../lib/engine/tags");
  const ru = tagsForRun([], 50, 0, { ru: true, en: false });
  assert.ok(ru.length > 0 && ru.every((t) => /[а-яё]/.test(t)));
  const en = tagsForRun(["Макро"], 50, 0, { ru: false, en: true });
  assert.ok(en.length > 0 && en.every((t) => !/[а-яё]/.test(t)));
});

test("настройки пульта: мусор превращается в значения по умолчанию", async () => {
  const { parseRunOptions, DEFAULT_RUN_OPTIONS } = await import("../lib/engine/run-options");
  assert.deepEqual(parseRunOptions("x"), DEFAULT_RUN_OPTIONS);
  assert.equal(parseRunOptions({ depth: "deep", hashtags: false }).depth, "deep");
  assert.equal(parseRunOptions({ depth: "huge" }).depth, "normal");
  const noLang = parseRunOptions({ ru: false, en: false });
  assert.ok(noLang.ru && noLang.en);
});

test("настройки пульта: без источников включаются хэштеги", async () => {
  const { parseRunOptions } = await import("../lib/engine/run-options");
  const o = parseRunOptions({ hashtags: false, creators: false, search: false });
  assert.ok(o.hashtags);
});
