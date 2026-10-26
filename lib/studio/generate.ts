import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { loadProfile, logCost, serviceDb } from "@/lib/engine/store";
import { costUsd, llm, MODEL_MAIN, RefusalError } from "@/lib/llm";
import { ScriptBatch, Storyboard } from "./schema";
import { OPUS_STYLES, styleBySlug } from "./styles";
import { foreverTitles, getScript, insertScripts, listScripts, topFormulas, updateScript } from "./store";

async function parse<T extends z.ZodType>(schema: T, system: string, user: string, effort: "medium" | "high" = "high") {
  const res = await llm().beta.messages.parse({
    model: MODEL_MAIN,
    max_tokens: 16000,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") throw new RefusalError("Claude отказался");
  if (!res.parsed_output) throw new Error(`Пустой ответ: ${res.stop_reason}`);
  return { out: res.parsed_output as z.infer<T>, usd: costUsd(MODEL_MAIN, res.usage) };
}

async function brief(ws: string) {
  const [profile, ws_, never] = await Promise.all([loadProfile(ws), serviceDb().from("workspaces").select("name, passport").eq("id", ws).maybeSingle(), foreverTitles(ws)]);
  const passport = (ws_.data as { passport: unknown } | null)?.passport;
  const p = profile.persona;
  return [
    `ОРГАНИЗАЦИЯ: ${p.name || (ws_.data as { name?: string } | null)?.name || "без названия"}`,
    passport ? `ПАСПОРТ ОРГАНИЗАЦИИ (JSON):\n${JSON.stringify(passport)}` : `ТЕМЫ:\n${p.topics}\n\nФАКТЫ:\n${p.facts}`,
    `ГОЛОС:\n${p.voice || "(не задан)"}`,
    p.taboo && `ТАБУ:\n${p.taboo}`,
    profile.taste && `ВКУС (что автор берёт и отвергает):\n${profile.taste}`,
    profile.rules.length > 0 && `ОДОБРЕННЫЕ ПРАВИЛА:\n- ${profile.rules.join("\n- ")}`,
    never.length > 0 && `АВТОР УБРАЛ НАВСЕГДА (не предлагай ничего похожего по теме и подаче):\n- ${never.join("\n- ")}`,
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
  "- Звук такая же часть механики, как хук: темп трека, удар или whoosh на хуке и сменах кадра, тишина перед панчлайном.",
].join("\n");

// Пачка сценариев: каждый переносит механику реального залёта на организацию.
// Больше 10 за раз пишутся параллельными пачками, каждая на своём наборе залётов, чтобы темы не повторялись.
const CHUNK = 10;

export async function generateScripts(ws: string, count = 10, wish = "") {
  const chunks = Math.max(1, Math.ceil(count / CHUNK));
  const [b, formulas, existing] = await Promise.all([brief(ws), topFormulas(ws, chunks * CHUNK), listScripts(ws)]);
  const results = await Promise.allSettled(
    Array.from({ length: chunks }, (_, i) => {
      const n = Math.min(CHUNK, count - i * CHUNK);
      const own = formulas.filter((_, j) => j % chunks === i);
      return scriptChunk(ws, b, own.length > 0 ? own : formulas, existing.map((s) => s.title), wish, n, chunks > 1 ? `Это пачка ${i + 1} из ${chunks}: бери другие рубрики, чем соседние пачки (начни с рубрики №${i + 1}).` : "");
    }),
  );
  const made = results.reduce((sum, r) => sum + (r.status === "fulfilled" ? r.value : 0), 0);
  if (made === 0) throw (results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason;
  return made;
}

async function scriptChunk(ws: string, b: string, formulas: { id: string; line: string }[], titles: string[], wish: string, count: number, note: string) {
  const user = [
    b,
    formulas.length > 0
      ? `ЗАЛЁТЫ В НИШЕ (механики для переноса):\n${formulas.map((f, i) => `${i + 1}. ${f.line}`).join("\n\n")}`
      : "Залётов в нише пока нет: опирайся на проверенные форматы коротких роликов (хук-вопрос, миф и разоблачение, до/после, список, история клиента).",
    titles.length > 0 && `УЖЕ ЕСТЬ (не повторяй темы):\n- ${titles.slice(0, 60).join("\n- ")}`,
    wish && `ПОЖЕЛАНИЕ АВТОРА: ${wish}`,
    `СТИЛИ РОЛИКОВ (видео рисуется кодом в одном из них, без съёмки и без живых людей в кадре):\n${STYLE_CATALOG}`,
    `Придумай ${count} разных анимационных сценариев Reels/TikTok. Каждый берёт механику одного залёта (sourceReel = его номер): хук, структуру, ритм и звук, и переносит её на рубрики организации. Разные рубрики и разные механики. Под каждый выбери стиль, в котором механика и тема сыграют сильнее всего; хук должен работать в анимации, без говорящей головы.`,
    note,
  ]
    .filter(Boolean)
    .join("\n\n");
  const { out, usd } = await parse(ScriptBatch, `Ты главный сценарист контент-завода. Делаешь короткие вертикальные ролики, которые набирают просмотры за счёт проверенных механик.\n${RULES}`, user, "medium");
  const drafts = out.scripts.slice(0, count);
  await insertScripts(ws, drafts.map((draft) => ({ draft, sourceReelId: formulas[draft.sourceReel - 1]?.id ?? null })));
  await logCost(ws, null, "anthropic", usd);
  return drafts.length;
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
    "Разложи сценарий на 4–8 кадров вертикального ролика в этом стиле. Для каждого кадра опиши, что нарисовано и как движется, и надпись на экране. Сумма dur равна длине озвучки. Озвучку перенеси, подправив только тайм-коды. В music опиши музыку, темп монтажа и звуковые акценты по кадрам, опираясь на звук из сценария.",
  ]
    .filter(Boolean)
    .join("\n\n");
  const { out, usd } = await parse(Storyboard, `Ты режиссёр коротких вертикальных роликов.\n${RULES}`, user);
  await updateScript(ws, id, { storyboard: out, style: s.style ?? s.payload.style, stage: "storyboard", busy: false, error: null, feedback: feedback || null });
  await logCost(ws, null, "anthropic", usd);
}
