"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getRepo, isDemo } from "@/lib/db";
import { currentWorkspace } from "@/lib/projects";
import { buildStoryboard, generateScripts, reviseScript } from "@/lib/studio/generate";
import { updateScript } from "@/lib/studio/store";
import { styleBySlug } from "@/lib/studio/styles";

type Result = { error?: string };

const msg = (e: unknown) => (e instanceof Error ? e.message.slice(0, 200) : "ошибка");

async function workspace() {
  if (isDemo()) throw new Error("В демо-режиме конвейер недоступен");
  await getRepo(); // проверяет вход владельца
  return currentWorkspace();
}

function refresh(id?: string) {
  revalidatePath("/");
  if (id) revalidatePath(`/studio/${id}`);
}

// Тяжёлая работа Claude идёт в фоне после ответа: карточка помечена busy, страница обновляется сама.
function background(ws: string, id: string, job: () => Promise<void>) {
  after(() => job().catch((e) => updateScript(ws, id, { busy: false, error: msg(e) }).catch(console.error)));
}

export async function createScripts(wish: string): Promise<Result> {
  try {
    const ws = await workspace();
    after(() => generateScripts(ws, 5, wish.trim().slice(0, 400)).catch((e) => console.error("generateScripts", e)));
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function approveScript(id: string): Promise<Result> {
  try {
    const ws = await workspace();
    await updateScript(ws, id, { busy: true, error: null });
    background(ws, id, () => buildStoryboard(ws, id));
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function redoScript(id: string, feedback: string): Promise<Result> {
  if (!feedback.trim()) return { error: "Напиши, что поменять" };
  try {
    const ws = await workspace();
    await updateScript(ws, id, { busy: true, error: null });
    background(ws, id, () => reviseScript(ws, id, feedback.trim().slice(0, 600)));
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function redoStoryboard(id: string, feedback: string): Promise<Result> {
  if (!feedback.trim()) return { error: "Напиши, что поменять" };
  try {
    const ws = await workspace();
    await updateScript(ws, id, { busy: true, error: null });
    background(ws, id, () => buildStoryboard(ws, id, feedback.trim().slice(0, 600)));
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

// Одобренный сториборд встаёт в очередь рендера lemo-opuscar в выбранном стиле.
export async function approveStoryboard(id: string, style?: string): Promise<Result> {
  if (style && !styleBySlug(style)) return { error: "Неизвестный стиль" };
  try {
    const ws = await workspace();
    await updateScript(ws, id, { stage: "production", render_status: "queued", render_log: null, error: null, ...(style ? { style } : {}) });
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function rejectScript(id: string): Promise<Result> {
  try {
    const ws = await workspace();
    await updateScript(ws, id, { stage: "rejected", busy: false });
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function setStyle(id: string, style: string): Promise<Result> {
  if (!styleBySlug(style)) return { error: "Неизвестный стиль" };
  try {
    const ws = await workspace();
    await updateScript(ws, id, { style });
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function retryRender(id: string): Promise<Result> {
  try {
    const ws = await workspace();
    await updateScript(ws, id, { render_status: "queued", render_log: null, error: null });
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function markPublished(id: string, url: string): Promise<Result> {
  if (!/^https:\/\//.test(url.trim())) return { error: "Нужна ссылка на пост, начиная с https://" };
  try {
    const ws = await workspace();
    await updateScript(ws, id, { stage: "published", published_url: url.trim() });
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}
