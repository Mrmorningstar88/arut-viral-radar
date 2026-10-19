import { z } from "zod";

const Shot = z.object({
  n: z.number().int(),
  dur: z.number(),
  frame: z.string(),
  overlay: z.string(),
  prompt: z.string().describe("English only, must contain [ARUT character reference]"),
});

const Adaptation = z.object({
  concept: z.string(),
  format: z.string(),
  hook: z.string(),
  vo: z.array(z.object({ t: z.string(), text: z.string() })),
  storyboard: z.array(Shot).min(4).max(7),
  caption: z.string(),
  keyword: z.string().regex(/^[\p{Lu}]+$/u, "одно слово CAPS"),
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
  sources: z.array(z.string().url()).min(2).max(4),
  adaptation: Adaptation,
  expert: Expert,
  risks: z.array(z.string()),
  i18n: z.object({ ru: z.unknown(), en: z.unknown() }),
});
