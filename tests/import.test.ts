import assert from "node:assert/strict";
import { test } from "node:test";
import data from "../lib/import/radar-2026-10-30.json";
import { mergeText, parseSource, RadarExport, toReelAnalysis, toReelRow, toRedpillStory } from "../lib/import/radar";

const parsed = RadarExport.parse(data);

test("экспорт старого радара читается целиком", () => {
  assert.equal(parsed.reels.length, 21);
  assert.equal(parsed.redpill.length, 18);
  assert.equal(parsed.config.creators?.list?.length, 23);
});

test("разбор ролика: кадры с числовой длительностью, сценой и промптом на обоих языках", () => {
  for (const r of parsed.reels) {
    const a = toReelAnalysis(r);
    for (const loc of [a, a.i18n.ru, a.i18n.en]) {
      assert.ok(loc.adaptation.hook);
      for (const s of loc.adaptation.storyboard) {
        assert.equal(typeof s.dur, "number");
        assert.ok(s.prompt.length > 0, `${r.id}: пустой промпт кадра`);
        assert.ok(s.scene);
      }
      assert.ok(loc.original.mechanic.length >= 2);
    }
    assert.notEqual(a.i18n.en.adaptation.hook, a.i18n.ru.adaptation.hook);
  }
});

test("строка ролика: дорожки и дата", () => {
  const row = toReelRow("ws", parsed.reels.find((r) => r.id === "DTffUGjDLUE")!);
  assert.deepEqual(row.lanes, ["viral"]);
  assert.equal(row.posted_at, null);
  assert.equal(row.author, "samriddhiliv");
});

test("Red Pill: источники разобраны в ссылки", () => {
  for (const p of parsed.redpill) {
    const s = toRedpillStory(p);
    assert.ok(s.sources.length >= 2);
    for (const src of s.sources) assert.ok(src.title);
    assert.ok(s.i18n.en.title);
  }
  assert.deepEqual(parseSource("FTC, «Penalty», 24.07.2019 — ftc.gov/news/2019/07/x"), {
    title: "FTC, «Penalty», 24.07.2019", url: "https://ftc.gov/news/2019/07/x", kind: "official",
  });
  assert.equal(parseSource("FTC Business Blog, 12.2019 — ftc.gov").url, "https://ftc.gov");
  assert.equal(parseSource("USA PATRIOT Act, Pub.L. 107–56").url.startsWith("https://www.google.com/search"), true);
});

test("паспорт дополняется без повторов", () => {
  assert.equal(mergeText("a\nb", "b\nc"), "a\nb\nc");
  assert.equal(mergeText("", "x"), "x");
  assert.equal(mergeText("x", undefined), "x");
});
