import { fetchJson, SourceError } from "./http";
import type { InstagramSource, ProfileReel, ReelDetails } from "./types";

// Apify-акторы Instagram. Поля в ответах у разных версий акторов отличаются,
// поэтому маппинг терпимый: берём первое найденное имя поля.

const REELS_ACTOR = "apify~instagram-reel-scraper";
const POST_ACTOR = "apify~instagram-scraper";
const PROFILE_ACTOR = "apify~instagram-profile-scraper";

type Item = Record<string, unknown>;

const num = (it: Item, ...keys: string[]) => {
  for (const k of keys) if (typeof it[k] === "number") return it[k] as number;
  return null;
};
const str = (it: Item, ...keys: string[]) => {
  for (const k of keys) if (typeof it[k] === "string" && it[k]) return it[k] as string;
  return "";
};

export function shortcodeFromUrl(url: string) {
  return url.match(/instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

export function apifySource(token: string): InstagramSource & { getFollowers(username: string): Promise<number | null> } {
  const run = (actor: string, input: unknown) =>
    fetchJson<Item[]>(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=240`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      timeoutMs: 270_000,
    });

  const toReel = (it: Item): ProfileReel => {
    const code = str(it, "shortCode", "shortcode", "code");
    return {
      id: code || str(it, "id"),
      url: str(it, "url") || `https://www.instagram.com/reel/${code}/`,
      views: num(it, "videoPlayCount", "videoViewCount", "playCount", "viewCount"),
      likes: num(it, "likesCount", "likeCount"),
      comments: num(it, "commentsCount", "commentCount"),
      date: str(it, "timestamp", "takenAt", "date"),
      caption: str(it, "caption", "text"),
      pinned: Boolean(it.isPinned ?? it.pinned),
    };
  };

  return {
    name: "apify",
    async getProfileReels(username) {
      const items = await run(REELS_ACTOR, { username: [username], resultsLimit: 30 });
      return items.filter((it) => !it.error).map(toReel);
    },
    async getReel(idOrUrl) {
      const url = idOrUrl.startsWith("http") ? idOrUrl : `https://www.instagram.com/reel/${idOrUrl}/`;
      const [it] = await run(POST_ACTOR, { directUrls: [url], resultsType: "posts", resultsLimit: 1, addParentData: false });
      if (!it || it.error) throw new SourceError(`no data for ${url}`, "Не удалось получить ролик: он удалён, приватный или ссылка неверная");
      const base = toReel(it);
      const comments = (it.latestComments as Item[] | undefined) ?? [];
      const author = str(it, "ownerUsername", "username");
      return {
        ...base,
        author,
        authorFollowers: null,
        topComments: comments.map((c) => str(c, "text")).filter(Boolean).slice(0, 15),
        keywords: ((it.hashtags as string[] | undefined) ?? []).slice(0, 15),
      } satisfies ReelDetails;
    },
    async getFollowers(username) {
      const [it] = await run(PROFILE_ACTOR, { usernames: [username] });
      return it ? num(it, "followersCount", "followers") : null;
    },
  };
}
