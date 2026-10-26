import assert from "node:assert/strict";
import { test } from "node:test";
import { fmtMultiple, median, rankFormats } from "../lib/formats/catalog";

test("median: чётное и нечётное число, пусто", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), 0);
});

test("rankFormats: отрыв по медиане, выборка из пяти выше маленькой", () => {
  const rows = [
    ...[100, 100, 100, 100, 100].map((views) => ({ format: "list" as const, views })),
    ...[1000, 1000, 1000, 1000, 1000].map((views) => ({ format: "myth" as const, views })),
    { format: "pov" as const, views: 1_000_000 },
    { format: "story" as const, views: null },
  ];
  const { overallMedian, ranks } = rankFormats(rows);
  assert.equal(overallMedian, 1000);
  assert.deepEqual(ranks.map((r) => r.id), ["myth", "list", "pov"]);
  assert.equal(ranks[0].multiple, 1);
  assert.equal(ranks[1].multiple, 0.1);
  assert.equal(ranks[2].enough, false);
  assert.ok(!ranks.some((r) => r.id === "story"), "ролики без просмотров не считаются");
});

test("fmtMultiple: русская запятая и округление больших", () => {
  assert.equal(fmtMultiple(3.24), "×3,2");
  assert.equal(fmtMultiple(12.6), "×13");
});
