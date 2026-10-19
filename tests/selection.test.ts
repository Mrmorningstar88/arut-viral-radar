import assert from "node:assert/strict";
import { test } from "node:test";
import { lanesFor, pickTop } from "../lib/selection";

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
