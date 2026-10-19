import { z } from "zod";

// Описание кадра для 3D-превью: сцена собирается из простых фигур.
export const Scene = z.object({
  location: z.enum(["studio", "rooftop", "office", "street", "car", "home"]),
  shot: z.enum(["close", "medium", "wide"]),
  camera: z.enum(["static", "push_in", "pull_out", "orbit", "pan"]),
  action: z.enum(["talk", "point", "hold_phone", "sit", "walk", "gesture"]),
  props: z.array(z.enum(["desk", "monitors", "phone", "laptop", "chair", "table", "window", "car", "board"])).max(4),
});
export type Scene = z.infer<typeof Scene>;

const Shot = z.object({
  n: z.number().int(),
  dur: z.number(),
  frame: z.string(),
  overlay: z.string(),
  prompt: z.string().describe("English only, must contain [ARUT character reference]"),
  scene: Scene,
});
export type Shot = z.infer<typeof Shot>;

const Adaptation = z.object({
  concept: z.string(),
  format: z.string(),
  hook: z.string(),
  vo: z.array(z.object({ t: z.string(), text: z.string() })),
  storyboard: z.array(Shot).min(4).max(7),
  caption: z.string(),
  keyword: z.string().describe("Одно слово КАПСОМ"),
  cta: z.string(),
  prompt_gift: z.string().optional(),
});

const Expert = z.object({ markets: z.string(), macro: z.string(), politics: z.string() });

// Что было в оригинале и какой приём из него переносится на автора.
const Original = z.object({
  summary: z.string().describe("Что происходит в оригинале, 1–2 предложения"),
  beats: z.array(z.object({ t: z.string(), what: z.string() })).min(3).max(6).describe("Ход оригинала по секундам"),
  mechanic: z
    .array(z.object({ element: z.string(), theirs: z.string(), yours: z.string() }))
    .min(3)
    .max(5)
    .describe("Приёмы залёта (хук, структура, формат, триггер, CTA): как у оригинала и как у автора"),
});

const Localized = z.object({
  original: Original,
  why: z.array(z.string()).min(3).max(4),
  adaptation: Adaptation,
  expert: Expert,
  risks: z.array(z.string()),
  note: z.string(),
});

export const ReelAnalysis = Localized.extend({
  i18n: z.object({ ru: Localized, en: Localized }),
});
export type ReelAnalysis = z.infer<typeof ReelAnalysis>;

const RedPillLocalized = z.object({
  title: z.string().describe("Короткое название сюжета"),
  era: z.string().describe("Когда и где это происходило"),
  distraction: z.string().describe("На что в это время отвлекали внимание людей"),
  facts: z.array(z.string()).min(3).max(6).describe("Подтверждённые факты, каждый опирается на источник из sources"),
  adaptation: Adaptation,
  expert: Expert,
  risks: z.array(z.string()),
});

export const RedPillStory = RedPillLocalized.extend({
  sources: z
    .array(z.object({ title: z.string(), url: z.string(), kind: z.enum(["court", "official", "peer_reviewed", "primary_document"]) }))
    .min(2)
    .max(4),
  i18n: z.object({ ru: RedPillLocalized, en: RedPillLocalized }),
});
export type RedPillStory = z.infer<typeof RedPillStory>;
