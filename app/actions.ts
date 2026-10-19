"use server";

import { revalidatePath } from "next/cache";
import { getRepo, isDemo } from "@/lib/db";
import { inngest, RUN_REQUESTED } from "@/inngest/client";
import { REEL_STATUSES, REJECT_REASONS, type RejectReason, type ReelStatus, type StatusChange } from "@/lib/db/types";

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

export async function addToQueue(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  if (!/^https:\/\/(www\.)?instagram\.com\/(reel|p)\//.test(url)) throw new Error("Нужна ссылка на Reels");
  await (await getRepo()).addToQueue(url, String(formData.get("note") ?? "").trim());
  revalidatePath("/queue");
}

export async function savePersona(formData: FormData) {
  const field = (k: string) => String(formData.get(k) ?? "");
  const queries = field("queries").split("\n").map((q) => q.trim()).filter(Boolean).slice(0, 10);
  await (await getRepo()).savePersona({ name: field("name"), facts: field("facts"), voice: field("voice"), taboo: field("taboo"), queries });
  revalidatePath("/persona");
}

export async function setRuleStatus(formData: FormData) {
  const status = String(formData.get("status"));
  if (status !== "approved" && status !== "rejected") throw new Error("Неизвестный статус");
  await (await getRepo()).setRuleStatus(String(formData.get("id")), status);
  revalidatePath("/learning");
}

// Возвращает текст ошибки, а не бросает: в продакшене Next скрывает сообщения брошенных ошибок.
export async function runNow(): Promise<{ error?: string }> {
  if (isDemo()) return { error: "В демо-режиме прогон недоступен: подключи базу и ключи" };
  await getRepo(); // проверяет вход владельца
  try {
    await inngest.send({ name: RUN_REQUESTED, data: {} });
    return {};
  } catch {
    return { error: "Не получилось запустить: проверь ключи Inngest" };
  }
}

export async function addCreator(formData: FormData) {
  const raw = String(formData.get("username") ?? "").trim();
  const username = raw.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").split(/[/?]/)[0].toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) throw new Error("Неверный ник");
  await (await getRepo()).addCreator(username);
  revalidatePath("/creators");
}
