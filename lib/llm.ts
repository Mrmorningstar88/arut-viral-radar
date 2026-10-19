import Anthropic from "@anthropic-ai/sdk";

export const MODEL_MAIN = "claude-opus-5-5";
export const MODEL_FAST = "claude-haiku-5-5";

let client: Anthropic | undefined;
export function llm() {
  client ??= new Anthropic();
  return client;
}

// Цены за 1M токенов для учёта себестоимости (usage_costs).
const PRICE: Record<string, [number, number]> = {
  [MODEL_MAIN]: [4, 20],
  [MODEL_FAST]: [0.1, 0.5],
};

export function costUsd(model: string, usage: { input_tokens: number; output_tokens: number }) {
  const [i, o] = PRICE[model] ?? [0, 0];
  return (usage.input_tokens * i + usage.output_tokens * o) / 1_000_000;
}

export class RefusalError extends Error {}
