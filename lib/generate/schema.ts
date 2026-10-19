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

const Localized = z.object({
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

export const RedPillStory = z.object({
  era: z.string(),
  distraction: z.string(),
  facts: z.array(z.string()),
  sources: z.array(z.string().describe("URL первичного источника")).min(2).max(4),
  adaptation: Adaptation,
  expert: Expert,
  risks: z.array(z.string()),
  i18n: z.object({ ru: z.unknown(), en: z.unknown() }),
});
