import "server-only";
import type { User } from "@supabase/supabase-js";
import { serviceDb } from "@/lib/engine/store";

// Свой образ в роликах через Higgsfield: из фото лица обучается Soul ID, рендер-воркер рисует с ним кадры
// и оживляет их в видео. Ключ и Soul ID лежат в app_metadata пользователя (пишет только сервер), а включён ли
// образ в роликах организации, лежит в общем кэше по ключу face:<ws>: оттуда его читает воркер.
// Документация: docs.higgsfield.ai, Soul ID: open.higgsfield.ai/models/soul-id/api-reference

const API = "https://api.higgsfield.ai";
const TIMEOUT_MS = 20_000;
const KEY = (ws: string) => `face:${ws}`;
const FOREVER = "2100-01-01T00:00:00Z";

export type SoulStatus = "not_ready" | "queued" | "in_progress" | "completed" | "failed";
export type Soul = { id: string; status: SoulStatus; thumb?: string | null };
export type HiggsfieldLink = { id: string; secret: string; soul?: Soul };
export type Face = { owner: string; on: boolean };

export const linkOf = (user: User): HiggsfieldLink | null => {
  const m = user.app_metadata?.higgsfield as HiggsfieldLink | undefined;
  return m?.id && m.secret ? m : null;
};

export const training = (s?: Soul) => !!s && (s.status === "not_ready" || s.status === "queued" || s.status === "in_progress");

async function call(link: Pick<HiggsfieldLink, "id" | "secret">, path: string, init: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...init,
    // Основной заголовок Authorization, старые hf-api-key/hf-secret на случай, если Soul ID их ещё ждёт.
    headers: { Authorization: `Key ${link.id}:${link.secret}`, "hf-api-key": link.id, "hf-secret": link.secret, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((e: Error) => {
    throw new Error(e.name === "TimeoutError" ? "Higgsfield долго не отвечает, попробуй ещё раз" : "Не получилось связаться с Higgsfield");
  });
  const text = await res.text();
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Higgsfield не принял ключ: проверь ID ключа и секрет" : `Higgsfield ответил ${res.status}: ${text.slice(0, 160)}`);
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

// Ключ проверяется списком Soul ID: запрос бесплатный.
export async function checkKey(link: Pick<HiggsfieldLink, "id" | "secret">) {
  await call(link, "/v1/custom-references/list?page=1&page_size=1");
}

export async function saveLink(user: User, link: HiggsfieldLink | null) {
  const meta: Record<string, unknown> = { ...user.app_metadata };
  if (link) meta.higgsfield = link;
  else delete meta.higgsfield;
  const { error } = await serviceDb().auth.admin.updateUserById(user.id, { app_metadata: meta });
  if (error) throw new Error("Не получилось сохранить настройки Higgsfield");
}

// Фото лица загружаются во временное хранилище Higgsfield, у нас не остаются.
export async function uploadPhoto(link: HiggsfieldLink, photo: File): Promise<string> {
  const type = photo.type === "image/png" || photo.type === "image/webp" ? photo.type : "image/jpeg";
  const slot = (await call(link, "/files/generate-upload-url", { method: "POST", body: JSON.stringify({ content_type: type }) })) as {
    public_url: string;
    upload_url: string;
    upload_headers?: Record<string, string>;
  };
  const put = await fetch(slot.upload_url, {
    method: "PUT",
    headers: slot.upload_headers ?? { "Content-Type": type },
    body: await photo.arrayBuffer(),
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null);
  if (!put?.ok) throw new Error("Фото не загрузилось в Higgsfield, попробуй ещё раз");
  return slot.public_url;
}

// Обучение Soul ID идёт у Higgsfield в фоне, статус проверяется при открытии Настроек.
export async function createSoul(link: HiggsfieldLink, name: string, urls: string[]): Promise<Soul> {
  const r = await call(link, "/v1/custom-references", {
    method: "POST",
    body: JSON.stringify({ name: name.slice(0, 100), input_images: urls.map((image_url) => ({ type: "image_url", image_url })) }),
  });
  return { id: String(r.id), status: (r.status as SoulStatus) ?? "queued", thumb: (r.thumbnail_url as string | null) ?? null };
}

export async function getSoul(link: HiggsfieldLink, id: string): Promise<Soul> {
  const r = await call(link, `/v1/custom-references/${encodeURIComponent(id)}`);
  return { id, status: (r.status as SoulStatus) ?? "failed", thumb: (r.thumbnail_url as string | null) ?? null };
}

export async function faceOf(ws: string): Promise<Face | null> {
  const { data } = await serviceDb().from("source_cache").select("payload").eq("key", KEY(ws)).maybeSingle();
  return (data?.payload as Face | undefined) ?? null;
}

export async function saveFace(ws: string, face: Face) {
  const { error } = await serviceDb().from("source_cache").upsert({ key: KEY(ws), payload: face, expires_at: FOREVER });
  if (error) throw new Error(error.message);
}
