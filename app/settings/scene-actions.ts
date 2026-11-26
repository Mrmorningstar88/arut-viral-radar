"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { isDemo } from "@/lib/db";
import { serviceDb } from "@/lib/engine/store";
import { currentWorkspace } from "@/lib/projects";
import { analyzeScene, createScene, deleteScene, MAX_SCENE_PHOTOS, scenePrefix, setSceneOn } from "@/lib/scene";

type Result = { error?: string };
const msg = (e: unknown) => (e instanceof Error ? e.message.slice(0, 200) : "ошибка");
const MAX_PHOTO_BYTES = 1_500_000;

async function workspace() {
  if (isDemo()) throw new Error("В демо-режиме студия недоступна");
  return currentWorkspace(); // проверяет вход и доступ к организации
}

// Одно фото студии: браузер уже уменьшил его до 1600 px. Фото кладётся в папку черновика студии.
export async function uploadScenePhoto(fd: FormData): Promise<Result & { url?: string }> {
  const draft = String(fd.get("draft") ?? "");
  const n = Number(fd.get("n"));
  const photo = fd.get("photo");
  if (!z.uuid().safeParse(draft).success || !Number.isInteger(n) || n < 0 || n >= MAX_SCENE_PHOTOS) return { error: "Фото не прочиталось" };
  if (!(photo instanceof File) || photo.type !== "image/jpeg" || photo.size === 0 || photo.size > MAX_PHOTO_BYTES) return { error: "Фото не прочиталось" };
  try {
    const ws = await workspace();
    const d = serviceDb();
    const path = `${scenePrefix(ws, draft)}${String(n).padStart(2, "0")}.jpg`;
    const { error } = await d.storage.from("covers").upload(path, await photo.arrayBuffer(), { contentType: "image/jpeg", upsert: true });
    if (error) return { error: `Фото не загрузилось: ${error.message}` };
    return { url: d.storage.from("covers").getPublicUrl(path).data.publicUrl };
  } catch (e) {
    return { error: msg(e) };
  }
}

const Input = z.object({ draft: z.uuid(), photos: z.array(z.url()).min(1).max(MAX_SCENE_PHOTOS) });

// Фото загружены: сохраняем студию и разбираем её в фоне. Карточка опрашивает статус сама.
export async function saveScene(input: z.input<typeof Input>): Promise<Result> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "Не получилось прочитать фото, попробуй ещё раз" };
  const { draft, photos } = parsed.data;
  try {
    const ws = await workspace();
    // Фото принимаем только из папки этого черновика в этой организации.
    const base = serviceDb().storage.from("covers").getPublicUrl(scenePrefix(ws, draft)).data.publicUrl;
    if (!photos.every((u) => u.startsWith(base))) return { error: "Фото не из этой загрузки" };
    await createScene(ws, draft, photos);
    after(() => analyzeScene(ws).catch((e) => console.error("analyzeScene", e)));
    revalidatePath("/settings");
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function toggleScene(on: boolean): Promise<Result> {
  if (typeof on !== "boolean") return { error: "Не понял, включить или выключить" };
  try {
    await setSceneOn(await workspace(), on);
    revalidatePath("/settings");
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function removeScene(): Promise<Result> {
  try {
    await deleteScene(await workspace());
    revalidatePath("/settings");
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}
