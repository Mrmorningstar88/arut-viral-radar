import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { logCost, serviceDb } from "@/lib/engine/store";
import { costUsd, llm, MODEL_MAIN, RefusalError } from "@/lib/llm";
import { isMySlug, OPUS_STYLES, styleBySlug, type MyStyleCard } from "./styles";

// Свой стиль автора из его роликов. Браузер вынимает из роликов кадры и считает склейки, кадры лежат в covers,
// Claude смотрит на них и пишет STYLE.md в формате lemo-opuscar поверх ближайшего стиля библиотеки.
// Хранится в общем кэше по ключу mystyle:<ws>:<slug>: оттуда его читает рендер-воркер.

const FOREVER = "2100-01-01T00:00:00Z";
const KEY = (ws: string, slug: string) => `mystyle:${ws}:${slug}`;
export const MAX_STYLES = 12;
export const MAX_FRAMES = 40;
// Разбор идёт в фоне; если он завис дольше этого, карточка считается неудавшейся.
const STALE_MS = 10 * 60_000;

export type ClipStats = { duration: number; cuts: number; frames: { url: string; t: number }[] };

export type MyStyle = MyStyleCard & {
  id: string;
  wish: string;
  clips: ClipStats[];
  borrows: string[];
  styleMd: string;
  created: string;
};

export const framePrefix = (ws: string, draft: string) => `styles/${ws}/${draft}/`;

const card = ({ slug, name, line, uses, seen, palette, frames, basedOn, status, error, created }: MyStyle): MyStyleCard => ({
  slug, name, line, uses, seen, palette, frames, basedOn,
  status: status === "analyzing" && Date.now() - Date.parse(created) > STALE_MS ? "failed" : status,
  error: status === "analyzing" && Date.now() - Date.parse(created) > STALE_MS ? "Разбор не успел, попробуй ещё раз" : error,
});

async function all(ws: string): Promise<MyStyle[]> {
  const { data, error } = await serviceDb().from("source_cache").select("payload").like("key", `mystyle:${ws}:%`);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.payload as MyStyle).sort((a, b) => b.created.localeCompare(a.created));
}

export const listMyStyles = async (ws: string) => (await all(ws)).map(card);

export async function getMyStyle(ws: string, slug: string): Promise<MyStyle | null> {
  if (!isMySlug(slug)) return null;
  const { data } = await serviceDb().from("source_cache").select("payload").eq("key", KEY(ws, slug)).maybeSingle();
  return (data?.payload as MyStyle | undefined) ?? null;
}

async function save(ws: string, s: MyStyle) {
  const { error } = await serviceDb().from("source_cache").upsert({ key: KEY(ws, s.slug), payload: s, expires_at: FOREVER });
  if (error) throw new Error(error.message);
}

// Стиль можно выбрать для ролика, если он из библиотеки или это готовый свой стиль этой организации.
export async function styleExists(ws: string, slug: string) {
  if (styleBySlug(slug)) return true;
  return (await getMyStyle(ws, slug))?.status === "ready";
}

// Строка стиля для сценариста и раскадровщика.
export async function styleLine(ws: string, slug: string) {
  const my = await getMyStyle(ws, slug);
  if (my) return `свой стиль автора «${my.name}»: ${my.line} Что в нём главное: ${my.seen.join("; ")}. Палитра: ${my.palette.join(", ")}.`;
  const st = styleBySlug(slug);
  return st ? `${st.name} (${st.category}): ${st.line}` : slug;
}

export async function createMyStyle(ws: string, draft: string, input: { name: string; wish: string; clips: ClipStats[] }) {
  const have = await all(ws);
  if (have.length >= MAX_STYLES) throw new Error(`Своих стилей может быть до ${MAX_STYLES}. Удали ненужный и попробуй снова`);
  const s: MyStyle = {
    id: draft,
    slug: `my-${draft.replace(/-/g, "").slice(0, 10)}`,
    name: input.name || "Мой стиль",
    line: "",
    uses: [],
    seen: [],
    palette: [],
    frames: input.clips.flatMap((c) => c.frames.map((f) => f.url)),
    basedOn: "",
    borrows: [],
    styleMd: "",
    status: "analyzing",
    error: null,
    wish: input.wish,
    clips: input.clips,
    created: new Date().toISOString(),
  };
  await save(ws, s);
  return s;
}

const SLUGS = OPUS_STYLES.map((s) => s.slug) as [string, ...string[]];
const CATALOG = OPUS_STYLES.map((s) => `${s.slug}: ${s.name} (${s.category}): ${s.line}`).join("\n");

const Analysis = z.object({
  name: z.string().describe("Короткое название стиля по-русски, 2–4 слова, если автор не дал своё"),
  line: z.string().describe("Одно предложение по-русски: что это за стиль"),
  uses: z.array(z.string()).min(2).max(3).describe("Для каких роликов подходит, по-русски, 1–3 слова каждое"),
  seen: z.array(z.string()).min(4).max(6).describe("Что ты увидел в роликах, по-русски, коротко: палитра, шрифты и надписи, фактура, свет, движение, монтаж"),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(3).max(6).describe("Главные цвета роликов в hex"),
  basedOn: z.enum(SLUGS).describe("Стиль библиотеки, чьи материалы и движок ближе всего: на нём будет строиться код"),
  borrows: z.array(z.enum(SLUGS)).max(2).describe("До двух стилей библиотеки, из которых берутся отдельные приёмы"),
  styleMd: z.string().describe("Полный STYLE.md на английском"),
});

// Разбор кадров Claude: смотрим на ролики автора, выбираем базу из библиотеки и пишем стиль-промпт.
export async function analyzeMyStyle(ws: string, slug: string) {
  const s = await getMyStyle(ws, slug);
  if (!s) throw new Error("Стиль не найден");
  try {
    const content: ({ type: "text"; text: string } | { type: "image"; source: { type: "url"; url: string } })[] = [];
    s.clips.forEach((c, i) => {
      const shot = c.cuts > 0 ? (c.duration / (c.cuts + 1)).toFixed(1) : null;
      content.push({ type: "text", text: `РОЛИК ${i + 1}: длина ${Math.round(c.duration)} с, склеек примерно ${c.cuts}${shot ? `, средний план ${shot} с` : ", почти без склеек"}. Кадры по порядку:` });
      for (const f of c.frames) {
        content.push({ type: "text", text: `${f.t.toFixed(1)} с` });
        content.push({ type: "image", source: { type: "url", url: f.url } });
      }
    });
    content.push({
      type: "text",
      text: [
        s.wish && `ЧТО АВТОР ХОЧЕТ СОХРАНИТЬ: ${s.wish}`,
        s.name !== "Мой стиль" && `НАЗВАНИЕ ОТ АВТОРА: ${s.name}`,
        `СТИЛИ БИБЛИОТЕКИ (slug: название: суть):\n${CATALOG}`,
        [
          "Задача: это ролики автора в его стиле. Собери из них стиль, в котором движок lemo-opuscar будет рисовать новые ролики кодом (без генерации картинок).",
          "1. Выбери basedOn: стиль библиотеки с самыми близкими материалами и техникой отрисовки, и до двух borrows.",
          "2. Напиши styleMd на английском, как STYLE.md библиотеки: заголовок `# <English name> — Style Prompt`, под ним строка `Made from the author's own reels; techniques from <base name> (<base slug>) in Lemo-Opuscar.` и `Default size: 1080×1920.`, затем ровно 11 разделов с заголовками `## 1. Essence, and what it is not`, `## 2. Materials & rendering`, `## 3. Colour logic`, `## 4. Type & subtitles`, `## 5. Motion quality`, `## 6. Camera grammar`, `## 7. Sound palette`, `## 8. Native moves`, `## 9. Pitfalls of the medium`, `## 10. Engine`, `## 11. Variation space`.",
          "Только инварианты стиля, без сюжета, таймлайна и концовки. Конкретно и проверяемо: hex-цвета, размеры и вес шрифта, где стоят надписи, фактура, свет, скорость и кривые движения, длина плана и тип склеек по тому, что видно на кадрах и в числах склеек. В §7 опиши звук под этот монтаж, но без трендовых треков: у организации свой фирменный звук. В §10 укажи, на каких файлах и техниках базы строить код ($LIB/styles/<basedOn>/STYLE.md, DEMO.md, demo/). В §9 перечисли, что сломает узнаваемость.",
          "Не переноси в стиль сюжеты, людей, логотипы и тексты с кадров: только визуальный язык. Если на кадрах живая съёмка с человеком, опиши свет, цвет, графику и монтаж вокруг него.",
        ].join("\n"),
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const res = await llm().beta.messages.parse({
      model: MODEL_MAIN,
      max_tokens: 16000,
      output_config: { effort: "high", format: betaZodOutputFormat(Analysis) },
      system: "Ты арт-директор и моушн-дизайнер. По кадрам роликов точно описываешь визуальный стиль так, чтобы другой режиссёр повторил его в новых роликах.",
      messages: [{ role: "user", content }],
    });
    await logCost(ws, null, "anthropic", costUsd(MODEL_MAIN, res.usage));
    if (res.stop_reason === "refusal") throw new RefusalError("Claude отказался разбирать эти ролики");
    const a = res.parsed_output;
    if (!a) throw new Error(`Пустой ответ: ${res.stop_reason}`);
    await save(ws, {
      ...s,
      name: s.name !== "Мой стиль" ? s.name : a.name.slice(0, 40),
      line: a.line,
      uses: a.uses,
      seen: a.seen,
      palette: a.palette,
      basedOn: a.basedOn,
      borrows: a.borrows.filter((b) => b !== a.basedOn),
      styleMd: a.styleMd,
      status: "ready",
      error: null,
    });
  } catch (e) {
    await save(ws, { ...s, status: "failed", error: e instanceof Error ? e.message.slice(0, 200) : "Не получилось разобрать ролики" });
  }
}

export async function deleteMyStyle(ws: string, slug: string) {
  const s = await getMyStyle(ws, slug);
  if (!s) return;
  const d = serviceDb();
  const { error } = await d.from("source_cache").delete().eq("key", KEY(ws, slug));
  if (error) throw new Error(error.message);
  const { data } = await d.storage.from("covers").list(framePrefix(ws, s.id).slice(0, -1));
  if (data?.length) await d.storage.from("covers").remove(data.map((f) => framePrefix(ws, s.id) + f.name));
}
