"use server";

import { revalidatePath } from "next/cache";
import { getRepo } from "@/lib/db";
import { REEL_STATUSES, REJECT_REASONS, type RejectReason, type ReelStatus } from "@/lib/db/types";

export async function setReelStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as ReelStatus;
  if (!REEL_STATUSES.includes(status)) throw new Error("Неизвестный статус");

  const reason = formData.get("reason") as RejectReason | null;
  const publishedUrl = String(formData.get("publishedUrl") ?? "").trim() || undefined;
  if (status === "published" && !publishedUrl) throw new Error("Нужна ссылка на выложенный ролик");

  await (await getRepo()).setReelStatus(id, {
    status,
    reason: reason && reason in REJECT_REASONS ? reason : undefined,
    reasonText: String(formData.get("reasonText") ?? "").trim() || undefined,
    publishedUrl,
  });
  revalidatePath("/reels");
  revalidatePath(`/reels/${id}`);
}

export async function addToQueue(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  if (!/^https:\/\/(www\.)?instagram\.com\/(reel|p)\//.test(url)) throw new Error("Нужна ссылка на Reels");
  await (await getRepo()).addToQueue(url, String(formData.get("note") ?? "").trim());
  revalidatePath("/queue");
}

export async function savePersona(formData: FormData) {
  const field = (k: string) => String(formData.get(k) ?? "");
  await (await getRepo()).savePersona({ name: field("name"), facts: field("facts"), voice: field("voice"), taboo: field("taboo") });
  revalidatePath("/persona");
}

export async function setRuleStatus(formData: FormData) {
  const status = String(formData.get("status"));
  if (status !== "approved" && status !== "rejected") throw new Error("Неизвестный статус");
  await (await getRepo()).setRuleStatus(String(formData.get("id")), status);
  revalidatePath("/learning");
}
