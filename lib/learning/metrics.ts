import "server-only";
import { serviceDb } from "@/lib/engine/store";
import { apifySource } from "@/lib/sources/apify";

// Метрики своих выложенных роликов на 1, 3, 7 и 30 день: сигнал «что реально зашло».
const DAYS = [1, 3, 7, 30];

export async function collectMetrics(ws: string): Promise<{ captured: number; errors: string[] }> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { captured: 0, errors: ["APIFY_TOKEN не задан"] };
  const d = serviceDb();
  const { data, error } = await d.from("own_posts").select("id, url, posted_at, own_post_metrics(day)").eq("workspace_id", ws).not("posted_at", "is", null);
  if (error) throw new Error(error.message);

  const src = apifySource(token);
  const now = Date.now();
  let captured = 0;
  const errors: string[] = [];
  for (const p of data as { id: string; url: string; posted_at: string; own_post_metrics: { day: number }[] }[]) {
    const age = (now - Date.parse(p.posted_at)) / 86_400_000;
    const have = new Set(p.own_post_metrics.map((m) => m.day));
    const due = DAYS.filter((day) => age >= day && !have.has(day)).pop();
    if (due == null) continue;
    try {
      const r = await src.getReel(p.url);
      const ins = await d.from("own_post_metrics").insert({ post_id: p.id, day: due, views: r.views, likes: r.likes, comments: r.comments });
      if (ins.error) throw new Error(ins.error.message);
      captured++;
    } catch (e) {
      errors.push(`${p.url}: ${e instanceof Error ? e.message.slice(0, 120) : "ошибка"}`);
    }
  }
  return { captured, errors };
}
