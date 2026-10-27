"use server";

import { authClient } from "@/lib/auth/server";

// Ссылка из письма приходит двумя способами: с ?code (ссылка открыта в том же браузере, где её просили)
// или с токенами в #hash (ссылка работает в любом браузере). Оба превращаем в обычную сессию на куках.
export async function adoptSession(input: { code?: string; access_token?: string; refresh_token?: string }): Promise<{ ok: boolean }> {
  const auth = (await authClient()).auth;
  if (input.code && /^[\w-]{8,200}$/.test(input.code)) return { ok: !(await auth.exchangeCodeForSession(input.code)).error };
  if (input.access_token && input.refresh_token) {
    const { error } = await auth.setSession({ access_token: input.access_token, refresh_token: input.refresh_token });
    return { ok: !error };
  }
  return { ok: false };
}
