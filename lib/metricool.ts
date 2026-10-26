import "server-only";
import type { User } from "@supabase/supabase-js";
import { serviceDb } from "@/lib/engine/store";

// Публикация через Metricool (тариф Advanced с API). Токен и userId аккаунта Metricool лежат
// в app_metadata пользователя (их пишет только сервер), бренд Metricool выбирается для каждой организации.
// Документация: help.metricool.com/basic-guide-for-api-integration-r97af

const API = "https://app.metricool.com/api";
const TIMEOUT_MS = 20_000;

export type MetricoolLink = { token: string; userId: string; brands: Record<string, string> };
export type Brand = { blogId: string; label: string; networks: string[] };

export const NETWORKS: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube Shorts", facebook: "Facebook" };

export const linkOf = (user: User): MetricoolLink | null => {
  const m = user.app_metadata?.metricool as MetricoolLink | undefined;
  return m?.token && m.userId ? { ...m, brands: m.brands ?? {} } : null;
};

async function call(link: Pick<MetricoolLink, "token" | "userId">, path: string, params: Record<string, string> = {}, init: RequestInit = {}) {
  const url = new URL(API + path);
  url.searchParams.set("userId", link.userId);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { ...init, headers: { "X-Mc-Auth": link.token, "Content-Type": "application/json", ...init.headers }, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((e: Error) => {
    throw new Error(e.name === "TimeoutError" ? "Metricool не ответил за 20 секунд, попробуй ещё раз" : "Не получилось связаться с Metricool");
  });
  const text = await res.text();
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Metricool не принял токен: проверь токен и userId" : `Metricool ответил ${res.status}: ${text.slice(0, 160)}`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// Бренды аккаунта и какие соцсети к ним подключены.
export async function listBrands(link: Pick<MetricoolLink, "token" | "userId">): Promise<Brand[]> {
  const rows = (await call(link, "/admin/simpleProfiles")) as Record<string, unknown>[];
  if (!Array.isArray(rows)) throw new Error("Metricool вернул неожиданный ответ");
  return rows.map((r) => ({
    blogId: String(r.id ?? r.blogId),
    label: String(r.label ?? r.title ?? r.name ?? r.id),
    networks: Object.keys(NETWORKS).filter((n) => !!r[n]),
  }));
}

export async function saveLink(user: User, link: MetricoolLink | null) {
  const { error } = await serviceDb().auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, metricool: link } });
  if (error) throw new Error("Не получилось сохранить подключение");
}

// Ролик уходит в Metricool с автопубликацией через пару минут: дата в прошлом Metricool не принимает.
export async function publishVideo(link: MetricoolLink, blogId: string, opts: { videoUrl: string; text: string; networks: string[] }) {
  const normalized = await call(link, "/actions/normalize/image/url", { blogId, url: opts.videoUrl });
  const media = typeof normalized === "string" ? normalized.replace(/^"|"$/g, "") : String((normalized as Record<string, unknown>)?.url ?? opts.videoUrl);
  const at = new Date(Date.now() + 3 * 60_000).toISOString().slice(0, 19);
  const body = {
    publicationDate: { dateTime: at, timezone: "UTC" },
    text: opts.text,
    providers: opts.networks.map((network) => ({ network })),
    media: [media],
    saveExternalMediaFiles: true,
    autoPublish: true,
    draft: false,
    ...(opts.networks.includes("instagram") ? { instagramData: { type: "REEL" } } : {}),
  };
  return call(link, "/v2/scheduler/posts", { blogId }, { method: "POST", body: JSON.stringify(body) });
}
