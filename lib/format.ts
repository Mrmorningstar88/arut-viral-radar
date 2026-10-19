export function compact(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function dubaiDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// Встраиваемый плеер Instagram: показывает оригинал прямо в карточке.
export function igEmbed(url: string) {
  const code = url.match(/instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p)\/([A-Za-z0-9_-]+)/)?.[1];
  return code ? `https://www.instagram.com/reel/${code}/embed/` : null;
}
