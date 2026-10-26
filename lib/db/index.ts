import "server-only";
import { connection } from "next/server";
import { requireOwner } from "@/lib/auth/server";
import { currentWorkspace } from "@/lib/projects";
import { demoRepo } from "./demo";
import { supabaseRepo } from "./supabase";
import type { Repo } from "./types";

const repos = new Map<string, Repo>();

export function isDemo() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, WORKSPACE_ID: ws } = process.env;
  return !(url && key && ws);
}

// Данные всегда свежие: страницы дашборда рендерятся на каждый запрос.
// Репозиторий привязан к выбранному проекту.
export async function getRepo(): Promise<Repo> {
  await connection();
  if (isDemo()) return demoRepo;
  await requireOwner();
  const ws = await currentWorkspace();
  let repo = repos.get(ws);
  if (!repo) {
    repo = supabaseRepo(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, ws);
    repos.set(ws, repo);
  }
  return repo;
}
