"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth/server";
import { serviceDb } from "@/lib/engine/store";

type State = { error?: string; sent?: boolean; message?: string } | null;

const field = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Регистрация без письма-подтверждения: аккаунт создаёт сервер, затем сразу входим.
// Так регистрация не зависит от почтового сервиса Supabase с его лимитами.
export async function signUp(_: State, fd: FormData): Promise<State> {
  const email = field(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!EMAIL.test(email)) return { error: "Проверь почту" };
  if (password.length < 8) return { error: "Пароль: минимум 8 символов" };
  const { error } = await serviceDb().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { plan: "free" } });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { error: "Такой аккаунт уже есть. Войди или нажми «Войти по ссылке на почту»." };
    return { error: "Не получилось создать аккаунт. Попробуй ещё раз." };
  }
  const { error: signInError } = await (await authClient()).auth.signInWithPassword({ email, password });
  if (signInError) return { error: "Аккаунт создан, но войти не вышло. Попробуй войти." };
  redirect("/welcome");
}

export async function signIn(_: State, fd: FormData): Promise<State> {
  const email = field(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const { error } = await (await authClient()).auth.signInWithPassword({ email, password });
  if (error) return { error: "Неверная почта или пароль. Если пароля нет, войди по ссылке на почту ниже." };
  redirect("/");
}

// Вход по ссылке на почту для тех, у кого нет пароля (первые аккаунты были без него).
export async function sendMagicLink(_: State, fd: FormData): Promise<State> {
  const email = field(fd, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "Проверь почту" };
  const origin = (await headers()).get("origin") ?? "";
  // Одинаковый ответ для любых адресов: не подсказываем, у кого есть аккаунт.
  // Implicit-ссылка несёт токены в самой ссылке, поэтому открывается в любом браузере (Gmail открывает в своём),
  // а не только в том, где её запросили.
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  await anon.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: false } });
  return { sent: true, message: "Если такой аккаунт есть, ссылка для входа уже в почте." };
}

export async function signOut() {
  await (await authClient()).auth.signOut();
  redirect("/");
}
