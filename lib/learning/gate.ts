import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { buildSystemPrompt, type Persona } from "@/lib/generate/persona";
import { costUsd, llm, MODEL_MAIN } from "@/lib/llm";
import { type Draft, type GateCase, judgePrompt, keeps, MAX_CASES, MIN_CASES, order } from "./gate-core";

const DraftOut = z.object({
  hook: z.string().describe("Хук, одна фраза по-русски"),
  vo: z.array(z.string()).min(2).max(6).describe("Озвучка по-русски, 2–6 коротких реплик"),
});
const Judge = z.object({ closer: z.enum(["A", "B"]) });

export type GateResult = { kept: string[]; dropped: string[]; checked: number; usd: number };

async function draft(system: string, c: GateCase): Promise<{ d: Draft; usd: number }> {
  const res = await llm().beta.messages.parse({
    model: MODEL_MAIN,
    max_tokens: 1500,
    output_config: { effort: "low", format: betaZodOutputFormat(DraftOut) },
    system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user", content: `${c.about}\n\nНапиши только хук и озвучку адаптации на русском.` }],
  });
  if (!res.parsed_output) throw new Error(`empty draft: ${res.stop_reason}`);
  return { d: res.parsed_output, usd: costUsd(MODEL_MAIN, res.usage) };
}

async function judge(c: GateCase, a: Draft, b: Draft): Promise<{ closer: "A" | "B"; usd: number }> {
  const res = await llm().beta.messages.parse({
    model: MODEL_MAIN,
    max_tokens: 400,
    output_config: { effort: "low", format: betaZodOutputFormat(Judge) },
    system: "Ты сравниваешь два черновика сценария Reels с финальной версией автора. Ответь, какой ближе.",
    messages: [{ role: "user", content: judgePrompt(c, a, b) }],
  });
  if (!res.parsed_output) throw new Error(`empty judge: ${res.stop_reason}`);
  return { closer: res.parsed_output.closer, usd: costUsd(MODEL_MAIN, res.usage) };
}

// Каждое новое правило проверяется на роликах, где автор правил сценарий: сценарист пишет черновик с одобренными
// правилами и с ними плюс новое, судья смотрит, какой ближе к правке автора. Правило проходит, только если чаще ближе.
export async function gateRules(persona: Persona, taste: string, approved: string[], candidates: string[], cases: GateCase[]): Promise<GateResult> {
  const use = cases.slice(0, MAX_CASES);
  if (use.length < MIN_CASES || candidates.length === 0) return { kept: candidates, dropped: [], checked: 0, usd: 0 };
  let usd = 0;
  const baseSystem = buildSystemPrompt(persona, { taste, rules: approved });
  const base = await Promise.all(use.map((c) => draft(baseSystem, c)));
  usd += base.reduce((s, x) => s + x.usd, 0);
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const rule of candidates) {
    const sys = buildSystemPrompt(persona, { taste, rules: [...approved, rule] });
    const verdicts = await Promise.all(
      use.map(async (c, i) => {
        const w = await draft(sys, c);
        const o = order(i, w.d, base[i].d);
        const j = await judge(c, o.a, o.b);
        return { win: j.closer === o.ruleIs, usd: w.usd + j.usd };
      }),
    );
    usd += verdicts.reduce((s, v) => s + v.usd, 0);
    (keeps(verdicts.filter((v) => v.win).length, verdicts.length) ? kept : dropped).push(rule);
  }
  return { kept, dropped, checked: use.length, usd };
}
