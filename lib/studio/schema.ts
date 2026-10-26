import { z } from "zod";
import { OPUS_STYLES } from "./styles";

const STYLE_SLUGS = OPUS_STYLES.map((s) => s.slug) as [string, ...string[]];

export const STAGES = ["script", "storyboard", "production", "ready", "published"] as const;
export type Stage = (typeof STAGES)[number] | "rejected";

export const STAGE_LABEL: Record<Stage, string> = {
  script: "Сценарии",
  storyboard: "Сториборды",
  production: "Производство",
  ready: "Готовые ролики",
  published: "Опубликовано",
  rejected: "Отклонено",
};

export const STAGE_HINT: Record<Stage, string> = {
  script: "Одобри, измени или отклони",
  storyboard: "Посмотри кадры и одобри",
  production: "Opuscar рендерит ролик",
  ready: "Посмотри и опубликуй",
  published: "Вышли в соцсети",
  rejected: "",
};

const Vo = z.object({ t: z.string().describe("Тайм-код вида «0-3»"), text: z.string() });

export const ScriptDraft = z.object({
  title: z.string().describe("Короткое название ролика для карточки, 3–6 слов"),
  pillar: z.string().describe("Рубрика из паспорта или тем автора"),
  sourceReel: z.number().int().describe("Номер залёта из списка, чью механику берём; 0, если ни один не подошёл"),
  mechanic: z.string().describe("Какой приём залёта переносим и как, 1–2 предложения"),
  hook: z.string().describe("Первые 1–3 секунды: фраза и что на экране"),
  vo: z.array(Vo).min(3).max(10).describe("Озвучка 15–40 секунд"),
  onScreen: z.array(z.string()).max(6).describe("Ключевые надписи на экране"),
  caption: z.string().describe("Подпись к посту"),
  cta: z.string(),
  sound: z.string().describe("Звук: какая музыка или трендовый тип трека, темп, звуковые акценты (удар на хуке, whoosh на смене кадра); как звук работал в залёте"),
  whyItWorks: z.array(z.string()).min(2).max(3).describe("Почему зайдёт: опора на механику залёта и боль аудитории"),
  style: z.enum(STYLE_SLUGS).describe("Визуальный стиль lemo-opuscar, который лучше всего подходит ролику"),
});
// forever: автор убрал сценарий навсегда, похожие больше не предлагаем.
// format / formatX: формат залёта-источника и его отрыв от медианы ниши (из рейтинга форматов).
export type ScriptDraft = z.infer<typeof ScriptDraft> & { forever?: boolean; format?: string; formatX?: number };

export const ScriptBatch = z.object({ scripts: z.array(ScriptDraft).min(1).max(12) });

export const StoryShot = z.object({
  n: z.number().int(),
  dur: z.number(),
  frame: z.string().describe("Что в кадре и как движется, по-русски, в выбранном стиле"),
  overlay: z.string().describe("Текст на экране, пусто если нет"),
});

export const Storyboard = z.object({
  shots: z.array(StoryShot).min(4).max(8),
  vo: z.array(Vo).min(3).max(10),
  music: z.string().describe("Музыка и темп монтажа"),
});
export type Storyboard = z.infer<typeof Storyboard>;
