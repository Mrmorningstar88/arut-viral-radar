import "server-only";
import { errorRu, processQueueItem } from "./pipeline";
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
