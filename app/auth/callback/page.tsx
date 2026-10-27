"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PasswordForm } from "@/components/account-actions";
import { Button } from "@/components/ui/button";
import { adoptSession } from "./actions";

// Сюда ведёт ссылка из письма. Входим, затем предлагаем сразу задать новый пароль.
export default function AuthCallback() {
  const router = useRouter();
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
    <div className="mx-auto mt-10 max-w-sm space-y-4 rounded-3xl glass p-6 text-center md:mt-20">
      {state === "checking" && <p className="text-muted">Вхожу…</p>}
      {state === "failed" && (
        <>
          <p className="font-display text-xl font-semibold">Ссылка не сработала</p>
          <p className="text-sm text-muted">Она одноразовая и живёт недолго. Запроси новую, это займёт минуту.</p>
          <Link href="/login?mode=link" className="inline-flex min-h-11 items-center rounded-2xl neo-btn px-5 text-sm font-medium">
            Прислать новую ссылку
          </Link>
        </>
      )}
      {state === "in" && (
        <>
          <p className="font-display text-xl font-semibold">Ты вошёл ✓</p>
          <p className="text-sm text-muted">Придумай новый пароль, чтобы в следующий раз входить сразу, без письма.</p>
          <div className="text-left">
            <PasswordForm />
          </div>
          <Button variant="primary" className="w-full justify-center py-3" onClick={() => router.replace("/")}>
            Перейти в YOOMP
          </Button>
        </>
      )}
    </div>
  );
}
