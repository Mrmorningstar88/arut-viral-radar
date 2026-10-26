// Рендер-воркер YOOMP. Крутится на отдельном сервере (Vercel не умеет часовые задачи с ffmpeg и Chrome).
// Берёт сценарии в стадии production с render_status = 'queued', запускает Claude Agent SDK
// поверх библиотеки lemo-opuscar, кладёт готовый mp4 в Supabase Storage и переводит карточку в ready.
// Агент работает в папке ролика и в библиотеке, инструменты заданы списком, бюджет на ролик ограничен.

import { createClient } from "@supabase/supabase-js";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY,
  RENDER_MODEL = "claude-opus-5-5",
  RENDER_BUDGET_USD = "25",
  LIB = "/opt/lemo-opuscar",
  WORK = "/work",
  POLL_SECONDS = "30",
} = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
if (!process.env.ANTHROPIC_API_KEY) throw new Error("Нужен ANTHROPIC_API_KEY");

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function update(id, patch) {
  const { error } = await db.from("scripts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) console.error("update", id, error.message);
}

// Берём одну задачу: перевод queued → rendering условным апдейтом, чтобы два воркера не взяли одно и то же.
async function claim() {
  const { data } = await db.from("scripts").select("id").eq("stage", "production").eq("render_status", "queued").order("updated_at").limit(1);
  const id = data?.[0]?.id;
  if (!id) return null;
  const { data: got } = await db
    .from("scripts")
    .update({ render_status: "rendering", render_log: "Начинаю", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("render_status", "queued")
    .select("*")
    .maybeSingle();
  return got;
}

// Голос и фирменный звук организации из ElevenLabs (настраиваются в портале, лежат в source_cache по ключу sound:<ws>).
// Ключ ElevenLabs берём из app_metadata владельца звука. Нет настроек или ключа: рендер идёт на edge-tts, как раньше.
async function soundKit(s, dir) {
  const { data } = await db.from("source_cache").select("payload").eq("key", `sound:${s.workspace_id}`).maybeSingle();
  const sound = data?.payload;
  if (!sound?.owner) return null;
  const { data: u } = await db.auth.admin.getUserById(sound.owner);
  const key = u?.user?.app_metadata?.elevenlabs?.key;
  if (!key) return null;
  const files = [];
  const clips = [sound.theme && { ...sound.theme, file: "theme.mp3" }, ...(sound.sfx ?? []).map((c, i) => ({ ...c, file: `sfx${i + 1}.mp3` }))].filter(Boolean);
  if (clips.length) mkdirSync(join(dir, "sound"), { recursive: true });
  for (const c of clips) {
    const res = await fetch(c.url, { signal: AbortSignal.timeout(60_000) }).catch(() => null);
    if (!res?.ok) continue;
    writeFileSync(join(dir, "sound", c.file), Buffer.from(await res.arrayBuffer()));
    files.push(`sound/${c.file} (${c.name})`);
  }
  if (sound.voiceId) writeFileSync(join(dir, "tts.mjs"), TTS_HELPER);
  return { key, voiceId: sound.voiceId, voiceName: sound.voiceName, idea: sound.idea, files };
}

// Помощник озвучки в папке ролика: node tts.mjs "текст" out.mp3. Ключ берётся из окружения, в файлы не пишется.
const TTS_HELPER = `import { writeFileSync } from "node:fs";
const [text, out] = process.argv.slice(2);
if (!text || !out) { console.error('node tts.mjs "текст" out.mp3'); process.exit(1); }
const res = await fetch(\`https://api.elevenlabs.io/v1/text-to-speech/\${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128\`, {
  method: "POST",
  headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2 } }),
  signal: AbortSignal.timeout(120000),
});
if (!res.ok) { console.error("ElevenLabs", res.status, await res.text()); process.exit(1); }
writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log("ok", out);
`;

function brief(s, kit) {
  const p = s.payload;
  const sb = s.storyboard;
  const voice = kit?.voiceId
    ? `Язык ролика: русский. Голос: голос автора «${kit.voiceName}» из ElevenLabs. Озвучку делай ТОЛЬКО через \`node tts.mjs "текст" путь.mp3\` из папки проекта (по реплике или по фразе), edge-tts не используй. Проверку речи faster-whisper делай с языком ru. Субтитры вшиты, по-русски.`
    : "Язык ролика: русский. Голос: edge-tts через `core/tts/tts_zh.py --voice ru-RU-DmitryNeural` (женский: ru-RU-SvetlanaNeural). Проверку речи faster-whisper делай с языком ru. Субтитры вшиты, по-русски.";
  const sound = kit?.files.length
    ? `Звук: у организации есть фирменный звук${kit.idea ? ` («${kit.idea}»)` : ""}, файлы в папке проекта: ${kit.files.join(", ")}. Тема идёт подложкой под голос (громкость около −18 дБ, приглушай под речью, можно обрезать и зациклить), эффекты ставь на хук, смены кадров, цифры и финал. Другую музыку не сочиняй и трендовые треки не используй.`
    : "Своих материалов у автора нет: музыку и звук делай сам по TECHNIQUE.md. Трендовые треки из соцсетей не используй.";
  return [
    `Стиль: ${s.style} (styles/${s.style}/STYLE.md).`,
    "Формат: вертикальный 1080×1920, 30 fps (`--size 1080x1920`). Длина по озвучке, 15–45 секунд.",
    voice,
    sound,
    "Сториборд автор уже одобрил, на ревью не останавливайся.",
    "",
    `НАЗВАНИЕ: ${s.title}`,
    `ХУК (первые секунды): ${p.hook}`,
    "ОЗВУЧКА (дословно):",
    ...(sb?.vo ?? p.vo).map((v) => `${v.t}: ${v.text}`),
    p.onScreen?.length ? `НАДПИСИ НА ЭКРАНЕ: ${p.onScreen.join(" · ")}` : "",
    "",
    "СТОРИБОРД (одобрен автором):",
    ...(sb?.shots ?? []).map((sh) => `${sh.n}. ${sh.dur} с · ${sh.frame}${sh.overlay ? ` · надпись: «${sh.overlay}»` : ""}`),
    sb?.music ? `МУЗЫКА И ТЕМП: ${sb.music}` : "",
    p.sound ? `ЗВУКОВЫЕ АКЦЕНТЫ ИЗ СЦЕНАРИЯ: ${p.sound}` : "",
  ]
    .filter((x) => x !== "")
    .join("\n");
}

const PROMPT = (dir, film) => `Ты продюсер и режиссёр. Сделай короткий вертикальный ролик по библиотеке lemo-opuscar.

Библиотека: ${LIB}. Прочитай ${LIB}/AGENTS.md и следуй ему, а также DIRECTOR.md, TECHNIQUE.md и STYLE.md выбранного стиля.
Папка проекта: ${dir}. Пиши только в неё; инструменты запускай из ${LIB} с абсолютным путём проекта. Файлы библиотеки не меняй.
Автор недоступен: вопросов не задавай, бриф ниже окончательный, пробелы заполняй разумными решениями сам.

${film}

Итоговое видео положи ровно по пути ${dir}/final.mp4 (H.264, AAC, 1080×1920). Последней строкой ответа напиши DONE.`;

async function render(s) {
  const dir = join(WORK, s.id);
  mkdirSync(dir, { recursive: true });
  const kit = await soundKit(s, dir).catch((e) => (console.error("sound kit", e.message), null));
  const film = brief(s, kit);
  writeFileSync(join(dir, "BRIEF.md"), film);
  let cost = 0;
  let lastLog = 0;
  for await (const m of query({
    prompt: PROMPT(dir, film),
    options: {
      cwd: dir,
      additionalDirectories: [LIB],
      model: RENDER_MODEL,
      // Без интерактивных подтверждений: разрешены только перечисленные инструменты, остальное отклоняется.
      permissionMode: "dontAsk",
      allowedTools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
      maxBudgetUsd: Number(RENDER_BUDGET_USD),
      env: { ...process.env, LIB, ...(kit?.voiceId ? { ELEVENLABS_API_KEY: kit.key, ELEVENLABS_VOICE_ID: kit.voiceId } : {}) },
    },
  })) {
    if (m.type === "assistant") {
      const text = m.message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(" ").trim();
      // Последняя реплика агента видна в карточке как ход работы; пишем не чаще раза в 20 секунд.
      if (text && Date.now() - lastLog > 20_000) {
        lastLog = Date.now();
        await update(s.id, { render_log: text.slice(0, 400) });
      }
    }
    if (m.type === "result") {
      cost = m.total_cost_usd ?? 0;
      if (m.subtype !== "success") throw new Error(`Агент остановился: ${m.subtype}`);
    }
  }

  const out = join(dir, "final.mp4");
  const file = existsSync(out) ? out : newestMp4(dir);
  if (!file) throw new Error("Видео не появилось в папке проекта");
  const key = `${s.workspace_id}/${s.id}-${Date.now()}.mp4`;
  const { error } = await db.storage.from("videos").upload(key, readFileSync(file), { contentType: "video/mp4", upsert: true });
  if (error) throw new Error(`Не загрузилось в хранилище: ${error.message}`);
  const url = db.storage.from("videos").getPublicUrl(key).data.publicUrl;
  await update(s.id, { stage: "ready", render_status: "done", render_log: `Готово, $${cost.toFixed(2)}`, video_url: url, error: null });
  await db.from("usage_costs").insert({ workspace_id: s.workspace_id, provider: "anthropic-render", units: 1, usd: cost });
}

function newestMp4(dir) {
  const all = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      if (f === "node_modules" || f.startsWith(".")) continue;
      const p = join(d, f);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (f.endsWith(".mp4")) all.push([st.mtimeMs, p]);
    }
  };
  walk(dir);
  return all.sort((a, b) => b[0] - a[0])[0]?.[1];
}

// Библиотека обновляется при старте, чтобы получать исправления стилей.
function syncLibrary() {
  try {
    if (existsSync(join(LIB, ".git"))) execFileSync("git", ["-C", LIB, "pull", "--ff-only"], { stdio: "inherit" });
  } catch (e) {
    console.error("git pull lemo-opuscar", e.message);
  }
}

syncLibrary();
console.log("YOOMP render worker: жду задачи");
for (;;) {
  const s = await claim().catch((e) => (console.error("claim", e.message), null));
  if (!s) {
    await sleep(Number(POLL_SECONDS) * 1000);
    continue;
  }
  console.log("render", s.id, s.title, s.style);
  try {
    await render(s);
    console.log("done", s.id);
  } catch (e) {
    console.error("render failed", s.id, e);
    await update(s.id, { render_status: "failed", error: String(e.message ?? e).slice(0, 300) });
  }
}
