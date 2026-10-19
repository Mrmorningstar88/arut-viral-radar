import "server-only";
import { generateReelAnalysis } from "@/lib/generate";
import { MODEL_MAIN, RefusalError } from "@/lib/llm";
import { lanesFor, MAX_NEW_PER_RUN, pickTop, VIRAL_MIN_VIEWS, type Candidate } from "@/lib/selection";
import { classifyReel } from "@/lib/selection/classify";
import { apifySource, shortcodeFromUrl } from "@/lib/sources/apify";
import { SourceError } from "@/lib/sources/http";
import { exaSearch } from "@/lib/sources/search/exa";
import type { ReelDetails } from "@/lib/sources/types";
import * as store from "./store";

// Шаги прогона. Каждый шаг короткий и возвращает JSON, чтобы Inngest мог
// выполнять их отдельными вызовами и повторять упавший шаг, не начиная заново.

function apify() {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN не задан");
  return apifySource(token);
}

export type Found = { extId: string; url: string; author: string; views: number | null; postedAt: string; followers: number | null };

const getReelCached = (url: string) =>
  store.cached<ReelDetails>(`reel:${shortcodeFromUrl(url) ?? url}`, () => apify().getReel(url));

function classifierProfile(p: store.WorkspaceProfile) {
  return { persona: [p.persona.name, p.persona.facts, p.persona.voice].filter(Boolean).join("\n"), taste: p.taste, rules: p.rules };
}

export function errorRu(e: unknown) {
  if (e instanceof SourceError) return e.ru;
  if (e instanceof RefusalError) return e.message;
  return `Внутренняя ошибка: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`;
}

export async function processQueueItem(ws: string, runId: string, item: store.QueueRow) {
  try {
    const profile = await store.loadProfile(ws);
    const reel = await getReelCached(item.url);
    const { verdict, usd: u1 } = await classifyReel(reel, classifierProfile(profile));
    const { analysis, usd: u2 } = await generateReelAnalysis(reel, profile.persona, profile, item.note);
    await store.logCost(ws, runId, "anthropic", u1 + u2);
    const reelId = await store.saveReel(
      ws,
      {
        extId: shortcodeFromUrl(reel.url) ?? reel.id, url: reel.url, author: reel.author, views: reel.views, likes: reel.likes,
        comments: reel.comments, postedAt: reel.date, caption: reel.caption, lanes: ["queue"],
        fitScore: verdict.fit_score, fitReason: verdict.fit_reason,
      },
      analysis,
      MODEL_MAIN,
    );
    await store.finishQueueItem(item.id, { reelId });
    if ((reel.views ?? 0) >= VIRAL_MIN_VIEWS && reel.author) await store.upsertCreator(ws, { username: reel.author });
    return { ok: true as const };
  } catch (e) {
    await store.finishQueueItem(item.id, { errorRu: errorRu(e) });
    return { ok: false as const, error: errorRu(e) };
  }
}

export async function scanCreator(ws: string, c: store.CreatorRow): Promise<Found[]> {
  const reels = await store.cached(`profile:${c.username}`, () => apify().getProfileReels(c.username));
  const views = reels.map((r) => r.views ?? 0).sort((a, b) => a - b);
  const median = views.length ? views[Math.floor(views.length / 2)] : null;
  const followers = c.followers ?? (await store.cached(`followers:${c.username}`, () => apify().getFollowers(c.username), 72));
  await store.upsertCreator(ws, { username: c.username, followers, medianViews: median, checked: true });
  return reels
    .filter((r) => !r.pinned && r.date)
    .map((r) => ({ extId: r.id, url: r.url, author: c.username, views: r.views, postedAt: r.date, followers }));
}

export async function searchQuery(query: string): Promise<string[]> {
  const key = process.env.EXA_API_KEY;
  if (!key) return [];
  return store.cached(`exa:${query}`, () => exaSearch(key).search(query, 30));
}

export async function inspectUrl(url: string): Promise<Found | null> {
  const r = await getReelCached(url);
  if (!r.date) return null;
  return { extId: shortcodeFromUrl(r.url) ?? r.id, url: r.url, author: r.author, views: r.views, postedAt: r.date, followers: null };
}

// Отбор без сети: пороги, дубли и приоритет. Берём вдвое больше лимита, часть отсеет фильтр.
export async function rank(ws: string, found: Found[]): Promise<Found[]> {
  const existing = new Set(await store.existingIds(ws));
  const unique = [...new Map(found.map((f) => [f.extId, f])).values()];
  const byId = new Map(unique.map((f) => [f.extId, f]));
  const candidates: Candidate[] = unique.map((f) => ({
    igId: f.extId, views: f.views, postedAt: new Date(f.postedAt), authorFollowers: f.followers,
  }));
  return pickTop(candidates, existing, MAX_NEW_PER_RUN * 2).map((c) => byId.get(c.igId)!);
}

export async function analyzeCandidate(ws: string, runId: string, f: Found) {
  const profile = await store.loadProfile(ws);
  const reel = await getReelCached(f.url);
  const { verdict, usd: u1 } = await classifyReel(reel, classifierProfile(profile));
  if (verdict.exclude) {
    await store.logCost(ws, runId, "anthropic", u1);
    return { accepted: false as const, reason: verdict.reason };
  }
  const { analysis, usd: u2 } = await generateReelAnalysis(reel, profile.persona, profile);
  await store.logCost(ws, runId, "anthropic", u1 + u2);
  const lanes = lanesFor({ igId: f.extId, views: f.views, postedAt: new Date(f.postedAt), authorFollowers: f.followers });
  await store.saveReel(
    ws,
    {
      extId: f.extId, url: f.url, author: f.author, views: f.views, likes: reel.likes, comments: reel.comments,
      postedAt: f.postedAt, caption: reel.caption, lanes, fitScore: verdict.fit_score, fitReason: verdict.fit_reason,
    },
    analysis,
    MODEL_MAIN,
  );
  if ((f.views ?? 0) >= VIRAL_MIN_VIEWS && f.author) await store.upsertCreator(ws, { username: f.author, followers: f.followers });
  return { accepted: true as const };
}
