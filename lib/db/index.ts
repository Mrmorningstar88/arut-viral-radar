import "server-only";
import { connection } from "next/server";
import { requireOwner } from "@/lib/auth/server";
import { demoRepo } from "./demo";
import { supabaseRepo } from "./supabase";
import type { Repo } from "./types";

let repo: Repo | undefined;

export function isDemo() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, WORKSPACE_ID: ws } = process.env;
  return !(url && key && ws);
}

// Данные всегда свежие: страницы дашборда рендерятся на каждый запрос.
export async function getRepo(): Promise<Repo> {
  await connection();
  if (!isDemo()) await requireOwner();
  if (repo) return repo;
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, WORKSPACE_ID: ws } = process.env;
  repo = isDemo() ? demoRepo : supabaseRepo(url!, key!, ws!);
  return repo;
}
