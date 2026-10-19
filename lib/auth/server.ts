import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export function allowedEmails() {
  return (process.env.OWNER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

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

// Данные читаются service role-ключом, поэтому вход проверяется здесь, на каждом запросе.
export async function requireOwner() {
  const { data } = await (await authClient()).auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email || !allowedEmails().includes(email)) redirect("/login");
  return data.user!;
}
