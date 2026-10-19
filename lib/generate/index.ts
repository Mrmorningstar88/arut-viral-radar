import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { costUsd, llm, MODEL_MAIN, RefusalError } from "@/lib/llm";
import type { ReelDetails } from "@/lib/sources/types";
import { semanticIssues } from "./checks";
import { buildSystemPrompt, type Persona } from "./persona";
import { ReelAnalysis } from "./schema";
import { researchFigures } from "./research";

export type Learned = { taste: string; rules: string[] };

const NEEDS_FIGURES = /ставк|инфляц|курс|цен[аы]|ипотек|биткоин|крипт|акци|рынок|ФРС|rate|inflation|price|bitcoin|crypto|stock|market|fed|\$|%/i;

export async function generateReelAnalysis(
  reel: ReelDetails,
  persona: Persona,
  learned: Learned,
  wish?: string,
): Promise<{ analysis: ReelAnalysis; usd: number }> {
  let usd = 0;
  let figures = "";
  if (NEEDS_FIGURES.test(`${reel.caption} ${reel.keywords.join(" ")}`)) {
    const r = await researchFigures(`${reel.caption}\n${reel.keywords.join(" ")}`);
    figures = r.text;
    usd += r.usd;
  }

  const userContent = [
    `РОЛИК @${reel.author} (${reel.url})`,
    `Просмотры: ${reel.views ?? "неизвестно"} · лайки: ${reel.likes ?? "?"} · комментарии: ${reel.comments ?? "?"} · дата: ${reel.date}`,
    `Подпись:\n${reel.caption || "(нет)"}`,
    reel.transcript && `РАСШИФРОВКА РЕЧИ:\n${reel.transcript}`,
    reel.keywords.length > 0 && `Хэштеги: ${reel.keywords.join(" ")}`,
    reel.topComments.length > 0 && `Топ-комментарии:\n- ${reel.topComments.join("\n- ")}`,
    wish && `ПОЖЕЛАНИЕ АВТОРА К АДАПТАЦИИ:\n${wish}`,
    figures && `СВЕЖИЕ ЦИФРЫ (из веб-поиска, с источниками):\n${figures}`,
    "Опиши оригинал и его механику, разбери, почему он залетел (3–4 конкретные причины), и перенеси механику на темы автора.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userContent }];
  const system = [{ type: "text" as const, text: buildSystemPrompt(persona, learned), cache_control: { type: "ephemeral" as const } }];

  for (let attempt = 0; attempt < 2; attempt++) {
    let problem: string;
    try {
      const res = await llm().beta.messages.parse({
        model: MODEL_MAIN,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "high", format: betaZodOutputFormat(ReelAnalysis) },
        system,
        messages,
      });
      usd += costUsd(MODEL_MAIN, res.usage);
      if (res.stop_reason === "refusal") throw new RefusalError("Claude отказался разбирать этот ролик");
      const parsed = res.parsed_output;
      if (!parsed) throw new Error(`empty output: ${res.stop_reason}`);
      const issues = semanticIssues(parsed);
      if (issues.length === 0) return { analysis: parsed, usd };
      problem = issues.join("\n");
    } catch (e) {
      if (e instanceof RefusalError || !(e instanceof Anthropic.AnthropicError) || e instanceof Anthropic.APIError) throw e;
      problem = e.message; // ответ не прошёл zod-схему
    }
    if (attempt === 0) {
      messages.push({ role: "user", content: `Предыдущий ответ не прошёл проверку. Исправь и верни полный ответ заново:\n${problem}` });
    } else {
      throw new Error(`Ответ не прошёл проверку дважды: ${problem.slice(0, 300)}`);
    }
  }
  throw new Error("unreachable");
}
