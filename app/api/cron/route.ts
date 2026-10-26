import { DEFAULT_RUN_OPTIONS } from "@/lib/engine/run-options";
import { redPillNow, searchNow } from "@/lib/engine/direct";
import * as store from "@/lib/engine/store";
import { learn } from "@/lib/learning";
import { collectMetrics } from "@/lib/learning/metrics";

// Расписание через Vercel Cron (см. vercel.json): поиск в 09:00 и 20:00 по Дубаю, Red Pill утром,
// метрики своих роликов каждый день, обучение по воскресеньям.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : (request.headers.get("user-agent") ?? "").startsWith("vercel-cron");
  if (!authorized) return new Response("unauthorized", { status: 401 });

  const ws = process.env.WORKSPACE_ID;
  if (!ws) return new Response("WORKSPACE_ID не задан", { status: 500 });

  const job = new URL(request.url).searchParams.get("job");
  if (job === "redpill") await redPillNow(ws);
  else if (job === "metrics") await collectMetrics(ws);
  else if (job === "learn") {
    const r = await learn(ws);
    if (r.usd > 0) await store.logCost(ws, null, "anthropic", r.usd);
    if (r.proposed > 0) await store.notify(ws, "rules", `Новых правил на одобрение: ${r.proposed}`);
  } else await searchNow(ws, DEFAULT_RUN_OPTIONS, undefined, job === "morning" ? "morning" : "evening");
  return Response.json({ ok: true });
}
