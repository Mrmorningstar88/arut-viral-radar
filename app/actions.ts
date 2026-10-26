"use server";

import { parseRunOptions } from "@/lib/engine/run-options";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { processPendingNow, searchNow } from "@/lib/engine/direct";
import { errorRu } from "@/lib/engine/pipeline";
import { startRun } from "@/lib/engine/store";
import { loadProfile, logCost } from "@/lib/engine/store";
import { reviseReelAnalysis, type AdaptationEdits } from "@/lib/generate";
import { MODEL_MAIN } from "@/lib/llm";
import { learn } from "@/lib/learning";
import { getRepo, isDemo } from "@/lib/db";
import { requireUser } from "@/lib/auth/server";
import { overLimit, planOf } from "@/lib/plans";
import { generateScripts } from "@/lib/studio/generate";
import { buildPassport } from "@/lib/generate/passport";
import { createProject as insertProject, currentWorkspace, selectProject } from "@/lib/projects";
import { REEL_STATUSES, REJECT_REASONS, type RejectReason, type ReelStatus, type StatusChange } from "@/lib/db/types";

// Радар (поиск и разбор залётов) тратит Apify и Claude, поэтому он у админа и на Pro.
async function radarDenied() {
  if (isDemo()) return null;
  return planOf(await requireUser()) === "free" ? "Поиск залётов по твоей нише доступен на тарифе Pro." : null;
}

function statusChange(formData: FormData): StatusChange {
  const status = String(formData.get("status")) as ReelStatus;
  if (!REEL_STATUSES.includes(status)) throw new Error("Неизвестный статус");

  const raw = formData.get("reason") as RejectReason | null;
  const reason = raw && raw in REJECT_REASONS ? raw : undefined;
  const publishedUrl = String(formData.get("publishedUrl") ?? "").trim() || undefined;
  if (status === "published" && !publishedUrl) throw new Error("Нужна ссылка на выложенный ролик");
  if (publishedUrl && !/^https:\/\//.test(publishedUrl)) throw new Error("Ссылка должна начинаться с https://");

  const reasonText = String(formData.get("reasonText") ?? "").trim() || (reason ? REJECT_REASONS[reason] : undefined);
  return { status, reason, reasonText, publishedUrl };
}

export async function setReelStatus(formData: FormData) {
  const id = String(formData.get("id"));
  await (await getRepo()).setReelStatus(id, statusChange(formData));
  revalidatePath("/reels");
  revalidatePath(`/reels/${id}`);
}

export async function setRedpillStatus(formData: FormData) {
  const id = String(formData.get("id"));
  await (await getRepo()).setRedpillStatus(id, statusChange(formData));
  revalidatePath("/redpill");
  revalidatePath(`/redpill/${id}`);
}

// Ссылка разбирается сразу, в фоне после ответа: без ожидания расписания и без Inngest.
export async function addToQueue(formData: FormData): Promise<{ error?: string; started?: boolean }> {
  const denied = await radarDenied();
  if (denied) return { error: denied };
  const url = String(formData.get("url") ?? "").trim();
  if (!/^https:\/\/(www\.)?instagram\.com\/([^/]+\/)?(reel|reels|p)\//.test(url)) return { error: "Нужна ссылка на Reels из Instagram" };
  await (await getRepo()).addToQueue(url, String(formData.get("note") ?? "").trim());
  revalidatePath("/sources");
  revalidatePath("/reels");
  if (isDemo()) return {};
  const ws = await currentWorkspace();
  after(() => processPendingNow(ws).catch((e) => console.error("processPendingNow", e)));
  return { started: true };
}

export async function savePersona(formData: FormData) {
  const field = (k: string) => String(formData.get(k) ?? "");
  const queries = field("queries").split("\n").map((q) => q.trim()).filter(Boolean).slice(0, 10);
  await (await getRepo()).savePersona({ name: field("name"), topics: field("topics"), facts: field("facts"), voice: field("voice"), taboo: field("taboo"), queries });
  revalidatePath("/persona");
}

export async function setRuleStatus(formData: FormData) {
  const status = String(formData.get("status"));
  if (status !== "approved" && status !== "rejected") throw new Error("Неизвестный статус");
  await (await getRepo()).setRuleStatus(String(formData.get("id")), status);
  revalidatePath("/learning");
}

// Возвращает текст ошибки, а не бросает: в продакшене Next скрывает сообщения брошенных ошибок.
// Ручной поиск идёт прямо на сайте (не зависит от Inngest); расписание по-прежнему через Inngest.
export async function runNow(options?: unknown): Promise<{ error?: string }> {
  const denied = await radarDenied();
  if (denied) return { error: denied };
  if (isDemo()) return { error: "В демо-режиме прогон недоступен: подключи базу и ключи" };
  const repo = await getRepo(); // проверяет вход владельца
  const last = (await repo.listRuns())[0];
  if (last && !last.finishedAt && Date.now() - Date.parse(last.startedAt) < 10 * 60_000) return { error: "Поиск уже идёт, подожди пару минут" };
  const ws = await currentWorkspace();
  // Запись о прогоне создаём сразу: «Идёт поиск» видно после обновления, а ошибка базы придёт в уведомлении.
  let runId: string;
  try {
    runId = await startRun(ws, "manual");
  } catch (e) {
    return { error: `Не получилось начать поиск: ${errorRu(e)}` };
  }
  after(() => searchNow(ws, parseRunOptions(options), runId).catch((e) => console.error("searchNow", e)));
  revalidatePath("/reels");
  return {};
}

export async function addCreator(formData: FormData): Promise<{ error?: string }> {
  const raw = String(formData.get("username") ?? "").trim();
  const username = raw.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").split(/[/?]/)[0].toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) return { error: "Не похоже на ник Instagram" };
  await (await getRepo()).addCreator(username);
  revalidatePath("/sources");
  revalidatePath("/reels");
  return {};
}

export async function processQueueNow(): Promise<{ error?: string }> {
  const denied = await radarDenied();
  if (denied) return { error: denied };
  if (isDemo()) return { error: "В демо-режиме разбор недоступен" };
  await getRepo(); // проверяет вход владельца
  const ws = await currentWorkspace();
  after(() => processPendingNow(ws).catch((e) => console.error("processPendingNow", e)));
  return {};
}

// Автор правит хук и озвучку, Claude пересобирает раскадровку под его текст. Новая версия сохраняется рядом со старой.
export async function reviseAdaptation(id: string, edits: AdaptationEdits): Promise<{ error?: string }> {
  const denied = await radarDenied();
  if (denied) return { error: denied };
  const repo = await getRepo();
  const reel = await repo.getReel(id);
  if (!reel?.analysis) return { error: "Разбор не найден" };
  const clean: AdaptationEdits = {
    hook: edits.hook.trim().slice(0, 300),
    vo: edits.vo.map((v) => ({ t: v.t.slice(0, 12), text: v.text.trim().slice(0, 600) })).filter((v) => v.text).slice(0, 12),
    instruction: edits.instruction.trim().slice(0, 600),
  };
  if (!clean.hook || clean.vo.length === 0) return { error: "Нужны хук и хотя бы одна строка озвучки" };

  if (isDemo()) {
    const a = structuredClone(reel.analysis);
    for (const loc of [a, a.i18n.ru]) Object.assign(loc.adaptation, { hook: clean.hook, vo: clean.vo });
    await repo.saveReelAnalysis(id, a, "demo");
  } else {
    try {
      const ws = await currentWorkspace();
      const profile = await loadProfile(ws);
      const { analysis, usd } = await reviseReelAnalysis(reel.analysis, clean, profile.persona, profile);
      await repo.saveReelAnalysis(id, analysis, MODEL_MAIN);
      await logCost(ws, null, "anthropic", usd);
    } catch (e) {
      return { error: `Не получилось пересобрать: ${e instanceof Error ? e.message.slice(0, 160) : "ошибка"}` };
    }
  }
  revalidatePath(`/reels/${id}`);
  revalidatePath("/reels");
  return {};
}

export async function learnNow(): Promise<{ error?: string; message?: string }> {
  const denied = await radarDenied();
  if (denied) return { error: denied };
  if (isDemo()) return { error: "В демо-режиме обучение недоступно" };
  await getRepo(); // проверяет вход владельца
  try {
    const ws = await currentWorkspace();
    const r = await learn(ws);
    if (r.usd > 0) await logCost(ws, null, "anthropic", r.usd);
    revalidatePath("/learning");
    return { message: r.skipped ?? (r.proposed > 0 ? `Готово. Новых правил: ${r.proposed}` : "Профиль вкуса обновил, новых правил нет") };
  } catch (e) {
    return { error: `Не получилось: ${e instanceof Error ? e.message.slice(0, 160) : "ошибка"}` };
  }
}

// Новая организация: название, ссылки, описание и рассказ о себе. Claude всё читает и собирает паспорт.
export async function createProject(formData: FormData): Promise<{ error?: string }> {
  if (isDemo()) return { error: "В демо-режиме организации недоступны" };
  const user = await requireUser();
  const limit = await overLimit(user, "projects");
  if (limit) return { error: limit };
  const text = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
  const links = text("links", 2000)
    .split(/[\s,]+/)
    .filter((l) => /^https?:\/\/[^\s]+\.[^\s]+/.test(l))
    .slice(0, 8);
  const input = { name: text("name", 120), links, about: text("about", 3000), me: text("me", 3000) };
  if (!input.name) return { error: "Впиши название организации" };
  if (links.length === 0 && input.about.length < 40) return { error: "Добавь ссылку или расскажи об организации хотя бы парой предложений" };
  const url = links[0] ?? "";
  try {
    const { passport, usd } = await buildPassport(input);
    const id = await insertProject(user.id, url, { ...passport, name: input.name, input } as typeof passport);
    await logCost(id, null, "anthropic", usd);
    await selectProject(id);
    // Мастер первого запуска сразу заказывает первые сценарии, чтобы доска не была пустой.
    if (formData.get("start") === "1" && !(await overLimit(user, "scripts", 10))) {
      after(() => generateScripts(id, 10, "").catch((e) => console.error("generateScripts", e)));
    }
  } catch (e) {
    return { error: `Не получилось собрать организацию: ${e instanceof Error ? e.message.slice(0, 160) : "ошибка"}` };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function switchProject(formData: FormData) {
  await getRepo(); // проверяет вход владельца
  await selectProject(String(formData.get("id")));
  revalidatePath("/", "layout");
}
