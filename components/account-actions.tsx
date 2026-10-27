"use client";

import { useActionState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { requestPro, setPassword } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";

export function RequestPro({ requested }: { requested: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  if (requested) return <p className="text-sm text-emerald-300">Заявка на Pro отправлена, скоро ответим.</p>;
  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await requestPro();
          toast(r.error ?? r.message ?? "", r.error ? "error" : undefined);
        })
      }
    >
      {pending ? "Отправляю…" : "Хочу Pro"}
    </Button>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(setPassword, null);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
      <PasswordInput
        name="password"
        minLength={8}
        required
        autoComplete="new-password"
        placeholder="Новый пароль"
        className="w-full rounded-xl border border-ink/10 bg-paper/30 px-3 py-2 text-sm outline-none focus:border-accent/60"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняю…" : "Сохранить пароль"}
      </Button>
      {state && <p className={`text-xs sm:col-span-2 ${state.error ? "text-rose-300" : "text-emerald-300"}`}>{state.error ?? state.message}</p>}
    </form>
  );
}

export function SignOut() {
  return (
    <form action={signOut}>
      <Button type="submit">Выйти</Button>
    </form>
  );
}
