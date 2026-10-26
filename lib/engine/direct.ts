import "server-only";
import { DEPTH, type RunOptions } from "./run-options";
import {
  analyzeCandidate,
  errorRu,
  inspectUrl,
  processQueueItem,
  rank,
  scanCreator,
  scanHashtag,
  searchQuery,
  tagsForRun,
  runRedPill,
  type Found,
} from "./pipeline";
import * as store from "./store";

// Разбор ссылок сразу после добавления, без Inngest: тест работает, даже если расписание ещё не подключено.
export async function processPendingNow(ws: string) {
  const items = await store.pendingQueue(ws);
  if (items.length === 0) return;
  const runId = await store.startRun(ws, "manual");
  const stats = { queue: 0, queue_errors: 0 };
  const errors: string[] = [];
  try {
    for (const item of items) {
      const r = await processQueueItem(ws, runId, item);
      if (r.ok) stats.queue++;
      else {
        stats.queue_errors++;
        errors.push(r.error);
      }
    }
  } catch (e) {
    errors.push(errorRu(e));
  }
  await store.finishRun(runId, stats, errors);
}

// Ручной поиск прямо на сайте, без Inngest. Всё, что можно, идёт параллельно,
// а разборы останавливаются заранее, чтобы уложиться в лимит функции Vercel (300 с).
const BUDGET_MS = 250_000;
const SOURCE_TIMEOUT_MS = 150_000;
const MAX_PARALLEL_TAGS = 6;
const DIRECT_CREATORS = 4;

export async function searchNow(
  ws: string,
  options: RunOptions,
  existingRunId?: string,
  kind: "morning" | "evening" | "manual" = "manual",
) {
  const started = Date.now();
  const left = () => BUDGET_MS - (Date.now() - started);
  const depth = DEPTH[options.depth];
  const runId = existingRunId ?? (await store.startRun(ws, kind));
  const stats = { scanned: 0, found: 0, selected: 0, excluded: 0 };
  const errors: string[] = [];

  try {
    const profile = await store.loadProfile(ws);
    const seed = Math.floor(Date.now() / 43_200_000);
    const sources: { label: string; scan: () => Promise<Found[]> }[] = [];
    if (options.hashtags) {
      for (const tag of tagsForRun(
        profile.queries,
        Math.min(depth.tags, MAX_PARALLEL_TAGS),
        seed,
        options,
      )) {
        sources.push({ label: `#${tag}`, scan: () => scanHashtag(tag) });
      }
    }
    if (options.creators) {
      for (const c of await store.creatorsToCheck(ws, DIRECT_CREATORS)) {
        sources.push({
          label: `@${c.username}`,
          scan: () => scanCreator(ws, c),
        });
      }
    }

    const found: Found[] = [];
    const results = await Promise.allSettled(
      sources.map((s) => withTimeout(s.scan(), SOURCE_TIMEOUT_MS)),
    );
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        found.push(...r.value);
        stats.scanned++;
      } else errors.push(`${sources[i].label}: ${errorRu(r.reason)}`);
    });

    if (options.search) {
      for (const q of profile.queries) {
        if (left() < 120_000) break;
        try {
          for (const url of (await searchQuery(q)).slice(0, 4)) {
            const f = await inspectUrl(url);
            if (f) found.push(f);
          }
        } catch (e) {
          errors.push(`Поиск «${q}»: ${errorRu(e)}`);
        }
      }
    }
    stats.found = found.length;

    // Разбираем пачками: каждая пачка параллельно, новую начинаем, только если хватает времени.
    const queue = await rank(ws, found, depth.take, options.strictOnly);
    while (queue.length > 0 && stats.selected < depth.take && left() > 90_000) {
      const batch = queue.splice(0, depth.take - stats.selected);
      const done = await Promise.allSettled(
        batch.map((f) => analyzeCandidate(ws, runId, f)),
      );
      done.forEach((r, i) => {
        if (r.status === "rejected")
          errors.push(`${batch[i].url}: ${errorRu(r.reason)}`);
        else if (r.value.accepted) stats.selected++;
        else stats.excluded++;
      });
    }
    if (found.length === 0 && errors.length === 0)
      errors.push("Источники ничего не вернули: проверь Apify в ⚙ Настройках");
  } catch (e) {
    errors.push(errorRu(e));
  }

  await store.finishRun(runId, stats, errors);
  if (stats.selected > 0)
    await store.notify(ws, "run", `Готово: ${stats.selected} новых разборов`);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Источник не ответил вовремя")), ms),
    ),
  ]);
}

// Утренний Red Pill отдельным вызовом: у него свой лимит времени.
export async function redPillNow(ws: string) {
  const runId = await store.startRun(ws, "morning");
  const errors: string[] = [];
  let redpill = 0;
  try {
    await runRedPill(ws, runId);
    redpill = 1;
  } catch (e) {
    errors.push(`Red Pill: ${errorRu(e)}`);
  }
  await store.finishRun(runId, { redpill }, errors);
}
