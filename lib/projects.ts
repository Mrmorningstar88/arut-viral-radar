import "server-only";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isAdmin, requireUser } from "@/lib/auth/server";
import { serviceDb } from "@/lib/engine/store";
import { passportToPersona, type Passport } from "@/lib/generate/passport";

// Проект = пространство (workspace): свой образ, свои залёты, свои сценарии.
// Доступ через workspace_members: клиент видит только свои проекты.
// Выбранный проект хранится в cookie, по умолчанию открывается первый.

export const PROJECT_COOKIE = "yoomp_project";
const UUID = /^[0-9a-f-]{36}$/i;

export type Project = { id: string; name: string; productUrl: string | null; passport: Passport | null; createdAt: string };

type Row = Record<string, unknown>;
const toProject = (r: Row): Project => ({
  id: r.id as string,
  name: r.name as string,
  productUrl: (r.product_url as string) ?? null,
  passport: (r.passport as Passport) ?? null,
  createdAt: r.created_at as string,
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function memberIds(userId: string): Promise<string[]> {
  const rows = check(await serviceDb().from("workspace_members").select("workspace_id").eq("user_id", userId)) as Row[];
  return rows.map((r) => r.workspace_id as string);
}

// Проекты, созданные до регистрации клиентов, ничьи: их забирает себе первый вошедший админ.
async function claimOrphans(userId: string) {
  const d = serviceDb();
  const [all, taken] = await Promise.all([d.from("workspaces").select("id"), d.from("workspace_members").select("workspace_id")]);
  const owned = new Set((check(taken) as Row[]).map((r) => r.workspace_id as string));
  const orphans = (check(all) as Row[]).map((r) => r.id as string).filter((id) => !owned.has(id));
  if (orphans.length) check(await d.from("workspace_members").insert(orphans.map((workspace_id) => ({ workspace_id, user_id: userId, role: "owner" }))));
}

// Проекты пользователя; админ при первом входе забирает ничьи. Кэш на один рендер.
export const myProjectIds = cache(async (user: User): Promise<string[]> => {
  let ids = await memberIds(user.id);
  if (isAdmin(user) && ids.length === 0) {
    await claimOrphans(user.id);
    ids = await memberIds(user.id);
  }
  return ids;
});

// Открытый проект. Без проектов человек попадает в мастер первого запуска.
export async function currentWorkspace(): Promise<string> {
  const user = await requireUser();
  const ids = await myProjectIds(user);
  if (ids.length === 0) redirect("/welcome");
  const chosen = (await cookies()).get(PROJECT_COOKIE)?.value;
  if (chosen && ids.includes(chosen)) return chosen;
  const main = process.env.WORKSPACE_ID;
  return main && ids.includes(main) ? main : ids[0];
}

export async function listProjects(): Promise<Project[]> {
  const ids = await myProjectIds(await requireUser());
  if (ids.length === 0) return [];
  const rows = check(await serviceDb().from("workspaces").select("id, name, product_url, passport, created_at").in("id", ids).order("created_at")) as Row[];
  return rows.map(toProject);
}

// Для расписания: все проекты сервиса.
export async function listProjectIds(): Promise<string[]> {
  return (check(await serviceDb().from("workspaces").select("id")) as Row[]).map((r) => r.id as string);
}

export async function createProject(userId: string, url: string, passport: Passport): Promise<string> {
  const d = serviceDb();
  const ws = check(await d.from("workspaces").insert({ name: passport.name, product_url: url, passport }).select("id").single()) as Row;
  const id = ws.id as string;
  check(await d.from("workspace_members").insert({ workspace_id: id, user_id: userId, role: "owner" }));
  check(await d.from("persona").insert({ workspace_id: id, ...passportToPersona(passport) }));
  return id;
}

export async function selectProject(id: string) {
  if (!UUID.test(id)) throw new Error("Неизвестный проект");
  const ids = await myProjectIds(await requireUser());
  if (!ids.includes(id)) throw new Error("Нет доступа к проекту");
  (await cookies()).set(PROJECT_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
}
