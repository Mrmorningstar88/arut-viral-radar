import * as pipeline from "@/lib/engine/pipeline";
import * as store from "@/lib/engine/store";
import { learn } from "@/lib/learning";
import { collectMetrics } from "@/lib/learning/metrics";
import { DEFAULT_RUN_OPTIONS, DEPTH, parseRunOptions, type RunOptions } from "@/lib/engine/run-options";
import { inngest, RUN_REQUESTED } from "./client";

type Kind = "morning" | "evening" | "manual";

const CREATORS_PER_RUN = 12;
const URLS_PER_QUERY = 6;

function workspace() {
  const ws = process.env.WORKSPACE_ID;
  if (!ws) throw new Error("WORKSPACE_ID не задан");
  return ws;
}

// Один прогон: очередь Арута, мониторинг креаторов, поиск, отбор, разбор.
// Каждый step.run выполняется отдельным вызовом, поэтому прогон не упирается в лимит функции Vercel.
// Ручной прогон берёт настройки с пульта, плановые идут с настройками по умолчанию.
const radarRun = async ({
  step,
  kind,
  options = DEFAULT_RUN_OPTIONS,
}: {
  step: Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"];
  kind: Kind;
  options?: RunOptions;
}) => {
  const ws = workspace();
  const depth = DEPTH[options.depth];
  const runId = await step.run("start", () => store.startRun(ws, kind));
  const errors: string[] = [];
  const stats = { queue: 0, queue_errors: 0, scanned: 0, found: 0, selected: 0, excluded: 0 };

  const queue = await step.run("load-queue", () => store.pendingQueue(ws));
  for (const item of queue) {
    const r = await step.run(`queue-${item.id}`, () => pipeline.processQueueItem(ws, runId, item));
    if (r.ok) stats.queue++;
    else stats.queue_errors++;
  }

  let redpill = 0;
  if (kind === "morning") {
    try {
      await step.run("redpill", () => pipeline.runRedPill(ws, runId));
      redpill = 1;
    } catch (e) {
      errors.push(`Red Pill: ${pipeline.errorRu(e)}`);
    }
  }

  const found: pipeline.Found[] = [];
  const creators = options.creators ? await step.run("load-creators", () => store.creatorsToCheck(ws, CREATORS_PER_RUN)) : [];
  for (const c of creators) {
    try {
      found.push(...(await step.run(`creator-${c.username}`, () => pipeline.scanCreator(ws, c))));
      stats.scanned++;
    } catch (e) {
      errors.push(`@${c.username}: ${pipeline.errorRu(e)}`);
    }
  }

  const { queries } = await step.run("load-queries", () => store.loadProfile(ws));

  // Сам ищет залёты по хэштегам тем автора: не нужны ни ссылки, ни список креаторов.
  const seed = Math.floor(Date.now() / 43_200_000);
  const tags = options.hashtags ? pipeline.tagsForRun(queries, depth.tags, seed, options) : [];
  for (const tag of tags) {
    try {
      found.push(...(await step.run(`tag-${tag}`, () => pipeline.scanHashtag(tag))));
      stats.scanned++;
    } catch (e) {
      errors.push(`#${tag}: ${pipeline.errorRu(e)}`);
    }
  }

  for (const [i, q] of (options.search ? queries : []).entries()) {
    try {
      const urls = await step.run(`search-${i}`, () => pipeline.searchQuery(q));
      for (const url of urls.slice(0, URLS_PER_QUERY)) {
        const f = await step.run(`inspect-${url}`, () => pipeline.inspectUrl(url));
        if (f) found.push(f);
      }
    } catch (e) {
      errors.push(`Поиск «${q}»: ${pipeline.errorRu(e)}`);
    }
  }
  stats.found = found.length;

  const ranked = await step.run("rank", () => pipeline.rank(ws, found, depth.take, options.strictOnly));
  for (const f of ranked) {
    if (stats.selected >= depth.take) break;
    try {
      const r = await step.run(`analyze-${f.extId}`, () => pipeline.analyzeCandidate(ws, runId, f));
      if (r.accepted) stats.selected++;
      else stats.excluded++;
    } catch (e) {
      errors.push(`${f.url}: ${pipeline.errorRu(e)}`);
    }
  }

  await step.run("finish", async () => {
    await store.finishRun(runId, { ...stats, redpill }, errors);
    const total = stats.selected + stats.queue;
    if (total > 0) await store.notify(ws, "run", `Готово: ${total} новых разборов`);
    if (errors.length > 0) await store.notify(ws, "run_errors", `Прогон завершился с ошибками: ${errors.length}`);
  });
  return stats;
};

export const morning = inngest.createFunction(
  { id: "radar-morning", triggers: [{ cron: "TZ=Asia/Dubai 0 9 * * *" }], concurrency: { limit: 1 } },
  ({ step }) => radarRun({ step, kind: "morning" }),
);

export const evening = inngest.createFunction(
  { id: "radar-evening", triggers: [{ cron: "TZ=Asia/Dubai 0 20 * * *" }], concurrency: { limit: 1 } },
  ({ step }) => radarRun({ step, kind: "evening" }),
);

export const manual = inngest.createFunction(
  { id: "radar-manual", triggers: [{ event: RUN_REQUESTED }], concurrency: { limit: 1 } },
  ({ step, event }) => radarRun({ step, kind: "manual", options: parseRunOptions(event.data?.options) }),
);

// Метрики своих роликов раз в день, обучение по воскресеньям.
export const metricsDaily = inngest.createFunction(
  { id: "own-metrics-daily", triggers: [{ cron: "TZ=Asia/Dubai 0 8 * * *" }] },
  ({ step }) => step.run("collect", () => collectMetrics(workspace())),
);

export const learnWeekly = inngest.createFunction(
  { id: "learn-weekly", triggers: [{ cron: "TZ=Asia/Dubai 0 10 * * 0" }] },
  async ({ step }) => {
    const ws = workspace();
    const r = await step.run("learn", () => learn(ws));
    if (r.usd > 0) await step.run("cost", () => store.logCost(ws, null, "anthropic", r.usd));
    if (r.proposed > 0) await step.run("notify", () => store.notify(ws, "rules", `Новых правил на одобрение: ${r.proposed}`));
    return r;
  },
);

// Расписание перенесено в Vercel Cron (app/api/cron), здесь остаётся только ручной запуск по событию.
export const functions = [manual];
