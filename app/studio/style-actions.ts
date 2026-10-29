"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { isDemo } from "@/lib/db";
import { serviceDb } from "@/lib/engine/store";
import { currentWorkspace } from "@/lib/projects";
import { analyzeMyStyle, createMyStyle, deleteMyStyle, framePrefix, listMyStyles, MAX_FRAMES } from "@/lib/studio/my-styles";
import type { MyStyleCard } from "@/lib/studio/styles";

type Result = { error?: string };
const msg = (e: unknown) => (e instanceof Error ? e.message.slice(0, 200) : "ошибка");
const MAX_FRAME_BYTES = 900_000;

async function workspace() {
  if (isDemo()) throw new Error("В демо-режиме свои стили недоступны");
  return currentWorkspace(); // проверяет вход и доступ к организации
}

export async function myStyles(): Promise<{ items?: MyStyleCard[] } & Result> {
  try {
    return { items: await listMyStyles(await workspace()) };
  } catch (e) {
    return { error: msg(e) };
  }
}

// Один кадр из ролика автора: браузер уже уменьшил его до 720 px. Кадр кладётся в папку черновика стиля.
export async function uploadStyleFrame(fd: FormData): Promise<Result & { url?: string }> {
  const draft = String(fd.get("draft") ?? "");
  const n = Number(fd.get("n"));
  const frame = fd.get("frame");
  if (!z.uuid().safeParse(draft).success || !Number.isInteger(n) || n < 0 || n >= MAX_FRAMES) return { error: "Кадр не прочитался" };
  if (!(frame instanceof File) || frame.type !== "image/jpeg" || frame.size === 0 || frame.size > MAX_FRAME_BYTES) return { error: "Кадр не прочитался" };
  try {
    const ws = await workspace();
    const d = serviceDb();
    const path = `${framePrefix(ws, draft)}${String(n).padStart(2, "0")}.jpg`;
    const { error } = await d.storage.from("covers").upload(path, await frame.arrayBuffer(), { contentType: "image/jpeg", upsert: true });
    if (error) return { error: `Кадр не загрузился: ${error.message}` };
    return { url: d.storage.from("covers").getPublicUrl(path).data.publicUrl };
  } catch (e) {
    return { error: msg(e) };
  }
}

const Input = z.object({
  draft: z.uuid(),
  name: z.string().max(60),
  wish: z.string().max(600),
  clips: z
    .array(
      z.object({
        duration: z.number().min(0).max(3600),
        cuts: z.number().int().min(0).max(2000),
        frames: z.array(z.object({ url: z.url(), t: z.number().min(0).max(3600) })).min(1).max(12),
      }),
    )
    .min(1)
    .max(5),
});

// Кадры загружены: создаём карточку стиля и разбираем ролики в фоне. Страница опрашивает статус сама.
export async function createStyleFromReels(input: z.input<typeof Input>): Promise<Result & { slug?: string }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "Не получилось прочитать ролики, попробуй ещё раз" };
  const { draft, name, wish, clips } = parsed.data;
  try {
    const ws = await workspace();
    // Кадры принимаем только из папки этого черновика в этой организации.
    const base = serviceDb().storage.from("covers").getPublicUrl(framePrefix(ws, draft)).data.publicUrl;
    if (!clips.every((c) => c.frames.every((f) => f.url.startsWith(base)))) return { error: "Кадры не из этой загрузки" };
    if (clips.reduce((n, c) => n + c.frames.length, 0) > MAX_FRAMES) return { error: `Не больше ${MAX_FRAMES} кадров` };
    const s = await createMyStyle(ws, draft, { name: name.trim(), wish: wish.trim(), clips });
    after(() => analyzeMyStyle(ws, s.slug).catch((e) => console.error("analyzeMyStyle", e)));
    return { slug: s.slug };
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function removeMyStyle(slug: string): Promise<Result> {
  if (typeof slug !== "string" || !/^my-[a-z0-9]{1,16}$/.test(slug)) return { error: "Стиль не найден" };
  try {
    await deleteMyStyle(await workspace(), slug);
    revalidatePath("/studio/[id]", "page");
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}
