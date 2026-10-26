import "server-only";
import type { User } from "@supabase/supabase-js";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { loadProfile, logCost, serviceDb } from "@/lib/engine/store";
import { costUsd, llm, MODEL_FAST } from "@/lib/llm";

// Голос и фирменный звук через ElevenLabs. Ключ аккаунта лежит в app_metadata пользователя (пишет только сервер),
// голос и звук выбираются для каждой организации и лежат в общем кэше по ключу sound:<ws>:
// оттуда их читает рендер-воркер, новых таблиц не нужно.
// Документация: elevenlabs.io/docs/api-reference

const API = "https://api.elevenlabs.io";
const TIMEOUT_MS = 20_000;
const KEY = (ws: string) => `sound:${ws}`;
const FOREVER = "2100-01-01T00:00:00Z";

export type Voice = { id: string; name: string; preview: string | null; own: boolean };
export type Clip = { name: string; url: string };
export type Sound = {
  owner: string; // чей ключ ElevenLabs использует рендер
  voiceId?: string;
  voiceName?: string;
  status?: "making" | "ready" | "failed";
  error?: string;
  idea?: string; // как звучит организация, в двух словах
  theme?: Clip;
  sfx?: Clip[];
};

export const keyOf = (user: User): string | null => (user.app_metadata?.elevenlabs as { key?: string } | undefined)?.key ?? null;

async function call(key: string, path: string, init: RequestInit = {}, timeout = TIMEOUT_MS) {
  const res = await fetch(API + path, {
    ...init,
    headers: { "xi-api-key": key, ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(timeout),
  }).catch((e: Error) => {
    throw new Error(e.name === "TimeoutError" ? "ElevenLabs долго не отвечает, попробуй ещё раз" : "Не получилось связаться с ElevenLabs");
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 401 ? "ElevenLabs не принял ключ: проверь, что скопировал его целиком" : `ElevenLabs ответил ${res.status}: ${text.slice(0, 160)}`);
  }
  return res;
}

// Голоса аккаунта: свои (клоны) первыми.
export async function listVoices(key: string): Promise<Voice[]> {
  const data = (await (await call(key, "/v1/voices")).json()) as { voices: { voice_id: string; name: string; preview_url?: string; category?: string }[] };
  return data.voices
    .map((v) => ({ id: v.voice_id, name: v.name, preview: v.preview_url ?? null, own: v.category === "cloned" || v.category === "professional" || v.category === "generated" }))
    .sort((a, b) => Number(b.own) - Number(a.own) || a.name.localeCompare(b.name));
}

export async function saveKey(user: User, key: string | null) {
  const meta: Record<string, unknown> = { ...user.app_metadata };
  if (key) meta.elevenlabs = { key };
  else delete meta.elevenlabs;
  const { error } = await serviceDb().auth.admin.updateUserById(user.id, { app_metadata: meta });
  if (error) throw new Error("Не получилось сохранить ключ");
}

export async function soundOf(ws: string): Promise<Sound | null> {
  const { data } = await serviceDb().from("source_cache").select("payload").eq("key", KEY(ws)).maybeSingle();
  return (data?.payload as Sound | undefined) ?? null;
}

export async function saveSound(ws: string, sound: Sound) {
  const { error } = await serviceDb().from("source_cache").upsert({ key: KEY(ws), payload: sound, expires_at: FOREVER });
  if (error) throw new Error(error.message);
}

// Замысел звука: Haiku читает паспорт организации и пишет промпты для музыки и эффектов.
const Plan = z.object({
  idea: z.string().describe("Как звучит организация, одна фраза по-русски, без технических слов"),
  theme: z.string().describe("Промпт на английском для инструментальной фирменной темы 30 секунд: жанр, инструменты, темп BPM, настроение. Без вокала, без имён артистов"),
  sfx: z
    .array(z.object({ name: z.string().describe("Назначение по-русски: «Хук», «Смена кадра», «Цифра», «Финал»"), prompt: z.string().describe("Промпт на английском для короткого звукового эффекта") }))
    .length(4),
});

async function planSound(ws: string) {
  const { persona, isProduct } = await loadProfile(ws);
  const res = await llm().beta.messages.parse({
    model: MODEL_FAST,
    max_tokens: 1024,
    output_config: { effort: "low", format: betaZodOutputFormat(Plan) },
    system:
      "Ты звукорежиссёр коротких вертикальных роликов. Придумай фирменный звук организации: узнаваемую с первой секунды тему и набор из 4 эффектов, которые звучат как одно семейство. Никаких трендовых треков из соцсетей: звук свой и особенный. Образовательный проект звучит глубже и спокойнее, информационный и новостной резче и плотнее.",
    messages: [
      {
        role: "user",
        content: `Организация: ${persona.name || "без названия"}${isProduct ? " (продукт)" : ""}\nТемы: ${persona.topics}\nГолос и тон: ${persona.voice}\nФакты: ${persona.facts.slice(0, 1200)}`,
      },
    ],
  });
  await logCost(ws, null, "anthropic", costUsd(MODEL_FAST, res.usage));
  if (!res.parsed_output) throw new Error("Не получилось придумать звук");
  return res.parsed_output;
}

async function store(ws: string, name: string, audio: ArrayBuffer): Promise<string> {
  const path = `${ws}/sound/${name}-${Date.now()}.mp3`;
  const d = serviceDb();
  const { error } = await d.storage.from("videos").upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (error) throw new Error(`Не сохранился звук: ${error.message}`);
  return d.storage.from("videos").getPublicUrl(path).data.publicUrl;
}

// Делает фирменный звук: замысел, тема 30 секунд и 4 эффекта. Идёт в фоне, статус пишется в sound:<ws>.
export async function makeSound(ws: string, key: string) {
  const base = (await soundOf(ws)) ?? { owner: "" };
  try {
    const plan = await planSound(ws);
    const music = await call(key, "/v1/music", { method: "POST", body: JSON.stringify({ prompt: plan.theme, music_length_ms: 30_000, force_instrumental: true }) }, 180_000);
    const theme: Clip = { name: "Тема", url: await store(ws, "theme", await music.arrayBuffer()) };
    const sfx: Clip[] = [];
    for (const [i, s] of plan.sfx.entries()) {
      const res = await call(key, "/v1/sound-generation", { method: "POST", body: JSON.stringify({ text: s.prompt, duration_seconds: 1.5, prompt_influence: 0.6 }) }, 60_000);
      sfx.push({ name: s.name, url: await store(ws, `sfx${i + 1}`, await res.arrayBuffer()) });
    }
    await saveSound(ws, { ...base, status: "ready", error: undefined, idea: plan.idea, theme, sfx });
  } catch (e) {
    await saveSound(ws, { ...base, status: "failed", error: e instanceof Error ? e.message : "Не получилось" });
  }
}
