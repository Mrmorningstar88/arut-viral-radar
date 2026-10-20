// Хэштеги по умолчанию под темы автора; запросы из «Твоего образа» идут первыми.
const DEFAULT_TAGS = [
  "money", "finance", "economy", "investing", "trading", "stockmarket", "crypto", "bitcoin", "wealth", "financialfreedom",
  "business", "macroeconomics", "деньги", "финансы", "трейдинг", "экономика", "инвестиции", "бизнес",
];

export function tagsForRun(queries: string[], count: number, seed: number, langs = { ru: true, en: true }) {
  const own = queries.map((q) => q.toLowerCase().replace(/[#\s]+/g, "")).filter(Boolean);
  const pool = [...new Set([...own, ...DEFAULT_TAGS])].filter((t) => (/[а-яё]/.test(t) ? langs.ru : langs.en));
  // Каждый прогон берёт следующую порцию, чтобы за день обойти все хэштеги и не тратить Apify на одни и те же.
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(seed * count + i) % pool.length]);
}
