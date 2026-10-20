import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { costUsd, llm, MODEL_FAST } from "@/lib/llm";
import type { ReelDetails } from "@/lib/sources/types";

export const Verdict = z.object({
  exclude: z.boolean(),
  reason: z.enum(["none", "ad", "kids", "shock", "politics", "cctv_or_live", "low_quality"]),
  fit_score: z.number().int().min(0).max(100),
  fit_reason: z.string().describe("Одно предложение по-русски: почему ролик подходит или нет"),
});
export type Verdict = z.infer<typeof Verdict>;

const SYSTEM = `Ты фильтруешь залетевшие Reels для автора, который адаптирует их под свой образ.
Исключай (exclude=true) с соответствующей причиной:
- ad: реклама, промо-интеграция, продажа продукта;
- kids: дети как главный объект;
- shock: шок-контент, насилие, жестокость;
- politics: агитация за или против партий и кандидатов. Разборы политики, экономики, денег и власти не исключай, это может быть темой автора;
- cctv_or_live: записи камер наблюдения, лайв-камер, случайные съёмки происшествий, стримы;
- low_quality: треш, низкое качество, контент без идеи, которую можно пересказать.
fit_score 0–100: насколько формат и идею можно адаптировать под автора (его факты, голос и вкус ниже).`;

export async function classifyReel(
  reel: ReelDetails,
  profile: { persona: string; taste: string; rules: string[] },
): Promise<{ verdict: Verdict; usd: number }> {
  const res = await llm().beta.messages.parse({
    model: MODEL_FAST,
    max_tokens: 1024,
    output_config: { effort: "low", format: betaZodOutputFormat(Verdict) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          `АВТОР:\n${profile.persona}`,
          profile.taste && `ВКУС АВТОРА (по его прошлым решениям):\n${profile.taste}`,
          profile.rules.length > 0 && `ОДОБРЕННЫЕ ПРАВИЛА:\n- ${profile.rules.join("\n- ")}`,
          `РОЛИК @${reel.author}\nПодпись: ${reel.caption}\nХэштеги: ${reel.keywords.join(" ")}\nКомментарии:\n- ${reel.topComments.slice(0, 10).join("\n- ")}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  });
  if (!res.parsed_output) throw new Error(`classifier: ${res.stop_reason}`);
  return { verdict: res.parsed_output, usd: costUsd(MODEL_FAST, res.usage) };
}
