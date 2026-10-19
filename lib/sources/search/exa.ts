import { fetchJson } from "../http";
import type { ReelSearch } from "../types";

// Поиск свежих страниц instagram.com/reel/ по смыслу запроса.
export function exaSearch(apiKey: string): ReelSearch {
  return {
    async search(query, sinceDays) {
      const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
      const res = await fetchJson<{ results: { url: string }[] }>("https://api.exa.ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ query, numResults: 25, includeDomains: ["instagram.com"], startPublishedDate: since }),
        timeoutMs: 30_000,
      });
      return [...new Set(res.results.map((r) => r.url).filter((u) => /instagram\.com\/(?:[^/]+\/)?reels?\//.test(u)))];
    },
  };
}
