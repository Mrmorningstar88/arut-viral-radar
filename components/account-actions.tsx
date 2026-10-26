"use client";

import { useActionState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { requestPro, setPassword } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
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
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="password"
        type="password"
        minLength={8}
        required
        autoComplete="new-password"
        placeholder="Новый пароль"
        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#ff7a2f]/60"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняю…" : "Сохранить"}
      </Button>
      {state && <p className={`w-full text-xs ${state.error ? "text-rose-300" : "text-emerald-300"}`}>{state.error ?? state.message}</p>}
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
