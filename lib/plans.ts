import "server-only";
import type { User } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/auth/server";
import { serviceDb } from "@/lib/engine/store";
import { memberIds } from "@/lib/projects";

// Тарифы. Тариф клиента лежит в app_metadata пользователя Supabase: его меняет только сервер (админка).
// Лимиты сценариев и роликов считаются за календарный месяц.

export type PlanId = "free" | "pro" | "admin";
export type Limits = { projects: number; scripts: number; videos: number };

export const PLANS: Record<PlanId, { name: string; price: string; limits: Limits; perks: string[] }> = {
  free: {
    name: "Free",
    price: "0 $",
    limits: { projects: 1, scripts: 10, videos: 0 },
    perks: ["1 проект по ссылке", "10 сценариев в месяц", "Сториборды и стили", "Ролики: на Pro"],
  },
  pro: {
    name: "Pro",
    price: "по запросу",
    limits: { projects: 5, scripts: 200, videos: 20 },
    perks: ["5 проектов", "200 сценариев в месяц", "20 готовых роликов в месяц", "Свежие залёты по твоей нише каждый день"],
  },
  admin: {
    name: "Владелец",
    price: "",
    limits: { projects: Infinity, scripts: Infinity, videos: Infinity },
    perks: [],
  },
};

export function planOf(user: User): PlanId {
  if (isAdmin(user)) return "admin";
  return user.app_metadata?.plan === "pro" ? "pro" : "free";
}

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

export async function usage(userId: string): Promise<Limits> {
  const ids = await memberIds(userId);
  if (ids.length === 0) return { projects: 0, scripts: 0, videos: 0 };
  const d = serviceDb();
  const since = monthStart();
  const [scripts, videos] = await Promise.all([
    d.from("scripts").select("id", { count: "exact", head: true }).in("workspace_id", ids).gte("created_at", since),
    d.from("scripts").select("id", { count: "exact", head: true }).in("workspace_id", ids).not("render_status", "is", null).gte("updated_at", since),
  ]);
  return { projects: ids.length, scripts: scripts.count ?? 0, videos: videos.count ?? 0 };
}

const LIMIT_TEXT: Record<keyof Limits, string> = {
  projects: "На твоём тарифе больше проектов не помещается.",
  scripts: "Лимит сценариев на этот месяц исчерпан.",
  videos: "Готовые ролики доступны на тарифе Pro.",
};

// null, если можно; иначе понятный текст для клиента.
export async function overLimit(user: User, kind: keyof Limits, adding = 1): Promise<string | null> {
  const plan = planOf(user);
  if (plan === "admin") return null;
  const limit = PLANS[plan].limits[kind];
  const used = (await usage(user.id))[kind];
  if (used + adding <= limit) return null;
  return kind === "videos" && plan === "free" ? LIMIT_TEXT.videos : `${LIMIT_TEXT[kind]} Нажми «Хочу Pro» в настройках, и мы расширим.`;
}

// Проекты, по которым имеет смысл гонять ежедневный поиск залётов: админа и Pro-клиентов.
export async function paidWorkspaceIds(): Promise<Set<string>> {
  const d = serviceDb();
  const { data } = await d.auth.admin.listUsers({ perPage: 1000 });
  const paid = (data?.users ?? []).filter((u) => planOf(u) !== "free").map((u) => u.id);
  if (paid.length === 0) return new Set();
  const { data: rows } = await d.from("workspace_members").select("workspace_id").in("user_id", paid);
  return new Set((rows ?? []).map((r) => r.workspace_id as string));
}
