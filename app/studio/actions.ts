"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { isDemo } from "@/lib/db";
import { requireUser } from "@/lib/auth/server";
import { overLimit } from "@/lib/plans";
import { currentWorkspace } from "@/lib/projects";
import { buildStoryboard, generateScripts, reviseScript } from "@/lib/studio/generate";
import { linkOf, publishVideo } from "@/lib/metricool";
import { getScript, updateScript } from "@/lib/studio/store";
import { styleBySlug } from "@/lib/studio/styles";
import type { ScriptDraft } from "@/lib/studio/schema";

type Result = { error?: string };

const msg = (e: unknown) => (e instanceof Error ? e.message.slice(0, 200) : "ошибка");

async function workspace() {
  if (isDemo()) throw new Error("В демо-режиме конвейер недоступен");
  return currentWorkspace(); // проверяет вход и доступ к проекту
}

function refresh(id?: string) {
  revalidatePath("/");
  if (id) revalidatePath(`/studio/${id}`);
}

// Тяжёлая работа Claude идёт в фоне после ответа: карточка помечена busy, страница обновляется сама.
function background(ws: string, id: string, job: () => Promise<void>) {
  after(() => job().catch((e) => updateScript(ws, id, { busy: false, error: msg(e) }).catch(console.error)));
}

export async function createScripts(wish: string, count = 10): Promise<Result> {
  const n = [5, 10, 30].includes(count) ? count : 10;
  try {
    const ws = await workspace();
    const limit = await overLimit(await requireUser(), "scripts", n);
    if (limit) return { error: limit };
    after(() => generateScripts(ws, n, wish.trim().slice(0, 400)).catch((e) => console.error("generateScripts", e)));
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
    const limit = await overLimit(await requireUser(), "videos");
    if (limit) return { error: limit };
    await updateScript(ws, id, { stage: "production", render_status: "queued", render_log: null, error: null, ...(style ? { style } : {}) });
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

// «Отклонить» убирает с доски, но сценарий можно вернуть. «Навсегда» ещё и учит генератор не предлагать похожее.
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

export async function rejectForever(id: string): Promise<Result> {
  try {
    const ws = await workspace();
    const s = await getScript(ws, id);
    if (!s) return { error: "Сценарий не найден" };
    await updateScript(ws, id, { stage: "rejected", busy: false, payload: { ...s.payload, forever: true } });
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function restoreScript(id: string): Promise<Result> {
  try {
    const ws = await workspace();
    await updateScript(ws, id, { stage: "script", busy: false, error: null });
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

// Ручная правка сценария: автор сам меняет текст, остальное (механика, стиль) остаётся.
export type ScriptEdit = Pick<ScriptDraft, "title" | "hook" | "vo" | "onScreen" | "caption" | "cta">;

export async function editScript(id: string, edit: ScriptEdit): Promise<Result> {
  if (!edit.title.trim() || !edit.hook.trim() || edit.vo.every((v) => !v.text.trim())) return { error: "Название, хук и озвучка не могут быть пустыми" };
  try {
    const ws = await workspace();
    const s = await getScript(ws, id);
    if (!s) return { error: "Сценарий не найден" };
    if (s.stage !== "script") return { error: "Править можно только сценарий до сториборда" };
    const payload = {
      ...s.payload,
      title: edit.title.trim().slice(0, 120),
      hook: edit.hook.trim().slice(0, 600),
      vo: edit.vo.filter((v) => v.text.trim()).map((v) => ({ t: v.t.trim(), text: v.text.trim() })).slice(0, 12),
      onScreen: edit.onScreen.map((x) => x.trim()).filter(Boolean).slice(0, 8),
      caption: edit.caption.trim().slice(0, 2200),
      cta: edit.cta.trim().slice(0, 300),
    };
    await updateScript(ws, id, { payload, title: payload.title, error: null });
    refresh(id);
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

// «Выпустить»: ролик уходит в выбранные соцсети организации через Metricool.
export async function releaseVideo(id: string, networks: string[]): Promise<Result> {
  if (networks.length === 0) return { error: "Выбери хотя бы одну площадку" };
  try {
    const ws = await workspace();
    const user = await requireUser();
    const link = linkOf(user);
    const blogId = link?.brands[ws];
    if (!link || !blogId) return { error: "Сначала подключи соцсети организации в настройках" };
    const s = await getScript(ws, id);
    if (!s?.videoUrl) return { error: "Ролик ещё не готов" };
    await publishVideo(link, blogId, { videoUrl: s.videoUrl, text: [s.payload.caption, s.payload.cta].filter(Boolean).join("\n\n"), networks });
    await updateScript(ws, id, { stage: "published", published_url: null, render_log: `Отправлено в ${networks.join(", ")} через Metricool` });
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
