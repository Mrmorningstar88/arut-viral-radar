import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ReelAnalysis, RedPillStory } from "@/lib/generate/schema";
import type { Persona } from "@/lib/generate/persona";

// Доступ движка к базе: service role, всегда в рамках одного пространства.

let db: SupabaseClient | undefined;
export function serviceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase не настроен");
  db ??= createClient(url, key, { auth: { persistSession: false } });
  return db;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// isProduct: проект про продукт (есть паспорт), а не про автора-эксперта по деньгам.
export type WorkspaceProfile = { persona: Persona; queries: string[]; taste: string; rules: string[]; isProduct: boolean };

export async function loadProfile(ws: string): Promise<WorkspaceProfile> {
  const d = serviceDb();
  const [p, t, r, w] = await Promise.all([
    d.from("persona").select("*").eq("workspace_id", ws).maybeSingle(),
    d.from("taste_profile").select("summary").eq("workspace_id", ws).maybeSingle(),
    d.from("learned_rules").select("text").eq("workspace_id", ws).eq("status", "approved"),
    // Колонки passport может ещё не быть в базе: тогда это обычный проект автора.
    d.from("workspaces").select("passport").eq("id", ws).maybeSingle(),
  ]);
  const row = check(p) as Record<string, unknown> | null;
  return {
    persona: {
      name: (row?.name as string) ?? "",
      topics: (row?.topics as string) ?? "",
      facts: (row?.facts as string) ?? "",
      voice: (row?.voice as string) ?? "",
      taboo: (row?.taboo as string) ?? "",
    },
    queries: (row?.search_queries as string[]) ?? [],
    taste: (check(t) as { summary: string } | null)?.summary ?? "",
    rules: ((check(r) as { text: string }[]) ?? []).map((x) => x.text),
    isProduct: !w.error && (w.data as { passport: unknown } | null)?.passport != null,
  };
}

export async function startRun(ws: string, kind: "morning" | "evening" | "manual") {
  const row = check(await serviceDb().from("runs").insert({ workspace_id: ws, kind }).select("id").single()) as { id: string };
  return row.id;
}

export async function finishRun(runId: string, stats: Record<string, number>, errors: string[]) {
  check(await serviceDb().from("runs").update({ finished_at: new Date().toISOString(), stats, errors }).eq("id", runId));
}

export async function logCost(ws: string, runId: string | null, provider: string, usd: number, units = 1) {
  if (usd <= 0) return;
  check(await serviceDb().from("usage_costs").insert({ workspace_id: ws, run_id: runId, provider, units, usd }));
}

export async function notify(ws: string, kind: string, body: string) {
  check(await serviceDb().from("notifications").insert({ workspace_id: ws, kind, body }));
}

export async function existingIds(ws: string): Promise<string[]> {
  const rows = check(await serviceDb().from("reels").select("ext_id").eq("workspace_id", ws)) as { ext_id: string }[];
  return rows.map((r) => r.ext_id);
}

export type CreatorRow = { username: string; followers: number | null; last_checked_at: string | null };

export async function creatorsToCheck(ws: string, limit: number): Promise<CreatorRow[]> {
  return check(
    await serviceDb()
      .from("creators")
      .select("username,followers,last_checked_at")
      .eq("workspace_id", ws)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(limit),
  ) as CreatorRow[];
}

export async function upsertCreator(ws: string, c: { username: string; followers?: number | null; medianViews?: number | null; checked?: boolean }) {
  const row: Record<string, unknown> = { workspace_id: ws, username: c.username };
  if (c.followers !== undefined) row.followers = c.followers;
  if (c.medianViews !== undefined) row.median_views = c.medianViews;
  if (c.checked) row.last_checked_at = new Date().toISOString();
  check(await serviceDb().from("creators").upsert(row, { onConflict: "workspace_id,username" }));
}

// Обложки Instagram живут на CDN несколько дней, поэтому копируем их в своё хранилище.
async function storeCover(ws: string, extId: string, url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const path = `${ws}/${extId}.jpg`;
    const { error } = await serviceDb().storage.from("covers").upload(path, await res.arrayBuffer(), { contentType: "image/jpeg", upsert: true });
    if (error) return null;
    return serviceDb().storage.from("covers").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export async function saveReel(
  ws: string,
  reel: {
    extId: string; url: string; author: string; views: number | null; likes: number | null; comments: number | null;
    postedAt: string | null; caption: string; lanes: string[]; fitScore: number | null; fitReason: string | null; cover: string;
  },
  analysis: ReelAnalysis,
  model: string,
): Promise<string> {
  const d = serviceDb();
  const fields: Record<string, unknown> = {
    workspace_id: ws, platform: "instagram", ext_id: reel.extId, url: reel.url, author: reel.author,
    views: reel.views, likes: reel.likes, comments: reel.comments, posted_at: reel.postedAt || null,
    caption: reel.caption, lanes: reel.lanes, fit_score: reel.fitScore, fit_reason: reel.fitReason,
    cover_url: await storeCover(ws, reel.extId, reel.cover),
  };
  const upsert = (f: Record<string, unknown>) =>
    d.from("reels").upsert(f, { onConflict: "workspace_id,platform,ext_id" }).select("id").single();
  let res = await upsert(fields);
  // База ещё без обновления 0002: сохраняем без обложки, чем теряем разбор.
  if (res.error?.message.includes("cover_url")) {
    delete fields.cover_url;
    res = await upsert(fields);
  }
  const row = check(res) as { id: string };
  check(await d.from("analyses").insert({ workspace_id: ws, reel_id: row.id, payload: analysis, model }));
  return row.id;
}

export type QueueRow = { id: string; url: string; note: string };

export async function pendingQueue(ws: string): Promise<QueueRow[]> {
  return check(
    await serviceDb().from("queue").select("id,url,note").eq("workspace_id", ws).eq("status", "pending").order("created_at"),
  ) as QueueRow[];
}

export async function finishQueueItem(id: string, result: { reelId: string } | { errorRu: string }) {
  const patch = "reelId" in result ? { status: "done", reel_id: result.reelId } : { status: "error", error_ru: result.errorRu };
  check(await serviceDb().from("queue").update(patch).eq("id", id));
}

// Кэш источников на 6 часов: одинаковые запросы в течение дня не тратят Apify.
export async function cached<T>(key: string, load: () => Promise<T>, ttlHours = 6): Promise<T> {
  const d = serviceDb();
  const hit = check(await d.from("source_cache").select("payload,expires_at").eq("key", key).maybeSingle()) as
    | { payload: T; expires_at: string }
    | null;
  if (hit && new Date(hit.expires_at) > new Date()) return hit.payload;
  const value = await load();
  check(
    await d.from("source_cache").upsert({ key, payload: value as object, expires_at: new Date(Date.now() + ttlHours * 3600_000).toISOString() }),
  );
  return value;
}

// ---- Red Pill ----

export async function nextBacklogTopic(ws: string): Promise<string | null> {
  const row = check(
    await serviceDb().from("redpill_backlog").select("topic").eq("workspace_id", ws).is("used_at", null).order("topic").limit(1).maybeSingle(),
  ) as { topic: string } | null;
  return row?.topic ?? null;
}

export async function markBacklogUsed(ws: string, topic: string) {
  check(await serviceDb().from("redpill_backlog").update({ used_at: new Date().toISOString() }).eq("workspace_id", ws).eq("topic", topic));
}

export async function pastRedpillTopics(ws: string): Promise<string[]> {
  const d = serviceDb();
  const [a, b] = await Promise.all([
    d.from("redpill").select("topic").eq("workspace_id", ws),
    d.from("redpill_backlog").select("topic").eq("workspace_id", ws),
  ]);
  return [...new Set([...(check(a) as { topic: string }[]), ...(check(b) as { topic: string }[])].map((r) => r.topic))];
}

export async function similarRedpill(ws: string, embedding: number[]): Promise<{ topic: string; similarity: number }[]> {
  return check(await serviceDb().rpc("match_redpill", { ws, q: JSON.stringify(embedding), min_similarity: 0.85 })) as {
    topic: string;
    similarity: number;
  }[];
}

export async function saveRedpill(ws: string, topic: string, story: RedPillStory, embedding: number[] | null, model: string) {
  const d = serviceDb();
  const row = check(
    await d
      .from("redpill")
      .insert({
        workspace_id: ws, topic, era: story.era, distraction: story.distraction, facts: story.facts, sources: story.sources,
        embedding: embedding ? JSON.stringify(embedding) : null,
      })
      .select("id")
      .single(),
  ) as { id: string };
  check(await d.from("analyses").insert({ workspace_id: ws, redpill_id: row.id, payload: story, model }));
  return row.id;
}
