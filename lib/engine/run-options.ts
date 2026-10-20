// Настройки ручного поиска с пульта. Без серверных зависимостей: файл читают и форма, и прогон.
export type Depth = "quick" | "normal" | "deep";

export type RunOptions = {
  hashtags: boolean;
  creators: boolean;
  search: boolean;
  ru: boolean;
  en: boolean;
  strictOnly: boolean;
  depth: Depth;
};

export const DEFAULT_RUN_OPTIONS: RunOptions = {
  hashtags: true,
  creators: true,
  search: true,
  ru: true,
  en: true,
  strictOnly: false,
  depth: "normal",
};

// Сколько хэштегов обойти и сколько новых роликов разобрать за прогон.
export const DEPTH: Record<
  Depth,
  { tags: number; take: number; label: string }
> = {
  quick: { tags: 3, take: 2, label: "Быстро" },
  normal: { tags: 6, take: 4, label: "Обычно" },
  deep: { tags: 14, take: 8, label: "Глубоко" },
};

export function parseRunOptions(raw: unknown): RunOptions {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const bool = (k: keyof RunOptions) =>
    typeof o[k] === "boolean"
      ? (o[k] as boolean)
      : (DEFAULT_RUN_OPTIONS[k] as boolean);
  const depth =
    typeof o.depth === "string" && o.depth in DEPTH
      ? (o.depth as Depth)
      : DEFAULT_RUN_OPTIONS.depth;
  const opts = {
    hashtags: bool("hashtags"),
    creators: bool("creators"),
    search: bool("search"),
    ru: bool("ru"),
    en: bool("en"),
    strictOnly: bool("strictOnly"),
    depth,
  };
  // Без языка хэштеги искать не по чему, без источника искать негде: возвращаем разумное.
  if (!opts.ru && !opts.en) Object.assign(opts, { ru: true, en: true });
  if (!opts.hashtags && !opts.creators && !opts.search) opts.hashtags = true;
  return opts;
}
