import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

// Админы сервиса (владелец YOOMP): видят админку, радар и всех клиентов, без лимитов.
export function adminEmails() {
  return (process.env.OWNER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export const isAdmin = (user: Pick<User, "email"> | null) => !!user?.email && adminEmails().includes(user.email.toLowerCase());

export async function authClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Вызов из Server Component: куки обновит proxy.
        }
      },
    },
  });
}

// Один запрос к Supabase Auth на рендер, сколько бы компонентов ни спросили.
// connection(): страница с проверкой входа всегда рендерится на запрос, даже если ключей нет при сборке.
export const currentUser = cache(async (): Promise<User | null> => {
  await connection();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const { data } = await (await authClient()).auth.getUser();
  return data.user ?? null;
});

// Данные читаются service role-ключом, поэтому вход проверяется здесь, на каждом запросе.
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/");
  return user;
}
