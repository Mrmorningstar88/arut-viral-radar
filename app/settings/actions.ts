"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { authClient, requireAdmin, requireUser } from "@/lib/auth/server";
import { serviceDb } from "@/lib/engine/store";
import { keyOf, listVoices, makeSound, saveKey, saveSound, soundOf } from "@/lib/elevenlabs";
import { linkOf, listBrands, saveLink } from "@/lib/metricool";
import { currentWorkspace } from "@/lib/projects";

type Result = { error?: string; message?: string };

// Заявка на Pro видна владельцу в разделе «Клиенты», там он и включает тариф.
export async function requestPro(): Promise<Result> {
  const user = await requireUser();
  const { error } = await serviceDb().auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, pro_request: new Date().toISOString() },
  });
  if (error) return { error: "Не получилось отправить заявку, попробуй ещё раз" };
  revalidatePath("/settings");
  return { message: "Заявка отправлена. Мы свяжемся с тобой по почте." };
}

export async function setPassword(_: Result | null, fd: FormData): Promise<Result> {
  await requireUser();
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Минимум 8 символов" };
  const { error } = await (await authClient()).auth.updateUser({ password });
  if (error) return { error: "Не получилось сохранить пароль" };
  return { message: "Пароль сохранён" };
}

export async function setPlan(userId: string, plan: "free" | "pro"): Promise<Result> {
  await requireAdmin();
  const d = serviceDb();
  const { data, error } = await d.auth.admin.getUserById(userId);
  if (error || !data.user) return { error: "Клиент не найден" };
  const meta: Record<string, unknown> = { ...data.user.app_metadata, plan };
  if (plan === "pro") delete meta.pro_request;
  const res = await d.auth.admin.updateUserById(userId, { app_metadata: meta });
  if (res.error) return { error: res.error.message };
  revalidatePath("/admin");
  return {};
}

// Metricool: токен и userId аккаунта проверяются запросом списка брендов, потом бренд выбирается для организации.
export async function connectMetricool(_: Result | null, fd: FormData): Promise<Result> {
  const user = await requireUser();
  const token = String(fd.get("token") ?? "").trim();
  const userId = String(fd.get("userId") ?? "").trim();
  if (!token || !/^\d+$/.test(userId)) return { error: "Нужны токен API и userId (только цифры)" };
  try {
    const brands = await listBrands({ token, userId });
    if (brands.length === 0) return { error: "В этом аккаунте Metricool нет брендов" };
    await saveLink(user, { token, userId, brands: linkOf(user)?.brands ?? {} });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не получилось подключиться" };
  }
  revalidatePath("/settings");
  return { message: "Metricool подключён. Теперь выбери бренд для организации." };
}

export async function chooseBrand(blogId: string): Promise<Result> {
  const user = await requireUser();
  const link = linkOf(user);
  if (!link) return { error: "Сначала подключи Metricool" };
  const ws = await currentWorkspace();
  await saveLink(user, { ...link, brands: { ...link.brands, [ws]: blogId } });
  revalidatePath("/settings");
  return {};
}

export async function disconnectMetricool(): Promise<Result> {
  const user = await requireUser();
  await saveLink(user, null);
  revalidatePath("/settings");
  return {};
}

// ElevenLabs: ключ проверяется запросом списка голосов, потом голос и фирменный звук выбираются для организации.
export async function connectElevenLabs(_: Result | null, fd: FormData): Promise<Result> {
  const user = await requireUser();
  const key = String(fd.get("key") ?? "").trim();
  if (key.length < 20) return { error: "Вставь ключ API из ElevenLabs целиком" };
  try {
    await listVoices(key);
    await saveKey(user, key);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не получилось подключиться" };
  }
  revalidatePath("/settings");
  return { message: "ElevenLabs подключён. Теперь выбери голос." };
}

export async function chooseVoice(voiceId: string, voiceName: string): Promise<Result> {
  const user = await requireUser();
  if (!keyOf(user)) return { error: "Сначала подключи ElevenLabs" };
  if (!/^[A-Za-z0-9]{8,64}$/.test(voiceId)) return { error: "Неизвестный голос" };
  const ws = await currentWorkspace();
  await saveSound(ws, { ...(await soundOf(ws)), owner: user.id, voiceId, voiceName: voiceName.slice(0, 80) });
  revalidatePath("/settings");
  return {};
}

// Фирменный звук делается в фоне 1–3 минуты: тема и 4 эффекта. Повторный запуск во время работы игнорируется.
export async function createSound(): Promise<Result> {
  const user = await requireUser();
  const key = keyOf(user);
  if (!key) return { error: "Сначала подключи ElevenLabs" };
  const ws = await currentWorkspace();
  const current = await soundOf(ws);
  if (current?.status === "making") return { message: "Звук уже делается" };
  await saveSound(ws, { ...current, owner: user.id, status: "making", error: undefined });
  after(() => makeSound(ws, key));
  revalidatePath("/settings");
  return { message: "Делаю фирменный звук, это 1–3 минуты" };
}

export async function disconnectElevenLabs(): Promise<Result> {
  const user = await requireUser();
  await saveKey(user, null);
  revalidatePath("/settings");
  return {};
}
