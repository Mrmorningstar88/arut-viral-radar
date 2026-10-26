import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { costUsd, llm, MODEL_MAIN, RefusalError } from "@/lib/llm";

// Паспорт организации: из него собираются образ, темы поиска залётов и рубрики контента.
export const Passport = z.object({
  name: z.string().describe("Название организации или продукта"),
  oneLiner: z.string().describe("Что это и для кого, одно предложение"),
  audience: z.array(z.string()).min(2).max(5).describe("Кто покупает: конкретные сегменты"),
  pains: z.array(z.string()).min(3).max(6).describe("Боли аудитории, которые закрывает продукт"),
  benefits: z.array(z.string()).min(3).max(6).describe("Что человек получает, словами клиента"),
  proof: z.array(z.string()).max(6).describe("Факты с сайта: цифры, кейсы, отзывы. Только то, что там реально написано"),
  tone: z.string().describe("Каким голосом говорить с аудиторией"),
  pillars: z
    .array(z.object({ title: z.string(), why: z.string().describe("Зачем эта рубрика продукту, одно предложение") }))
    .min(3)
    .max(6)
    .describe("Рубрики контента для Reels и TikTok"),
  searchQueries: z.array(z.string()).min(5).max(10).describe("Хэштеги ниши для поиска чужих залётов: без #, одно-два слова слитно, популярные, по-русски и по-английски"),
  taboo: z.array(z.string()).max(6).describe("Что нельзя обещать и говорить"),
});
export type Passport = z.infer<typeof Passport>;

// Что владелец рассказал об организации: ссылки, описание, о себе (можно надиктовать).
export type OrgInput = { name: string; links: string[]; about: string; me: string };

// Шаг 1: Claude сам открывает ссылки (и ищет в сети, если их мало) и пишет досье.
async function dossier(input: OrgInput) {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        `Изучи организацию «${input.name}».`,
        input.links.length > 0 && `Ссылки (сайт, соцсети, продукт):\n${input.links.map((l) => `- ${l}`).join("\n")}`,
        input.about && `Владелец пишет об организации:\n${input.about}`,
        input.me && `Владелец о себе (лицо и голос бренда):\n${input.me}`,
        "Открой ссылки и 2–4 самые важные внутренние страницы (о нас, продукт, цены, кейсы, отзывы). Если информации мало, найди в сети, что пишут об организации. Напиши досье по-русски: что это, для кого, какие боли закрывает, выгоды, цены, цифры и кейсы (только реальные, из ссылок, слов владельца или источников), кто лицо бренда, тон, конкуренты и ниша. Ничего не выдумывай: чего не нашёл, так и пиши.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
  let usd = 0;
  for (let i = 0; i < 4; i++) {
    const res = await llm().messages.create({
      model: MODEL_MAIN,
      max_tokens: 8000,
      output_config: { effort: "medium" },
      tools: [
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 5 },
        { type: "web_search_20260209", name: "web_search", max_uses: 3 },
      ],
      messages,
    });
    usd += costUsd(MODEL_MAIN, res.usage);
    if (res.stop_reason === "refusal") throw new RefusalError("Claude отказался разбирать эти ссылки");
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    if (!text) throw new Error("Не получилось прочитать ссылки");
    return { text, usd };
  }
  throw new Error("Ссылки читались слишком долго");
}

// Шаг 2: из досье собираем паспорт строго по схеме.
export async function buildPassport(input: OrgInput): Promise<{ passport: Passport; usd: number }> {
  const d = await dossier(input);
  const res = await llm().beta.messages.parse({
    model: MODEL_MAIN,
    max_tokens: 6000,
    output_config: { effort: "medium", format: betaZodOutputFormat(Passport) },
    system:
      "Ты контент-стратег. По досье организации собери паспорт для производства коротких вертикальных роликов (Reels, TikTok). Пиши по-русски, коротко и конкретно. В proof только факты из досье, без выдумок. Рубрики должны давать десятки роликов, а не один.",
    messages: [{ role: "user", content: `ОРГАНИЗАЦИЯ: ${input.name}\n\nДОСЬЕ:\n${d.text}` }],
  });
  const usd = d.usd + costUsd(MODEL_MAIN, res.usage);
  if (res.stop_reason === "refusal") throw new RefusalError("Claude отказался собирать паспорт");
  if (!res.parsed_output) throw new Error(`Паспорт не собрался: ${res.stop_reason}`);
  return { passport: res.parsed_output, usd };
}

// Паспорт превращается в образ проекта: из него пишутся сценарии и ищутся залёты.
export function passportToPersona(p: Passport) {
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  return {
    name: p.name,
    topics: [p.oneLiner, "Рубрики:", ...p.pillars.map((x) => `- ${x.title}: ${x.why}`)].join("\n"),
    facts: [p.oneLiner, "Аудитория:", list(p.audience), "Боли:", list(p.pains), "Выгоды:", list(p.benefits), p.proof.length > 0 && "Факты и кейсы:", list(p.proof)]
      .filter(Boolean)
      .join("\n"),
    voice: p.tone,
    taboo: list(p.taboo),
    search_queries: p.searchQueries.slice(0, 10),
  };
}
