import "server-only";
import { cookies } from "next/headers";
import { serviceDb } from "@/lib/engine/store";
import { passportToPersona, type Passport } from "@/lib/generate/passport";

// Проект = пространство (workspace): свой образ, свои залёты, свои сценарии.
// Выбранный проект хранится в cookie, по умолчанию открывается WORKSPACE_ID (твой блог).

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

export async function currentWorkspace(): Promise<string> {
  const fallback = process.env.WORKSPACE_ID!;
  const id = (await cookies()).get(PROJECT_COOKIE)?.value;
  if (!id || id === fallback || !UUID.test(id)) return fallback;
  const row = check(await serviceDb().from("workspaces").select("id").eq("id", id).maybeSingle());
  return row ? id : fallback;
}

export async function listProjects(): Promise<Project[]> {
  const rows = check(await serviceDb().from("workspaces").select("id, name, product_url, passport, created_at").order("created_at")) as Row[];
  return rows.map(toProject);
}

export async function listProjectIds(): Promise<string[]> {
  return (check(await serviceDb().from("workspaces").select("id")) as Row[]).map((r) => r.id as string);
}

export async function createProject(url: string, passport: Passport): Promise<string> {
  const d = serviceDb();
  const ws = check(await d.from("workspaces").insert({ name: passport.name, product_url: url, passport }).select("id").single()) as Row;
  const id = ws.id as string;
  check(await d.from("persona").insert({ workspace_id: id, ...passportToPersona(passport) }));
  return id;
}

export async function selectProject(id: string) {
  if (!UUID.test(id)) throw new Error("Неизвестный проект");
  (await cookies()).set(PROJECT_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
}
