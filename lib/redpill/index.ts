import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { semanticIssues } from "@/lib/generate/checks";
import { buildSystemPrompt, type Persona } from "@/lib/generate/persona";
import { RedPillStory } from "@/lib/generate/schema";
import { costUsd, llm, MODEL_MAIN, RefusalError } from "@/lib/llm";

export const REDPILL_RULES = `RED PILL: сюжет о том, на что отвлекали внимание людей, пока происходило что-то важное.
Только то, что подтверждено первичными документами, решениями судов, официальными расследованиями или рецензируемыми работами.
Темы: деньги, центробанки, финансовые скандалы, индустрия, технологии, приватность.
ЗАПРЕЩЕНО: НЛО, антинаука, «тайные кланы» и мировые заговоры, антисемитские и любые этнические мотивы, версии о терактах, неподтверждённые слухи.
Если по теме нельзя найти минимум 2 таких источника, откажись от неё.`;

// Шаг 1: веб-поиск первоисточников. Возвращает текстовую выжимку с URL.
export async function researchStory(topic: string): Promise<{ notes: string; usd: number }> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${REDPILL_RULES}\n\nТема: ${topic}\n\nНайди 2–4 первичных источника (суд, официальное расследование, первичный документ, рецензируемая работа) и 4–6 подтверждённых фактов с датами. Формат: сначала факты списком, у каждого номер источника; затем источники: «[n] название — тип — URL». Только то, что прямо есть в источниках.`,
    },
  ];
  let usd = 0;
  for (let i = 0; i < 4; i++) {
    const res = await llm().messages.create({
      model: MODEL_MAIN,
      max_tokens: 8000,
      output_config: { effort: "medium" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
      messages,
    });
    usd += costUsd(MODEL_MAIN, res.usage);
    if (res.stop_reason === "refusal") throw new RefusalError("Claude отказался собирать эту тему");
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    return { notes: res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim(), usd };
  }
  throw new Error("Поиск источников не завершился");
}

// Шаг 2: сценарий по найденным фактам, строго по схеме, с одним повтором при ошибке.
export async function writeStory(
  topic: string,
  notes: string,
  persona: Persona,
  learned: { taste: string; rules: string[] },
): Promise<{ story: RedPillStory; usd: number }> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `${REDPILL_RULES}\n\nТЕМА: ${topic}\n\nНАЙДЕННЫЕ ФАКТЫ И ИСТОЧНИКИ (используй только их, URL копируй точно):\n${notes}\n\nСделай сюжет Red Pill и адаптацию под автора: Reels 15–35 секунд. Корневые поля совпадают с i18n.ru.`,
    },
  ];
  const system = [{ type: "text" as const, text: buildSystemPrompt(persona, learned), cache_control: { type: "ephemeral" as const } }];
  let usd = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    let problem: string;
    try {
      const res = await llm().beta.messages.parse({
        model: MODEL_MAIN,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "high", format: betaZodOutputFormat(RedPillStory) },
        system,
        messages,
      });
      usd += costUsd(MODEL_MAIN, res.usage);
      if (res.stop_reason === "refusal") throw new RefusalError("Claude отказался писать этот сюжет");
      const story = res.parsed_output;
      if (!story) throw new Error(`empty output: ${res.stop_reason}`);
      const issues = semanticIssues(story);
      for (const s of story.sources) if (!fromNotes(s.url, notes)) issues.push(`источник ${s.url} не из найденных, используй только найденные URL`);
      if (issues.length === 0) return { story, usd };
      problem = issues.join("\n");
    } catch (e) {
      if (e instanceof RefusalError || !(e instanceof Anthropic.AnthropicError) || e instanceof Anthropic.APIError) throw e;
      problem = e.message;
    }
    if (attempt === 0) messages.push({ role: "user", content: `Ответ не прошёл проверку. Исправь и верни полный ответ заново:\n${problem}` });
    else throw new Error(`Сюжет не прошёл проверку дважды: ${problem.slice(0, 300)}`);
  }
  throw new Error("unreachable");
}

// Новая тема, когда стартовый бэклог закончился.
export async function proposeTopic(past: string[]): Promise<{ topic: string; usd: number }> {
  const res = await llm().messages.create({
    model: MODEL_MAIN,
    max_tokens: 400,
    output_config: { effort: "medium" },
    messages: [
      {
        role: "user",
        content: `${REDPILL_RULES}\n\nУже были темы:\n- ${past.join("\n- ")}\n\nПредложи одну новую тему, не похожую по смыслу ни на одну из них. Ответь только названием темы с годом.`,
      },
    ],
  });
  const topic = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
  return { topic, usd: costUsd(MODEL_MAIN, res.usage) };
}

// Источник считается найденным, если его сайт встречается в выжимке поиска.
function fromNotes(url: string, notes: string) {
  try {
    return notes.includes(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
}
