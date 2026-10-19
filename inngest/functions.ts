import { MAX_NEW_PER_RUN } from "@/lib/selection";
import * as pipeline from "@/lib/engine/pipeline";
import * as store from "@/lib/engine/store";
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
const radarRun = async ({ step, kind }: { step: Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"]; kind: Kind }) => {
  const ws = workspace();
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
  const creators = await step.run("load-creators", () => store.creatorsToCheck(ws, CREATORS_PER_RUN));
  for (const c of creators) {
    try {
      found.push(...(await step.run(`creator-${c.username}`, () => pipeline.scanCreator(ws, c))));
      stats.scanned++;
    } catch (e) {
      errors.push(`@${c.username}: ${pipeline.errorRu(e)}`);
    }
  }

  const { queries } = await step.run("load-queries", () => store.loadProfile(ws));
  for (const [i, q] of queries.entries()) {
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

  const ranked = await step.run("rank", () => pipeline.rank(ws, found));
  for (const f of ranked) {
    if (stats.selected >= MAX_NEW_PER_RUN) break;
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
  ({ step }) => radarRun({ step, kind: "manual" }),
);

export const functions = [morning, evening, manual];
