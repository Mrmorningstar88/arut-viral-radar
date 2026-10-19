import type { ReelAnalysis } from "@/lib/generate/schema";
import type { ReelSummary } from "./types";

// Старые разборы были без блока original, поэтому mechanic может отсутствовать.
export function toSummary(a: ReelAnalysis): ReelSummary {
  const ru = a.i18n?.ru ?? a;
  return { hook: ru.adaptation.hook, concept: ru.adaptation.concept, why: ru.why, mechanic: ru.original?.mechanic ?? [] };
}
