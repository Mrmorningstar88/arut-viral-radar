"use server";

import { headers } from "next/headers";
import { allowedEmails, authClient } from "@/lib/auth/server";

export async function sendMagicLink(_: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  // Одинаковый ответ для любых адресов: не подсказываем, какой адрес владельца.
  const ok = { sent: true, message: "Если это твой адрес, ссылка для входа уже в почте." };
  if (!allowedEmails().includes(email)) return ok;
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await (await authClient()).auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) return { sent: false, message: "Не получилось отправить письмо. Попробуй ещё раз." };
  return ok;
}
