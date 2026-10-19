import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ReelAnalysis } from "@/lib/generate/schema";
import type { Creator, LearnedRule, QueueItem, Reel, Repo, Run } from "./types";

// Пока пользователь один: сервер ходит service role-ключом в пространство WORKSPACE_ID.
// Когда подключим вход, клиент будет создаваться из сессии и RLS ограничит доступ сам.

type Row = Record<string, unknown>;

const toReel = (r: Row): Reel => ({
  id: r.id as string,
  platform: r.platform as Reel["platform"],
  url: r.url as string,
  author: (r.author as string) ?? null,
  views: (r.views as number) ?? null,
  likes: (r.likes as number) ?? null,
  comments: (r.comments as number) ?? null,
  postedAt: (r.posted_at as string) ?? null,
  caption: (r.caption as string) ?? null,
  lanes: (r.lanes as string[]) ?? [],
  fitScore: (r.fit_score as number) ?? null,
  fitReason: (r.fit_reason as string) ?? null,
  status: r.status as Reel["status"],
  notes: (r.notes as string) ?? "",
  publishedUrl: (r.published_url as string) ?? null,
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function supabaseRepo(url: string, key: string, ws: string): Repo {
  const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false } });

  return {
    demo: false,
    async listReels(status) {
      let q = db.from("reels").select("*").eq("workspace_id", ws).order("posted_at", { ascending: false }).limit(200);
      if (status) q = q.eq("status", status);
      return (check(await q) as Row[]).map(toReel);
    },
    async getReel(id) {
      const r = check(await db.from("reels").select("*").eq("workspace_id", ws).eq("id", id).maybeSingle()) as Row | null;
      if (!r) return null;
      const a = check(
        await db.from("analyses").select("payload").eq("reel_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ) as { payload: ReelAnalysis } | null;
      return { ...toReel(r), analysis: a?.payload ?? null };
    },
    async setReelStatus(id, c) {
      const patch: Row = { status: c.status };
      if (c.publishedUrl) patch.published_url = c.publishedUrl;
      check(await db.from("reels").update(patch).eq("workspace_id", ws).eq("id", id));
      check(
        await db.from("reel_feedback").insert({
          workspace_id: ws, reel_id: id, action: c.status, reason_code: c.reason ?? null, reason_text: c.reasonText ?? null,
        }),
      );
      if (c.status === "published" && c.publishedUrl) {
        check(
          await db.from("own_posts").upsert(
            { workspace_id: ws, url: c.publishedUrl, reel_id: id, posted_at: new Date().toISOString() },
            { onConflict: "workspace_id,url" },
          ),
        );
      }
    },
    async listQueue() {
      const rows = check(await db.from("queue").select("*").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(100)) as Row[];
      return rows.map((r): QueueItem => ({
        id: r.id as string, url: r.url as string, note: r.note as string, status: r.status as QueueItem["status"],
        errorRu: (r.error_ru as string) ?? null, createdAt: r.created_at as string,
      }));
    },
    async addToQueue(url, note) {
      check(await db.from("queue").insert({ workspace_id: ws, url, note }));
    },
    async getPersona() {
      const r = check(await db.from("persona").select("*").eq("workspace_id", ws).maybeSingle()) as Row | null;
      return { name: (r?.name as string) ?? "", facts: (r?.facts as string) ?? "", voice: (r?.voice as string) ?? "", taboo: (r?.taboo as string) ?? "" };
    },
    async savePersona(p) {
      check(await db.from("persona").upsert({ workspace_id: ws, ...p, updated_at: new Date().toISOString() }));
    },
    async listCreators() {
      const rows = check(await db.from("creators").select("*").eq("workspace_id", ws).order("followers", { ascending: false })) as Row[];
      return rows.map((r): Creator => ({
        username: r.username as string, followers: (r.followers as number) ?? null, medianViews: (r.median_views as number) ?? null,
        source: r.source as Creator["source"], lastCheckedAt: (r.last_checked_at as string) ?? null,
      }));
    },
    async listRuns() {
      const rows = check(await db.from("runs").select("*").eq("workspace_id", ws).order("started_at", { ascending: false }).limit(50)) as Row[];
      return rows.map((r): Run => ({
        id: r.id as string, kind: r.kind as Run["kind"], startedAt: r.started_at as string, finishedAt: (r.finished_at as string) ?? null,
        stats: (r.stats as Run["stats"]) ?? {}, errors: (r.errors as string[]) ?? [],
      }));
    },
    async listRules() {
      const rows = check(await db.from("learned_rules").select("id,text,status").eq("workspace_id", ws).order("created_at", { ascending: false })) as Row[];
      return rows as unknown as LearnedRule[];
    },
    async setRuleStatus(id, status) {
      check(await db.from("learned_rules").update({ status }).eq("workspace_id", ws).eq("id", id));
    },
  };
}
