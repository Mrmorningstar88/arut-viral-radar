import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { logCost, serviceDb } from "@/lib/engine/store";
import { costUsd, llm, MODEL_MAIN, RefusalError } from "@/lib/llm";

// «Моя студия»: реальная комната автора как постоянная сцена роликов организации. Автор загружает 1–6 фото,
// Claude описывает место (свет, мебель, техника, одежда, палитра), и сценарист вставляет в мини-фильмы
// короткие планы, где автор говорит в камеру в этой студии, а раскадровщик и рендер держат её узнаваемой.
// Хранится в общем кэше по ключу scene:<ws>: оттуда её читает рендер-воркер. Фото лежат в covers/scenes/<ws>/<draft>/.

const FOREVER = "2100-01-01T00:00:00Z";
const KEY = (ws: string) => `scene:${ws}`;
export const MAX_SCENE_PHOTOS = 6;
// Разбор идёт в фоне; если он завис дольше этого, студия считается неразобранной.
const STALE_MS = 10 * 60_000;

export const scenePrefix = (ws: string, draft: string) => `scenes/${ws}/${draft}/`;

export type Scene = {
  draft: string;
  photos: string[];
  status: "analyzing" | "ready" | "failed";
  error: string | null;
  on: boolean;
  name: string;
  // ru: описание места для сценариста и раскадровщика; en: промпт места для генерации кадров (Higgsfield).
  ru: string;
  en: string;
  seen: string[];
  palette: string[];
  angles: string[];
  created: string;
};

export type SceneCard = Pick<Scene, "photos" | "status" | "error" | "on" | "name" | "ru" | "seen" | "palette" | "angles">;

export async function sceneOf(ws: string): Promise<Scene | null> {
  const { data } = await serviceDb().from("source_cache").select("payload").eq("key", KEY(ws)).maybeSingle();
  const s = (data?.payload as Scene | undefined) ?? null;
  if (s?.status === "analyzing" && Date.now() - Date.parse(s.created) > STALE_MS) return { ...s, status: "failed", error: "Разбор не успел, попробуй ещё раз" };
  return s;
}

export const sceneCard = (s: Scene): SceneCard => ({ photos: s.photos, status: s.status, error: s.error, on: s.on, name: s.name, ru: s.ru, seen: s.seen, palette: s.palette, angles: s.angles });

async function save(ws: string, s: Scene) {
  const { error } = await serviceDb().from("source_cache").upsert({ key: KEY(ws), payload: s, expires_at: FOREVER });
  if (error) throw new Error(error.message);
}

async function removePhotos(ws: string, draft: string) {
  const d = serviceDb();
  const prefix = scenePrefix(ws, draft);
  const { data } = await d.storage.from("covers").list(prefix.slice(0, -1));
  if (data?.length) await d.storage.from("covers").remove(data.map((f) => prefix + f.name));
}

// Новая студия заменяет прежнюю: старые фото удаляются, переключатель остаётся как был (новая включена по умолчанию).
export async function createScene(ws: string, draft: string, photos: string[]) {
  const old = await sceneOf(ws);
  const s: Scene = { draft, photos, status: "analyzing", error: null, on: old?.on ?? true, name: "", ru: "", en: "", seen: [], palette: [], angles: [], created: new Date().toISOString() };
  await save(ws, s);
  if (old && old.draft !== draft) await removePhotos(ws, old.draft).catch((e) => console.error("scene photos cleanup", e));
  return s;
}

export async function setSceneOn(ws: string, on: boolean) {
  const s = await sceneOf(ws);
  if (!s) throw new Error("Сначала загрузи фото студии");
  if (on && s.status !== "ready") throw new Error("Дождись, пока студия разберётся");
  await save(ws, { ...s, on });
}

export async function deleteScene(ws: string) {
  const s = await sceneOf(ws);
  if (!s) return;
  const { error } = await serviceDb().from("source_cache").delete().eq("key", KEY(ws));
  if (error) throw new Error(error.message);
  await removePhotos(ws, s.draft).catch((e) => console.error("scene photos cleanup", e));
}

const Analysis = z.object({
  name: z.string().describe("Короткое название места по-русски, 2–4 слова, например «Тёмная домашняя студия»"),
  ru: z.string().describe("2–4 предложения по-русски для сценариста и оператора: что за комната, где сидит автор, свет, фон, техника, как он выглядит и одет. Без оценок внешности"),
  en: z.string().describe("Один абзац на английском, промпт места для генерации кадров: room, background, furniture, props, microphone, light direction and color temperature, mood, the man's wardrobe and accessories (no face description), lens feel. 60–110 слов"),
  seen: z.array(z.string()).min(4).max(7).describe("Детали, по которым студию узнают, по-русски коротко: шторы, кресло, микрофон, свет, диван и т.п."),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(3).max(5).describe("Главные цвета студии в hex"),
  angles: z.array(z.string()).min(2).max(4).describe("Планы, которые можно снять в этой студии, по-русски: крупность, ракурс, свет. Например «Крупный план через микрофон, свет слева»"),
});

// Claude смотрит на фото студии и описывает её так, чтобы сценарист, раскадровщик и рендер держали её узнаваемой.
export async function analyzeScene(ws: string) {
  const s = await sceneOf(ws);
  if (!s) throw new Error("Студия не найдена");
  const draft = s.draft;
  try {
    const res = await llm().beta.messages.parse({
      model: MODEL_MAIN,
      max_tokens: 4000,
      output_config: { effort: "medium", format: betaZodOutputFormat(Analysis) },
      system:
        "Ты оператор-постановщик. Автор коротких роликов прислал фото своей студии, где он снимается и говорит в камеру. Опиши место так, чтобы его можно было узнать и повторить: комната, фон, мебель, техника, свет, цвет, одежда автора. Внешность и лицо не оценивай и не описывай.",
      messages: [
        {
          role: "user",
          content: [
            ...s.photos.map((url) => ({ type: "image" as const, source: { type: "url" as const, url } })),
            { type: "text" as const, text: `Фото студии автора выше (${s.photos.length} шт.). Опиши её по схеме.` },
          ],
        },
      ],
    });
    await logCost(ws, null, "anthropic", costUsd(MODEL_MAIN, res.usage));
    if (res.stop_reason === "refusal") throw new RefusalError("Claude отказался разбирать эти фото");
    const a = res.parsed_output;
    if (!a) throw new Error(`Пустой ответ: ${res.stop_reason}`);
    // Пока шёл разбор, автор мог загрузить другие фото: тогда этот результат устарел.
    const now = await sceneOf(ws);
    if (now?.draft !== draft) return;
    await save(ws, { ...now, ...a, status: "ready", error: null });
  } catch (e) {
    const now = await sceneOf(ws);
    if (now?.draft !== draft) return;
    await save(ws, { ...now, status: "failed", error: e instanceof Error ? e.message.slice(0, 200) : "Не получилось разобрать фото" });
  }
}

// Строки для сценариста и раскадровщика: студия включена и разобрана, иначе пусто.
export async function sceneBrief(ws: string) {
  const s = await sceneOf(ws).catch(() => null);
  if (!s?.on || s.status !== "ready") return null;
  return s;
}
