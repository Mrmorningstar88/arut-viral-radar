import Anthropic from "@anthropic-ai/sdk";
import { costUsd, llm, MODEL_MAIN } from "@/lib/llm";

// Свежие цифры для сценария: веб-поиск Claude, каждая цифра с источником.
export async function researchFigures(topic: string): Promise<{ text: string; usd: number }> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Тема ролика:\n${topic}\n\nНайди 0–4 свежие проверяемые цифры (ставки, инфляция, цены, курсы), которые могут понадобиться в сценарии на эту тему. Формат строго: «цифра — что это — дата — URL источника», по одной на строку. Если релевантных цифр нет, верни пустой ответ.`,
    },
  ];
  let usd = 0;
  for (let i = 0; i < 3; i++) {
    const res = await llm().messages.create({
      model: MODEL_MAIN,
      max_tokens: 4000,
      output_config: { effort: "low" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
      messages,
    });
    usd += costUsd(MODEL_MAIN, res.usage);
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    return { text, usd };
  }
  return { text: "", usd };
}
