import { z } from "zod";
import type { ReelAnalysis, RedPillStory, Shot } from "@/lib/generate/schema";

// Перенос базы старого радара (дашборд на claude.ai) в YOOMP.
// Формат экспорта близок к нашему, но проще: длительность кадра строкой «3 с»,
// нет 3D-сцены, нет блока «оригинал», источники Red Pill одной строкой.

const Loose = z.record(z.string(), z.unknown());
const RawShot = z.object({ n: z.number().optional(), dur: z.union([z.string(), z.number()]).optional(), frame: z.string(), overlay: z.string(), prompt: z.string().optional() });
const RawAdaptation = Loose.and(z.object({ hook: z.string(), concept: z.string(), storyboard: z.array(RawShot) }));
const RawLocalized = Loose.and(z.object({ adaptation: RawAdaptation }));

const RawReel = z.object({
  id: z.string().min(1),
  title: z.string(),
  lane: z.string().default(""),
  foundAt: z.string().optional(),
  why: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  note: z.string().nullish(),
  adaptation: RawAdaptation,
  expert: Loose,
  i18n: z.object({ ru: RawLocalized, en: RawLocalized }).partial().default({}),
  source: z.object({
    url: z.string().url(),
    author: z.string().nullish(),
    caption: z.string().nullish(),
    views: z.number().nullish(),
    likes: z.number().nullish(),
    comments: z.number().nullish(),
    date: z.string().nullish(),
  }),
});

const RawRedpill = z.object({
  id: z.string().min(1),
  title: z.string(),
  era: z.string().nullish(),
  distraction: z.string().nullish(),
  foundAt: z.string().optional(),
  facts: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  adaptation: RawAdaptation,
  expert: Loose,
  i18n: z.object({ ru: RawLocalized, en: RawLocalized }).partial().default({}),
});

export const RadarExport = z.object({
  exportedAt: z.string().optional(),
  reels: z.array(RawReel).default([]),
  redpill: z.array(RawRedpill).default([]),
  config: z
    .object({
      creators: z.object({ list: z.array(z.string()) }).partial().optional(),
      persona: z.object({ facts: z.string(), voice: z.string(), taboo: z.string() }).partial().optional(),
    })
    .default({}),
});
export type RadarExport = z.infer<typeof RadarExport>;

// Нейтральная сцена для 3D-превью: в экспорте её нет.
const SCENE: Shot["scene"] = { location: "studio", shot: "medium", camera: "static", action: "talk", props: [] };

const seconds = (d: unknown) => {
  const n = typeof d === "number" ? d : parseFloat(String(d ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 4;
};

// Переводы кадров в экспорте содержат только frame и overlay: остальное берём из основного сториборда.
function shots(own: z.infer<typeof RawShot>[], base: z.infer<typeof RawShot>[] = own): Shot[] {
  return own.map((s, i) => {
    const b = base[i] ?? s;
    return { n: s.n ?? b.n ?? i + 1, dur: seconds(s.dur ?? b.dur), frame: s.frame, overlay: s.overlay, prompt: s.prompt ?? b.prompt ?? "", scene: SCENE };
  });
}

function adaptation(a: z.infer<typeof RawAdaptation>, base: z.infer<typeof RawAdaptation>) {
  return { ...base, ...a, storyboard: shots(a.storyboard, base.storyboard) } as ReelAnalysis["adaptation"];
}

// Чему мы научились у оригинала: видео в старом радаре не смотрели, поэтому только подпись, формат и причины залёта.
function original(r: z.infer<typeof RawReel>, a: ReelAnalysis["adaptation"], lane: string) {
  return {
    summary: r.source.caption || r.title,
    beats: [],
    mechanic: [
      { element: "Хук", theirs: r.source.caption || r.title, yours: a.hook },
      { element: "Формат", theirs: lane || "—", yours: a.format },
      ...(r.why[0] ? [{ element: "Почему залетел", theirs: r.why[0], yours: a.concept }] : []),
    ],
  } as unknown as ReelAnalysis["original"];
}

export function toReelAnalysis(r: z.infer<typeof RawReel>): ReelAnalysis {
  const local = (l: z.infer<typeof RawLocalized> | undefined) => {
    const L = (l ?? {}) as Record<string, unknown>;
    const a = adaptation((l?.adaptation ?? r.adaptation) as z.infer<typeof RawAdaptation>, r.adaptation);
    const lane = (L.lane as string) ?? r.lane;
    return {
      original: original(r, a, lane),
      why: (L.why as string[]) ?? r.why,
      adaptation: a,
      expert: (L.expert ?? r.expert) as ReelAnalysis["expert"],
      risks: (L.risks as string[]) ?? r.risks,
      note: (L.note as string) ?? r.note ?? "",
    };
  };
  const ru = local(r.i18n.ru);
  return { ...ru, i18n: { ru, en: local(r.i18n.en) } };
}

// «Название — https://…» или «Название — ftc.gov/…»: ссылку достаём, вид источника угадываем по словам.
export function parseSource(s: string): RedPillStory["sources"][number] {
  const m = s.match(/https?:\/\/\S+/) ?? s.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(gov|org|com|edu|net|int|eu|uk)\b(\/\S*)?/i);
  const url = m ? (m[0].startsWith("http") ? m[0] : `https://${m[0]}`).replace(/[)»,.;]+$/, "") : "";
  const title = (m ? s.slice(0, m.index) : s).replace(/[\s:—–-]+$/, "").trim() || s;
  const kind = /court|суд|v\.\s|vs\.?\s/i.test(s)
    ? "court"
    : /journal|jama|lancet|nature|science|pnas|doi|университет|university/i.test(s)
      ? "peer_reviewed"
      : /\.gov|federal reserve|fed\b|congress|senate|сенат|конгресс|epa|ftc|sec\b|минфин|treasury/i.test(s)
        ? "official"
        : "primary_document";
  // Без ссылки ведём в поиск по названию: карточка источника всегда кликабельна.
  return { title, url: url || `https://www.google.com/search?q=${encodeURIComponent(title)}`, kind };
}

export function toRedpillStory(p: z.infer<typeof RawRedpill>): RedPillStory {
  const local = (l: z.infer<typeof RawLocalized> | undefined) => {
    const L = (l ?? {}) as Record<string, unknown>;
    return {
      title: (L.title as string) ?? p.title,
      era: (L.era as string) ?? p.era ?? "",
      distraction: (L.distraction as string) ?? p.distraction ?? "",
      facts: (L.facts as string[]) ?? p.facts,
      adaptation: adaptation((l?.adaptation ?? p.adaptation) as z.infer<typeof RawAdaptation>, p.adaptation),
      expert: (L.expert ?? p.expert) as RedPillStory["expert"],
      risks: (L.risks as string[]) ?? p.risks,
    };
  };
  const ru = local(p.i18n.ru);
  return { ...ru, sources: p.sources.map(parseSource), i18n: { ru, en: local(p.i18n.en) } };
}

// Строка таблицы reels. Все ролики старого радара отобраны под автора, поэтому «своя тема» = 75.
export function toReelRow(ws: string, r: z.infer<typeof RawReel>) {
  const views = r.source.views ?? null;
  const lanes = [...((views ?? 0) >= 10_000_000 ? ["viral"] : []), ...(/растёт|растет/i.test(r.lane) ? ["rising"] : [])];
  const posted = r.source.date && /^\d{4}-\d{2}-\d{2}/.test(r.source.date) ? r.source.date.slice(0, 10) : null;
  const author = r.source.author ?? r.source.url.match(/instagram\.com\/([^/]+)\//)?.[1] ?? null;
  return {
    workspace_id: ws, platform: "instagram", ext_id: r.id, url: r.source.url, author,
    views, likes: r.source.likes ?? null, comments: r.source.comments ?? null, posted_at: posted,
    caption: r.source.caption ?? r.title, lanes: lanes.length ? lanes : ["viral"], fit_score: 75, fit_reason: r.why[0] ?? r.title,
    ...(r.foundAt ? { created_at: r.foundAt } : {}),
  };
}

// В паспорт дописываем только то, чего там ещё нет: правки автора не затираем.
export function mergeText(current: string, incoming: string | undefined) {
  if (!incoming?.trim()) return current;
  const have = new Set(current.split("\n").map((l) => l.trim()).filter(Boolean));
  const add = incoming.split("\n").map((l) => l.trim()).filter((l) => l && !have.has(l));
  return [current.trim(), ...add].filter(Boolean).join("\n");
}
