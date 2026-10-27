"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { setPassword } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { adoptSession } from "./actions";

const INPUT = "w-full rounded-2xl border border-ink/10 bg-paper/30 px-4 py-3 outline-none transition placeholder:text-ink/30 focus:border-accent/60";

// Сюда ведёт ссылка из письма. Входим и сразу предлагаем задать пароль, чтобы дальше входить без писем.
export default function AuthCallback() {
  const [state, setState] = useState<"checking" | "in" | "failed">("checking");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const input = {
      code: query.get("code") ?? undefined,
      access_token: hash.get("access_token") ?? undefined,
      refresh_token: hash.get("refresh_token") ?? undefined,
    };
    window.history.replaceState(null, "", "/auth/callback"); // токены не остаются в адресе
    adoptSession(input)
      .then((r) => setState(r.ok ? "in" : "failed"))
      .catch(() => setState("failed"));
  }, []);

  return (
    <div className="mx-auto mt-10 max-w-sm space-y-6 md:mt-20">
      {state === "checking" && <p className="text-center text-muted">Вхожу…</p>}
      {state === "failed" && (
        <div className="space-y-3 rounded-3xl glass p-6 text-center">
          <h1 className="font-display text-xl font-semibold">Ссылка устарела</h1>
          <p className="text-sm text-muted">Ссылка из письма работает один раз и недолго. Запроси новую, это займёт минуту.</p>
          <Link href="/login?mode=link" className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl neo-btn px-5 text-sm font-medium">
            Прислать новую ссылку
          </Link>
        </div>
      )}
      {state === "in" && <NewPassword />}
    </div>
  );
}

function NewPassword() {
  const router = useRouter();
  const [result, action, pending] = useActionState(setPassword, null);

  useEffect(() => {
    if (result?.message) router.replace("/");
  }, [result, router]);

  return (
    <>
      <div className="text-center">
        <p className="font-display text-sm font-semibold tracking-wide text-emerald-500">✓ Ты вошёл</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">Придумай новый пароль</h1>
        <p className="mt-1 text-sm text-muted">В следующий раз войдёшь сразу, без письма.</p>
      </div>
      <form action={action} className="space-y-3 rounded-3xl glass p-5">
        <PasswordInput name="password" required minLength={8} autoFocus autoComplete="new-password" placeholder="Новый пароль (от 8 символов)" className={INPUT} />
        <Button variant="primary" type="submit" disabled={pending || !!result?.message} className="w-full justify-center py-3">
          {pending || result?.message ? "Захожу в YOOMP…" : "Готово, войти"}
        </Button>
        {result?.error && (
          <p role="alert" className="text-center text-sm text-rose-300">
            {result.error}
          </p>
        )}
        <button type="button" onClick={() => router.replace("/")} className="min-h-11 w-full text-center text-sm text-muted transition hover:text-foreground">
          Пропустить
        </button>
      </form>
    </>
  );
}
