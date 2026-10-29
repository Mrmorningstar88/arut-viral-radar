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

// Образ автора из Higgsfield (Soul ID обучается в портале, включается для организации ключом face:<ws> в source_cache).
// Ключ и Soul ID берём из app_metadata владельца образа. Образ выключен или не готов: ролик идёт как раньше.
async function faceKit(s, dir) {
  const { data } = await db.from("source_cache").select("payload").eq("key", `face:${s.workspace_id}`).maybeSingle();
  const face = data?.payload;
  if (!face?.on || !face.owner) return null;
  const { data: u } = await db.auth.admin.getUserById(face.owner);
  const hf = u?.user?.app_metadata?.higgsfield;
  if (!hf?.id || !hf.secret || hf.soul?.status !== "completed") return null;
  writeFileSync(join(dir, "hf.mjs"), HF_HELPER);
  return { id: hf.id, secret: hf.secret, soulId: hf.soul.id };
}

// Свой стиль автора, собранный в портале из его роликов (ключ mystyle:<ws>:<slug> в source_cache).
// Кладём в папку ролика STYLE.md стиля и кадры из роликов автора как эталон.
async function myStyleKit(s, dir) {
  if (!s.style?.startsWith("my-")) return null;
  const { data } = await db.from("source_cache").select("payload").eq("key", `mystyle:${s.workspace_id}:${s.style}`).maybeSingle();
  const my = data?.payload;
  if (my?.status !== "ready" || !my.styleMd) throw new Error("Свой стиль не найден или удалён: выбери стиль заново");
  const root = join(dir, "my-style");
  mkdirSync(join(root, "refs"), { recursive: true });
  writeFileSync(join(root, "STYLE.md"), my.styleMd);
  writeFileSync(join(root, "style.json"), JSON.stringify({ slug: my.slug, en: my.name, based_on: my.basedOn, borrows: my.borrows ?? [], size: "1080x1920", line: my.line, palette: my.palette }, null, 1));
  const refs = [];
  for (const [i, url] of (my.frames ?? []).entries()) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
    if (!res?.ok) continue;
    const file = `refs/${String(i + 1).padStart(2, "0")}.jpg`;
    writeFileSync(join(root, file), Buffer.from(await res.arrayBuffer()));
    refs.push(file);
  }
  return { name: my.name, basedOn: my.basedOn, borrows: my.borrows ?? [], refs: refs.length };
}

// Помощник Higgsfield в папке ролика. Ключ из окружения, в файлы не пишется. Потолок кадров и клипов на ролик
// держит сам помощник (счётчик в .hf-usage.json), чтобы агент не потратил баланс автора.
//   node hf.mjs frame "промпт кадра с автором" out.jpg      — кадр 9:16 с лицом автора (Soul 2 + Soul ID)
//   node hf.mjs clip in.jpg "промпт движения" out.mp4 [5|10] — оживить кадр в видео (Kling 2.5 Turbo Pro)
const HF_HELPER = `import { existsSync, readFileSync, writeFileSync } from "node:fs";
const API = "https://api.higgsfield.ai";
const { HF_KEY_ID: id, HF_KEY_SECRET: secret, HF_SOUL_ID: soul } = process.env;
const MAX = { frames: Number(process.env.HF_MAX_FRAMES || 16), clips: Number(process.env.HF_MAX_CLIPS || 8) };
const auth = { Authorization: \`Key \${id}:\${secret}\` };
const [cmd, ...args] = process.argv.slice(2);
const usage = existsSync(".hf-usage.json") ? JSON.parse(readFileSync(".hf-usage.json", "utf8")) : { frames: 0, clips: 0, seconds: 0 };
const fail = (m) => { console.error(m); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, body) {
  const res = await fetch(API + path, { method: body ? "POST" : "GET", headers: { ...auth, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  const text = await res.text();
  if (!res.ok) fail(\`Higgsfield \${res.status}: \${text.slice(0, 300)}\`);
  return JSON.parse(text);
}
async function run(path, body, minutes) {
  const r = await api(path, body);
  const until = Date.now() + minutes * 60000;
  for (;;) {
    await sleep(4000);
    const st = await api(\`/requests/\${r.request_id}/status\`);
    if (st.status === "completed") return st;
    if (["failed", "nsfw", "canceled"].includes(st.status)) fail(\`Higgsfield: \${st.status} \${st.error ?? ""}\`);
    if (Date.now() > until) fail("Higgsfield не успел за отведённое время");
  }
}
async function save(url, out) {
  const res = await fetch(url, { signal: AbortSignal.timeout(300000) });
  if (!res.ok) fail(\`Не скачался результат: \${res.status}\`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
}
async function upload(file) {
  const type = file.endsWith(".png") ? "image/png" : "image/jpeg";
  const slot = await api("/files/generate-upload-url", { content_type: type });
  const put = await fetch(slot.upload_url, { method: "PUT", headers: slot.upload_headers ?? { "Content-Type": type }, body: readFileSync(file), signal: AbortSignal.timeout(120000) });
  if (!put.ok) fail(\`Кадр не загрузился: \${put.status}\`);
  return slot.public_url;
}

if (!id || !secret || !soul) fail("Нет ключа Higgsfield или Soul ID");
if (cmd === "frame") {
  const [prompt, out] = args;
  if (!prompt || !out) fail('node hf.mjs frame "промпт" out.jpg');
  if (usage.frames >= MAX.frames) fail(\`Лимит кадров с автором на ролик: \${MAX.frames}\`);
  const st = await run("/higgsfield-ai/soul/v2/standard", { prompt, aspect_ratio: "9:16", resolution: "1080p", batch_size: 1, enhance_prompt: true, custom_reference_id: soul, custom_reference_strength: 1 }, 10);
  await save(st.images?.[0]?.url ?? fail("Higgsfield не вернул кадр"), out);
  usage.frames++;
} else if (cmd === "clip") {
  const [input, prompt, out, dur = "5"] = args;
  if (!input || !prompt || !out) fail('node hf.mjs clip in.jpg "промпт движения" out.mp4 [5|10]');
  if (usage.clips >= MAX.clips) fail(\`Лимит видеоклипов с автором на ролик: \${MAX.clips}\`);
  const duration = dur === "10" ? 10 : 5;
  const st = await run("/kling-video/v2.5-turbo/pro/image-to-video", { prompt, image_url: await upload(input), duration }, 20);
  await save(st.video?.url ?? fail("Higgsfield не вернул видео"), out);
  usage.clips++;
  usage.seconds += duration;
} else fail("Команды: frame, clip");
writeFileSync(".hf-usage.json", JSON.stringify(usage));
console.log("ok", args.at(cmd === "frame" ? 1 : 2), JSON.stringify(usage));
`;

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

// Голоса edge-tts и язык whisper для каждого языка сценария (список языков в lib/studio/lang.ts).
const SPEECH = {
  ru: { name: "русский", male: "ru-RU-DmitryNeural", female: "ru-RU-SvetlanaNeural", whisper: "ru" },
  en: { name: "английский", male: "en-US-AndrewNeural", female: "en-US-AvaNeural", whisper: "en" },
  es: { name: "испанский", male: "es-ES-AlvaroNeural", female: "es-ES-ElviraNeural", whisper: "es" },
};

function styleLine(s, my) {
  if (!my) return `Стиль: ${s.style} (styles/${s.style}/STYLE.md).`;
  const borrows = my.borrows.length ? ` Отдельные приёмы можно брать из: ${my.borrows.map((b) => `$LIB/styles/${b}/`).join(", ")}.` : "";
  return [
    `Стиль: свой стиль автора «${my.name}», собран из его роликов. Его STYLE.md лежит в папке проекта: my-style/STYLE.md, читай его вместо STYLE.md библиотеки (как в MY-STYLES.md, раздел «Using it»).`,
    `Технику и код бери у базы $LIB/styles/${my.basedOn}/ (STYLE.md, DEMO.md, demo/).${borrows}`,
    my.refs ? `Кадры из роликов автора: my-style/refs/ (${my.refs} шт.). Посмотри их до трактовки и держи ролик как можно ближе к ним по палитре, шрифтам и надписям, фактуре, свету, движению и темпу монтажа. Сюжеты, людей, логотипы и тексты с этих кадров не переноси.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function brief(s, kit, face, my) {
  const p = s.payload;
  const sb = s.storyboard;
  const lang = SPEECH[p.lang] ?? SPEECH.ru;
  const voice = kit?.voiceId
    ? `Язык ролика: ${lang.name}. Голос: голос автора «${kit.voiceName}» из ElevenLabs. Озвучку делай ТОЛЬКО через \`node tts.mjs "текст" путь.mp3\` из папки проекта (по реплике или по фразе), edge-tts не используй. Проверку речи faster-whisper делай с языком ${lang.whisper}. Субтитры вшиты, на языке ролика.`
    : `Язык ролика: ${lang.name}. Голос: edge-tts через \`core/tts/tts_zh.py --voice ${lang.male}\` (женский: ${lang.female}). Проверку речи faster-whisper делай с языком ${lang.whisper}. Субтитры вшиты, на языке ролика.`;
  const sound = kit?.files.length
    ? `Звук: у организации есть фирменный звук${kit.idea ? ` («${kit.idea}»)` : ""}, файлы в папке проекта: ${kit.files.join(", ")}. Тема идёт подложкой под голос (громкость около −18 дБ, приглушай под речью, можно обрезать и зациклить), эффекты ставь редко: на хук и финал, плюс 1–2 ключевые цифры, не на каждую смену кадра. Эффекты мягкие: громкость −24 дБ относительно голоса, фейд-ин и фейд-аут по 30 мс, срез верхов (ffmpeg lowpass=f=6000) и низов (highpass=f=80), никогда не громче голоса. Финальный микс прогони через ffmpeg loudnorm=I=-14:TP=-1.5:LRA=11 и проверь, что нет клиппинга. Другую музыку не сочиняй и трендовые треки не используй.`
    : "Своих материалов у автора нет: музыку и звук делай сам по TECHNIQUE.md. Трендовые треки из соцсетей не используй.";
  return [
    styleLine(s, my),
    "Формат: вертикальный 1080×1920, 30 fps (`--size 1080x1920`). Длина по озвучке, 15–45 секунд.",
    voice,
    sound,
    face
      ? `Автор в кадре: у тебя есть его образ из Higgsfield. Автор и есть герой ролика: в хуке, в ключевых сценах и в финале, а также везде, где по сториборду есть ведущий, рассказчик или человек, в кадре именно он. Такие кадры делай так: \`node hf.mjs frame "кинематографичный промпт на английском: кто (the man), где, что делает, свет, объектив, 9:16" shots/NN.jpg\`, затем оживи \`node hf.mjs clip shots/NN.jpg "движение камеры и героя на английском" shots/NN.mp4 5\` (10 только для длинных планов). Встрой эти клипы в монтаж стиля как живые планы, остальное делай средствами стиля. Лимит: до 16 кадров и до 8 клипов на ролик, команды выполняй по одной и не повторяй удачные. Если Higgsfield ответил ошибкой баланса или ключа, делай ролик без автора.`
      : "",
    "Сториборд автор уже одобрил, на ревью не останавливайся.",
    "Подача как у мини-фильма с безграничным бюджетом: смелые невероятные образы, глубина кадра, драматичный свет, движение камеры, сильные переходы. Не плоский мультик и не слайды с текстом: каждый кадр должен выглядеть дорого в рамках стиля.",
    "",
    `НАЗВАНИЕ: ${s.title}`,
    `ХУК (первые секунды): ${p.hook}`,
    "ОЗВУЧКА (дословно):",
    ...(sb?.vo ?? p.vo).map((v) => `${v.t}: ${v.text}`),
    p.onScreen?.length ? `НАДПИСИ НА ЭКРАНЕ: ${p.onScreen.join(" · ")}` : "",
    "",
    "СТОРИБОРД (одобрен автором):",
    ...(sb?.shots ?? []).map((sh) => `${sh.n}. ${sh.dur} с · ${sh.frame}${sh.camera ? ` · камера: ${sh.camera}` : ""}${sh.overlay ? ` · надпись: «${sh.overlay}»` : ""}`),
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

class Cancelled extends Error {}

async function render(s) {
  const dir = join(WORK, s.id);
  mkdirSync(dir, { recursive: true });
  const kit = await soundKit(s, dir).catch((e) => (console.error("sound kit", e.message), null));
  const face = await faceKit(s, dir).catch((e) => (console.error("face kit", e.message), null));
  const my = await myStyleKit(s, dir);
  const film = brief(s, kit, face, my);
  writeFileSync(join(dir, "BRIEF.md"), film);
  let cost = 0;
  let lastLog = 0;
  // Автор может отменить ролик из портала: тогда карточка уходит из production, и рендер останавливается.
  const abort = new AbortController();
  const watch = setInterval(async () => {
    const { data } = await db.from("scripts").select("stage, render_status").eq("id", s.id).maybeSingle();
    if (data && (data.stage !== "production" || data.render_status !== "rendering")) abort.abort();
  }, 15_000);
  try {
  for await (const m of query({
    prompt: PROMPT(dir, film),
    options: {
      cwd: dir,
      additionalDirectories: [LIB],
      model: RENDER_MODEL,
      abortController: abort,
      // Без интерактивных подтверждений: разрешены только перечисленные инструменты, остальное отклоняется.
      permissionMode: "dontAsk",
      allowedTools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
      maxBudgetUsd: Number(RENDER_BUDGET_USD),
      env: {
        ...process.env,
        LIB,
        ...(kit?.voiceId ? { ELEVENLABS_API_KEY: kit.key, ELEVENLABS_VOICE_ID: kit.voiceId } : {}),
        ...(face ? { HF_KEY_ID: face.id, HF_KEY_SECRET: face.secret, HF_SOUL_ID: face.soulId } : {}),
      },
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
  } catch (e) {
    if (abort.signal.aborted) throw new Cancelled();
    throw e;
  } finally {
    clearInterval(watch);
  }
  if (abort.signal.aborted) throw new Cancelled();

  const out = join(dir, "final.mp4");
  const file = existsSync(out) ? out : newestMp4(dir);
  if (!file) throw new Error("Видео не появилось в папке проекта");
  const key = `${s.workspace_id}/${s.id}-${Date.now()}.mp4`;
  const { error } = await db.storage.from("videos").upload(key, readFileSync(file), { contentType: "video/mp4", upsert: true });
  if (error) throw new Error(`Не загрузилось в хранилище: ${error.message}`);
  const url = db.storage.from("videos").getPublicUrl(key).data.publicUrl;
  const hf = higgsfieldUsage(dir);
  // Готовое видео ставим, только если ролик не отменили, пока шла загрузка.
  await db
    .from("scripts")
    .update({ stage: "ready", render_status: "done", render_log: `Готово, $${cost.toFixed(2)}${hf ? ` · с тобой: ${hf.frames} кадров, ${hf.clips} клипов` : ""}`, video_url: url, error: null, updated_at: new Date().toISOString() })
    .eq("id", s.id)
    .eq("stage", "production");
  await db.from("usage_costs").insert({ workspace_id: s.workspace_id, provider: "anthropic-render", units: 1, usd: cost });
}

function higgsfieldUsage(dir) {
  try {
    const u = JSON.parse(readFileSync(join(dir, ".hf-usage.json"), "utf8"));
    return u.frames || u.clips ? u : null;
  } catch {
    return null;
  }
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
// Воркер один: ролики, которые «рисовались» при перезапуске, никто уже не рисует. Возвращаем их в очередь.
await db
  .from("scripts")
  .update({ render_status: "queued", render_log: "Рендер перезапущен после обновления сервера" })
  .eq("stage", "production")
  .eq("render_status", "rendering")
  .then(({ error }) => error && console.error("requeue", error.message));
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
    if (e instanceof Cancelled) {
      console.log("cancelled", s.id);
      continue;
    }
    console.error("render failed", s.id, e);
    await update(s.id, { render_status: "failed", error: String(e.message ?? e).slice(0, 300) });
  }
}
