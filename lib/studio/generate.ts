import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { loadProfile, logCost, serviceDb } from "@/lib/engine/store";
import { costUsd, llm, MODEL_MAIN, RefusalError } from "@/lib/llm";
import { ScriptBatch, Storyboard } from "./schema";
import { OPUS_STYLES, styleBySlug } from "./styles";
import { getScript, insertScripts, listScripts, topFormulas, updateScript } from "./store";

async function parse<T extends z.ZodType>(schema: T, system: string, user: string) {
  const res = await llm().beta.messages.parse({
    model: MODEL_MAIN,
    max_tokens: 16000,
    output_config: { effort: "high", format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") throw new RefusalError("Claude отказался");
  if (!res.parsed_output) throw new Error(`Пустой ответ: ${res.stop_reason}`);
  return { out: res.parsed_output as z.infer<T>, usd: costUsd(MODEL_MAIN, res.usage) };
}

async function brief(ws: string) {
  const [profile, ws_] = await Promise.all([loadProfile(ws), serviceDb().from("workspaces").select("name, passport").eq("id", ws).maybeSingle()]);
  const passport = (ws_.data as { passport: unknown } | null)?.passport;
  const p = profile.persona;
  return [
    `ПРОЕКТ: ${p.name || (ws_.data as { name?: string } | null)?.name || "без названия"}`,
    passport ? `ПАСПОРТ ПРОДУКТА (JSON):\n${JSON.stringify(passport)}` : `ТЕМЫ:\n${p.topics}\n\nФАКТЫ:\n${p.facts}`,
    `ГОЛОС:\n${p.voice || "(не задан)"}`,
    p.taboo && `ТАБУ:\n${p.taboo}`,
    profile.taste && `ВКУС (что автор берёт и отвергает):\n${profile.taste}`,
    profile.rules.length > 0 && `ОДОБРЕННЫЕ ПРАВИЛА:\n- ${profile.rules.join("\n- ")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Каталог стилей для выбора: ролик рисуется кодом в одном из стилей lemo-opuscar.
const STYLE_CATALOG = OPUS_STYLES.map((s) => `${s.slug}: ${s.name} (${s.category}) · ${s.uses.join(", ")}`).join("\n");

const RULES = [
  "- Пиши по-русски, живо, на «ты» к зрителю, без кальки с английского.",
  "- Не выдумывай цифры, кейсы и факты: бери только из паспорта или фактов. Нет данных, пиши «[реальный факт]».",
  "- Без обещаний дохода и гарантий. Без чужих брендов и реальных публичных лиц.",
  "- Озвучка 15–40 секунд, тайм-коды вида «0-3», «3-8».",
].join("\n");

// Пачка сценариев: каждый переносит механику реального залёта на продукт или темы автора.
export async function generateScripts(ws: string, count = 5, wish = "") {
  const [b, formulas, existing] = await Promise.all([brief(ws), topFormulas(ws), listScripts(ws)]);
  const user = [
    b,
    formulas.length > 0
      ? `ЗАЛЁТЫ В НИШЕ (механики для переноса):\n${formulas.map((f, i) => `${i + 1}. ${f.line}`).join("\n\n")}`
      : "Залётов в нише пока нет: опирайся на проверенные форматы коротких роликов (хук-вопрос, миф и разоблачение, до/после, список, история клиента).",
    existing.length > 0 && `УЖЕ ЕСТЬ (не повторяй темы):\n- ${existing.slice(0, 30).map((s) => s.title).join("\n- ")}`,
    wish && `ПОЖЕЛАНИЕ АВТОРА: ${wish}`,
    `СТИЛИ РОЛИКОВ (видео рисуется кодом в одном из них, без съёмки и без живых людей в кадре):\n${STYLE_CATALOG}`,
    `Придумай ${count} разных сценариев Reels/TikTok. Каждый берёт механику одного залёта (sourceReel = его номер) и переносит её на рубрики проекта. Разные рубрики и разные механики. Под каждый выбери стиль, в котором механика и тема сыграют сильнее всего; хук должен работать в анимации, без говорящей головы.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const { out, usd } = await parse(ScriptBatch, `Ты главный сценарист контент-завода. Делаешь короткие вертикальные ролики, которые набирают просмотры за счёт проверенных механик.\n${RULES}`, user);
  await insertScripts(
    ws,
    out.scripts.slice(0, count).map((draft) => ({ draft, sourceReelId: formulas[draft.sourceReel - 1]?.id ?? null })),
  );
  await logCost(ws, null, "anthropic", usd);
  return out.scripts.length;
}

// Переписать сценарий по замечанию автора.
export async function reviseScript(ws: string, id: string, feedback: string) {
  const s = await getScript(ws, id);
  if (!s) throw new Error("Сценарий не найден");
  const user = [await brief(ws), `ТЕКУЩИЙ СЦЕНАРИЙ (JSON):\n${JSON.stringify(s.payload)}`, `ЗАМЕЧАНИЕ АВТОРА: ${feedback}`, "Перепиши сценарий с учётом замечания. Верни ровно один сценарий, sourceReel оставь прежним."].join("\n\n");
  const { out, usd } = await parse(ScriptBatch, `Ты главный сценарист контент-завода.\n${RULES}`, user);
  const draft = { ...out.scripts[0], sourceReel: s.payload.sourceReel };
  await updateScript(ws, id, { payload: draft, title: draft.title, pillar: draft.pillar, busy: false, error: null, feedback });
  await logCost(ws, null, "anthropic", usd);
}

const styleLine = (slug: string) => {
  const st = styleBySlug(slug);
  return st ? `${st.name} (${st.category}): ${st.line}` : slug;
};

// Сториборд по одобренному сценарию: кадры, надписи, промпты для генерации и 3D-превью.
export async function buildStoryboard(ws: string, id: string, feedback = "") {
  const s = await getScript(ws, id);
  if (!s) throw new Error("Сценарий не найден");
  const user = [
    await brief(ws),
    `СЦЕНАРИЙ (JSON):\n${JSON.stringify(s.payload)}`,
    s.storyboard && feedback && `ПРОШЛЫЙ СТОРИБОРД (JSON):\n${JSON.stringify(s.storyboard)}`,
    feedback && `ЗАМЕЧАНИЕ АВТОРА: ${feedback}`,
    `СТИЛЬ: ${styleLine(s.style ?? s.payload.style)}`,
    "Разложи сценарий на 4–8 кадров вертикального ролика в этом стиле. Для каждого кадра опиши, что нарисовано и как движется, и надпись на экране. Сумма dur равна длине озвучки. Озвучку перенеси, подправив только тайм-коды. В music опиши музыку и темп монтажа.",
  ]
    .filter(Boolean)
    .join("\n\n");
  const { out, usd } = await parse(Storyboard, `Ты режиссёр коротких вертикальных роликов.\n${RULES}`, user);
  await updateScript(ws, id, { storyboard: out, style: s.style ?? s.payload.style, stage: "storyboard", busy: false, error: null, feedback: feedback || null });
  await logCost(ws, null, "anthropic", usd);
}
